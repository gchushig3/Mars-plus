// AI-assisted (Claude; changes with Cursor, used by Henry). Reviewed by the MARS+ team.
// Use cases. They depend on the domain and on ports, never on the DOM or on Leaflet.

import { evaluatePlans, defaultPlanOptions } from '../domain/plans/evaluate.js';
import { applyDustAlert } from '../domain/dust/dust.js';
import { explainEvaluation } from '../domain/explain/explain.js';
import { withLargeDuneFactor, largeDuneFactor } from '../domain/terrain/params.js';
import { legsOfPlan } from '../domain/plans/tasks.js';
import { buildTimeline, positionAt, checkpoints, chooseReturn, farthestPoint } from '../domain/contingency/contingency.js';
import { dustPolicy, eventRateUGyH } from '../domain/contingency/return-policy.js';

/**
 * @param {{repository: import('./ports.js').SiteRepository, solver: import('./ports.js').RouteSolver}} deps
 */
export function createMissionService({ repository, solver }) {
  let site = null;
  let solverReady = null;
  let returnReady = null;

  const planInput = (legs) => ({ params: site.params, legs, stops: site.stops, weather: site.weather, radiation: site.radiation });

  /** Walking legs used by the plans, with their end points (landing, observation stop, sampling stop). */
  function legDefinitions() {
    const p = { landing: site.site.points.landing, observation: site.stops.observation, sampling: site.stops.sampling };
    const pt = (k) => ({ lon: p[k].lon, lat: p[k].lat });
    return ['landing_observation', 'observation_sampling', 'sampling_landing', 'landing_sampling', 'observation_landing']
      .map((id) => { const [from, to] = id.split('_'); return { id, from: pt(from), to: pt(to) }; });
  }

  return {
    /** Loads everything the first screen needs; terrain for A→B routing is loaded in the background. */
    async loadSite() {
      site = await repository.loadSite();
      solverReady = repository.loadTerrainBinary().then((buf) => solver.init(site.terrainMeta, buf, site.params));
      return site;
    },

    whenRoutingReady() { return solverReady; },

    /** Official legs at the primary resolution, keyed by id (used by the plan chain). */
    officialLegs(resM = site.routes.primaryResM) {
      return Object.fromEntries(site.routes.runs.filter((r) => r.resM === resM).map((r) => [r.id, r]));
    },

    defaultPlanOptions() { return defaultPlanOptions(site.params); },

    /** Evaluates every plan x departure through the filter chain and explains the outcome. */
    evaluate(options, legs = this.officialLegs()) {
      const applied = applyDustAlert(site.params, site.dust?.jezeroTau, options);
      const evaluation = evaluatePlans(planInput(legs), applied.options);
      return { evaluation, explanation: explainEvaluation(evaluation), dustInfo: applied.dustInfo };
    },

    /** Least-effort route between two points of the pilot area. */
    async computeRoute(a, b) {
      await solverReady;
      return solver.route(a, b);
    },

    /** Leg times for each sand factor (computed in the browser over the 2 m grid). Cached by the caller. */
    async sandSensitivity() {
      await solverReady;
      const defs = legDefinitions();
      const rows = [];
      for (const factor of site.params.sensitivity.largeDuneTimeFactors) {
        const res = await solver.legs(defs, withLargeDuneFactor(site.params, factor));
        rows.push({ factor, isModel: Math.abs(factor - largeDuneFactor(site.params)) < 1e-9, legs: res.ok ? res.legs : null });
      }
      return rows;
    },

    /**
     * Emergency-return plan for one EVA plan, prepared before leaving: timeline of outside time and
     * the way home (fast and dust-safe) from every checkpoint. Return fields are built once in the Worker.
     */
    async prepareContingency(planId, paceFactor) {
      await solverReady;
      const plan = site.params.plans.find((p) => p.id === planId);
      if (!plan) throw new Error(`unknown plan ${planId}`);
      const official = this.officialLegs();
      const ids = legsOfPlan(site.params, plan);
      const tl = await solver.legTimeline(ids.map((id) => ({ id, coords: official[id].coords })));
      if (!tl.ok) throw new Error(`legTimeline: ${tl.code}`);
      const timeline = buildTimeline(site.params, plan, tl.legs, paceFactor);
      if (!returnReady) {
        returnReady = solver.prepareReturn(site.site.points.landing, site.params.visibility)
          .then((r) => { if (!r.ok) throw new Error(`prepareReturn: ${r.code}`); return r; });
        returnReady.catch(() => { returnReady = null; });
      }
      await returnReady;
      const positions = checkpoints(timeline, site.params.contingency.stepMin).map((m) => positionAt(timeline, m));
      const res = await solver.returnsFrom(positions);
      if (!res.ok) throw new Error(`returnsFrom: ${res.code}`);
      const rows = positions.map((p, i) => ({ ...p, routes: res.results[i] }));
      return { planId, paceFactor, timeline, rows };
    },

    /** Constants used to turn a route into minutes and dose. */
    returnConstants(paceFactor) {
      return {
        paceFactor,
        lowVisibilityPaceFactor: dustPolicy(site.params).lowVisibilityPaceFactor,
        backgroundUGyH: site.radiation.backgroundUGyH,
        eventUGyH: eventRateUGyH(site.params, site.radiation),
      };
    },

    /** Way home if the alerts arrive at `minute` of outside time. */
    async emergencyReturn(prepared, minute, alerts) {
      const position = positionAt(prepared.timeline, minute);
      if (position.atHome) return { position, atHome: true };
      const res = await solver.returnsFrom([position]);
      if (!res.ok) throw new Error(`returnsFrom: ${res.code}`);
      return { position, choice: chooseReturn(alerts, res.results[0], this.returnConstants(prepared.paceFactor)) };
    },

    /** One row per stop (arrival): return minutes by the fast and the dust-safe route. */
    checkpointTable(prepared) {
      const k = this.returnConstants(prepared.paceFactor);
      const seen = new Set();
      return prepared.rows.filter((r) => r.kind === 'task' && !seen.has(r.stop) && seen.add(r.stop)).map((r) => ({
        minute: r.minute, kind: r.kind, stop: r.stop,
        fastMin: r.routes.fast ? r.routes.fast.walkMin * k.paceFactor : null,
        dustMin: r.routes.dust ? r.routes.dust.walkMin * k.paceFactor * k.lowVisibilityPaceFactor : null,
      }));
    },

    /** Farthest checkpoint from the habitat for these alerts, against the configured limit (a warning, not a filter). */
    farthestFromHabitat(prepared, alerts) {
      const k = this.returnConstants(prepared.paceFactor);
      const rows = prepared.rows.map((r) => {
        const c = chooseReturn(alerts, r.routes, k);
        return { minute: r.minute, kind: r.kind, stop: r.stop, legId: r.legId, timeMin: c.noRoute ? NaN : c.timeMin };
      });
      return farthestPoint(rows, site.params.contingency.maxMinutesFromHabitat);
    },

    /** Obstacle model checked against Perseverance's real traverse. */
    async traverseValidation() {
      await solverReady;
      const res = await solver.validateTraverse(site.routes.roverPath.coords);
      return res.ok ? res.result : null;
    },
  };
}

// AI-assisted (Claude; changes with Cursor, used by Henry). Reviewed by the MARS+ team.
// Use cases. They depend on the domain and on ports, never on the DOM or on Leaflet.

import { evaluatePlans, defaultPlanOptions } from '../domain/plans/evaluate.js';
import { applyDustAlert } from '../domain/dust/dust.js';
import { explainEvaluation } from '../domain/explain/explain.js';
import { withLargeDuneFactor, largeDuneFactor } from '../domain/terrain/params.js';
import { legsOfPlan } from '../domain/plans/tasks.js';
import { buildTimeline, positionAt, positionAtDistance, checkpoints, chooseReturn, farthestPoint } from '../domain/contingency/contingency.js';
import { dustPolicy, eventRateUGyH } from '../domain/contingency/return-policy.js';
import { radDay } from '../domain/radiation/dose.js';
import { profileOf, indexAtDistance, nearestIndex, gradeAt } from '../domain/routing/profile.js';
import { classMask } from '../domain/routing/route-highlights.js';
import { detourCost } from '../domain/plans/detour.js';
import { gravityFacts, earthEquivalentKg } from '../domain/physics/gravity.js';
import { walkingSpeed } from '../domain/terrain/cost.js';
import { taskMinutes } from '../domain/plans/tasks.js';

/**
 * @param {{repository: import('./ports.js').SiteRepository, solver: import('./ports.js').RouteSolver}} deps
 */
export function createMissionService({ repository, solver }) {
  let site = null;
  let solverReady = null;
  let returnReady = null;
  const detourCache = {};

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
      const applied = applyDustAlert(site.params, site.dust?.jezeroTau, { ...options, dustAlertOverride: null });
      const solarInfo = radDay(site.radiation, options.radiationDay);
      const evaluation = evaluatePlans(planInput(legs), {
        ...applied.options, solarEventAlert: solarInfo.event, solarRateUGyH: solarInfo.event ? solarInfo.peakUGyH : null,
      });
      return { evaluation, explanation: explainEvaluation(evaluation), dustInfo: applied.dustInfo, solarInfo };
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
    async prepareContingency(routeId, paceFactor, { resM, customCoords, detour } = {}) {
      await solverReady;
      const official = this.officialLegs(resM);
      const plan = site.params.plans.find((p) => p.id === routeId);
      let legs, itinerary;
      if (detour) {
        legs = [
          { id: 'landing_brac', coords: detour.outboundLegs[0] },
          { id: 'brac_sampling', coords: detour.outboundLegs[1] },
          { id: 'sampling_landing', coords: official.sampling_landing.coords },
        ];
        itinerary = [
          { legId: 'landing_brac', task: 'photo', stop: 'brac' },
          { legId: 'brac_sampling', task: 'sample' }, { legId: 'sampling_landing' },
        ];
      } else if (customCoords) {
        legs = [{ id: 'custom', coords: customCoords }];
        itinerary = [{ legId: 'custom' }];
      } else {
        if (!plan) throw new Error(`unknown plan ${routeId}`);
        legs = legsOfPlan(site.params, plan).map((id) => ({ id, coords: official[id].coords }));
      }
      const tl = await solver.legTimeline(legs);
      if (!tl.ok) throw new Error(`legTimeline: ${tl.code}`);
      const timeline = buildTimeline(site.params, plan ?? { id: routeId }, tl.legs, paceFactor, { itinerary, homeEndpoints: !customCoords });
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
      return { routeId, paceFactor, timeline, rows };
    },

    /** Constants used to turn a route into minutes and dose. */
    returnConstants(paceFactor, solarRateUGyH) {
      return {
        paceFactor,
        lowVisibilityPaceFactor: dustPolicy(site.params).lowVisibilityPaceFactor,
        backgroundUGyH: site.radiation.backgroundUGyH,
        eventUGyH: solarRateUGyH ?? eventRateUGyH(site.params, site.radiation),
      };
    },

    /** Way home if the alerts arrive at `distanceM` along the chosen itinerary. */
    async emergencyReturn(prepared, distanceM, alerts) {
      const position = positionAtDistance(prepared.timeline, distanceM);
      if (position.atHome) return { position, atHome: true };
      const res = await solver.returnsFrom([position]);
      if (!res.ok) throw new Error(`returnsFrom: ${res.code}`);
      const routes = res.results[0];
      if (routes.fast?.distanceM === 0) return { position: { ...position, atHome: true }, atHome: true };
      const choice = chooseReturn(alerts, routes, this.returnConstants(prepared.paceFactor, alerts.solarRateUGyH));
      const fast = routes.fast?.coords, dust = routes.dust?.coords;
      const same = fast && dust && fast.length === dust.length && fast.every(([lon, lat], i) => lon === dust[i][0] && lat === dust[i][1]);
      const alt = choice.policy === 'dust' && fast && !same ? { coords: fast, policy: 'fast' } : null;
      return { position, choice, alt };
    },

    /** Elevation profile of an official leg, with its large-dune stretches (for the drawer under the map). */
    routeProfile(legId) {
      const leg = this.officialLegs()[legId];
      if (!leg) return null;
      const p = profileOf(leg.coords, classMask(leg.coords, site.geology.features, 'largeDunes'));
      return {
        legId, coords: leg.coords, ...p,
        indexAt: (d) => indexAtDistance(p, d),
        nearest: (lon, lat) => nearestIndex(leg.coords, lon, lat),
        grade: (i) => gradeAt(p, i),
      };
    },

    /**
     * Optional detours to places with signs of water alteration (config: site.waterSites), checked against the
     * time budget of the plan in effect. Routes are least-effort routes computed in the Worker.
     */
    async waterDetours(evaluation) {
      await solverReady;
      const sites = site.site.waterSites ?? [];
      const landing = site.site.points.landing;
      const stop = { lon: site.stops.sampling.lon, lat: site.stops.sampling.lat };
      const direct = this.officialLegs().landing_sampling;
      const o = evaluation.options;
      const plan = evaluation.recommended ?? evaluation.closest;
      const out = [];
      for (const ws of sites) {
        detourCache[ws.id] ??= await Promise.all([solver.route(landing, ws), solver.route(ws, stop)]);
        const [a, b] = detourCache[ws.id];
        if (!a.ok || !b.ok) { out.push({ ...ws, reachable: false }); continue; }
        const cost = detourCost({
          direct, toSite: a.stats, fromSite: b.stats, taskMin: taskMinutes(site.params, 'photo'),
          paceFactor: o.paceFactor, planTotalMin: plan?.totalMin ?? null, limitMin: o.limitMin,
        });
        out.push({ ...ws, reachable: true, coords: [...a.stats.coords, ...b.stats.coords.slice(1)],
          outboundLegs: [a.stats.coords, b.stats.coords], planId: plan?.planId ?? null, ...cost });
      }
      return out;
    },

    /** Mars gravity facts for the explanation panel, plus a weight converter. */
    gravityFacts() {
      const g = site.params.gravity;
      return { ...gravityFacts(g, walkingSpeed(0, site.params) * 3.6), earthEquivalentKg: (kg) => earthEquivalentKg(kg, g), source: g.source };
    },

    /** One row per stop (arrival): return minutes by the fast and the dust-safe route. */
    checkpointTable(prepared) {
      const k = this.returnConstants(prepared.paceFactor);
      const seen = new Set();
      return prepared.rows.filter((r) => r.kind === 'task' && !seen.has(r.stop) && seen.add(r.stop)).map((r) => ({
        distanceM: r.distanceM, kind: r.kind, stop: r.stop,
        fastMin: r.routes.fast ? r.routes.fast.walkMin * k.paceFactor : null,
        dustMin: r.routes.dust ? r.routes.dust.walkMin * k.paceFactor * k.lowVisibilityPaceFactor : null,
      }));
    },

    /** Farthest checkpoint from the habitat for these alerts, against the configured limit (a warning, not a filter). */
    farthestFromHabitat(prepared, alerts) {
      const k = this.returnConstants(prepared.paceFactor, alerts.solarRateUGyH);
      const rows = prepared.rows.map((r) => {
        const c = chooseReturn(alerts, r.routes, k);
        return { distanceM: r.distanceM, minute: r.minute, kind: r.kind, stop: r.stop, legId: r.legId, timeMin: c.noRoute ? NaN : c.timeMin };
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

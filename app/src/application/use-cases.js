// AI-assisted (Claude; changes with Cursor, used by Henry). Reviewed by the MARS+ team.
// Use cases. They depend on the domain and on ports, never on the DOM or on Leaflet.

import { evaluatePlans, defaultPlanOptions } from '../domain/plans/evaluate.js';
import { applyDustAlert } from '../domain/dust/dust.js';
import { explainEvaluation } from '../domain/explain/explain.js';
import { withLargeDuneFactor, largeDuneFactor } from '../domain/terrain/params.js';
import { legsOfPlan, stopOfTask } from '../domain/plans/tasks.js';
import { buildTimeline, positionAt, positionAtDistance, checkpoints, chooseReturn, farthestPoint } from '../domain/contingency/contingency.js';
import { returnBands, sampleItinerary } from '../domain/contingency/return-margin.js';
import { dustPolicy, eventRateUGyH } from '../domain/contingency/return-policy.js';
import { radDay } from '../domain/radiation/dose.js';
import { profileOf, indexAtDistance, nearestIndex, gradeAt } from '../domain/routing/profile.js';
import { classMask } from '../domain/routing/route-highlights.js';
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
        legs = detour.legs;
        itinerary = detour.itinerary;
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
      const samples = sampleItinerary(timeline);
      const times = await solver.returnTimes(samples.map(({ lon, lat }) => ({ lon, lat })));
      if (!times.ok) throw new Error(`returnTimes: ${times.code}`);
      const limit = site.params.contingency.maxMinutesFromHabitat;
      const dustFactor = dustPolicy(site.params).lowVisibilityPaceFactor;
      const bands = {
        fast: returnBands(samples, times.results, 'fast', paceFactor, limit),
        dust: returnBands(samples, times.results, 'dust', paceFactor * dustFactor, limit),
      };
      return { routeId, paceFactor, timeline, rows, bands, limit };
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
      const [res, lookup] = await Promise.all([solver.returnsFrom([position]), solver.returnTimes([position])]);
      if (!res.ok) throw new Error(`returnsFrom: ${res.code}`);
      if (!lookup.ok) throw new Error(`returnTimes: ${lookup.code}`);
      const routes = res.results[0];
      if (routes.fast?.distanceM === 0) return { position: { ...position, atHome: true }, atHome: true };
      const k = this.returnConstants(prepared.paceFactor, alerts.solarRateUGyH);
      const choice = chooseReturn(alerts, routes, k);
      const fastChoice = chooseReturn({ sep: true }, routes, k);
      const comparison = {
        fast: routes.fast ? routes.fast.walkMin * k.paceFactor : lookup.results[0].fast,
        dust: routes.dust ? routes.dust.walkMin * k.paceFactor * k.lowVisibilityPaceFactor : lookup.results[0].dust,
        solarDose: alerts.sep && !fastChoice.noRoute ? fastChoice.doseUGy : null,
      };
      const fast = routes.fast?.coords, dust = routes.dust?.coords;
      const same = fast && dust && fast.length === dust.length && fast.every(([lon, lat], i) => lon === dust[i][0] && lat === dust[i][1]);
      const alt = choice.policy === 'dust' && fast && !same ? { coords: fast, policy: 'fast' } : null;
      return { position, choice, alt, comparison };
    },

    /** Elevation profile of the displayed geometry, with large dunes and gaps in terrain coverage. */
    async routeProfile(coords) {
      if (coords.length < 2) return null;
      const sampled = coords.some(([, , z]) => !Number.isFinite(z));
      if (sampled) {
        await solverReady;
        const res = await solver.profileElevations(coords);
        if (!res.ok) throw new Error(`profileElevations: ${res.code}`);
        coords = res.coords;
      }
      const p = profileOf(coords, classMask(coords, site.geology.features, 'largeDunes'));
      if (p.totalM === 0 || !Number.isFinite(p.minZ)) return null;
      return {
        coords, ...p, sampled, partial: p.elev.some((z) => !Number.isFinite(z)),
        indexAt: (d) => indexAtDistance(p, d),
        nearest: (lon, lat) => nearestIndex(coords, lon, lat),
        grade: (i) => gradeAt(p, i),
      };
    },

    /** Assess visits to documented outcrops, both as a stop on the active plan and as a round trip. */
    async waterDetours(evaluation) {
      await solverReady;
      const landing = site.site.points.landing;
      const planId = (evaluation.recommended ?? evaluation.closest)?.planId;
      const base = site.params.plans.find(({ id }) => id === planId);
      const official = this.officialLegs();
      const radius = site.site.stopTargets.sampling;
      return Promise.all((site.site.waterSites ?? []).map(async (ws) => {
        detourCache[ws.id] ??= (async () => {
          const workspace = await solver.scienceWorkspace(ws, radius.searchRadiusM, radius.platformRadiusM);
          const point = workspace ?? ws;
          const [out, landingBack, sampling, observation] = await Promise.all([
            solver.route(landing, point), solver.route(point, landing),
            solver.route(point, site.stops.sampling), solver.route(point, site.stops.observation),
          ]);
          return { workspace, out: out.stats, landing: landingBack.stats, sampling: sampling.stats, observation: observation.stats };
        })().catch((error) => { delete detourCache[ws.id]; throw error; });
        const { workspace, out, landing: back, sampling, observation } = await detourCache[ws.id];
        if (!out) return { ...ws, reachable: false };
        const first = base && stopOfTask(site.params, base.tasks[0]);
        const next = { sampling, observation }[first];
        const extraLegs = (base ? legsOfPlan(site.params, base) : []).slice(1).map((id) => ({ id, ...official[id] }));
        const assess = (after, firstLeg, tasks, remainingLegs = {}) => {
          const legs = { ...remainingLegs, landing_water: out, [`water_${after}`]: firstLeg };
          const mode = (sample) => {
            if (sample && ws.sampleDocumented === false) return { closest: { reason: { code: 'samplingEvidence' } } };
            const stops = { ...site.stops, water: workspace };
            const plan = { id: planId ?? 'water', tasks: [sample ? 'waterPhotoSample' : 'waterPhoto', ...tasks], scienceValue: 1 };
            const photo = taskMinutes(site.params, 'photo');
            const params = { ...site.params, plans: [plan],
              tasks: { ...site.params.tasks, waterPhoto: { minutes: photo, stop: 'water' },
                waterPhotoSample: { minutes: photo + taskMinutes(site.params, 'sample'), stop: 'water' } } };
            const { recommended, closest } = evaluatePlans({ ...planInput(legs), params, stops }, evaluation.options);
            return { recommended, closest };
          };
          return { photo: mode(false), photoSample: mode(true) };
        };
        const assessments = next ? assess(first, next, base.tasks, official) : null;
        const standalone = back ? assess('landing', back, []) : null;
        const route = (after, firstLeg, trailing, tasks) => {
          const legs = [{ id: `landing_${ws.id}`, coords: out.coords }, { id: `${ws.id}_${after}`, coords: firstLeg.coords }, ...trailing];
          return { legs, itinerary: legs.map(({ id }, i) => ({ legId: id, task: i === 0 ? 'photo' : tasks[i - 1],
            stop: i === 0 ? ws.id : undefined })) };
        };
        const detour = next ? route(first, next, extraLegs, base.tasks) : null;
        const roundTrip = back ? route('landing', back, [], []) : null;
        const via = detour && (!standalone?.photo?.recommended || assessments.photo.recommended);
        const displayed = (via ? detour : roundTrip) ?? detour;
        return {
          ...ws, workspace, reachable: Boolean(displayed), planId, assessments, standalone, detour, roundTrip,
          displayMode: via ? 'detour' : 'roundTrip',
          coords: displayed?.legs.flatMap(({ coords }, i) => i === 0 ? coords : coords.slice(1)),
        };
      }));
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

// AI-assisted (Claude). Reviewed by the MARS+ team.
// Use cases. They depend on the domain and on ports, never on the DOM or on Leaflet.

import { evaluatePlans, defaultPlanOptions } from '../domain/plans/evaluate.js';
import { explainEvaluation } from '../domain/explain/explain.js';

/**
 * @param {{repository: import('./ports.js').SiteRepository, solver: import('./ports.js').RouteSolver}} deps
 */
export function createMissionService({ repository, solver }) {
  let site = null;
  let solverReady = null;

  return {
    /** Loads everything the first screen needs; terrain for A→B routing is loaded in the background. */
    async loadSite() {
      site = await repository.loadSite();
      solverReady = repository.loadTerrainBinary().then((buf) => solver.init(site.terrainMeta, buf, site.params));
      return site;
    },

    /** Official legs at the primary resolution, keyed by id (used by the plan chain). */
    officialLegs(resM = site.routes.primaryResM) {
      return Object.fromEntries(site.routes.runs.filter((r) => r.resM === resM).map((r) => [r.id, r]));
    },

    defaultPlanOptions() { return defaultPlanOptions(site.params); },

    /** Evaluates every plan x departure through the filter chain and explains the outcome. */
    evaluate(options) {
      const input = { params: site.params, legs: this.officialLegs(), stops: site.stops, weather: site.weather, radiation: site.radiation };
      const evaluation = evaluatePlans(input, options);
      return { evaluation, explanation: explainEvaluation(evaluation) };
    },

    /** Least-effort route between two points of the pilot area. */
    async computeRoute(a, b) {
      await solverReady;
      return solver.route(a, b);
    },
  };
}

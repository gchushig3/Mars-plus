// AI-assisted (Claude). Reviewed by the MARS+ team.
// Shared routing core used by the Web Worker and by the main-thread fallback.

import { TerrainGrid } from '../../domain/terrain/grid.js';
import { buildCostModel } from '../../domain/terrain/cost.js';
import { findPath } from '../../domain/routing/astar.js';
import { routeStats } from '../../domain/routing/route-stats.js';

export function createRouteCore() {
  let model = null;
  return {
    init(meta, buffer, params) { model = buildCostModel(new TerrainGrid(meta, buffer), params); },
    route(a, b) {
      if (!model) return { ok: false, code: 'notReady' };
      const t0 = performance.now();
      const ca = model.grid.cellOf(a.lon, a.lat), cb = model.grid.cellOf(b.lon, b.lat);
      if (ca < 0 || cb < 0) return { ok: false, code: 'outside' };
      if (model.blocked[ca] || model.blocked[cb]) return { ok: false, code: 'blocked' };
      const res = findPath(model, ca, cb);
      if (!res) return { ok: false, code: 'noRoute' };
      return { ok: true, stats: routeStats(model, res.path), ms: Math.round(performance.now() - t0) };
    },
  };
}

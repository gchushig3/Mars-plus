// AI-assisted (Claude). Reviewed by the MARS+ team.
// Shared routing core used by the Web Worker and by the main-thread fallback.

import { TerrainGrid } from '../../domain/terrain/grid.js';
import { buildCostModel } from '../../domain/terrain/cost.js';
import { findPath } from '../../domain/routing/astar.js';
import { routeStats } from '../../domain/routing/route-stats.js';
import { checkTraverse } from '../../domain/validation/traverse-check.js';
import { edgeTime } from '../../domain/terrain/cost.js';
import { returnField, pathHome } from '../../domain/routing/time-field.js';
import { viewshedMask } from '../../domain/terrain/viewshed.js';
import { dustReturnModel } from '../../domain/contingency/return-policy.js';
import { nearbyWorkspace } from '../../domain/terrain/workspace.js';
import { profileSamplePoints } from '../../domain/routing/profile.js';

export function createRouteCore() {
  let grid = null, model = null, fields = null;

  const summary = (path) => {
    const st = routeStats(model, path); // real walking time on the normal cost model
    return { walkMin: st.timeMin, distanceM: st.distanceM, largeDuneM: st.largeDuneM, coords: st.coords };
  };

  function routeOn(m, a, b) {
    const ca = m.grid.cellOf(a.lon, a.lat), cb = m.grid.cellOf(b.lon, b.lat);
    if (ca < 0 || cb < 0) return { ok: false, code: 'outside' };
    if (m.blocked[ca] || m.blocked[cb]) return { ok: false, code: 'blocked' };
    const res = findPath(m, ca, cb);
    if (!res) return { ok: false, code: 'noRoute' };
    return { ok: true, stats: routeStats(m, res.path) };
  }

  return {
    init(meta, buffer, params) { grid = new TerrainGrid(meta, buffer); model = buildCostModel(grid, params); fields = null; },

    scienceWorkspace(point, radiusM, platformM) {
      return nearbyWorkspace(model, point, radiusM, platformM);
    },

    /** Cumulative walking minutes along each official leg (normal model), to place the crew in time. */
    legTimeline(legs) {
      if (!model) return { ok: false, code: 'notReady' };
      const out = {};
      for (const leg of legs) {
        const cells = leg.coords.map(([lon, lat]) => grid.cellOf(lon, lat));
        const cumMin = [0];
        for (let i = 1; i < cells.length; i++) {
          const a = cells[i - 1], b = cells[i];
          let s = 0;
          if (a >= 0 && b >= 0 && a !== b) {
            const dx = ((b % grid.cols) - (a % grid.cols)) * grid.res * grid.cosLat;
            const dy = (Math.floor(b / grid.cols) - Math.floor(a / grid.cols)) * grid.res;
            s = edgeTime(model, a, b, Math.hypot(dx, dy));
          }
          cumMin.push(cumMin[i - 1] + s / 60);
        }
        out[leg.id] = { coords: leg.coords, cumMin };
      }
      return { ok: true, legs: out };
    },

    /** Builds the two return fields to the habitat (fast and dust-safe). Done once, ~1 s, in the Worker. */
    prepareReturn(home, visibility) {
      if (!model) return { ok: false, code: 'notReady' };
      const t0 = performance.now();
      const homeCell = grid.cellOf(home.lon, home.lat);
      if (homeCell < 0 || model.blocked[homeCell]) return { ok: false, code: 'blocked' };
      const sees = viewshedMask(grid.z, grid.rows, grid.cols, grid.res, grid.cosLat, homeCell, visibility.habitatHeightM, visibility.crewEyeHeightM);
      let visible = 0;
      for (let i = 0; i < sees.length; i++) visible += sees[i];
      fields = { fast: returnField(model, homeCell), dust: returnField(dustReturnModel(model, sees), homeCell, model) };
      return { ok: true, ms: Math.round(performance.now() - t0), visibleShare: visible / grid.size };
    },

    /** Batch lookup without reconstructing paths. Null = unknown terrain, Infinity = no path. */
    returnTimes(points) {
      if (!fields) return { ok: false, code: 'notReady' };
      return { ok: true, results: points.map(({ lon, lat }) => {
        const c = grid.cellOf(lon, lat);
        if (c < 0 || !Number.isFinite(grid.z[c])) return { fast: null, dust: null };
        return { fast: fields.fast.travelSeconds[c] / 60, dust: fields.dust.travelSeconds[c] / 60 };
      }) };
    },

    /** Way home from each point under both policies (null when a policy has no route). */
    returnsFrom(points) {
      if (!fields) return { ok: false, code: 'notReady' };
      const results = points.map((p) => {
        const c = grid.cellOf(p.lon, p.lat);
        const one = (f) => { const path = pathHome(f, c); return path ? summary(path) : null; };
        return { fast: one(fields.fast), dust: one(fields.dust) };
      });
      return { ok: true, results };
    },

    route(a, b) {
      if (!model) return { ok: false, code: 'notReady' };
      const t0 = performance.now();
      const r = routeOn(model, a, b);
      return r.ok ? { ...r, ms: Math.round(performance.now() - t0) } : r;
    },

    /** Times of several legs under alternative parameters (sensitivity). legs: [{id, from:{lon,lat}, to:{lon,lat}}] */
    legs(legs, params) {
      if (!grid) return { ok: false, code: 'notReady' };
      const m = buildCostModel(grid, params);
      const out = {};
      for (const leg of legs) {
        const r = routeOn(m, leg.from, leg.to);
        out[leg.id] = r.ok ? { timeMin: r.stats.timeMin, distanceM: r.stats.distanceM, largeDuneM: r.stats.largeDuneM } : { timeMin: NaN, code: r.code };
      }
      return { ok: true, legs: out };
    },

    /** Sample recorded routes with no heights against the 2 m raster. NaN marks a gap. */
    profileElevations(coords) {
      if (!grid) return { ok: false, code: 'notReady' };
      const sampled = profileSamplePoints(coords, grid.res * grid.cosLat).map(([lon, lat]) => {
        const cell = grid.cellOf(lon, lat);
        return [lon, lat, grid.z[cell] ?? NaN];
      });
      return { ok: true, coords: sampled };
    },

    /** Obstacle model checked against the rover's real traverse. */
    validateTraverse(coords) {
      if (!model) return { ok: false, code: 'notReady' };
      return { ok: true, result: checkTraverse(model, coords) };
    },
  };
}

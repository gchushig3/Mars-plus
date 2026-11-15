// AI-assisted (Cursor, used by Henry; returnField added by Claude). Reviewed by the MARS+ team.
// Dijkstra times on the same 8-neighbour graph as A*.
// reverse=false: seconds from `source` to each cell.
// reverse=true: seconds from each cell back to `source` (the edge is walked uphill the other way).

import { MinHeap } from './min-heap.js';
import { edgeTime } from '../terrain/cost.js';

const DR = [-1, -1, -1, 0, 0, 1, 1, 1];
const DC = [-1, 0, 1, -1, 1, -1, 0, 1];

export function timeField(model, source, reverse = false) {
  const { grid, blocked } = model;
  const { rows, cols, res, cosLat } = grid;
  const n = grid.size;
  const g = new Float64Array(n);
  g.fill(Infinity);
  if (source < 0 || source >= n || blocked[source]) return g;
  const stepLen = DR.map((dr, q) => Math.hypot(DC[q] * res * cosLat, dr * res));
  const open = new MinHeap();
  const closed = new Uint8Array(n);
  g[source] = 0;
  open.push(0, source);
  while (open.size > 0) {
    const u = open.pop();
    if (closed[u]) continue;
    closed[u] = 1;
    const ur = Math.floor(u / cols), uc = u % cols;
    for (let q = 0; q < 8; q++) {
      const vr = ur + DR[q], vc = uc + DC[q];
      if (vr < 1 || vc < 1 || vr >= rows - 1 || vc >= cols - 1) continue;
      const v = vr * cols + vc;
      if (closed[v] || blocked[v]) continue;
      if (DR[q] !== 0 && DC[q] !== 0 && (blocked[ur * cols + vc] || blocked[vr * cols + uc])) continue;
      const cost = reverse ? edgeTime(model, v, u, stepLen[q]) : edgeTime(model, u, v, stepLen[q]);
      const ng = g[u] + cost;
      if (ng < g[v]) { g[v] = ng; open.push(ng, v); }
    }
  }
  return g;
}

/** Round trip from `origin` within budgetS, using out and back because slope is directional. */
export function reachabilityMask(model, origin, budgetS) {
  const out = timeField(model, origin, false);
  const back = timeField(model, origin, true);
  const mask = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) if (out[i] + back[i] <= budgetS) mask[i] = 1;
  return mask;
}

/** One forward and one return field, then a mask per extra-time factor. */
export function corridorMasks(model, start, goal, factors) {
  const fromStart = timeField(model, start, false);
  const toGoal = timeField(model, goal, true);
  const optimal = fromStart[goal];
  return factors.map((factor) => {
    const mask = new Uint8Array(fromStart.length);
    if (!Number.isFinite(optimal)) return mask;
    const limit = optimal * (1 + factor);
    for (let i = 0; i < fromStart.length; i++) if (fromStart[i] + toGoal[i] <= limit + 1e-6) mask[i] = 1;
    return mask;
  });
}

/** Cells whose via-time is at most (1+factor) times the optimal A→B time. */
export function corridorMask(model, start, goal, factor) {
  return corridorMasks(model, start, goal, [factor])[0];
}

/**
 * Return field to `home`: seconds from every cell back to home, plus the next cell to step to.
 * Following `next` from any reachable cell walks the least-time route home (same graph as A*).
 * When the route uses additional penalties, travelSeconds records walking time without those
 * penalties along the very same path. Unreachable cells have infinite times.
 */
export function returnField(model, home, walkingModel = model) {
  const { grid, blocked } = model;
  const { rows, cols, res, cosLat } = grid;
  const n = grid.size;
  const seconds = new Float64Array(n).fill(Infinity);
  const travelSeconds = walkingModel === model ? seconds : new Float64Array(n).fill(Infinity);
  const next = new Int32Array(n).fill(-1);
  if (home < 0 || home >= n || blocked[home]) return { seconds, travelSeconds, next };
  const stepLen = DR.map((dr, q) => Math.hypot(DC[q] * res * cosLat, dr * res));
  const open = new MinHeap();
  const closed = new Uint8Array(n);
  travelSeconds[home] = seconds[home] = 0;
  open.push(0, home);
  while (open.size > 0) {
    const u = open.pop();
    if (closed[u]) continue;
    closed[u] = 1;
    const ur = Math.floor(u / cols), uc = u % cols;
    for (let q = 0; q < 8; q++) {
      const vr = ur + DR[q], vc = uc + DC[q];
      if (vr < 1 || vc < 1 || vr >= rows - 1 || vc >= cols - 1) continue;
      const v = vr * cols + vc;
      if (closed[v] || blocked[v]) continue;
      if (DR[q] !== 0 && DC[q] !== 0 && (blocked[ur * cols + vc] || blocked[vr * cols + uc])) continue;
      const cost = edgeTime(model, v, u, stepLen[q]); // walked from v towards home
      const ng = seconds[u] + cost;
      if (ng < seconds[v]) {
        seconds[v] = ng;
        if (walkingModel !== model) travelSeconds[v] = travelSeconds[u] + edgeTime(walkingModel, v, u, stepLen[q]);
        next[v] = u;
        open.push(ng, v);
      }
    }
  }
  return { seconds, travelSeconds, next };
}

/** Cells from `start` to home by following the return field; null when start cannot reach home. */
export function pathHome(field, start, maxSteps = 1e6) {
  if (start < 0 || !Number.isFinite(field.seconds[start])) return null;
  const path = [start];
  let c = start;
  while (field.next[c] !== -1 && path.length < maxSteps) { c = field.next[c]; path.push(c); }
  return path;
}

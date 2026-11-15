// AI-assisted (Claude). Reviewed by the MARS+ team.
// Least-time path on the terrain grid (A* with an admissible heuristic: straight distance at max speed).
// Same neighbourhood rules as RouteEngine.cs: 8 neighbours, 1-cell border excluded, no corner cutting
// past blocked cells, blocked cells never entered.

import { MinHeap } from './min-heap.js';
import { edgeTime, maxWalkingSpeed } from '../terrain/cost.js';

const DR = [-1, -1, -1, 0, 0, 1, 1, 1];
const DC = [-1, 0, 1, -1, 1, -1, 0, 1];

/**
 * @param {ReturnType<import('../terrain/cost.js').buildCostModel>} model
 * @param {number} start cell index
 * @param {number} goal cell index
 * @returns {{path:number[], timeS:number, expanded:number} | null}
 */
export function findPath(model, start, goal) {
  const { grid, blocked } = model;
  const { rows, cols, res, cosLat } = grid;
  if (start < 0 || goal < 0 || blocked[start] || blocked[goal]) return null;

  const n = grid.size;
  const g = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const vmax = maxWalkingSpeed(model.params);
  const gr = Math.floor(goal / cols), gc = goal % cols;
  const h = (i) => {
    const dx = ((i % cols) - gc) * res * cosLat, dy = (Math.floor(i / cols) - gr) * res;
    return Math.sqrt(dx * dx + dy * dy) / vmax;
  };
  const stepLen = DR.map((dr, q) => Math.sqrt((DC[q] * res * cosLat) ** 2 + (dr * res) ** 2));

  const open = new MinHeap();
  g[start] = 0;
  open.push(h(start), start);
  let expanded = 0;

  while (open.size > 0) {
    const u = open.pop();
    if (closed[u]) continue;
    closed[u] = 1;
    expanded++;
    if (u === goal) break;
    const ur = Math.floor(u / cols), uc = u % cols;
    for (let q = 0; q < 8; q++) {
      const vr = ur + DR[q], vc = uc + DC[q];
      if (vr < 1 || vc < 1 || vr >= rows - 1 || vc >= cols - 1) continue;
      const v = vr * cols + vc;
      if (closed[v] || blocked[v]) continue;
      if (DR[q] !== 0 && DC[q] !== 0 && (blocked[ur * cols + vc] || blocked[vr * cols + uc])) continue;
      const ng = g[u] + edgeTime(model, u, v, stepLen[q]);
      if (ng < g[v]) { g[v] = ng; prev[v] = u; open.push(ng + h(v), v); }
    }
  }
  if (!Number.isFinite(g[goal])) return null;
  const path = [];
  for (let c = goal; c !== -1; c = prev[c]) path.push(c);
  path.reverse();
  return { path, timeS: g[goal], expanded };
}

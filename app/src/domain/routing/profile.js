// AI-assisted (Claude). Reviewed by the MARS+ team.
// Elevation profile of a route: distance along it and height at each point, plus where it crosses
// large dunes. Used by the profile drawer under the map, whose red point follows the map's.

const MARS_R = 3396190;
const DEG = Math.PI / 180;

/**
 * @param {number[][]} coords [lon, lat, z] points of the route
 * @param {boolean[]} [onDunes] per point: inside a large-dune unit
 * @returns {{dist:number[], elev:number[], totalM:number, minZ:number, maxZ:number, climbM:number, descentM:number, duneSpans:number[][]}}
 */
export function profileOf(coords, onDunes = []) {
  const dist = [0];
  const elev = coords.map((c) => c[2]);
  let climbM = 0, descentM = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lon0, lat0, z0] = coords[i - 1], [lon1, lat1, z1] = coords[i];
    const dx = (lon1 - lon0) * DEG * MARS_R * Math.cos(((lat0 + lat1) / 2) * DEG);
    const dy = (lat1 - lat0) * DEG * MARS_R;
    dist.push(dist[i - 1] + Math.hypot(dx, dy));
    if (z1 > z0) climbM += z1 - z0; else descentM += z0 - z1;
  }
  const duneSpans = [];
  let start = -1;
  for (let i = 0; i <= coords.length; i++) {
    const on = i < coords.length && Boolean(onDunes[i]);
    if (on && start < 0) start = i;
    if (!on && start >= 0) { duneSpans.push([start, i - 1]); start = -1; }
  }
  return { dist, elev, totalM: dist[dist.length - 1], minZ: Math.min(...elev), maxZ: Math.max(...elev), climbM, descentM, duneSpans };
}

/** Index of the profile point closest to a distance along the route. */
export function indexAtDistance(profile, d) {
  const { dist } = profile;
  let lo = 0, hi = dist.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (dist[mid] < d) lo = mid; else hi = mid; }
  return Math.abs(dist[lo] - d) <= Math.abs(dist[hi] - d) ? lo : hi;
}

/** Index of the route point closest to (lon, lat). */
export function nearestIndex(coords, lon, lat) {
  const k = Math.cos(lat * DEG);
  let best = 0, bestD = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const dx = (coords[i][0] - lon) * k, dy = coords[i][1] - lat;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

/** Local grade (%) around a point, over about ±10 m, for the profile readout. */
export function gradeAt(profile, i, spanM = 10) {
  const { dist, elev } = profile;
  let a = i, b = i;
  while (a > 0 && dist[i] - dist[a] < spanM) a--;
  while (b < dist.length - 1 && dist[b] - dist[i] < spanM) b++;
  const run = dist[b] - dist[a];
  return run > 0 ? ((elev[b] - elev[a]) / run) * 100 : 0;
}

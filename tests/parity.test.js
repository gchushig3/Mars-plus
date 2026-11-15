// AI-assisted (Claude). Reviewed by the MARS+ team.
// Parity: the browser engine (JS, quantized bands) must match the official pipeline engine (C#) within 1%.
import { test, assert, assertClose } from './harness.js';
import { TerrainGrid } from '../app/src/domain/terrain/grid.js';
import { buildCostModel } from '../app/src/domain/terrain/cost.js';
import { findPath } from '../app/src/domain/routing/astar.js';
import { routeStats } from '../app/src/domain/routing/route-stats.js';
import { loadSiteFixture } from './fixtures.js';

let model;
async function getModel() {
  if (model) return model;
  const f = await loadSiteFixture();
  model = buildCostModel(new TerrainGrid(f.terrainMeta, f.terrainBin), f.params);
  return model;
}

async function parity(fromKey, toKey, legId) {
  const f = await loadSiteFixture();
  const m = await getModel();
  const pts = { landing: f.params && null, sampling: f.stops.sampling, observation: f.stops.observation };
  const site = await (await fetch('../app/data/sites/jezero-issole/site.json')).json();
  pts.landing = site.points.landing;
  const a = m.grid.cellOf(pts[fromKey].lon, pts[fromKey].lat);
  const b = m.grid.cellOf(pts[toKey].lon, pts[toKey].lat);
  const t0 = performance.now();
  const res = findPath(m, a, b);
  const ms = performance.now() - t0;
  assert(res, `no JS route ${legId}`);
  const s = routeStats(m, res.path);
  const official = f.legs[legId];
  assertClose(s.timeMin, official.timeMin, 0.01, `${legId} time`);
  assertClose(s.distanceM, official.distanceM, 0.03, `${legId} distance`);
  return ms;
}

test('parity: Landing → sampling stop (JS vs C#, time within 1%)', () => parity('landing', 'sampling', 'landing_sampling'));
test('parity: sampling stop → Landing (return leg)', () => parity('sampling', 'landing', 'sampling_landing'));
test('parity: Landing → observation stop', () => parity('landing', 'observation', 'landing_observation'));
test('performance: A→B route under 500 ms', async () => {
  const ms = await parity('landing', 'sampling', 'landing_sampling');
  assert(ms < 500, `route took ${ms.toFixed(0)} ms`);
});

// AI-assisted (Claude). Reviewed by the MARS+ team.
// Phase 3 (validity): sand sensitivity, obstacle model vs the rover's real drive, stop photos.
import { test, assert, assertClose } from './harness.js';
import { createRouteCore } from '../app/src/infrastructure/routing/route-core.js';
import { withLargeDuneFactor, largeDuneFactor } from '../app/src/domain/terrain/params.js';
import { loadSiteFixture } from './fixtures.js';

let core;
async function getCore() {
  if (core) return core;
  const f = await loadSiteFixture();
  core = createRouteCore();
  core.init(f.terrainMeta, f.terrainBin.slice(0), f.params);
  return core;
}
const site = () => fetch('../app/data/sites/jezero-issole/site.json').then((r) => r.json());

test('params: sand factor ×2 is the model value', async () => {
  const { params } = await loadSiteFixture();
  assertClose(largeDuneFactor(params), 2, 1e-12);
  assertClose(withLargeDuneFactor(params, 3).terrain.largeDuneExtra, 2, 1e-12);
});

test('sensitivity: more costly sand never makes the walk faster; ×2 matches the official route', async () => {
  const f = await loadSiteFixture();
  const s = await site();
  const c = await getCore();
  const leg = [{ id: 'landing_sampling', from: s.points.landing, to: { lon: f.stops.sampling.lon, lat: f.stops.sampling.lat } }];
  const times = f.params.sensitivity.largeDuneTimeFactors.map((k) => c.legs(leg, withLargeDuneFactor(f.params, k)).legs.landing_sampling.timeMin);
  for (let i = 1; i < times.length; i++) assert(times[i] >= times[i - 1], `times must not decrease: ${times.join(', ')}`);
  assertClose(times[1], f.legs.landing_sampling.timeMin, 0.01, 'factor 2 vs official');
});

test('validation: the model blocks <2% of cells along Perseverance\'s real drive', async () => {
  const f = await loadSiteFixture();
  const r = (await getCore()).validateTraverse(f.routes.roverPath.coords).result;
  assert(r.lengthInsideM > 900, `expected >900 m of rover drive inside the area, got ${r.lengthInsideM.toFixed(0)}`);
  assert(r.blockedShare < 0.02, `blocked share ${(r.blockedShare * 100).toFixed(2)}%`);
  assert(r.slopeBlocked === 0, 'the rover drove no cell steeper than the block threshold');
});

test('photos: every configured stop photo is published with a credit', async () => {
  const s = await site();
  assert(s.photos.length >= 2, 'at least two stop photos');
  for (const p of s.photos) {
    assert(/NASA\/JPL-Caltech/.test(p.credit), `credit for ${p.file}`);
    const r = await fetch(`../app/assets/rover/${p.file}`, { method: 'HEAD' });
    assert(r.ok, `${p.file}: HTTP ${r.status}`);
  }
});

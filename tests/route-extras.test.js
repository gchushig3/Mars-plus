// AI-assisted (Claude). Reviewed by the MARS+ team.
// Elevation profile, water-alteration detour and Mars gravity facts.
import { test, assert, assertClose, assertEqual } from './harness.js';
import { profileOf, indexAtDistance, nearestIndex } from '../app/src/domain/routing/profile.js';
import { classMask } from '../app/src/domain/routing/route-highlights.js';
import { detourCost } from '../app/src/domain/plans/detour.js';
import { gravityFacts, earthEquivalentKg } from '../app/src/domain/physics/gravity.js';
import { createRouteCore } from '../app/src/infrastructure/routing/route-core.js';
import { loadSiteFixture } from './fixtures.js';

const json = (p) => fetch(p).then((r) => r.json());

test('profile: distances add up, climb and descent match the heights, dune spans are found', async () => {
  const f = await loadSiteFixture();
  const geology = await json('../app/data/sites/jezero-issole/geology.geojson');
  const coords = f.legs.landing_sampling.coords;
  const p = profileOf(coords, classMask(coords, geology.features, 'largeDunes'));
  assertClose(p.totalM, f.legs.landing_sampling.distanceM, 0.02, 'profile length vs route distance');
  assertClose(p.climbM - p.descentM, coords[coords.length - 1][2] - coords[0][2], 1e-6, 'net height change');
  assert(p.duneSpans.length >= 1, 'the out route crosses large dunes');
  assertEqual(indexAtDistance(p, 0), 0);
  assertEqual(indexAtDistance(p, p.totalM), coords.length - 1);
  const mid = Math.floor(coords.length / 2);
  assertEqual(nearestIndex(coords, coords[mid][0], coords[mid][1]), mid, 'a route point maps back to itself');
});

test('detour: extra time is the extra walk at the crew pace plus the photo, checked against the limit', () => {
  const d = detourCost({ direct: { timeMin: 36, distanceM: 950 }, toSite: { timeMin: 30, distanceM: 800 }, fromSite: { timeMin: 10, distanceM: 200 }, taskMin: 25, paceFactor: 1.2, planTotalMin: 159, limitMin: 180 });
  assertClose(d.extraWalkMin, 4 * 1.2, 1e-9);
  assertClose(d.extraMin, 4.8 + 25, 1e-9);
  assertEqual(d.extraM, 50);
  assertEqual(d.fits, false, '159 + 29.8 > 180');
  assertEqual(detourCost({ direct: { timeMin: 1, distanceM: 1 }, toSite: { timeMin: 1, distanceM: 1 }, fromSite: { timeMin: 1, distanceM: 1 }, taskMin: 0, paceFactor: 1, planTotalMin: null, limitMin: 180 }).fits, null, 'no plan, no verdict');
});

test('detour: Brac is reachable on foot and the detour costs more than its photo time', async () => {
  const f = await loadSiteFixture();
  const site = await json('../app/data/sites/jezero-issole/site.json');
  const brac = site.waterSites.find((w) => w.id === 'brac');
  assert(brac, 'Brac is configured');
  const core = createRouteCore();
  core.init(f.terrainMeta, f.terrainBin.slice(0), f.params);
  const a = core.route(site.points.landing, brac), b = core.route(brac, { lon: f.stops.sampling.lon, lat: f.stops.sampling.lat });
  assert(a.ok && b.ok, `routes: ${a.code ?? 'ok'} / ${b.code ?? 'ok'}`);
  const d = detourCost({ direct: f.legs.landing_sampling, toSite: a.stats, fromSite: b.stats, taskMin: f.params.tasks.photo.minutes, paceFactor: 1, planTotalMin: 159, limitMin: 180 });
  assert(d.extraWalkMin > -1, `a detour cannot be much shorter than the least-effort route (${d.extraWalkMin.toFixed(1)} min)`);
  assert(d.extraMin >= f.params.tasks.photo.minutes - 1, 'the photo time is included');
});

test('gravity: 0.38 g, walking limit lower than on Earth and above the model pace, slower falls', async () => {
  const f = await loadSiteFixture();
  const g = gravityFacts(f.params.gravity, 2.52);
  assertClose(g.ratio, 3.71 / 9.81, 1e-9);
  assertClose(g.walkRunMarsKmh / g.walkRunEarthKmh, Math.sqrt(3.71 / 9.81), 1e-9, 'walking limit scales with √g');
  assert(g.walkRunMarsKmh > g.modelFlatKmh, 'the suited pace is below the walk–run limit');
  assert(g.fall1mMarsS > g.fall1mEarthS, 'falls take longer on Mars');
  assertClose(earthEquivalentKg(100, f.params.gravity), 100 * 3.71 / 9.81, 1e-9);
});

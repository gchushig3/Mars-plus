// AI-assisted (Claude). Reviewed by the MARS+ team.
// Map points that replace layers: the dune crossing on the official route and the Issole photo gallery.
import { test, assert, assertEqual } from './harness.js';
import { pointInRing, classStretch } from '../app/src/domain/routing/route-highlights.js';
import { loadSiteFixture } from './fixtures.js';

const json = (p) => fetch(p).then((r) => r.json());

test('route highlights: a straight route through a square measures the part inside it', () => {
  const ring = [[0, 0], [0.001, 0], [0.001, 0.001], [0, 0.001], [0, 0]];
  assert(pointInRing(0.0005, 0.0005, ring), 'centre is inside');
  assert(!pointInRing(0.002, 0.0005, ring), 'outside point');
  const coords = [];
  for (let i = -5; i <= 15; i++) coords.push([i * 0.0001, 0.0005]);
  const s = classStretch(coords, [{ properties: { class: 'largeDunes' }, geometry: { coordinates: [ring] } }]);
  // The square is 0.001° wide; only segments between two inside samples count, so the result is
  // the true width within one sample spacing (0.0001°).
  const deg = (Math.PI / 180) * 3396190;
  assert(Math.abs(s.lengthM - 0.001 * deg) <= 0.0001 * deg + 1e-6, `length ${s.lengthM.toFixed(1)} vs ${(0.001 * deg).toFixed(1)}`);
  assert(pointInRing(s.middle[0], s.middle[1], ring), 'middle point is inside');
});

test('map points: the official route crosses a few hundred metres of large dunes, and the dune point sits on them', async () => {
  const f = await loadSiteFixture();
  const geology = await json('../app/data/sites/jezero-issole/geology.geojson');
  const s = classStretch(f.legs.landing_sampling.coords, geology.features, 'largeDunes');
  assert(s, 'the route crosses large dunes');
  assert(s.lengthM > 300 && s.lengthM < 800, `dune stretch ${s.lengthM.toFixed(0)} m (grid estimate ${f.legs.landing_sampling.largeDuneM.toFixed(0)} m)`);
  const rings = geology.features.filter((x) => x.properties.class === 'largeDunes').map((x) => x.geometry.coordinates[0]);
  assert(rings.some((r) => pointInRing(s.middle[0], s.middle[1], r)), 'the dune point is inside a dune polygon');
});

test('map points: every rover photo is at the start or at Issole, where Perseverance stopped next to the route', async () => {
  const site = await json('../app/data/sites/jezero-issole/site.json');
  assert(site.photos.length >= 2, 'photos configured');
  for (const p of site.photos) assert(['landing', 'sampling', 'observation'].includes(p.stop), `${p.file}: stop ${p.stop}`);
  assert(site.photos.some((p) => p.stop === 'landing'), 'the start of the walk has photos too');
  const en = await json('../app/i18n/en.json');
  for (const p of site.photos) assertEqual(typeof en[p.caption], 'string', `caption ${p.caption}`);
});

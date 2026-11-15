// AI-assisted (Claude). Reviewed by the MARS+ team.
// Phase 5 (globe): published assets, geology legend in both languages, longitude wrapping and elevation ramp.
import { test, assert, assertClose } from './harness.js';
import { projectSurfacePoint, wrapLongitude, GLOBE_ELEVATION_STOPS } from '../app/src/infrastructure/globe/webgl-globe.js';

const base = '../app/assets/globe/';
const meta = () => fetch(`${base}globe.json`).then((r) => r.json());

test('globe: every asset listed in globe.json is published', async () => {
  const m = await meta();
  const files = [m.viking.fast, m.viking.full, m.mola.file, m.geology.file, m.sky.file, m.logo.file];
  for (const f of files) {
    assert(typeof f === 'string' && f.length > 0, 'file name present');
    const r = await fetch(base + f, { method: 'HEAD' });
    assert(r.ok, `${f}: HTTP ${r.status}`);
  }
});

test('globe: data grids have the declared size', async () => {
  const m = await meta();
  assert(m.mola.width === 2 * m.mola.height, 'MOLA grid is equirectangular (2:1)');
  assert(m.geology.width === 2 * m.geology.height, 'geology grid is equirectangular (2:1)');
  const ds = new DecompressionStream('gzip');
  const buf = await new Response((await fetch(base + m.geology.file)).body.pipeThrough(ds)).arrayBuffer();
  assert(buf.byteLength === m.geology.width * m.geology.height, `geology bytes ${buf.byteLength}`);
  const max = new Uint8Array(buf).reduce((a, b) => (b > a ? b : a), 0);
  assert(max <= m.geology.units.length, `geology index ${max} must exist in the unit list`);
});

test('globe: 44 Tanaka et al. (2014) units, each with a colour and EN/ES names', async () => {
  const { geology } = await meta();
  assert(geology.units.length === 44, `units: ${geology.units.length}`);
  const codes = new Set();
  for (const u of geology.units) {
    assert(/^#[0-9a-f]{6}$/i.test(u.color), `${u.code}: colour ${u.color}`);
    assert(u.en && u.es, `${u.code}: names in both languages`);
    codes.add(u.code);
  }
  assert(codes.size === 44, 'unit codes are unique');
});

test('globe: AI-generated logo is declared as such', async () => {
  const { logo } = await meta();
  assert(logo.aiGenerated === true, 'logo.aiGenerated must be true (Space Apps AI rule)');
});

test('globe: layer credits are clean UTF-8 text', async () => {
  const m = await meta();
  for (const key of ['viking', 'mola', 'geology', 'sky']) {
    assert(/^[\x20-\x7e·]+$/.test(m[key].credit), `${key} credit has unexpected characters: ${m[key].credit}`);
  }
});

test('globe: longitude wraps into [-180, 180)', () => {
  assertClose(wrapLongitude(190), -170, 1e-9);
  assertClose(wrapLongitude(-190), 170, 1e-9);
  assertClose(wrapLongitude(77.45), 77.45, 1e-9);
  assertClose(wrapLongitude(180), -180, 1e-9);
});

test('globe: coverage follows the camera and disappears beyond the visible horizon', () => {
  const jezero = { lat: 18.44, lon: 77.45 };
  const size = [1200, 800];
  const centered = projectSurfacePoint(jezero, { ...jezero, distance: 1.12 }, ...size);
  assertClose(centered.x, 600, 1e-9);
  assertClose(centered.y, 400, 1e-9);
  const offCenter = projectSurfacePoint(jezero, { lat: 8, lon: 30, distance: 2.92 }, ...size);
  assert(offCenter.x > 600 && offCenter.y < 400, 'Jezero appears to the east and north');
  assert(projectSurfacePoint(jezero, { lat: 8, lon: -65, distance: 2.92 }, ...size) === null, 'Jezero is hidden on the far side');
});

test('globe: elevation ramp is ordered from low to high', () => {
  for (let i = 1; i < GLOBE_ELEVATION_STOPS.length; i++) {
    assert(GLOBE_ELEVATION_STOPS[i][0] > GLOBE_ELEVATION_STOPS[i - 1][0], `stop ${i} increases`);
  }
});

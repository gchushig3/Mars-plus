// AI-assisted (Claude). Reviewed by the MARS+ team.
// Unit tests for pure domain modules.
import { test, assert, assertEqual, assertClose } from './harness.js';
import { walkingSpeed, maxWalkingSpeed } from '../app/src/domain/terrain/cost.js';
import { MinHeap } from '../app/src/domain/routing/min-heap.js';
import { legsOfPlan } from '../app/src/domain/plans/tasks.js';
import { checkWeatherWindow } from '../app/src/domain/weather/window.js';
import { evaDoseUGy } from '../app/src/domain/radiation/dose.js';
import { loadSiteFixture } from './fixtures.js';

test('cost: Tobler speed peaks at a gentle downhill (-5%)', async () => {
  const { params } = await loadSiteFixture();
  assertClose(walkingSpeed(-0.05, params), maxWalkingSpeed(params), 1e-12);
  assert(walkingSpeed(0.1, params) < walkingSpeed(0, params), 'uphill must be slower than flat');
  assert(walkingSpeed(-0.3, params) < walkingSpeed(-0.05, params), 'steep downhill must be slower');
});

test('cost: flat speed is ~2.5 km/h with the scenario factor', async () => {
  const { params } = await loadSiteFixture();
  assertClose(walkingSpeed(0, params) * 3.6, 2.52, 0.01);
});

test('min-heap: pops values in key order', () => {
  const h = new MinHeap();
  [5, 1, 4, 2, 3, 0, 9].forEach((k) => h.push(k, `v${k}`));
  const out = [];
  while (h.size) out.push(h.pop());
  assertEqual(out.join(','), 'v0,v1,v2,v3,v4,v5,v9');
});

test('plans: legs of plan A go landing → observation → sampling → landing', async () => {
  const { params } = await loadSiteFixture();
  const a = params.plans.find((p) => p.id === 'A');
  assertEqual(legsOfPlan(params, a).join('|'), 'landing_observation|observation_sampling|sampling_landing');
});

test('weather: 08:00 is too cold on a typical sol, 10:00–13:00 is fine', async () => {
  const { weather, params } = await loadSiteFixture();
  const lim = params.weather;
  assertEqual(checkWeatherWindow(weather, 'typical', 8, 60, lim)?.code, 'tooCold');
  assertEqual(checkWeatherWindow(weather, 'typical', 10, 180, lim), null);
});

test('radiation: dose = rate × time', () => {
  assertClose(evaDoseUGy(12, 120), 24, 1e-12);
});

test('data: background RAD rate is ~11.9 µGy/h and the 28-Oct-2021 event peaks above 2× background', async () => {
  const { radiation } = await loadSiteFixture();
  assertClose(radiation.backgroundUGyH, 11.88, 0.01);
  assert(radiation.event.maxUGyH > 2 * radiation.backgroundUGyH, 'event peak should exceed 2x background');
});

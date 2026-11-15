// AI-assisted (Claude). Reviewed by the MARS+ team.
// The six plan scenarios from the project audit (docs: informe-datos-y-decisiones.md, D13).
import { test, assert, assertEqual } from './harness.js';
import { evaluatePlans, defaultPlanOptions } from '../app/src/domain/plans/evaluate.js';
import { explainEvaluation } from '../app/src/domain/explain/explain.js';
import { loadSiteFixture } from './fixtures.js';

async function run(overrides) {
  const f = await loadSiteFixture();
  const input = { params: f.params, legs: f.legs, stops: f.stops, weather: f.weather, radiation: f.radiation };
  return evaluatePlans(input, { ...defaultPlanOptions(f.params), ...overrides });
}

test('scenario 1 · typical sol, 180 min → Plan C at 09:00 (Plan A is 5 min over)', async () => {
  const e = await run({});
  assertEqual(e.recommended?.planId, 'C');
  assertEqual(e.recommended?.departure, 9);
  assertEqual(Math.round(e.recommended.totalMin), 159);
  const a9 = e.results.find((r) => r.planId === 'A' && r.departure === 9);
  assertEqual(a9.filter, 3);
  assertEqual(a9.reason.values.overMin, 5);
});

test('scenario 2 · typical sol, 210 min → Plan A at 09:00 (184 min)', async () => {
  const e = await run({ limitMin: 210 });
  assertEqual(e.recommended?.planId, 'A');
  assertEqual(e.recommended?.departure, 9);
  assertEqual(Math.round(e.recommended.totalMin), 184);
});

test('scenario 3 · worst recorded sol, 210 min → Plan A at 10:00 (09:00 too cold)', async () => {
  const e = await run({ limitMin: 210, weatherScenario: 'worst' });
  assertEqual(e.recommended?.planId, 'A');
  assertEqual(e.recommended?.departure, 10);
  assertEqual(e.results.find((r) => r.planId === 'A' && r.departure === 9).reason.code, 'tooCold');
});

test('scenario 4 · storm-day weather without alert → Plan A at 10:00', async () => {
  const e = await run({ limitMin: 210, weatherScenario: 'storm' });
  assertEqual(e.recommended?.planId, 'A');
  assertEqual(e.recommended?.departure, 10);
});

test('scenario 5 · dust-storm alert → postpone (filter 4)', async () => {
  const e = await run({ limitMin: 210, weatherScenario: 'storm', dustStormAlert: true });
  assertEqual(e.recommended, null);
  assertEqual(e.closest.filter, 4);
  assertEqual(e.closest.reason.code, 'dustStorm');
  assertEqual(e.closest.planId, 'A', 'closest should be the plan that works without the alert');
  assertEqual(e.closest.departure, 10);
});

test('scenario 6 · solar particle event → postpone (filter 5)', async () => {
  const e = await run({ limitMin: 210, solarEventAlert: true });
  assertEqual(e.recommended, null);
  assertEqual(e.closest.filter, 5);
  assertEqual(e.closest.reason.code, 'solarEvent');
});

test('explanation: recommended plan comes with "why not" for the other plans', async () => {
  const ex = explainEvaluation(await run({}));
  assertEqual(ex[0].code, 'recommended');
  assert(ex.some((s) => s.code === 'whyNotPlan' && s.values.planId === 'A' && s.values.reason.code === 'overLimit'), 'should explain why Plan A is out');
});

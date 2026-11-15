// AI-assisted (Claude). Reviewed by the MARS+ team.
// Phase 5C: emergency return during the EVA (solar particle event, dust storm, or both).
import { test, assert, assertClose, assertEqual } from './harness.js';
import { buildCostModel } from '../app/src/domain/terrain/cost.js';
import { routeStats } from '../app/src/domain/routing/route-stats.js';
import { returnField, pathHome } from '../app/src/domain/routing/time-field.js';
import { TerrainGrid } from '../app/src/domain/terrain/grid.js';
import { buildTimeline, positionAt, positionAtDistance, checkpoints, chooseReturn, headingDeg, farthestPoint } from '../app/src/domain/contingency/contingency.js';
import { radDay } from '../app/src/domain/radiation/dose.js';
import { dustPolicy, eventRateUGyH } from '../app/src/domain/contingency/return-policy.js';
import { evaluatePlans, defaultPlanOptions } from '../app/src/domain/plans/evaluate.js';
import { legsOfPlan } from '../app/src/domain/plans/tasks.js';
import { createRouteCore } from '../app/src/infrastructure/routing/route-core.js';
import { createMissionService } from '../app/src/application/use-cases.js';
import { returnBands, sampleItinerary } from '../app/src/domain/contingency/return-margin.js';
import { loadSiteFixture } from './fixtures.js';

let ready;
async function setup() {
  if (ready) return ready;
  const f = await loadSiteFixture();
  const site = await fetch('../app/data/sites/jezero-issole/site.json').then((r) => r.json());
  const core = createRouteCore();
  core.init(f.terrainMeta, f.terrainBin.slice(0), f.params);
  const prep = core.prepareReturn(site.points.landing, f.params.visibility);
  const grid = new TerrainGrid(f.terrainMeta, f.terrainBin.slice(0));
  ready = { f, site, core, prep, grid };
  return ready;
}

const k = (f) => ({ paceFactor: 1, lowVisibilityPaceFactor: dustPolicy(f.params).lowVisibilityPaceFactor, backgroundUGyH: f.radiation.backgroundUGyH, eventUGyH: eventRateUGyH(f.params, f.radiation) });

test('return field: following the next-step pointers walks home in the time the field says', () => {
  const cols = 8, rows = 6, n = cols * rows;
  const z = new Float32Array(n);
  const zero = new Float32Array(n);
  const grid = { rows, cols, res: 2, cosLat: 1, size: n, z, slope: zero, rough: zero, duneLarge: zero, duneSmall: zero, rock: zero, coordOf: (c) => [c % cols, Math.floor(c / cols)] };
  const params = { walking: { toblerFactor: 0.5 }, terrain: { slopeBlockDeg: 20, roughnessRefM: 0.25, largeDuneExtra: 1, smallDuneExtra: 0.3, rockMult: 6, rockBlockFraction: 0.12 } };
  const model = buildCostModel(grid, params);
  const home = 2 * cols + 2, start = 3 * cols + 6;
  const field = returnField(model, home);
  const path = pathHome(field, start);
  assertEqual(path[0], start); assertEqual(path[path.length - 1], home);
  assertClose(routeStats(model, path).timeMin * 60, field.seconds[start], 1e-6);
});

// Built once, in the Worker, while the crew reads the plan: it never blocks the page.
// The 10 s ceiling leaves room for slower CI machines (about 2.5 s on a laptop).
test('emergency: return fields are built in under 10 s and part of the area sees the habitat', async () => {
  const { prep } = await setup();
  assert(prep.ok, `prepareReturn: ${prep.code}`);
  assert(prep.ms < 10000, `took ${prep.ms} ms`);
  assert(prep.visibleShare > 0.05 && prep.visibleShare <= 1, `visible share ${prep.visibleShare}`);
});

test('emergency: the fast way home from the sampling stop is no slower than the official return leg (5%)', async () => {
  const { f, core } = await setup();
  const r = core.returnsFrom([{ lon: f.stops.sampling.lon, lat: f.stops.sampling.lat }]).results[0];
  assert(r.fast, 'a fast route exists');
  assert(r.fast.walkMin <= f.legs.sampling_landing.timeMin * 1.05, `fast ${r.fast.walkMin.toFixed(2)} vs official ${f.legs.sampling_landing.timeMin}`);
});

test('emergency: the dust-safe route respects its slope limit and crosses no more large dunes than the fast one', async () => {
  const { f, core, grid } = await setup();
  const r = core.returnsFrom([{ lon: f.stops.sampling.lon, lat: f.stops.sampling.lat }]).results[0];
  assert(r.dust, 'a dust-safe route exists');
  const limit = dustPolicy(f.params).maxSlopeDeg;
  const steep = r.dust.coords.map(([lon, lat]) => grid.slope[grid.cellOf(lon, lat)]).filter((s) => s > limit);
  assertEqual(steep.length, 0, `cells above ${limit}°`);
  assert(r.dust.largeDuneM <= r.fast.largeDuneM + 5, `dust ${r.dust.largeDuneM.toFixed(0)} m vs fast ${r.fast.largeDuneM.toFixed(0)} m of dunes`);
});

test('emergency: with both alerts the route is the dust-safe one, dosed at the event rate, and its cost is shown', async () => {
  const { f, core } = await setup();
  const routes = core.returnsFrom([{ lon: f.stops.sampling.lon, lat: f.stops.sampling.lat }]).results[0];
  const kk = k(f);
  const both = chooseReturn({ sep: true, dust: true }, routes, kk);
  assertEqual(both.policy, 'dust');
  assertClose(both.rateUGyH, f.radiation.event.maxUGyH, 1e-9);
  assertClose(both.doseUGy, (both.rateUGyH * both.timeMin) / 60, 1e-9, 'extra dose = event rate × return minutes');
  assert(both.vsFast && both.vsFast.extraMin >= -1e-9, 'never faster than the fastest route at the same pace');
  const sep = chooseReturn({ sep: true, dust: false }, routes, kk);
  assertEqual(sep.policy, 'fast');
  assert(sep.timeMin <= both.timeMin, 'particles alone take the fastest way');
  const dust = chooseReturn({ sep: false, dust: true }, routes, kk);
  assertClose(dust.rateUGyH, f.radiation.backgroundUGyH, 1e-9, 'dust alone keeps the background dose rate');
});

test('emergency: the plan C timeline matches the plan chain, and minute 0 means postpone', async () => {
  const { f, core } = await setup();
  const plan = f.params.plans.find((p) => p.id === 'C');
  const ids = legsOfPlan(f.params, plan);
  const tl = core.legTimeline(ids.map((id) => ({ id, coords: f.legs[id].coords })));
  const timeline = buildTimeline(f.params, plan, tl.legs, 1);
  const e = evaluatePlans({ params: f.params, legs: f.legs, stops: f.stops, weather: f.weather, radiation: f.radiation }, defaultPlanOptions(f.params));
  const c9 = e.results.find((r) => r.planId === 'C' && r.departure === 9);
  assertClose(timeline.outsideMin, c9.outsideMin, 0.005, 'outside minutes');
  assert(positionAt(timeline, 0).atHome, 'minute 0 is still at the habitat');
  const atStop = positionAt(timeline, timeline.segments[1].start + 1);
  assertEqual(atStop.kind, 'task'); assertEqual(atStop.stop, 'sampling');
  const marks = checkpoints(timeline, f.params.contingency.stepMin);
  assert(marks.length >= 10 && marks.every((m) => m > 0 && m < timeline.outsideMin), 'checkpoints inside the walk');
});

test('emergency: heading and farthest-point helpers', () => {
  assertClose(headingDeg([[0, 0], [0, 1]]), 0, 1e-6, 'north');
  assertClose(headingDeg([[0, 0], [1, 0]]), 90, 1e-6, 'east');
  const far = farthestPoint([{ minute: 10, timeMin: 20 }, { minute: 60, timeMin: 50 }, { minute: 90, timeMin: NaN }], 45);
  assertEqual(far.minute, 60); assert(far.overLimit, 'over the limit');
});

test('emergency: metres walked locate the crew on both legs of the real Jezero itinerary', async () => {
  const { f, core } = await setup();
  const plan = f.params.plans.find((p) => p.id === 'C');
  const legs = core.legTimeline(legsOfPlan(f.params, plan).map((id) => ({ id, coords: f.legs[id].coords }))).legs;
  const timeline = buildTimeline(f.params, plan, legs);
  const outbound = positionAtDistance(timeline, 450);
  const inbound = positionAtDistance(timeline, 1300);
  assertEqual(outbound.legId, 'landing_sampling');
  assertEqual(inbound.legId, 'sampling_landing');
  assertClose(outbound.distanceM, 450, 1e-6);
  assertClose(inbound.distanceM, 1300, 1e-6);
  assert(positionAtDistance(timeline, 0).atHome);
  assert(positionAtDistance(timeline, Math.ceil(timeline.distanceM)).atHome);
  const returns = core.returnsFrom([outbound, inbound]).results;
  assert(returns.every((r) => r.fast?.distanceM > 0));
  assert(Math.abs(returns[0].fast.distanceM - returns[1].fast.distanceM) > 20, 'different positions produce different returns');
});

test('emergency: custom A to B endpoints retain their position away from the habitat', async () => {
  const { f, core } = await setup();
  const coords = f.legs.sampling_landing.coords.slice(0, 40);
  const legs = core.legTimeline([{ id: 'custom', coords }]).legs;
  const timeline = buildTimeline(f.params, { id: 'custom' }, legs, 1, { itinerary: [{ legId: 'custom' }], homeEndpoints: false });
  const first = positionAtDistance(timeline, 0);
  const last = positionAtDistance(timeline, Math.ceil(timeline.distanceM));
  assert(!first.atHome && !last.atHome);
  assertClose(first.lon, coords[0][0], 1e-9);
  assertClose(last.lon, coords.at(-1)[0], 1e-9);
  assert(core.returnsFrom([first]).results[0].fast.distanceM > 500, 'at A, the crew still has to walk back to the habitat');
});

test('emergency: the solar alert follows recorded RAD event dates and each measured daily peak', async () => {
  const { f } = await setup();
  const event = radDay(f.radiation, '2021-301');
  assert(event.event && event.peakUGyH > f.radiation.backgroundUGyH);
  assertClose(event.peakUGyH, Math.max(...f.radiation.series.filter(([utc]) => utc.startsWith('2021-301 ')).map(([, dose]) => dose)), 1e-9);
  assert(!radDay(f.radiation, '2021-300').event);
  assertEqual(radDay(f.radiation, '2021-001').peakUGyH, null);
});

test('return margins use the walking time of each selected path and distinguish missing coverage', async () => {
  const { f, core } = await setup();
  const point = f.stops.sampling;
  const routes = core.returnsFrom([point]).results[0];
  const [times, missing] = core.returnTimes([point, { lon: 0, lat: 0 }]).results;
  assertClose(times.fast, routes.fast.walkMin, 1e-9);
  assertClose(times.dust, routes.dust.walkMin, 1e-9);
  assertEqual(missing.fast, null);
  const samples = sampleItinerary({ segments: [{ kind: 'walk', legId: 'test', startM: 0, dist: [0, 3], coords: [[0, 0], [0, 0.00005]] }] });
  assertEqual(samples.length, 3);
  assertEqual(samples.at(-1).endM, 3);
  const bands = returnBands(samples, [{ fast: 46 }, missing, { fast: Infinity }], 'fast', 1, 45);
  assertEqual(bands.map(({ key }) => key).join(','), 'over,unknown,unreachable');
});

test('science visits recompute terrain, work and alert filters for a detour and a dedicated EVA', async () => {
  const { f, site, core } = await setup();
  const service = createMissionService({
    repository: { loadSite: async () => ({ ...f, site }), loadTerrainBinary: async () => f.terrainBin },
    solver: core,
  });
  await service.loadSite();
  const { evaluation } = service.evaluate(defaultPlanOptions(f.params));
  const sites = await service.waterDetours(evaluation);
  const bastide = sites.find(({ id }) => id === 'bastide');
  const rochette = sites.find(({ id }) => id === 'rochette');
  assert(bastide?.detour?.legs.length && rochette?.roundTrip?.legs.length, 'both documented locations have computed routes');
  assertEqual(bastide.standalone.photoSample.closest.reason.code, 'samplingEvidence');
  assert(rochette.standalone.photo.recommended, 'Rochette can be visited in the default scenario');
  const alerted = await service.waterDetours({ ...evaluation, options: { ...evaluation.options, dustStormAlert: true } });
  assertEqual(alerted.find(({ id }) => id === 'rochette').standalone.photo.closest.reason.code, 'dustStorm');
});

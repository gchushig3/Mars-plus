// AI-assisted (Claude). Reviewed by the MARS+ team.
// Emergency return during the EVA: where the crew is at a given minute, and which way home
// for each alert. Prepared before leaving; used by the person in the habitat during the walk.
// Mars has no GPS: the position is estimated from progress along the planned route.
import { legsOfPlan, stopOfTask, taskMinutes } from '../plans/tasks.js';
import { profileOf } from '../routing/profile.js';

/**
 * Outside-time timeline of a plan (airlock and reserve excluded: the crew is not on the route).
 * @param {object} params model parameters
 * @param {{id:string,tasks:string[]}} plan
 * @param {Record<string,{coords:number[][], cumMin:number[]}>} legs per-leg coords and cumulative walking minutes
 * @param {number} paceFactor crew pace (1 = normal)
 */
export function buildTimeline(params, plan, legs, paceFactor = 1, { itinerary, homeEndpoints = true } = {}) {
  const segments = [];
  let t = 0, distanceM = 0;
  const ordered = itinerary ?? legsOfPlan(params, plan).map((legId, i) => ({ legId, task: plan.tasks[i] }));
  for (const { legId, task, stop } of ordered) {
    const leg = legs[legId];
    if (!leg || leg.coords.length < 2) throw new Error(`leg ${legId} has no route`);
    const cum = leg.cumMin.map((m) => m * paceFactor);
    const { dist, totalM } = profileOf(leg.coords);
    const end = t + cum.at(-1);
    segments.push({ kind: 'walk', legId, start: t, end, coords: leg.coords, cum, dist, startM: distanceM, endM: distanceM + totalM });
    t = end;
    distanceM += totalM;
    if (task) {
      const at = leg.coords.at(-1);
      const minutes = taskMinutes(params, task);
      segments.push({ kind: 'task', task, stop: stop ?? stopOfTask(params, task), start: t, end: t + minutes, at, distanceM });
      t += minutes;
    }
  }
  return { planId: plan.id, outsideMin: t, segments, distanceM, homeEndpoints };
}

/** Estimated position at `minute` of outside time. */
export function positionAt(timeline, minute) {
  const m = Math.max(0, Math.min(minute, timeline.outsideMin));
  if (timeline.homeEndpoints && m <= 0) return { minute: 0, distanceM: 0, atHome: true };
  if (timeline.homeEndpoints && m >= timeline.outsideMin) return { minute: timeline.outsideMin, distanceM: timeline.distanceM, atHome: true };
  const seg = timeline.segments.find((s) => m >= s.start && m < s.end) ?? timeline.segments[timeline.segments.length - 1];
  if (seg.kind === 'task') return { minute: m, distanceM: seg.distanceM, atHome: false, kind: 'task', task: seg.task, stop: seg.stop, lon: seg.at[0], lat: seg.at[1] };
  const local = m - seg.start;
  let k = 1;
  while (k < seg.cum.length - 1 && seg.cum[k] < local) k++;
  const span = seg.cum[k] - seg.cum[k - 1];
  const f = span > 0 ? (local - seg.cum[k - 1]) / span : 0;
  const [lon0, lat0] = seg.coords[k - 1], [lon1, lat1] = seg.coords[k];
  return { minute: m, distanceM: seg.startM + seg.dist[k - 1] + f * (seg.dist[k] - seg.dist[k - 1]),
    atHome: false, kind: 'walk', legId: seg.legId, lon: lon0 + (lon1 - lon0) * f, lat: lat0 + (lat1 - lat0) * f };
}

/** Places the crew at the distance walked along the chosen itinerary, including the return leg. */
export function positionAtDistance(timeline, distanceM) {
  const distance = Math.max(0, Math.min(distanceM, timeline.distanceM));
  if (distance === 0 || distance === timeline.distanceM) {
    return positionAt(timeline, distance === 0 ? 0 : timeline.outsideMin);
  }
  const seg = timeline.segments.find((s) => s.kind === 'walk' && distance <= s.endM);
  const localM = distance - seg.startM;
  let k = 1;
  while (k < seg.dist.length - 1 && seg.dist[k] < localM) k++;
  const span = seg.dist[k] - seg.dist[k - 1];
  const f = span > 0 ? (localM - seg.dist[k - 1]) / span : 0;
  return positionAt(timeline, seg.start + seg.cum[k - 1] + f * (seg.cum[k] - seg.cum[k - 1]));
}

/** Minutes to check before leaving: every `stepMin`, each stop arrival, and the end of each task. */
export function checkpoints(timeline, stepMin) {
  const set = new Set();
  for (let m = stepMin; m < timeline.outsideMin; m += stepMin) set.add(Math.round(m * 10) / 10);
  for (const s of timeline.segments) if (s.kind === 'task') { set.add(Math.round(s.start * 10) / 10); set.add(Math.round((s.end - 0.01) * 10) / 10); }
  const inside = [...set].filter((m) => m > 0 && m < timeline.outsideMin).sort((a, b) => a - b);
  return timeline.homeEndpoints ? inside : [0, ...inside, timeline.outsideMin];
}

/**
 * Picks the way home for the active alerts.
 *   solar particles only → fastest route (exposure time is what matters), dose at the event rate;
 *   dust only           → dust-safe route, walked at the low-visibility pace, dose at the background rate;
 *   both                → dust-safe route (fastest among the safe ones), dose at the event rate,
 *                         with its cost against the fastest route. No safety rule is traded away.
 * @param {{dust:boolean, sep:boolean}} alerts
 * @param {{fast: null|{walkMin:number, distanceM:number, largeDuneM:number, coords:number[][]},
 *          dust: null|{walkMin:number, distanceM:number, largeDuneM:number, coords:number[][]}}} routes
 * @param {{paceFactor:number, lowVisibilityPaceFactor:number, backgroundUGyH:number, eventUGyH:number}} k
 */
export function chooseReturn(alerts, routes, k) {
  const policy = alerts.dust ? 'dust' : 'fast';
  const rate = alerts.sep ? k.eventUGyH : k.backgroundUGyH;
  const r = routes[policy];
  if (!r) return { policy, noRoute: true };
  const minutes = (rp, pol) => rp.walkMin * k.paceFactor * (pol === 'dust' ? k.lowVisibilityPaceFactor : 1);
  const timeMin = minutes(r, policy);
  const out = { policy, timeMin, distanceM: r.distanceM, largeDuneM: r.largeDuneM, coords: r.coords, rateUGyH: rate, doseUGy: (rate * timeMin) / 60 };
  if (policy === 'dust' && routes.fast) {
    const fastMin = minutes(routes.fast, 'dust'); // same visibility, so the difference is the route alone
    out.vsFast = { extraMin: timeMin - fastMin, extraDoseUGy: (rate * (timeMin - fastMin)) / 60, extraDuneM: r.largeDuneM - routes.fast.largeDuneM };
  }
  return out;
}

/** Bearing (degrees clockwise from north) from the first point of a return route to the point ~aheadM along it. */
export function headingDeg(coords, aheadM = 30, radiusM = 3396190) {
  if (!coords || coords.length < 2) return null;
  const rad = Math.PI / 180;
  const [lon0, lat0] = coords[0];
  const local = ([lon, lat]) => [(lon - lon0) * rad * radiusM * Math.cos(lat0 * rad), (lat - lat0) * rad * radiusM];
  let target = coords[coords.length - 1];
  for (const c of coords) { const [x, y] = local(c); if (Math.hypot(x, y) >= aheadM) { target = c; break; } }
  const [x, y] = local(target);
  if (x === 0 && y === 0) return null;
  return ((Math.atan2(x, y) / rad) + 360) % 360;
}

/** Farthest checkpoint from the habitat (in return minutes) and whether it passes the configured limit. */
export function farthestPoint(rows, maxMinutes) {
  const valid = rows.filter((r) => Number.isFinite(r.timeMin));
  if (!valid.length) return null;
  const worst = valid.reduce((a, b) => (b.timeMin > a.timeMin ? b : a));
  return { ...worst, maxMinutes, overLimit: worst.timeMin > maxMinutes };
}

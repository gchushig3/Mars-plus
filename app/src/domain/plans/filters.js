// AI-assisted (Claude). Reviewed by the MARS+ team.
// The five filters of the plan chain. Each returns null (pass) or {code, values} (fail).
// They run in order and never compensate for each other.

import { legsOfPlan, stopOfTask, taskMinutes } from './tasks.js';
import { checkWeatherWindow } from '../weather/window.js';
import { evaDoseUGy } from '../radiation/dose.js';

/** 1 · Terrain: every leg has a safe route. Adds travel minutes to ctx. */
export function terrainFilter(ctx) {
  const { params, plan, legs, options } = ctx;
  let travel = 0;
  for (const id of legsOfPlan(params, plan)) {
    const leg = legs[id];
    if (!leg || !Number.isFinite(leg.timeMin)) return { code: 'noRoute', values: { leg: id } };
    travel += leg.timeMin * options.paceFactor;
  }
  ctx.travelMin = travel;
  return null;
}

/** 2 · Science: each task's stop has a safe workspace. Adds work minutes to ctx. */
export function scienceFilter(ctx) {
  const { params, plan, stops } = ctx;
  let work = 0;
  for (const task of plan.tasks) {
    const stop = stops[stopOfTask(params, task)];
    if (!stop || !stop.ok) return { code: 'noWorkspace', values: { task } };
    work += taskMinutes(params, task);
  }
  ctx.workMin = work;
  return null;
}

/** 3 · Time: airlock + travel + work + reserve within the EVA limit. */
export function timeFilter(ctx) {
  const o = ctx.options;
  ctx.totalMin = o.airlockMin + ctx.travelMin + ctx.workMin + o.reserveMin;
  if (ctx.totalMin > o.limitMin) return { code: 'overLimit', values: { overMin: Math.ceil(ctx.totalMin - o.limitMin), limitMin: o.limitMin } };
  return null;
}

/** 4 · Weather: dust-storm alert, then every hour outside within the thresholds. */
export function weatherFilter(ctx) {
  const o = ctx.options;
  if (o.dustStormAlert) return { code: 'dustStorm', values: {} };
  return checkWeatherWindow(ctx.weather, o.weatherScenario, ctx.departure, ctx.totalMin, o);
}

/** 5 · Radiation: solar particle event alert, then dose = rate x time outside. */
export function radiationFilter(ctx) {
  const o = ctx.options;
  if (o.solarEventAlert) return { code: 'solarEvent', values: {} };
  ctx.doseUGy = evaDoseUGy(ctx.radiation.backgroundUGyH, ctx.totalMin);
  if (ctx.doseUGy > o.maxDoseUGy) return { code: 'doseOverLimit', values: { doseUGy: ctx.doseUGy, limitUGy: o.maxDoseUGy } };
  return null;
}

export const FILTER_CHAIN = [terrainFilter, scienceFilter, timeFilter, weatherFilter, radiationFilter];

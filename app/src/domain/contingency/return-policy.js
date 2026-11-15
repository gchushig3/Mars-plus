// AI-assisted (Claude). Reviewed by the MARS+ team.
// Cost models for the emergency return to the habitat. Neither alert can be dodged inside the
// ~1 km² pilot area (dust covers hundreds of km; solar particles come from the whole sky), so the
// answer to an alert during the EVA is how to get back, not where to hide.
//   fast  · solar particle event: least walking time (the normal cost model).
//   dust  · dust storm: low visibility. Lower slope limit, large dunes avoided where possible,
//           cells that can see the habitat preferred. Penalties change which route is chosen;
//           the reported time is real walking time × the low-visibility pace (a scenario assumption).

/** @returns {{maxSlopeDeg:number, largeDunePenalty:number, noLineOfSightPenalty:number, lowVisibilityPaceFactor:number}} */
export function dustPolicy(params) {
  const d = params.contingency && params.contingency.dust;
  const keys = ['maxSlopeDeg', 'largeDunePenalty', 'noLineOfSightPenalty', 'lowVisibilityPaceFactor'];
  if (!d || keys.some((k) => !Number.isFinite(Number(d[k])))) throw new Error('contingency.dust parameters missing from model parameters');
  return Object.fromEntries(keys.map((k) => [k, Number(d[k])]));
}

/**
 * Cost model used to pick the dust-safe route. Same grid and walking formula as the base model.
 * @param {{grid:object, params:object, mult:Float32Array, blocked:Uint8Array}} base
 * @param {Uint8Array|null} seesHabitat 1 where the habitat is in line of sight
 */
export function dustReturnModel(base, seesHabitat) {
  const p = dustPolicy(base.params);
  const { grid } = base;
  const n = grid.size;
  const mult = new Float32Array(n);
  const blocked = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    blocked[i] = base.blocked[i] || grid.slope[i] > p.maxSlopeDeg ? 1 : 0;
    let m = base.mult[i] * (1 + p.largeDunePenalty * grid.duneLarge[i]);
    if (seesHabitat && !seesHabitat[i]) m *= 1 + p.noLineOfSightPenalty;
    mult[i] = m;
  }
  return { grid, params: base.params, mult, blocked };
}

/** Event dose rate used for a solar particle alert (µGy/h), from the published RAD event. */
export function eventRateUGyH(params, radiation) {
  const key = params.contingency && params.contingency.solarEventRate;
  const rate = radiation.event && radiation.event[key];
  if (!Number.isFinite(rate)) throw new Error(`radiation.event.${key} missing`);
  return rate;
}

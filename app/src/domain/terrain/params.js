// AI-assisted (Claude). Reviewed by the MARS+ team.
// Parameter variants for sensitivity analysis (pure functions).

/** Copy of the parameters with the walking-time factor on large dunes set (factor = 1 + largeDuneExtra). */
export function withLargeDuneFactor(params, factor) {
  return { ...params, terrain: { ...params.terrain, largeDuneExtra: factor - 1 } };
}

/** Model value of the factor (for labelling the reference row). */
export function largeDuneFactor(params) {
  return 1 + params.terrain.largeDuneExtra;
}

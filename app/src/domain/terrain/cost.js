// AI-assisted (Claude). Reviewed by the MARS+ team.
// Terrain cost model: time to cross a cell. Must stay identical to pipeline/03-model/RouteEngine.cs
// (verified by tests/parity). Parameters come from config/model-parameters.json.

/** Walking speed (m/s) for a grade (rise/run), Tobler hiking function scaled for a suit. */
export function walkingSpeed(grade, params) {
  return (params.walking.toblerFactor * 6 * Math.exp(-3.5 * Math.abs(grade + 0.05))) / 3.6;
}

/** Fastest possible speed (m/s): used as admissible A* heuristic. */
export function maxWalkingSpeed(params) {
  return (params.walking.toblerFactor * 6) / 3.6;
}

/**
 * Precomputes per-cell multiplier and blocked flag.
 * @param {import('./grid.js').TerrainGrid} grid
 */
export function buildCostModel(grid, params) {
  const t = params.terrain;
  const n = grid.size;
  const mult = new Float32Array(n);
  const blocked = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    blocked[i] = Number.isNaN(grid.z[i]) || grid.slope[i] > t.slopeBlockDeg || grid.rock[i] > t.rockBlockFraction ? 1 : 0;
    mult[i] =
      (1 + grid.rough[i] / t.roughnessRefM) *
      (1 + t.largeDuneExtra * grid.duneLarge[i] + t.smallDuneExtra * grid.duneSmall[i]) *
      (1 + t.rockMult * grid.rock[i]);
  }
  return { grid, params, mult, blocked };
}

/** Seconds to walk from cell a to neighbour b over a horizontal distance len (m). */
export function edgeTime(model, a, b, len) {
  const grade = (model.grid.z[b] - model.grid.z[a]) / len;
  return (len / walkingSpeed(grade, model.params)) * 0.5 * (model.mult[a] + model.mult[b]);
}

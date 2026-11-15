// AI-assisted (Cursor, used by Henry). Reviewed by the MARS+ team.
// Science-workspace acceptance. Thresholds come only from config/model-parameters.json
// (workspace.maxSlopeDeg, workspace.maxLargeDuneFraction). Bounds are inclusive:
// a slope equal to the limit, and a large-dune fraction equal to the limit, are acceptable.
// The same comparison is applied in pipeline/03-model/RouteEngine.cs (BestWorkspace).

export function workspaceLimits(params) {
  const w = params && params.workspace;
  const maxSlopeDeg = w && Number(w.maxSlopeDeg);
  const maxLargeDuneFraction = w && Number(w.maxLargeDuneFraction);
  if (!Number.isFinite(maxSlopeDeg) || !Number.isFinite(maxLargeDuneFraction)) {
    throw new Error('workspace thresholds missing from model parameters');
  }
  return { maxSlopeDeg, maxLargeDuneFraction };
}

/** @returns {boolean} true when both measurements are within the configured limits. */
export function isAcceptableWorkspace(maxSlopeDeg, largeDuneFraction, params) {
  const lim = workspaceLimits(params);
  return maxSlopeDeg <= lim.maxSlopeDeg && largeDuneFraction <= lim.maxLargeDuneFraction;
}

/**
 * Re-checks a stop's published criteria against the current parameters.
 * Missing fields are not treated as failures: the pipeline did not always export
 * the dune fraction. A value above its limit is a failure even if stop.ok is true.
 * Rock fraction uses terrain.rockBlockFraction (already the single source for blocking).
 */
export function workspaceRejects(criteria, params) {
  if (!criteria) return false;
  const lim = workspaceLimits(params);
  const rockLimit = params.terrain && Number(params.terrain.rockBlockFraction);
  if (Number.isFinite(criteria.maxSlopeDeg) && criteria.maxSlopeDeg > lim.maxSlopeDeg) return true;
  if (Number.isFinite(criteria.largeDuneFraction) && criteria.largeDuneFraction > lim.maxLargeDuneFraction) return true;
  if (Number.isFinite(criteria.rockFraction) && Number.isFinite(rockLimit) && criteria.rockFraction > rockLimit) return true;
  return false;
}

/** Select a walking destination near a mapped outcrop using the pipeline's workspace criteria. */
export function nearbyWorkspace(model, target, searchRadiusM, platformRadiusM) {
  const { grid, blocked, params } = model;
  const r0 = grid.rowOfLat(target.lat), c0 = grid.colOfLon(target.lon);
  const radius = Math.ceil(searchRadiusM / (grid.res * grid.cosLat));
  const platform = Math.max(1, Math.ceil(platformRadiusM / grid.res));
  let best = null, bestScore = Infinity;
  for (let r = r0 - radius; r <= r0 + radius; r++) {
    for (let c = c0 - radius; c <= c0 + radius; c++) {
      if (r < platform || c < platform || r >= grid.rows - platform || c >= grid.cols - platform) continue;
      const distanceToTargetM = Math.hypot((r - r0) * grid.res, (c - c0) * grid.res * grid.cosLat);
      if (distanceToTargetM > searchRadiusM) continue;
      const criteria = { maxSlopeDeg: 0, largeDuneFraction: 0, rockFraction: 0, distanceToTargetM };
      for (let dr = -platform; dr <= platform; dr++) {
        for (let dc = -platform; dc <= platform; dc++) {
          const cell = (r + dr) * grid.cols + c + dc;
          criteria.maxSlopeDeg = Math.max(criteria.maxSlopeDeg, blocked[cell] ? Infinity : grid.slope[cell]);
          criteria.largeDuneFraction = Math.max(criteria.largeDuneFraction, grid.duneLarge[cell]);
          criteria.rockFraction = Math.max(criteria.rockFraction, grid.rock[cell]);
        }
      }
      if (!isAcceptableWorkspace(criteria.maxSlopeDeg, criteria.largeDuneFraction, params)) continue;
      const score = criteria.maxSlopeDeg + 50 * criteria.rockFraction + 0.5 * distanceToTargetM;
      if (score < bestScore) {
        bestScore = score;
        best = { lon: grid.lonOfCol(c), lat: grid.latOfRow(r), ok: true, criteria };
      }
    }
  }
  return best;
}

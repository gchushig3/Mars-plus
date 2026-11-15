// AI-assisted (Claude). Reviewed by the MARS+ team.
// Absorbed dose for time spent outside: dose (uGy) = rate (uGy/h) x hours.
// Galactic cosmic rays are uniform at this scale, so less time outside means less dose.

export function evaDoseUGy(rateUGyPerHour, minutesOutside) {
  return (rateUGyPerHour * minutesOutside) / 60;
}

/** Share of one surface day represented by an EVA (0..1). */
export function shareOfSol(minutesOutside) {
  return minutesOutside / (24 * 60);
}

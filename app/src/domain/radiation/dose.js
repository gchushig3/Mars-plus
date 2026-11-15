// AI-assisted (Claude; changes with Cursor, used by Henry). Reviewed by the MARS+ team.
// Absorbed dose for time on the surface: dose (uGy) = rate (uGy/h) x hours.
// Keep in parity with pipeline/lib/EvaDose.cs.
//
// What counts as exposure at the unshielded surface rate (RAD detector E):
//   - walking between stops
//   - science tasks at the stops (the crew is outside)
// What does not:
//   - airlock time: the crew is inside the habitat, which shields galactic cosmic rays
//   - the reserve: unused margin on a nominal timeline, not time spent outside
// Galactic cosmic rays are uniform at this scale, so less time outside means less dose.

/** Minutes at the surface rate. */
export function minutesOutside(travelMin, workMin) {
  return travelMin + workMin;
}

export function evaDoseUGy(rateUGyPerHour, minutesOnSurface) {
  return (rateUGyPerHour * minutesOnSurface) / 60;
}

/** Share of one surface day represented by an exposure (0..1). */
export function shareOfSol(minutesOnSurface) {
  return minutesOnSurface / (24 * 60);
}
/** Peak RAD measurement and event classification for the selected historical UTC day. */
export function radDay(radiation, day) {
  if (!day) return { day: null, peakUGyH: null, event: false };
  const rates = radiation.series.filter(([utc, rate]) => utc.split(' ')[0] === day && Number.isFinite(rate));
  return {
    day,
    peakUGyH: rates.length ? Math.max(...rates.map(([, rate]) => rate)) : null,
    event: rates.length > 0 && radiation.event.days.includes(day),
  };
}

// AI-assisted (Claude). Reviewed by the MARS+ team.
// Optional detour on the way out to a place with signs of water alteration (e.g. Brac), to photograph
// it: landing → site → sampling stop instead of landing → sampling stop. Only the time budget is checked
// here; the plan chain (weather, radiation) is unchanged and is stated as such in the app.

/**
 * @param {{direct:{timeMin:number,distanceM:number}, toSite:{timeMin:number,distanceM:number},
 *          fromSite:{timeMin:number,distanceM:number}, taskMin:number, paceFactor:number,
 *          planTotalMin:number|null, limitMin:number}} x
 */
export function detourCost({ direct, toSite, fromSite, taskMin, paceFactor, planTotalMin, limitMin }) {
  const extraWalkMin = (toSite.timeMin + fromSite.timeMin - direct.timeMin) * paceFactor;
  const extraMin = extraWalkMin + taskMin;
  const extraM = toSite.distanceM + fromSite.distanceM - direct.distanceM;
  const totalMin = planTotalMin == null ? null : planTotalMin + extraMin;
  return { extraWalkMin, extraMin, extraM, totalMin, limitMin, fits: totalMin == null ? null : totalMin <= limitMin };
}

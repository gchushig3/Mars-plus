// AI-assisted (Claude). Reviewed by the MARS+ team.
// Turns an evaluation into structured statements ({code, values}); the UI translates them.
// Deterministic "why / why not" explanation — no AI involved at runtime.

export function explainEvaluation(evaluation) {
  const { results, recommended, closest } = evaluation;
  const out = [];
  if (recommended) {
    out.push({ code: 'recommended', values: { planId: recommended.planId, departure: recommended.departure, totalMin: recommended.totalMin, returnHour: recommended.returnHour, doseUGy: recommended.doseUGy } });
    const sameHour = results.filter((r) => r.departure === recommended.departure && r.planId !== recommended.planId && r.status === 'rejected');
    for (const r of sameHour) out.push({ code: 'whyNotPlan', values: { planId: r.planId, filter: r.filter, reason: r.reason } });
    const windows = viableWindows(results, recommended.planId);
    if (windows.length) out.push({ code: 'departureWindow', values: { planId: recommended.planId, from: windows[0], to: windows[windows.length - 1] } });
  } else if (closest) {
    out.push({ code: 'postpone', values: { planId: closest.planId, departure: closest.departure, filter: closest.filter, reason: closest.reason } });
  }
  const counts = {};
  for (const r of results) if (r.status === 'rejected') counts[r.filter] = (counts[r.filter] ?? 0) + 1;
  out.push({ code: 'filterCounts', values: { counts, total: results.length, viable: evaluation.viable.length } });
  return out;
}

function viableWindows(results, planId) {
  return results.filter((r) => r.planId === planId && r.status === 'viable').map((r) => r.departure).sort((a, b) => a - b);
}

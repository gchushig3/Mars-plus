// AI-assisted (Claude). Reviewed by the MARS+ team.
export const fmt = (x, d = 0) => (x == null || Number.isNaN(x) ? '—' : Number(x).toFixed(d));
export function fmtHour(h) {
  const t = ((h % 24) + 24) % 24;
  let hh = Math.floor(t), mm = Math.round((t - hh) * 60);
  if (mm === 60) { hh = (hh + 1) % 24; mm = 0; }
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
export const fmtMin = (m) => `${Math.round(m)} min`;

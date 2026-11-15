// AI-assisted (Claude). Reviewed by the MARS+ team.
import { s, clear } from '../../shared/dom.js';

/** Ground temperature (typical + worst) and mean wind over 24 local solar hours. */
export function renderWeatherChart(svg, weather, { band, minC, title }) {
  clear(svg);
  const W = 400, H = 150, m = { l: 34, r: 30, t: 8, b: 20 };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.append(s('title', {}, title));
  const X = (h) => m.l + (h / 24) * (W - m.l - m.r);
  const YT = (t) => m.t + (1 - (t + 85) / 105) * (H - m.t - m.b);
  const YW = (w) => H - m.b - (w / 16) * (H - m.t - m.b);
  if (band) svg.append(s('rect', { x: X(band[0]), y: m.t, width: Math.max(1, X(Math.min(24, band[1])) - X(band[0])), height: H - m.t - m.b, fill: 'rgba(123,211,137,.14)', stroke: 'rgba(123,211,137,.6)' }));
  for (const r of weather.hours) {
    const w = r.typical.windMs;
    if (w != null) svg.append(s('rect', { x: X(r.h) + 2, y: YW(w), width: (W - m.l - m.r) / 24 - 4, height: H - m.b - YW(w), fill: '#4a3f3a' }));
  }
  svg.append(s('line', { x1: m.l, x2: W - m.r, y1: YT(minC), y2: YT(minC), stroke: '#a2453e', 'stroke-dasharray': '3 4' }));
  const line = (key, color, dash) => {
    let pts = [];
    const flush = () => { if (pts.length > 1) svg.append(s('polyline', { fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-dasharray': dash, points: pts.join(' ') })); pts = []; };
    for (const r of weather.hours) { const t = r[key].tempC; if (t == null) flush(); else pts.push(`${X(r.h + 0.5).toFixed(1)},${YT(t).toFixed(1)}`); }
    flush();
  };
  line('worst', '#c2a198', '4 3');
  line('typical', '#e0a98b', null);
  for (const t of [-80, -40, 0, 20]) svg.append(s('text', { x: m.l - 4, y: YT(t) + 3, 'text-anchor': 'end' }, `${t}°`));
  for (const w of [0, 8, 16]) svg.append(s('text', { x: W - m.r + 4, y: YW(w) + 3 }, `${w}`));
  for (const h of [0, 6, 12, 18, 24]) svg.append(s('text', { x: X(h), y: H - 6, 'text-anchor': 'middle' }, `${h}h`));
}

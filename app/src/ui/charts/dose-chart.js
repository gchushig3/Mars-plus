// AI-assisted (Claude). Reviewed by the MARS+ team.
import { s, clear } from '../../shared/dom.js';

/** RAD dose-rate series (detector E) with background line and the 28-Oct-2021 event highlighted. */
export function renderDoseChart(svg, radiation, title) {
  clear(svg);
  const W = 400, H = 130, m = { l: 34, r: 8, t: 8, b: 20 };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.append(s('title', {}, title));
  const toDay = (utc) => { const [d, t] = utc.split(' '); const [hh, mm] = t.split(':').map(Number); return Number(d.split('-')[1]) + (hh + mm / 60) / 24; };
  const pts = radiation.series.map(([u, v]) => [toDay(u), v]);
  const d0 = Math.floor(pts[0][0]), d1 = Math.ceil(pts[pts.length - 1][0]);
  const vmax = Math.max(30, ...pts.map((p) => p[1]));
  const X = (d) => m.l + ((d - d0) / (d1 - d0)) * (W - m.l - m.r), Y = (v) => m.t + (1 - v / vmax) * (H - m.t - m.b);
  svg.append(s('rect', { x: X(301), y: m.t, width: X(303) - X(301), height: H - m.t - m.b, fill: 'rgba(255,138,128,.12)' }));
  svg.append(s('line', { x1: m.l, x2: W - m.r, y1: Y(radiation.backgroundUGyH), y2: Y(radiation.backgroundUGyH), stroke: '#9e8f88', 'stroke-dasharray': '3 4' }));
  svg.append(s('polyline', { fill: 'none', stroke: '#ff8a80', 'stroke-width': 1.4, points: pts.map(([d, v]) => `${X(d).toFixed(1)},${Y(v).toFixed(1)}`).join(' ') }));
  for (const v of [0, 10, 20, 30]) if (v <= vmax) svg.append(s('text', { x: m.l - 4, y: Y(v) + 3, 'text-anchor': 'end' }, v));
  const months = { 295: '22 Oct', 301: '28 Oct', 306: '2 Nov', 310: '6 Nov' };
  for (const [d, label] of Object.entries(months)) if (+d >= d0 && +d <= d1) svg.append(s('text', { x: X(+d), y: H - 6, 'text-anchor': 'middle' }, label));
}

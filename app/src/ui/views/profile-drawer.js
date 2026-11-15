// AI-assisted (Claude). Reviewed by the MARS+ team.
// Elevation profile under the map, opened with a button. A red point marks the same place on the profile
// and on the map: move along the profile (pointer or keyboard slider) and the map point follows; hover the
// route on the map and the profile point follows. Profiles come from the application layer (no domain here).
import { h, s, clear } from '../../shared/dom.js';
import { fmt } from '../../shared/format.js';

const W = 1000, H = 150;

/**
 * @param {HTMLElement} wrap the element that holds the map; the drawer and its button are added to it
 * @param {{i18n:object, getProfile:(legId:string)=>object|null, onProbe:(p:{lon:number,lat:number}|null)=>void, onToggle:(open:boolean)=>void}} deps
 */
export function createProfileDrawer(wrap, { i18n, getProfile, onProbe, onToggle }) {
  let open = false, legId = 'landing_sampling', profile = null, index = 0;
  const toggle = h('button', { type: 'button', class: 'btn profile-toggle', 'aria-expanded': 'false', 'aria-controls': 'profile' });
  const drawer = h('section', { class: 'profile-drawer', id: 'profile', hidden: true });
  wrap.append(toggle, drawer);
  let legSel, summary, chart, svg, dot, rule, readout, slider, yTop, yBottom, xEnd, closeBtn;

  toggle.addEventListener('click', () => setOpen(!open));

  function setOpen(v) {
    open = v;
    drawer.hidden = !open;
    wrap.classList.toggle('profile-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.hidden = open;
    if (open) { load(legId); setIndex(index); closeBtn.focus(); } else { onProbe(null); toggle.focus(); }
    onToggle(open);
  }

  function build() {
    const { t } = i18n;
    toggle.textContent = `▲ ${t('profile.open')}`;
    clear(drawer);
    legSel = h('select', { 'aria-label': t('profile.leg'), onchange: (e) => { load(e.target.value); setIndex(0); } },
      h('option', { value: 'landing_sampling' }, t('profile.out')), h('option', { value: 'sampling_landing' }, t('profile.back')));
    legSel.value = legId;
    summary = h('span', { class: 'profile-summary' });
    closeBtn = h('button', { type: 'button', class: 'btn', onclick: () => setOpen(false) }, `▼ ${t('profile.close')}`);
    svg = s('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', class: 'profile-svg', role: 'img', 'aria-label': t('profile.title') });
    dot = h('div', { class: 'profile-dot', 'aria-hidden': 'true' });
    rule = h('div', { class: 'profile-rule', 'aria-hidden': 'true' });
    chart = h('div', { class: 'profile-chart' }, svg, rule, dot);
    yTop = h('span', { class: 'profile-y top' }); yBottom = h('span', { class: 'profile-y bottom' }); xEnd = h('span', { class: 'profile-x' });
    readout = h('p', { class: 'profile-readout', 'aria-live': 'polite' });
    slider = h('input', { type: 'range', min: '0', max: '1', step: '1', value: '0', 'aria-label': t('profile.slider'), oninput: () => setIndex(Number(slider.value)) });
    const move = (e) => {
      if (!profile) return;
      const r = chart.getBoundingClientRect();
      const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      setIndex(profile.indexAt(f * profile.totalM));
    };
    chart.addEventListener('pointermove', move);
    chart.addEventListener('pointerdown', move);
    drawer.append(
      h('div', { class: 'profile-head' }, h('strong', {}, t('profile.title')), legSel, summary, h('span', { class: 'profile-key' }, h('i', { 'aria-hidden': 'true' }), t('profile.dunes')), closeBtn),
      h('div', { class: 'profile-body' }, h('div', { class: 'profile-axis' }, yTop, yBottom), chart),
      h('div', { class: 'profile-foot' }, h('span', {}, '0 m'), xEnd),
      slider, readout,
    );
    if (open) { load(legId); setIndex(index); }
  }

  function load(id) {
    legId = id;
    profile = getProfile(id);
    clear(svg);
    if (!profile) return;
    const { t } = i18n;
    const z0 = profile.elev[0];
    const lo = profile.minZ - z0, hi = profile.maxZ - z0, pad = Math.max(0.5, (hi - lo) * 0.12);
    const yMin = lo - pad, yMax = hi + pad;
    const x = (d) => (d / profile.totalM) * W;
    const y = (z) => H - ((z - z0 - yMin) / (yMax - yMin)) * H;
    for (const [a, b] of profile.duneSpans) {
      svg.append(s('rect', { x: x(profile.dist[a]), y: 0, width: Math.max(1, x(profile.dist[b]) - x(profile.dist[a])), height: H, fill: '#cc8e37', 'fill-opacity': '0.22' }));
    }
    const pts = profile.dist.map((d, i) => `${x(d).toFixed(1)},${y(profile.elev[i]).toFixed(1)}`);
    svg.append(
      s('polygon', { points: `0,${H} ${pts.join(' ')} ${W},${H}`, fill: '#e0a98b', 'fill-opacity': '0.18' }),
      s('polyline', { points: pts.join(' '), fill: 'none', stroke: '#e0a98b', 'stroke-width': 2.5, 'vector-effect': 'non-scaling-stroke' }),
    );
    yTop.textContent = `${fmt(yMax, 1)} m`; yBottom.textContent = `${fmt(yMin, 1)} m`;
    xEnd.textContent = `${fmt(profile.totalM)} m`;
    summary.textContent = t('profile.summary', { m: fmt(profile.totalM), up: fmt(profile.climbM, 1), down: fmt(profile.descentM, 1) });
    slider.max = String(profile.dist.length - 1);
    if (legSel.value !== id) legSel.value = id;
  }

  function setIndex(i) {
    if (!profile) return;
    const { t } = i18n;
    index = Math.max(0, Math.min(profile.dist.length - 1, i));
    const f = profile.dist[index] / profile.totalM;
    const z0 = profile.elev[0];
    const box = svg.viewBox.baseVal;
    const poly = svg.querySelector('polyline');
    const yPx = poly ? Number(poly.getAttribute('points').split(' ')[index].split(',')[1]) / box.height : 0.5;
    dot.style.left = `${(f * 100).toFixed(2)}%`;
    dot.style.top = `${(yPx * 100).toFixed(2)}%`;
    rule.style.left = dot.style.left;
    slider.value = String(index);
    const onDunes = profile.duneSpans.some(([a, b]) => index >= a && index <= b);
    readout.textContent = t('profile.readout', { d: fmt(profile.dist[index]), z: `${profile.elev[index] - z0 >= 0 ? '+' : ''}${fmt(profile.elev[index] - z0, 1)}`, g: fmt(profile.grade(index), 0) })
      + (onDunes ? ` · ${t('profile.onDunes')}` : '');
    const [lon, lat] = profile.coords[index];
    onProbe({ lon, lat });
  }

  return {
    build,
    isOpen: () => open,
    /** The pointer is over an official route on the map: move the profile point there. */
    followMap(id, p) {
      if (!open) return;
      if (id !== legId) load(id);
      setIndex(profile.nearest(p.lon, p.lat));
    },
  };
}

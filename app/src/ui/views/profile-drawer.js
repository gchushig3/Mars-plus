// AI-assisted (Claude). Reviewed by the MARS+ team.
// Elevation profile under the map, opened with a button. A red point marks the same place on the profile
// and on the map: move along the profile (pointer or keyboard slider) and the map point follows; hover the
// route on the map and the profile point follows. Profiles come from the application layer (no domain here).
import { h, s, clear } from '../../shared/dom.js';
import { fmt } from '../../shared/format.js';

const W = 1000, H = 150;

/**
 * @param {HTMLElement} wrap the element that holds the map; the drawer and its button are added to it
 * @param {{i18n:object, getProfile:(coords:number[][])=>Promise<object|null>, onProbe:(p:{lon:number,lat:number}|null)=>void, onToggle:(open:boolean)=>void}} deps
 */
export function createProfileDrawer(wrap, { i18n, getProfile, onProbe, onToggle }) {
  let open = false, routes = [], preferredId = 'landing_sampling', active = null, profile = null, index = 0, request = 0, heightY;
  const toggle = h('button', { type: 'button', class: 'btn profile-toggle', 'aria-expanded': 'false', 'aria-controls': 'profile' });
  const drawer = h('section', { class: 'profile-drawer', id: 'profile', hidden: true });
  wrap.append(toggle, drawer);
  let routeSel, summary, chart, svg, dot, rule, readout, slider, yTop, yBottom, xEnd, closeBtn, status, key, body, foot;

  toggle.addEventListener('click', () => setOpen(!open));

  function setOpen(v) {
    open = v;
    drawer.hidden = !open;
    wrap.classList.toggle('profile-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.hidden = open;
    if (open) {
      updateRoutes(true);
      (routeSel.disabled ? closeBtn : routeSel).focus();
    } else {
      request++;
      onProbe(null);
      toggle.focus();
    }
    onToggle(open);
  }

  function build() {
    const { t } = i18n;
    toggle.textContent = `▲ ${t('profile.open')}`;
    clear(drawer);
    routeSel = h('select', { 'aria-label': t('profile.leg'), onchange: (e) => { preferredId = e.target.value; updateRoutes(); } });
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
    key = h('span', { class: 'profile-key' }, h('i', { 'aria-hidden': 'true' }), t('profile.dunes'));
    body = h('div', { class: 'profile-body' }, h('div', { class: 'profile-axis' }, yTop, yBottom), chart);
    foot = h('div', { class: 'profile-foot' }, h('span', {}, '0 m'), xEnd);
    status = h('p', { class: 'profile-status', role: 'status' });
    drawer.append(
      h('div', { class: 'profile-head' }, h('strong', {}, t('profile.title')), routeSel, closeBtn),
      h('div', { class: 'profile-meta' }, summary, key),
      body, foot, slider, readout, status,
    );
    updateRoutes(true);
  }

  function updateRoutes(force = false) {
    if (!routeSel) return;
    const { t } = i18n;
    const selected = routes.find((r) => r.id === preferredId) ?? routes[0] ?? null;
    routeSel.replaceChildren(...routes.map(({ id, label, leg, name }) =>
      h('option', { value: id }, t(label, { leg: leg ? t(leg) : '', name }))));
    routeSel.disabled = !selected;
    if (selected) routeSel.value = selected.id;
    if (!open || (!force && active?.id === selected?.id && active?.coords === selected?.coords)) return;
    const same = active?.id === selected?.id && active?.coords === selected?.coords;
    if (!same) index = 0;
    active = selected;
    load(selected);
  }

  function showChart(visible) {
    for (const el of [key, body, foot, slider, readout, summary]) el.hidden = !visible;
  }

  async function load(route) {
    const id = ++request;
    const { t } = i18n;
    profile = null;
    clear(svg);
    showChart(false);
    onProbe(null);
    status.textContent = t(route ? 'profile.loading' : 'profile.noRoutes');
    status.hidden = false;
    if (!route) return;
    let value;
    try { value = await getProfile(route.coords); }
    catch (err) { if (id === request) console.error(err); }
    if (id !== request) return;
    if (!value) { status.textContent = t('profile.unavailable'); return; }
    profile = value;
    draw();
    showChart(true);
    status.textContent = [profile.sampled && t('profile.dem'), profile.partial && t('profile.gaps')].filter(Boolean).join(' ');
    status.hidden = !status.textContent;
    setIndex(index);
  }

  const reference = () => profile.elev.find(Number.isFinite);
  function draw() {
    const { t } = i18n;
    const z0 = reference();
    const lo = profile.minZ - z0, hi = profile.maxZ - z0, pad = Math.max(0.5, (hi - lo) * 0.12);
    const yMin = lo - pad, yMax = hi + pad;
    const x = (d) => (d / profile.totalM) * W;
    heightY = (z) => H - ((z - z0 - yMin) / (yMax - yMin)) * H;
    for (const [a, b] of profile.duneSpans) {
      svg.append(s('rect', { x: x(profile.dist[a]), y: 0, width: Math.max(1, x(profile.dist[b]) - x(profile.dist[a])), height: H, fill: '#cc8e37', 'fill-opacity': '0.22' }));
    }
    let start = 0;
    for (let i = 0; i <= profile.elev.length; i++) {
      if (Number.isFinite(profile.elev[i])) continue;
      if (i > start) drawSpan(start, i - 1);
      start = i + 1;
    }
    function drawSpan(first, last) {
      const pts = profile.dist.slice(first, last + 1).map((d, i) => `${x(d).toFixed(1)},${heightY(profile.elev[first + i]).toFixed(1)}`);
      if (first === last) {
        svg.append(s('circle', { cx: x(profile.dist[first]), cy: heightY(profile.elev[first]), r: 2.5, fill: '#e0a98b' }));
        return;
      }
      svg.append(
        s('polygon', { points: `${x(profile.dist[first])},${H} ${pts.join(' ')} ${x(profile.dist[last])},${H}`, fill: '#e0a98b', 'fill-opacity': '0.18' }),
        s('polyline', { points: pts.join(' '), fill: 'none', stroke: '#e0a98b', 'stroke-width': 2.5, 'vector-effect': 'non-scaling-stroke' }),
      );
    }
    yTop.textContent = `${fmt(yMax, 1)} m`; yBottom.textContent = `${fmt(yMin, 1)} m`;
    xEnd.textContent = `${fmt(profile.totalM)} m`;
    summary.textContent = t(profile.partial ? 'profile.partialSummary' : 'profile.summary',
      { m: fmt(profile.totalM), up: fmt(profile.climbM, 1), down: fmt(profile.descentM, 1) });
    slider.max = String(profile.dist.length - 1);
  }

  function setIndex(i) {
    if (!profile) return;
    const { t } = i18n;
    index = Math.max(0, Math.min(profile.dist.length - 1, i));
    const f = profile.dist[index] / profile.totalM;
    const elevation = profile.elev[index];
    dot.hidden = !Number.isFinite(elevation);
    dot.style.left = `${(f * 100).toFixed(2)}%`;
    if (!dot.hidden) dot.style.top = `${(heightY(elevation) * 100 / H).toFixed(2)}%`;
    rule.style.left = dot.style.left;
    slider.value = String(index);
    const onDunes = profile.duneSpans.some(([a, b]) => index >= a && index <= b);
    const relativeZ = elevation - reference();
    const grade = profile.grade(index);
    const values = { d: fmt(profile.dist[index]), z: `${relativeZ >= 0 ? '+' : ''}${fmt(relativeZ, 1)}`, g: grade == null ? '—' : `${fmt(grade, 0)}%` };
    readout.textContent = t(dot.hidden ? 'profile.noElevationAt' : (Number.isFinite(profile.elev[0]) ? 'profile.readout' : 'profile.readoutPartial'), values)
      + (onDunes ? ` · ${t('profile.onDunes')}` : '');
    const [lon, lat] = profile.coords[index];
    onProbe({ lon, lat });
  }

  return {
    build,
    isOpen: () => open,
    setRoutes(list) { routes = list; updateRoutes(); },
    /** Hover follows the selected route. The selector stays stable where the paths overlap. */
    followMap(id, p) {
      if (!open || !profile || id !== active?.id) return;
      setIndex(profile.nearest(p.lon, p.lat));
    },
  };
}

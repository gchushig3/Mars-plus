// AI-assisted (Claude). Reviewed by the MARS+ team.
// User route A -> B, computed in the browser (Web Worker) over the 2 m terrain grid.
import { h, s, clear } from '../../shared/dom.js';
import { fmt } from '../../shared/format.js';
import { renderElevationProfile } from '../charts/elevation-profile.js';

export function createRoutePanel(el, { i18n, actions }) {
  let btnA, btnB, status, stats, svg;

  function build() {
    const { t } = i18n;
    clear(el);
    btnA = h('button', { type: 'button', class: 'btn', onclick: () => actions.pick('A') }, t('route.setA'));
    btnB = h('button', { type: 'button', class: 'btn', onclick: () => actions.pick('B') }, t('route.setB'));
    status = h('div', { class: 'status', role: 'status', 'aria-live': 'polite' });
    stats = h('div', { class: 'stats' });
    svg = s('svg', { class: 'chart', role: 'img' });
    el.append(
      h('h2', {}, t('route.title')),
      h('p', { class: 'lead' }, t('route.help')),
      h('div', { class: 'btn-row' }, btnA, btnB,
        h('button', { type: 'button', class: 'btn', onclick: actions.useMission }, t('route.mission')),
        h('button', { type: 'button', class: 'btn', onclick: actions.clear }, t('route.clear'))),
      status, stats, svg,
    );
  }

  function update(state) {
    const { t } = i18n;
    btnA.setAttribute('aria-pressed', String(state.pick === 'A'));
    btnB.setAttribute('aria-pressed', String(state.pick === 'B'));
    const rs = state.routeStatus;
    status.className = `status${rs.kind === 'error' ? ' bad' : ''}`;
    status.textContent =
      state.routingReady === 'error' ? t('route.terrainError')
        : state.pick === 'A' ? t('route.pickA') : state.pick === 'B' ? t('route.pickB')
        : rs.kind === 'computing' ? t(state.routingReady ? 'route.computing' : 'route.loadingTerrain')
        : !state.routingReady && rs.kind === 'idle' ? t('route.loadingTerrain')
          : rs.kind === 'error' ? t(`route.${rs.code}`)
            : rs.kind === 'done' ? t('route.done', { ms: rs.ms }) : '';
    clear(stats);
    const r = state.userRoute;
    svg.style.display = r ? '' : 'none';
    if (!r) return;
    const stat = (k, v) => h('div', { class: 'stat' }, h('div', { class: 'k' }, t(k)), h('div', { class: 'v' }, v));
    stats.append(
      stat('route.distance', `${fmt(r.distanceM)} m`), stat('route.time', `${fmt(r.timeMin, 1)} min`),
      stat('route.climbDescent', `+${fmt(r.climbM, 1)} / −${fmt(r.descentM, 1)}`), stat('route.dunes', `${fmt(r.largeDuneM)} m`),
      stat('route.maxSlope', `${fmt(r.maxSlopeDeg, 1)}°`), stat('route.rocks', `${fmt(r.maxRockFraction * 100)}%`));
    renderElevationProfile(svg, [{ coords: r.coords, color: '#f4f1ee' }], t('route.profile'));
  }

  return { build, update };
}

// AI-assisted (Claude). Reviewed by the MARS+ team.
// Official EVA route (Landing <-> Issole) computed by the pipeline engine at 1, 2 and 5 m.
import { h, clear } from '../../shared/dom.js';
import { fmt } from '../../shared/format.js';

const LEGS = ['landing_sampling', 'sampling_landing', 'straight_landing_sampling'];

export function createMissionPanel(el, { i18n, data, store }) {
  let resButtons = [], tbody, badge, validation;

  function build() {
    const { t } = i18n;
    clear(el);
    resButtons = [1, 2, 5].map((r) => h('button', { type: 'button', onclick: () => store.set({ officialRes: r }) }, `${r} m`));
    badge = h('span', { class: 'badge' });
    tbody = h('tbody');
    el.append(
      h('h2', {}, t('mission.title')),
      h('p', { class: 'lead' }, t('mission.lead')),
      h('div', { class: 'field' }, h('span', {}, t('mission.res')), h('div', { class: 'seg', role: 'group', 'aria-label': t('mission.res') }, resButtons), badge),
      h('table', { class: 'data' },
        h('thead', {}, h('tr', {}, ...['mission.leg', 'mission.dist', 'mission.time', 'mission.climb', 'mission.dunes', 'mission.slope'].map((k) => h('th', { scope: 'col' }, t(k))))),
        tbody),
      h('div', { class: 'legend' },
        legendLine('#5ec8f2', t('legend.out')), legendLine('#cc8e37', t('legend.back')),
        legendLine('#b9aaa2', t('legend.straight'), true), legendLine('#c792ea', t('legend.rover'), true), legendLine('#f4f1ee', t('legend.user'))),
      h('p', { class: 'note' }, t('mission.note')),
    );
    const official = data.routes.runs.find((x) => x.resM === data.routes.primaryResM && x.id === 'landing_sampling');
    const rover = data.routes.roverPath;
    validation = h('div', { class: 'callout ok', role: 'status', 'aria-live': 'polite' });
    el.append(
      h('div', { class: 'callout' }, t('rover.compare', { dist: fmt(rover.distanceM), ratio: fmt(rover.distanceM / official.distanceM, 1) })),
      validation,
    );
  }

  function update(state) {
    const { t } = i18n;
    resButtons.forEach((b, i) => b.setAttribute('aria-pressed', String([1, 2, 5][i] === state.officialRes)));
    clear(tbody);
    for (const id of LEGS) {
      const r = data.routes.runs.find((x) => x.resM === state.officialRes && x.id === id);
      if (!r) continue;
      tbody.append(h('tr', {},
        h('td', {}, t(`leg.${id}`)), h('td', { class: 'mono' }, `${fmt(r.distanceM)} m`), h('td', { class: 'mono' }, `${fmt(r.timeMin, 1)}′`),
        h('td', { class: 'mono' }, `+${fmt(r.climbM, 1)}`), h('td', { class: 'mono' }, `${fmt(r.largeDuneM)} m`), h('td', { class: 'mono' }, `${fmt(r.maxSlopeDeg, 1)}°`)));
    }
    const times = [1, 2, 5].map((res) => data.routes.runs.find((x) => x.resM === res && x.id === 'landing_sampling')?.timeMin).filter(Boolean);
    const spread = (Math.max(...times) - Math.min(...times)) / Math.min(...times);
    badge.className = `badge ${spread < 0.05 ? 'ok' : 'warn'}`;
    badge.textContent = spread < 0.05 ? t('mission.stable') : t('mission.unstable');
    const v = state.traverseValidation;
    validation.textContent = v
      ? t('validation.text', { len: fmt(v.lengthInsideM), pct: fmt(v.blockedShare * 100, 1), cells: v.blockedCells, total: v.cellsInside, area: fmt(v.areaBlockedShare * 100, 1) })
      : t('validation.pending');
  }

  return { build, update };
}

function legendLine(color, label, dashed = false) {
  return h('span', {}, h('i', { class: 'ln', style: `background:${dashed ? `repeating-linear-gradient(90deg,${color} 0 4px,transparent 4px 7px)` : color}` }), label);
}

// AI-assisted (Claude). Reviewed by the MARS+ team.
// Official EVA route (Landing <-> Issole) computed by the pipeline engine at 1, 2 and 5 m.
import { h, clear } from '../../shared/dom.js';

export function createMissionPanel(el, { i18n, data, store }) {
  let resButtons = [], legs, reference, badge, validation, currentRes, currentValidation;

  function number(value, fraction = 0) {
    return Number(value).toLocaleString(i18n.lang, { minimumFractionDigits: fraction, maximumFractionDigits: fraction });
  }

  function leg(id, res) {
    const { t } = i18n;
    const r = data.routes.runs.find((run) => run.resM === res && run.id === id);
    if (!r) return null;
    const metrics = [
      ['dist', `${number(r.distanceM)} m`],
      ['time', `${number(r.timeMin, 1)} min`],
      ['climb', `+${number(r.climbM, 1)} m`],
      ['dunes', `${number(r.largeDuneM)} m`],
      ['slope', `${number(r.maxSlopeDeg, 1)}°`],
    ];
    return h('article', { class: 'mission-leg', 'data-leg': id },
      h('h3', {}, t(`leg.${id}`)),
      h('dl', { class: 'mission-metrics' }, metrics.map(([key, value]) =>
        h('div', {}, h('dt', {}, t(`mission.${key}`)), h('dd', { class: 'mono' }, value)))));
  }

  function build() {
    const { t } = i18n;
    clear(el);
    resButtons = [1, 2, 5].map((r) => h('button', { type: 'button', onclick: () => store.set({ officialRes: r }) }, `${r} m`));
    badge = h('span', { class: 'badge' });
    legs = h('div', { class: 'mission-legs' });
    reference = h('div');
    validation = h('p', { class: 'note', role: 'status' });
    currentRes = undefined;
    currentValidation = undefined;
    const official = data.routes.runs.find((x) => x.resM === data.routes.primaryResM && x.id === 'landing_sampling');
    const rover = data.routes.roverPath;
    const times = [1, 2, 5].map((res) => data.routes.runs.find((x) => x.resM === res && x.id === 'landing_sampling')?.timeMin).filter(Boolean);
    const stable = (Math.max(...times) - Math.min(...times)) / Math.min(...times) < 0.05;
    badge.className = `badge ${stable ? 'ok' : 'warn'}`;
    badge.textContent = t(stable ? 'mission.stable' : 'mission.unstable');
    el.append(
      h('h2', {}, t('mission.title')),
      h('p', { class: 'lead' }, t('mission.lead')),
      h('h3', { class: 'mission-subhead' }, t('mission.routeTitle')),
      h('div', { class: 'field' }, h('span', {}, t('mission.res')), h('div', { class: 'seg', role: 'group', 'aria-label': t('mission.res') }, resButtons), badge),
      legs,
      h('p', { class: 'note' }, t('mission.note')),
      h('details', { class: 'mission-details' }, h('summary', {}, t('mission.references')), reference,
        h('p', { class: 'note' }, t('mission.straightNote'))),
      h('details', { class: 'mission-details' }, h('summary', {}, t('mission.roverTitle')),
        h('p', { class: 'note' }, t('rover.compare', { dist: number(rover.distanceM), ratio: number(rover.distanceM / official.distanceM, 1) })),
        h('h3', {}, t('mission.validationTitle')), validation),
    );
  }

  function update(state) {
    const { t } = i18n;
    if (state.officialRes !== currentRes) {
      currentRes = state.officialRes;
      resButtons.forEach((b, i) => b.setAttribute('aria-pressed', String([1, 2, 5][i] === currentRes)));
      legs.replaceChildren(...['landing_sampling', 'sampling_landing'].map((id) => leg(id, currentRes)).filter(Boolean));
      const straight = leg('straight_landing_sampling', currentRes);
      reference.replaceChildren(...(straight ? [straight] : []));
    }
    const v = state.traverseValidation ?? null;
    if (v === currentValidation) return;
    currentValidation = v;
    validation.textContent = v
      ? t('validation.text', { len: number(v.lengthInsideM), pct: number(v.blockedShare * 100, 1), cells: v.blockedCells, total: v.cellsInside, area: number(v.areaBlockedShare * 100, 1) })
      : t('validation.pending');
  }

  return { build, update };
}

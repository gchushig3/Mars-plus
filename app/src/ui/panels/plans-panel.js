// AI-assisted (Claude). Reviewed by the MARS+ team.
// EVA plan chain: controls, GO / NO-GO verdict, deterministic explanation and plan x hour grid.
import { h, clear } from '../../shared/dom.js';
import { fmtHour } from '../../shared/format.js';
import { reasonText, planName, filterName, statementText } from './common.js';

export function createPlansPanel(el, { i18n, data, actions }) {
  let ctl = {}, verdict, explainList, grid;
  const params = data.params;

  function build(state) {
    const { t } = i18n;
    clear(el);
    const o = state.planOptions;
    ctl.scenario = h('select', { onchange: (e) => actions.setOption({ weatherScenario: e.target.value }) },
      ...['typical', 'worst', 'storm'].map((k) => h('option', { value: k, selected: o.weatherScenario === k }, t(`scenario.${k}`))));
    ctl.dust = h('input', { type: 'checkbox', checked: o.dustStormAlert, onchange: (e) => actions.setOption({ dustStormAlert: e.target.checked }) });
    ctl.solar = h('input', { type: 'checkbox', checked: o.solarEventAlert, onchange: (e) => actions.setOption({ solarEventAlert: e.target.checked }) });
    ctl.limit = h('input', { type: 'number', min: 60, max: 480, step: 5, value: o.limitMin, onchange: (e) => { const v = Number(e.target.value); if (v >= 60 && v <= 480) actions.setOption({ limitMin: v }); } });
    ctl.pace = h('select', { onchange: (e) => actions.setPace(e.target.value) },
      ...['slow', 'normal', 'fast'].map((k) => h('option', { value: k, selected: state.paceKey === k }, t(`pace.${k}`))));
    verdict = h('div', { class: 'verdict', role: 'status', 'aria-live': 'polite' });
    explainList = h('ul', { class: 'explain' });
    grid = h('table', { class: 'plan-grid' });
    el.append(
      h('h2', {}, t('plans.title')),
      h('p', { class: 'lead' }, t('plans.lead')),
      h('label', { class: 'field' }, t('plans.scenario'), ctl.scenario),
      h('label', { class: 'check' }, ctl.dust, t('plans.alertDust')),
      h('label', { class: 'check' }, ctl.solar, t('plans.alertSolar')),
      h('div', { class: 'field' }, h('label', {}, t('plans.limit'), ' ', ctl.limit), h('label', {}, t('plans.pace'), ' ', ctl.pace)),
      verdict, explainList,
      h('div', { class: 'note' }, t('plans.grid')), grid,
      h('div', { class: 'legend' },
        h('span', {}, h('i', { class: 'sw', style: 'background:var(--ok)' }), t('plans.viable')),
        ...[1, 2, 3, 4, 5].map((n) => h('span', {}, h('i', { class: 'sw', style: `background:var(--f${n})` }), `${n} ${filterName(i18n, n)}`))),
    );
  }

  function update(state) {
    const { t } = i18n;
    const { evaluation, explanation } = state;
    if (!evaluation) return;
    const rec = evaluation.recommended;
    clear(verdict);
    verdict.className = `verdict ${rec ? 'ok' : 'bad'}`;
    const head = explanation.find((s) => s.code === 'recommended' || s.code === 'postpone');
    verdict.append(h('strong', {}, rec ? t('explain.go') : t('explain.noGo')), h('span', {}, head ? statementText(i18n, head) : ''));
    clear(explainList);
    for (const st of explanation) if (st !== head) explainList.append(h('li', {}, statementText(i18n, st)));

    clear(grid);
    const hours = evaluation.options.departureHours;
    grid.append(h('tr', {}, h('th', { class: 'row', scope: 'col' }, ''), ...hours.map((x) => h('th', { scope: 'col' }, String(x)))));
    for (const p of params.plans) {
      const row = h('tr', {}, h('th', { class: 'row', scope: 'row', title: planName(i18n, p.id) }, `${p.id} · ${planName(i18n, p.id)}`));
      for (const hr of hours) {
        const r = evaluation.results.find((x) => x.planId === p.id && x.departure === hr);
        const isBest = rec && rec.planId === p.id && rec.departure === hr;
        const label = r.status === 'viable' ? `${fmtHour(hr)} · ${Math.round(r.totalMin)} min` : `${fmtHour(hr)} · ${filterName(i18n, r.filter)}: ${reasonText(i18n, r.reason)}`;
        row.append(h('td', { class: `${r.status === 'viable' ? 'viable' : `f${r.filter}`}${isBest ? ' best' : ''}`, title: label, 'aria-label': label }, r.status === 'viable' ? '✓' : String(r.filter)));
      }
      grid.append(row);
    }
  }

  return { build, update };
}

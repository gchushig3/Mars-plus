// AI-assisted (Claude). Reviewed by the MARS+ team.
// EVA plan chain: controls, GO / NO-GO verdict, deterministic explanation and plan x hour grid.
import { h, clear } from '../../shared/dom.js';
import { fmtHour } from '../../shared/format.js';
import { reasonText, planName, filterName, statementText } from './common.js';

export function createPlansPanel(el, { i18n, data, actions }) {
  let ctl = {}, verdict, explainList, grid, sensBtn, sensStatus, sensTable, sensNote;
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
    // Sensitivity of the result to the sand assumption
    sensBtn = h('button', { type: 'button', class: 'btn', onclick: actions.runSensitivity }, t('sens.run'));
    sensStatus = h('div', { class: 'status', role: 'status', 'aria-live': 'polite' });
    sensTable = h('table', { class: 'data' });
    sensNote = h('div', { class: 'callout' });
    el.append(h('h3', { class: 'subhead' }, t('sens.title')), h('p', { class: 'lead' }, t('sens.lead')), h('div', { class: 'btn-row' }, sensBtn), sensStatus, sensTable, sensNote);
  }

  function updateSensitivity(state) {
    const { t } = i18n;
    const s = state.sensitivity;
    sensBtn.disabled = s.status === 'running';
    sensStatus.textContent = s.status === 'running' ? t('sens.running') : s.status === 'error' ? t('sens.error') : '';
    clear(sensTable);
    sensNote.style.display = 'none';
    const rows = state.sensitivityView;
    if (!rows?.length) return;
    sensTable.append(h('tr', {}, ...['sens.factor', 'sens.out', 'sens.back', 'sens.plan'].map((k) => h('th', { scope: 'col' }, t(k)))));
    for (const r of rows) {
      const plan = r.rec ? `${r.rec.planId} · ${fmtHour(r.rec.departure)}` : t('sens.none');
      sensTable.append(h('tr', {},
        h('td', {}, `×${r.factor}${r.isModel ? ` ${t('sens.model')}` : ''}`),
        h('td', { class: 'mono' }, `${r.outMin.toFixed(1)}′`), h('td', { class: 'mono' }, `${r.backMin.toFixed(1)}′`), h('td', { class: 'mono' }, plan)));
    }
    const plans = new Set(rows.map((r) => (r.rec ? `${r.rec.planId}@${r.rec.departure}` : 'none')));
    sensNote.style.display = '';
    sensNote.className = `callout${plans.size === 1 ? ' ok' : ''}`;
    sensNote.textContent = plans.size === 1 ? t('sens.stable') : t('sens.changes');
  }

  function update(state) {
    const { t } = i18n;
    const { evaluation, explanation } = state;
    updateSensitivity(state);
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

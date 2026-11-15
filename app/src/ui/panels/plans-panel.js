// AI-assisted (Claude; changes with Cursor, used by Henry). Reviewed by the MARS+ team.
// EVA plan chain: controls, GO / NO-GO verdict, deterministic explanation and plan x hour grid.
import { h, clear } from '../../shared/dom.js';
import { fmtHour } from '../../shared/format.js';
import { reasonText, planName, filterName, statementText } from './common.js';
import { createDustObservations } from './dust-observations.js';

export function createPlansPanel(el, { i18n, data, actions }) {
  let ctl = {}, verdict, explainList, grid, sensBtn, sensStatus, sensTable, sensNote, dustObservations;
  const params = data.params;

  function build(state) {
    const { t } = i18n;
    clear(el);
    const o = state.planOptions;
    ctl.scenario = h('select', { onchange: (e) => actions.setOption({ weatherScenario: e.target.value }) },
      ...['typical', 'worst', 'storm'].map((k) => h('option', { value: k, selected: o.weatherScenario === k }, t(`scenario.${k}`))));
    ctl.dust = h('p', { class: 'note', role: 'status' });
    ctl.sol = h('input', {
      type: 'number', min: 0, max: 4000, step: 1, value: o.dustSol ?? '', inputmode: 'numeric',
      'aria-label': t('plans.dustSol'),
      onchange: (e) => { const raw = e.target.value.trim(); actions.setOption({ dustSol: raw === '' ? null : Number(raw) }); },
    });
    dustObservations = createDustObservations({
      i18n, catalog: data.dust, threshold: params.dust.alertTau880,
      onSelect: (sol) => actions.setOption({ dustSol: sol }),
    });
    const days = [...new Set(data.radiation.series.map(([utc]) => utc.split(' ')[0]))];
    const dateFormat = new Intl.DateTimeFormat(i18n.lang, { dateStyle: 'medium', timeZone: 'UTC' });
    ctl.solar = h('select', { onchange: (e) => actions.setOption({ radiationDay: e.target.value || null }) },
      h('option', { value: '' }, t('plans.radBackground')),
      days.map((day) => {
        const [year, ordinal] = day.split('-').map(Number);
        return h('option', { value: day, selected: day === o.radiationDay }, dateFormat.format(new Date(Date.UTC(year, 0, ordinal))));
      }));
    ctl.radNote = h('p', { class: 'note', role: 'status' });
    ctl.limit = h('input', { type: 'number', min: 60, max: 480, step: 5, value: o.limitMin, onchange: (e) => { const v = Number(e.target.value); if (v >= 60 && v <= 480) actions.setOption({ limitMin: v }); } });
    ctl.pace = h('select', { onchange: (e) => actions.setPace(e.target.value) },
      ...['slow', 'normal', 'fast'].map((k) => h('option', { value: k, selected: state.paceKey === k }, t(`pace.${k}`))));
    verdict = h('div', { class: 'verdict', role: 'status', 'aria-live': 'polite' });
    explainList = h('ul', { class: 'explain' });
    grid = h('table', { class: 'plan-grid' });
    ctl.note = h('p', { class: 'note' });
    el.append(
      h('h2', {}, t('plans.title')),
      h('p', { class: 'lead' }, t('plans.lead')),
      h('label', { class: 'field' }, t('plans.scenario'), ctl.scenario),
      h('label', { class: 'field' }, t('plans.dustSol'), ctl.sol),
      ctl.dust, ctl.note, dustObservations.el,
      h('label', { class: 'field' }, t('plans.radDay'), ctl.solar),
      ctl.radNote,
      (ctl.wayBack = h('a', { class: 'callout way-back', href: '#panel-emergency', hidden: true }, t('plans.wayBack'))),
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
    if (ctl.dust) {
      ctl.sol.value = state.planOptions.dustSol ?? '';
      dustObservations.select(state.planOptions.dustSol);
      ctl.dust.textContent = t(state.dustInfo?.tau == null ? 'plans.dustStatusUnknown' : state.planOptions.dustStormAlert ? 'plans.dustStatusActive' : 'plans.dustStatusBelow');
      ctl.note.textContent = dustText(i18n, state.dustInfo, data.params);
      const solar = state.solarInfo;
      const rate = Number.isFinite(solar?.peakUGyH) ? solar.peakUGyH.toLocaleString(i18n.lang, { maximumFractionDigits: 2 }) : '';
      ctl.radNote.textContent = t(solar?.event ? 'plans.radActive' : rate ? 'plans.radOutside' : 'plans.radReference', { rate });
      ctl.wayBack.hidden = !(state.planOptions.dustStormAlert || state.planOptions.solarEventAlert);
    }
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

function dustText(i18n, dust, params) {
  const { t, lang } = i18n;
  const threshold = params.dust.alertTau880.toLocaleString(lang);
  if (!dust || dust.tau == null) {
    if (dust?.basis === 'sol-missing') return t('plans.dustMissing', { sol: dust.sol, threshold });
    return t('plans.dustUnavailable', { threshold });
  }
  const tau = dust.tau.toLocaleString(lang, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  if (dust.basis === 'sol') return t('plans.dustSolValue', { tau, sol: dust.sol, ls: dust.ls, n: dust.n, threshold });
  if (dust.basis === 'storm-sols') return t('plans.dustStormValue', { tau, from: params.dust.stormSols[0], to: params.dust.stormSols[1], threshold });
  return t('plans.dustBackgroundValue', { tau, from: params.dust.backgroundSols[0], to: params.dust.backgroundSols[1], threshold });
}

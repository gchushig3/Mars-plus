// AI-assisted (Claude). Reviewed by the MARS+ team.
// Emergency return: if a dust-storm or solar-particle alert arrives during the walk, how does the crew
// get home? Used by the person in the habitat; the "astronaut view" shows the minimum the crew would get.
import { h, clear } from '../../shared/dom.js';
import { fmt } from '../../shared/format.js';
import { planName } from './common.js';

export function createContingencyPanel(el, { i18n, actions, data }) {
  let alerts, route, custom, waterOptions, margin, slider, where, status, result, farthest, table, tableBlock, astroBtn, overlay;
  const waterChoices = new Map((data.site.waterSites ?? []).flatMap(({ id, name }) => [
    [id, { id, name, kind: 'detour' }], [`${id}-round`, { id, name, kind: 'roundTrip' }],
  ]));
  const routeName = (id) => {
    const water = waterChoices.get(id);
    if (water) return i18n.t(`emergency.route.${water.kind}`, water);
    if (id === 'custom') return i18n.t('emergency.route.custom');
    return i18n.t('summary.plan', { planId: id, planName: planName(i18n, id) });
  };

  function build() {
    const { t } = i18n;
    clear(el);
    alerts = h('p', { class: 'note', role: 'status' });
    custom = h('option', { value: 'custom' }, routeName('custom'));
    waterOptions = [...waterChoices.keys()].map((id) => h('option', { value: id }, routeName(id)));
    route = h('select', { onchange: () => actions.setEmergency({ routeId: route.value }) },
      h('option', { value: '' }, t('emergency.route.auto')),
      data.params.plans.map(({ id }) => h('option', { value: id }, routeName(id))), waterOptions, custom);
    margin = h('select', { onchange: () => actions.setEmergency({ marginView: margin.value }) },
      ['off', 'auto', 'fast', 'dust'].map((mode) => h('option', { value: mode }, t(`emergency.margin.${mode}`))));
    slider = h('input', { id: 'emergency-position', type: 'range', min: '0', max: '1', step: '1', value: '0', 'aria-label': t('emergency.distanceLabel'),
      oninput: () => actions.setEmergency({ distanceM: Number(slider.value) }) });
    where = h('p', { class: 'note', 'aria-live': 'polite' });
    status = h('div', { class: 'status', role: 'status', 'aria-live': 'polite' });
    result = h('div', { class: 'emergency-result', 'aria-live': 'polite' });
    farthest = h('p', { class: 'note' });
    table = h('table', { class: 'table emergency-table' });
    tableBlock = h('div', { hidden: true }, h('h3', {}, t('emergency.tableTitle')), table);
    astroBtn = h('button', { type: 'button', class: 'btn btn-primary', onclick: () => actions.setEmergency({ astronautView: true }) }, t('emergency.astronautOpen'));
    el.append(
      h('h2', {}, t('emergency.title')),
      h('p', { class: 'lead' }, t('emergency.lead')),
      alerts, h('a', { href: '#panel-plans' }, t('emergency.selectData')),
      h('label', { class: 'field' }, t('emergency.itinerary'), route),
      h('label', { class: 'field' }, t('emergency.marginLabel'), margin),
      h('label', { class: 'emergency-progress' }, t('emergency.distanceLabel'), slider),
      where, status, result, h('div', { class: 'btn-row' }, astroBtn), farthest,
      tableBlock,
      h('p', { class: 'note' }, t('emergency.assumption')),
    );
    if (!overlay) overlay = h('div', { class: 'astro', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'astro-title', hidden: true,
      onkeydown: (e) => { if (e.key === 'Escape') actions.setEmergency({ astronautView: false }); } });
    if (!overlay.isConnected) document.body.append(overlay);
  }

  const placeText = (t, p) => p.kind === 'task' ? t('emergency.atStop', { stop: t(`stop.${p.stop}`) })
    : t('emergency.onLeg', { leg: p.legId === 'custom' ? routeName('custom') : t(`leg.${p.legId}`) });

  function renderComparison(t, comparison, limit) {
    const value = (min) => {
      if (min === null) return t('emergency.band.unknown');
      if (!Number.isFinite(min)) return t('emergency.band.unreachable');
      const amount = `${fmt(min, 1)} min`;
      return min > limit ? `${amount} · ${t('emergency.band.over', { limit })}` : amount;
    };
    const solar = value(comparison.fast) + (comparison.solarDose === null ? '' : ` · ${fmt(comparison.solarDose, 1)} µGy`);
    return h('table', { class: 'table emergency-table return-comparison' },
      h('caption', {}, t('emergency.compareTitle')),
      h('tbody', {}, [
        ['emergency.compareNormal', value(comparison.fast)], ['emergency.dustShort', value(comparison.dust)],
        ['emergency.sepShort', solar],
      ].map(([label, text]) => h('tr', {}, h('th', { scope: 'row' }, t(label)), h('td', {}, text)))));
  }

  function update(state) {
    const { t } = i18n;
    const e = state.emergency;
    const active = [e.alerts.dust && t('emergency.dustShort'), e.alerts.sep && t('emergency.sepShort')].filter(Boolean);
    alerts.className = active.length ? 'callout warn' : 'note';
    alerts.textContent = active.length ? t('emergency.fromPlan', { alerts: active.join(' + ') }) : t('emergency.noAlert');
    custom.disabled = !state.userRoute?.coords || state.userRoute.coords.length < 2;
    for (const option of waterOptions) {
      const { id, kind } = waterChoices.get(option.value);
      option.disabled = !state.waterSites.some((site) => site.id === id && site[kind]);
    }
    route.value = e.routeId;
    margin.value = e.marginView;
    const prepared = e.prepared;
    slider.disabled = !prepared;
    astroBtn.disabled = !e.show || !e.result?.choice || e.result.choice.noRoute;
    status.className = `status${e.status === 'error' ? ' bad' : ''}`;
    status.textContent = e.status === 'preparing' ? t('emergency.preparing') : e.status === 'error' ? t('emergency.error')
      : e.status === 'unavailable' ? t('emergency.unavailable') : '';
    clear(result); clear(table); farthest.textContent = ''; where.textContent = '';
    tableBlock.hidden = !e.rows?.length;
    if (!prepared) { renderOverlay(state); return; }
    slider.max = String(Math.ceil(prepared.timeline.distanceM));
    if (Number(slider.value) !== e.distanceM) slider.value = String(e.distanceM);
    const progress = t('emergency.distanceOf', { distance: fmt(Math.min(e.distanceM, prepared.timeline.distanceM)), total: fmt(prepared.timeline.distanceM) });
    slider.setAttribute('aria-valuetext', progress);
    const r = e.result;
    where.textContent = `${routeName(prepared.routeId)} · ${progress}${r?.position && !r.position.atHome ? ` · ${placeText(t, r.position)}` : ''}`;
    if (r?.atHome) result.append(h('p', { class: 'emergency-big' }, t(e.show ? 'emergency.atHome' : 'emergency.previewHome')));
    else if (r?.choice?.noRoute) {
      const reason = r.comparison?.[r.choice.policy] === null ? 'emergency.band.unknown' : 'emergency.noRoute';
      result.append(h('p', { class: 'emergency-big bad' }, t(reason)));
    }
    else if (r?.choice) {
      const c = r.choice;
      result.append(
        h('p', { class: 'emergency-big' }, t(e.show ? 'emergency.returnNow' : 'emergency.previewReturn',
          { min: fmt(c.timeMin), m: fmt(c.distanceM), dose: fmt(c.doseUGy, 1) })),
        h('p', {}, t(c.policy === 'dust' ? 'emergency.whyDust' : e.alerts.sep ? 'emergency.whyFast' : 'emergency.whyNormal',
          { rate: fmt(c.rateUGyH, 1), dunes: fmt(c.largeDuneM) })),
      );
      if (r.alt && c.vsFast) result.append(h('p', {}, t('emergency.vsFast', { min: fmt(Math.max(0, c.vsFast.extraMin), 1), dose: fmt(Math.max(0, c.vsFast.extraDoseUGy), 1), dunes: fmt(c.vsFast.extraDuneM) })));
    }
    if (r?.comparison) result.append(renderComparison(t, r.comparison, prepared.limit));
    const far = e.farthest;
    if (far) {
      farthest.className = `note${far.overLimit ? ' bad' : ''}`;
      farthest.textContent = t(far.overLimit ? 'emergency.farthestOver' : 'emergency.farthest', { distance: fmt(far.distanceM), min: fmt(far.timeMin), limit: far.maxMinutes });
    }
    const stopRows = e.rows ?? [];
    if (stopRows.length) {
      table.append(h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, t('emergency.colWhere')), h('th', { scope: 'col' }, t('emergency.colFast')), h('th', { scope: 'col' }, t('emergency.colDust')))),
        h('tbody', {}, ...stopRows.map((row) => h('tr', {}, h('td', {}, `${fmt(row.distanceM)} m · ${placeText(t, row)}`), h('td', {}, row.fastMin == null ? '—' : `${fmt(row.fastMin)} min`), h('td', {}, row.dustMin == null ? '—' : `${fmt(row.dustMin)} min`)))));
    }
    renderOverlay(state);
  }

  /** Concept of what the crew would see on a suit or wrist display: one route, minutes, direction. */
  function renderOverlay(state) {
    const { t } = i18n;
    const e = state.emergency;
    const c = e.result?.choice;
    const show = Boolean(e.show && e.astronautView && c && !c.noRoute);
    const wasHidden = overlay.hidden;
    overlay.hidden = !show;
    clear(overlay);
    if (!show) return;
    const close = h('button', { type: 'button', class: 'btn', onclick: () => actions.setEmergency({ astronautView: false }) }, t('emergency.astronautClose'));
    const returnName = t(c.policy === 'dust' ? 'emergency.routeDust' : 'emergency.routeFast');
    overlay.append(h('div', { class: 'astro-card' },
      h('p', { class: 'astro-concept' }, t('emergency.astronautConcept')),
      h('h2', { id: 'astro-title', class: 'astro-title' }, t('emergency.astroReturn')),
      h('div', { class: 'astro-arrow', 'aria-hidden': 'true', style: `transform: rotate(${Math.round(e.result.heading ?? 0)}deg)` }, '↑'),
      h('p', { class: 'astro-line' }, t('emergency.astroHeading', { deg: fmt(e.result.heading ?? 0) })),
      h('p', { class: 'astro-big' }, `${fmt(c.timeMin)} min · ${fmt(c.distanceM)} m`),
      h('p', { class: 'astro-line' }, `${returnName} → ${t('emergency.astroHome')}`),
      h('p', { class: 'astro-line' }, t('emergency.astroDose', { dose: fmt(c.doseUGy, 1) })),
      close));
    if (wasHidden) close.focus();
  }

  return { build, update };
}

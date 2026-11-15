// AI-assisted (Claude). Reviewed by the MARS+ team.
// Emergency return: if a dust-storm or solar-particle alert arrives during the walk, how does the crew
// get home? Used by the person in the habitat; the "astronaut view" shows the minimum the crew would get.
import { h, clear } from '../../shared/dom.js';
import { fmt } from '../../shared/format.js';

export function createContingencyPanel(el, { i18n, actions }) {
  let sep, dust, slider, where, status, result, farthest, table, astroBtn, overlay;

  function build() {
    const { t } = i18n;
    clear(el);
    sep = h('input', { type: 'checkbox', onchange: () => actions.setEmergency({ alerts: { sep: sep.checked, dust: dust.checked } }) });
    dust = h('input', { type: 'checkbox', onchange: () => actions.setEmergency({ alerts: { sep: sep.checked, dust: dust.checked } }) });
    slider = h('input', { type: 'range', min: '0', max: '1', step: '1', value: '0', 'aria-label': t('emergency.minuteLabel'),
      oninput: () => actions.setEmergency({ minute: Number(slider.value) }) });
    where = h('p', { class: 'note', 'aria-live': 'polite' });
    status = h('div', { class: 'status', role: 'status', 'aria-live': 'polite' });
    result = h('div', { class: 'emergency-result', 'aria-live': 'polite' });
    farthest = h('p', { class: 'note' });
    table = h('table', { class: 'table emergency-table' });
    astroBtn = h('button', { type: 'button', class: 'btn btn-primary', onclick: () => actions.setEmergency({ astronautView: true }) }, t('emergency.astronautOpen'));
    el.append(
      h('h2', {}, t('emergency.title')),
      h('p', { class: 'lead' }, t('emergency.lead')),
      h('fieldset', { class: 'emergency-alerts' },
        h('legend', {}, t('emergency.alerts')),
        h('label', {}, sep, ' ', t('emergency.sep')),
        h('label', {}, dust, ' ', t('emergency.dust'))),
      h('label', { class: 'emergency-minute' }, t('emergency.minuteLabel'), slider),
      where, status, result, h('div', { class: 'btn-row' }, astroBtn), farthest,
      h('h3', {}, t('emergency.tableTitle')), table,
      h('p', { class: 'note' }, t('emergency.assumption')),
    );
    if (!overlay) overlay = h('div', { class: 'astro', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'astro-title', hidden: true,
      onkeydown: (e) => { if (e.key === 'Escape') actions.setEmergency({ astronautView: false }); } });
    if (!overlay.isConnected) document.body.append(overlay);
  }

  const placeText = (t, p) => (p.kind === 'task' ? t('emergency.atStop', { stop: t(`stop.${p.stop}`) }) : t('emergency.onLeg', { leg: t(`leg.${p.legId}`) }));

  function update(state) {
    const { t } = i18n;
    const e = state.emergency;
    sep.checked = e.alerts.sep; dust.checked = e.alerts.dust;
    const prepared = e.prepared;
    slider.disabled = !prepared;
    astroBtn.disabled = !e.result?.choice || e.result.choice.noRoute;
    status.className = `status${e.status === 'error' ? ' bad' : ''}`;
    status.textContent = e.status === 'preparing' ? t('emergency.preparing') : e.status === 'error' ? t('emergency.error') : '';
    clear(result); clear(table); farthest.textContent = ''; where.textContent = '';
    if (!prepared) { renderOverlay(state); return; }
    slider.max = String(Math.floor(prepared.outsideMin));
    if (Number(slider.value) !== e.minute) slider.value = String(e.minute);
    slider.setAttribute('aria-valuetext', t('emergency.minuteOf', { minute: e.minute, total: fmt(prepared.outsideMin) }));
    const planLine = t('emergency.forPlan', { plan: prepared.planId, total: fmt(prepared.outsideMin) });
    const r = e.result;
    where.textContent = `${planLine} ${t('emergency.minuteOf', { minute: e.minute, total: fmt(prepared.outsideMin) })}${r?.position && !r.position.atHome ? ` · ${placeText(t, r.position)}` : ''}`;
    if (r?.atHome) result.append(h('p', { class: 'emergency-big' }, t('emergency.atHome')));
    else if (r?.choice?.noRoute) result.append(h('p', { class: 'emergency-big bad' }, t('emergency.noRoute')));
    else if (r?.choice) {
      const c = r.choice;
      result.append(
        h('p', { class: 'emergency-big' }, t('emergency.returnNow', { min: fmt(c.timeMin), m: fmt(c.distanceM), dose: fmt(c.doseUGy, 1) })),
        h('p', {}, t(c.policy === 'dust' ? 'emergency.whyDust' : 'emergency.whyFast', { rate: fmt(c.rateUGyH, 1), dunes: fmt(c.largeDuneM) })),
      );
      if (c.vsFast) result.append(h('p', {}, t('emergency.vsFast', { min: fmt(c.vsFast.extraMin, 1), dose: fmt(c.vsFast.extraDoseUGy, 1), dunes: fmt(-c.vsFast.extraDuneM) })));
    }
    const far = e.farthest;
    if (far) {
      farthest.className = `note${far.overLimit ? ' bad' : ''}`;
      farthest.textContent = t(far.overLimit ? 'emergency.farthestOver' : 'emergency.farthest', { minute: fmt(far.minute), min: fmt(far.timeMin), limit: far.maxMinutes });
    }
    const stopRows = e.rows ?? [];
    if (stopRows.length) {
      table.append(h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, t('emergency.colWhere')), h('th', { scope: 'col' }, t('emergency.colFast')), h('th', { scope: 'col' }, t('emergency.colDust')))),
        h('tbody', {}, ...stopRows.map((row) => h('tr', {}, h('td', {}, `${fmt(row.minute)} min · ${placeText(t, row)}`), h('td', {}, row.fastMin == null ? '—' : `${fmt(row.fastMin)} min`), h('td', {}, row.dustMin == null ? '—' : `${fmt(row.dustMin)} min`)))));
    }
    renderOverlay(state);
  }

  /** Concept of what the crew would see on a suit or wrist display: one route, minutes, direction. */
  function renderOverlay(state) {
    const { t } = i18n;
    const e = state.emergency;
    const c = e.result?.choice;
    const show = Boolean(e.astronautView && c && !c.noRoute);
    const wasHidden = overlay.hidden;
    overlay.hidden = !show;
    clear(overlay);
    if (!show) return;
    const close = h('button', { type: 'button', class: 'btn', onclick: () => actions.setEmergency({ astronautView: false }) }, t('emergency.astronautClose'));
    const routeName = t(c.policy === 'dust' ? 'emergency.routeDust' : 'emergency.routeFast');
    overlay.append(h('div', { class: 'astro-card' },
      h('p', { class: 'astro-concept' }, t('emergency.astronautConcept')),
      h('h2', { id: 'astro-title', class: 'astro-title' }, t('emergency.astroReturn')),
      h('div', { class: 'astro-arrow', 'aria-hidden': 'true', style: `transform: rotate(${Math.round(e.result.heading ?? 0)}deg)` }, '↑'),
      h('p', { class: 'astro-line' }, t('emergency.astroHeading', { deg: fmt(e.result.heading ?? 0) })),
      h('p', { class: 'astro-big' }, `${fmt(c.timeMin)} min · ${fmt(c.distanceM)} m`),
      h('p', { class: 'astro-line' }, `${routeName} → ${t('emergency.astroHome')}`),
      h('p', { class: 'astro-line' }, t('emergency.astroDose', { dose: fmt(c.doseUGy, 1) })),
      close));
    if (wasHidden) close.focus();
  }

  return { build, update };
}

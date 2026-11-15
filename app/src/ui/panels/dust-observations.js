import { dustObservations } from '../../application/dust-observations.js';
import { h } from '../../shared/dom.js';

export function createDustObservations({ i18n, catalog, threshold, onSelect }) {
  const { t, lang } = i18n;
  const { episodes, source } = dustObservations(catalog, threshold);
  const decimal = new Intl.NumberFormat(lang, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const buttons = new Map();
  const table = h('table', { class: 'data dust-comparison-table' },
    h('thead', {}, h('tr', {},
      h('th', { scope: 'col' }, t('plans.dustObservationSol')),
      h('th', { scope: 'col' }, 'τ880'),
      h('th', { scope: 'col' }, t('plans.dustObservationAlert')))));

  for (const { id, observations, source: eventSource } of episodes) {
    const group = h('tbody', {}, h('tr', {}, h('th', { scope: 'rowgroup', colspan: 3 },
      h('a', { href: eventSource, target: '_blank', rel: 'noopener' }, t(`plans.dustEpisode.${id}`)))));
    for (const { sol, tau, status } of observations) {
      const button = tau != null && h('button', {
        type: 'button', class: 'btn', 'aria-pressed': 'false', onclick: () => onSelect(sol),
      }, t('plans.dustUseSol', { sol }));
      if (button) buttons.set(sol, button);
      group.append(h('tr', {},
        h('th', { scope: 'row' }, button || t('plans.dustObservationNumber', { sol })),
        h('td', { class: 'mono' }, tau == null ? '—' : decimal.format(tau)),
        h('td', {}, t(`plans.dustObservation.${status}`))));
    }
    table.append(group);
  }

  const el = h('details', { class: 'dust-comparison' },
    h('summary', {}, t('plans.dustCompare')),
    h('p', { class: 'note' }, t('plans.dustCompareIntro', { threshold: threshold.toLocaleString(lang) })),
    table,
    h('p', { class: 'note' }, t('plans.dustCompareUse')),
    source && h('p', { class: 'note' }, h('a', { href: source, target: '_blank', rel: 'noopener' }, t('plans.dustCompareSource'))));

  return {
    el,
    select(sol) {
      for (const [value, button] of buttons) button.setAttribute('aria-pressed', String(value === sol));
    },
  };
}

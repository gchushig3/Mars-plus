// AI-assisted (Claude). Reviewed by the MARS+ team.
// Sticky GO / NO-GO bar at the top of the side panel: the answer first, details below.
import { h, clear } from '../../shared/dom.js';
import { fmt, fmtHour } from '../../shared/format.js';
import { planName } from './common.js';

export function createSummaryBar(el, { i18n }) {
  return {
    build() {},
    update(state) {
      const { t } = i18n;
      const ev = state.evaluation;
      if (!ev) return;
      const rec = ev.recommended;
      clear(el);
      el.className = `summary ${rec ? 'ok' : 'bad'}`;
      el.append(
        h('div', { class: 'summary-heading' },
          h('strong', {}, rec ? t('explain.go') : t('explain.noGo')),
          h('span', {}, rec ? t('summary.plan', { planId: rec.planId, planName: planName(i18n, rec.planId) }) : t('summary.noGo')),
          h('a', { href: '#panel-plans' }, t('summary.why'))));
      if (rec) {
        const metrics = [
          ['departure', fmtHour(rec.departure)],
          ['return', fmtHour(rec.returnHour)],
          ['dose', `${fmt(rec.doseUGy, 0)} µGy`],
        ];
        el.append(h('dl', { class: 'summary-metrics' }, metrics.map(([key, value]) =>
          h('div', {}, h('dt', {}, t(`summary.${key}`)), h('dd', { class: 'mono' }, value)))));
      }
    },
  };
}

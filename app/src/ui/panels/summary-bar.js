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
      const text = rec
        ? t('summary.go', { planId: rec.planId, planName: planName(i18n, rec.planId), departure: fmtHour(rec.departure), returnTime: fmtHour(rec.returnHour), dose: fmt(rec.doseUGy, 0) })
        : t('summary.noGo');
      el.append(
        h('strong', {}, rec ? t('explain.go') : t('explain.noGo')),
        h('span', {}, text),
        h('a', { href: '#panel-plans' }, t('summary.why')));
    },
  };
}

// AI-assisted (Claude). Reviewed by the MARS+ team.
// What Mars gravity (0.38 g) changes for the crew on foot. Numbers come from the application layer.
import { h, clear } from '../../shared/dom.js';
import { fmt } from '../../shared/format.js';

export function createGravityPanel(el, { i18n, gravity }) {
  let input, out;
  const convert = () => {
    const kg = Number(input.value);
    out.textContent = Number.isFinite(kg) && kg > 0 ? i18n.t('gravity.calcOut', { kg: fmt(kg), eq: fmt(gravity.earthEquivalentKg(kg)) }) : '';
  };
  return {
    build() {
      const { t } = i18n;
      const g = gravity;
      clear(el);
      input = h('input', { type: 'number', min: 1, max: 1000, step: 1, value: 180, inputmode: 'numeric', oninput: convert });
      out = h('p', { class: 'callout', 'aria-live': 'polite' });
      el.append(
        h('h2', {}, t('gravity.title')),
        h('p', { class: 'lead' }, t('gravity.lead', { pct: fmt(g.ratio * 100) })),
        h('ul', { class: 'list' },
          h('li', { html: t('gravity.weight', { pct: fmt(g.ratio * 100) }) }),
          h('li', { html: t('gravity.speed', { mars: fmt(g.walkRunMarsKmh, 1), earth: fmt(g.walkRunEarthKmh, 1), model: fmt(g.modelFlatKmh, 1) }) }),
          h('li', { html: t('gravity.slopes') }),
          h('li', { html: t('gravity.falls', { mars: fmt(g.fall1mMarsS, 2), earth: fmt(g.fall1mEarthS, 2) }) })),
        h('label', { class: 'field' }, t('gravity.calc'), input),
        out,
        h('p', { class: 'note' }, t('gravity.model')),
        h('p', { class: 'note' }, g.source),
      );
      convert();
    },
    update() {},
  };
}

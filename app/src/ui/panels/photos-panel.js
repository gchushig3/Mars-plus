// AI-assisted (Claude). Reviewed by the MARS+ team.
// "What you'll see at Issole": real Perseverance images at the stops (selected in config, credited NASA/JPL-Caltech).
import { h, clear } from '../../shared/dom.js';

export function createPhotosPanel(el, { i18n, data }) {
  const photos = data.site.photos ?? [];
  return {
    build() {
      const { t } = i18n;
      clear(el);
      el.append(
        h('h2', {}, t('photos.title')),
        h('p', { class: 'lead' }, t('photos.lead')),
        h('div', { class: 'photo-grid' }, ...photos.map((p) => {
          const src = `assets/rover/${p.file}`;
          return h('figure', { class: 'photo' },
            h('a', { href: src, target: '_blank', rel: 'noopener' },
              h('img', { src, alt: t(p.caption), loading: 'lazy', width: 800, height: 600 })),
            h('figcaption', {}, t(p.caption), h('span', { class: 'credit' }, t('photos.credit', { camera: p.camera, sol: p.sol, credit: p.credit }))));
        })),
      );
    },
    update() {},
  };
}

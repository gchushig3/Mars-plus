// AI-assisted (Claude). Reviewed by the MARS+ team.
// Short welcome dialog: what MARS+ is and how to use it in three steps. Shown on the first visit
// (remembered per browser when storage is available) and reopened from the "?" button in the header.
import { h, clear } from '../../shared/dom.js';

const STORAGE_KEY = 'marsplus.welcomeSeen';

export function createWelcome(root, { i18n }) {
  let lastFocus = null;
  const close = () => {
    root.hidden = true;
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* storage unavailable */ }
    if (lastFocus) lastFocus.focus();
  };
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  root.addEventListener('click', (e) => { if (e.target === root) close(); });

  function render() {
    const { t } = i18n;
    clear(root);
    const start = h('button', { type: 'button', class: 'btn btn-primary', onclick: close }, t('welcome.start'));
    root.append(h('div', { class: 'welcome-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'welcome-title' },
      h('h2', { id: 'welcome-title' }, t('welcome.title')),
      h('p', {}, t('welcome.what')),
      h('ol', { class: 'welcome-steps' }, h('li', {}, t('welcome.step1')), h('li', {}, t('welcome.step2')), h('li', {}, t('welcome.step3'))),
      h('p', { class: 'note' }, t('welcome.data')),
      h('div', { class: 'btn-row' }, start)));
    return start;
  }

  return {
    /** @param {HTMLElement} [returnFocusTo] element that gets focus back when the dialog closes */
    open(returnFocusTo) { lastFocus = returnFocusTo ?? document.activeElement; const start = render(); root.hidden = false; start.focus(); },
    rerender() { if (!root.hidden) render(); },
    shouldShowOnLoad() { try { return localStorage.getItem(STORAGE_KEY) !== '1'; } catch { return true; } },
  };
}

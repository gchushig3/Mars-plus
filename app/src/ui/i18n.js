// AI-assisted (Claude). Reviewed by the MARS+ team.
// Dictionary-based i18n. t() returns plain text; html() is only for trusted dictionary strings
// and escapes every interpolated value.
import { escapeHtml } from '../shared/dom.js';

export function createI18n(dicts, initial) {
  let lang = dicts[initial] ? initial : 'en';
  const subs = new Set();
  const lookup = (key) => dicts[lang][key] ?? dicts.en[key] ?? key;
  const fill = (str, vars, esc) => str.replace(/\{(\w+)\}/g, (_, k) => (vars && k in vars ? (esc ? escapeHtml(vars[k]) : String(vars[k])) : `{${k}}`));
  return {
    get lang() { return lang; },
    t: (key, vars) => fill(lookup(key), vars, false),
    html: (key, vars) => fill(lookup(key), vars, true),
    setLang(l) { if (dicts[l] && l !== lang) { lang = l; document.documentElement.lang = l; subs.forEach((fn) => fn(l)); } },
    onChange(fn) { subs.add(fn); },
  };
}

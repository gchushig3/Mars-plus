// AI-assisted (Claude). Reviewed by the MARS+ team.
// UI integrity: translations complete in both languages, every literal text key exists,
// and index.html preloads every module reachable from main.js (keeps the preload list honest).
import { test, assert } from './harness.js';

const APP = '../app/';
const text = (p) => fetch(APP + p).then((r) => { if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return r.text(); });

async function moduleGraph() {
  const seen = new Set();
  const queue = ['src/main.js'];
  while (queue.length) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    const src = await text(path);
    for (const m of src.matchAll(/\bfrom\s+'(\.{1,2}\/[^']+)'/g)) {
      const url = new URL(m[1], `https://x/${path}`);
      queue.push(url.pathname.slice(1));
    }
  }
  return [...seen];
}

test('i18n: English and Spanish have exactly the same keys', async () => {
  const [en, es] = await Promise.all([text('i18n/en.json'), text('i18n/es.json')].map((p) => p.then(JSON.parse)));
  const missingEs = Object.keys(en).filter((k) => !(k in es)), missingEn = Object.keys(es).filter((k) => !(k in en));
  assert(!missingEs.length && !missingEn.length, `missing in es: ${missingEs.join(', ')} · missing in en: ${missingEn.join(', ')}`);
});

test('i18n: every literal text key used by the code exists', async () => {
  const en = JSON.parse(await text('i18n/en.json'));
  const files = await moduleGraph();
  const missing = [];
  for (const f of files) {
    const src = await text(f);
    for (const m of src.matchAll(/\b(?:t|html)\('([a-z][\w.]*)'/g)) if (!(m[1] in en)) missing.push(`${f}: ${m[1]}`);
  }
  assert(!missing.length, `missing keys: ${missing.join('; ')}`);
});

test('performance: index.html preloads every module of the import graph', async () => {
  const html = await text('index.html');
  const preloaded = new Set([...html.matchAll(/rel="modulepreload" href="([^"]+)"/g)].map((m) => m[1]));
  const graph = await moduleGraph();
  const missing = graph.filter((m) => !preloaded.has(m));
  assert(!missing.length, `not preloaded: ${missing.join(', ')}`);
});

test('accessibility: skip link, help button and map label are present', async () => {
  const html = await text('index.html');
  assert(/class="skip-link"[^>]*href="#sidebar"/.test(html), 'skip link to the side panel');
  assert(/id="help"[^>]*aria-label=/.test(html), 'help button with an accessible name');
  assert(/id="map"[^>]*aria-label=/.test(html), 'map region label');
});

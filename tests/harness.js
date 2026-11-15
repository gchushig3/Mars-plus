// AI-assisted (Claude). Reviewed by the MARS+ team.
// Minimal test harness (no dependencies). Results are rendered in tests/index.html and exposed on window.TEST_RESULTS.

const tests = [];
export function test(name, fn) { tests.push({ name, fn }); }

export function assert(cond, msg = 'assertion failed') { if (!cond) throw new Error(msg); }
export function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) throw new Error(`${msg} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
export function assertClose(actual, expected, relTol, msg = '') {
  const rel = Math.abs(actual - expected) / Math.max(1e-9, Math.abs(expected));
  if (!(rel <= relTol)) throw new Error(`${msg} expected ~${expected} (±${(relTol * 100).toFixed(2)}%), got ${actual} (${(rel * 100).toFixed(2)}%)`);
}

export async function run(target) {
  const results = [];
  for (const t of tests) {
    const t0 = performance.now();
    try { await t.fn(); results.push({ name: t.name, ok: true, ms: performance.now() - t0 }); }
    catch (e) { results.push({ name: t.name, ok: false, ms: performance.now() - t0, error: String(e.message || e) }); }
  }
  const passed = results.filter((r) => r.ok).length;
  window.TEST_RESULTS = { passed, total: results.length, results };
  document.title = `${passed === results.length ? 'PASS' : 'FAIL'} ${passed}/${results.length}`;
  const summary = document.createElement('p');
  summary.className = passed === results.length ? 'ok' : 'bad';
  summary.textContent = `${passed}/${results.length} tests passed`;
  target.append(summary);
  const list = document.createElement('ul');
  for (const r of results) {
    const li = document.createElement('li');
    li.className = r.ok ? 'ok' : 'bad';
    li.textContent = `${r.ok ? '✓' : '✗'} ${r.name} (${r.ms.toFixed(0)} ms)${r.ok ? '' : ' — ' + r.error}`;
    list.append(li);
  }
  target.append(list);
  return window.TEST_RESULTS;
}

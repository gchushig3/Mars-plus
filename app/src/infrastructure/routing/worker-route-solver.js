// AI-assisted (Claude). Reviewed by the MARS+ team.
// RouteSolver implementation backed by a module Web Worker, with a main-thread fallback.
import { createRouteCore } from './route-core.js';

/** @returns {import('../../application/ports.js').RouteSolver} */
export function createWorkerRouteSolver() {
  let worker = null;
  try {
    worker = new Worker(new URL('./route-worker.js', import.meta.url), { type: 'module' });
  } catch {
    worker = null;
  }
  if (!worker) {
    const core = createRouteCore();
    return { init: async (m, b, p) => core.init(m, b, p), route: async (a, b) => core.route(a, b) };
  }
  let seq = 0;
  const pending = new Map();
  worker.onmessage = (e) => { const p = pending.get(e.data.id); if (p) { pending.delete(e.data.id); p(e.data.result); } };
  const call = (type, payload, transfer = []) => new Promise((resolve) => {
    const id = ++seq; pending.set(id, resolve); worker.postMessage({ id, type, payload }, transfer);
  });
  return {
    async init(meta, buffer, params) { await call('init', { meta, buffer, params }, [buffer]); },
    route: (a, b) => call('route', { a, b }),
  };
}

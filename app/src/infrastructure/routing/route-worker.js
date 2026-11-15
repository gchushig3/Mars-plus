// AI-assisted (Claude). Reviewed by the MARS+ team.
// Module Web Worker: keeps A* off the main thread so the UI never freezes.
import { createRouteCore } from './route-core.js';

const core = createRouteCore();
self.onmessage = (e) => {
  const { id, type, payload } = e.data;
  try {
    if (type === 'init') { core.init(payload.meta, payload.buffer, payload.params); self.postMessage({ id, result: { ok: true } }); }
    else if (type === 'route') self.postMessage({ id, result: core.route(payload.a, payload.b) });
  } catch (err) {
    self.postMessage({ id, result: { ok: false, code: 'error', message: String(err) } });
  }
};

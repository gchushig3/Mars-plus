// AI-assisted (Claude). Reviewed by the MARS+ team.
// Loads the real site data produced by the pipeline (served from /app/data/).

const BASE = '../app/data/';
const SITE = BASE + 'sites/jezero-issole/';
const json = async (p) => { const r = await fetch(p); if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return r.json(); };

let cache;
export async function loadSiteFixture() {
  if (cache) return cache;
  const [params, routes, stops, weather, radiation, terrainMeta] = await Promise.all([
    json(BASE + 'model-parameters.json'), json(SITE + 'routes.json'), json(SITE + 'stops.json'),
    json(SITE + 'weather-issole.json'), json(SITE + 'radiation-oct2021.json'), json(SITE + 'terrain-2m.json'),
  ]);
  const bin = await (await fetch(SITE + 'terrain-2m.bin')).arrayBuffer();
  const primary = routes.runs.filter((r) => r.resM === routes.primaryResM);
  const legs = Object.fromEntries(primary.map((r) => [r.id, r]));
  cache = { params, routes, stops, weather, radiation, terrainMeta, terrainBin: bin, legs };
  return cache;
}

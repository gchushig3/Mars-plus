// AI-assisted (Cursor, used by Henry). Reviewed by the MARS+ team.
// BOM-free JSON, the app copy of the parameters, and pipeline writers that no longer emit a BOM.
import { test, assert, assertClose, assertEqual } from './harness.js';
import { crismBounds } from '../app/src/infrastructure/map/leaflet-map-view.js';

const JSON_ASSETS = [
  '../config/model-parameters.json',
  '../config/site.jezero-issole.json',
  '../app/data/model-parameters.json',
  '../app/i18n/en.json',
  '../app/i18n/es.json',
  '../app/assets/globe/globe.json',
  '../app/data/dust/catalog.json',
  '../app/data/sites/jezero-issole/manifest.json',
  '../app/data/sites/jezero-issole/terrain-2m.json',
  '../app/data/sites/jezero-issole/overlays.json',
  '../app/data/sites/jezero-issole/routes.json',
  '../app/data/sites/jezero-issole/stops.json',
  '../app/data/sites/jezero-issole/site.json',
  '../app/data/sites/jezero-issole/weather-issole.json',
  '../app/data/sites/jezero-issole/radiation-oct2021.json',
  '../app/data/sites/jezero-issole/geology.geojson',
  '../docs/es/historico/prototipo-v1/web/data/rutas.js',
  '../docs/es/historico/prototipo-v1/web/data/rutas_v2.js',
  '../docs/es/historico/prototipo-v1/web/data/geologia.js',
  '../docs/es/historico/prototipo-v1/web/data/meda_tipico.js',
  '../docs/es/historico/prototipo-v1/web/data/meda_issole.js',
  '../docs/es/historico/prototipo-v1/web/data/rad_oct2021.js',
  '../docs/es/historico/prototipo-v1/web/data/trayecto.js',
  '../docs/es/historico/prototipo-v1/web/data/pendiente_bounds.js',
];

const PIPELINE_WRITERS = [
  '../pipeline/01-download/download-terrain.ps1',
  '../pipeline/01-download/download-rover-images.ps1',
  '../pipeline/02-process/build-traverse.ps1',
  '../pipeline/02-process/extract-rad.ps1',
  '../pipeline/02-process/process-geology.ps1',
  '../pipeline/02-process/summarize-meda.ps1',
  '../pipeline/04-export/export-globe-assets.ps1',
  '../pipeline/04-export/export-web-data.ps1',
];

async function bytes(path) {
  const r = await fetch(path);
  assert(r.ok, `${path}: HTTP ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

test('assets: committed JSON and exported data files have no UTF-8 BOM', async () => {
  const bom = [];
  for (const path of JSON_ASSETS) {
    const b = await bytes(path);
    if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) bom.push(path);
  }
  assert(!bom.length, `UTF-8 BOM still present: ${bom.join(', ')}`);
});

test('params: the app copy matches config/model-parameters.json', async () => {
  const [config, app] = await Promise.all([
    fetch('../config/model-parameters.json').then((r) => r.json()),
    fetch('../app/data/model-parameters.json').then((r) => r.json()),
  ]);
  assertEqual(JSON.stringify(config), JSON.stringify(app));
});

test('CRISM: the original transparent PNG matches its map projection metadata', async () => {
  const [config, site] = await Promise.all([
    fetch('../config/site.jezero-issole.json').then((r) => r.json()),
    fetch('../app/data/sites/jezero-issole/site.json').then((r) => r.json()),
  ]);
  const scene = site.crism;
  assertEqual(JSON.stringify(config.crism), JSON.stringify(scene));
  const png = await bytes(`../app/${scene.file}`);
  const ihdr = new DataView(png.buffer);
  assertEqual(ihdr.getUint32(16), scene.cols);
  assertEqual(ihdr.getUint32(20), scene.rows);
  assertEqual(png[25], 6, 'RGBA keeps the original scene transparency');
  const [[south, west], [north, east]] = crismBounds(scene);
  assertClose(south, 18.3648237875, 1e-8);
  assertClose(west, 77.2787224479, 1e-8);
  assertClose(north, 18.6355021599, 1e-8);
  assertClose(east, 77.5586348112, 1e-8);
});

test('pipeline: text writers use UTF-8 without a BOM', async () => {
  const config = await fetch('../pipeline/common/config.ps1').then((r) => r.text());
  assert(/New-Object System\.Text\.UTF8Encoding \$false/.test(config), 'UTF-8 encoder must not emit a BOM');
  assert(/0xFEFF/.test(config), 'a leading BOM character in the string is stripped');
  for (const path of PIPELINE_WRITERS) {
    const src = await fetch(path).then((r) => r.text());
    assert(!/-Encoding\s+utf8/i.test(src), `${path} still asks PowerShell for its BOM-writing utf8 encoding`);
    assert(/Write-Utf8NoBom|Export-CsvUtf8NoBom/.test(src), `${path} does not use the BOM-free writer`);
  }
});

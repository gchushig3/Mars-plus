// AI-assisted (Claude; changes with Cursor, used by Henry). Reviewed by the MARS+ team.
// MapView implementation with Leaflet (global L, loaded from CDN with SRI in index.html).
// Geographic CRS (EPSG:4326 scheme) matches the Mars Trek tiling, so lon/lat are used directly.
import { trekTileUrl, TREK_ATTRIBUTION, TREK_MAX_NATIVE_ZOOM } from './mars-trek-layers.js';
import { classStretch } from '../../domain/routing/route-highlights.js';

const GEO_STYLE = {
  largeDunes: { color: '#cc8e37', fillColor: '#cc8e37', fillOpacity: 0.10 },
  smallDunes: { color: '#e0a98b', fillColor: '#e0a98b', fillOpacity: 0.10 },
  maaz: { color: '#9e8f88', fillColor: '#7d6d6d', fillOpacity: 0.06 },
  seitah: { color: '#c2584f', fillColor: '#a2453e', fillOpacity: 0.14 },
  other: { color: '#7d6d6d', fillColor: '#7d6d6d', fillOpacity: 0.04 },
};

export function createLeafletMapView(container, { data, assetUrl }) {
  const L = window.L;
  const { site, routes, stops, geology, overlays, terrainMeta } = data;
  const b = terrainMeta.bounds;
  const pilotBounds = L.latLngBounds([b.south, b.west], [b.north, b.east]);

  const map = L.map(container, { crs: L.CRS.EPSG4326, minZoom: 11, maxZoom: 20, zoomSnap: 0.5, attributionControl: true });
  map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
  map.fitBounds(pilotBounds.pad(0.02)); // a view must exist before vector layers are added

  // Panes: CTX underlay < local backup image < Trek base tiles < overlays.
  // Only HiRISE 25 cm is shown as a base: it is the only imagery fine enough to see what the crew
  // will walk on. CTX (6 m) stays as a silent underlay so the area around the pilot is not blank;
  // THEMIS night IR (100 m pixels, ~10 pixels for the whole walk) is not offered: it says nothing
  // at walking scale.
  map.createPane('ctxUnder').style.zIndex = 150;
  map.createPane('backup').style.zIndex = 160;
  const tile = (id, maxNative, extra = {}) => L.tileLayer(trekTileUrl(site.trekLayers[id]), { maxNativeZoom: maxNative, maxZoom: 20, tileSize: 256, attribution: TREK_ATTRIBUTION, ...extra });
  tile('ctx', TREK_MAX_NATIVE_ZOOM.ctx, { pane: 'ctxUnder', attribution: '' }).addTo(map);
  const ov = (key, opts) => L.imageOverlay(assetUrl(overlays[key].file), [[overlays[key].bounds.south, overlays[key].bounds.west], [overlays[key].bounds.north, overlays[key].bounds.east]], opts);
  ov('baseOrtho', { pane: 'backup', opacity: 1 }).addTo(map);

  const base = { hirise: tile('hirise', TREK_MAX_NATIVE_ZOOM.hirise) };
  base.hirise.addTo(map);

  // On by default: only the route. Analysis layers are opt-in from the layer menu.
  const layers = {
    cost: ov('cost', { opacity: 0.55 }),
    slope: ov('slope', { opacity: 0.75 }),
    geology: L.geoJSON(geology, { style: (f) => ({ weight: 0.8, ...(GEO_STYLE[f.properties.class] ?? GEO_STYLE.other) }), interactive: false }),
    official: L.layerGroup(),
    rover: L.polyline(routes.roverPath.coords.map(([lon, lat]) => [lat, lon]), { color: '#c792ea', weight: 2, dashArray: '4 6', opacity: 0.9 }),
    user: L.layerGroup(),
    emergency: L.layerGroup(),
  };
  layers.official.addTo(map);
  layers.user.addTo(map); // empty until the crew draws an A → B route
  layers.emergency.addTo(map); // empty until an alert is simulated

  // Points of the walk. Issole opens the rover photos of what the crew will see there (the sampling
  // and observation stops are 2.8 m apart, one point for both); the dune point zooms the HiRISE
  // view in on the sand crossing.
  const pin = (cls, color, text = '') => L.divIcon({ className: '', html: `<div class="map-pin ${cls}" style="background:${color}">${text}</div>`, iconSize: cls ? [22, 22] : [14, 14], iconAnchor: cls ? [11, 11] : [7, 7] });
  const spot = (color, glyph) => L.divIcon({ className: '', html: `<div class="map-spot" style="--spot:${color}" aria-hidden="true">${glyph}</div>`, iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -14] });
  const official = routes.runs.find((r) => r.resM === routes.primaryResM && r.id === 'landing_sampling');
  const dunes = official ? classStretch(official.coords, geology.features, 'largeDunes') : null;
  const markers = {
    landing: L.marker([site.points.landing.lat, site.points.landing.lon], { icon: spot('#f4f1ee', '⌂'), keyboard: true }).addTo(map),
    issole: L.marker([stops.sampling.lat, stops.sampling.lon], { icon: spot('#7bd389', '◉'), keyboard: true }).addTo(map),
    dunes: dunes ? L.marker([dunes.middle[1], dunes.middle[0]], { icon: spot('#cc8e37', '≈'), keyboard: true }).addTo(map) : null,
  };
  const photos = site.photos ?? [];

  /** Popup body for Issole: text plus a one-photo-at-a-time gallery of the rover images. */
  function issolePopup(t, ws) {
    const root = L.DomUtil.create('div', 'popup-gallery');
    let i = 0;
    const head = L.DomUtil.create('div', '', root);
    head.innerHTML = t('point.issoleStops', ws);
    if (!photos.length) return root;
    const img = L.DomUtil.create('img', 'popup-photo', root);
    img.loading = 'lazy';
    const caption = L.DomUtil.create('p', 'popup-caption', root);
    const credit = L.DomUtil.create('div', 'popup-credit', root);
    const nav = L.DomUtil.create('div', 'popup-nav', root);
    const prev = L.DomUtil.create('button', 'btn', nav);
    const count = L.DomUtil.create('span', 'popup-count', nav);
    const next = L.DomUtil.create('button', 'btn', nav);
    const full = L.DomUtil.create('a', 'popup-full', nav);
    prev.type = next.type = 'button';
    prev.textContent = '‹'; next.textContent = '›';
    prev.setAttribute('aria-label', t('photos.prev')); next.setAttribute('aria-label', t('photos.next'));
    full.target = '_blank'; full.rel = 'noopener'; full.textContent = t('photos.full');
    const show = () => {
      const p = photos[i];
      img.src = `assets/rover/${p.file}`;
      img.alt = t(p.caption);
      caption.textContent = `${t(`stop.${p.stop}`)} · ${t(p.caption)}`;
      credit.textContent = t('photos.credit', { camera: p.camera, sol: p.sol, credit: p.credit });
      count.textContent = `${i + 1} / ${photos.length}`;
      full.href = img.src;
    };
    L.DomEvent.on(prev, 'click', (e) => { L.DomEvent.stop(e); i = (i + photos.length - 1) % photos.length; show(); });
    L.DomEvent.on(next, 'click', (e) => { L.DomEvent.stop(e); i = (i + 1) % photos.length; show(); });
    show();
    return root;
  }

  /** Popup body for the dune crossing, with a button that zooms the HiRISE view in on it. */
  function dunePopup(t) {
    const root = L.DomUtil.create('div', 'popup-gallery');
    const head = L.DomUtil.create('div', '', root);
    head.innerHTML = t('point.dunes', { m: Math.round(dunes.lengthM) });
    const go = L.DomUtil.create('button', 'btn', root);
    go.type = 'button';
    go.textContent = t('point.dunesZoom');
    L.DomEvent.on(go, 'click', (e) => { L.DomEvent.stop(e); map.closePopup(); map.flyTo([dunes.middle[1], dunes.middle[0]], TREK_MAX_NATIVE_ZOOM.hirise, { duration: 0.8 }); });
    return root;
  }
  const userPins = { A: null, B: null };
  let control = null;
  let clickHandler = null;
  let picking = false;
  let lastT = (k) => k;
  map.on('click', (e) => clickHandler && clickHandler({ lon: e.latlng.lng, lat: e.latlng.lat }));

  // Keyboard alternative to clicking: while choosing A/B, Enter places the point at the map centre (crosshair).
  const crosshair = L.DomUtil.create('div', 'map-crosshair', container);
  crosshair.setAttribute('aria-hidden', 'true');
  crosshair.hidden = true;
  container.addEventListener('keydown', (e) => {
    if (picking && e.key === 'Enter' && clickHandler) { const c = map.getCenter(); clickHandler({ lon: c.lng, lat: c.lat }); e.preventDefault(); }
  });

  // Robustness: if Mars Trek tiles keep failing, say so; the local HiRISE backup image stays visible underneath.
  const notice = L.control({ position: 'bottomleft' });
  notice.onAdd = () => { const d = L.DomUtil.create('div', 'map-notice'); d.setAttribute('role', 'status'); return d; };
  notice.addTo(map);
  const noticeEl = notice.getContainer();
  noticeEl.hidden = true;
  let consecutiveErrors = 0; // reset by any successful tile, so a later outage is still detected
  const refreshNotice = () => { noticeEl.hidden = consecutiveErrors < 3; noticeEl.textContent = lastT('map.trekDown'); };
  for (const layer of Object.values(base)) {
    layer.on('tileerror', () => { consecutiveErrors++; refreshNotice(); });
    layer.on('tileload', () => { consecutiveErrors = 0; refreshNotice(); });
  }

  return {
    /** Rebuilds texts that depend on the language. */
    setLabels(t) {
      lastT = t;
      container.setAttribute('aria-label', t('map.label'));
      refreshNotice();
      const w = data.params.workspace;
      const ws = { slope: w.maxSlopeDeg, dune: w.maxLargeDuneFraction };
      const tip = (m, key) => m.unbindTooltip().bindTooltip(t(key), { direction: 'top', offset: [0, -14] });
      markers.landing.unbindPopup().bindPopup(t('point.landing'));
      tip(markers.landing, 'point.landingTip');
      markers.issole.unbindPopup().bindPopup(() => issolePopup(t, ws), { maxWidth: 340, minWidth: 300 });
      tip(markers.issole, 'point.issoleTip');
      if (markers.dunes) {
        markers.dunes.unbindPopup().bindPopup(() => dunePopup(t), { maxWidth: 300 });
        tip(markers.dunes, 'point.dunesTip');
      }
      if (control) control.remove();
      // Only what helps the crew decide; the A → B and emergency routes appear by themselves when used.
      control = L.control.layers(
        {},
        { [t('layer.official')]: layers.official, [t('layer.cost')]: layers.cost, [t('layer.slope')]: layers.slope, [t('layer.geology')]: layers.geology, [t('layer.rover')]: layers.rover },
        { collapsed: true },
      ).addTo(map);
    },
    showOfficial(resM) {
      layers.official.clearLayers();
      const run = (id) => routes.runs.find((r) => r.resM === resM && r.id === id);
      const line = (r, style) => r && L.polyline(r.coords.map(([lon, lat]) => [lat, lon]), style).addTo(layers.official);
      line(run('straight_landing_sampling'), { color: '#b9aaa2', weight: 2, dashArray: '2 6', opacity: 0.9 });
      line(run('sampling_landing'), { color: '#cc8e37', weight: 3, opacity: 0.95 });
      line(run('landing_sampling'), { color: '#5ec8f2', weight: 3, opacity: 0.95 });
    },
    onClick(fn) { clickHandler = fn; },
    setPickCursor(on) { picking = on; container.style.cursor = on ? 'crosshair' : ''; crosshair.hidden = !on; },
    /** Test hook: point the Trek base layers to another URL (used to simulate an outage). */
    setTrekUrlForTest(url) { Object.values(base).forEach((l) => l.setUrl(url)); },
    setPoint(which, p) {
      if (userPins[which]) { userPins[which].remove(); userPins[which] = null; }
      if (p) userPins[which] = L.marker([p.lat, p.lon], { icon: pin('ab', '#f4f1ee', which) }).addTo(map);
    },
    showUserRoute(coords) {
      layers.user.clearLayers();
      if (!coords) return;
      const ll = coords.map(([lon, lat]) => [lat, lon]);
      L.polyline(ll, { color: '#14110f', weight: 6, opacity: 0.7 }).addTo(layers.user);
      L.polyline(ll, { color: '#f4f1ee', weight: 3 }).addTo(layers.user);
    },
    /** Emergency return: the way home from the crew's estimated position (null clears it). */
    showEmergencyReturn(r) {
      layers.emergency.clearLayers();
      if (!r || !r.position || r.position.atHome) return;
      if (r.coords) {
        const ll = r.coords.map(([lon, lat]) => [lat, lon]);
        const color = r.policy === 'dust' ? '#ff8a5c' : '#f6c445';
        L.polyline(ll, { color: '#14110f', weight: 7, opacity: 0.75 }).addTo(layers.emergency);
        L.polyline(ll, { color, weight: 4, dashArray: r.policy === 'dust' ? '10 6' : null }).addTo(layers.emergency);
      }
      L.circleMarker([r.position.lat, r.position.lon], { radius: 8, color: '#ff5a4f', weight: 3, fillColor: '#f4f1ee', fillOpacity: 1 })
        .bindTooltip(r.label ?? '', { direction: 'top' }).addTo(layers.emergency);
    },
    fitPilot() { map.fitBounds(pilotBounds.pad(0.02)); },
    invalidate() { map.invalidateSize(); },
  };
}

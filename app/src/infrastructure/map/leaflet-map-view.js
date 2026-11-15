// AI-assisted (Claude; changes with Cursor, used by Henry). Reviewed by the MARS+ team.
// MapView implementation with Leaflet (global L, loaded from CDN with SRI in index.html).
// Geographic CRS (EPSG:4326 scheme) matches the Mars Trek tiling, so lon/lat are used directly.
import { trekTileUrl, TREK_ATTRIBUTION, TREK_MAX_NATIVE_ZOOM } from './mars-trek-layers.js';

// Same colours as the geology legend in the sidebar; filled, with no outline, so the units read as
// areas and nothing competes with the route lines.
export const GEO_COLORS = [
  ['largeDunes', '#cc8e37'], ['smallDunes', '#e0a98b'], ['seitah', '#a2453e'], ['maaz', '#7d6d6d'], ['other', '#c2a198'],
];
const GEO_FILL = Object.fromEntries(GEO_COLORS);
const geoStyle = (f) => ({ stroke: false, fillColor: GEO_FILL[f.properties.class] ?? GEO_FILL.other, fillOpacity: 0.42 });
const ROUTE_COLORS = { out: '#5ec8f2', back: '#cc8e37', straight: '#c2a198', rover: '#c792ea', water: '#e0a98b', user: '#f4f1ee' };
const lineKey = (color, dashed = false) => dashed ? `repeating-linear-gradient(90deg,${color} 0 6px,transparent 6px 9px)` : color;
const MAP_KEYS = {
  official: [['legend.out', lineKey(ROUTE_COLORS.out)], ['legend.back', lineKey(ROUTE_COLORS.back)], ['legend.straight', lineKey(ROUTE_COLORS.straight, true)]],
  water: [['layer.water', lineKey(ROUTE_COLORS.water, true)]],
  cost: [['legend.costEasy', '#46be28'], ['legend.costHard', '#fa5028'], ['legend.costBlocked', '#141414']],
  slope: [['legend.slopeClear', 'transparent'], ['5°–<10°', '#facc15'], ['10°–<15°', '#f97316'], ['15°–<20°', '#dc2626'], ['≥20°', '#7f1d1d']],
  geology: GEO_COLORS.map(([key, color]) => [`geo.${key}`, color]),
  rover: [['layer.rover', lineKey(ROUTE_COLORS.rover, true)]],
  user: [['legend.user', lineKey(ROUTE_COLORS.user)]],
};
const EMERGENCY_COLORS = { itinerary: '#e0dee0', fast: '#f6c445', dust: '#ff8a5c', alt: '#a6a19e' };

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
  map.createPane('geology').style.zIndex = 350;
  map.createPane('emergency').style.zIndex = 450;
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
    geology: L.geoJSON(geology, {
      style: geoStyle, interactive: false, pane: 'geology',
      attribution: '<a href="https://doi.org/10.1007/s11214-020-00739-x" target="_blank" rel="noopener">Stack et al. (2020)</a>',
    }),
    official: L.layerGroup(),
    rover: L.polyline(routes.roverPath.coords.map(([lon, lat]) => [lat, lon]), { color: ROUTE_COLORS.rover, weight: 2, dashArray: '4 6', opacity: 0.9 }),
    user: L.layerGroup(),
    emergency: L.layerGroup(),
    water: L.layerGroup(),
  };
  layers.official.addTo(map);
  layers.user.addTo(map); // empty until the crew draws an A → B route
  layers.emergency.addTo(map); // empty until an alert is simulated

  // Photo points for landing and Issole, where the sampling and observation stops share one marker.
  const pin = (cls, color, text = '') => L.divIcon({ className: '', html: `<div class="map-pin ${cls}" style="background:${color}">${text}</div>`, iconSize: cls ? [22, 22] : [14, 14], iconAnchor: cls ? [11, 11] : [7, 7] });
  // `side` moves a photo point off the route: the icon sits beside its spot (a small dot marks the exact place).
  const SIDE = { center: [16, 16], downLeft: [34, -2], upRight: [-2, 34] };
  // MARS+ palette: #a2453e terracotta · #c2a198 taupe · #7d6d6d warm grey · #cc8e37 gold · #e0a98b peach.
  const spot = (color, glyph, side = 'center', ink = '#14110f') => L.divIcon({ className: '', html: `<div class="map-spot" style="--spot:${color};color:${ink}" aria-hidden="true">${glyph}</div>`, iconSize: [32, 32], iconAnchor: SIDE[side], popupAnchor: [16 - SIDE[side][0], 2 - SIDE[side][1]] });
  const photos = site.photos ?? [];
  const photosAt = (...stopIds) => photos.filter((p) => stopIds.includes(p.stop));
  // Photos exist only where Perseverance stopped near the route: at the landing site (sol 13) and at Issole.
  const exact = (lat, lon) => L.circleMarker([lat, lon], { radius: 4, color: '#14110f', weight: 2, fillColor: '#f4f1ee', fillOpacity: 1, interactive: false }).addTo(map);
  exact(site.points.landing.lat, site.points.landing.lon);
  exact(stops.sampling.lat, stops.sampling.lon);
  const markers = {
    landing: L.marker([site.points.landing.lat, site.points.landing.lon], { icon: spot('#c2a198', '⌂', 'upRight'), keyboard: true }).addTo(map),
    issole: L.marker([stops.sampling.lat, stops.sampling.lon], { icon: spot('#a2453e', '◉', 'downLeft', '#f4ede8'), keyboard: true }).addTo(map),
  };

  /** Popup body: a heading plus a one-photo-at-a-time gallery of the rover images taken there. */
  function galleryPopup(t, headHtml, list) {
    const root = L.DomUtil.create('div', 'popup-gallery');
    let i = 0;
    const head = L.DomUtil.create('div', '', root);
    head.innerHTML = headHtml;
    const photos = list;
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

  /** Popup for a water-alteration site: what is there, the source, and what the detour costs. */
  function waterPopup(t, ws) {
    const root = L.DomUtil.create('div', 'popup-gallery');
    const head = L.DomUtil.create('div', '', root);
    head.innerHTML = t('water.head', { name: ws.name, unit: ws.unit, sol: ws.sol });
    const ev = L.DomUtil.create('p', 'popup-caption', root);
    ev.textContent = t(ws.evidence);
    const cost = L.DomUtil.create('p', 'popup-caption', root);
    if (!ws.reachable) cost.textContent = t('water.noRoute');
    else {
      const dm = Math.round(ws.extraM);
      cost.textContent = t('water.cost', { min: Math.round(ws.extraMin), walk: Math.round(ws.extraWalkMin), m: `${dm >= 0 ? '+' : '−'}${Math.abs(dm)}` })
        + ' ' + (ws.fits == null ? t('water.noPlan') : t(ws.fits ? 'water.fits' : 'water.notFits', { plan: ws.planId, total: Math.round(ws.totalMin), limit: ws.limitMin }));
      const show = L.DomUtil.create('button', 'btn', root);
      show.type = 'button';
      const label = () => { show.textContent = t(map.hasLayer(layers.water) ? 'water.hide' : 'water.show'); };
      label();
      L.DomEvent.on(show, 'click', (e) => { L.DomEvent.stop(e); if (map.hasLayer(layers.water)) map.removeLayer(layers.water); else layers.water.addTo(map); label(); });
    }
    const src = L.DomUtil.create('div', 'popup-credit', root);
    src.textContent = ws.source;
    return root;
  }
  let waterSites = [], waterMarkers = [], probe = null, routeHover = null;
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

  const legend = L.control({ position: 'bottomleft' });
  legend.onAdd = () => {
    const root = L.DomUtil.create('div', 'map-legend');
    root.tabIndex = 0;
    root.setAttribute('role', 'region');
    L.DomEvent.disableClickPropagation(root);
    L.DomEvent.disableScrollPropagation(root);
    return root;
  };
  legend.addTo(map);
  const legendEl = legend.getContainer();
  let emergencyKeys = [];
  const renderLegends = () => {
    legendEl.replaceChildren();
    for (const [key, entries] of Object.entries({ emergency: emergencyKeys, ...MAP_KEYS })) {
      if (!entries.length || !map.hasLayer(layers[key]) || (key === 'user' && !layers.user.getLayers().length)) continue;
      const section = L.DomUtil.create('section', 'map-legend-section', legendEl);
      section.dataset.layer = key;
      if (entries.length > 1) L.DomUtil.create('h3', '', section).textContent = lastT(`layer.${key}`);
      const ul = L.DomUtil.create('ul', '', section);
      for (const [label, color] of entries) {
        const li = L.DomUtil.create('li', '', ul);
        const swatch = L.DomUtil.create('i', '', li);
        swatch.style.background = color;
        swatch.setAttribute('aria-hidden', 'true');
        if (['official', 'water', 'rover', 'user', 'emergency'].includes(key)) swatch.classList.add('line');
        li.append(lastT(label));
      }
      if (key === 'geology') L.DomUtil.create('div', 'src', section).textContent = 'Stack et al. (2020)';
    }
    legendEl.hidden = !legendEl.childElementCount;
  };
  map.on('layeradd layerremove', ({ layer }) => {
    if (Object.keys(MAP_KEYS).some((key) => layers[key] === layer)) renderLegends();
  });

  // Robustness: if Mars Trek tiles keep failing, say so; the local HiRISE backup image stays visible underneath.
  const notice = L.control({ position: 'bottomright' });
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
      legendEl.setAttribute('aria-label', t('map.legend'));
      refreshNotice();
      renderLegends();
      const w = data.params.workspace;
      const ws = { slope: w.maxSlopeDeg, dune: w.maxLargeDuneFraction };
      const tip = (m, key) => m.unbindTooltip().bindTooltip(t(key), { direction: 'top', offset: [0, -14] });
      markers.landing.unbindPopup().bindPopup(() => galleryPopup(t, t('point.landing'), photosAt('landing')), { maxWidth: 340, minWidth: 300 });
      tip(markers.landing, 'point.landingTip');
      markers.issole.unbindPopup().bindPopup(() => galleryPopup(t, t('point.issoleStops', ws), photosAt('sampling', 'observation')), { maxWidth: 340, minWidth: 300 });
      tip(markers.issole, 'point.issoleTip');
      if (control) control.remove();
      // Only what helps the crew decide; the A → B and emergency routes appear by themselves when used.
      control = L.control.layers(
        {},
        { [t('layer.official')]: layers.official, [t('layer.water')]: layers.water, [t('layer.cost')]: layers.cost, [t('layer.slope')]: layers.slope, [t('layer.geology')]: layers.geology, [t('layer.rover')]: layers.rover },
        { collapsed: true },
      ).addTo(map);
    },
    showOfficial(resM) {
      layers.official.clearLayers();
      const run = (id) => routes.runs.find((r) => r.resM === resM && r.id === id);
      const line = (r, style) => r && L.polyline(r.coords.map(([lon, lat]) => [lat, lon]), style).addTo(layers.official);
      line(run('straight_landing_sampling'), { color: ROUTE_COLORS.straight, weight: 2, dashArray: '2 6', opacity: 0.9 });
      const back = line(run('sampling_landing'), { color: ROUTE_COLORS.back, weight: 3, opacity: 0.95 });
      const out = line(run('landing_sampling'), { color: ROUTE_COLORS.out, weight: 3, opacity: 0.95 });
      // Hovering the route tells the elevation profile where the pointer is (the red point follows).
      for (const [legId, pl] of [['landing_sampling', out], ['sampling_landing', back]]) {
        if (!pl) continue;
        pl.on('mousemove', (e) => routeHover && routeHover(legId, { lon: e.latlng.lng, lat: e.latlng.lat }));
      }
    },
    /** Called with (legId, {lon, lat}) while the pointer moves over an official route. */
    onRouteHover(fn) { routeHover = fn; },
    /** The red point shared with the elevation profile (null hides it). */
    showProbe(p) {
      if (!p) { if (probe) { probe.remove(); probe = null; } return; }
      if (!probe) probe = L.circleMarker([p.lat, p.lon], { radius: 8, color: '#f4ede8', weight: 3, fillColor: '#a2453e', fillOpacity: 1, interactive: false }).addTo(map);
      else probe.setLatLng([p.lat, p.lon]);
    },
    /** Places with signs of water alteration, with the optional detour to photograph them. */
    setWaterSites(list) {
      waterSites = list ?? [];
      layers.water.clearLayers();
      waterMarkers.forEach((m) => m.remove());
      waterMarkers = waterSites.map((ws) => {
        const m = L.marker([ws.lat, ws.lon], { icon: spot('#e0a98b', '◆'), keyboard: true }).addTo(map);
        m.bindPopup(() => waterPopup(lastT, ws), { maxWidth: 320 });
        m.bindTooltip(lastT('water.tip', { name: ws.name }), { direction: 'top', offset: [0, -14] });
        if (ws.reachable) {
          const ll = ws.coords.map(([lon, lat]) => [lat, lon]);
          L.polyline(ll, { color: '#14110f', weight: 6, opacity: 0.55 }).addTo(layers.water);
          L.polyline(ll, { color: ROUTE_COLORS.water, weight: 3, dashArray: '8 6' }).addTo(layers.water);
        }
        return m;
      });
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
      if (coords) {
        const ll = coords.map(([lon, lat]) => [lat, lon]);
        L.polyline(ll, { color: '#14110f', weight: 6, opacity: 0.7 }).addTo(layers.user);
        L.polyline(ll, { color: ROUTE_COLORS.user, weight: 3 }).addTo(layers.user);
      }
      renderLegends();
    },
    /** Emergency return: the way home from the crew's estimated position (null clears it). */
    showEmergencyReturn(r) {
      layers.emergency.clearLayers();
      emergencyKeys = [];
      if (r) {
        for (const leg of r.itinerary) {
          L.polyline(leg.map(([lon, lat]) => [lat, lon]), { pane: 'emergency', color: EMERGENCY_COLORS.itinerary, weight: 2, opacity: .8, dashArray: '6 5', interactive: false }).addTo(layers.emergency);
        }
        emergencyKeys.push(['emergency.itinerary', lineKey(EMERGENCY_COLORS.itinerary, true)]);
        if (!r.position.atHome) drawReturn(r);
      }
      renderLegends();
    },
    showPilotCoverage() {
      map.fitBounds(pilotBounds.pad(0.02), { animate: false });
      layers.geology.addTo(map);
    },
    fitPilot() { map.fitBounds(pilotBounds.pad(0.02)); },
    invalidate() { map.invalidateSize(); },
  };

  function drawReturn(r) {
    if (r.alt?.coords) {
      L.polyline(r.alt.coords.map(([lon, lat]) => [lat, lon]), { pane: 'emergency', color: EMERGENCY_COLORS.alt, weight: 3, dashArray: '2 7', opacity: 0.95 })
        .bindTooltip(lastT('emergency.altRoute'), { sticky: true }).addTo(layers.emergency);
      emergencyKeys.push(['emergency.altRoute', lineKey(EMERGENCY_COLORS.alt, true)]);
    }
    if (r.coords) {
      const ll = r.coords.map(([lon, lat]) => [lat, lon]);
      const color = EMERGENCY_COLORS[r.policy];
      L.polyline(ll, { pane: 'emergency', color: '#14110f', weight: 7, opacity: 0.75 }).addTo(layers.emergency);
      L.polyline(ll, { pane: 'emergency', color, weight: 4, dashArray: r.policy === 'dust' ? '10 6' : null }).addTo(layers.emergency);
      emergencyKeys.push([r.policy === 'dust' ? 'emergency.routeDust' : 'emergency.routeFast', lineKey(color, r.policy === 'dust')]);
    }
    L.circleMarker([r.position.lat, r.position.lon], { pane: 'emergency', radius: 8, color: '#ff5a4f', weight: 3, fillColor: '#f4f1ee', fillOpacity: 1 })
      .bindTooltip(r.label ?? '', { direction: 'top' }).addTo(layers.emergency);
  }
}

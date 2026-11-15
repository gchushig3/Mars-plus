// AI-assisted (Claude; changes with Cursor, used by Henry). Reviewed by the MARS+ team.
// MapView implementation with Leaflet (global L, loaded from CDN with SRI in index.html).
// Geographic CRS (EPSG:4326 scheme) matches the Mars Trek tiling, so lon/lat are used directly.
import { trekTileUrl, TREK_ATTRIBUTION, TREK_MAX_NATIVE_ZOOM } from './mars-trek-layers.js';
import { nearestIndex } from '../../domain/routing/profile.js';
import { fmtHour } from '../../shared/format.js';

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
  crism: [
    ['crism.carbonates', 'linear-gradient(90deg,#d8efff,#fff2b2)'],
    ['crism.phyllosilicates', 'linear-gradient(90deg,#fa6965,#ec7bdf)'],
    ['crism.hydrated', '#7199f8'],
  ],
  rover: [['layer.rover', lineKey(ROUTE_COLORS.rover, true)]],
  user: [['legend.user', lineKey(ROUTE_COLORS.user)]],
};
const EMERGENCY_COLORS = { itinerary: '#e0dee0', fast: '#f6c445', dust: '#ff8a5c', alt: '#a6a19e' };
const emergencyRouteKey = (policy) => policy === 'dust' ? 'emergency.routeDust' : 'emergency.routeFast';
const RETURN_BANDS = {
  short: { color: '#80d990' }, medium: { color: '#f6c445' }, long: { color: '#ffab72' },
  over: { color: '#ff6863', dash: '9 4' }, unknown: { color: '#ddd4cd', dash: '3 8' },
  unreachable: { color: '#df91e5', dash: '2 4' },
};

/** Invert the PDS4 equirectangular transform at the PNG's outer pixel edges. */
export function crismBounds({ upperLeftM: [x, y], cols, rows, resolutionM, projectionRadiusM, standardParallelDeg }) {
  const mPerDeg = projectionRadiusM * Math.PI / 180;
  const xPerDeg = mPerDeg * Math.cos(standardParallelDeg * Math.PI / 180);
  return [[(y - rows * resolutionM) / mPerDeg, x / xPerDeg], [y / mPerDeg, (x + cols * resolutionM) / xPerDeg]];
}

export function createLeafletMapView(container, { data, assetUrl }) {
  const L = window.L;
  const { site, routes, stops, geology, overlays, terrainMeta } = data;
  const b = terrainMeta.bounds;
  const pilotBounds = L.latLngBounds([b.south, b.west], [b.north, b.east]);

  const map = L.map(container, { crs: L.CRS.EPSG4326, minZoom: 11, maxZoom: 20, zoomSnap: 0.5, attributionControl: true });
  map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
  const fitPilotBounds = (options = {}) => map.fitBounds(pilotBounds.pad(0.02), {
    // Keep the southern waypoints above the lower controls when the map is narrow.
    paddingBottomRight: map.getSize().x <= 520 ? [0, 105] : [0, 0],
    ...options,
  });
  fitPilotBounds(); // a view must exist before vector layers are added

  // Panes: CTX underlay < local backup image < Trek base tiles < overlays.
  // Only HiRISE 25 cm is shown as a base: it is the only imagery fine enough to see what the crew
  // will walk on. CTX (6 m) stays as a silent underlay so the area around the pilot is not blank;
  // THEMIS night IR (100 m pixels, ~10 pixels for the whole walk) is not offered: it says nothing
  // at walking scale.
  map.createPane('ctxUnder').style.zIndex = 150;
  map.createPane('backup').style.zIndex = 160;
  map.createPane('crism').style.zIndex = 340;
  map.createPane('geology').style.zIndex = 350;
  map.createPane('returnMargin').style.zIndex = 445;
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
    crism: site.crism && L.imageOverlay(site.crism.file, crismBounds(site.crism), { pane: 'crism', opacity: 0.7, className: 'crism-overlay' }),
    official: L.layerGroup(),
    rover: L.polyline(routes.roverPath.coords.map(([lon, lat]) => [lat, lon]), { color: ROUTE_COLORS.rover, weight: 2, dashArray: '4 6', opacity: 0.9 }),
    user: L.layerGroup(),
    emergency: L.layerGroup(),
    returnMargin: L.layerGroup().addTo(map),
    water: L.layerGroup(),
  };
  layers.official.addTo(map);
  layers.user.addTo(map); // empty until the crew draws an A → B route
  layers.emergency.addTo(map); // empty until an alert is simulated

  const profileGroups = {
    official: [], water: [], rover: [{ id: 'rover', label: 'layer.rover', coords: routes.roverPath.coords }],
    user: [], returnMargin: [], emergency: [],
  };
  let profileListener, routeHover;
  const visibleProfiles = () => Object.entries(profileGroups).flatMap(([group, shapes]) =>
    map.hasLayer(layers[group]) ? shapes : []);
  function setProfileRoutes(group, shapes) {
    profileGroups[group] = shapes;
    profileListener?.(visibleProfiles());
  }
  function trackProfileHover(line, id) {
    line.on('mousemove', ({ latlng }) => routeHover?.(id, { lon: latlng.lng, lat: latlng.lat }));
    return line;
  }
  function itineraryProfiles(legs = []) {
    return legs.map(({ legId, coords }) => ({
      id: `itinerary-${legId}`, label: 'profile.itineraryLeg',
      leg: legId === 'custom' ? 'emergency.route.custom' : `leg.${legId}`, coords,
    }));
  }
  trackProfileHover(layers.rover, 'rover');

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

  function issolePopup(t, workspace) {
    const gallery = galleryPopup(t, t('point.issoleStops', workspace), photosAt('sampling', 'observation'));
    const science = site.scienceStops?.issole;
    if (!science) return gallery;
    const lang = document.documentElement.lang;
    const copy = science[lang] ?? science.en;
    const card = L.DomUtil.create('section', 'issole-science');
    L.DomUtil.create('h3', '', card).textContent = copy.title;
    L.DomUtil.create('p', '', card).textContent = copy.task;

    const sources = science.sources.map((source) => {
      const link = L.DomUtil.create('a');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = source[lang] ?? source.en;
      return link;
    });
    card.append(sources[0]);
    const details = L.DomUtil.create('details', 'issole-science-evidence', card);
    L.DomUtil.create('summary', '', details).textContent = copy.details;
    L.DomUtil.create('p', '', details).textContent = copy.evidence;
    L.DomUtil.create('p', '', details).textContent = copy.samples;
    const references = L.DomUtil.create('ul', '', details);
    for (const link of sources.slice(1)) L.DomUtil.create('li', '', references).append(link);
    gallery.firstElementChild.replaceWith(card);
    return gallery;
  }

  /** Popup for a water-alteration site: what is there, the source, and what the detour costs. */
  function waterPopup(t, ws) {
    const root = L.DomUtil.create('div', 'popup-gallery water-science-popup');
    root.tabIndex = 0;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', ws.name);
    L.DomUtil.create('strong', '', root).textContent = ws.name;
    L.DomUtil.create('div', '', root).textContent = t('water.head', { unit: ws.unit, sol: ws.sol });
    const ev = L.DomUtil.create('p', 'popup-caption', root);
    ev.textContent = t(ws.evidence);
    if (ws.samplingNote) L.DomUtil.create('p', 'popup-caption', root).textContent = t(ws.samplingNote);
    const number = new Intl.NumberFormat(document.documentElement.lang, { maximumFractionDigits: 2 });
    const { distanceToTargetM, maxSlopeDeg } = ws.workspace?.criteria ?? {};
    if (Number.isFinite(distanceToTargetM) && Number.isFinite(maxSlopeDeg)) {
      L.DomUtil.create('p', 'popup-caption', root).textContent = t('water.workspace', {
        distance: number.format(distanceToTargetM), slope: number.format(maxSlopeDeg),
      });
    }

    const failureCodes = ['noRoute', 'noWorkspace', 'samplingEvidence', 'overLimit', 'dustStorm', 'noWeatherData', 'tooCold', 'tooWindy', 'solarEvent', 'doseOverLimit'];
    const showAssessments = (title, assessments) => {
      const section = L.DomUtil.create('section', 'popup-caption', root);
      L.DomUtil.create('strong', '', section).textContent = title;
      for (const task of ['photo', 'photoSample']) {
        const { recommended, closest } = assessments[task] ?? {};
        const row = L.DomUtil.create('div', '', section);
        const label = t(`water.task.${task}`);
        if (recommended) {
          row.textContent = t('water.assessmentFits', {
            label, departure: fmtHour(recommended.departure), min: number.format(recommended.totalMin),
          });
          continue;
        }
        const code = closest?.reason?.code;
        const reason = t(`water.failure.${failureCodes.includes(code) ? code : 'unknown'}`);
        const timing = code === 'overLimit' ? ` · ${number.format(closest.totalMin)} min` : '';
        row.textContent = t('water.assessmentRejected', { label, reason }) + timing;
      }
    };

    if (ws.assessments) showAssessments(t('water.detourTitle', { plan: ws.planId }), ws.assessments);
    else if (!ws.reachable) L.DomUtil.create('p', 'popup-caption', root).textContent = t('water.noRoute');
    if (ws.standalone) showAssessments(t('water.standaloneTitle'), ws.standalone);

    if (ws.reachable) {
      L.DomUtil.create('p', 'popup-caption', root).textContent = t(`water.mapRoute.${ws.displayMode}`);
      const show = L.DomUtil.create('button', 'btn', root);
      show.type = 'button';
      const label = () => { show.textContent = t(map.hasLayer(layers.water) ? 'water.hide' : 'water.show'); };
      label();
      L.DomEvent.on(show, 'click', (e) => { L.DomEvent.stop(e); if (map.hasLayer(layers.water)) map.removeLayer(layers.water); else layers.water.addTo(map); label(); });
    }
    const references = ws.sources ?? ws.links;
    if (references?.length) {
      const lang = document.documentElement.lang;
      const sources = L.DomUtil.create('ul', 'popup-credit', root);
      for (const source of references) {
        const link = L.DomUtil.create('a', '', L.DomUtil.create('li', '', sources));
        link.href = source.url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = source[lang] ?? source.en;
      }
    } else if (ws.source) L.DomUtil.create('div', 'popup-credit', root).textContent = ws.source;
    return root;
  }
  let waterSites = [], waterMarkers = [], probe = null;
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
  let emergencyKeys = [], marginKeys = [], marginPolicy = 'fast';
  const renderLegends = () => {
    legendEl.replaceChildren();
    for (const [key, entries] of Object.entries({ returnMargin: marginKeys, emergency: emergencyKeys, ...MAP_KEYS })) {
      if (!entries.length || !layers[key] || !map.hasLayer(layers[key]) || (key === 'user' && !layers.user.getLayers().length)) continue;
      const section = L.DomUtil.create('section', 'map-legend-section', legendEl);
      section.dataset.layer = key;
      if (key === 'returnMargin' || entries.length > 1) {
        const title = key === 'returnMargin' ? `emergency.marginLegend.${marginPolicy}` : `layer.${key}`;
        L.DomUtil.create('h3', '', section).textContent = lastT(title);
      }
      const ul = L.DomUtil.create('ul', '', section);
      for (const [label, color, values] of entries) {
        const li = L.DomUtil.create('li', '', ul);
        const swatch = L.DomUtil.create('i', '', li);
        swatch.style.background = color;
        swatch.setAttribute('aria-hidden', 'true');
        if (['official', 'water', 'rover', 'user', 'emergency', 'returnMargin'].includes(key)) swatch.classList.add('line');
        li.append(lastT(label, values));
      }
      if (key === 'geology') L.DomUtil.create('div', 'src', section).textContent = 'Stack et al. (2020)';
      if (key === 'crism') {
        L.DomUtil.create('p', 'src', section).textContent = lastT('crism.interpretation');
        const src = L.DomUtil.create('a', 'src', section);
        src.href = site.crism.label;
        src.target = '_blank';
        src.rel = 'noopener';
        src.textContent = `NASA PDS · ${site.crism.id} · ${site.crism.date} · ${site.crism.resolutionM} m`;
      }
    }
    legendEl.hidden = !legendEl.childElementCount;
  };
  map.on('layeradd layerremove', ({ layer }) => {
    if (Object.keys(MAP_KEYS).some((key) => layers[key] === layer)) renderLegends();
    if (Object.keys(profileGroups).some((key) => layers[key] === layer)) profileListener?.(visibleProfiles());
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
      const setPopup = (marker, content, options) => {
        if (marker.getPopup()) marker.setPopupContent(content);
        else marker.bindPopup(content, options);
      };
      setPopup(markers.landing, () => galleryPopup(t, t('point.landing'), photosAt('landing')), { maxWidth: 340, minWidth: 300 });
      tip(markers.landing, 'point.landingTip');
      setPopup(markers.issole, () => issolePopup(t, ws), { className: 'issole-popup', maxWidth: 340, minWidth: 240 });
      tip(markers.issole, 'point.issoleTip');
      markers.issole.getElement().setAttribute('aria-label', t('point.issoleTip'));
      if (control) control.remove();
      // Only what helps the crew decide; the A → B and emergency routes appear by themselves when used.
      control = L.control.layers(
        {},
        { [t('layer.official')]: layers.official, [t('layer.water')]: layers.water, [t('layer.cost')]: layers.cost, [t('layer.slope')]: layers.slope,
          [t('layer.geology')]: layers.geology, ...(layers.crism ? { [t('layer.crism')]: layers.crism } : {}), [t('layer.rover')]: layers.rover },
        { collapsed: true },
      ).addTo(map);
    },
    showOfficial(resM) {
      layers.official.clearLayers();
      const run = (id) => routes.runs.find((r) => r.resM === resM && r.id === id);
      const styles = {
        straight_landing_sampling: { color: ROUTE_COLORS.straight, weight: 2, dashArray: '2 6', opacity: 0.9 },
        sampling_landing: { color: ROUTE_COLORS.back, weight: 3, opacity: 0.95 },
        landing_sampling: { color: ROUTE_COLORS.out, weight: 3, opacity: 0.95 },
      };
      const shapes = [];
      for (const [id, style] of Object.entries(styles)) {
        const r = run(id);
        if (!r) continue;
        trackProfileHover(L.polyline(r.coords.map(([lon, lat]) => [lat, lon]), style), id).addTo(layers.official);
        shapes.unshift({ id, label: `leg.${id}`, coords: r.coords });
      }
      setProfileRoutes('official', shapes);
    },
    /** Called with (routeId, {lon, lat}) while the pointer moves over a displayed route. */
    onRouteHover(fn) { routeHover = fn; },
    onProfileRoutes(fn) { profileListener = fn; fn(visibleProfiles()); },
    /** The red point shared with the elevation profile (null hides it). */
    showProbe(p) {
      if (!p) { if (probe) { probe.remove(); probe = null; } return; }
      if (!probe) probe = L.circleMarker([p.lat, p.lon], { pane: 'markerPane', radius: 8, color: '#f4ede8', weight: 3, fillColor: '#a2453e', fillOpacity: 1, interactive: false }).addTo(map);
      else probe.setLatLng([p.lat, p.lon]);
    },
    /** Places with signs of water alteration, with the optional detour to photograph them. */
    setWaterSites(list) {
      waterSites = list ?? [];
      layers.water.clearLayers();
      waterMarkers.forEach((m) => m.remove());
      const shapes = [];
      waterMarkers = waterSites.map((ws) => {
        const label = lastT('water.tip', { name: ws.name });
        const m = L.marker([ws.lat, ws.lon], { icon: spot('#e0a98b', '◆'), title: label, keyboard: true }).addTo(map);
        m.getElement()?.setAttribute('aria-label', label);
        m.bindPopup(() => waterPopup(lastT, ws), { maxWidth: 320 });
        m.bindTooltip(label, { direction: 'top', offset: [0, -14] });
        if (ws.reachable) {
          const ll = ws.coords.map(([lon, lat]) => [lat, lon]);
          L.polyline(ll, { color: '#14110f', weight: 6, opacity: 0.55 }).addTo(layers.water);
          trackProfileHover(L.polyline(ll, { color: ROUTE_COLORS.water, weight: 3, dashArray: '8 6' }), ws.id).addTo(layers.water);
          shapes.push({ id: ws.id, label: `emergency.route.${ws.displayMode}`, name: ws.name, coords: ws.coords });
        }
        return m;
      });
      setProfileRoutes('water', shapes);
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
        trackProfileHover(L.polyline(ll, { color: ROUTE_COLORS.user, weight: 3 }), 'custom').addTo(layers.user);
      }
      setProfileRoutes('user', coords?.length >= 2 ? [{ id: 'custom', label: 'emergency.route.custom', coords }] : []);
      renderLegends();
    },
    showReturnMargin(r) {
      layers.returnMargin.clearLayers();
      marginKeys = [];
      if (r) {
        marginPolicy = r.policy;
        const shown = new Set(r.bands.map(({ key }) => key));
        const values = { a: r.limit / 3, b: r.limit * 2 / 3, limit: r.limit };
        marginKeys = Object.entries(RETURN_BANDS).filter(([key]) => shown.has(key))
          .map(([key, { color, dash }]) => [`emergency.band.${key}`, lineKey(color, Boolean(dash)), values]);
        for (const { key, coords, distances, legId } of r.bands) {
          const { color, dash } = RETURN_BANDS[key];
          const ll = coords.map(([lon, lat]) => [lat, lon]);
          L.polyline(ll, { pane: 'returnMargin', color: '#14110f', weight: 10, interactive: false }).addTo(layers.returnMargin);
          const line = L.polyline(ll, { pane: 'returnMargin', color, weight: 7, dashArray: dash }).addTo(layers.returnMargin);
          trackProfileHover(line, `itinerary-${legId}`);
          line.bindTooltip(lastT(`emergency.band.${key}`, values), { sticky: true });
          line.on('click', (e) => {
            if (picking) return;
            r.onSelect(distances[nearestIndex(coords, e.latlng.lng, e.latlng.lat)]);
          });
        }
      }
      setProfileRoutes('returnMargin', itineraryProfiles(r?.itinerary));
      renderLegends();
    },
    /** Emergency return: the way home from the crew's estimated position (null clears it). */
    showEmergencyReturn(r) {
      layers.emergency.clearLayers();
      emergencyKeys = [];
      const shapes = itineraryProfiles(r?.itinerary);
      if (r) {
        for (const { id, coords } of shapes) {
          trackProfileHover(L.polyline(coords.map(([lon, lat]) => [lat, lon]), { pane: 'emergency', color: EMERGENCY_COLORS.itinerary, weight: 2, opacity: .8, dashArray: '6 5', bubblingMouseEvents: false }), id).addTo(layers.emergency);
        }
        if (shapes.length) emergencyKeys.push(['emergency.itinerary', lineKey(EMERGENCY_COLORS.itinerary, true)]);
        if (!r.position.atHome) drawReturn(r);
        if (r.coords?.length >= 2) shapes.push({ id: 'return', label: emergencyRouteKey(r.policy), coords: r.coords });
        if (r.alt?.coords?.length >= 2) shapes.push({ id: 'return-alt', label: 'emergency.altRoute', coords: r.alt.coords });
      }
      setProfileRoutes('emergency', shapes);
      renderLegends();
    },
    showPilotCoverage() {
      fitPilotBounds({ animate: false });
      layers.geology.addTo(map);
    },
    fitPilot() { fitPilotBounds(); },
    invalidate() { map.invalidateSize(); },
  };

  function drawReturn(r) {
    if (r.alt?.coords) {
      L.polyline(r.alt.coords.map(([lon, lat]) => [lat, lon]), { pane: 'emergency', color: EMERGENCY_COLORS.alt, weight: 3, dashArray: '2 7', opacity: 0.95, interactive: false })
        .addTo(layers.emergency);
      emergencyKeys.push(['emergency.altRoute', lineKey(EMERGENCY_COLORS.alt, true)]);
    }
    if (r.coords) {
      const ll = r.coords.map(([lon, lat]) => [lat, lon]);
      const color = EMERGENCY_COLORS[r.policy];
      L.polyline(ll, { pane: 'emergency', color: '#14110f', weight: 6, opacity: 0.75, interactive: false }).addTo(layers.emergency);
      L.polyline(ll, { pane: 'emergency', color, weight: 3, dashArray: r.policy === 'dust' ? '10 6' : null, interactive: false }).addTo(layers.emergency);
      emergencyKeys.push([emergencyRouteKey(r.policy), lineKey(color, r.policy === 'dust')]);
    }
    L.circleMarker([r.position.lat, r.position.lon], { pane: 'emergency', radius: 8, color: '#ff5a4f', weight: 3, fillColor: '#f4f1ee', fillOpacity: 1 })
      .bindTooltip(r.label ?? '', { direction: 'top' }).addTo(layers.emergency);
  }
}

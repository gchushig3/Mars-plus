// AI-assisted (Claude; changes with Cursor, used by Henry). Reviewed by the MARS+ team.
// Composition root: builds adapters, wires use cases, mounts the UI.
import { createStore } from './application/store.js';
import { createRouteSession, settleRoute } from './application/route-session.js';
import { createMissionService } from './application/use-cases.js';
import { createStaticSiteRepository } from './infrastructure/data/static-site-repository.js';
import { createWorkerRouteSolver } from './infrastructure/routing/worker-route-solver.js';
import { createLeafletMapView } from './infrastructure/map/leaflet-map-view.js';
import { createI18n } from './ui/i18n.js';
import { createMissionPanel } from './ui/panels/mission-panel.js';
import { createRoutePanel } from './ui/panels/route-panel.js';
import { createPlansPanel } from './ui/panels/plans-panel.js';
import { createWeatherPanel, createRadiationPanel } from './ui/panels/conditions-panels.js';
import { createGeologyPanel, createAssumptionsPanel, createSourcesPanel } from './ui/panels/info-panels.js';
import { createSummaryBar } from './ui/panels/summary-bar.js';
import { createWelcome } from './ui/panels/welcome.js';
import { createWebGLGlobe, isWebGL2Supported } from './infrastructure/globe/webgl-globe.js';
import { createGlobeView } from './ui/views/globe-view.js';
import { createDustMaps } from './application/dust-maps.js';
import { createContingencyPanel } from './ui/panels/contingency-panel.js';
import { createGravityPanel } from './ui/panels/gravity-panel.js';
import { createProfileDrawer } from './ui/views/profile-drawer.js';
import { headingDeg } from './domain/contingency/contingency.js';
import { fetchDustCatalog, fetchGzipBytes, productSpec } from './infrastructure/dust/load-dust.js';
import { createDustFlatMap } from './infrastructure/map/dust-flat-map.js';

const SITE_ID = 'jezero-issole';

function initialLang() {
  try { const saved = localStorage.getItem('marsplus.lang'); if (saved === 'en' || saved === 'es') return saved; } catch { /* storage unavailable */ }
  return (navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
}

async function main() {
  const loading = document.getElementById('loading');
  const [en, es] = await Promise.all(['en', 'es'].map((l) => fetch(`i18n/${l}.json`).then((r) => r.json())));
  const i18n = createI18n({ en, es }, initialLang());
  document.documentElement.lang = i18n.lang;
  loading.textContent = i18n.t('app.loading');

  // --- GLOBE first (state GLOBE) when WebGL2 is available; "?view=local" opens the EVA map directly ---
  const globeRoot = document.getElementById('globe-view');
  const viewToggle = document.getElementById('view-toggle');
  let globe = null, globeView = null, store = null, openCoverage;
  const openLocal = new URLSearchParams(location.search).get('view') === 'local';
  const flatDust = new URLSearchParams(location.search).get('dust') === 'flat';
  const openDust = new URLSearchParams(location.search).get('layer') === 'dust';
  if (!openLocal) {
    try {
      const meta = await fetch('assets/globe/globe.json').then((r) => { if (!r.ok) throw new Error(`globe.json: HTTP ${r.status}`); return r.json(); });
      const webgl = isWebGL2Supported();
      globeRoot.hidden = false;
      loading.hidden = true; // the globe shows its own progress while the EVA data loads underneath
      const dustBase = 'data/dust/';
      const dustMaps = createDustMaps({
        loadCatalog: () => fetchDustCatalog(dustBase),
        loadVolume: (file) => fetchGzipBytes(dustBase + file),
        specOf: productSpec,
        createFlatMap: createDustFlatMap,
      });
      globeView = createGlobeView(globeRoot, { i18n, assetBase: 'assets/globe/', dustMaps, meta, onEnterMission: () => openCoverage?.(), preferFlat: flatDust || !webgl });
      if (webgl) {
        globe = createWebGLGlobe(globeView.canvas, { assetBase: 'assets/globe/', meta, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches });
        globe.start().then(() => {
          globeView.attach(globe);
          if (openDust && !flatDust) globeView.showDustLayer();
        }).catch((err) => {
          console.error(err);
          globeView.useFlat(); // the dust map still works as a flat Leaflet view
        });
      }
    } catch (err) {
      console.error(err);
      globeRoot.hidden = true; globe = null; globeView = null; loading.hidden = false;
    }
  }

  const repository = createStaticSiteRepository('data/', SITE_ID);
  const service = createMissionService({ repository, solver: createWorkerRouteSolver() });
  let data;
  try {
    data = await service.loadSite();
  } catch (err) {
    console.error(err);
    globeRoot.hidden = true;
    loading.hidden = false;
    loading.textContent = i18n.t('app.loadError');
    return;
  }

  const map = createLeafletMapView(document.getElementById('map'), { data, assetUrl: repository.assetUrl });
  const firstPlan = service.evaluate(service.defaultPlanOptions());
  store = createStore({
    view: globeView ? 'globe' : 'local',
    officialRes: data.routes.primaryResM,
    pick: null, pointA: null, pointB: null,
    routeStatus: { kind: 'idle' }, userRoute: null,
    paceKey: 'normal', planOptions: firstPlan.evaluation.options, dustInfo: firstPlan.dustInfo, solarInfo: firstPlan.solarInfo, waterSites: [],
    evaluation: firstPlan.evaluation, explanation: firstPlan.explanation,
    sensitivity: { status: 'idle', rows: null }, sensitivityView: null, traverseValidation: null, routingReady: false,
    emergency: { status: 'idle', show: false, trigger: null, alerts: { sep: false, dust: false }, routeId: '', distanceM: 0,
      prepared: null, rows: null, result: null, farthest: null, astronautView: false },
  });

  // Sensitivity rows (leg times per sand factor) -> view with the recommended plan under the current options
  const sensitivityView = (rows, options) => (rows ?? []).filter((r) => r.legs).map((r) => ({
    factor: r.factor, isModel: r.isModel,
    outMin: r.legs.landing_sampling.timeMin, backMin: r.legs.sampling_landing.timeMin,
    rec: service.evaluate(options, r.legs).evaluation.recommended,
  }));

  // --- actions (the only place that mutates state) ---
  const routes = createRouteSession();
  async function computeIfReady() {
    const id = routes.begin();
    const { pointA, pointB } = store.get();
    if (!pointA || !pointB) return;
    store.set({ routeStatus: { kind: 'computing' }, userRoute: null });
    const settled = await settleRoute(routes, id, () => service.computeRoute(pointA, pointB));
    if (settled.stale) return;
    if (settled.error) console.error(settled.error);
    store.set({ routeStatus: settled.status, userRoute: settled.userRoute });
  }
  const actions = {
    pick: (which) => store.set((s) => ({ pick: s.pick === which ? null : which })),
    clear: () => {
      routes.invalidate();
      store.set({ pick: null, pointA: null, pointB: null, userRoute: null, routeStatus: { kind: 'idle' } });
    },
    useMission: () => {
      store.set({ pick: null, pointA: { ...data.site.points.landing }, pointB: { lon: data.stops.sampling.lon, lat: data.stops.sampling.lat }, userRoute: null });
      computeIfReady();
    },
    setOption: (patch) => {
      const previous = store.get();
      const prev = previous.planOptions;
      const next = { ...prev, ...patch };
      const result = service.evaluate(next);
      store.set({
        planOptions: result.evaluation.options, dustInfo: result.dustInfo, solarInfo: result.solarInfo,
        evaluation: result.evaluation, explanation: result.explanation,
        sensitivityView: sensitivityView(store.get().sensitivity.rows, result.evaluation.options),
      });
      followPlanAlerts(prev, result.evaluation.options, previous.evaluation);
    },
    runSensitivity: async () => {
      if (store.get().sensitivity.status === 'running') return;
      store.set({ sensitivity: { status: 'running', rows: null }, sensitivityView: null });
      try {
        const rows = await service.sandSensitivity();
        store.set({ sensitivity: { status: 'done', rows }, sensitivityView: sensitivityView(rows, store.get().planOptions) });
      } catch (err) {
        console.error(err);
        store.set({ sensitivity: { status: 'error', rows: null } });
      }
    },
    setPace: (key) => {
      store.set({ paceKey: key });
      actions.setOption({ paceFactor: data.params.pace[key] });
    },
    /** Emergency return: alert conditions, itinerary and distance walked. */
    setEmergency(patch) {
      const prev = store.get().emergency;
      const next = { ...prev, ...patch, alerts: { ...prev.alerts, ...(patch.alerts ?? {}) } };
      if (patch.alerts && !next.alerts.sep && !next.alerts.dust) {
        next.show = false;
        next.astronautView = false;
      }
      const routeChanged = next.routeId !== prev.routeId;
      if (routeChanged && patch.trigger !== 'plan') next.distanceM = 0;
      const recalculate = routeChanged || 'distanceM' in patch || 'alerts' in patch || next.show !== prev.show;
      if (recalculate) {
        next.result = null;
        next.farthest = null;
        ++emergencySeq;
      }
      store.set({ emergency: next });
      if (recalculate && !routeChanged) refreshEmergencyReturn();
    },
  };
  let emergencySeq = 0, preparationSeq = 0, preparationInput;
  async function refreshEmergencyReturn() {
    const e = store.get().emergency;
    if (!e.prepared || !e.show || !(e.alerts.sep || e.alerts.dust)) return;
    const id = ++emergencySeq;
    try {
      const result = await service.emergencyReturn(e.prepared, e.distanceM, e.alerts);
      if (id !== emergencySeq) return;
      const heading = result.choice && !result.choice.noRoute ? headingDeg(result.choice.coords) : null;
      const farthest = service.farthestFromHabitat(e.prepared, e.alerts);
      store.set((s) => ({ emergency: { ...s.emergency, status: 'ready', result: { ...result, heading }, farthest } }));
    } catch (err) {
      if (id !== emergencySeq) return;
      console.error(err);
      store.set((s) => ({ emergency: { ...s.emergency, status: 'error' } }));
    }
  }
  /**
   * A dust-storm or solar-event alert switched on in the plan proposes the way back to the habitat at once
   * (same alerts, route drawn on the map). Switching every alert off hides it again if the plan had shown it.
   */
  function followPlanAlerts(prev, next, previousEvaluation) {
    const was = { dust: Boolean(prev.dustStormAlert), sep: Boolean(prev.solarEventAlert) };
    const now = { dust: Boolean(next.dustStormAlert), sep: Boolean(next.solarEventAlert), solarRateUGyH: next.solarRateUGyH };
    if (was.dust === now.dust && was.sep === now.sep && prev.solarRateUGyH === now.solarRateUGyH) return;
    if (now.dust || now.sep) {
      const routeId = store.get().emergency.routeId || (previousEvaluation.recommended ?? previousEvaluation.closest)?.planId || '';
      actions.setEmergency({ show: true, trigger: 'plan', alerts: now, routeId });
    } else if (store.get().emergency.trigger === 'plan') actions.setEmergency({ show: false, trigger: null, alerts: now });
  }
  /** Prepares the return plan for the plan in effect (recommended, or the closest one when the EVA is postponed). */
  async function prepareEmergency() {
    const s = store.get();
    if (!s.routingReady || s.routingReady === 'error') return;
    const routeId = s.emergency.routeId || (s.evaluation.recommended ?? s.evaluation.closest)?.planId;
    const customCoords = routeId === 'custom' ? s.userRoute?.coords : undefined;
    const detour = routeId === 'brac' ? s.waterSites.find((site) => site.id === 'brac' && site.reachable) : undefined;
    const paceFactor = s.planOptions.paceFactor;
    const resM = s.officialRes;
    const input = [routeId, paceFactor, resM, customCoords, detour?.outboundLegs[0]];
    if (preparationInput?.every((value, i) => value === input[i])) {
      if (!s.emergency.result) await refreshEmergencyReturn();
      return;
    }
    preparationInput = input;
    const id = ++preparationSeq;
    ++emergencySeq;
    const ready = routeId && (routeId !== 'custom' || customCoords?.length > 1) && (routeId !== 'brac' || detour);
    store.set((st) => ({ emergency: { ...st.emergency, prepared: null, result: null, farthest: null, rows: null,
      status: ready ? 'preparing' : 'unavailable' } }));
    if (!ready) return;
    try {
      const prepared = await service.prepareContingency(routeId, paceFactor, { resM, customCoords, detour });
      if (id !== preparationSeq) return;
      store.set((st) => ({ emergency: { ...st.emergency, status: 'ready', prepared,
        distanceM: Math.min(st.emergency.distanceM, Math.ceil(prepared.timeline.distanceM)), rows: service.checkpointTable(prepared) } }));
      await refreshEmergencyReturn();
    } catch (err) {
      if (id !== preparationSeq) return;
      console.error(err);
      preparationInput = null;
      store.set((st) => ({ emergency: { ...st.emergency, status: 'error' } }));
    }
  }
  // Elevation profile under the map, its red point shared with the map.
  const profileDrawer = createProfileDrawer(document.getElementById('map-wrap'), {
    i18n, getProfile: (id) => service.routeProfile(id), onProbe: (p) => map.showProbe(p), onToggle: () => setTimeout(() => map.invalidate(), 0),
  });
  map.onRouteHover((legId, p) => profileDrawer.followMap(legId, p));
  // Optional detours to places with signs of water alteration (recomputed when the plan changes).
  let waterSeq = 0;
  async function refreshWater() {
    const s = store.get();
    if (!s.routingReady || s.routingReady === 'error') return;
    const id = ++waterSeq;
    try {
      const list = await service.waterDetours(s.evaluation);
      if (id !== waterSeq) return;
      store.set({ waterSites: list });
    } catch (err) { console.error(err); }
  }
  map.onClick((p) => {
    const { pick } = store.get();
    if (!pick) return;
    store.set({ [pick === 'A' ? 'pointA' : 'pointB']: p, pick: pick === 'A' && !store.get().pointB ? 'B' : null, userRoute: null, routeStatus: { kind: 'idle' } });
    computeIfReady();
  });

  // --- panels: the answer first (GO / NO-GO), then mission, plans, own route and details ---
  const sidebar = document.getElementById('sidebar');
  const ctx = { i18n, data, store, actions, gravity: service.gravityFacts() };
  const summaryEl = document.createElement('div');
  sidebar.append(summaryEl);
  const panels = [createSummaryBar(summaryEl, ctx)];
  // What the crew acts on stays open; background and reference details start folded (less to read at once).
  // Rover photos now open from the Issole point on the map.
  const sections = [['mission', createMissionPanel], ['plans', createPlansPanel], ['emergency', createContingencyPanel], ['route', createRoutePanel]];
  const folded = [['weather', createWeatherPanel], ['radiation', createRadiationPanel], ['geology', createGeologyPanel], ['gravity', createGravityPanel], ['assumptions', createAssumptionsPanel], ['sources', createSourcesPanel]];
  for (const [id, factory] of sections) {
    const el = document.createElement('section'); el.className = 'section'; el.id = `panel-${id}`; sidebar.append(el); panels.push(factory(el, ctx));
  }
  const foldTitles = [];
  for (const [id, factory] of folded) {
    const box = document.createElement('details'); box.className = 'section fold'; box.id = `panel-${id}`;
    const title = document.createElement('summary'); box.append(title); foldTitles.push([title, `${id}.title`]);
    const el = document.createElement('div'); el.className = 'fold-body'; box.append(el);
    sidebar.append(box); panels.push(factory(el, ctx));
  }

  const welcome = createWelcome(document.getElementById('welcome'), { i18n });
  const helpBtn = document.getElementById('help');
  helpBtn.addEventListener('click', () => welcome.open(helpBtn));

  const buildAll = () => {
    const { t } = i18n;
    document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === i18n.lang)));
    helpBtn.setAttribute('aria-label', t('welcome.help')); helpBtn.title = t('welcome.help');
    document.getElementById('skip').textContent = t('app.skip');
    map.setLabels(i18n.html);
    renderEmergency(store.get().emergency);
    map.setWaterSites(store.get().waterSites);
    profileDrawer.build();
    foldTitles.forEach(([el, key]) => { el.textContent = t(key); });
    panels.forEach((p) => p.build(store.get()));
    panels.forEach((p) => p.update(store.get()));
    welcome.rerender();
    globeView?.setTexts();
    applyView(store.get().view);
  };

  // --- view switching: GLOBE <-> LOCAL (EVA map) ---
  viewToggle.hidden = !globeView;
  viewToggle.addEventListener('click', () => store.set((s) => ({ view: s.view === 'globe' ? 'local' : 'globe' })));
  function applyView(view) {
    const onGlobe = view === 'globe' && Boolean(globeView);
    globeRoot.hidden = !onGlobe;
    if (globe) (onGlobe ? globe.resume() : globe.pause());
    document.getElementById('subtitle').textContent = i18n.t(onGlobe ? 'app.globeSubtitle' : 'app.subtitle');
    viewToggle.textContent = i18n.t(onGlobe ? 'app.toMap' : 'app.toGlobe');
    viewToggle.setAttribute('aria-pressed', String(onGlobe));
    if (!onGlobe) map.invalidate();
  }

  function renderEmergency(e) {
    map.showEmergencyReturn(e.show && e.result && {
      position: e.result.position, coords: e.result.choice?.coords, policy: e.result.choice?.policy, alt: e.result.alt,
      itinerary: e.prepared.timeline.segments.filter((segment) => segment.kind === 'walk').map((segment) => segment.coords),
      label: i18n.t('emergency.crewHere'),
    });
  }

  let last = {};
  store.subscribe((s) => {
    if (s.view !== last.view) { applyView(s.view); if (s.view === 'globe') globeView?.focus(); }
    panels.forEach((p) => p.update(s));
    if (s.officialRes !== last.officialRes) map.showOfficial(s.officialRes);
    if (s.pointA !== last.pointA) map.setPoint('A', s.pointA);
    if (s.pointB !== last.pointB) map.setPoint('B', s.pointB);
    if (s.userRoute !== last.userRoute) map.showUserRoute(s.userRoute?.coords ?? null);
    if (s.waterSites !== last.waterSites) map.setWaterSites(s.waterSites);
    if (s.emergency.result !== last.emergency?.result || s.emergency.show !== last.emergency?.show) {
      renderEmergency(s.emergency);
    }
    if (s.evaluation !== last.evaluation || s.routingReady !== last.routingReady) refreshWater();
    if (s.evaluation !== last.evaluation || s.routingReady !== last.routingReady || s.officialRes !== last.officialRes ||
        s.userRoute !== last.userRoute || s.waterSites !== last.waterSites || s.emergency.routeId !== last.emergency?.routeId) queueMicrotask(prepareEmergency);
    map.setPickCursor(Boolean(s.pick));
    last = s;
  });
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
    i18n.setLang(b.dataset.lang);
    try { localStorage.setItem('marsplus.lang', b.dataset.lang); } catch { /* ignore */ }
  }));
  i18n.onChange(buildAll);

  openCoverage = () => {
    if (store.get().view !== 'globe') return;
    store.set({ view: 'local' });
    map.showPilotCoverage();
    document.getElementById('map').focus({ preventScroll: true });
  };
  globeView?.setCoverage(data.terrainMeta.bounds);
  buildAll();
  map.showOfficial(store.get().officialRes);
  last = store.get();
  loading.remove();
  if (store.get().view === 'local' && welcome.shouldShowOnLoad()) welcome.open();
  service.whenRoutingReady().then(() => store.set({ routingReady: true })).catch((err) => { console.error(err); store.set({ routingReady: 'error' }); });
  service.traverseValidation().then((v) => store.set({ traverseValidation: v })).catch((err) => console.error(err));
  window.MARSPLUS = { store, service, map, globe }; // debugging aid for the team (map.setTrekUrlForTest simulates an outage)
}

main();

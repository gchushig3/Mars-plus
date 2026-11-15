// AI-assisted (Claude). Reviewed by the MARS+ team.
// Composition root: builds adapters, wires use cases, mounts the UI.
import { createStore } from './application/store.js';
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
import { createPhotosPanel } from './ui/panels/photos-panel.js';
import { createSummaryBar } from './ui/panels/summary-bar.js';
import { createWelcome } from './ui/panels/welcome.js';

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

  const repository = createStaticSiteRepository('data/', SITE_ID);
  const service = createMissionService({ repository, solver: createWorkerRouteSolver() });
  let data;
  try {
    data = await service.loadSite();
  } catch (err) {
    console.error(err);
    loading.textContent = i18n.t('app.loadError');
    return;
  }

  const map = createLeafletMapView(document.getElementById('map'), { data, assetUrl: repository.assetUrl });
  const planOptions = service.defaultPlanOptions();
  const store = createStore({
    officialRes: data.routes.primaryResM,
    pick: null, pointA: null, pointB: null,
    routeStatus: { kind: 'idle' }, userRoute: null,
    paceKey: 'normal', planOptions, ...service.evaluate(planOptions),
    sensitivity: { status: 'idle', rows: null }, sensitivityView: null, traverseValidation: null, routingReady: false,
  });

  // Sensitivity rows (leg times per sand factor) -> view with the recommended plan under the current options
  const sensitivityView = (rows, options) => (rows ?? []).filter((r) => r.legs).map((r) => ({
    factor: r.factor, isModel: r.isModel,
    outMin: r.legs.landing_sampling.timeMin, backMin: r.legs.sampling_landing.timeMin,
    rec: service.evaluate(options, r.legs).evaluation.recommended,
  }));

  // --- actions (the only place that mutates state) ---
  async function computeIfReady() {
    const { pointA, pointB } = store.get();
    if (!pointA || !pointB) return;
    store.set({ routeStatus: { kind: 'computing' } });
    const res = await service.computeRoute(pointA, pointB);
    store.set(res.ok ? { routeStatus: { kind: 'done', ms: res.ms }, userRoute: res.stats } : { routeStatus: { kind: 'error', code: res.code === 'notReady' ? 'computing' : res.code }, userRoute: null });
  }
  const actions = {
    pick: (which) => store.set((s) => ({ pick: s.pick === which ? null : which })),
    clear: () => store.set({ pick: null, pointA: null, pointB: null, userRoute: null, routeStatus: { kind: 'idle' } }),
    useMission: () => {
      store.set({ pick: null, pointA: { ...data.site.points.landing }, pointB: { lon: data.stops.sampling.lon, lat: data.stops.sampling.lat }, userRoute: null });
      computeIfReady();
    },
    setOption: (patch) => {
      const planOptionsNext = { ...store.get().planOptions, ...patch };
      store.set({ planOptions: planOptionsNext, ...service.evaluate(planOptionsNext), sensitivityView: sensitivityView(store.get().sensitivity.rows, planOptionsNext) });
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
  };
  map.onClick((p) => {
    const { pick } = store.get();
    if (!pick) return;
    store.set({ [pick === 'A' ? 'pointA' : 'pointB']: p, pick: pick === 'A' && !store.get().pointB ? 'B' : null, userRoute: null, routeStatus: { kind: 'idle' } });
    computeIfReady();
  });

  // --- panels: the answer first (GO / NO-GO), then mission, plans, own route and details ---
  const sidebar = document.getElementById('sidebar');
  const ctx = { i18n, data, store, actions };
  const summaryEl = document.createElement('div');
  sidebar.append(summaryEl);
  const panels = [createSummaryBar(summaryEl, ctx)];
  const sections = [['mission', createMissionPanel], ['plans', createPlansPanel], ['route', createRoutePanel], ['photos', createPhotosPanel],
    ['weather', createWeatherPanel], ['radiation', createRadiationPanel], ['geology', createGeologyPanel], ['assumptions', createAssumptionsPanel], ['sources', createSourcesPanel]];
  for (const [id, factory] of sections) {
    const el = document.createElement('section'); el.className = 'section'; el.id = `panel-${id}`; sidebar.append(el); panels.push(factory(el, ctx));
  }

  const welcome = createWelcome(document.getElementById('welcome'), { i18n });
  const helpBtn = document.getElementById('help');
  helpBtn.addEventListener('click', () => welcome.open(helpBtn));

  const buildAll = () => {
    const { t } = i18n;
    document.getElementById('subtitle').textContent = t('app.subtitle');
    document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === i18n.lang)));
    helpBtn.setAttribute('aria-label', t('welcome.help')); helpBtn.title = t('welcome.help');
    document.getElementById('skip').textContent = t('app.skip');
    map.setLabels(i18n.html);
    panels.forEach((p) => p.build(store.get()));
    panels.forEach((p) => p.update(store.get()));
    welcome.rerender();
  };
  let last = {};
  store.subscribe((s) => {
    panels.forEach((p) => p.update(s));
    if (s.officialRes !== last.officialRes) map.showOfficial(s.officialRes);
    if (s.pointA !== last.pointA) map.setPoint('A', s.pointA);
    if (s.pointB !== last.pointB) map.setPoint('B', s.pointB);
    if (s.userRoute !== last.userRoute) map.showUserRoute(s.userRoute?.coords ?? null);
    map.setPickCursor(Boolean(s.pick));
    last = s;
  });
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
    i18n.setLang(b.dataset.lang);
    try { localStorage.setItem('marsplus.lang', b.dataset.lang); } catch { /* ignore */ }
  }));
  i18n.onChange(buildAll);

  buildAll();
  map.showOfficial(store.get().officialRes);
  last = store.get();
  loading.remove();
  if (welcome.shouldShowOnLoad()) welcome.open();
  service.whenRoutingReady().then(() => store.set({ routingReady: true })).catch((err) => { console.error(err); store.set({ routingReady: 'error' }); });
  service.traverseValidation().then((v) => store.set({ traverseValidation: v })).catch((err) => console.error(err));
  window.MARSPLUS = { store, service, map }; // debugging aid for the team (map.setTrekUrlForTest simulates an outage)
}

main();

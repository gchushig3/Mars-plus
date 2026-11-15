# MARS+ — EVA planner for Mars (Jezero crater pilot)

**NASA Space Apps Challenge 2026 · Interplanetary Survival Guide: Martian Map**

MARS+ helps a crew inside the habitat decide **whether, when and how** to walk from **Octavia E. Butler Landing** to the **Issole outcrop** in Jezero crater (≈886 m away). The goal is to document signs of past water alteration, collect a sample and come back safely. MARS+ layers NASA orbital and surface data into a hyper-local map, computes **least-effort walking routes**, and runs every candidate plan through a transparent **chain of safety filters** that explains *why* a plan is GO or NO-GO.

> **Live site:** https://gchushig3.github.io/Mars-plus/ · **Code:** https://github.com/gchushig3/Mars-plus · **Demo:** _slides link coming soon_

---

## What it does

- **3D Mars globe as the entry screen:** a WebGL2 globe built by the MARS+ team. It has four global layers (Viking, MOLA, USGS geology and seasonal dust). The highlighted footprint follows the bounds of the Jezero terrain dataset. Select it or zoom in near it to open the local map with geology enabled. Use `?view=local` to open the EVA map directly.
- **Hyper-local map (≈1 km², 2 m grid):** HiRISE 25 cm imagery and the official EVA route (out and back). The habitat and Issole points open Perseverance photos. The layer control offers the Brac detour, walking effort, slope, Jezero geology and the rover traverse. The bottom-left legends follow the visible layers.
- **Elevation profile under the map:** choose any displayed route. The probe is shared with the map. The Perseverance line uses elevations sampled from HiRISE, with gaps outside the pilot terrain.
- **Science stops:** Issole links the annotated Quartier workspace, its mineral measurements and NASA's sample records. Other documented sites have routes and separate results for photography and photography plus sampling, as a detour on the Issole EVA or a dedicated round trip. The planner rechecks the workspace, time, weather and radiation for each option.
- **Mars gravity explained:** 0.38 g, what it changes for loads, walking speed, slopes and falls, with a weight converter. It explains the model; the cost formula is unchanged.
- **Least-effort route A → B:** click two points and an A* search runs in your browser (Web Worker) over the 2 m terrain grid. Cost = time to cross each cell, from directional slope, roughness, sand (aeolian bedforms) and rocks detected in HiRISE.
- **EVA plan chain:** plans **A** (photo + sample), **C** (sample only) and **B** (documentation only) × every departure hour → **terrain → science → time → weather → radiation**. A plan that fails one filter is rejected with its reason; nothing compensates for a safety failure.
- **Real conditions:** Perseverance MEDA weather at Issole (sols 286–339, including the January 2022 regional dust storm) and Curiosity RAD dosimetry around the **28 Oct 2021 solar particle event**.
- **Validity checks built in:**
  - **Sand sensitivity:** routes and plans are recomputed with sand ×1.5 / ×2 / ×3.
  - **Obstacle model vs. ground truth:** only 0.8% of the cells along Perseverance's real ~1 km drive inside the area are flagged as blocked.
  - **Real rover photos** of what the crew will see at Issole.
- **Emergency return during the EVA:** select an itinerary and show estimated minutes to the habitat along it. Select a section or enter the metres walked to compare normal, dust and solar-event returns from the same point. Solar uses the fastest route and the selected historical RAD day's peak rate. Dust applies a slope cap, penalties for dunes and loss of line of sight, and a slower walking pace. The plans panel compares measured Mastcam-Z opacity during the 2022 and 2024 dust episodes at Jezero. Combining a Jezero dust observation with the Gale RAD event is a prototype scenario.
- **Explains itself:** "Recommended: Plan C, depart 09:00, back 11:39 … Plan A is out — Time: exceeds the 180-min limit by 5 min."
- **Bilingual:** English / Spanish.

## NASA data and resources used

| Data | Use | Source |
|---|---|---|
| HiRISE 1 m DTM (Mars 2020 TRN) | Slope, elevation, roughness | USGS Astrogeology / NASA |
| HiRISE 25 cm orthomosaic (Mars 2020 TRN) | Rock detection (shadows), offline base image | USGS Astrogeology / NASA/JPL/UArizona |
| Mars Trek WMTS (HiRISE, CTX, THEMIS) | Interactive base maps | NASA/JPL Solar System Treks |
| MEDA derived data (TIRS, WS) | Ground temperature and wind at Issole | NASA PDS Atmospheres, DOI 10.17189/1522849 |
| MSL RAD RDR | Surface dose rate, solar event of 28 Oct 2021 | NASA PDS PPI (MSL-M-RAD-3-RDR-V1.0) |
| Perseverance waypoints (MMGIS M20) | Rover traverse, Issole position | NASA/JPL |
| Mars Perseverance raw images | Context for the stops | NASA/JPL-Caltech (challenge resource) |
| Mars rock samples catalog | Robine and Malay samples | NASA |
| Jezero crater floor campaign | Images, mineral measurements and site context for the science stops | [Sun et al.](https://doi.org/10.1029/2022JE007613), [Simon et al.](https://doi.org/10.1029/2022JE007474) |
| Viking MDIM 2.1 colour mosaic | Globe base layer | NASA/JPL/USGS, via Mars Trek |
| MOLA MEGDR (8 px/deg) | Globe elevation layer | NASA MGS, PDS Geosciences |
| Geologic Map of Mars (SIM 3292) | Globe geology layer (44 units) | USGS for NASA |
| MRO CRISM CAR browse image (FRT00005C5E, 18 m/pixel) | Optional orbital mineral indicators in Jezero | [NASA PDS](https://pds-geosciences.wustl.edu/mro/mro-m-crism-5-rdr-mptargeted-v1/mrocr_4001/browse/2007/2007_139/frt00005c5e/) |
| Star field (Deep Star Maps) | Globe background | NASA Goddard SVS, ESA/Gaia/DPAC |
| Mastcam-Z 880 nm optical depth (Perseverance) | Dust-storm alert at Jezero (τ ≥ 1.0) | Lemmon, Mendeley Data doi:10.17632/gktjp9jptb.2 |
| Column dust optical depth maps (MY24–MY36) | Globe dust layer by season | Montabone et al. 2015/2020 (CC BY-SA 3.0) |
| Mars Dust Activity Database v1.1 | Globe storm-frequency layer | Battalio & Wang 2021, doi:10.5281/zenodo.7480334 |

The CRISM layer is a false-color composite of spectral indicators. Use it to flag areas for review, then check geologic context and surface-scale imagery. An 18 m pixel can mix several materials. Walking costs still come from the local HiRISE terrain and geologic layers.

## How it works

```
pipeline/ (PowerShell + C#, offline)          app/ (static site, no build)
  HiRISE DTM + ortho, geology, MEDA, RAD  →   data/sites/jezero-issole/*  →  domain (JS): cost, A*, plan filters
  RouteEngine.cs (official routes)             (2.4 MB + manifest)            application: use cases, store
  config/model-parameters.json  ─────────── single source of truth ───────→   infrastructure: Leaflet, Worker
                                                                              ui: panels, SVG charts, i18n
  Viking, MOLA, Tanaka 2014 geology         →   assets/globe/* (on demand)  →  infrastructure: WebGL2 globe
```

- **Clean architecture:** `domain/` is pure JavaScript (no DOM). `infrastructure/` adapts Leaflet, the Web Worker and the static data; `ui/` only talks to `application/`.
- **Parity:** the browser engine and the pipeline engine (C#) read the same parameters. `tests/` checks that their route times differ by **<1%**.
- **Emergency return:** the Web Worker builds two "time to the habitat" fields once (fastest, and dust-safe); the way home from any point of the plan is then read in milliseconds.
- **Tests:** domain, plan scenarios, measured alerts, JS↔C# parity, validity, UI and layer rules, globe and emergency return. An architecture test fails if `ui/` imports `domain/` or `infrastructure/`.
- See `STACK_Y_ARQUITECTURA.md` (Spanish) for the full stack and architecture.

## Run locally (Windows)

```powershell
# regenerate app data (needs the raw data in data/, see pipeline/)
powershell -ExecutionPolicy Bypass -File pipeline\run-pipeline.ps1
# serve the repo
powershell -ExecutionPolicy Bypass -File tools\dev-server.ps1
# app:   http://localhost:8770/app/
# tests in the browser: http://localhost:8770/tests/
# same suite without Windows, from the repo root (this is what CI runs):
node tests/run.mjs
```

## Deploy

`app/` is a static site with no build step:
- **GitHub Pages:** on every push to `main`, `.github/workflows/pages.yml` runs the full test suite (Node 22) and publishes `app/` only if every test passes (Settings → Pages → Source: GitHub Actions).
- **Netlify:** `netlify.toml` publishes `app/`.

## Assumptions and limits (stated in the app)

- Walking speed: Tobler hiking function scaled ×0.5 (~2.5 km/h on flat ground) for a pressurized suit. This is a scenario assumption, not a measured value.
- Sand doubles walking time (based on Lejeune et al. 1998, energy cost of walking on sand). About 520 m of large dunes surround Issole and cannot be avoided.
- Rocks are detected from HiRISE shadows; rocks smaller than ~0.75 m are invisible from orbit.
- Radiation rate comes from Gale crater (RAD). Jezero is higher, so the local dose would be somewhat larger. The nominal dose is that rate times time on the surface (walking and tasks). Airlock time is inside the habitat, and the reserve is unused margin, so neither is counted as exposure. The weather check still covers the whole budgeted window, including the reserve.
- The dust-storm alert follows Mastcam-Z 880 nm optical depth at Jezero and turns on at the scenario threshold τ ≥ 1.0 (see `config/model-parameters.json`). Derived MEDA files do not contain opacity. Global maps show the Montabone column-dust climatology and MDAD storm frequency; both are orbital and do not separate routes inside Jezero. Provenance is in `app/data/dust/catalog.json` and `docs/es/datos-polvo.md`.
- Stops are the flattest rock-free workspaces near the rover positions for Robine and Malay.
- Emergency return (scenario assumptions, `config/model-parameters.json → contingency`): the habitat is the only shelter; the crew position is estimated from progress along the planned route (no GPS on Mars); dust-safe routes keep slopes ≤ 15° and are walked 1.5× slower; a warning appears when any point of the plan is more than 45 min from the habitat. How much warning an alert gives on Mars is not modelled.

## AI assistance (Space Apps "Super Intelligence" disclosure)

- **What the team defined:** the mission concept, the route objective (least-effort, least-exposure EVA from Octavia E. Butler Landing to Issole), the science target (signs of water alteration) and the product direction (MARS+).
- **What the team built:** the 3D globe (WebGL2 renderer, layers and design), made with AI assistance.
- **What the AI did:** this project used **Claude (Anthropic)** as a development assistant to:
  - research and locate NASA datasets;
  - write the data-processing pipeline (PowerShell/C#), the route engine, the web application code and the tests;
  - integrate the team's globe and Henry's Cursor-made changes into the app;
  - build the emergency return during the EVA;
  - draft documentation.
- **Cursor:** a team member (Henry) used the **Cursor** agent to add the CI test run before publishing, the corrected surface dose (walking + tasks only), configurable workspace limits, route-calculation robustness, the measured dust alert, the globe dust maps (with their Python builder, `tools/dust/`), and the time-field and line-of-sight prototypes the emergency return builds on. Those commits keep Cursor as author in the git history.
- **AI-generated image:** the MARS+ logo was generated with AI. It is shown with a visible "AI-generated image" label, and `app/assets/globe/globe.json` declares it (`logo.aiGenerated`). No other AI-generated images, audio or video are used.
- **Marking:** every AI-assisted source file carries a header naming the tool, e.g. `AI-assisted (Claude). Reviewed by the MARS+ team.` or `AI-assisted (Cursor, used by Henry). Reviewed by the MARS+ team.`

## References

**Data**
- USGS Astrogeology, *Mars 2020 Terrain Relative Navigation HiRISE DTM and orthoimage mosaics*.
- NASA/JPL, *Mars Trek WMTS*: https://trek.nasa.gov/mars/
- MEDA bundle, NASA PDS Atmospheres, DOI 10.17189/1522849.
- MSL RAD RDR, NASA PDS PPI, MSL-M-RAD-3-RDR-V1.0.
- Stack, K. M. et al. (2020). *Photogeologic Map of the Perseverance Rover Field Site in Jezero Crater*. Space Sci. Rev. 216, 127. doi:10.1007/s11214-020-00739-x (CC BY 4.0).
- Tanaka, K. L. et al. (2014). *Geologic Map of Mars*. USGS Scientific Investigations Map 3292. doi:10.3133/sim3292.
- USGS Astrogeology, *Mars Viking Colorized Global Mosaic (MDIM 2.1)*.
- Smith, D. E. et al., *MGS MOLA Mission Experiment Gridded Data Records (MEGDR)*, NASA PDS Geosciences, MGS-M-MOLA-5-MEGDR-L3-V1.0.
- NASA Goddard Scientific Visualization Studio, *Deep Star Maps 2020* (ESA/Gaia/DPAC).
- Montabone, L. et al. (2015). *Eight-year climatology of dust optical depth on Mars*. Icarus 251, 65–95. doi:10.1016/j.icarus.2014.12.034. Montabone, L. et al. (2020), JGR Planets, doi:10.1029/2019JE006111.
- Battalio, M. & Wang, H. (2021). *The Mars Dust Activity Database (MDAD)*. Icarus 354, 114059. doi:10.1016/j.icarus.2020.114059.
- Lemmon, M. T., *Mars 2020 Mastcam-Z optical depth*, Mendeley Data, doi:10.17632/gktjp9jptb.2.
- Guo, J. et al. (2023). *The First Ground Level Enhancement Seen on Three Planetary Surfaces: Earth, Moon, and Mars*. Geophys. Res. Lett., doi:10.1029/2023GL103069.

**Literature**
- Bell, J. F. III et al. (2022). *Geological, multispectral, and meteorological imaging results from the Mars 2020 Perseverance rover in Jezero crater*. Sci. Adv. 8, eabo4856.
- Lemmon, M. T. et al. (2022). *Dust, sand, and winds within an active Martian storm in Jezero crater*. GRL, doi:10.1029/2022GL100126.
- Hassler, D. M. et al. (2014). *Mars' surface radiation environment measured with the Mars Science Laboratory's Curiosity rover*. Science 343.
- Lejeune, T. M. et al. (1998). *Mechanics and energetics of human locomotion on sand*. J. Exp. Biol. 201, 2071–2080.
- Tobler, W. (1993). *Three presentations on geographical analysis and modeling* (hiking function).
- Golombek, M. P. et al., rock abundance from HiRISE shadow detection (method principle).

**Software**
- Leaflet 1.9.4 (BSD-2-Clause).
- IBM Plex Sans / Mono (SIL Open Font License).

See `ATTRIBUTION.md` for credits and licenses.

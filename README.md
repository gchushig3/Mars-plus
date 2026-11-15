# MARS+ — EVA planner for Mars (Jezero crater pilot)

**NASA Space Apps Challenge 2026 · Interplanetary Survival Guide: Martian Map**

MARS+ helps a crew inside the habitat decide **whether, when and how** to walk from **Octavia E. Butler Landing** to the **Issole outcrop** in Jezero crater (≈886 m away). The goal is to document signs of past water alteration, collect a sample and come back safely. MARS+ layers NASA orbital and surface data into a hyper-local map, computes **least-effort walking routes**, and runs every candidate plan through a transparent **chain of safety filters** that explains *why* a plan is GO or NO-GO.

> **Live site:** https://gchushig3.github.io/Mars-plus/ · **Code:** https://github.com/gchushig3/Mars-plus · **Demo:** _slides link coming soon_

---

## What it does

- **Hyper-local map (≈1 km², 2 m grid):** HiRISE 25 cm imagery, slope, walking-cost layer, geology units, the official EVA route (out and back), the real Perseverance traverse, and the sampling and observation stops.
- **Least-effort route A → B:** click two points and an A* search runs in your browser (Web Worker) over the 2 m terrain grid. Cost = time to cross each cell, from directional slope, roughness, sand (aeolian bedforms) and rocks detected in HiRISE.
- **EVA plan chain:** plans **A** (photo + sample), **C** (sample only) and **B** (documentation only) × every departure hour → **terrain → science → time → weather → radiation**. A plan that fails one filter is rejected with its reason; nothing compensates for a safety failure.
- **Real conditions:** Perseverance MEDA weather at Issole (sols 286–339, including the January 2022 regional dust storm) and Curiosity RAD dosimetry around the **28 Oct 2021 solar particle event**.
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

## How it works

```
pipeline/ (PowerShell + C#, offline)          app/ (static site, no build)
  HiRISE DTM + ortho, geology, MEDA, RAD  →   data/sites/jezero-issole/*  →  domain (JS): cost, A*, plan filters
  RouteEngine.cs (official routes)             (2.4 MB + manifest)            application: use cases, store
  config/model-parameters.json  ─────────── single source of truth ───────→   infrastructure: Leaflet, Worker
                                                                              ui: panels, SVG charts, i18n
```

- **Clean architecture:** `domain/` is pure JavaScript (no DOM). `infrastructure/` adapts Leaflet, the Web Worker and the static data; `ui/` only talks to `application/`.
- **Parity:** the browser engine and the pipeline engine (C#) read the same parameters. `tests/` checks that their route times differ by **<1%**.
- See `STACK_Y_ARQUITECTURA.md` (Spanish) for the full stack and architecture.

## Run locally (Windows)

```powershell
# regenerate app data (needs the raw data in data/, see pipeline/)
powershell -ExecutionPolicy Bypass -File pipeline\run-pipeline.ps1
# serve the repo
powershell -ExecutionPolicy Bypass -File tools\dev-server.ps1
# app:   http://localhost:8770/app/
# tests: http://localhost:8770/tests/   (18 tests: domain, 6 plan scenarios, JS↔C# parity, performance)
```

## Deploy

`app/` is a static site with no build step:
- **GitHub Pages:** `.github/workflows/pages.yml` publishes `app/` on every push to `main` (Settings → Pages → Source: GitHub Actions).
- **Netlify:** `netlify.toml` publishes `app/`.

## Assumptions and limits (stated in the app)

- Walking speed: Tobler hiking function scaled ×0.5 (~2.5 km/h on flat ground) for a pressurized suit. This is a scenario assumption, not a measured value.
- Sand doubles walking time (based on Lejeune et al. 1998, energy cost of walking on sand). About 520 m of large dunes surround Issole and cannot be avoided.
- Rocks are detected from HiRISE shadows; rocks smaller than ~0.75 m are invisible from orbit.
- Radiation rate comes from Gale crater (RAD). Jezero is higher, so the local dose would be somewhat larger.
- The dust storm is modeled as an explicit alert, because dust opacity is not in the derived MEDA files.
- Stops are the flattest rock-free workspaces near the rover positions for Robine and Malay.

## AI assistance (Space Apps "Super Intelligence" disclosure)

- **What the team defined:** the mission concept, the route objective (least-effort, least-exposure EVA from Octavia E. Butler Landing to Issole), the science target (signs of water alteration) and the product direction (MARS+).
- **What the AI did:** this project used **Claude (Anthropic)** as a development assistant to:
  - research and locate NASA datasets;
  - write the data-processing pipeline (PowerShell/C#), the route engine, the web application code and the tests;
  - draft documentation.
- **Marking:** every AI-assisted source file carries the header `AI-assisted (Claude). Reviewed by the MARS+ team.` No AI-generated images, audio or video are used in the app.

## References

**Data**
- USGS Astrogeology, *Mars 2020 Terrain Relative Navigation HiRISE DTM and orthoimage mosaics*.
- NASA/JPL, *Mars Trek WMTS*: https://trek.nasa.gov/mars/
- MEDA bundle, NASA PDS Atmospheres, DOI 10.17189/1522849.
- MSL RAD RDR, NASA PDS PPI, MSL-M-RAD-3-RDR-V1.0.
- Stack, K. M. et al. (2020). *Photogeologic Map of the Perseverance Rover Field Site in Jezero Crater*. Space Sci. Rev. 216, 127. doi:10.1007/s11214-020-00739-x (CC BY 4.0).

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

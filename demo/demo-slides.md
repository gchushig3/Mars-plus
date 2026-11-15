# MARS+ · Demo deck (7 slides, English)

> Texto de las diapositivas y notas del orador en **inglés** (lo ven los jueces).
> Las notas de producción para el equipo van en *cursiva y en español*.
> Tiempo objetivo: **2 min 45 s**, unos 20–30 s por diapositiva. Cada cifra fue comprobada en el sitio público el 15-nov-2026.
> AI-assisted (Claude). Reviewed by the MARS+ team.

---

## Slide 1 · Title (15 s)

**On the slide**
- **MARS+**
- *Plan a safe Mars walk, and know the way back.*
- EVA planner for the first crew · Jezero crater pilot
- gchushig3.github.io/Mars-plus
- NASA Space Apps Challenge 2026 · Interplanetary Survival Guide: Martian Map

**Speaker notes**
> "MARS+ helps the first crew on Mars decide whether to go outside, when, and what they can do safely, and tells them how to come back if something goes wrong."

*Visual: captura del globo de entrada (vista de Marte entera, capa Viking) a sangre completa. El logo MARS+ con su marca "AI-generated image" bien visible. Sin logos NASA.*

---

## Slide 2 · The problem (25 s)

**On the slide**
- Mars data exists, but it is spread across instruments and archives
- A crew needs one answer: **GO or NO-GO, when, and what fits**
- Every minute outside costs time, energy and radiation
- Dust storms and solar particle events can arrive *during* the walk

**Speaker notes**
> "NASA has mapped Jezero down to 25 centimetres and measured its weather and radiation, but that knowledge lives in a dozen places. On the day of the first walk, the crew needs one answer: go or don't go, when, and what fits. And if a storm or a solar event arrives halfway, how to get home."

*Visual: 4 íconos simples (mapa, termómetro, radiación, reloj) que convergen en un botón GO / NO-GO. Paleta MARS+.*

---

## Slide 3 · The pilot mission (25 s)

**On the slide**
- From **Octavia E. Butler Landing** to the **Issole outcrop**: ~886 m
- Where Perseverance cored **Robine** (sol 298) and **Malay** (sol 337)
- Science goal: rocks altered by water (carbonates, hydrated sulfates)
- Tasks: photograph the outcrop, take a sample, come back inside the EVA budget

**Speaker notes**
> "Our pilot is a real place. Perseverance landed at Octavia E. Butler Landing and drove to Issole, where it took two cores, Robine and Malay, from rocks altered by water. We ask: could a person walk there, photograph the outcrop, take a sample and come back safely?"

*Visual: captura del mapa local (`?view=local`) con la ruta oficial de ida (azul) y vuelta (dorada), las paradas y la traza real del rover (violeta punteada). Marcar "Landing" e "Issole".*

---

## Slide 4 · How it works (30 s)

**On the slide**
- **NASA data → walking cost → 5 safety filters → GO / NO-GO, explained**
- Cost of every 2 m cell = time to cross it: slope, roughness, sand, rocks seen in 25 cm HiRISE
- Least-effort route computed in the browser
- Filters: **terrain → science → time → weather → radiation**. A plan that fails one is out; nothing compensates a safety failure
- Data: HiRISE DTM and orthoimage · MEDA weather · RAD radiation · Mastcam-Z dust · Stack 2020 geology

**Speaker notes**
> "Each 2-metre cell of the terrain gets a cost: the time to walk across it in a suit, from slope, roughness, sand and rocks we detect in HiRISE images. MARS+ finds the least-effort route, then runs every plan and every departure hour through five filters. A plan that fails one filter is out, with the reason in plain words."

*Visual: diagrama de 5 cajas en fila con flechas (Terrain, Science, Time, Weather, Radiation), cada una con su color de la app. A la izquierda, las capas de datos; a la derecha, la tarjeta GO.*

---

## Slide 5 · Demo (40 s)

**On the slide** *(three screenshots, left to right)*
1. **Typical sol → GO:** Plan C, depart 09:00, back 11:39 · 25 µGy. *Plan A is out: 5 min over the 180-min limit.*
2. **Measured dust storm → NO-GO:** Mastcam-Z optical depth 1.38 ≥ 1.0 → postpone
3. **Alert during the walk:** a solar particle event at the sampling stop → **return now: 38 min, 17.6 µGy**. Storm too? The dust-safe route: 63 min, 203 m less sand

**Speaker notes**
> "On a typical day MARS+ says GO: sample only, leave at nine, back by 11:39. The full plan with the photo is five minutes over, and it says so. On the storm day, the dust measured by Perseverance's camera is above our threshold: don't go. And if a solar particle event arrives while the crew is at the sampling stop, MARS+ already knows the fastest way home: 38 minutes, and the dose it costs. Add a dust storm, and it switches to the safe route: gentler slopes, less sand, the habitat in view."

*Visual: 3 capturas (1 = tarjeta SALIR/GO con la explicación; 2 = NO SALIR con escenario tormenta; 3 = mapa con la ruta de regreso + panel "Emergency return"). Si hay espacio, un recuadro pequeño con la "vista del astronauta" (pantalla negra con RETURN NOW).*

---

## Slide 6 · Can you trust it? (25 s)

**On the slide**
- **Two engines agree:** browser (JavaScript) and pipeline (C#) route times within **1%**
- **Stable:** return walk 37.6 / 37.9 / 38.9 min at 1 / 2 / 5 m grids
- **Ground truth:** only **0.76%** of the cells on Perseverance's real ~1 km drive are flagged as blocked
- **Real events:** the Jan 2022 dust storm (sols 313–317) and the 28 Oct 2021 solar particle event
- **Honest:** the sand factor changes the answer (×1.5 → Plan A, ×2 → C, ×3 → B), and the app shows it. 82 automated tests run before every publish

**Speaker notes**
> "We checked ourselves. Two independent engines agree within one percent. The answer is stable when we change the grid. The rover actually drove where our model says the ground is passable, with only 0.76 percent of its track flagged. We replay a real dust storm and a real solar event. And where our assumptions matter, like how much sand slows a suited walker, the app shows how the answer changes."

*Visual: 4–5 cifras grandes en tarjetas (1%, 0.76%, 82 tests, 2 eventos reales). La tabla de sensibilidad de arena como captura pequeña.*

---

## Slide 7 · Impact and next steps (25 s)

**On the slide**
- Any landing site on Mars or the Moon: swap the data, keep the engine
- Already prototyped by our team: hourly shadows, line of sight to the habitat, near-optimal route corridors, roughness, thermal inertia
- Next: live space-weather alerts, the crew's real position, more sites
- **Team MARS+** · names
- *AI use declared: built with Claude (Anthropic) and Cursor; logo AI-generated. See README.*

**Speaker notes**
> "MARS+ is not tied to Jezero: give it another site's data and the same engine plans the walk. Our team already prototyped shadows, line of sight and route corridors. Next we want live space-weather alerts and the crew's real position. We built it with AI assistants and say exactly how in our README. Thank you."

*Visual: el globo con la capa de polvo o de geología de fondo, atenuado. Nombres del equipo. La línea de IA en letra pequeña pero legible.*

---

## Producción (para el equipo, en español)

**Capturas desde la URL pública** (Chrome, ventana de 1600 × 900 o más, Ctrl+F5 antes de empezar):
1. Globo de entrada: abrir https://gchushig3.github.io/Mars-plus/ → cerrar la bienvenida → captura.
2. Mapa local con rutas: `?view=local` → acercar a la zona Landing–Issole → captura.
3. Día típico (GO): panel de resumen arriba + "Why ↓" abierto con la explicación.
4. Tormenta (NO-GO): en Mission, escenario "Dust-storm days (sols 313–317)" → captura del resumen.
5. Regreso de emergencia: panel "Emergency return" → minuto 50 (parada de muestreo) → captura con "Solar particle event"; luego marcar también "Dust storm" → captura del mapa con la ruta naranja punteada.
6. Vista del astronauta: botón "Astronaut view" → captura.
7. Sensibilidad de arena: panel "Sand sensitivity" → botón "Run sensitivity test" → captura de la tabla.
8. Globo con capa de polvo o geología para la diapositiva 7.

*Para que las capturas salgan en inglés: botón **EN** arriba a la derecha.*

**Reglas de Space Apps que hay que respetar:**
- Máximo 7 diapositivas, todo en inglés.
- Sin logos ni insignias de NASA. Se nombra a NASA solo para citar datos.
- El logo MARS+ está generado con IA: siempre con su marca "AI-generated image" visible.
- Compartir en Google Slides como "Cualquier persona con el enlace puede ver" y probar el enlace en una ventana privada.

**Paleta MARS+:** terracota #a2453e · taupe #c2a198 · gris cálido #7d6d6d · dorado #cc8e37 · durazno #e0a98b · fondo #14110f. Tipografías: IBM Plex Sans y IBM Plex Mono (Google Fonts).

**Video opcional de 30 s** (subtítulos en inglés):
1. 0–5 s: globo girando → clic en "Plan the EVA at Jezero →".
2. 5–15 s: vuelo y mapa con la ruta; la tarjeta GO.
3. 15–22 s: cambiar a tormenta → NO-GO.
4. 22–30 s: alerta en plena EVA → ruta de regreso y vista del astronauta. Cierre: "MARS+ · Plan a safe Mars walk, and know the way back."

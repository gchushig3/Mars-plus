# MARS+ — Fases de desarrollo (ejecución paso a paso)

**Plazo:** domingo 15-nov-2026, 23:59 hora local · **Punto de partida:** sábado 14-nov, ~21:00
**Cómo se usa:** se ejecuta **una fase a la vez**, en orden. Para arrancar una, escribe: **«Ejecuta la Fase N»**.
**Regla de avance:** cada fase termina con su verificación (✅) y un commit. Si algo no pasa, no se avanza.
**Referencias:** [`STACK_Y_ARQUITECTURA.md`](STACK_Y_ARQUITECTURA.md) (cómo está construido) · [`docs/es/auditoria-proyecto.md`](docs/es/auditoria-proyecto.md) (riesgos y requisitos) · [`docs/es/adr/`](docs/es/adr/) (decisiones)

---

## Mapa de fases

| Fase | Nombre | Prioridad | Tiempo | Quién | Estado |
|---|---|---|---|---|---|
| 0 | MVP funcional en local | Must | — | Claude | ✅ Hecha |
| 1 | Versionado y publicación v0.1 | **Must · bloqueante** | 1 h | Equipo (cuentas) + Claude | ✅ Hecha · https://gchushig3.github.io/Mars-plus/ |
| 2 | Limpieza y migración del legado | Must | 1 h | Claude (+ equipo confirma borrados) | ✅ Hecha · pipeline verificado byte a byte |
| 3 | Validez científica | Should | 3 h | Claude + equipo de ciencia | ✅ Hecha · falta que el equipo de ciencia confirme fotos y paradas (3.1–3.2) |
| 4 | Pulido de UX, accesibilidad y robustez | Should | 2 h | Claude | ✅ Hecha · falta la prueba con una persona nueva del equipo (4.1) |
| 5 | Globo 3D y transición | Could | 2 h | Equipo (globo) + Claude (integración) | ✅ Hecha · globo WebGL2 del equipo ([ADR-011](docs/es/adr/011-globo-webgl2-del-equipo.md)) |
| 5A | Correcciones traídas de la copia de Henry | **Must** | 1 h | Claude + Henry (confirma) | ✅ Hecha · 61/61 pruebas |
| 5B | Alerta de polvo medida (Mastcam-Z) + mapas de polvo en el globo | Should | 1,5 h | Claude | ✅ Hecha · 71/71 pruebas |
| 5C | Regreso de emergencia (alerta en plena EVA) | Should | 2,5 h | Claude + equipo de ciencia (supuestos) | ✅ Hecha · 82/82 pruebas · supuestos pendientes del equipo de ciencia |
| 5D | Congelamiento de funcionalidades y verificación pública | **Must** | 0,5 h | Claude | ✅ Hecha · funcionalidades congeladas |
| 6 | Demo (7 diapositivas en inglés) | **Must** | 3 h | Equipo de pitch + Claude | 🔄 Presentación armada (7 diapositivas, notas del orador): https://claude.ai/artifact/VtgRReCm2bEKC9zhxpC9Ac · faltan los nombres del equipo (diapositiva 7) y compartir el enlace |
| 7 | Formulario de envío y entrega | **Must** | 1,5 h | Equipo + Claude | ⏳ |
| 8 | Congelamiento y respaldo | Must | 0,5 h | Equipo + Claude | ⏳ |

**Total pendiente:** ~10,5 h (5A–5D: 5,5 h · 6–8: 5 h).

### Calendario sugerido y puntos de decisión
| Cuándo | Fases | Punto de decisión |
|---|---|---|
| Sábado 21:00 – domingo 02:00 | 1 → 5 | ✅ Hechas |
| Domingo 08:00–09:00 | 5A | Henry confirma que se puede usar su rama |
| Domingo 09:00–10:30 | 5B | **10:30 · ¿5B completa?** Si se atrasa, solo la alerta de Jezero; los mapas del globo pasan a trabajo futuro |
| Domingo 10:30–13:30 | 5C | **12:00 · el equipo de ciencia fija los supuestos** (minutos máximos al hábitat, ritmo con poca visibilidad) |
| Domingo 13:30–14:30 | 5D | **15:00 · se congelan las funcionalidades.** Lo que no esté en verde, no entra |
| Domingo 15:00–18:00 | 6 | — |
| Domingo 18:00–19:30 | 7 | **Envío antes de las 21:00** (3 h de margen) |
| Domingo 19:30–20:00 | 8 | Nada de código nuevo después del envío |

---

## Fase 0 — MVP funcional en local ✅ (hecha)
**Resultado:** sitio estático en `app/`, que pesa 2,5 MB y funciona en `http://localhost:8770/app/`.
- Pipeline `pipeline/run-pipeline.ps1` → datos del sitio con su manifiesto.
- Dominio JS: costo, A*, filtros, dosis, explicación. Paridad con el motor C# por debajo del 1%.
- UI: mapa Leaflet + HiRISE, ruta A→B en Web Worker, planes GO/NO-GO con explicación, clima, radiación, geología, supuestos, ES/EN.
- 18/18 pruebas en `/tests/`.
- README en inglés con la declaración de IA, ATTRIBUTION, workflow de Pages y `netlify.toml`.

---

## Fase 1 — Versionado y publicación v0.1 🔴 bloqueante
**Objetivo:** que exista la **URL pública** y que el código quede versionado.
**Entrada:** Fase 0 ✅. El equipo tiene una cuenta de GitHub (o de Netlify).

**Pasos**
1. *(Equipo)* Instalar Git para Windows (git-scm.com, opciones por defecto).
2. *(Equipo)* Crear en GitHub un repositorio **público** vacío: `mars-plus`.
3. *(Claude)* Revisar que `.gitignore` excluya `/data/` y `.env`.
4. *(Claude)* `git init` → primer commit → conectar con el remoto → `push` a `main`.
5. *(Equipo)* En el repositorio: Settings → Pages → Source: **GitHub Actions**.
6. *(Claude)* Esperar el workflow, abrir la URL `https://<usuario>.github.io/mars-plus/` y hacer la **prueba de humo**.
7. *(Claude)* Etiqueta `v0.1-preliminar`.

**Plan B (sin GitHub):** Netlify → "Add new site → Deploy manually" → arrastrar la carpeta `app/`.

**✅ Se considera terminada cuando**
- [ ] La URL pública abre por HTTPS, sin login, en una ventana privada.
- [ ] El flujo completo funciona: mapa → ruta oficial → A→B → planes → clima y radiación → ES/EN.
- [ ] La consola no muestra errores y la carga tarda menos de 5 s.
- [ ] También funciona en el móvil.
- [ ] El repositorio pesa menos de 50 MB y no contiene `data/` ni `.env`.

**Commit:** `chore: initial public release v0.1`

---

## Fase 2 — Limpieza y migración del legado
**Objetivo:** que el repositorio coincida con `STACK_Y_ARQUITECTURA.md` y quede **una sola versión de cada cosa**.
**Entrada:** Fase 1 ✅. **La otra sesión de Claude debe estar cerrada.**

**Pasos**
1. Mover `web/` y `scripts/` a `docs/es/historico/` (prototipo v1). El motor v1 queda solo como referencia.
2. Migrar al pipeline los scripts vigentes:
   - descargas → `pipeline/01-download/`
   - capas, MEDA y RAD → `pipeline/02-process/`
   
   Después, conectar todo a `run-pipeline.ps1 -Step all`.
3. Mover los documentos del equipo a `docs/es/`: auditoría, informe, catálogo, investigación, requisitos, LEEME y arquitectura. Marcar los superados como "histórico".
4. Escribir `docs/es/adr/` con los 10 ADR (sección 7 de `arquitectura-mvp.md`).
5. **Decidir la convención de radiación:** detector E. Borrar el duplicado `data/rad_dosis_oct2021.csv` (detector B) y `scripts/resumir_rad.ps1`.
6. *(Pide confirmación al equipo)* Eliminar de `data/` el SIM 3464 (351 MB, descartado), los archivos vacíos y las teselas `hirise_z17`.
7. Agregar `Set-StrictMode` a todos los scripts migrados.

**✅ Se considera terminada cuando**
- [ ] El árbol coincide con la sección 3 de `STACK_Y_ARQUITECTURA.md`.
- [ ] `run-pipeline.ps1` regenera `app/data` sin errores y el manifiesto no cambia de forma inesperada.
- [ ] Las pruebas siguen en 18/18 y la app pública funciona.

**Commit:** `refactor: migrate legacy scripts and docs to clean structure`

---

## Fase 3 — Validez científica
**Objetivo:** subir el criterio **Validity** con evidencia visible.
**Entrada:** Fase 2 ✅.

**Pasos**
1. **Fotos en las paradas** *(el equipo de ciencia elige; Claude integra)*:
   - Elegir 2–4 imágenes Navcam/Mastcam-Z de los sols 286, 293, 298 y 337 del índice en `data/raw/rover/images/`.
   - Copiarlas a `app/assets/rover/`, con crédito NASA/JPL-Caltech.
   - Mostrarlas en las ventanas de las paradas y en un bloque "Qué verás al llegar".
2. **Confirmar las paradas** *(equipo de ciencia)* con esas fotos. Si hace falta mover un punto, se ajusta en `config/site.jezero-issole.json` y se regenera.
3. **Sensibilidad de la arena:** selector ×1,5 / ×2 / ×3. El Worker recalcula la ruta oficial y los tiempos de los planes, y la app muestra si cambia el plan recomendado.
4. **Comparación con el rover:** tabla con nuestra ruta frente al recorrido real de Perseverance (distancia, terreno), más una nota de que el rover evita la arena por razones de ingeniería.
5. **Validación de las rocas:** comparar 2–3 zonas de sombras detectadas con fotos del rover en tramos que recorrió. El resultado va al panel de supuestos.
6. Nuevas pruebas: sensibilidad y paradas dentro de la zona.

**✅ Se considera terminada cuando**
- [ ] Las paradas muestran fotos reales con su crédito.
- [ ] El selector de sensibilidad funciona y lo cubre una prueba.
- [ ] El panel de supuestos refleja la validación de las rocas.
- [ ] Las pruebas pasan y la app publicada está actualizada.

**Commit:** `feat: validity — stop photos, sand sensitivity, rover comparison`

---

## Fase 4 — Pulido de UX, accesibilidad y robustez
**Objetivo:** que un juez entienda la app en 30 segundos y que no se rompa durante la evaluación.

**Pasos**
1. **Bienvenida breve** al cargar: qué es MARS+ y tres pasos para usarlo. Se puede cerrar.
2. Orden del panel lateral: arriba el **veredicto GO / NO-GO**, luego la misión, los planes, A→B y el detalle.
3. **Estados de carga y error:** mostrar el progreso del terreno para A→B y un mensaje si Mars Trek no responde (queda la imagen de respaldo).
4. **Accesibilidad:** contraste AA (revisar los tokens), uso completo con teclado, `title` y `desc` en las gráficas, y la grilla de planes legible por lector de pantalla.
5. **Prueba de red caída:** bloquear `trek.nasa.gov` en el navegador y comprobar que el mapa sigue siendo útil.
6. **Rendimiento:** medir la primera carga y aplicar *lazy-load* a lo que no se ve al inicio.
7. Revisión final de los textos en ES y EN.

**✅ Se considera terminada cuando**
- [ ] Una persona nueva entiende qué hacer sin ayuda (prueba con alguien del equipo).
- [ ] Sin Mars Trek no hay pantalla negra.
- [ ] Todo se opera con teclado.
- [ ] La carga inicial tarda menos de 5 s en la URL pública.

**Commit:** `feat: onboarding, accessibility and resilience`

---

## Fase 5 — Globo 3D y transición ✅ (hecha)
**Cambio de plan:** el equipo entregó su propio globo WebGL2 (`MARS-plus.zip`). Se usó en lugar de CesiumJS; ver [ADR-011](docs/es/adr/011-globo-webgl2-del-equipo.md), que reemplaza a ADR-003.

**Qué se hizo**
1. `pipeline/04-export/export-globe-assets.ps1` convierte los datos del equipo en archivos web (`app/assets/globe/`). La primera pantalla pasa de ~12 MB en base64 a ~650 KB; MOLA y geología se descargan solo al elegir esa capa.
2. Globo con tres capas (Viking, MOLA, geología de Tanaka 2014 con 44 unidades ES/EN), lugares (Olympus, Valles, Hellas, Jezero), zoom y teclado.
3. Botón "Planificar la EVA en Jezero" → vuelo de cámara → mapa local. El botón de la cabecera alterna globo ↔ mapa.
4. **Respaldo:** sin WebGL2, si el globo falla o con `?view=local`, la app arranca directo en LOCAL. Si el navegador no pinta cuadros, un temporizador termina el vuelo igual.
5. Logo MARS+ generado con IA, con la marca visible "AI-generated image" (regla de Space Apps).

**✅ Se considera terminada cuando**
- [x] Globo → Jezero → mapa local en ~1,6 s, y de vuelta al globo con el botón de la cabecera.
- [x] El respaldo funciona (`?view=local`: no se crea el globo y el plan recomendado sigue siendo C).
- [x] 33/33 pruebas en verde, incluidas 7 del globo.
- [x] La consola no tiene errores de la app. Los únicos errores son teselas de Mars Trek que no resuelven en el navegador de pruebas; la ortoimagen de respaldo las reemplaza.

**Commit:** `feat: 3D globe intro with Leaflet fallback`

---

## Mejoras 5A–5D: lo que se trae de Henry y el regreso de emergencia

**De dónde salen:**
- La copia de Henry (<https://github.com/henryconteron/Mars-plus>) parte de nuestro commit `540b283`. Sus 10 commits nuevos, hechos con Cursor, están en la rama `cursor/dust-heatmap-alert-2ed9`.
- La pregunta del equipo: ¿qué hace el plan si llega una alerta de polvo o de partículas solares?

**Idea central:** una tormenta de polvo cubre cientos de kilómetros y las partículas llegan desde todo el cielo. Ninguna ruta dentro de 1 km² las esquiva. Por eso:
- **antes de salir**, la alerta pospone la EVA (ya funciona así);
- **en plena EVA**, MARS+ da **la mejor ruta de regreso al hábitat**, calculada de antemano.

**Qué se trae de Henry y qué no**

| Commit de Henry | Qué es | Decisión |
|---|---|---|
| `2db0488` | Pruebas en GitHub antes de publicar, dosis correcta, límites de la zona de trabajo en `config/`, Worker de rutas que no se cuelga | **Se trae entero (5A)** |
| `23a55f1` | Alerta de polvo medida con Mastcam-Z + mapas de polvo en el globo | **Se trae con arreglos (5B)** |
| `b89c433` (solo `time-field.js` + su prueba) | Tiempo desde cada celda hasta el hábitat, en la dirección de regreso | **Base del regreso de emergencia (5C)** |
| `682ed09` (solo `viewshed.js` + su prueba) | Línea de vista al hábitat | **Para la ruta segura con polvo (5C)** |
| `286a09f`, `4f8ebab`, `0b0bf7f`, `d7996e5`, `dade4e6`, `7ee69be` y la parte visual de `b89c433` | Rugosidad, sombras por hora, tramos empinados, ruta coloreada, corredores, zona alcanzable, inercia térmica | **No entra en esta entrega.** Quedan como trabajo futuro (diapositiva 7) |

**Reglas para todo lo que se trae:**
- Se usa `git cherry-pick`, que conserva a Henry como autor en el historial.
- Los archivos hechos con Cursor llevan `AI-assisted (Cursor). Reviewed by the MARS+ team.`. Hoy algunos dicen "Claude" y otros no dicen nada.
- Ningún archivo de `ui/` importa de `domain/` ni de `infrastructure/`.

---

## Fase 5A — Correcciones traídas de la copia de Henry
**Objetivo:** que el MVP publicado no tenga errores que un juez pueda encontrar.

**Pasos**
1. *(Equipo)* Henry confirma que se puede usar su rama.
2. *(Claude)* Agregar su repositorio como remoto `henry` y traer `2db0488` en una rama `integracion-henry`.
3. *(Claude)* Corregir la atribución de IA:
   - encabezados de los archivos nuevos;
   - sección "AI assistance" del README: Henry usó Cursor para las pruebas en GitHub, la dosis y la robustez.
4. *(Claude)* Corregir el texto "opacidad ~2" de la tormenta donde aparezca. La tabla de Mastcam-Z da 1,38 como pico de las medianas diarias.
5. *(Claude)* Regenerar los datos (`run-pipeline.ps1 -Step export`). Comprobar que solo cambian la fecha del manifest y lo que el cambio explica.
6. *(Claude)* Correr las pruebas en `/tests/`, unir la rama a `main` y comprobar que GitHub Actions corre las pruebas y publica.

**Riesgo:** ahora la publicación depende de que las pruebas pasen en GitHub, con Node. Si fallan por algo del entorno, el sitio no se actualiza.
**Plan B:** volver al workflow anterior en un commit, o publicar en Netlify.

**✅ Se considera terminada cuando**
- [x] Todas las pruebas pasan en el navegador (61/61) y en GitHub Actions.
- [x] La dosis cuenta solo caminata + tareas (124 de 159 min): 25 µGy en vez de 31. La recomendación del escenario típico sigue siendo Plan C a las 09:00.
- [x] Cambiar A/B rápido no deja una ruta vieja, y un Worker caído muestra un error en vez de quedarse esperando (pruebas de `session.test.js`).
- [x] Ningún archivo nuevo queda sin encabezado de IA.

**Además:** el pipeline escribe el JSON con saltos de línea LF, para que los hashes de `manifest.json` coincidan con los archivos publicados; antes salían con CRLF en Windows. `stops.json` ahora incluye la fracción de duna de cada parada.

**Commit:** `fix: surface dose, CI tests and route robustness (from Henry's branch)`

---

## Fase 5B — Alerta de polvo medida y mapas de polvo en el globo
**Objetivo:** que la alerta de tormenta salga de una medición (Mastcam-Z, 880 nm) y no de una casilla.

**Pasos**
1. *(Claude)* Traer `23a55f1` (`domain/dust/`, `app/data/dust/`, ADR-012, `docs/es/datos-polvo.md`).
2. *(Claude)* **Arreglar la regla de capas.** La carga de los mapas y el pintado salen de `ui/views/globe-view.js` y pasan a:
   - `main.js`, que inyecta un adaptador de polvo;
   - o un caso de uso en `application/`.

   La vista solo recibe "dame la capa X para Ls Y".
3. *(Claude)* Actualizar la prueba "scenario 4" para que pase por la alerta. Con Mastcam-Z, el día de tormenta (τ 1,38 ≥ 1,0) da **posponer** solo; el Plan A a las 10:00 solo aparece si la tripulación apaga la alerta a mano.
4. *(Claude)* Documentar `tools/dust/build_dust_products.py` como herramienta aparte del pipeline. Usa Python, `netCDF4` y `numpy`, y el producto ya va publicado en `app/data/dust/`. Agregarlo a `STACK_Y_ARQUITECTURA.md` y `ATTRIBUTION.md`, con estas licencias:
   - Montabone: CC BY-SA 3.0;
   - MDAD: CC BY 4.0;
   - Mastcam-Z: CC BY 4.0, con su marca PRELIMINARY.

**Puerta de las 10:30:** si no está listo, se entrega solo la alerta de Jezero (pasos 1 sin mapas, 3 y 4) y los mapas del globo pasan a trabajo futuro.

**✅ Se considera terminada cuando**
- [x] La alerta muestra el τ medido, el umbral y el sol. La tripulación puede forzarla o apagarla. Día típico: τ 0,50 → Plan C a las 09:00. Día de tormenta: τ 1,38 → posponer.
- [x] El globo muestra polvo por estación, y el mapa plano funciona (`?dust=flat`).
- [x] Ningún archivo de `ui/` importa de `domain/` o `infrastructure/`; la prueba de arquitectura nueva lo verifica. Los mapas pasan por `application/dust-maps.js`.
- [x] Todas las pruebas en verde (71/71).

**Commit:** `feat: measured dust alert from Mastcam-Z and dust maps on the globe`

---

## Fase 5C — Regreso de emergencia (alerta en plena EVA)
**Objetivo:** responder "si me llega una alerta en plena caminata, ¿cómo vuelvo?". Se prepara **antes de salir** y se usa **durante** la EVA.

**Quién lo ve:**
- **La persona que queda en el hábitat** usa MARS+ y guía por radio.
- **El astronauta** recibe lo mínimo: ruta, minutos y próximo punto. Se muestra como concepto de lo que vería en el traje.

**Las tres rutas de regreso**

| Alerta | Prioridad | Cómo se calcula |
|---|---|---|
| Partículas solares | Tiempo expuesto | La ruta más rápida al hábitat, más la dosis extra con la tasa del evento del 28-oct-2021 (RAD) |
| Tormenta de polvo | Seguridad con poca visibilidad | Sin dunas grandes, pendiente máxima más baja, preferencia por tramos con vista al hábitat y ritmo más lento (supuesto) |
| Las dos | Lo más rápido entre lo seguro | La ruta de polvo, mostrando cuánto cuesta frente a la más rápida ("+4 min, +12 µGy"). Ninguna regla de seguridad se compensa |

**Pasos**
1. *(Claude)* **Dominio:**
   - traer `time-field.js` y `viewshed.js` de Henry con sus pruebas;
   - agregar el camino de regreso (predecesores) al campo de tiempo, que hoy solo da tiempos;
   - un campo por política (rápida, polvo), en dirección de regreso (`reverse = true`).
2. *(Claude)* **Aplicación:** dos casos de uso.
   - `planContingency(plan)`: puntos de regreso (salida, cada parada, cada 5 min de caminata y el punto más lejano), con las tres rutas desde cada uno.
   - `alertDuringEva(minuto o punto, alertas)`: el regreso desde la posición estimada.
3. *(Claude)* **Mapa y panel "Plan de regreso":**
   - en el mapa, los puntos de regreso y las rutas en colores distintos;
   - en el panel, minutos, distancia y dosis extra de cada regreso;
   - "a X min del hábitat" en el punto más lejano.
4. *(Claude)* **"Simular alerta en plena EVA":** se elige el minuto, o se hace clic en la ruta, y el tipo de alerta (polvo, partículas o las dos). La app dibuja el regreso y explica por qué eligió esa ruta.
5. *(Claude)* **"Vista del astronauta"** (concepto): pantalla de alto contraste con letra grande.
   - "VUELVE AHORA · ruta azul · 22 min · 410 m"
   - flecha hacia el próximo punto
   - minutos restantes
6. *(Equipo de ciencia, 12:00)* Fijar los supuestos en `config/model-parameters.json`, cada uno con su fuente o marcado como "supuesto":
   - ritmo con poca visibilidad;
   - pendiente máxima con polvo;
   - minutos máximos al hábitat.
7. *(Claude)* **Criterio previo (aviso, no filtro):** si en algún punto el plan deja a la tripulación más lejos que los minutos máximos al hábitat, se avisa. No cambia la recomendación del día.
8. *(Claude)* ADR-013 "Ante una alerta no se esquiva, se vuelve", textos ES/EN y panel de supuestos:
   - no se sabe cuánto aviso da una alerta de partículas en Marte;
   - en Marte no hay GPS: la posición se estima por el avance en la ruta;
   - el único refugio es el hábitat.

**Pruebas nuevas**
- Volver desde la parada de muestreo nunca tarda más que el viaje de vuelta oficial (5 % de tolerancia).
- La ruta de polvo no pisa dunas grandes ni celdas por encima de su pendiente máxima.
- Con las dos alertas, la ruta elegida es la más rápida entre las seguras para el polvo.
- Dosis extra = tasa del evento × minutos de regreso.
- Con la alerta en el minuto 0 no hay regreso: es posponer.

**✅ Se considera terminada cuando**
- [x] Desde cualquier punto de la ruta oficial hay un regreso para cada alerta, con minutos y dosis. Ejemplo, plan C en la parada de muestreo: partículas → 38 min y 17,6 µGy; las dos alertas → ruta segura de 63 min y 29,3 µGy (+6,2 min frente a la rápida, 203 m menos de dunas).
- [x] La simulación funciona con teclado (control deslizante y casillas nativos; Esc cierra la vista del astronauta) y en ES/EN. El minuto se elige con el control deslizante; hacer clic en la ruta quedó fuera.
- [x] No bloquea la pantalla: los campos de regreso se preparan una vez en el Worker (unos 2,5 s, no 1 s como se planeó); después, cada consulta tarda milisegundos.
- [x] Todas las pruebas en verde (82/82, con 7 del regreso de emergencia y las de Henry para el campo de tiempo y la línea de vista).

**Commit:** `feat: emergency return routes for dust and solar particle alerts during the EVA`

---

## Fase 5D — Congelamiento de funcionalidades y verificación pública
**Pasos**
1. Actualizar el README: qué hace (regreso de emergencia, alerta medida), supuestos nuevos, referencias de polvo y la parte de Henry en "AI assistance".
2. Publicar y probar la URL pública en una ventana privada:
   - globo → Jezero → plan;
   - escenario de tormenta → posponer;
   - alerta en plena EVA → regreso.
3. Mirar en el móvil que el panel de regreso y la vista del astronauta se lean bien.

**✅ Se considera terminada cuando**
- [x] GitHub Actions en verde y el sitio público actualizado (domingo de madrugada, mucho antes de las 15:00).
- [x] Consola sin errores de la app. Prueba de punta a punta en la URL pública: globo → Jezero → Plan C a las 09:00 → tormenta: NO SALIR → alerta en plena EVA: volver en 38 min. En el móvil (375 px) no hay desplazamiento horizontal.

**Desde aquí no entra código nuevo.** Solo correcciones de errores o de textos, y los supuestos que confirme el equipo de ciencia (se cambian en `config/model-parameters.json`).

**Commit:** `docs: README for the final feature set`

---

## Fase 6 — Demo (7 diapositivas en inglés)
**Objetivo:** subir el criterio **Presentation** (hoy en 1/5).
**Entrada:** funcionalidades congeladas (15:00).

**Guion propuesto (7 diapositivas)**
1. **MARS+:** título, una frase y el enlace al sitio.
2. **El problema:** los datos de Marte están dispersos; la primera tripulación necesita decidir *si* sale, *cuándo* y *qué* alcanza a hacer.
3. **La misión piloto:** Landing → Issole (886 m), indicios de agua, muestras Robine y Malay.
4. **Cómo funciona:** capas de datos NASA → mapa de costo → cadena de 5 filtros → GO / NO-GO con explicación.
5. **Demo:** capturas de la ruta, la grilla de planes y la tormenta medida → NO SALIR. Luego, una alerta de partículas llega en las dunas → MARS+ da el regreso (ruta, minutos, dosis) y la vista del astronauta.
6. **Validez:** paridad <1%, estabilidad a 1–5 m, casos reales (tormenta en los sols 313–317, evento solar del 28-oct-2021), supuestos declarados.
7. **Impacto y siguientes pasos:** cualquier sitio de Marte o la Luna; capas ya prototipadas por Henry (sombras por hora, línea de vista, corredores, rugosidad, inercia térmica); equipo; uso de IA declarado.

**Pasos**
1. *(Claude)* ✅ Textos de cada diapositiva, notas del orador (≈2,7 min), lista de capturas y guion del video de 30 s: [`demo/demo-slides.md`](demo/demo-slides.md).
2. *(Equipo)* Capturas en alta resolución desde la URL pública.
3. *(Claude)* ✅ Presentación armada con capturas reales del sitio público, paleta MARS+, sin logos NASA y con el logo de IA rotulado: https://claude.ai/artifact/VtgRReCm2bEKC9zhxpC9Ac (se exporta a PowerPoint o PDF desde Share › Export). *(Equipo)* Poner los nombres en la diapositiva 7.
4. *(Equipo)* Compartir como "Cualquier persona con el enlace puede ver" y probar el enlace en una ventana privada.
5. *(Opcional)* Video de 30 s con subtítulos en inglés.

**✅ Se considera terminada cuando**
- [ ] Son 7 diapositivas o menos, todas en inglés.
- [ ] El enlace es público y la presentación se cuenta en menos de 3 minutos.

---

## Fase 7 — Formulario de envío y entrega
**Objetivo:** proyecto **enviado** antes de las 21:00.

**Pasos**
1. *(Claude)* Redactar en inglés cada campo:
   - Project Name
   - High-Level Summary
   - Detailed Description
   - NASA Data
   - Space Agency Partner Data & Other References
   - Use of AI (Super Intelligence)
2. *(Equipo)* Confirmar que todos los integrantes aparecen en *Members* y están registrados en el mismo evento local.
3. *(Equipo)* Pegar los textos, los enlaces (demo + proyecto final) y marcar las dos casillas de aceptación.
4. *(Equipo)* Probar ambos enlaces en una ventana privada y **enviar**.
5. *(Opcional)* Solicitar la clasificación FortiGuard del sitio.

**✅ Se considera terminada cuando**
- [ ] El proyecto aparece como enviado en la página del equipo.
- [ ] Ambos enlaces abren sin login.

---

## Fase 8 — Congelamiento y respaldo
**Pasos**
1. Etiqueta `v1.0-envio` y no se publica nada nuevo después.
2. Respaldo local: `.zip` del repositorio (sin `data/`) + capturas + video corto de la app funcionando, por si falla la red durante la presentación.
3. Anotar en `docs/es/` lo aprendido y los pasos posteriores al hackathon: otros sitios, posición real del astronauta (no solo la estimada), DONKI en vivo para las alertas, y las capas de Henry que no entraron (sombras, línea de vista como regla, corredores, rugosidad, inercia térmica).

**✅ Se considera terminada cuando**
- [ ] Existe la etiqueta `v1.0-envio`.
- [ ] El respaldo está guardado.

---

## Reglas generales de ejecución
- **Una fase a la vez.** No se empieza la siguiente sin los ✅ de la anterior.
- **Después de cada fase:** pruebas en `/tests/` → app sin errores → commit → URL pública actualizada.
- **Ante un bloqueo** (cuentas, decisiones científicas), Claude avisa y propone un plan B. No se queda esperando sin decirlo.
- **Lo que nunca se recorta:** fases 5A, 5D, 6, 7 y 8.
- **Orden de recorte si falta tiempo:** mapas de polvo del globo (5B) → vista del astronauta (5C.5) → criterio previo de minutos al hábitat (5C.7) → regreso con las dos alertas a la vez (dejar solo polvo y partículas por separado) → resto de 5B.

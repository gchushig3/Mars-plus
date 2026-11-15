# Martian Map — Datos NASA del trayecto Brac → Issole (Jezero, Séítah Sur)

Reto: NASA Space Apps 2026 — *Interplanetary Survival Guide: Martian Map*
Fecha de la investigación: 14-nov-2026

---

## 0. TRAYECTO AJUSTADO — Octavia E. Butler Landing → Issole → Landing

Fuentes: Bell et al. 2022 (*Sci. Adv.* 8, eabo4856) para el aterrizaje; waypoints MMGIS de la NASA para Issole y la ruta del rover. Las secciones 1 y 2 (más abajo) conservan los datos de Brac solo como antecedente.
Datos geográficos en `data/trayecto_landing_issole.geojson`.

| Punto | Lat (°N) | Lon (°E) | Elev. (m) |
|---|---|---|---|
| **Base — Octavia E. Butler Landing** | 18.4446 | 77.4509 | −2569.9 |
| **Destino — Issole** | 18.43266 | 77.44137 | −2574.4 |

**Landing → Issole en línea recta: 886 m, rumbo 217° (suroeste), 4,5 m de bajada.** Coincide con el dato de "~880 m al suroeste".

> **Decisión del equipo (14-nov-2026):** un solo objetivo científico, **Issole**. Brac ya no se muestrea.

### Trayecto (preliminar, sin costo de terreno todavía)

| Tramo | Distancia | Comentario |
|---|---|---|
| **Ida: Landing → Issole** | 886 m (rumbo 217°) | Cruza el borde norte de Séítah, una zona dominada por ondulaciones de arena: hay que verificarla con el relieve y la ortoimagen |
| **Vuelta: Issole → Landing** | 886 m (rumbo ~37°) | Sube 4,5 m. Se calcula por separado porque la pendiente cambia de signo |
| **Total** | **1.772 m** | |
| Referencia: ruta del rover | 2.814 m | 3,2 veces más larga: el rover dio la vuelta por Máaz, Mure y la cresta Artuby. **No sirve como ruta a pie**, pero sirve para validar |

### Terreno esperado (Bell et al. 2022)
- **Alrededores del aterrizaje (~100 m):** llanura de poco relieve con rocas planas tipo "pavers", de menos de ~30 cm de alto. Fácil de caminar.
- **A más de 100 m:** cúmulos de bloques oscuros y crestas bajas de **1 a 3 m de alto**. Son obstáculos que hay que rodear.
- **Formas eólicas:** dunas de varios metros de largo y hasta ~20 cm de alto, con ondulaciones que cubren parte de las rocas.
- **Séítah:** paisaje "dominado por ondulaciones" de arena (Fig. 5). Es el tramo crítico de la ruta A.

### Presupuesto de tiempo (escenario de referencia, se ajustará con el modelo)
Supuestos: caminata con traje a **1,5–3 km/h** y radiación de **0,64 mSv/día** (RAD de Curiosity, ≈ 0,027 mSv/h).

| | Landing ↔ Issole |
|---|---|
| Tiempo caminando (ida + vuelta) | 35–71 min |
| Con 90 min de trabajo + 15 min de reserva | ~2,3–3,0 h |
| Dosis estimada de la salida | ~0,06–0,08 mSv |

### Datos obtenidos de los servidores de la NASA (api.nasa.gov / Mars Trek)

**Capas de mapa listas para la web (WMTS de Mars Trek, JPL):**

| Capa | Layer ID | Resolución | Uso |
|---|---|---|---|
| HiRISE Jezero, controlado | `JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd` | 25 cm | Mapa base y detección de rocas y arena. **Cubre todo el trayecto** (bbox 77.22–77.58 °E, 18.31–18.67 °N; 18 niveles de zoom) |
| CTX Jezero, controlado | `JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0` | 6 m | Vista de contexto al alejar el zoom |
| THEMIS IR día / noche | `THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018` / `..._NightIR_...` | 100 m | Contexto térmico (roca vs. material fino) |
| TES inercia térmica | `TES_Thermal_Inertia` | Global, baja resolución | Contexto regional |

Plantilla de teselas: `https://trek.nasa.gov/tiles/Mars/EQ/{LayerID}/1.0.0/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png` (valores en `WMTSCapabilities.xml` de cada capa).
**Lo que no hay en Mars Trek:** un DTM de Jezero. El relieve de 1 m hay que bajarlo de USGS.

**Panorámicas del rover (MMGIS, NASA):**
- Landing (sol 12): `https://mars.nasa.gov/mmgis-maps/M20/Layers/mosaics/N_LRGB_0012XRAS_0030000_CYL_S_AUTOGENJ01.jpg`
- Issole (sol 286): `.../N_LRGB_0286_RAS_0090000_CYL_S_AUTOGENJ05.jpg`. Hay más de los sols 328, 333 y 335.
- ⚠️ El servidor respondió 403 a una petición directa. Falta comprobar si cargan desde el navegador o si hay que tomarlas de la galería de imágenes en bruto de la NASA.

**Clima espacial (DONKI, api.nasa.gov):**
- Eventos de partículas solares (SEP) medidos cerca de la Tierra entre el 18-feb-2021 y el 14-dic-2021: **13 registros**. El más fuerte fue el del **28-oct-2021** (GOES >100 MeV, SOHO, STEREO-A), ocurrido mientras el rover estaba en Séítah. Sirve como escenario de estrés para la app.
- Del 15-dic-2021 al 5-feb-2022 (estadía en Issole) no se pudo consultar: el límite de la clave pública `DEMO_KEY` se agotó. **Hace falta una clave gratuita propia de api.nasa.gov.**
- Últimos 60 días (a 14-nov-2026): 1 evento SEP y 1 CME rápida (>800 km/s). Sirve para el panel "condiciones actuales".
- ⚠️ DONKI mide sobre todo desde la Tierra. Para Marte se usa como **alerta** ("hay una tormenta solar en curso, evaluar si conviene posponer"), no como dosis medida en Jezero.

**APIs que ya no sirven para este proyecto:**
- *Mars Rover Photos*: ya no aparece en el catálogo de api.nasa.gov.
- *InSight Weather*: misión terminada y en otra región (Elysium). Para el clima de Jezero se usa MEDA del PDS.

### Próximo paso del cálculo
La ruta final de menor costo necesita el DTM de 1 m y la ortoimagen de 25 cm de HiRISE (USGS) recortados a la zona: ~1,2 × 1,2 km alrededor de Landing–Issole. Con eso:
cuadrícula de 2 m → A* ida y vuelta por separado → revisión del corredor a 1 m → prueba de estabilidad a 5 m.

---

## 1. Los dos puntos, verificados con datos reales del rover

Fuente: capa oficial de waypoints de Perseverance (MMGIS de la NASA)
`https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json`

| Punto | Waypoint NASA | Sol | Lat (°N) | Lon (°E) | Elevación (m, geoide) |
|---|---|---|---|---|---|
| **A — Brac** (afloramiento) | Site 8, Drive 0 | 248 | 18.43396 | 77.44302 | −2569.2 |
| **B — Issole** (afloramiento) | Site 9, Drive 0 | 286 | 18.43266 | 77.44137 | −2574.4 |

- **Distancia en línea recta:** ~120 m
- **Desnivel:** ~5,3 m de bajada (A → B)
- **Ruta que hizo el rover:** 153 m en 6 tramos (sols 278–286). Es una ruta real que ya se recorrió sin problemas, así que sirve como **línea base** para comparar nuestra ruta "óptima".

Paradas intermedias del rover (para dibujar su ruta en el mapa):

| Waypoint | Sol | Lat | Lon | Elev (m) | Tramo (m) |
|---|---|---|---|---|---|
| 8_0 | 248 | 18.43396406 | 77.44301922 | −2569.15 | — |
| 8_64 | 278 | 18.43392588 | 77.44305879 | −2568.71 | 6.3 |
| 8_256 | 280 | 18.43387500 | 77.44243517 | −2572.03 | 36.3 |
| 8_410 | 281 | 18.43344178 | 77.44202480 | −2574.43 | 36.3 |
| 8_458 | 283 | 18.43346150 | 77.44208113 | −2574.30 | 4.0 |
| 8_734 | 285 | 18.43277064 | 77.44144813 | −2574.90 | 62.5 |
| 9_0 | 286 | 18.43266059 | 77.44137302 | −2574.44 | 8.0 |

> ⚠️ **Corrección importante:** Brac **no es el sitio de aterrizaje**. Es un afloramiento de Séítah Sur.
> El aterrizaje fue en *Octavia E. Butler Landing* (~18.4447 °N, 77.4508 °E), a ~2,7 km de recorrido del rover antes de llegar a Brac.

---

## 2. Qué se sabe de cada afloramiento (y por qué importan)

### Brac — el "otro afloramiento" que querían documentar
- **Abrasión "Dourbes"** (sol 253, 5-nov-2021): parche de ~5 cm analizado con SuperCam, Mastcam-Z, PIXL y SHERLOC.
- **Muestras "Salette" y "Coulettes"** (5.ª y 6.ª muestras de la misión, sol ~271). Coulettes quedó en el depósito de muestras Three Forks.
- **Roca:** ígnea de la formación Séítah, un cumulado rico en **olivino**.

### Issole — destino de la misión
- **Muestras "Robine" (sol 298) y "Malay" (sol 337)**, la 6.ª y 7.ª según el catálogo NASA de muestras.
- **Roca:** cumulado de olivino con augita y plagioclasa.
- **Indicios de agua:** alteración leve con **carbonatos y sulfatos hidratados**. En el parche de abrasión se vio un cristal grande de sulfato (el "oso polar").
- El primer intento de muestreo falló porque unos guijarros se trabaron en el carrusel. El rover se movió 13,5 m a otro punto. **Esto es útil para la historia de la app:** el terreno local cambia y conviene tener puntos de muestreo alternativos.

**Lectura científica para la misión:** Séítah es probablemente la unidad más antigua del fondo del cráter. Los carbonatos y sulfatos indican que la roca tuvo contacto con agua después de formarse. Ese es exactamente el objetivo "documentar indicios de alteración por agua".

---

## 3. Capas de datos NASA disponibles para el trayecto

El reto pide **al menos 3 tipos de datos**. Estos son los que cubren esta zona:

| Tipo | Dataset | Resolución | Uso en la app |
|---|---|---|---|
| **Óptico** | Ortomosaico HiRISE (Mars 2020 TRN, USGS) | ~25 cm/px | Mapa base |
| **Topográfico** | DTM HiRISE (Mars 2020 TRN, USGS) | ~1 m/px | Pendiente y desnivel → costo de la ruta |
| **Topográfico (más fino)** | DTM refinado de Jezero (Earth & Space Science, 2023) | 50 cm/px | Detalle de obstáculos |
| **Clases de terreno** | NOAH-H (clasificación por IA de HiRISE, imagen ESP_042315_1985) | 25 cm/px | Arena, ondulaciones, roca fracturada → zonas a evitar |
| **Espectral (minerales)** | CRISM: mapas de olivino y carbonato (Brown et al. 2020) | ~18 m/px | Dónde hay minerales de interés |
| **Atmosférico / térmico** | MEDA de Perseverance (PDS Atmospheres, DOI 10.17189/1522849) | Por hora, en el rover | Temperatura, viento y polvo → mejor hora para salir |
| **Radiación** | RAD de Curiosity (cráter Gale) | Diario | Dosis de referencia en superficie |
| **Ruta y fotos del rover** | Waypoints y traverse MMGIS (M20) | Puntos | Ruta base, ubicación de muestras, panorámicas por parada |
| **Imágenes en superficie** | Navcam / Mastcam-Z por sol | — | "Lo que verás al llegar" en cada parada |

**Datos de radiación de referencia (RAD):**
- Superficie de Marte: **~0,64 mSv/día** (sobre todo rayos cósmicos galácticos)
- Crucero a Marte: ~1,84 mSv/día
- Las tormentas solares (SPE) son la gran incógnita; en superficie se ha observado una sola y débil.

---

## 4. Cómo calcular "la mejor ruta" (menos esfuerzo, menos exposición)

Algoritmo propuesto: **A\* (o Dijkstra) sobre una cuadrícula de costos** construida con las capas anteriores.

Costo de cada celda =
- **Pendiente** (del DTM): esfuerzo metabólico al caminar con traje. Penaliza mucho las pendientes de más de ~15°.
- **Tipo de terreno** (NOAH-H): arena u ondulaciones = muy caro o prohibido; roca plana = barato.
- **Rugosidad y obstáculos**: rocas grandes = prohibido.
- **Tiempo de exposición**: a esta escala la radiación casi no cambia de un lugar a otro, así que **menos tiempo afuera = menos dosis**.

Resultado que muestra la app:
- Ruta óptima vs. ruta real del rover
- Distancia, desnivel, tiempo estimado caminando y dosis estimada de radiación
- Paradas de muestreo (Brac → Issole) con fotos del rover en cada una

---

## 5. Fuentes

- Waypoints Perseverance (MMGIS NASA): https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json
- Robine y Malay (JPL): https://jpl.nasa.gov/videos/meet-the-mars-samples-robine-and-malay-samples-6-and-7
- Catálogo de muestras NASA: https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples
- Contexto geológico de las muestras (Herd et al. 2025): https://authors.library.caltech.edu/records/jq5a7-x1736
- Dourbes / Brac (JPL PIA24940): https://www.jpl.nasa.gov/images/pia24940-watsons-view-of-dourbes-in-mars-jezero-crater/
- Campaña del fondo del cráter (NTRS): https://ntrs.nasa.gov/api/citations/20220000501/downloads/Sun_Hand_Crater_Floor_Campaign_LPSC_final.pdf
- DTM HiRISE Mars 2020 TRN (USGS): https://astrogeology.usgs.gov/search/map/mars-sample-return-terrain-relative-navigation-hirise-dtm-mosaic
- Mapeo geológico de Jezero (Crumpler et al. 2023): https://ntrs.nasa.gov/api/citations/20230016438/downloads/Crumpler%20et%20al%202023%20JGR%20Planets%20Mapping%20of%20Jezero.pdf
- Cumulado de Séítah (Beyssac et al. 2023): https://ntrs.nasa.gov/api/citations/20230016432/downloads/Beyssac%20et%20al%202023%20JGR%20Planets%20Seitah%20Cumulate.pdf
- Mineralogía olivino-carbonato CRISM (Brown et al.): https://arxiv.org/pdf/1904.11414
- MEDA en PDS: https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html
- Radiación RAD: https://science.nasa.gov/resource/radiation-measurements-on-mars
- Séítah Sur / Bastide (blog NASA): https://science.nasa.gov/missions/mars-2020-perseverance/on-the-road-again-perseverance-heads-to-south-sc3a9c3adtah-3/

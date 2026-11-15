# Auditoría del proyecto Martian Map — inicio de la fase de desarrollo

**Proyecto:** Martian Map · piloto de EVA Octavia E. Butler Landing ↔ Issole (cráter Jezero)
**Reto:** NASA Space Apps 2026 — *Interplanetary Survival Guide: Martian Map*
**Fecha:** sábado 14-nov-2026, ~19:45 hora local
**Alcance:** toda la carpeta `Desktop/martian-map`, más las reglas oficiales del reto, la *Judging & Awards Guide* y la *Project Submission Guide* de Space Apps 2026

---

## 0. Veredicto

> **Listo para desarrollar, con condiciones.** Los datos y el motor de cálculo son sólidos y están por encima de lo que pide el reto. Pero **la página web todavía muestra el modelo viejo**, y **no está cubierto ningún requisito formal de entrega**: enlace público, demo, materiales en inglés y declaración de uso de IA.
>
> ⏰ **Plazo: domingo 15-nov a las 23:59, hora local del evento.** Quedan ~28 h de calendario y ~20 h de trabajo efectivo. El plan de la sección 6 está ajustado a eso.

| Área | Estado | En una línea |
|---|---|---|
| Alineación con el reto | 🟢 | Cumple todos los objetivos obligatorios del enunciado |
| Datos NASA | 🟢 | 8 tipos de datos reales, integrados y alineados en la misma proyección |
| Validez científica del modelo | 🟡 | Funciona y es estable, pero 4 supuestos no están calibrados |
| Código y arquitectura | 🟡 | Dos motores conviven, sin pruebas automáticas, herramientas solo para Windows |
| Producto web | 🔴 | `index.html` usa el motor v1 y el clima de un solo día; no integra los filtros |
| Requisitos de entrega | 🔴 | Sin enlace público, demo, inglés ni declaración de IA |
| Seguridad y operación | 🟠 | Sin control de versiones; dos sesiones de Claude editan la misma carpeta |
| Documentación | 🟡 | 6 documentos que se repiten y en parte están desactualizados |

**Las 5 acciones antes de escribir más código:**
1. Iniciar `git` y crear el `.gitignore` (H29, H23).
2. Dejar **una sola sesión** trabajando en la carpeta (H28).
3. Integrar el motor v2 y la cadena de filtros en `index.html` (H05).
4. Decidir el **hosting** del enlace público y el **formato de la demo** (H01, H02).
5. Escribir en inglés el README, el resumen y la declaración de IA (H03, H04).

---

## 1. Alcance y método

**Qué se revisó:**
- 16 scripts (PowerShell y C#), 3 archivos web, 10 archivos de datos para la web, 6 documentos.
- 2,1 GB de datos en 13 carpetas.
- Las reglas oficiales del reto.

**Qué se ejecutó:**
- Inventario con tamaños y fechas.
- Comprobación de integridad: sin datos faltantes en el DTM ni en la ortoimagen, cobertura de MEDA y RAD, archivos vacíos.
- Consistencia entre la web y los datos.
- La prueba del motor de planes con 6 escenarios (`web/prueba_motor.html`, todos pasaron).
- Lectura de los requisitos oficiales de entrega y evaluación.

**Qué no se auditó:** el registro del equipo en la plataforma de Space Apps (solo el equipo puede verlo) y la calidad visual final, porque la página se va a rediseñar.

---

## 2. Cumplimiento

### 2.1 Objetivos del reto
| Pide el reto | Estado | Evidencia |
|---|---|---|
| Mapa o herramienta para un astronauta en una caminata, con datos NASA | ✅ | Página de planificación en el hábitat + motor de rutas y planes |
| Objetivo científico + lugar | ✅ | Indicios de agua en Issole (carbonatos y sulfatos; muestras Robine y Malay) |
| Lugar bien explorado por un rover | ✅ | Perseverance estuvo en Issole los sols 286–339 |
| ≥3 tipos de datos en capas | ✅ | Óptico, topográfico, térmico, geológico, atmosférico, radiación, imágenes de superficie y ruta del rover |
| Seguridad: radiación y clima espacial | ✅ | RAD real del evento del 28-oct-2021 + alerta de evento solar |
| Movilidad con traje; ruta que evite obstáculos | ✅ | Motor v2: pendiente + arena + rocas |
| Vista hiperlocal (lo que no ofrece Mars Trek) | ✅ | Cuadrícula de 2 m en ~1 km² |
| *Opcional:* fotos desde el suelo | 🟡 | 477 imágenes descargadas, **todavía no se muestran en la web** |
| *Opcional:* pareja o rover de apoyo; estilo del mapa de Curiosity | ⏭️ | Fuera del alcance por decisión del equipo |

### 2.2 Criterios de evaluación (escala 1–5, *Judging & Awards Guide*)
| Criterio | Hoy (estimado) | Meta | Qué sube la nota |
|---|---|---|---|
| **Impact** | 3 | 4 | Contar el problema real (las primeras tripulaciones necesitan decidir *si* salen, *cuándo* y *qué* alcanzan a hacer) y mostrar que el motor sirve para cualquier sitio |
| **Creativity** | 4 | 4–5 | La cadena de filtros que **explica por qué no** se puede hacer un plan, y los planes A/B/C |
| **Validity** | 3 | 4 | Panel de supuestos visible, prueba de sensibilidad (arena), comparación con la ruta real del rover, fotos que validen las paradas |
| **Relevance** | 5 | 5 | Los datos NASA son el centro del proyecto: hay que nombrarlos uno por uno en la web y en el formulario |
| **Presentation** | 1 | 4 | **No existe la demo todavía.** La guía dice que pesa tanto como los otros criterios |

### 2.3 Requisitos de entrega (*Project Submission Guide*)
| Requisito | Estado | Acción |
|---|---|---|
| Responder a un reto oficial | ✅ | — |
| Integrantes registrados en el **mismo evento local**, máximo 6 | ❓ | **El equipo debe verificarlo** en la pestaña *Members* |
| Project Name | ❌ | Propuesta: *Martian Map — Issole EVA Planner* |
| High-Level Project Summary (EN) | ❌ | Redactarlo (Sprint 5) |
| **Demo:** ≤7 diapositivas **o** video de ≤30 s, en inglés (o con subtítulos en inglés), con **enlace público** | ❌ | Sprint 4 |
| **Enlace público al proyecto final**, sin login | ❌ | Hoy solo existe `localhost` → Sprint 3 |
| Detailed Project Description (EN) | ❌ | Sprint 5 |
| **Uso de IA ("Super Intelligence")**: indicar dónde y cómo se usó. Código y datos deben reconocerlo en **texto descriptivo y metadatos**. La IA **no** debe usarse para idear la solución | ❌ | README + encabezados de los scripts + campo del formulario. Dejar constancia de que la idea (ruta de menor esfuerzo hacia Issole, objetivo de agua) la definió el equipo (H04) |
| Campo NASA Data | 🟡 | La lista ya existe en el informe; falta pasarla al inglés |
| References: **todo** recurso externo (código, texto, imágenes, aunque sea abierto) | ❌ | Leaflet, IBM Plex, artículos, datasets, imágenes del rover (H26) |
| Inglés en la página de envío y en todo material enlazado | ❌ | La web ya es bilingüe ✅; los documentos están en español |
| Sin logos ni marca NASA en contenido generado | ✅ | La web no usa logos. Mantenerlo así en la demo |
| Recomendado: clasificación FortiGuard del sitio nuevo | ⏳ | Opcional, tras publicar |

---

## 3. Inventario (2,1 GB en total)

| Bloque | Contenido | Tamaño | ¿Hace falta para la web? |
|---|---|---|---|
| `web/` | `index.html` (v1), `prueba_motor.html`, `js/motor_planes.js`, `data/*.js` y `*.png` | 0,6 MB | ✅ todo |
| `scripts/` | 16 scripts: descarga, procesamiento, motores v1 y v2, servidor | 0,1 MB | Solo para regenerar |
| `data/` procesados | DTM 1 m, ortoimagen 25 cm, rocas, geología raster, rutas v1/v2 | ~30 MB | No (ya exportados a `web/data`) |
| `data/meda` | 204 CSV crudos + resúmenes | 666 MB | No |
| `data/rad` | 15 días de RDR crudos + CSV | 979 MB | No |
| `data/geologia` | Stack 2020 (shapefile, TIF, PDF) + **SIM 3464 (351 MB, descartado en D3)** | 391 MB | No |
| `data/imagenes_issole` | Índice de 23.535 imágenes + 477 JPG | 22,5 MB | Parcial (fotos de las paradas) |
| `data/hirise_z17` | Teselas Trek (intento de detectar rocas, descartado) | 6 MB | No |
| Documentos | requisitos, investigación, catálogo, informe, LEEME y esta auditoría | <0,1 MB | No |

---

## 4. Hallazgos

Severidad: 🔴 bloquea la entrega · 🟠 alto · 🟡 medio · ⚪ bajo.

### A. Producto y entrega
| ID | Sev. | Hallazgo | Evidencia | Recomendación |
|---|---|---|---|---|
| H01 | 🔴 | No hay enlace público | Solo se sirve en `localhost:8765/8766` | Publicar `web/` (0,6 MB) en GitHub Pages o Netlify + repositorio público. Probar el enlace en una ventana privada |
| H02 | 🔴 | No hay demo | — | **7 diapositivas en inglés** (más rápido y controlable que un video) con capturas de la web, o un video de 30 s con subtítulos |
| H03 | 🔴 | Materiales en español | Los 6 documentos | Los materiales para jueces en inglés (README, resumen, descripción, demo). Los documentos internos pueden seguir en español |
| H04 | 🔴 | Falta la declaración de uso de IA | El código y el procesamiento se hicieron con asistencia de IA (Claude) | Sección *AI assistance* en el README, encabezado en cada script y campo del formulario |
| H05 | 🟠 | **La web muestra el modelo viejo** | `index.html` carga `rutas.js` (v1: 22,5 min, sin arena ni rocas) y `meda_issole.js` (1 sol). No usa `rutas_v2.js`, `geologia.js`, `costo_2m.png`, `meda_tipico.js`, `rad_oct2021.js` ni `motor_planes.js` | Integrar todo (Sprint 1). Hoy la web dice que el Plan A cabe en 155 min; con el modelo actual son **184 min** y no cabe en el límite de 180 |
| H06 | 🟠 | La demo depende de internet | Leaflet y fuentes desde CDN; teselas de Mars Trek en vivo | Probar desde otra red; grabar capturas de respaldo |

### B. Validez científica
| ID | Sev. | Hallazgo | Recomendación |
|---|---|---|---|
| H07 | 🟠 | La velocidad de caminata (Tobler × 0,5 ≈ 2,5 km/h en llano) es un supuesto, no está calibrada para traje y 0,38 g | Mostrarla como **rango** (lento, normal, rápido; el motor ya tiene `ritmo`) y explicarla en un panel de supuestos |
| H08 | 🟠 | La detección de rocas no está validada: umbral 65%, ventana de 5 m y bloqueo del 12% se eligieron sin comparar con la realidad. Solo ve rocas de ≳0,75 m | Comparar con 2–3 fotos Navcam/Hazcam de tramos que el rover recorrió (sols 278–286) y declararlo como límite |
| H09 | 🟡 | La penalización de la arena (×2) viene de estudios en la Tierra (Lejeune 1998), sin traje y con 1 g | **Prueba de sensibilidad** (×1,5, ×2, ×3): mostrar si cambian la ruta o el plan recomendado. Es un argumento fuerte de validez |
| H10 | 🟡 | **Dos series de radiación que no coinciden**: detector E (fondo 11,9 µGy/h, pico 27,9) y detector B (10,9 y 28,4, generado por otra sesión). Además, Curiosity está en Gale, un sitio más bajo que Jezero y con más atmósfera encima | Usar **una sola** convención (recomiendo E, de plástico, más parecido al tejido humano), borrar el duplicado y aclarar que la dosis en Jezero sería algo mayor |
| H11 | 🟡 | La temperatura del suelo sale de la irradiancia infrarroja suponiendo emisividad 0,99 | Comparar con temperaturas de suelo publicadas para Jezero (equipo MEDA) |
| H12 | 🟡 | La tormenta de polvo es una alerta manual; la opacidad no está integrada | Aceptable en el piloto. Si sobra tiempo, usar la opacidad de Mastcam-Z o SkyCam (Lemmon et al. 2022) |
| H13 | 🟡 | Las paradas usan la posición del **centro del rover** (el brazo trabaja ~2 m adelante) y quedan a ~3 m entre sí | Confirmarlas con las fotos de los sols 293, 298 y 337. Poner el punto de observación a unos metros, con vista de todo el afloramiento |
| H14 | ⚪ | Cada plan se evalúa completo: no se revisa en cada tramo que el regreso siga garantizado | Declararlo como límite del piloto |
| H15 | ⚪ | La inercia térmica se descargó pero no se usa ni se muestra | Mostrarla como capa de contexto, o no listarla como "usada" |
| H16 | ⚪ | Las salidas solo se evalúan en horas enteras | Suficiente para la demo |

### C. Código y arquitectura
| ID | Sev. | Hallazgo | Recomendación |
|---|---|---|---|
| H17 | 🟠 | Las herramientas solo funcionan en Windows (PowerShell 5.1 + C#); esta computadora no tiene Python ni Node | Para el hackathon se mantiene, porque **el producto final es HTML/JS estático y portable**. Documentar cómo regenerar los datos |
| H18 | 🟡 | PowerShell no distingue mayúsculas en los nombres de variables. Esto causó **5 fallos** en esta sesión (`$H/$h`, `$R/$r`, `$T/$t`, `$W/$w`, `$P/$p`) | Usar nombres que no choquen y `Set-StrictMode -Version Latest` |
| H19 | 🟡 | Hay código y datos obsoletos mezclados con los actuales: `ruta_motor.cs`, `calcular_rutas.ps1`, `rutas.js`, `pendiente_2m.png`, `sombras_rocas_1m.bin`, `descargar_hirise_tiles.ps1`, `data/hirise_z17/` | Moverlos a `archivo/` después de integrar el v2 |
| H20 | 🟡 | No hay pruebas automáticas; `prueba_motor.html` se revisa a mano | Convertir los 6 escenarios en comprobaciones de pasa/falla |
| H21 | ⚪ | Los datos se cargan como variables globales de JS (`var RUTAS_V2 = …`) | Aceptable: funciona sin servidor y pesa poco |
| H22 | ⚪ | `servidor.ps1` revisa la ruta con `StartsWith` sin separador final | Es solo local y de desarrollo. No usarlo en producción |

### D. Datos
| ID | Sev. | Hallazgo | Recomendación |
|---|---|---|---|
| H23 | 🟠 | 2,1 GB en la carpeta del proyecto; ~2 GB son crudos o descartados | Separar `data/raw/` (fuera de git) y `data/processed/` (en git). El repositorio queda en <50 MB |
| H24 | 🟡 | Duplicados y archivos vacíos: `rad_dosis_oct2021.csv` en dos lugares con columnas distintas; `donki_sep_mision_2021_2022.json` (0 bytes); `sim3464_metadata.txt` y `sim3464_readme.txt` (0 bytes); falta la presión del sol 331; 10 imágenes fallaron | Limpiar en la preparación |
| H25 | 🟡 | No hay un manifiesto de procedencia por archivo (URL, fecha, licencia) | Crear `data/MANIFEST.md`. Es útil para el campo References y para la validez |
| H26 | 🟡 | Licencias a confirmar o atribuir: Stack 2020 (CC BY 4.0 según la errata), inercia térmica de Zenodo (licencia no verificada), Leaflet (BSD-2), IBM Plex (OFL), crédito HiRISE "NASA/JPL/University of Arizona" | Incluir todo en References; verificar la licencia del registro de Zenodo |
| H27 | ⚪ | DONKI está incompleto porque falta la clave | Mitigado: RAD aporta la medición real en Marte |

### E. Seguridad y operación
| ID | Sev. | Hallazgo | Recomendación |
|---|---|---|---|
| H28 | 🟠 | **Dos sesiones de Claude trabajan en la misma carpeta.** La otra descargó SIM 3464 (contra la decisión D3), creó `resumir_rad.ps1` con otra convención (detector B) y modificó `catalogo-datos.md` y `resumir_meda.ps1` | Que una sola sesión sea dueña del proyecto, o que cada una trabaje en archivos distintos |
| H29 | 🟠 | No hay control de versiones | `git init` + commit base **antes** de desarrollar |
| H30 | 🟡 | No hay `.gitignore` ni manejo de la clave. **Si la clave de la NASA se pone en el JavaScript del navegador, queda pública** | Usar la clave solo en scripts, generar JSON estáticos y dejar `.env` en el `.gitignore` |

### F. Documentación
| ID | Sev. | Hallazgo | Recomendación |
|---|---|---|---|
| H31 | 🟡 | Documentos que se repiten y en parte están desactualizados:<br>• `investigacion-datos-ruta.md` aún habla de Brac y de las rutas A/B v1<br>• `requisitos-piloto.md` dice "no publicar", y el envío **exige** un enlace público<br>• En `catalogo-datos.md` la "prioridad de descarga" ya se cumplió<br>• `LEEME.md` trae la tabla de resultados v1 | Un `README.md` en inglés para los jueces + `docs/` en español para el equipo. Los documentos viejos se marcan como "histórico" |

---

## 5. Riesgos principales
| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| No llegar al plazo con todo | Media | Muy alto | **Publicar primero algo completo, mejorar después.** Envío preliminar el domingo antes de las 18:00 |
| La demo no se ve bien (Presentation = 1) | Alta si no se planifica | Alto | Reservar 4 h para la demo, con un guion de 7 diapositivas |
| Un juez no puede abrir el enlace | Baja | Muy alto | Hosting estático, enlace probado en ventana privada, clasificación FortiGuard |
| Sobrescrituras entre sesiones | Media | Alto | Git + una sola sesión |
| Un juez cuestiona supuestos (velocidad, arena, rocas) | Media | Medio | Panel de supuestos + sensibilidad + límites declarados |
| Incumplir la regla de IA | Baja | Alto | Declaración explícita en README, código y formulario |

---

## 6. Plan de la fase de desarrollo (~20 h hasta el domingo a las 23:59)

**Principio:** primero un producto **completo y publicado**, después las mejoras. Ninguna tarea "Could" empieza antes de que el envío preliminar exista.

| Bloque | Cuándo (sugerido) | Horas | Resultado |
|---|---|---|---|
| **0 · Preparación** | Sábado noche | 1 | git, `.gitignore`, `data/raw`/`processed`, limpieza (H24), una sola sesión |
| **1 · Producto integrado** | Sábado noche → domingo mañana | 6 | `index.html` v2 con todos los datos y la cadena de filtros |
| **2 · Validez** | Domingo mañana | 3 | Sensibilidad, comparación con el rover, fotos en las paradas, panel de supuestos |
| **3 · Publicación** | Domingo mediodía | 2 | Repositorio + sitio público + README en inglés + References + declaración de IA |
| **4 · Demo** | Domingo tarde | 4 | 7 diapositivas en inglés (o video de 30 s con subtítulos) |
| **5 · Envío** | Domingo, antes de las 21:00 | 2 | Formulario completo, enlaces probados, **enviado con 3 h de margen** |
| Margen | — | 2 | Imprevistos |

### Backlog priorizado
| ID | Tarea | Bloque | h | Prioridad | Criterio de aceptación | Quién |
|---|---|---|---|---|---|---|
| D01 | `git init`, `.gitignore`, estructura de datos, limpieza de duplicados | 0 | 1 | Must | Repositorio <50 MB y commit base hecho | Claude |
| D02 | Capas v2 en el mapa: costo, geología, rutas v2 (ida y vuelta), paradas | 1 | 1,5 | Must | Se ven y se alinean con HiRISE | Claude |
| D03 | Panel de planes con `motor_planes.js`: escenario, límite, ritmo, tareas, alertas | 1 | 2 | Must | Reproduce los 6 escenarios de la prueba | Claude |
| D04 | Clima con día típico, peor caso y tormenta; radiación con la gráfica del evento del 28-oct | 1 | 1,5 | Must | Gráficas con su fuente; el escenario cambia la recomendación | Claude |
| D05 | Pruebas automáticas de los 6 escenarios | 1 | 0,5 | Must | Página de pruebas que muestra "6/6 OK" | Claude |
| D06 | Textos en inglés de toda la interfaz nueva | 1 | 0,5 | Must | Cambiar a EN no deja textos en español | Claude |
| D07 | Panel de **supuestos y límites** | 2 | 0,5 | Must | Lista cada supuesto con su fuente | Claude + ciencia |
| D08 | Sensibilidad de la arena (×1,5, ×2, ×3) | 2 | 1 | Should | Tabla o selector que muestra el efecto en ruta y plan | Claude |
| D09 | Fotos del rover en las paradas ("qué verás al llegar") | 2 | 1 | Should | Ventanas con 1–2 fotos con crédito NASA/JPL-Caltech | Claude + equipo elige fotos |
| D10 | Confirmar las paradas con las imágenes de los sols 293, 298 y 337 | 2 | 0,5 | Should | Las paradas se ajustan o se confirman | Equipo de ciencia |
| D11 | Repositorio público + Pages/Netlify | 3 | 1 | Must | El enlace abre sin login en una ventana privada | Claude + cuenta del equipo |
| D12 | README en inglés: qué es, cómo funciona, datos, References, *AI assistance* | 3 | 1 | Must | Cubre los campos del formulario | Claude, revisa el equipo |
| D13 | Guion y diapositivas de la demo (7) | 4 | 3 | Must | Problema → solución → datos → demo → validez → impacto → equipo | Equipo de pitch + Claude |
| D14 | Capturas o video de la web para la demo | 4 | 1 | Must | Capturas en alta resolución, sin logos NASA | Equipo |
| D15 | Formulario: resumen, descripción, NASA Data, References, IA | 5 | 1,5 | Must | Todos los campos llenos en inglés | Equipo + Claude |
| D16 | Revisión final y envío | 5 | 0,5 | Must | Enviado antes de las 21:00 | Equipo |
| D17 | Completar DONKI con la clave | — | 0,5 | Could | JSON estático generado con la clave fuera del navegador | Claude |
| D18 | Opacidad del polvo, teselas offline, PIXL/SHERLOC | — | — | Won't (ahora) | — | — |

### Definición de "terminado"
1. Funciona en Chrome y Edge desde el enlace público, sin errores en la consola.
2. Todo texto visible existe en ES y EN.
3. Cada número que se muestra tiene su fuente o supuesto en el panel de supuestos.
4. Las pruebas de escenarios dan 6/6.
5. Hay un commit en git con un mensaje que lo describe.

### Si falta tiempo, se recorta en este orden
D17 → D08 → D09 → D10. **Nunca** se recortan D11–D16 (publicación, demo y envío).

---

## 7. Checklist para arrancar hoy

- [ ] **Equipo:** cerrar o pausar la otra sesión de Claude que trabaja en esta carpeta (H28).
- [ ] **Equipo:** verificar que todos los integrantes estén registrados en el mismo evento local y aparezcan en *Members*.
- [ ] **Equipo:** elegir el hosting: **GitHub Pages** (pide cuenta de GitHub) o **Netlify** (pide cuenta de Netlify).
- [ ] **Equipo:** elegir el formato de la demo: **7 diapositivas** (recomendado) o video de 30 s.
- [ ] **Equipo:** confirmar el nombre del proyecto.
- [ ] **Equipo (opcional):** la clave de api.nasa.gov en `martian-map/.env`.
- [ ] **Claude:** bloque 0 (git, `.gitignore`, limpieza) y luego el bloque 1.

---

### Fuentes de los requisitos
- Detalle del reto: https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/?tab=details
- Recursos del reto: https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/?tab=resources
- Judging & Awards Guide: https://www.spaceappschallenge.org/resources/judging-awards-guide/
- Project Submission Guide: https://www.spaceappschallenge.org/resources/project-submission-guide/

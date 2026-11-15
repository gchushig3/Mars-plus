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
| 5 | Globo 3D y transición | Could | 2 h | Claude | ⏳ Solo si se llega a tiempo |
| 6 | Demo (7 diapositivas en inglés) | **Must** | 3 h | Equipo de pitch + Claude | ⏳ |
| 7 | Formulario de envío y entrega | **Must** | 1,5 h | Equipo + Claude | ⏳ |
| 8 | Congelamiento y respaldo | Must | 0,5 h | Equipo + Claude | ⏳ |

**Total pendiente:** ~14 h (12 h sin la Fase 5).

### Calendario sugerido y puntos de decisión
| Cuándo | Fases | Punto de decisión |
|---|---|---|
| Sábado 21:00–23:30 | 1 → 2 | **Al final del sábado, la URL pública tiene que funcionar.** Si no hay cuentas, se publica con Netlify Drop |
| Domingo 08:00–11:00 | 3 | — |
| Domingo 11:00–13:00 | 4 | **13:00 · ¿Fase 5?** Solo si las fases 1–4 están ✅. Si no, se salta |
| Domingo 13:00–15:00 | 5 (opcional) | **15:00 · se congelan las funcionalidades** |
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

## Fase 5 — Globo 3D y transición (opcional)
**Puerta:** solo si a las **13:00 del domingo** las fases 1–4 están ✅. Si no, **se salta sin culpa**.

**Pasos**
1. Fijar la versión de CesiumJS (CDN + SRI). Configurar Marte como elipsoide propio, sin Cesium ion.
2. Imagen global de Marte (Viking, Mars Trek) + marcador de Jezero.
3. Clic en Jezero → vuelo de cámara → transición al mapa local (estados GLOBE → TRANSITION → LOCAL).
4. **Respaldo:** si Cesium falla o el dispositivo es lento, la app arranca directo en LOCAL.
5. Botón "Ver Marte" para volver al globo.

**✅ Se considera terminada cuando**
- [ ] La transición es fluida en escritorio.
- [ ] El respaldo funciona (se prueba bloqueando Cesium).
- [ ] La consola está limpia.

**Commit:** `feat: 3D globe intro with Leaflet fallback`

---

## Fase 6 — Demo (7 diapositivas en inglés)
**Objetivo:** subir el criterio **Presentation** (hoy en 1/5).
**Entrada:** funcionalidades congeladas (15:00).

**Guion propuesto (7 diapositivas)**
1. **MARS+:** título, una frase y el enlace al sitio.
2. **El problema:** los datos de Marte están dispersos; la primera tripulación necesita decidir *si* sale, *cuándo* y *qué* alcanza a hacer.
3. **La misión piloto:** Landing → Issole (886 m), indicios de agua, muestras Robine y Malay.
4. **Cómo funciona:** capas de datos NASA → mapa de costo → cadena de 5 filtros → GO / NO-GO con explicación.
5. **Demo:** capturas de la ruta, la grilla de planes y el escenario de tormenta → NO SALIR.
6. **Validez:** paridad <1%, estabilidad a 1–5 m, casos reales (tormenta en los sols 313–317, evento solar del 28-oct-2021), supuestos declarados.
7. **Impacto y siguientes pasos:** cualquier sitio de Marte o la Luna; equipo; uso de IA declarado.

**Pasos**
1. *(Claude)* Textos de cada diapositiva y notas del orador.
2. *(Equipo)* Capturas en alta resolución desde la URL pública.
3. *(Equipo)* Armar la presentación en **Google Slides** con la paleta MARS+, **sin logos NASA**. Si hay imágenes generadas con IA, llevan marca de agua.
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
3. Anotar en `docs/es/` lo aprendido y los pasos posteriores al hackathon: Python, otros sitios, revisión de la ruta a mitad de camino, DONKI en vivo.

**✅ Se considera terminada cuando**
- [ ] Existe la etiqueta `v1.0-envio`.
- [ ] El respaldo está guardado.

---

## Reglas generales de ejecución
- **Una fase a la vez.** No se empieza la siguiente sin los ✅ de la anterior.
- **Después de cada fase:** pruebas en `/tests/` → app sin errores → commit → URL pública actualizada.
- **Ante un bloqueo** (cuentas, decisiones científicas), Claude avisa y propone un plan B. No se queda esperando sin decirlo.
- **Lo que nunca se recorta:** fases 1, 6, 7 y 8.
- **Orden de recorte si falta tiempo:** 5 → 3.3/3.5 (sensibilidad, validación de rocas) → 4.1 (bienvenida) → 3.1 (fotos).

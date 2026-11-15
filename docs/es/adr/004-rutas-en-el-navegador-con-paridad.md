# ADR-004 · Rutas A→B en el navegador (Web Worker) con paridad frente al motor C#

**Estado:** aceptada · 14-nov-2026

**Contexto:** el usuario debe poder elegir puntos A y B. No queremos un servidor que se pueda caer durante la evaluación.

**Decisión:**
- El costo y A* se implementan en `app/src/domain/` y corren en un Web Worker, con respaldo en el hilo principal.
- El pipeline exporta las bandas crudas del terreno (cuadrícula de 2 m).
- Las rutas oficiales las calcula `pipeline/03-model/RouteEngine.cs`.
- Una prueba de **paridad** exige que ambos motores difieran en menos del 1% en tiempo.

**Alternativas descartadas:**
- Backend de rutas.
- Solo rutas precalculadas, sin interacción.

**Consecuencias:**
- ✅ La ruta tarda ~0,2–0,4 s y la interfaz nunca se bloquea.
- ⚠️ Hay dos implementaciones del mismo modelo. Las mantienen alineadas la fuente única de parámetros (ADR-005) y la prueba de paridad.

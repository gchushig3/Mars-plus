# ADR-003 · CesiumJS solo para el globo de entrada (opcional), con respaldo 2D

**Estado:** reemplazada por [ADR-011](011-globo-webgl2-del-equipo.md) (globo WebGL2 propio del equipo) · 14-nov-2026

**Contexto:** la propuesta MARS+ pide un globo 3D con vuelo hacia la zona. Solo hay datos del sitio Jezero–Issole.

**Decisión:**
- Si se implementa, Cesium se usa **solo** en la pantalla de entrada: Marte como elipsoide propio, imagen global de Mars Trek y vuelo **guiado** hacia Jezero.
- Si Cesium falla o no se hace, la app arranca directamente en el mapa local.

**Alternativas descartadas:**
- Cesium para todo, incluido el mapa local.
- Globo con clic libre en cualquier punto: prometería datos que no existen.

**Consecuencias:**
- ✅ Gana impacto en la demo sin poner en riesgo el flujo principal.
- ⚠️ Se decide a las 13:00 del domingo, según cómo vayan las fases 1–4.

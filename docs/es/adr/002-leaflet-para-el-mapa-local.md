# ADR-002 · Leaflet para el mapa local

**Estado:** aceptada · 14-nov-2026

**Contexto:** las teselas de Mars Trek (NASA/JPL) usan un esquema geográfico (equirectangular), no Web Mercator.

**Decisión:** Leaflet 1.9.4 con `L.CRS.EPSG4326`, cargado desde cdnjs con versión fija y SRI.

**Alternativas descartadas:**
- MapLibre: solo trabaja con teselas Web Mercator, así que las de Mars Trek quedarían distorsionadas.
- Cesium en modo 2D: más pesado y con más riesgo, sin ganar nada a esta escala.

**Consecuencias:**
- ✅ HiRISE, nuestras capas y las rutas quedan alineadas, verificado a ojo y en las pruebas.
- ✅ Mars Trek permite CORS, así que funciona desde cualquier dominio.

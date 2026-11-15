# ADR-006 · Mapa geológico del equipo Mars 2020 (Stack et al. 2020) en lugar de SIM 3464

**Estado:** aceptada · 14-nov-2026

**Contexto:** necesitamos las unidades geológicas, sobre todo las de arena, a la escala de una caminata de ~1 km.

**Decisión:** usar el mapa fotogeológico de Stack et al. 2020 (*Space Sci. Rev.*, CC BY 4.0, escala 1:5.000):
- está dibujado sobre la misma ortoimagen HiRISE de 25 cm;
- está en la misma proyección que nuestro DTM (Mars 2000 equirectangular).

**Alternativas descartadas:**
- USGS SIM 3464 (1:75.000): su propio readme advierte desfases de 100–200 m frente al mosaico de operaciones, y viene en una geodatabase de 349 MB. Se eliminó de `data/` en la Fase 2.

**Consecuencias:**
- ✅ Encaja sin desfase y reveló que ~520 m de la ruta cruzan dunas grandes.
- ⚠️ Es un mapa de 2020: no refleja cambios eólicos posteriores.

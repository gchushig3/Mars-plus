# ADR-007 · Radiación con el detector E de RAD (Curiosity), sols MSL 3275–3286

**Estado:** aceptada · 14-nov-2026

**Contexto:** había dos series de radiación en conflicto:
- detector E: fondo de 11,9 µGy/h y pico de 27,9;
- detector B: 10,9 y 28,4, generada por otra sesión de trabajo.

**Decisión:**
- Usar el **detector E** (plástico, más parecido al tejido humano) en `extract-rad.ps1`.
- Rango fijo en `config/`: sols MSL 3275–3286, es decir, del 22-oct al 2-nov-2021 alrededor del evento del 28-oct.
- Se eliminaron el CSV y el script del detector B.

**Alternativas descartadas:**
- Detector B (silicio).
- DONKI como dosis: mide desde la Tierra y solo sirve como alerta.

**Consecuencias:**
- ✅ Hay una sola serie, reproducible y documentada.
- ⚠️ Es dosis **absorbida** (µGy) medida en el cráter Gale. Jezero está más alto, así que la dosis local sería algo mayor; la app lo declara.

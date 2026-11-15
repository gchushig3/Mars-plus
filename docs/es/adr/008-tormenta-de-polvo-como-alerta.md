# ADR-008 · La tormenta de polvo se modela como alerta explícita

**Estado:** aceptada · 14-nov-2026

**Contexto:** en la prueba de escenarios, el clima de los días de tormenta (sols 313–317) **pasó** el filtro de temperatura y viento al mediodía. El peligro real fue la opacidad (~2) y la visibilidad (Lemmon et al. 2022), y esos datos no están en los productos derivados de MEDA.

**Decisión:** el filtro 4 (clima) primero revisa una **alerta de tormenta de polvo** que descarta cualquier plan. Después revisa temperatura y viento en cada hora que el astronauta pasa afuera.

**Alternativas descartadas:**
- Inferir la tormenta solo con temperatura y viento: no la detecta.

**Consecuencias:**
- ✅ La respuesta es "no salir" y explica el porqué, usando un caso real.
- ⚠️ Mejora futura: integrar la opacidad de Mastcam-Z o SkyCam.

# ADR-001 · Sitio estático, sin compilación, con módulos JS nativos

**Estado:** aceptada · 14-nov-2026

**Contexto:** el plazo es de ~28 h. La computadora del equipo no tiene Node ni Python, y la evaluación se hace sobre un enlace público que no puede fallar.

**Decisión:** la app es HTML + CSS + JavaScript ES2020 con módulos nativos (`import`/`export`), sin bundler ni framework, publicada tal cual desde `app/`.

**Alternativas descartadas:**
- React/Vite/TypeScript: requieren Node y compilación, que es una fuente de fallos con este plazo.

**Consecuencias:**
- ✅ Funciona en cualquier hosting estático (GitHub Pages, Netlify) y no hay nada que compilar.
- ⚠️ Son ~30 módulos pequeños: la primera carga hace varias peticiones. Si hace falta, se agrupan después.

# ADR-011 · Globo de entrada propio en WebGL2 (del equipo), en lugar de Cesium

**Estado:** aceptada · 14-nov-2026 · **reemplaza a** [ADR-003](003-cesium-solo-para-el-globo.md)

**Contexto:**
- La Fase 5 pedía un globo 3D con vuelo guiado hacia Jezero (ADR-003 proponía CesiumJS).
- El equipo MARS+ entregó su propio globo (`MARS-plus.zip`), hecho con ayuda de IA. Es un renderizador WebGL2 que traza la esfera por rayos en el shader. Trae tres capas globales: mosaico Viking MDIM 2.1, elevación MOLA MEGDR y el mapa geológico de Tanaka et al. (2014).
- La entrega original metía los datos en archivos JS en base64 (~12 MB). La primera pantalla tardaba demasiado.

**Decisión:**
- Usar el globo del equipo como pantalla de entrada, adaptado a la arquitectura del MVP:
  - `infrastructure/globe/webgl-globe.js`: el renderizador, la cámara y el vuelo.
  - `ui/views/globe-view.js`: los controles, la leyenda y los textos ES/EN.
- Los datos pasan a archivos estáticos en `app/assets/globe/`, generados por `pipeline/04-export/export-globe-assets.ps1`:
  - textura rápida de 449 KB para la primera pantalla; la completa (2.6 MB) se carga en segundo plano;
  - MOLA (6.3 MB) y geología (193 KB) en gzip, que se descargan solo al elegir esa capa.
- El vuelo sigue siendo **guiado**: el botón "Planificar la EVA en Jezero" vuela hasta la zona y abre el mapa local. No hay clic libre en otros puntos.
- Respaldo: sin WebGL2, si el globo falla o con `?view=local`, la app arranca directamente en el mapa local (Leaflet). El botón de la cabecera alterna globo ↔ mapa.
- Si el navegador no pinta cuadros (pestaña en segundo plano), un temporizador de seguridad termina el vuelo igual.

**Alternativas descartadas:**
- **CesiumJS:** unos 3 MB más de librería, Marte habría que configurarlo como elipsoide propio, y no aprovecha el trabajo del equipo.
- **Mantener los datos en base64 dentro del JS:** primera carga de ~12 MB y sin caché por capa.

**Consecuencias:**
- ✅ Cero dependencias nuevas; el sitio sigue sin compilación (ADR-001).
- ✅ La autoría es visible: el pie del globo acredita al equipo y la ayuda de IA.
- ⚠️ El logo MARS+ fue generado con IA. Por la regla de Space Apps, se publica con la marca visible "AI-generated image" y `globe.json` lo declara (`logo.aiGenerated`).
- ⚠️ Necesita WebGL2. Los navegadores sin WebGL2 ven directamente el mapa local.
- Pruebas: `tests/globe.test.js` comprueba los recursos publicados, el tamaño de las rejillas, las 44 unidades geológicas con nombre ES/EN y créditos sin errores de codificación.

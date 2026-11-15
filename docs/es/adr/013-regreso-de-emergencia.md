# ADR-013 · Ante una alerta en plena EVA no se esquiva: se vuelve

**Estado:** aceptada · 15-nov-2026

**Contexto:**
- El equipo preguntó qué hace el plan si llega una alerta de tormenta de polvo o de partículas solares.
- Antes de salir, la alerta ya pospone la EVA (filtros 4 y 5).
- Faltaba el caso de una alerta **durante** la caminata.

**Decisión:**
- No se buscan rutas que "esquiven" la alerta. Una tormenta cubre cientos de kilómetros y las partículas llegan desde todo el cielo, así que dentro de 1 km² ninguna ruta tiene menos polvo ni menos radiación.
- MARS+ da **la mejor vuelta al hábitat**, el único refugio:

  | Alerta | Ruta | Dosis del regreso |
  |---|---|---|
  | Partículas solares | La más rápida | Tasa máxima del evento del 28-oct-2021 (RAD) × minutos |
  | Tormenta de polvo | La segura: pendiente ≤ 15°, evita dunas grandes y celdas sin vista al hábitat donde puede, a paso ×1,5 por poca visibilidad | Tasa de fondo × minutos |
  | Las dos | La segura, con su costo frente a la más rápida (minutos, µGy, metros de duna) | Tasa del evento × minutos |

- **Cómo se calcula:**
  - El Worker construye una vez dos "campos de regreso" (Dijkstra hacia el hábitat), uno por política. Desde cualquier celda, el camino a casa sale de seguir el siguiente paso.
  - Se basa en `time-field.js` y `viewshed.js`, que Henry prototipó con Cursor.
- **Quién lo usa:**
  - **Antes de salir:** se revisa el tiempo de regreso desde cada parada y el punto más lejano del plan. Si supera 45 min, hay un aviso, que no cambia la recomendación.
  - **Durante la EVA:** la persona en el hábitat elige el minuto y la alerta y guía por radio. La "vista del astronauta" muestra solo ruta, minutos, rumbo y dosis, como concepto de pantalla de traje.
- **Posición:** en Marte no hay GPS. Se estima por el avance en la ruta planificada (tiempo acumulado de cada tramo).

**Supuestos de escenario** (en `config/model-parameters.json → contingency`, pendientes del equipo de ciencia):
- pendiente máxima con polvo de 15°;
- penalizaciones de dunas y de falta de vista al hábitat;
- ritmo ×1,5 con poca visibilidad;
- aviso a los 45 min;
- puntos de control cada 5 min.

No se modela cuánto aviso da una alerta en Marte.

**Alternativas descartadas:**
- Rutas que "esquivan" el polvo o la radiación: no hay datos que las distingan a esta escala.
- Refugios intermedios: no existen en el escenario.

**Consecuencias:**
- ✅ Funciona con los datos existentes. Lo cubren 7 pruebas (`tests/emergency.test.js`) más las de Henry para el campo y la línea de vista.
- ⚠️ Preparar los campos tarda unos 2,5 s una sola vez, en el Worker, sin bloquear la pantalla.
- ⚠️ Con las dos alertas, desde la parada de muestreo la vuelta segura tarda 63 min. El aviso de 45 min se enciende, y eso es información útil para la tripulación antes de salir.

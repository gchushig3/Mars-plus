# ADR-009 · Explicación del plan determinista, sin asistente de IA

**Estado:** aceptada · 14-nov-2026

**Contexto:** la propuesta MARS+ incluía un asistente de IA que explicara la ruta.

**Decisión:** `domain/explain/explain.js` traduce el resultado de la cadena de filtros en frases estructuradas, por ejemplo: "Plan A fuera — Tiempo: excede el límite por 5 min". La UI las presenta en ES/EN.

**Alternativas descartadas:**
- Asistente con un modelo de IA en vivo: exigiría exponer una clave en el navegador o montar un backend, y declararlo como uso de IA en el producto.

**Consecuencias:**
- ✅ Las explicaciones son exactas, reproducibles, se pueden probar y no tienen costo ni dependencias.
- ⚠️ Son menos conversacionales que un asistente.

# Martian Map — piloto Octavia E. Butler Landing ↔ Issole

## Cómo abrir la página
Ejecutar en PowerShell, desde la carpeta `Desktop`:

```
powershell -ExecutionPolicy Bypass -File martian-map\scripts\servidor.ps1
```

Luego abrir http://localhost:8765 en el navegador.
(Hace falta un servidor porque, abierta con doble clic, el navegador bloquea los archivos de datos.)

## Estructura
- `web/index.html`: la página (mapa, rutas, presupuesto de tiempo, clima, radiación, geología; ES/EN).
- `web/data/`: datos listos para la web (rutas, pendiente, MEDA, trayecto).
- `data/dtm_1m_float32.bin` + `dtm_1m_meta.json`: recorte del DTM HiRISE de 1 m (USGS), 920 × 979 celdas.
- `data/meda/`: CSV originales de MEDA del sol 286.
- `scripts/ruta_motor.cs`: motor de rutas (A* de menor tiempo, pendiente direccional, rugosidad).
- `scripts/calcular_rutas.ps1`: recalcula las rutas a 1, 2 y 5 m y regenera `web/data`.

## Resultados del motor (ritmo normal ~2,5 km/h en llano)

| Res. | Ruta | Distancia | Tiempo | Sube / Baja | Pend. máx |
|---|---|---|---|---|---|
| 1 m | Recta (ida) | 922 m | 23,6 min | +19,2 / −23,7 m | 16,7° |
| 1 m | **Ida óptima** | 926 m | **22,5 min** | +13,0 / −17,5 m | **9,2°** |
| 1 m | **Vuelta óptima** | 922 m | **23,0 min** | +17,0 / −12,5 m | 12,2° |
| 2 m | Ida óptima | 925 m | 22,6 min | +12,7 / −17,2 m | 10,0° |
| 5 m | Ida óptima | 927 m | 23,0 min | +11,8 / −16,3 m | 8,7° |

- **La ruta óptima evita las crestas de las dunas.** Comparada con la línea recta, sube ~6 m menos y su pendiente máxima baja de 16,7° a 9,2°, con casi la misma distancia.
- **El corredor es estable a 1, 2 y 5 m:** el tiempo de ida varía menos del 3% entre resoluciones.
- **Ida y vuelta siguen caminos distintos,** porque la pendiente cambia de signo al regresar.

## Motor v2 (pendiente + arena + rocas) y cadena de filtros
Orden para regenerar todo (PowerShell, desde `Desktop`):
1. `martian-map\scripts\descargar_ortho.ps1`: recorte HiRISE 25 cm (USGS), ~10 min.
2. `martian-map\scripts\preparar_capas.ps1`: rasteriza la geología (Stack 2020) a 1 m.
3. `martian-map\scripts\calcular_rutas_v2.ps1`: rocas por sombras, rutas, paradas y `web/data/rutas_v2.js`.
4. `martian-map\scripts\resumir_meda.ps1`: día típico, peor caso y tormenta → `web/data/meda_tipico.js`.

Para probar la cadena de filtros, abre `http://localhost:8765/prueba_motor.html` con el servidor encendido.
El motor está en `web/js/motor_planes.js` y la página principal lo usará cuando se mejore.

## Límites conocidos (decirlos en el pitch)
- La arena se penaliza con el doble de tiempo (Lejeune et al. 1998), pero **no se puede evitar**: las dunas grandes rodean Issole.
- La tormenta de polvo entra como **alerta**, porque la opacidad no está en los datos derivados de MEDA.
- El DTM de 1 m no resuelve rocas menores a ~1 m. Los tramos críticos hay que revisarlos sobre la ortoimagen HiRISE de 25 cm.
- La velocidad usa la función de Tobler escalada (factor 0,5) como escenario. No está calibrada con ensayos reales con traje.
- La radiación es una tasa de referencia de RAD en Gale, no una dosis medida en Jezero.
- El clima es un solo sol (286) en Issole. Faltan más sols para tener estadística.
- Las distancias sobre la cuadrícula son ~4% mayores que la recta geométrica (886 m).

# Requisitos del piloto — Martian Map (NASA Space Apps 2026)

Decidido con el equipo el 14-nov-2026.

## Alcance
- **Piloto de un solo trayecto:** Octavia E. Butler Landing (18.4446 °N, 77.4509 °E) ↔ afloramiento **Issole** (18.43266 °N, 77.44137 °E).
- Ida de 886 m (rumbo 217°) y vuelta de 886 m, calculadas por separado.
- Brac queda fuera del alcance.
- **Tiempo de desarrollo:** ~20 h. El código lo hace Claude; el equipo aporta ciencia, diseño y pitch.

## Formato
- Página web de **planificación en el hábitat**, pensada para escritorio.
- **Bilingüe ES/EN** con botón para cambiar de idioma.
- **Actualizado:** el sitio **debe funcionar y estar publicado** en un enlace público (GitHub Pages; plan B: Netlify) para la presentación y la evaluación. Ver `arquitectura-mvp.md`, sección 1.1.

## Capas del mapa
1. **Óptica:** HiRISE 25 cm y CTX 6 m (WMTS de Mars Trek, JPL).
2. **Relieve y pendiente:** DTM HiRISE de 1 m (USGS).
3. **Geología:** tipo de roca y suelo (formaciones Máaz y Séítah; pavers, bloques, ondulaciones de arena).
4. **Minerales y muestras:** Robine y Malay en Issole (olivino, carbonatos, sulfatos hidratados = indicios de agua).
5. **Radiación:** dosis estimada para el astronauta según la duración de la salida (referencia RAD de Curiosity, 0,64 mSv/día).

## Funciones
- **Ruta de menor esfuerzo** de ida y de vuelta: evita pendientes fuertes, arena y rocas grandes.
- **Presupuesto de tiempo:** ida + trabajo en Issole + regreso + reserva. Avisa si la tarea no cabe.
- **Mejor hora para salir**, según temperatura, viento y polvo de MEDA (Perseverance).

## Tareas en Issole
- Fotografiar y describir el afloramiento (~20–30 min).
- Tomar una muestra en un punto seguro con espacio de trabajo (~45–60 min).

## Pendiente de decidir con los datos
- Cómo usar el relieve de 1 m: el archivo completo pesa 1,75 GB, así que se intentará leer solo el recorte del trayecto.
- La fuente de los datos horarios de MEDA para Issole.

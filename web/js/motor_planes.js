/* Motor de planes del piloto Martian Map — cadena de filtros.
 * Arma todos los planes candidatos (tareas x hora de salida) y los pasa por 5 filtros en orden:
 *   1 Terreno   ¿existe ruta a cada parada y de vuelta?            (rutas precalculadas, motor v2)
 *   2 Ciencia   ¿la parada tiene espacio de trabajo para la tarea? (paradas precalculadas)
 *   3 Tiempo    esclusa + viajes + trabajo + reserva <= limite
 *   4 Clima     todas las horas afuera dentro de la ventana (MEDA, sols 286-339 en Issole)
 *   5 Radiacion alerta de evento solar => no salir; si no, dosis = tasa x tiempo afuera (RAD)
 * Un plan que falla un filtro queda descartado con el motivo; ningun filtro compensa a otro.
 * Uso: MotorPlanes.evaluar({paradas, meda, rad}, opciones) -> {planes, recomendado}
 */
(function (global) {
  'use strict';

  const TAREAS = {
    foto:    { min: 25, parada: 'observacion', es: 'Fotografiar y describir', en: 'Photograph and describe' },
    muestra: { min: 50, parada: 'muestreo',    es: 'Tomar muestra',           en: 'Collect sample' }
  };
  const PLANES = [
    { id: 'A', tareas: ['foto', 'muestra'], es: 'Completo', en: 'Full' },
    { id: 'C', tareas: ['muestra'],         es: 'Solo muestra', en: 'Sample only' },
    { id: 'B', tareas: ['foto'],            es: 'Solo documentación', en: 'Documentation only' }
  ];
  const VALOR = { A: 3, C: 2, B: 1 }; // valor cientifico relativo, solo para ordenar planes viables

  const DEF = {
    limiteMin: 180, reservaMin: 15, esclusaMin: 20, ritmo: 1.0,   // ritmo: 1 normal, >1 mas lento
    tempMinC: -20, vientoMaxMs: 8, escenario: 'tipico',            // 'tipico' | 'peor' | 'tormenta'
    eventoSolar: false, alertaPolvo: false, dosisMaxUGy: 500,       // alertas y limite de escenario por salida
    horas: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], lang: 'es'
  };

  function legs(plan, P) {
    // Secuencia de tramos: Landing -> (observacion) -> (muestreo) -> Landing
    const t = plan.tareas;
    if (t.length === 2) return [['landing_observacion', P.landing_observacion], ['observacion_muestreo', P.observacion_muestreo], ['muestreo_landing', P.muestreo_landing]];
    const p = TAREAS[t[0]].parada;
    return [['landing_' + p, P['landing_' + p]], [p + '_landing', P[p + '_landing']]];
  }

  function clima(meda, esc, h) {
    const r = meda.horas[((h % 24) + 24) % 24];
    if (esc === 'tormenta') return { t: r.tormenta_temp_media_c, w: r.tormenta_viento_medio_ms };
    if (esc === 'peor') return { t: r.temp_peor_c, w: r.viento_peor_medio_ms };
    return { t: r.temp_media_c, w: r.viento_medio_ms };
  }

  function evaluarPlan(plan, dep, D, o) {
    const L = o.lang, res = { plan: plan.id, nombre: plan[L], salida: dep, estado: 'viable', filtro: null, motivo: '' };
    const fail = (n, m) => { res.estado = 'descartado'; res.filtro = n; res.motivo = m; return res; };

    // 1 Terreno
    const tramos = legs(plan, D.paradas.tramos);
    const sinRuta = tramos.find(([, v]) => !v || !isFinite(v.tiempo_min));
    if (sinRuta) return fail(1, L === 'es' ? `No hay ruta segura en el tramo ${sinRuta[0]}` : `No safe route on leg ${sinRuta[0]}`);
    const viaje = tramos.reduce((s, [, v]) => s + v.tiempo_min * o.ritmo, 0);

    // 2 Ciencia
    for (const t of plan.tareas) {
      const p = D.paradas.puntos[TAREAS[t].parada];
      if (!p || !p.ok) return fail(2, L === 'es' ? `Sin espacio de trabajo seguro para "${TAREAS[t].es}"` : `No safe workspace for "${TAREAS[t].en}"`);
    }
    const trabajo = plan.tareas.reduce((s, t) => s + TAREAS[t].min, 0);

    // 3 Tiempo
    const total = o.esclusaMin + viaje + trabajo + o.reservaMin;
    Object.assign(res, { viaje_min: +viaje.toFixed(1), trabajo_min: trabajo, total_min: Math.round(total), regreso: dep + total / 60 });
    if (total > o.limiteMin) return fail(3, L === 'es' ? `Excede el límite por ${Math.ceil(total - o.limiteMin)} min` : `Exceeds limit by ${Math.ceil(total - o.limiteMin)} min`);

    // 4 Clima: alerta de tormenta de polvo (la opacidad no esta en MEDA derivado; caso real sols 313-317,
    //   opacidad visible ~2 y visibilidad reducida, Lemmon et al. 2022) y luego todas las horas afuera
    if (o.alertaPolvo) return fail(4, L === 'es' ? 'Tormenta de polvo activa: visibilidad reducida (caso real sols 313–317)' : 'Dust storm in progress: reduced visibility (real case sols 313–317)');
    for (let h = Math.floor(dep); h < dep + total / 60; h++) {
      const c = clima(D.meda, o.escenario, h);
      if (c.t == null || c.w == null) return fail(4, L === 'es' ? `Sin datos de clima a las ${h}:00` : `No weather data at ${h}:00`);
      if (c.t < o.tempMinC) return fail(4, L === 'es' ? `Suelo a ${c.t} °C a las ${h}:00 (mín. ${o.tempMinC})` : `Ground at ${c.t} °C at ${h}:00 (min ${o.tempMinC})`);
      if (c.w > o.vientoMaxMs) return fail(4, L === 'es' ? `Viento medio ${c.w} m/s a las ${h}:00 (máx. ${o.vientoMaxMs})` : `Mean wind ${c.w} m/s at ${h}:00 (max ${o.vientoMaxMs})`);
    }

    // 5 Radiacion
    if (o.eventoSolar) return fail(5, L === 'es' ? 'Evento de partículas solares activo: permanecer en el refugio' : 'Solar particle event in progress: stay sheltered');
    const tasa = D.rad.fondo_uGy_h;
    res.dosis_uGy = +(tasa * total / 60).toFixed(1);
    if (res.dosis_uGy > o.dosisMaxUGy) return fail(5, L === 'es' ? `Dosis ${res.dosis_uGy} µGy > límite ${o.dosisMaxUGy}` : `Dose ${res.dosis_uGy} µGy > limit ${o.dosisMaxUGy}`);
    return res;
  }

  function evaluar(D, opciones) {
    const o = Object.assign({}, DEF, opciones || {});
    const planes = [];
    for (const p of PLANES) for (const h of o.horas) planes.push(evaluarPlan(p, h, D, o));
    const viables = planes.filter(p => p.estado === 'viable');
    // Orden: mas ciencia, luego menos tiempo, luego salida mas temprana (mas margen de luz)
    viables.sort((a, b) => VALOR[b.plan] - VALOR[a.plan] || a.total_min - b.total_min || a.salida - b.salida);
    // Si no hay viables, el "mas cercano" es el que llego mas lejos en la cadena de filtros
    const cercano = viables.length ? null : planes.slice().sort((a, b) => b.filtro - a.filtro || VALOR[b.plan] - VALOR[a.plan])[0];
    return { opciones: o, planes, viables, recomendado: viables[0] || null, cercano };
  }

  global.MotorPlanes = { evaluar, TAREAS, PLANES, DEF };
})(typeof window !== 'undefined' ? window : globalThis);

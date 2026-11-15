// AI-assisted (Claude). Reviewed by the MARS+ team.
// What Mars gravity (3.71 m/s², 0.38 g) changes for a walking crew. Shown to explain the model; it does
// not change the walking-cost formula (the suited pace is already a scenario assumption).
//   - loads weigh 38% of their Earth weight;
//   - the fastest comfortable walk scales with √g: people switch to a run near Froude number 0.5
//     (Kram, Domingo & Ferris 1997, J. Exp. Biol. 200: 821–826), so v = √(Fr · g · leg length);
//   - a fall of the same height takes longer: t = √(2h / g).

/** @param {{marsMs2:number, earthMs2:number, legLengthM:number, walkRunFroude:number}} g */
export function gravityFacts(g, modelFlatKmh) {
  const walkRun = (accel) => Math.sqrt(g.walkRunFroude * accel * g.legLengthM) * 3.6;
  const fall1m = (accel) => Math.sqrt(2 / accel);
  return {
    ratio: g.marsMs2 / g.earthMs2,
    walkRunMarsKmh: walkRun(g.marsMs2),
    walkRunEarthKmh: walkRun(g.earthMs2),
    modelFlatKmh,
    fall1mMarsS: fall1m(g.marsMs2),
    fall1mEarthS: fall1m(g.earthMs2),
  };
}

/** Weight of a mass on Mars, expressed as the Earth mass that would weigh the same (kg). */
export function earthEquivalentKg(massKg, g) {
  return massKg * (g.marsMs2 / g.earthMs2);
}

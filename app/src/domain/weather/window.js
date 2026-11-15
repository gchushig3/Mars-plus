// AI-assisted (Claude). Reviewed by the MARS+ team.
// Weather window checks over MEDA hourly conditions (typical | worst | storm scenarios).

/** @typedef {'typical'|'worst'|'storm'} WeatherScenario */

/** Conditions at a local solar hour for a scenario: {tempC, windMs} (values may be null). */
export function conditionsAt(weather, scenario, hour) {
  const row = weather.hours[((hour % 24) + 24) % 24];
  return row[scenario] ?? { tempC: null, windMs: null };
}

/**
 * Checks every hour the crew is outside, from departure to return.
 * @returns {null | {code:string, values:object}} first violation, or null when the window is fine
 */
export function checkWeatherWindow(weather, scenario, departureHour, totalMin, limits) {
  for (let h = Math.floor(departureHour); h < departureHour + totalMin / 60; h++) {
    const c = conditionsAt(weather, scenario, h);
    const hour = ((h % 24) + 24) % 24;
    if (c.tempC == null || c.windMs == null) return { code: 'noWeatherData', values: { hour } };
    if (c.tempC < limits.minGroundTempC) return { code: 'tooCold', values: { hour, tempC: c.tempC, minC: limits.minGroundTempC } };
    if (c.windMs > limits.maxMeanWindMs) return { code: 'tooWindy', values: { hour, windMs: c.windMs, maxMs: limits.maxMeanWindMs } };
  }
  return null;
}

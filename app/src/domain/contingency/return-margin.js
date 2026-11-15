/** Sample each straight edge at intervals no larger than one metre on the ground. */
export function sampleItinerary(timeline) {
  const samples = [];
  for (const leg of timeline.segments.filter(({ kind }) => kind === 'walk')) {
    for (let i = 1; i < leg.coords.length; i++) {
      const from = leg.startM + leg.dist[i - 1];
      const length = leg.dist[i] - leg.dist[i - 1];
      if (length <= 0) continue;
      const [lon, lat] = leg.coords[i - 1];
      const [nextLon, nextLat] = leg.coords[i];
      const at = (f) => [lon + f * (nextLon - lon), lat + f * (nextLat - lat)];
      const count = Math.ceil(length);
      for (let j = 0; j < count; j++) {
        const start = j / count, end = (j + 1) / count;
        const [midLon, midLat] = at((start + end) / 2);
        samples.push({
          legId: leg.legId, lon: midLon, lat: midLat,
          from: at(start), to: at(end), startM: from + start * length, endM: from + end * length,
        });
      }
    }
  }
  return samples;
}

/** Group consecutive samples in the same time band, keeping metres from the start for map clicks. */
export function returnBands(samples, times, policy, factor, limit) {
  const bands = [];
  for (const [i, point] of samples.entries()) {
    const raw = times[i][policy];
    const min = raw === null ? null : raw * factor;
    let key;
    if (min === null) key = 'unknown';
    else if (!Number.isFinite(min)) key = 'unreachable';
    else if (min > limit) key = 'over';
    else if (min > limit * 2 / 3) key = 'long';
    else if (min > limit / 3) key = 'medium';
    else key = 'short';
    const last = bands.at(-1);
    if (last?.key === key && last.legId === point.legId) {
      last.coords.push(point.to);
      last.distances.push(point.endM);
    } else {
      bands.push({ key, legId: point.legId, coords: [point.from, point.to], distances: [point.startM, point.endM] });
    }
  }
  return bands;
}

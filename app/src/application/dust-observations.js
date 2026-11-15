import { dustAlert, solRecord } from '../domain/dust/dust.js';

const EPISODES = [
  { id: 'jan2022', sols: [313, 314, 316], source: 'https://doi.org/10.1029/2022GL100126' },
  { id: 'aug2024', sols: [1244, 1255], source: 'https://science.nasa.gov/blog/persevering-through-the-storm/' },
];

/** Observed daily medians, including known gaps, for the historical comparison. */
export function dustObservations(catalog, threshold) {
  const series = catalog?.jezeroTau;
  const source = catalog?.provenance?.find((entry) => entry.id === 'mastcamz-tau')?.url;
  const episodes = EPISODES.map(({ id, source, sols }) => ({
    id, source,
    observations: sols.map((sol) => {
      const record = series ? solRecord(series, sol) : null;
      if (!record) return { sol, tau: null, status: 'missing' };
      const tau = record.tauMilli / 1000;
      return { sol, tau, status: dustAlert({ tau, threshold }).active ? 'active' : 'below' };
    }),
  }));
  return { episodes, source };
}

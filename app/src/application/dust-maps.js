// AI-assisted (Claude). Reviewed by the MARS+ team.
// Seasonal dust maps for the globe, as a use case the UI can call without knowing how the
// grids are stored. The loaders are injected by main.js (infrastructure); painting and
// sampling are domain rules. Code moved here from Henry's globe view (made with Cursor).
import { CDOD_COLORS, FREQ_COLORS, FREQ_MISSING, VISIBLE_FROM_IR, paintVolume, sampleVolume } from '../domain/dust/dust.js';

/**
 * @param {{ loadCatalog: () => Promise<object>, loadVolume: (file: string) => Promise<Uint8Array>,
 *           specOf: (catalog: object, product: string) => {file:string, grid:object, mode:string, stops:number[]},
 *           createFlatMap: (container: HTMLElement) => object }} deps
 */
export function createDustMaps({ loadCatalog, loadVolume, specOf, createFlatMap }) {
  let catalog = null;
  const volumes = new Map();
  const colorsOf = (mode) => (mode === 'frequency' ? FREQ_COLORS : CDOD_COLORS);

  async function ensureCatalog() {
    if (!catalog) catalog = await loadCatalog();
    return catalog;
  }

  return {
    /** Legend data for a product, or null before the catalog has loaded. */
    legend(product) {
      if (!catalog) return null;
      const spec = specOf(catalog, product);
      return { stops: spec.stops, colors: colorsOf(spec.mode), mode: spec.mode };
    },

    /** RGBA pixels (row 0 = north) for one product and one Ls bin. */
    async frame(product, bin) {
      const cat = await ensureCatalog();
      const spec = specOf(cat, product);
      const colors = colorsOf(spec.mode);
      if (spec.stops.length !== colors.length) throw new Error('dust legend stops do not match the colour ramp');
      if (!volumes.has(product)) {
        const bytes = await loadVolume(spec.file);
        const expected = spec.grid.width * spec.grid.height * cat.lsBinStarts.length;
        if (bytes.length !== expected) throw new Error(`${spec.file}: ${bytes.length} bytes, expected ${expected}`);
        volumes.set(product, bytes);
      }
      const rgba = paintVolume({ bytes: volumes.get(product), grid: spec.grid, band: bin, mode: spec.mode, stops: spec.stops, colors, scale: cat.cdod.scale });
      return { rgba, width: spec.grid.width, height: spec.grid.height };
    },

    /** Value under a point, or null when that product has not been loaded yet. */
    readout(product, bin, lat, lon) {
      if (!catalog || !volumes.has(product)) return null;
      const spec = specOf(catalog, product);
      const byte = sampleVolume(volumes.get(product), bin, lat, lon, spec.grid);
      if (spec.mode === 'frequency') return byte === FREQ_MISSING ? { kind: 'missing' } : { kind: 'frequency', value: byte };
      const scale = catalog.cdod.scale;
      const factor = catalog.cdod.visibleExtinctionFactor || VISIBLE_FROM_IR;
      return { kind: 'cdod', ir: byte * scale, vis: byte * scale * factor, clipped: byte === 255 };
    },

    /** Published value at Jezero for the flat map's marker. */
    jezero(product, bin) {
      if (!catalog) return null;
      const value = product === 'frequency'
        ? catalog.frequency.jezero.percent[bin]
        : (product === 'my34' ? catalog.cdod.jezero.my34Cdod610[bin] : catalog.cdod.jezero.climatologyCdod610[bin]);
      return { value, lat: catalog.jezeroTau.lat, lon: catalog.jezeroTau.lon };
    },

    createFlatMap,
  };
}

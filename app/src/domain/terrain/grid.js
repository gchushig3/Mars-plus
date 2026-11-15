// AI-assisted (Claude). Reviewed by the MARS+ team.
// Terrain grid decoded from terrain-2m.bin (band layout described in terrain-2m.json).
// Pure domain code: no DOM, no fetch.

/**
 * @typedef {{name:string,type:'uint8'|'uint16',offset:number,scale:number,add:number,unit:string}} Band
 * @typedef {{rows:number,cols:number,resM:number,originXM:number,originYM:number,marsRadiusM:number,nodata:number,
 *            bounds:{west:number,south:number,east:number,north:number},bands:Band[]}} TerrainMeta
 */

const DEG = 180 / Math.PI;

export class TerrainGrid {
  /** @param {TerrainMeta} meta @param {ArrayBuffer} buffer */
  constructor(meta, buffer) {
    this.rows = meta.rows;
    this.cols = meta.cols;
    this.res = meta.resM;
    this.x0 = meta.originXM;
    this.y0 = meta.originYM;
    this.radius = meta.marsRadiusM;
    this.bounds = meta.bounds;
    this.size = this.rows * this.cols;
    this.cosLat = Math.cos((this.y0 - (this.rows * this.res) / 2) / this.radius);

    const bytes = new Uint8Array(buffer);
    const band = (name) => {
      const b = meta.bands.find((x) => x.name === name);
      if (!b) throw new Error(`terrain band missing: ${name}`);
      return b;
    };
    const n = this.size;

    const zb = band('z');
    this.z = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const raw = bytes[zb.offset + 2 * i] | (bytes[zb.offset + 2 * i + 1] << 8);
      this.z[i] = raw === meta.nodata ? NaN : zb.add + raw * zb.scale;
    }
    const decode8 = (name) => {
      const b = band(name);
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = b.add + bytes[b.offset + i] * b.scale;
      return out;
    };
    this.slope = decode8('slope');
    this.rough = decode8('rough');
    this.duneLarge = decode8('duneLarge');
    this.duneSmall = decode8('duneSmall');
    this.rock = decode8('rock');
  }

  lonOfCol(c) { return ((this.x0 + (c + 0.5) * this.res) / this.radius) * DEG; }
  latOfRow(r) { return ((this.y0 - (r + 0.5) * this.res) / this.radius) * DEG; }
  colOfLon(lon) { return Math.floor(((lon / DEG) * this.radius - this.x0) / this.res); }
  rowOfLat(lat) { return Math.floor((this.y0 - (lat / DEG) * this.radius) / this.res); }

  /** Cell index for a lon/lat, or -1 if it falls outside the usable grid (1-cell border excluded). */
  cellOf(lon, lat) {
    const r = this.rowOfLat(lat), c = this.colOfLon(lon);
    if (r < 1 || c < 1 || r >= this.rows - 1 || c >= this.cols - 1) return -1;
    return r * this.cols + c;
  }

  /** @returns {[number, number, number]} [lon, lat, z] of a cell centre */
  coordOf(cell) {
    const r = Math.floor(cell / this.cols), c = cell % this.cols;
    return [this.lonOfCol(c), this.latOfRow(r), this.z[cell]];
  }
}

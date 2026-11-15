// AI-assisted (Claude). Reviewed by the MARS+ team.
// Ports (contracts) used by the application layer. Implemented in infrastructure/.

/**
 * @typedef {object} SiteData
 * @property {object} params      model parameters (config/model-parameters.json)
 * @property {object} site        site configuration (points, stop targets, Trek layers)
 * @property {object} routes      official routes (runs at 1/2/5 m) + rover path
 * @property {object} stops       observation and sampling stops
 * @property {object} geology     GeoJSON FeatureCollection (Stack et al. 2020)
 * @property {object} weather     hourly MEDA conditions per scenario
 * @property {object} radiation   RAD background, event and series
 * @property {object} overlays    overlay files and bounds
 * @property {object} terrainMeta terrain-2m.json
 */

/**
 * @typedef {object} SiteRepository
 * @property {() => Promise<SiteData>} loadSite
 * @property {() => Promise<ArrayBuffer>} loadTerrainBinary
 * @property {(path:string) => string} assetUrl
 */

/**
 * @typedef {{lon:number, lat:number}} LonLat
 * @typedef {object} RouteSolver
 * @property {(meta:object, buffer:ArrayBuffer, params:object) => Promise<void>} init
 * @property {(a:LonLat, b:LonLat) => Promise<{ok:true, stats:object, ms:number} | {ok:false, code:string}>} route
 */

export {};

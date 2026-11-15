// AI-assisted (Claude). Reviewed by the MARS+ team.
// NASA/JPL Mars Trek WMTS tiles (geographic tiling: level z has 2^(z+1) x 2^z tiles of 256 px).
// CORS verified on 14-Nov-2026, so the same tiles work from GitHub Pages / Netlify.

export const TREK_ATTRIBUTION = 'Imagery: NASA/JPL-Caltech/University of Arizona via <a href="https://trek.nasa.gov/mars/" target="_blank" rel="noopener">Mars Trek</a>';

export function trekTileUrl(layerId) {
  return `https://trek.nasa.gov/tiles/Mars/EQ/${layerId}/1.0.0/default/default028mm/{z}/{y}/{x}.png`;
}

export const TREK_MAX_NATIVE_ZOOM = { hirise: 17, ctx: 13, themisNight: 9 };

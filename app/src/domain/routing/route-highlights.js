// AI-assisted (Claude). Reviewed by the MARS+ team.
// Places along the official route worth a closer look: where it crosses the large dunes
// (Stack et al. 2020 map units). Used to put a "zoom in here" point on the map.

const MARS_R = 3396190;
const DEG = Math.PI / 180;

/** Ray-casting test: is (lon, lat) inside a polygon ring of [lon, lat] pairs? */
export function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function segmentM([lon0, lat0], [lon1, lat1]) {
  const dx = (lon1 - lon0) * DEG * MARS_R * Math.cos(((lat0 + lat1) / 2) * DEG);
  const dy = (lat1 - lat0) * DEG * MARS_R;
  return Math.hypot(dx, dy);
}

/** Per point of the route: is it inside a polygon of the given map class? */
export function classMask(coords, features, cls = 'largeDunes') {
  const rings = features.filter((f) => f.properties.class === cls).map((f) => f.geometry.coordinates[0]);
  return coords.map(([lon, lat]) => rings.some((r) => pointInRing(lon, lat, r)));
}

/**
 * Stretch of a route inside the given map class.
 * @param {number[][]} coords route [lon, lat, …]
 * @param {{properties:{class:string}, geometry:{coordinates:number[][][]}}[]} features geology polygons
 * @returns {null | {lengthM:number, entry:number[], exit:number[], middle:number[]}}
 */
export function classStretch(coords, features, cls = 'largeDunes') {
  const rings = features.filter((f) => f.properties.class === cls).map((f) => f.geometry.coordinates[0]);
  if (!rings.length || coords.length < 2) return null;
  const inside = coords.map(([lon, lat]) => rings.some((r) => pointInRing(lon, lat, r)));
  let lengthM = 0, first = -1, last = -1;
  for (let i = 1; i < coords.length; i++) {
    if (inside[i] && inside[i - 1]) {
      lengthM += segmentM(coords[i - 1], coords[i]);
      if (first < 0) first = i - 1;
      last = i;
    }
  }
  if (first < 0) return null;
  // middle = the point halfway along the length inside the class
  let acc = 0, middle = coords[first];
  for (let i = first + 1; i <= last; i++) {
    if (!(inside[i] && inside[i - 1])) continue;
    acc += segmentM(coords[i - 1], coords[i]);
    if (acc >= lengthM / 2) { middle = coords[i]; break; }
  }
  return { lengthM, entry: coords[first].slice(0, 2), exit: coords[last].slice(0, 2), middle: middle.slice(0, 2) };
}

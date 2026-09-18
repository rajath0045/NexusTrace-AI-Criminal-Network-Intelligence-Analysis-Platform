/**
 * Converts latitude and longitude to a 3D unit vector [x, y, z].
 * lat: [-90, 90], lon: [-180, 180]
 */
export function latLonToUnitVector3(
  lat: number,
  lon: number,
): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -Math.sin(phi) * Math.cos(theta);
  const y = Math.cos(phi);
  const z = Math.sin(phi) * Math.sin(theta);

  return [x, y, z];
}

/**
 * Converts a 3D unit vector [x, y, z] to [lat, lon].
 */
export function unitVector3ToLatLon(
  x: number,
  y: number,
  z: number,
): [number, number] {
  const lat = 90 - Math.acos(Math.max(-1, Math.min(1, y))) * (180 / Math.PI);
  let lon = Math.atan2(z, -x) * (180 / Math.PI) - 180;
  while (lon < -180) lon += 360;
  while (lon > 180) lon -= 360;
  return [lat, lon];
}

/**
 * Simplified continental landmass outlines [lon, lat][]
 * Used strictly for land-detection so land dots are slightly denser/brighter.
 * ZERO POLYGONS OR TEXT ARE RENDERED ON CANVAS.
 */
export const CONTINENTAL_POLYGONS: [number, number][][] = [
  // North America (Mainland)
  [
    [-168, 65], [-160, 71], [-140, 70], [-130, 70], [-115, 68], [-95, 70],
    [-80, 74], [-65, 66], [-60, 55], [-55, 52], [-65, 44], [-70, 42],
    [-75, 38], [-80, 32], [-81, 25], [-85, 30], [-90, 30], [-97, 26],
    [-97, 20], [-90, 16], [-84, 10], [-78, 8], [-83, 10], [-88, 14],
    [-92, 16], [-105, 20], [-110, 24], [-115, 30], [-122, 37], [-125, 45],
    [-130, 52], [-140, 60], [-152, 60], [-160, 56], [-168, 65],
  ],
  // Greenland
  [
    [-44, 60], [-35, 65], [-20, 72], [-18, 77], [-25, 82], [-40, 83],
    [-55, 82], [-60, 76], [-55, 68], [-44, 60],
  ],
  // South America
  [
    [-77, 8], [-72, 12], [-62, 11], [-50, 2], [-44, -2], [-35, -5],
    [-35, -10], [-38, -14], [-40, -22], [-48, -28], [-53, -33], [-58, -38],
    [-65, -45], [-66, -55], [-72, -54], [-75, -48], [-74, -40], [-72, -30],
    [-71, -20], [-78, -10], [-81, -5], [-80, 2], [-77, 8],
  ],
  // Europe & Scandinavia
  [
    [-9, 36], [-9, 43], [-2, 44], [-5, 48], [2, 51], [8, 54],
    [10, 58], [5, 62], [15, 68], [28, 71], [35, 68], [30, 60],
    [25, 54], [20, 45], [15, 40], [20, 37], [26, 40], [30, 46],
    [40, 45], [42, 42], [35, 36], [28, 36], [22, 39], [15, 38],
    [4, 43], [-1, 38], [-6, 36], [-9, 36],
  ],
  // United Kingdom & Ireland
  [
    [-5, 50], [1.5, 51], [0, 54], [-2, 58], [-5, 59], [-6, 55],
    [-4, 52], [-5, 50],
  ],
  [
    [-10, 52], [-6, 52], [-6, 55], [-10, 54], [-10, 52],
  ],
  // Africa
  [
    [-6, 36], [0, 36], [10, 37], [12, 33], [25, 32], [32, 31],
    [34, 28], [39, 21], [43, 13], [51, 12], [45, 5], [40, -3],
    [36, -12], [35, -24], [32, -28], [28, -32], [20, -35], [18, -34],
    [14, -28], [12, -18], [12, -6], [9, 4], [3, 6], [-5, 5],
    [-12, 8], [-17, 15], [-15, 23], [-13, 28], [-6, 36],
  ],
  // Madagascar
  [
    [49, -12], [50, -16], [47, -25], [44, -25], [44, -18], [49, -12],
  ],
  // Asia (Mainland & Subcontinent)
  [
    [35, 36], [42, 42], [50, 40], [55, 30], [58, 25], [60, 22],
    [68, 24], [72, 20], [77, 10], [80, 13], [85, 20], [90, 22],
    [98, 16], [100, 10], [104, 2], [106, 10], [108, 16], [108, 22],
    [118, 24], [122, 30], [122, 38], [128, 38], [130, 42], [135, 48],
    [142, 53], [145, 59], [160, 58], [170, 65], [175, 68], [170, 71],
    [140, 73], [110, 74], [90, 76], [70, 72], [60, 68], [55, 60],
    [50, 52], [42, 48], [35, 36],
  ],
  // Japan
  [
    [130, 32], [133, 35], [140, 36], [141, 41], [144, 44], [141, 45],
    [139, 41], [135, 35], [130, 32],
  ],
  // Indonesia / Maritime SE Asia
  [
    [96, 5], [104, -5], [106, -7], [114, -8], [118, -8], [112, -7],
    [106, -6], [98, 2], [96, 5],
  ],
  [
    [110, 2], [118, 5], [118, 0], [114, -4], [110, -3], [110, 2],
  ],
  // Australia & New Zealand
  [
    [114, -22], [118, -35], [135, -35], [140, -38], [150, -37], [153, -28],
    [146, -18], [142, -11], [136, -12], [130, -14], [124, -16], [114, -22],
  ],
  [
    [174, -36], [178, -38], [175, -41], [170, -44], [167, -46], [170, -42],
    [174, -36],
  ],
];

/**
 * Checks if a (lon, lat) coordinate falls inside any continental polygon.
 */
export function isPointInsideAnyContinent(lon: number, lat: number): boolean {
  for (const polygon of CONTINENTAL_POLYGONS) {
    if (isPointInPolygon(lon, lat, polygon)) {
      return true;
    }
  }
  return false;
}

function isPointInPolygon(
  x: number,
  y: number,
  poly: [number, number][],
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export interface GlobeDot {
  x: number;
  y: number;
  z: number;
  isLand: boolean;
  baseRadius: number;
}

/**
 * Generates 1,300 Fibonacci-distributed points across the sphere.
 * Uses golden ratio spiral to create an even, organic lattice of points.
 */
export function generateFibonacciGlobeDots(count: number = 1350): GlobeDot[] {
  const dots: GlobeDot[] = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  const angleIncrement = 2 * Math.PI * goldenRatio;

  for (let i = 0; i < count; i++) {
    // y goes from 1 to -1
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = angleIncrement * i;

    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;

    const [lat, lon] = unitVector3ToLatLon(x, y, z);
    const isLand = isPointInsideAnyContinent(lon, lat);

    dots.push({
      x,
      y,
      z,
      isLand,
      baseRadius: isLand ? 1.45 : 1.05,
    });
  }

  return dots;
}

/**
 * Computes 3D points along a curved arc between two unit vectors.
 * Uses spherical interpolation (slerp) with altitude elevation.
 */
export function calculateCurvedArc3D(
  startUnit: [number, number, number],
  endUnit: [number, number, number],
  numSamples: number = 36,
): [number, number, number][] {
  const [ax, ay, az] = startUnit;
  const [bx, by, bz] = endUnit;

  // Dot product and angle between vectors
  let dot = ax * bx + ay * by + az * bz;
  dot = Math.max(-1, Math.min(1, dot));
  const omega = Math.acos(dot);

  const points: [number, number, number][] = [];
  const sinOmega = Math.sin(omega);

  // Maximum altitude of the arc depends on distance
  const maxAltitude = Math.min(0.24, omega * 0.16);

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;

    let px: number, py: number, pz: number;

    if (sinOmega > 0.0001) {
      const scaleA = Math.sin((1 - t) * omega) / sinOmega;
      const scaleB = Math.sin(t * omega) / sinOmega;
      px = scaleA * ax + scaleB * bx;
      py = scaleA * ay + scaleB * by;
      pz = scaleA * az + scaleB * bz;
    } else {
      px = ax + t * (bx - ax);
      py = ay + t * (by - ay);
      pz = az + t * (bz - az);
    }

    // Parabolic altitude lift off the surface
    const altitude = 1 + Math.sin(t * Math.PI) * maxAltitude;

    // Normalize and scale by altitude
    const len = Math.sqrt(px * px + py * py + pz * pz) || 1;
    points.push([
      (px / len) * altitude,
      (py / len) * altitude,
      (pz / len) * altitude,
    ]);
  }

  return points;
}

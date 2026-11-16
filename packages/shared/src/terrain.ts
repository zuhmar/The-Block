// One authored terrain model for server rules, the world renderer and the map.
export interface TerrainPoint {
  x: number;
  y: number;
}
export interface TerrainRect extends TerrainPoint {
  width: number;
  height: number;
}
export interface Route {
  name: string;
  width: number;
  points: TerrainPoint[];
}
const pt = (pairs: number[][]) => pairs.map(([x, y]) => ({ x, y }));
const coastControls = pt([
  [45, 170],
  [650, 35],
  [1550, 80],
  [2450, 30],
  [3400, 110],
  [4400, 45],
  [5500, 100],
  [6150, 220],
  [6800, 80],
  [7350, 230],
  [7800, 120],
  [8370, 430],
  [8810, 310],
  [9280, 720],
  [9440, 1350],
  [9220, 1840],
  [9360, 2380],
  [9090, 2900],
  [9230, 3500],
  [8830, 3880],
  [8750, 4500],
  [8220, 4800],
  [8100, 5270],
  [7540, 5390],
  [7240, 5860],
  [6650, 6150],
  [6120, 5990],
  [5500, 6210],
  [4910, 5860],
  [4300, 6050],
  [3750, 5710],
  [3100, 5950],
  [2610, 5550],
  [2010, 5680],
  [1680, 5170],
  [1110, 5090],
  [950, 4550],
  [450, 4370],
  [350, 3890],
  [80, 3520],
  [100, 2820],
  [35, 2250],
  [85, 1640],
  [35, 1070],
]);
export const COAST = smoothPath([...coastControls, coastControls[0]], 24);
export const ROUTES: Route[] = [
  {
    name: "Coast Road",
    width: 192,
    points: pt([
      [130, 976],
      [900, 950],
      [1750, 1060],
      [2750, 960],
      [3900, 1020],
      [4950, 950],
      [5900, 1040],
      [6600, 980],
      [7104, 976],
      [7850, 1120],
      [8600, 1030],
      [9030, 1170],
    ]),
  },
  {
    name: "Mill Road",
    width: 160,
    points: pt([
      [140, 2160],
      [1700, 2220],
      [2900, 2100],
      [4100, 2260],
      [5300, 2080],
      [6250, 2160],
      [6860, 2280],
      [7600, 2500],
      [8500, 2630],
    ]),
  },
  {
    name: "South Pass",
    width: 192,
    points: pt([
      [2496, 180],
      [2530, 700],
      [2470, 1400],
      [2510, 2100],
      [2496, 2900],
      [2600, 3450],
      [2940, 3910],
      [3600, 4230],
      [4800, 4400],
      [5600, 4760],
      [6060, 5380],
      [6300, 5790],
    ]),
  },
  {
    name: "Woodland Loop",
    width: 144,
    points: pt([
      [8600, 1030],
      [8690, 1740],
      [8500, 2630],
      [8260, 3350],
      [8100, 3980],
      [7560, 4450],
      [6670, 4670],
      [5710, 4520],
      [4800, 4400],
      [3660, 4480],
      [2900, 4630],
      [2190, 4470],
      [1590, 4020],
      [1190, 3540],
      [700, 3280],
    ]),
  },
];
export function smoothPath(points: readonly TerrainPoint[], step = 24) {
  const out: TerrainPoint[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[Math.max(0, i - 1)],
      b = points[i],
      c = points[i + 1],
      d = points[Math.min(points.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(c.x - b.x, c.y - b.y) / step));
    for (let j = 0; j < n; j++) {
      const t = j / n,
        t2 = t * t,
        t3 = t2 * t;
      const v = (k: "x" | "y") =>
        0.5 *
        (2 * b[k] +
          (-a[k] + c[k]) * t +
          (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 +
          (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t3);
      out.push({ x: v("x"), y: v("y") });
    }
  }
  out.push({ ...points[points.length - 1] });
  return out;
}
export const ROADS = ROUTES.map((r) => ({
  ...r,
  points: smoothPath(r.points),
}));
export const RIVER = smoothPath(
  pt([
    [6480, 80],
    [6500, 650],
    [6450, 1300],
    [6440, 2100],
    [6410, 2820],
    [6440, 3450],
    [6500, 4200],
    [6370, 4870],
    [6570, 5480],
    [6670, 6200],
  ]),
);
export const LAKES = [
  pt([
    [7640, 2910],
    [7830, 2760],
    [7980, 2860],
    [8040, 3130],
    [7900, 3310],
    [7680, 3210],
    [7560, 3040],
  ]),
];
export const CLIFFS = [
  { x: 6000, y: 3420, width: 290, height: 110 },
  { x: 5940, y: 3550, width: 260, height: 110 },
  { x: 6000, y: 3670, width: 290, height: 115 },
  { x: 6900, y: 5300, width: 400, height: 130 },
  { x: 7200, y: 5180, width: 350, height: 125 },
  { x: 7920, y: 550, width: 360, height: 120 },
];
const polygonCache = new WeakMap<
  readonly TerrainPoint[],
  {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    rows: Map<number, [TerrainPoint, TerrainPoint][]>;
  }
>();
export function pointInPolygon(
  p: TerrainPoint,
  points: readonly TerrainPoint[],
) {
  let index = polygonCache.get(points);
  if (!index) {
    index = {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
      rows: new Map(),
    };
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i],
        b = points[j];
      index.minX = Math.min(index.minX, a.x);
      index.maxX = Math.max(index.maxX, a.x);
      index.minY = Math.min(index.minY, a.y);
      index.maxY = Math.max(index.maxY, a.y);
      for (
        let row = Math.floor(Math.min(a.y, b.y) / 128);
        row <= Math.floor(Math.max(a.y, b.y) / 128);
        row++
      ) {
        const edges = index.rows.get(row) || [];
        edges.push([a, b]);
        index.rows.set(row, edges);
      }
    }
    polygonCache.set(points, index);
  }
  if (
    p.x < index.minX ||
    p.x > index.maxX ||
    p.y < index.minY ||
    p.y > index.maxY
  )
    return false;
  let inside = false;
  for (const [a, b] of index.rows.get(Math.floor(p.y / 128)) || [])
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  return inside;
}
export function segmentDistance(
  p: TerrainPoint,
  a: TerrainPoint,
  b: TerrainPoint,
) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    t = Math.max(
      0,
      Math.min(
        1,
        ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
      ),
    );
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
export function pathNear(
  p: TerrainPoint,
  points: readonly TerrainPoint[],
  radius: number,
) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    if (
      p.x < Math.min(a.x, b.x) - radius ||
      p.x > Math.max(a.x, b.x) + radius ||
      p.y < Math.min(a.y, b.y) - radius ||
      p.y > Math.max(a.y, b.y) + radius
    )
      continue;
    if (segmentDistance(p, a, b) <= radius) return true;
  }
  return false;
}
export const onRoad = (p: TerrainPoint, padding = 0) =>
  ROADS.some((r) => pathNear(p, r.points, r.width / 2 + padding));
export const onBridge = (p: TerrainPoint) =>
  pathNear(p, RIVER, 145) && onRoad(p, -12);
export function isWater(p: TerrainPoint) {
  return (
    !pointInPolygon(p, COAST) ||
    LAKES.some((l) => pointInPolygon(p, l)) ||
    (pathNear(p, RIVER, 74) && !onBridge(p))
  );
}
export function terrainBlocked(p: TerrainPoint, padding = 12) {
  if (isWater(p)) return true;
  if (
    !onBridge(p) &&
    [
      [-padding, 0],
      [padding, 0],
      [0, -padding],
      [0, padding],
    ].some(([x, y]) => isWater({ x: p.x + x, y: p.y + y }))
  )
    return true;
  return CLIFFS.some(
    (r) =>
      p.x >= r.x - padding &&
      p.x <= r.x + r.width + padding &&
      p.y >= r.y - padding &&
      p.y <= r.y + r.height + padding,
  );
}
function inBox(p: TerrainPoint, r: TerrainRect) {
  return (
    p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height
  );
}
function corners(r: TerrainRect) {
  return [
    { x: r.x, y: r.y },
    { x: r.x + r.width, y: r.y },
    { x: r.x + r.width, y: r.y + r.height },
    { x: r.x, y: r.y + r.height },
  ];
}
function segmentBox(a: TerrainPoint, b: TerrainPoint, r: TerrainRect) {
  let lo = 0,
    hi = 1;
  const dx = b.x - a.x,
    dy = b.y - a.y;
  for (const [p, q] of [
    [-dx, a.x - r.x],
    [dx, r.x + r.width - a.x],
    [-dy, a.y - r.y],
    [dy, r.y + r.height - a.y],
  ]) {
    if (Math.abs(p) < 1e-9) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) lo = Math.max(lo, t);
      else hi = Math.min(hi, t);
      if (lo > hi) return false;
    }
  }
  return true;
}
function pathBox(
  points: readonly TerrainPoint[],
  r: TerrainRect,
  radius: number,
  closed = false,
) {
  const cs = corners(r),
    pointBoxDistance = (p: TerrainPoint) =>
      Math.hypot(
        Math.max(r.x - p.x, 0, p.x - r.x - r.width),
        Math.max(r.y - p.y, 0, p.y - r.y - r.height),
      );
  for (let i = 0; i < points.length - (closed ? 0 : 1); i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    if (
      Math.max(a.x, b.x) + radius < r.x ||
      Math.min(a.x, b.x) - radius > r.x + r.width ||
      Math.max(a.y, b.y) + radius < r.y ||
      Math.min(a.y, b.y) - radius > r.y + r.height
    )
      continue;
    if (
      segmentBox(a, b, r) ||
      pointBoxDistance(a) <= radius ||
      pointBoxDistance(b) <= radius ||
      cs.some((c) => segmentDistance(c, a, b) <= radius)
    )
      return true;
  }
  return false;
}
export const roadOverlapsRect = (r: TerrainRect, padding = 32) =>
  ROADS.some((road) => pathBox(road.points, r, road.width / 2 + padding));
export function terrainRectBlocked(r: TerrainRect) {
  const cs = corners(r);
  if (cs.some((p) => !pointInPolygon(p, COAST)) || pathBox(COAST, r, 0, true))
    return true;
  if (
    LAKES.some(
      (l) =>
        cs.some((p) => pointInPolygon(p, l)) ||
        l.some((p) => inBox(p, r)) ||
        pathBox(l, r, 0, true),
    )
  )
    return true;
  if (pathBox(RIVER, r, 74)) return true;
  return CLIFFS.some(
    (c) =>
      r.x < c.x + c.width &&
      r.x + r.width > c.x &&
      r.y < c.y + c.height &&
      r.y + r.height > c.y,
  );
}
export const terrainObstruction = (a: TerrainPoint, b: TerrainPoint) =>
  CLIFFS.some((r) => segmentBox(a, b, r));
let treeCache:
  | { x: number; y: number; variant: number; scale: number }[]
  | undefined;
export function forestTrees() {
  if (treeCache) return treeCache;
  const trees: { x: number; y: number; variant: number; scale: number }[] = [];
  let seed = 78231;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let y = 96; y < 6300; y += 80)
    for (let x = 96; x < 9500; x += 80) {
      const p = { x: x + random() * 36 - 18, y: y + random() * 36 - 18 };
      const clearing =
        Math.sin(x / 540) * Math.cos(y / 390) + Math.sin((x + y) / 760);
      if (
        (p.x <= 6400 && p.y <= 3200) ||
        onRoad(p, 90) ||
        terrainBlocked(p, 45) ||
        clearing < 0.05 ||
        Math.hypot(p.x - 7104, (p.y - 1400) * 1.6) < 550 ||
        random() < 0.22
      )
        continue;
      trees.push({
        ...p,
        variant: Math.floor(random() * 4),
        scale: 0.8 + random() * 0.35,
      });
    }
  treeCache = trees;
  return trees;
}
export function treeOverlapsRect(r: TerrainRect) {
  return forestTrees().some(
    (p) =>
      p.x + 22 > r.x &&
      p.x - 22 < r.x + r.width &&
      p.y + 22 > r.y &&
      p.y - 22 < r.y + r.height,
  );
}

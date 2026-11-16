import {
  fitDetailProps,
  gridEnvelope,
  routeFootprints,
  type PlacementReport,
} from "./map-placement.js";
import { MARKET_QUARTER, inMarketQuarter } from "./market-quarter.js";
import {
  MAP_SIZE,
  CITY,
  BUILDINGS,
  MOUNTAIN_REGIONS,
  chunkKey,
  type MapObject,
  LEGACY_BUILDINGS,
  PARKS,
  PARKING_LOTS,
  INDUSTRIAL_YARDS,
  DISTRICTS,
  SERVICE_POINTS,
  CIVIC_PLAZA,
} from "./official-map.js";
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
let reservations: TerrainRect[] = [];
export function setMapReservations(rects: TerrainRect[]) {
  if (JSON.stringify(reservations) !== JSON.stringify(rects)) {
    reservations = rects;
    chunkCache.clear();
  }
}
export function mapReservations() {
  return reservations;
}
export function mapObjectEnabled(o: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  return !reservations.some(
    (r) =>
      o.x + o.width / 2 > r.x &&
      o.x - o.width / 2 < r.x + r.width &&
      o.y + o.height / 2 > r.y &&
      o.y - o.height / 2 < r.y + r.height,
  );
}
export function mapObstacleEnabled(r: TerrainRect) {
  return mapObjectEnabled({
    x: r.x + r.width / 2,
    y: r.y + r.height / 2,
    width: r.width,
    height: r.height,
  });
}
const pt = (pairs: number[][]) => pairs.map(([x, y]) => ({ x, y }));
const coastControls = pt([
  [80, 480],
  [1500, 90],
  [3800, 180],
  [6200, 64],
  [9000, 190],
  [11800, 90],
  [14500, 140],
  [16180, 800],
  [16300, 3200],
  [16170, 5800],
  [16260, 9000],
  [16080, 12300],
  [16200, 15100],
  [15000, 16200],
  [12400, 16120],
  [9800, 16280],
  [7200, 16110],
  [4400, 16200],
  [1800, 16080],
  [200, 15000],
  [90, 12000],
  [190, 8800],
  [70, 5800],
  [180, 3000],
]);
export const COAST = smoothPath([...coastControls, coastControls[0]], 48);
export const RIVER = smoothPath(
  pt([
    [13900, 0],
    [13600, 1800],
    [14000, 3500],
    [13550, 4800],
    [13400, 6500],
    [13620, 8200],
    [13150, 10300],
    [13600, 12100],
    [12900, 14100],
    [13300, 16384],
  ]),
  32,
);
export const STREAM = smoothPath(
  pt([
    [2800, 800],
    [2900, 1600],
    [3150, 2250],
    [3100, 2800],
    [3650, 3300],
    [3900, 3650],
  ]),
  24,
);
export const LAKES = [
  pt([
    [3700, 3400],
    [4100, 3300],
    [4370, 3520],
    [4300, 3900],
    [3950, 4080],
    [3650, 3850],
  ]),
  pt([
    [7000, 13200],
    [7450, 12920],
    [7900, 13100],
    [8000, 13540],
    [7650, 13800],
    [7150, 13650],
  ]),
  pt([
    [14500, 11000],
    [14900, 10850],
    [15200, 11100],
    [15080, 11500],
    [14700, 11600],
    [14420, 11300],
  ]),
];
export const ROUTES: Route[] = [
  {
    name: "Shelter Avenue",
    width: 160,
    points: pt([
      [400, 5400],
      [1800, 5000],
      [3100, 5050],
      [4226, 5072],
      [5000, 5046],
      [5846, 5156],
      [6846, 5056],
      [7996, 5116],
      [9046, 5046],
      [9996, 5136],
      [10696, 5076],
      [11200, 5072],
      [12500, 5300],
      [13600, 5300],
      [14900, 5500],
      [16000, 5200],
    ]),
  },
  {
    name: "Market Avenue",
    width: 160,
    points: pt([
      [3400, 6256],
      [4236, 6256],
      [5796, 6316],
      [6996, 6196],
      [8196, 6356],
      [9396, 6176],
      [10346, 6256],
      [11700, 6500],
      [12800, 6800],
      [13700, 6800],
      [15700, 7200],
    ]),
  },
  {
    name: "Central Road",
    width: 176,
    points: pt([
      [8000, 200],
      [7800, 1500],
      [7200, 2900],
      [6592, 4276],
      [6626, 4796],
      [6566, 5496],
      [6606, 6196],
      [6592, 6996],
      [6696, 7546],
      [7036, 8006],
      [7696, 8326],
      [8896, 8496],
      [9696, 8856],
      [10156, 9476],
      [10396, 9886],
      [10400, 11200],
      [10700, 12800],
      [10200, 14300],
      [10600, 16100],
    ]),
  },
  {
    name: "City Loop",
    width: 144,
    points: pt([
      [4500, 3900],
      [6200, 3650],
      [9000, 3650],
      [11700, 3900],
      [12800, 4700],
      [12800, 7200],
      [12700, 9800],
      [12400, 11600],
      [10000, 11800],
      [7200, 11700],
      [4200, 11200],
      [3650, 9200],
      [3650, 7100],
      [3600, 4800],
      [4500, 3900],
    ]),
  },
  {
    name: "Downtown Boulevard",
    width: 144,
    points: pt([
      [9448, 3650],
      [9448, 4350],
      [9448, 4800],
      [8896, 5072],
      [8896, 6256],
      [8896, 8496],
      [8896, 10560],
      [9200, 11800],
    ]),
  },
  {
    name: "Waterfront Drive",
    width: 144,
    points: pt([
      [11700, 3900],
      [11700, 5300],
      [11700, 6500],
      [11700, 8256],
      [11800, 10560],
      [12400, 11600],
    ]),
  },
  {
    name: "Courtyard Street",
    width: 144,
    points: pt([
      [3650, 8256],
      [5300, 8256],
      [7036, 8006],
      [8896, 8496],
      [10300, 8256],
      [11700, 8256],
      [13300, 8500],
      [14400, 8500],
      [16000, 9000],
    ]),
  },
  {
    name: "Parkway",
    width: 144,
    points: pt([
      [3900, 10560],
      [6600, 10560],
      [8896, 10560],
      [10500, 10560],
      [11800, 10560],
      [13000, 10750],
      [14200, 10800],
    ]),
  },
  {
    name: "West Trail",
    width: 72,
    points: pt([
      [3650, 9200],
      [2600, 9400],
      [1800, 10800],
      [2400, 12200],
      [3400, 13000],
    ]),
  },
  {
    name: "Falls Trail",
    width: 72,
    points: pt([
      [3600, 4800],
      [3200, 4100],
      [2700, 3500],
      [2600, 2900],
      [2200, 2400],
    ]),
  },
];
for (const [i, y] of [8960, 9984, 11008].entries())
  ROUTES.push({
    name: ["Courtyard Lane", "Garden Street", "South Terrace"][i],
    width: 112,
    points: pt([
      [3900, y],
      [6500, y + 18],
      [8896, y],
      [11700, y - 20],
      [12700, y],
    ]),
  });
export const CLIFFS = [
  { x: 2600, y: 1650, width: 360, height: 130 },
  { x: 2860, y: 2080, width: 360, height: 130 },
  { x: 3100, y: 2600, width: 300, height: 120 },
  { x: 14800, y: 2550, width: 380, height: 140 },
  { x: 12100, y: 14500, width: 420, height: 150 },
  { x: 4400, y: 14500, width: 400, height: 140 },
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
  points: smoothPath(r.points, 32),
}));
// New static architecture yields to existing circulation and original service entrances.
for (let i = BUILDINGS.length - 1; i >= 12; i--) {
  const b = BUILDINGS[i];
  if (
    roadOverlapsRect(
      {
        x: b.x - b.width / 2,
        y: b.y - b.height / 2,
        width: b.width,
        height: b.height,
      },
      32,
    )
  )
    BUILDINGS.splice(i, 1);
}
// Street-facing infill establishes readable blocks rather than scattered building icons.
for (const district of DISTRICTS) {
  let serial = 0;
  const spacing =
    district.id === "downtown"
      ? 344
      : district.id === "projects"
        ? 408
        : district.id === "industrial"
          ? 472
          : district.id === "uptown"
            ? 600
            : 392;
  for (const road of ROADS) {
    if (road.width < 100) continue;
    let traveled = 0,
      next = spacing / 2;
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1],
        b = road.points[i],
        length = Math.hypot(b.x - a.x, b.y - a.y);
      traveled += length;
      if (traveled < next) continue;
      next += spacing;
      if (Math.abs(b.y - a.y) > Math.abs(b.x - a.x) * 0.35) continue;
      const width =
          district.id === "downtown"
            ? 288
            : district.id === "projects"
              ? 320
              : district.id === "industrial"
                ? 352
                : 224,
        height =
          district.id === "downtown"
            ? 240
            : district.id === "projects"
              ? 240
              : district.id === "industrial"
                ? 256
                : 192;
      const candidate = {
        x: b.x,
        y: b.y - road.width / 2 - 48 - height / 2,
        width,
        height,
      };
      if (
        candidate.x - width / 2 < district.x ||
        candidate.x + width / 2 > district.x + district.width ||
        candidate.y - height / 2 < district.y ||
        candidate.y + height / 2 > district.y + district.height
      )
        continue;
      if (candidate.x < 6400 && candidate.y < 5100) continue;
      const rect = {
        x: candidate.x - width / 2,
        y: candidate.y - height / 2,
        width,
        height,
      };
      if (
        roadOverlapsRect(rect, 28) ||
        SERVICE_POINTS.some(
          (p) =>
            Math.abs(p.x - candidate.x) < width / 2 + 120 &&
            Math.abs(p.y - candidate.y) < height / 2 + 120,
        )
      )
        continue;
      if (
        [...PARKS, ...PARKING_LOTS, ...INDUSTRIAL_YARDS].some(
          (p) =>
            Math.abs(p.x - candidate.x) < (p.width + width) / 2 + 48 &&
            Math.abs(p.y - candidate.y) < (p.height + height) / 2 + 48,
        )
      )
        continue;
      if (
        BUILDINGS.some(
          (p) =>
            Math.abs(p.x - candidate.x) < (p.width + width) / 2 + 48 &&
            Math.abs(p.y - candidate.y) < (p.height + height) / 2 + 48,
        )
      )
        continue;
      BUILDINGS.push({
        id: "frontage-" + district.id + "-" + serial,
        asset: district.assets[serial++ % district.assets.length],
        ...candidate,
        solid: true,
        kind: "building",
      });
    }
  }
}
// Keep civic buildings as landmarks; the remaining downtown fabric is commerce.
const civic = new Set<string>();
const storefronts = ["cafe", "laundry", "grocery", "books"].map(
  (n) => "map-building-" + n,
);
for (const [i, b] of BUILDINGS.entries()) {
  if (
    b.x < 7040 ||
    b.x >= 9664 ||
    b.y < 4096 ||
    b.y >= 7488 ||
    b.id.startsWith("legacy")
  )
    continue;
  if (
    [
      "map-building-bank",
      "map-building-hospital",
      "map-building-police",
    ].includes(b.asset) &&
    !civic.has(b.asset)
  ) {
    civic.add(b.asset);
    continue;
  }
  if (i % 3 !== 0) b.asset = storefronts[i % storefronts.length];
  else if (
    [
      "map-building-bank",
      "map-building-hospital",
      "map-building-police",
    ].includes(b.asset)
  )
    b.asset = "map-building-office";
}
// Smaller shop footprints fit the gaps between larger public buildings.
for (const district of DISTRICTS.filter((d) => d.id !== "uptown")) {
  let serial = 0;
  const width = district.id === "industrial" ? 224 : 176,
    height = district.id === "industrial" ? 176 : 160;
  const stride = district.id === "downtown" ? 224 : 320;
  for (
    let y = district.y + 224;
    y < district.y + district.height - 224;
    y += 256
  )
    for (
      let x = district.x + 160;
      x < district.x + district.width - 160;
      x += stride
    ) {
      if (x < 6400 && y < 5100) continue;
      const p = { x, y },
        road = nearestRoadPoint(p);
      if (road.distance > 400 || road.distance < road.width / 2 + 90) continue;
      const rect = { x: x - width / 2, y: y - height / 2, width, height };
      if (
        roadOverlapsRect(rect, 36) ||
        SERVICE_POINTS.some(
          (s) =>
            Math.abs(s.x - x) < width / 2 + 140 &&
            Math.abs(s.y - y) < height / 2 + 140,
        )
      )
        continue;
      if (
        [...PARKS, ...PARKING_LOTS, ...INDUSTRIAL_YARDS, ...BUILDINGS].some(
          (b) =>
            Math.abs(b.x - x) < (b.width + width) / 2 + 48 &&
            Math.abs(b.y - y) < (b.height + height) / 2 + 48,
        )
      )
        continue;
      BUILDINGS.push({
        id: "shoprow-" + district.id + "-" + serial,
        x,
        y,
        width,
        height,
        asset:
          district.id === "industrial"
            ? "map-building-workshop"
            : storefronts[serial % storefronts.length],
        solid: true,
        kind: "building",
      });
      serial++;
    }
}
// Avoid identical shopfronts immediately beside one another.
for (const [i, b] of BUILDINGS.entries()) {
  if (!storefronts.includes(b.asset)) continue;
  const neighbors = BUILDINGS.slice(0, i).filter(
    (o) => Math.hypot(o.x - b.x, o.y - b.y) < 400,
  );
  if (neighbors.some((o) => o.asset === b.asset))
    b.asset =
      storefronts.find((asset) => !neighbors.some((o) => o.asset === asset)) ||
      b.asset;
}
// New silhouettes occupy existing safe envelopes, with deliberately varied footprints.
const cityVariants: Record<string, [string, number, number][]> = {
  "the-block": [
    ["kiosk", 96, 104],
    ["bakery", 128, 176],
    ["duplex", 224, 192],
  ],
  downtown: [
    ["kiosk", 96, 104],
    ["bakery", 128, 176],
    ["diner", 240, 160],
    ["corner-office", 224, 192],
  ],
  industrial: [
    ["garage", 288, 176],
    ["brick-warehouse", 352, 256],
  ],
  projects: [
    ["apartment-slab", 320, 240],
    ["duplex", 224, 192],
    ["kiosk", 96, 104],
  ],
  uptown: [
    ["duplex", 224, 192],
    ["corner-office", 224, 192],
  ],
};
const variantCounts = new Map<string, number>();
const retainedRoles = new Set<string>();
for (const [i, b] of BUILDINGS.entries()) {
  if (
    b.id.startsWith("legacy") ||
    ["bank", "hospital", "police"].some((n) => b.asset === "map-building-" + n)
  )
    continue;
  if (
    ["warehouse", "factory", "apartments", "luxury", "premium"].some(
      (n) => b.asset === "map-building-" + n,
    ) &&
    !retainedRoles.has(b.asset)
  ) {
    retainedRoles.add(b.asset);
    continue;
  }
  const d = DISTRICTS.find(
    (d) =>
      b.x >= d.x && b.x < d.x + d.width && b.y >= d.y && b.y < d.y + d.height,
  );
  if (!d || i % 3 === 0) continue;
  const count = variantCounts.get(d.id) || 0;
  variantCounts.set(d.id, count + 1);
  const [asset, width, height] =
    cityVariants[d.id][count % cityVariants[d.id].length];
  if (
    (asset === "apartment-slab" || asset === "brick-warehouse") &&
    b.width < 300
  )
    continue;
  b.asset = "map-building-" + asset;
  b.width = Math.min(b.width, width);
  b.height = Math.min(b.height, height);
}
// Group small shops beside larger neighbors, sharing a clear south frontage.
export const composedShopRows: string[] = [];
for (const b of BUILDINGS) {
  if (b.width > 128 || b.id.startsWith("legacy")) continue;
  const district = DISTRICTS.find(
    (d) =>
      b.x >= d.x && b.x < d.x + d.width && b.y >= d.y && b.y < d.y + d.height,
  );
  if (!district || district.id === "uptown") continue;
  const anchors = BUILDINGS.filter(
    (o) =>
      o !== b &&
      o.width >= 176 &&
      !o.id.startsWith("legacy") &&
      o.x >= district.x &&
      o.x < district.x + district.width &&
      o.y >= district.y &&
      o.y < district.y + district.height &&
      Math.hypot(o.x - b.x, o.y - b.y) < 650,
  ).sort(
    (a, z) =>
      Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(z.x - b.x, z.y - b.y),
  );
  let moved = false;
  for (const anchor of anchors) {
    for (const side of [-1, 1]) {
      const p = {
        x: anchor.x + side * (anchor.width / 2 + b.width / 2 + 72),
        y: anchor.y + anchor.height / 2 - b.height / 2,
      };
      if (
        Math.hypot(p.x - b.x, p.y - b.y) > 300 ||
        p.x - b.width / 2 < district.x ||
        p.x + b.width / 2 > district.x + district.width ||
        p.y - b.height / 2 < district.y ||
        p.y + b.height / 2 > district.y + district.height
      )
        continue;
      const r = {
        x: p.x - b.width / 2,
        y: p.y - b.height / 2,
        width: b.width,
        height: b.height,
      };
      if (
        roadOverlapsRect(r, 40) ||
        SERVICE_POINTS.some(
          (o) =>
            Math.abs(o.x - p.x) < b.width / 2 + 140 &&
            Math.abs(o.y - p.y) < b.height / 2 + 140,
        )
      )
        continue;
      if (
        [
          ...BUILDINGS.filter((o) => o !== b),
          ...PARKS,
          ...PARKING_LOTS,
          ...INDUSTRIAL_YARDS,
        ].some(
          (o) =>
            Math.abs(o.x - p.x) < (o.width + b.width) / 2 + 48 &&
            Math.abs(o.y - p.y) < (o.height + b.height) / 2 + 48,
        )
      )
        continue;
      b.x = p.x;
      b.y = p.y;
      composedShopRows.push(b.id);
      moved = true;
      break;
    }
    if (moved) break;
  }
}
export const authoredMarketBuildings: string[] = [];
for (const plan of MARKET_QUARTER.buildings) {
  const b = BUILDINGS.find((b) => b.id === plan.id)!;
  const rect = {
    x: plan.x - plan.width / 2,
    y: plan.y - plan.height / 2,
    width: plan.width,
    height: plan.height,
  };
  // Authored positions must pass the same circulation constraints as generated architecture.
  if (roadOverlapsRect(rect, 32))
    throw Error("Market building overlaps road: " + b.id);
  Object.assign(b, plan);
  authoredMarketBuildings.push(b.id);
}
for (const id of authoredMarketBuildings) {
  const b = BUILDINGS.find((o) => o.id === id)!;
  if (
    BUILDINGS.some(
      (o) =>
        o !== b &&
        Math.abs(o.x - b.x) < (o.width + b.width) / 2 + 32 &&
        Math.abs(o.y - b.y) < (o.height + b.height) / 2 + 32,
    )
  )
    throw Error("Market building crowds its neighbor: " + id);
}
export interface BlockSpace extends TerrainRect {
  id: string;
  buildings: MapObject[];
  kind: "courtyard" | "alley" | "service";
}
let spaces: BlockSpace[] | undefined;
export function blockSpaces(): BlockSpace[] {
  if (spaces) return spaces;
  spaces = [];
  for (const a of BUILDINGS) {
    const district = DISTRICTS.find(
      (d) =>
        a.x >= d.x && a.x < d.x + d.width && a.y >= d.y && a.y < d.y + d.height,
    );
    if (!district || district.id === "uptown" || a.id.startsWith("legacy"))
      continue;
    for (const b of BUILDINGS) {
      if (
        b.x <= a.x ||
        b.id.startsWith("legacy") ||
        b.x >= district.x + district.width ||
        b.x < district.x ||
        b.y < district.y ||
        b.y >= district.y + district.height
      )
        continue;
      const gap = b.x - b.width / 2 - (a.x + a.width / 2);
      if (
        Math.abs(a.y + a.height / 2 - (b.y + b.height / 2)) > 80 ||
        gap < 64 ||
        gap > 320
      )
        continue;
      const r = {
        x: a.x + a.width / 2,
        y: Math.max(a.y - a.height / 2, b.y - b.height / 2),
        width: gap,
        height:
          Math.min(a.y + a.height / 2, b.y + b.height / 2) -
          Math.max(a.y - a.height / 2, b.y - b.height / 2),
      };
      if (
        r.height < 128 ||
        roadOverlapsRect(r, 24) ||
        PARKS.some(
          (p) =>
            Math.abs(p.x - r.x - r.width / 2) < (p.width + r.width) / 2 &&
            Math.abs(p.y - r.y - r.height / 2) < (p.height + r.height) / 2,
        )
      )
        continue;
      if (
        BUILDINGS.some(
          (o) =>
            o !== a &&
            o !== b &&
            Math.abs(o.x - r.x - r.width / 2) < (o.width + r.width) / 2 + 8 &&
            Math.abs(o.y - r.y - r.height / 2) < (o.height + r.height) / 2 + 8,
        )
      )
        continue;
      spaces.push({
        id: "block-space-" + a.id + "-" + b.id,
        ...r,
        buildings: [a, b],
        kind:
          district.id === "industrial"
            ? "service"
            : gap >= 176
              ? "courtyard"
              : "alley",
      });
    }
  }
  return spaces;
}
const automaticPlazaGardens: TerrainRect[] = [
  { x: CIVIC_PLAZA.x + 184, y: CIVIC_PLAZA.y + 184, width: 160, height: 72 },
  { x: CIVIC_PLAZA.x + 568, y: CIVIC_PLAZA.y + 184, width: 160, height: 72 },
  { x: CIVIC_PLAZA.x + 184, y: CIVIC_PLAZA.y + 440, width: 160, height: 72 },
  { x: CIVIC_PLAZA.x + 568, y: CIVIC_PLAZA.y + 440, width: 160, height: 72 },
].filter(
  (r) =>
    !roadOverlapsRect(r, 56) &&
    !BUILDINGS.some(
      (b) =>
        Math.abs(b.x - r.x - r.width / 2) < (b.width + r.width) / 2 + 56 &&
        Math.abs(b.y - r.y - r.height / 2) < (b.height + r.height) / 2 + 56,
    ) &&
    !SERVICE_POINTS.some(
      (p) =>
        p.x > r.x - 112 &&
        p.x < r.x + r.width + 112 &&
        p.y > r.y - 112 &&
        p.y < r.y + r.height + 112,
    ),
);
export const PLAZA_GARDENS: TerrainRect[] = [
  ...MARKET_QUARTER.gardens,
  ...automaticPlazaGardens.filter(
    (r) => !inMarketQuarter({ x: r.x + r.width / 2, y: r.y + r.height / 2 }),
  ),
];

let connections:
  | { building: MapObject; points: TerrainPoint[]; width: number }[]
  | undefined;
export function buildingWalkways() {
  if (connections) return connections;
  connections = [];
  for (const b of BUILDINGS) {
    const start = { x: b.x, y: b.y + b.height / 2 + 3 },
      road = nearestRoadPoint(start);
    if (road.distance > 740 || road.distance < road.width / 2) continue;
    const length = road.distance,
      end = {
        x: road.x - ((road.x - start.x) / length) * (road.width / 2 + 7),
        y: road.y - ((road.y - start.y) / length) * (road.width / 2 + 7),
      };
    const side = b.x + b.width / 2 + 40;
    const points =
      end.y < b.y + b.height / 2
        ? [
            start,
            { x: start.x, y: start.y + 26 },
            { x: side, y: start.y + 26 },
            { x: side, y: end.y },
            end,
          ]
        : [
            start,
            { x: start.x, y: start.y + 26 },
            { x: end.x, y: start.y + 26 },
            end,
          ];
    if (
      BUILDINGS.some(
        (o) =>
          o.id !== b.id &&
          points.slice(1).some((p, i) =>
            segmentBox(points[i], p, {
              x: o.x - o.width / 2 - 8,
              y: o.y - o.height / 2 - 8,
              width: o.width + 16,
              height: o.height + 16,
            }),
          ),
      )
    )
      continue;
    connections.push({
      building: b,
      points,
      width:
        DISTRICTS.find(
          (d) =>
            b.x >= d.x &&
            b.x < d.x + d.width &&
            b.y >= d.y &&
            b.y < d.y + d.height,
        )?.id === "downtown"
          ? 72
          : DISTRICTS.find(
                (d) =>
                  b.x >= d.x &&
                  b.x < d.x + d.width &&
                  b.y >= d.y &&
                  b.y < d.y + d.height,
              )?.id === "uptown"
            ? 44
            : 52,
    });
  }
  return connections;
}
export let sceneryPlacementReport: PlacementReport = { moved: [], omitted: [] };
export function nearestRoadPoint(p: TerrainPoint) {
  let nearest = { x: p.x, y: p.y, distance: Infinity, width: 0 };
  for (const road of ROADS) {
    if (road.width < 100) continue;
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1],
        b = road.points[i],
        dx = b.x - a.x,
        dy = b.y - a.y,
        t = Math.max(
          0,
          Math.min(
            1,
            ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
          ),
        ),
        x = a.x + dx * t,
        y = a.y + dy * t,
        distance = Math.hypot(p.x - x, p.y - y);
      if (distance < nearest.distance)
        nearest = { x, y, distance, width: road.width };
    }
  }
  return nearest;
}
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
export function onRoad(p: TerrainPoint, padding = 0) {
  return ROADS.some((r) => pathNear(p, r.points, r.width / 2 + padding));
}
export const DOCKS = [4700, 5300, 5900, 6500, 7100].map((y) => {
  const r = RIVER.reduce((a, b) =>
    Math.abs(a.y - y) < Math.abs(b.y - y) ? a : b,
  );
  return {
    id: "dock-" + y,
    x: r.x - 110,
    y,
    width: 384,
    height: 160,
    asset: "map-prop-0",
    rotation: 90,
    kind: "decoration" as const,
  };
});
export const onBridge = (p: TerrainPoint) =>
  ((pathNear(p, RIVER, 300) || pathNear(p, STREAM, 90)) && onRoad(p, -12)) ||
  DOCKS.some(
    (r) =>
      Math.abs(p.x - r.x) < r.width / 2 - 12 &&
      Math.abs(p.y - r.y) < r.height / 2 - 12,
  );
export function isWater(p: TerrainPoint) {
  return (
    !pointInPolygon(p, COAST) ||
    LAKES.some((l) => pointInPolygon(p, l)) ||
    ((pathNear(p, RIVER, 224) || pathNear(p, STREAM, 42)) && !onBridge(p))
  );
}
function naturalBlocked(p: TerrainPoint, padding = 12) {
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
export function roadOverlapsRect(r: TerrainRect, padding = 32) {
  return ROADS.some((road) =>
    pathBox(road.points, r, road.width / 2 + padding),
  );
}
export function terrainRectBlocked(r: TerrainRect) {
  if (
    reservations.some(
      (a) =>
        r.x >= a.x &&
        r.y >= a.y &&
        r.x + r.width <= a.x + a.width &&
        r.y + r.height <= a.y + a.height,
    )
  )
    return false;
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
  if (pathBox(RIVER, r, 224) || pathBox(STREAM, r, 42)) return true;
  return CLIFFS.some(
    (c) =>
      r.x < c.x + c.width &&
      r.x + r.width > c.x &&
      r.y < c.y + c.height &&
      r.y + r.height > c.y,
  );
}
export const terrainObstruction = (a: TerrainPoint, b: TerrainPoint) =>
  CLIFFS.some((r) => segmentBox(a, b, r)) ||
  solidObjectsNear({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  }).some((o) =>
    segmentBox(a, b, {
      x: o.x - o.width / 2,
      y: o.y - o.height / 2,
      width: o.width,
      height: o.height,
    }),
  );

export function mountainBlend(p: TerrainPoint) {
  if (Math.hypot(p.x - 7104, p.y - 1344) < 800) return 0;
  let a = 0;
  for (const r of MOUNTAIN_REGIONS) {
    const nx = (p.x - r.x - r.width / 2) / (r.width / 2),
      ny = (p.y - r.y - r.height / 2) / (r.height / 2);
    a = Math.max(
      a,
      Math.min(
        1,
        Math.max(
          0,
          (0.82 + Math.sin(p.x / 280) * 0.09 - nx * nx - ny * ny) * 3,
        ),
      ),
    );
  }
  return a;
}
export function mountainRegion(p: TerrainPoint) {
  if (Math.hypot(p.x - 7104, p.y - 1344) < 800) return false;
  return MOUNTAIN_REGIONS.some((r) => {
    const nx = (p.x - r.x - r.width / 2) / (r.width / 2),
      ny = (p.y - r.y - r.height / 2) / (r.height / 2);
    return nx * nx + ny * ny < 0.82 + Math.sin(p.x / 280) * 0.09;
  });
}
let objectsCache: MapObject[] | undefined;
const objectBins = new Map<string, MapObject[]>();
const insideCity = (p: TerrainPoint) =>
  p.x >= CITY.x &&
  p.x <= CITY.x + CITY.width &&
  p.y >= CITY.y &&
  p.y <= CITY.y + CITY.height;
export function mapObjects(): MapObject[] {
  if (objectsCache) return objectsCache;
  const out: MapObject[] = [];
  let seed = 82371;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  // Sparse woodland: trunks roughly 200–400 pixels apart, with broad unmarked grassland.
  for (let y = 192; y < MAP_SIZE - 160; y += 224)
    for (let x = 192; x < MAP_SIZE - 160; x += 224) {
      const p = { x: x + random() * 100 - 50, y: y + random() * 100 - 50 };
      if (naturalBlocked(p, 65) || onRoad(p, 140)) continue;
      if (insideCity(p) || Math.hypot(p.x - 7104, p.y - 1344) < 650) continue;
      const mountain = mountainRegion(p),
        cluster =
          Math.sin(x / 610) * Math.cos(y / 730) + Math.sin((x + y) / 1130);
      if (mountain) {
        if (random() >= 0.32) random();
        continue;
      } else if (cluster > 0.05 && random() < 0.3) {
        out.push({
          id: "tree-" + x + "-" + y,
          ...p,
          width: 64,
          height: 64,
          asset: "map-nature-" + (random() < 0.5 ? 0 : 1),
          solid: true,
          kind: "tree",
        });
      } else if (random() < 0.12) {
        out.push({
          id: "rock-" + x + "-" + y,
          ...p,
          width: 70,
          height: 48,
          asset: "map-nature-" + (random() < 0.5 ? 4 : 5),
          solid: true,
          kind: "rock",
        });
      } else if (random() < 0.16)
        out.push({
          id: "detail-" + x + "-" + y,
          ...p,
          width: 54,
          height: 40,
          asset: "map-nature-" + [2, 3, 6, 7][Math.floor(random() * 4)],
          kind: "decoration",
        });
    }
  for (const [region, r] of MOUNTAIN_REGIONS.entries())
    for (let row = -1; row <= 1; row++)
      for (let step = 0; step <= Math.floor(r.width / 210); step++) {
        const t = step / Math.floor(r.width / 210),
          p = {
            x: r.x + 150 + t * (r.width - 300),
            y:
              r.y +
              r.height / 2 +
              row * r.height * 0.22 +
              Math.sin(t * Math.PI * 2 + region * 0.7) * r.height * 0.13,
          };
        if (!mountainRegion(p) || naturalBlocked(p, 100) || onRoad(p, 260))
          continue;
        const foothill = row === 1,
          variant = foothill ? 10 : step % 4 === 0 ? 9 : 8;
        out.push({
          id: "ridge-" + region + "-" + row + "-" + step,
          ...p,
          width: foothill ? 360 : 430,
          height: foothill ? 220 : 290,
          asset: "map-nature-" + variant,
          solid: true,
          kind: "mountain",
        });
      }
  CLIFFS.forEach((r, i) =>
    out.push({
      id: "cliff-" + i,
      x: r.x + r.width / 2,
      y: r.y + r.height / 2,
      width: r.width,
      height: r.height,
      asset: "map-nature-" + (12 + (i % 2)),
      solid: true,
      kind: "cliff",
    }),
  );
  out.push(
    {
      id: "falls-nw",
      x: 2910,
      y: 2100,
      width: 320,
      height: 330,
      asset: "map-nature-14",
      kind: "waterfall",
    },
    {
      id: "falls-stream",
      x: 3210,
      y: 2690,
      width: 230,
      height: 260,
      asset: "map-nature-15",
      kind: "waterfall",
    },
  );
  out.push(...DOCKS);
  for (let y = 4700; y < 7300; y += 600) {
    out.push(
      {
        id: "crane-" + y,
        x:
          RIVER.reduce((a, b) =>
            Math.abs(a.y - y) < Math.abs(b.y - y) ? a : b,
          ).x - 390,
        y,
        width: 220,
        height: 260,
        asset: "map-prop-1",
        kind: "decoration",
      },
      {
        id: "cargo-" + y,
        x: 12400,
        y: y + 220,
        width: 190,
        height: 110,
        asset: "map-prop-2",
        solid: true,
        kind: "rock",
      },
    );
  }
  for (const p of PARKING_LOTS)
    for (let i = 0; i < 4; i++)
      out.push({
        id: "parked-car-" + p.x + "-" + i,
        x: p.x - 216 + i * 144,
        y: p.y + 26,
        width: 72,
        height: 128,
        asset: "map-prop-6",
        solid: true,
        kind: "rock",
      });
  for (const p of INDUSTRIAL_YARDS) {
    out.push(
      {
        id: "yard-tank-" + p.x,
        x: p.x - 140,
        y: p.y - 55,
        width: 140,
        height: 170,
        asset: "map-prop-7",
        solid: true,
        kind: "rock",
      },
      {
        id: "yard-cargo-" + p.x,
        x: p.x + 50,
        y: p.y + 120,
        width: 130,
        height: 100,
        asset: "map-prop-8",
        solid: true,
        kind: "rock",
      },
      {
        id: "yard-wreck-" + p.x,
        x: p.x + 200,
        y: p.y - 100,
        width: 70,
        height: 120,
        asset: "map-prop-6",
        solid: true,
        kind: "rock",
      },
    );
  }
  for (const [i, p] of PARKS.entries()) {
    out.push({
      id: "park-fountain-" + i,
      x: p.x,
      y: p.y,
      width: 150,
      height: 140,
      asset: "map-prop-3",
      solid: true,
      kind: "rock",
    });
    for (let j = 0; j < 14; j++) {
      const angle = (j / 14) * Math.PI * 2,
        q = {
          x: p.x + Math.cos(angle) * (p.width / 2 - 55),
          y: p.y + Math.sin(angle) * (p.height / 2 - 48),
        };
      if (
        onRoad(q, 90) ||
        BUILDINGS.some(
          (b) =>
            Math.abs(b.x - q.x) < b.width / 2 + 70 &&
            Math.abs(b.y - q.y) < b.height / 2 + 70,
        )
      )
        continue;
      out.push({
        id: "park-tree-" + i + "-" + j,
        ...q,
        width: 64,
        height: 64,
        asset: "map-nature-0",
        solid: true,
        kind: "tree",
      });
    }
    out.push({
      id: "park-bench-" + i,
      x: p.x - 150,
      y: p.y + 70,
      width: 110,
      height: 52,
      asset: "map-prop-5",
      kind: "decoration",
    });
  }
  // Small repeated details make district character visible without terrain labels.
  for (const b of BUILDINGS) {
    const d = DISTRICTS.find(
      (d) =>
        b.x >= d.x && b.x < d.x + d.width && b.y >= d.y && b.y < d.y + d.height,
    );
    if (!d || b.id.startsWith("legacy")) continue;
    const key =
      d.id === "industrial"
        ? "map-prop-8"
        : d.id === "projects"
          ? "map-prop-5"
          : d.id === "downtown"
            ? "map-nature-3"
            : "map-nature-2";
    for (const side of [-1, 1]) {
      const p = {
        x: b.x + side * (b.width / 2 - 28),
        y: b.y + b.height / 2 + 32,
      };
      if (
        onRoad(p, 24) ||
        SERVICE_POINTS.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < 95)
      )
        continue;
      out.push({
        id: "streetscape-" + b.id + "-" + side,
        ...p,
        width: d.id === "industrial" ? 62 : 48,
        height: d.id === "industrial" ? 48 : 36,
        asset: key,
        kind: "decoration",
      });
    }
  }
  for (const [i, x] of [
    CIVIC_PLAZA.x + 80,
    CIVIC_PLAZA.x + CIVIC_PLAZA.width - 116,
  ].entries()) {
    for (const [j, y] of [
      CIVIC_PLAZA.y + 120,
      CIVIC_PLAZA.y + CIVIC_PLAZA.height - 80,
    ].entries()) {
      out.push({
        id: "plaza-plant-" + i + "-" + j,
        x,
        y,
        width: 64,
        height: 48,
        asset: "map-nature-3",
        kind: "decoration",
      });
      out.push({
        id: "plaza-seat-" + i + "-" + j,
        x: x + 24,
        y: y + 54,
        width: 64,
        height: 32,
        asset: "map-prop-5",
        kind: "decoration",
      });
    }
  }
  // Furnish side/rear edges, leaving every shop doorway and road shoulder clear.
  for (const [i, b] of BUILDINGS.entries()) {
    if (!b.asset.match(/map-building-(cafe|laundry|grocery|books)$/)) continue;
    const details = [
      {
        x: b.x - b.width / 2 - 24,
        y: b.y + b.height / 2 - 24,
        width: 48,
        height: 30,
        asset: "map-prop-5",
      },
      {
        x: b.x + b.width / 2 + 22,
        y: b.y - b.height / 2 + 28,
        width: 34,
        height: 30,
        asset: "map-nature-3",
      },
    ];
    for (const [j, p] of details.entries()) {
      if (
        onRoad(p, 28) ||
        SERVICE_POINTS.some((s) => Math.hypot(p.x - s.x, p.y - s.y) < 110)
      )
        continue;
      if (
        BUILDINGS.some(
          (o) =>
            o !== b &&
            Math.abs(o.x - p.x) < o.width / 2 + p.width / 2 &&
            Math.abs(o.y - p.y) < o.height / 2 + p.height / 2,
        )
      )
        continue;
      out.push({ id: "shop-detail-" + i + "-" + j, ...p, kind: "decoration" });
    }
  }
  for (const [i, r] of PLAZA_GARDENS.entries()) {
    out.push({
      id: "plaza-garden-" + i,
      x: r.x + r.width / 2,
      y: r.y + r.height / 2,
      width: 104,
      height: 48,
      asset: "map-nature-3",
      kind: "decoration",
    });
    out.push({
      id: "plaza-garden-seat-" + i,
      x: r.x + r.width / 2,
      y:
        r.y +
        r.height +
        (inMarketQuarter({ x: r.x + r.width / 2, y: r.y + r.height / 2 })
          ? 20
          : 28),
      width: 64,
      height: 32,
      asset: "map-street-bench",
      kind: "decoration",
    });
  }
  for (const space of blockSpaces()) {
    if (space.kind !== "courtyard") continue;
    const x = space.x + space.width / 2,
      y = space.y + space.height / 2;
    out.push({
      id: "court-planter-" + space.id,
      x,
      y,
      width: 64,
      height: 32,
      asset: "map-street-planter",
      kind: "decoration",
    });
    if (space.height >= 176)
      out.push({
        id: "court-seat-" + space.id,
        x,
        y: y - 54,
        width: 64,
        height: 32,
        asset: "map-street-bench",
        kind: "decoration",
      });
  }
  const streetDetails: [string, number, number][] = [
    ["dumpster", 48, 42],
    ["recycling", 28, 38],
    ["bollards", 40, 28],
    ["hydrant", 24, 30],
    ["planter", 64, 32],
    ["cafe-table", 58, 48],
    ["bicycle", 42, 52],
    ["bus-stop", 96, 56],
    ["sedan", 52, 100],
    ["van", 58, 112],
    ["cones", 28, 40],
    ["bench", 64, 32],
  ];
  const placed: MapObject[] = [];
  for (const [i, b] of BUILDINGS.entries()) {
    if (b.id.startsWith("legacy")) continue;
    const [name, width, height] = streetDetails[i % streetDetails.length];
    for (const side of [-1, 1]) {
      const p = {
        x: b.x + side * (b.width / 2 + width / 2 + 22),
        y: b.y - b.height / 2 + height / 2,
      };
      if (
        onRoad(p, Math.max(width, height) / 2 + 28) ||
        SERVICE_POINTS.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < 140)
      )
        continue;
      if (
        BUILDINGS.some(
          (o) =>
            Math.abs(o.x - p.x) < (o.width + width) / 2 + 18 &&
            Math.abs(o.y - p.y) < (o.height + height) / 2 + 18,
        )
      )
        continue;
      if (placed.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < 100)) continue;
      const o: MapObject = {
        id: "street-detail-" + i + "-" + side,
        ...p,
        width,
        height,
        asset: "map-street-" + name,
        kind: "decoration",
        solid: ["sedan", "van", "dumpster", "planter", "bus-stop"].includes(
          name,
        ),
      };
      placed.push(o);
      out.push(o);
      break;
    }
  }
  for (const road of ROADS)
    for (let i = 8; i < road.points.length; i += 18) {
      const p = road.points[i],
        a = road.points[i - 1],
        length = Math.hypot(p.x - a.x, p.y - a.y),
        offset = road.width / 2 + 48;
      if (!insideCity(p) || naturalBlocked(p)) continue;
      out.push({
        id: "lamp-" + road.name + i,
        x: p.x - ((p.y - a.y) / length) * offset,
        y: p.y + ((p.x - a.x) / length) * offset - 42,
        width: 40,
        height: 100,
        asset: "map-prop-4",
        kind: "decoration",
      });
    }
  // Authored market furniture replaces arbitrary scatter within this reference block.
  for (let i = out.length - 1; i >= 0; i--) {
    const o = out[i];
    if (
      inMarketQuarter(o) &&
      [
        "street-detail-",
        "streetscape-",
        "shop-detail-",
        "plaza-seat-",
        "plaza-plant-",
      ].some((prefix) => o.id.startsWith(prefix))
    )
      out.splice(i, 1);
  }
  for (const p of MARKET_QUARTER.props) {
    if (
      roadOverlapsRect(
        {
          x: p.x - p.width / 2,
          y: p.y - p.height / 2,
          width: p.width,
          height: p.height,
        },
        16,
      )
    )
      throw Error("Market prop overlaps road: " + p.id);
    out.push({ ...p, kind: "decoration" });
  }
  // Independent hash placement keeps the existing woodland seed and tree positions stable.
  const woodland = out.filter((o) => o.kind === "tree");
  for (let y = 224; y < MAP_SIZE - 224; y += 320)
    for (let x = 224; x < MAP_SIZE - 224; x += 320) {
      const hash = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;
      if (hash % 100 >= 42) continue;
      const p = {
        x: x + ((hash >>> 8) % 161) - 80,
        y: y + ((hash >>> 16) % 161) - 80,
      };
      if (
        insideCity(p) ||
        naturalBlocked(p, 48) ||
        onRoad(p, 170) ||
        Math.hypot(p.x - 7104, p.y - 1344) < 650
      )
        continue;
      const wet = [
        [-160, 0],
        [160, 0],
        [0, -160],
        [0, 160],
      ].some(([dx, dy]) => isWater({ x: p.x + dx, y: p.y + dy }));
      const woods = woodland.some(
        (o) => Math.hypot(o.x - p.x, o.y - p.y) < 210,
      );
      const rocky = mountainBlend(p) > 0.2;
      if (mountainRegion(p) && !wet && (hash >>> 24) % 4 !== 0) continue;
      const choices = wet
        ? ["reeds", "cattails"]
        : rocky
          ? ["pebbles", "moss-boulder"]
          : woods
            ? ["fern", "berries", "stump", "log", "branches", "shrub"]
            : ["grass", "wildflowers", "shrub"];
      const name = choices[(hash >>> 24) % choices.length];
      const solid = ["stump", "log", "moss-boulder"].includes(name);
      const width =
        name === "log"
          ? 96
          : name === "moss-boulder"
            ? 80
            : name === "stump"
              ? 48
              : name === "branches"
                ? 64
                : 52;
      const height =
        name === "log"
          ? 40
          : name === "moss-boulder"
            ? 56
            : name === "stump"
              ? 40
              : ["reeds", "cattails"].includes(name)
                ? 64
                : 36;
      if (
        out.some(
          (o) =>
            o.solid &&
            Math.abs(o.x - p.x) < (o.width + width) / 2 + 72 &&
            Math.abs(o.y - p.y) < (o.height + height) / 2 + 72,
        )
      )
        continue;
      out.push({
        id: "nature-detail-" + x + "-" + y,
        ...p,
        width,
        height,
        asset: "map-nature-" + name,
        solid,
        kind: solid ? "rock" : "decoration",
      });
    }
  // Clean-cut artwork replaces legacy ground-backed props without shifting their footprints.
  const replacements: Record<string, string> = {
    "map-nature-2": "map-nature-wildflowers",
    "map-nature-3": "map-nature-shrub",
    "map-nature-4": "map-nature-moss-boulder",
    "map-nature-5": "map-nature-pebbles",
    "map-nature-6": "map-nature-log",
    "map-nature-7": "map-nature-wildflowers",
  };
  for (const [i, o] of out.entries()) {
    if (o.kind === "tree")
      o.asset =
        i % 19 === 0
          ? "map-tree-dead"
          : i % 7 === 0
            ? "map-tree-birch"
            : o.asset === "map-nature-0"
              ? "map-tree-oak"
              : "map-tree-pine";
    else o.asset = replacements[o.asset] || o.asset;
  }
  for (let i = out.length - 1; i >= 0; i--) {
    const o = out[i];
    if (o.solid && onRoad(o, Math.hypot(o.width, o.height) / 2 + 32))
      out.splice(i, 1);
  }
  const reserved = [
    ...BUILDINGS.map((b) =>
      gridEnvelope(
        {
          x: b.x - b.width / 2,
          y: b.y - b.height / 2,
          width: b.width,
          height: b.height,
        },
        64,
      ),
    ),
    ...LEGACY_BUILDINGS.slice(0, 5).map((r) => gridEnvelope(r, 64)),
    ...BUILDINGS.map((b) =>
      gridEnvelope({
        x: b.x - 32,
        y: b.y + b.height / 2,
        width: 64,
        height: 80,
      }),
    ),
    ...SERVICE_POINTS.map((p) =>
      gridEnvelope({ x: p.x - 64, y: p.y - 64, width: 128, height: 128 }),
    ),
    ...buildingWalkways().flatMap((r) => routeFootprints(r.points, r.width)),
    ...MARKET_QUARTER.paths.flatMap((r) => routeFootprints(r.points, r.width)),
  ];
  const fitted = fitDetailProps(
    out,
    reserved,
    (r) =>
      r.x < 0 ||
      r.y < 0 ||
      r.x + r.width > MAP_SIZE ||
      r.y + r.height > MAP_SIZE ||
      roadOverlapsRect(r, 28) ||
      corners(r).some((p) => naturalBlocked(p, 0)),
  );
  out.splice(0, out.length, ...fitted.objects);
  sceneryPlacementReport = fitted.report;
  objectsCache = out;
  for (const o of out)
    if (o.solid) {
      const w = o.kind === "tree" ? 28 : o.width,
        h = o.kind === "tree" ? 24 : o.height;
      for (
        let cy = Math.floor((o.y - h / 2) / 1024);
        cy <= Math.floor((o.y + h / 2) / 1024);
        cy++
      )
        for (
          let cx = Math.floor((o.x - w / 2) / 1024);
          cx <= Math.floor((o.x + w / 2) / 1024);
          cx++
        ) {
          const key = cx + "," + cy,
            list = objectBins.get(key) || [];
          list.push({ ...o, width: w, height: h });
          objectBins.set(key, list);
        }
    }
  return out;
}
function solidObjectsNear(r: TerrainRect) {
  mapObjects();
  const set = new Set<MapObject>();
  for (
    let y = Math.floor(r.y / 1024);
    y <= Math.floor((r.y + r.height) / 1024);
    y++
  )
    for (
      let x = Math.floor(r.x / 1024);
      x <= Math.floor((r.x + r.width) / 1024);
      x++
    )
      for (const o of objectBins.get(x + "," + y) || []) set.add(o);
  return [...set].filter(mapObjectEnabled);
}
export function terrainBlocked(p: TerrainPoint, padding = 12) {
  if (reservations.some((r) => inBox(p, r))) return false;
  if (naturalBlocked(p, padding)) return true;
  return solidObjectsNear({
    x: p.x - padding,
    y: p.y - padding,
    width: padding * 2,
    height: padding * 2,
  }).some(
    (o) =>
      Math.abs(o.x - p.x) <= o.width / 2 + padding &&
      Math.abs(o.y - p.y) <= o.height / 2 + padding,
  );
}
export const forestTrees = () =>
  mapObjects()
    .filter((o) => o.kind === "tree" && !insideCity(o))
    .map((o) => ({
      x: o.x,
      y: o.y,
      variant: o.asset === "map-tree-oak" || o.asset.endsWith("0") ? 0 : 1,
      scale: 0.8,
    }));
export const treeOverlapsRect = (r: TerrainRect) =>
  solidObjectsNear({
    x: r.x - 160,
    y: r.y - 160,
    width: r.width + 320,
    height: r.height + 320,
  }).some((o) => {
    const b =
      o.kind === "tree"
        ? { x: o.x - 64, y: o.y - 139, width: 128, height: 158 }
        : {
            x: o.x - o.width / 2,
            y: o.y - o.height / 2,
            width: o.width,
            height: o.height,
          };
    return (
      r.x < b.x + b.width &&
      r.x + r.width > b.x &&
      r.y < b.y + b.height &&
      r.y + r.height > b.y
    );
  });
export function groundKind(p: TerrainPoint) {
  if (isWater(p)) return "water";
  if (insideCity(p)) return "city";
  if (mountainRegion(p)) return "mountain";
  if (Math.sin(p.x / 900) + Math.cos(p.y / 730) > 1.5) return "rocky";
  return "grassland";
}
export const terrainChunkObjects = (key: string) =>
  [...BUILDINGS, ...mapObjects()].filter((o) => chunkKey(o.x, o.y) === key);
export function tileData(tx: number, ty: number) {
  const p = { x: tx * 64 + 32, y: ty * 64 + 32 };
  return {
    x: tx,
    y: ty,
    terrain: groundKind(p),
    blocked:
      terrainBlocked(p) ||
      [
        ...BUILDINGS.map((b) => ({
          x: b.x - b.width / 2,
          y: b.y - b.height / 2,
          width: b.width,
          height: b.height,
        })),
        ...LEGACY_BUILDINGS.slice(0, 5),
      ].some((r) => inBox(p, r)),
    buildable:
      !insideCity(p) &&
      !onRoad(p, 64) &&
      !terrainRectBlocked({
        x: p.x - 32,
        y: p.y - 32,
        width: 64,
        height: 64,
      }) &&
      !treeOverlapsRect({ x: p.x - 32, y: p.y - 32, width: 64, height: 64 }),
  };
}

const chunkCache = new Map<string, ReturnType<typeof tileData>[]>();
export function mapChunk(cx: number, cy: number) {
  if (
    !Number.isInteger(cx) ||
    !Number.isInteger(cy) ||
    cx < 0 ||
    cy < 0 ||
    cx >= 16 ||
    cy >= 16
  )
    throw Error("Invalid map chunk");
  const key = cx + "," + cy;
  let tiles = chunkCache.get(key);
  if (!tiles) {
    tiles = [];
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++)
        tiles.push(tileData(cx * 16 + x, cy * 16 + y));
    chunkCache.set(key, tiles);
  }
  return { cx, cy, tiles, objects: terrainChunkObjects(key) };
}

// Physical street intersections drive presentation only; no road or movement rules change.
export function roadJunctions() {
  const out: { x: number; y: number; angleA: number; angleB: number }[] = [];
  for (let i = 0; i < ROADS.length; i++)
    for (let j = i + 1; j < ROADS.length; j++) {
      const a = ROADS[i],
        b = ROADS[j];
      if (a.width < 100 || b.width < 100) continue;
      for (let u = 1; u < a.points.length; u++)
        for (let v = 1; v < b.points.length; v++) {
          const p = a.points[u - 1],
            q = a.points[u],
            r = b.points[v - 1],
            s = b.points[v];
          if (
            Math.max(p.x, q.x) < Math.min(r.x, s.x) ||
            Math.min(p.x, q.x) > Math.max(r.x, s.x) ||
            Math.max(p.y, q.y) < Math.min(r.y, s.y) ||
            Math.min(p.y, q.y) > Math.max(r.y, s.y)
          )
            continue;
          const ax = q.x - p.x,
            ay = q.y - p.y,
            bx = s.x - r.x,
            by = s.y - r.y,
            den = ax * by - ay * bx;
          if (Math.abs(den) < 0.01) continue;
          const t = ((r.x - p.x) * by - (r.y - p.y) * bx) / den,
            k = ((r.x - p.x) * ay - (r.y - p.y) * ax) / den;
          if (t < 0 || t > 1 || k < 0 || k > 1) continue;
          const c = {
            x: p.x + t * ax,
            y: p.y + t * ay,
            angleA: Math.atan2(ay, ax),
            angleB: Math.atan2(by, bx),
          };
          if (
            insideCity(c) &&
            !out.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < 180)
          )
            out.push(c);
        }
    }
  return out;
}

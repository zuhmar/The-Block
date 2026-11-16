// Authored world data only. Gameplay contracts live in index.ts and remain unchanged.
export const MAP_SIZE = 16384,
  TILE_SIZE = 64,
  CHUNK_TILES = 16,
  CHUNK_SIZE = 1024,
  MAP_VERSION = 3;
export const LEGACY_OFFSET = { x: 4096, y: 4096 };
export interface MapPoint {
  x: number;
  y: number;
}
export interface MapObject extends MapPoint {
  id: string;
  asset: string;
  width: number;
  height: number;
  solid?: boolean;
  rotation?: number;
  kind:
    | "building"
    | "tree"
    | "rock"
    | "mountain"
    | "cliff"
    | "decoration"
    | "waterfall";
}
export const CITY = { x: 3072, y: 3072, width: 10240, height: 9216 };
export const DISTRICTS = [
  {
    id: "the-block",
    name: "The Block",
    x: 4096,
    y: 4096,
    width: 2944,
    height: 3392,
    assets: [
      "map-building-shelter",
      "map-building-house",
      "map-building-abandoned",
      "map-building-shop",
    ],
  },
  {
    id: "downtown",
    name: "Downtown",
    x: 7040,
    y: 4096,
    width: 2624,
    height: 3392,
    assets: [
      "map-building-bank",
      "map-building-hospital",
      "map-building-police",
      "map-building-office",
      "map-building-restaurant",
      "map-building-shop",
    ],
  },
  {
    id: "industrial",
    name: "Industrial District",
    x: 9664,
    y: 4096,
    width: 3136,
    height: 3392,
    assets: [
      "map-building-warehouse",
      "map-building-factory",
      "map-building-workshop",
    ],
  },
  {
    id: "projects",
    name: "The Projects",
    x: 4096,
    y: 7488,
    width: 4480,
    height: 3776,
    assets: ["map-building-apartments", "map-building-abandoned"],
  },
  {
    id: "uptown",
    name: "Uptown",
    x: 8576,
    y: 7488,
    width: 4224,
    height: 3776,
    assets: [
      "map-building-luxury",
      "map-building-house",
      "map-building-premium",
    ],
  },
];
export const CIVIC_PLAZA = { x: 7936, y: 5504, width: 960, height: 768 };
export const PARKS = [
  { x: 9600, y: 9400, width: 640, height: 480 },
  { x: 8500, y: 7200, width: 480, height: 384 },
  { x: 6000, y: 9600, width: 640, height: 480 },
];
export const PARKING_LOTS = [{ x: 5000, y: 10180, width: 640, height: 320 }];
export const INDUSTRIAL_YARDS = [
  { x: 12200, y: 6000, width: 640, height: 512 },
];
const legacyRects = [
  [80, 376, 660, 24],
  [80, 376, 24, 424],
  [716, 376, 24, 424],
  [80, 776, 220, 24],
  [520, 776, 220, 24],
  [928, 352, 320, 224],
  [1408, 352, 288, 224],
  [1800, 240, 384, 288],
  [2848, 256, 448, 320],
  [3520, 288, 448, 288],
  [4704, 320, 544, 320],
  [5456, 272, 512, 320],
  [512, 1280, 480, 416],
  [1216, 1312, 480, 352],
  [1792, 1440, 352, 352],
  [3136, 2464, 544, 352],
  [4224, 2464, 544, 352],
];
export const LEGACY_BUILDINGS = legacyRects.map(([x, y, width, height]) => ({
  x: x + 4096,
  y: y + 4096,
  width,
  height,
}));
export const SERVICE_POINTS = [
  { x: 4646, y: 4606 },
  { x: 5186, y: 4746 },
  { x: 5606, y: 4746 },
  { x: 5946, y: 4856 },
  { x: 6336, y: 4746 },
  { x: 6816, y: 5296 },
  { x: 7526, y: 4746 },
  { x: 8316, y: 5996 },
  { x: 9426, y: 5296 },
];
export const BUILDINGS: MapObject[] = LEGACY_BUILDINGS.slice(5).map((r, i) => ({
  id: "legacy-" + i,
  x: r.x + r.width / 2,
  y: r.y + r.height / 2,
  width: r.width,
  height: r.height,
  asset:
    i === 0
      ? "map-building-store"
      : i === 1
        ? "map-building-workshop"
        : i < 4
          ? "map-building-house"
          : i < 7
            ? "map-building-office"
            : "map-building-apartments",
  solid: true,
  kind: "building",
}));
// Additional architecture uses consistent street setbacks, with parks/courtyards left open.
for (const district of DISTRICTS) {
  let i = 0;
  for (
    let y = district.y + 192;
    y < district.y + district.height - 300;
    y += 512
  )
    for (
      let x = district.x + 192;
      x < district.x + district.width - 300;
      x += 448
    ) {
      const w =
          district.id === "projects"
            ? 320
            : district.id === "industrial"
              ? 352
              : 224,
        h =
          district.id === "projects"
            ? 240
            : district.id === "industrial"
              ? 256
              : 192;
      if (
        LEGACY_BUILDINGS.some(
          (r) =>
            x + w / 2 + 96 > r.x &&
            x - w / 2 - 96 < r.x + r.width &&
            y + h / 2 + 96 > r.y &&
            y - h / 2 - 96 < r.y + r.height,
        )
      )
        continue;
      // Shelter interior, service forecourt and starter exit are never populated.
      if (x < 6400 && y < 5100) continue;
      if (
        [...PARKING_LOTS, ...INDUSTRIAL_YARDS].some(
          (p) =>
            Math.abs(p.x - x) < (p.width + w) / 2 &&
            Math.abs(p.y - y) < (p.height + h) / 2,
        )
      )
        continue;
      if (
        PARKS.some(
          (p) =>
            Math.abs(p.x - x) < (p.width + w) / 2 &&
            Math.abs(p.y - y) < (p.height + h) / 2,
        )
      )
        continue;
      if (
        SERVICE_POINTS.some(
          (p) =>
            Math.abs(p.x - x) < w / 2 + 110 && Math.abs(p.y - y) < h / 2 + 110,
        )
      )
        continue;
      BUILDINGS.push({
        id: district.id + "-" + i,
        asset: district.assets[i++ % district.assets.length],
        x,
        y,
        width: w,
        height: h,
        solid: true,
        kind: "building",
      });
    }
}
export const MOUNTAIN_REGIONS = [
  { x: 128, y: 256, width: 4200, height: 2300 },
  { x: 128, y: 3500, width: 2300, height: 4400 },
  { x: 6000, y: 128, width: 5700, height: 1850 },
  { x: 14200, y: 800, width: 2056, height: 4500 },
  { x: 350, y: 13000, width: 5100, height: 3000 },
  { x: 10800, y: 13700, width: 5000, height: 2500 },
];
export function chunkKey(x: number, y: number) {
  return Math.floor(x / CHUNK_SIZE) + "," + Math.floor(y / CHUNK_SIZE);
}
export function visibleChunkKeys(
  view: { x: number; y: number; width: number; height: number },
  padding = 1,
) {
  const keys: string[] = [];
  const clamp = (v: number) => Math.max(0, Math.min(15, v));
  for (
    let y = clamp(Math.floor(view.y / CHUNK_SIZE) - padding);
    y <= clamp(Math.floor((view.y + view.height) / CHUNK_SIZE) + padding);
    y++
  )
    for (
      let x = clamp(Math.floor(view.x / CHUNK_SIZE) - padding);
      x <= clamp(Math.floor((view.x + view.width) / CHUNK_SIZE) + padding);
      x++
    )
      keys.push(x + "," + y);
  return keys;
}

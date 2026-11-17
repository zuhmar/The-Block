import {
  BUILDINGS,
  DISTRICTS,
  type MapObject,
} from "../shared/src/official-map.js";
const hash = (id: string) => {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
const districtOf = (b: MapObject) =>
  DISTRICTS.find(
    (d) =>
      b.x >= d.x && b.x < d.x + d.width && b.y >= d.y && b.y < d.y + d.height,
  )?.id;
export function frontageScene(b: MapObject) {
  const seed = hash(b.id),
    district = districtOf(b);
  let scene = "residential porch",
    assets = ["map-street-planter", "map-street-bench"];
  if (district === "industrial") {
    scene = "loading frontage";
    assets = ["map-prop-8", "map-street-cones", "map-street-recycling"];
  } else if (district === "projects") {
    scene = "shared residential frontage";
    assets = ["map-street-bicycle", "map-street-planter", "map-street-bench"];
  } else if (district === "uptown") {
    scene = "landscaped entrance";
    assets = ["map-street-planter", "map-street-planter", "map-street-bench"];
  } else if (district === "downtown") {
    const dining = /cafe|diner|restaurant|bakery/.test(b.asset);
    scene = dining ? "cafe terrace" : "commercial frontage";
    assets = dining
      ? ["map-street-cafe-table", "map-street-planter"]
      : ["map-street-bicycle", "map-street-planter", "map-street-bench"];
  }
  return {
    seed,
    district,
    scene,
    assets,
    enabled: seed % 5 !== 0,
    paired:
      district === "uptown"
        ? seed % 3 === 0
        : district === "industrial"
          ? seed % 4 === 0
          : scene === "cafe terrace",
  };
}
const sizes: Record<string, [number, number]> = {
  "map-street-planter": [48, 30],
  "map-street-bench": [48, 28],
  "map-street-bicycle": [28, 36],
  "map-street-cafe-table": [48, 36],
  "map-street-cones": [24, 36],
  "map-street-recycling": [24, 34],
  "map-prop-8": [62, 48],
};
// Dress only existing non-solid detail cells. Physical objects and authored courts stay intact.
export function districtFrontage(o: MapObject): MapObject | null | undefined {
  if (o.solid) return undefined;
  let b: MapObject | undefined,
    index = 0,
    side = 1,
    front = false;
  if (o.id.startsWith("streetscape-")) {
    const id = o.id.slice("streetscape-".length).replace(/-(?:-1|1)$/, "");
    b = BUILDINGS.find((b) => b.id === id);
    side = o.id.endsWith("--1") ? -1 : 1;
    front = true;
  } else if (o.id.startsWith("shop-detail-")) {
    const match = o.id.match(/^shop-detail-(\d+)-(\d+)$/);
    if (match) {
      b = BUILDINGS[Number(match[1])];
      index = Number(match[2]);
    }
  } else return undefined;
  if (!b) return undefined;
  const scene = frontageScene(b);
  if (
    front &&
    (!scene.enabled || (!scene.paired && side !== (scene.seed % 2 ? -1 : 1)))
  )
    return null;
  let palette = scene.assets;
  if (!front) {
    if (b.asset.endsWith("laundry"))
      palette = ["map-street-bicycle", "map-street-recycling"];
    else if (b.asset.endsWith("grocery"))
      palette = ["map-prop-8", "map-street-recycling"];
    else if (b.asset.endsWith("books"))
      palette = ["map-street-bench", "map-street-planter"];
    else palette = ["map-street-cafe-table", "map-street-planter"];
  }
  const asset =
      palette[
        (front ? (scene.seed >>> 8) + (side === 1 ? 1 : 0) : index) %
          palette.length
      ],
    size = sizes[asset];
  return {
    ...o,
    asset,
    width: Math.min(o.width, size[0]),
    height: Math.min(o.height, size[1]),
  };
}

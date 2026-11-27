export const EDITOR_VERSION = 1,
  MAX_OBJECTS = 2000,
  MAX_CUSTOM_ASSETS = 12,
  MAX_ASSET_BYTES = 16 * 1024 * 1024,
  MAX_ASSET_TOTAL = 32 * 1024 * 1024;
export const BEHAVIORS = [
  "decoration",
  "solid",
  "loot",
  "tree",
  "rock",
  "sulfur",
  "metal",
  "player-spawn",
  "enemy-easy",
  "enemy-police",
  "enemy-swat",
  "workbench",
  "furnace",
] as const;
export type Behavior = (typeof BEHAVIORS)[number];
export const LAYERS = [
  "Buildings",
  "Props",
  "Nature",
  "Terrain",
  "Markers",
] as const;
export type Layer = (typeof LAYERS)[number];
export type MapObject = {
  id: string;
  asset: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  scale: [number, number, number];
  color: string;
  solid: boolean;
  visible: boolean;
  locked: boolean;
  layer: Layer;
  behavior: Behavior;
  lootTier: number;
  respawn: number;
};
export type CustomAsset = { id: string; name: string; bytes: number };
export type MapDocument = {
  format: "street-survival-map";
  version: 1;
  name: string;
  worldSize: 640;
  coast: { x: number; z: number }[];
  objects: MapObject[];
  assets: CustomAsset[];
};
export function makeObject(
  asset: string,
  name: string,
  layer: Layer,
  behavior: Behavior = "solid",
  values: Partial<MapObject> = {},
): MapObject {
  return {
    id: crypto.randomUUID(),
    asset,
    name,
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    scale: [1, 1, 1],
    color: "#ffffff",
    solid: [
      "solid",
      "loot",
      "tree",
      "rock",
      "sulfur",
      "metal",
      "workbench",
      "furnace",
    ].includes(behavior),
    visible: true,
    locked: false,
    layer,
    behavior,
    lootTier: 1,
    respawn: 60,
    ...values,
  };
}
export const snap = (v: number, step: number) => Math.round(v / step) * step;
const finite = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const short = (v: unknown, n = 100): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= n;
export function coastValid(points: { x: number; z: number }[]) {
  if (
    points.length < 6 ||
    points.length > 256 ||
    points.some((p) => !p || !finite(p.x, -320, 320) || !finite(p.z, -320, 320))
  )
    return false;
  const cross = (
    a: { x: number; z: number },
    b: { x: number; z: number },
    c: { x: number; z: number },
  ) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    if (Math.hypot(a.x - b.x, a.z - b.z) < 0.01) return false;
    for (let j = i + 2; j < points.length; j++) {
      if (i === 0 && j === points.length - 1) continue;
      const c = points[j],
        d = points[(j + 1) % points.length];
      if (
        cross(a, b, c) * cross(a, b, d) < 0 &&
        cross(c, d, a) * cross(c, d, b) < 0
      )
        return false;
    }
  }
  const area = points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length];
    return sum + p.x * q.z - q.x * p.z;
  }, 0);
  return Math.abs(area) > 100;
}
export function validateMap(
  value: unknown,
  known: ReadonlySet<string>,
): MapDocument {
  if (!value || typeof value !== "object") throw Error("Not a map document");
  const d = value as MapDocument;
  if (
    d.format !== "street-survival-map" ||
    d.version !== 1 ||
    d.worldSize !== 640 ||
    !short(d.name, 80) ||
    !Array.isArray(d.objects) ||
    d.objects.length > MAX_OBJECTS ||
    !Array.isArray(d.assets) ||
    d.assets.length > MAX_CUSTOM_ASSETS ||
    !Array.isArray(d.coast) ||
    !coastValid(d.coast)
  )
    throw Error(
      "Unsupported or invalid map. Use a Survive the Block map export (maximum 2,000 objects).",
    );
  const assetIds = new Set<string>();
  let total = 0;
  for (const a of d.assets) {
    if (
      !a ||
      !/^custom:[a-z0-9-]{1,64}$/i.test(a.id) ||
      assetIds.has(a.id) ||
      !short(a.name, 100) ||
      !finite(a.bytes, 20, MAX_ASSET_BYTES)
    )
      throw Error("Invalid custom model metadata");
    assetIds.add(a.id);
    total += a.bytes;
  }
  if (total > MAX_ASSET_TOTAL)
    throw Error("Custom models exceed the 32 MB project budget");
  const ids = new Set<string>();
  for (const o of d.objects) {
    if (
      !o ||
      !short(o.id, 90) ||
      ids.has(o.id) ||
      !short(o.name, 100) ||
      !short(o.asset, 130) ||
      (!known.has(o.asset) && !assetIds.has(o.asset)) ||
      !LAYERS.includes(o.layer) ||
      !BEHAVIORS.includes(o.behavior) ||
      !finite(o.x, -320, 320) ||
      !finite(o.z, -320, 320) ||
      !finite(o.y, -10, 80) ||
      !finite(o.yaw, -36000, 36000) ||
      !Array.isArray(o.scale) ||
      o.scale.length !== 3 ||
      !o.scale.every((n) => finite(n, 0.05, 640)) ||
      !/^#[0-9a-f]{6}$/i.test(o.color) ||
      typeof o.solid !== "boolean" ||
      typeof o.visible !== "boolean" ||
      typeof o.locked !== "boolean" ||
      !finite(o.lootTier, 1, 5) ||
      !Number.isInteger(o.lootTier) ||
      !finite(o.respawn, 0, 86400)
    )
      throw Error(
        "Invalid object properties or unavailable asset: " +
          String(o?.name ?? "unknown"),
      );
    ids.add(o.id);
  }
  return structuredClone(d);
}
export function validateGlb(bytes: ArrayBuffer) {
  if (bytes.byteLength < 20 || bytes.byteLength > MAX_ASSET_BYTES)
    throw Error("GLB models must be smaller than 16 MB");
  const v = new DataView(bytes);
  if (
    v.getUint32(0, true) !== 0x46546c67 ||
    v.getUint32(4, true) !== 2 ||
    v.getUint32(8, true) !== bytes.byteLength ||
    v.getUint32(16, true) !== 0x4e4f534a
  )
    throw Error("Use a self-contained GLB version 2 file");
  const size = v.getUint32(12, true);
  if (size > bytes.byteLength - 20) throw Error("Invalid GLB header");
  const g = JSON.parse(
    new TextDecoder().decode(new Uint8Array(bytes, 20, size)),
  );
  for (const ref of [...(g.buffers ?? []), ...(g.images ?? [])])
    if (ref.uri && !String(ref.uri).startsWith("data:"))
      throw Error(
        "External model files are not supported. Export a GLB with embedded textures.",
      );
}
export class MapHistory {
  private undoStack: MapDocument[] = [];
  private redoStack: MapDocument[] = [];
  commit(before: MapDocument) {
    this.undoStack.push(structuredClone(before));
    if (this.undoStack.length > 40) this.undoStack.shift();
    this.redoStack = [];
  }
  undo(current: MapDocument) {
    const d = this.undoStack.pop();
    if (!d) return;
    this.redoStack.push(structuredClone(current));
    return d;
  }
  redo(current: MapDocument) {
    const d = this.redoStack.pop();
    if (!d) return;
    this.undoStack.push(structuredClone(current));
    return d;
  }
  get canUndo() {
    return this.undoStack.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }
  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}

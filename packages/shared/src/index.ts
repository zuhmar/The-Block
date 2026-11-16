import { z } from "zod";
export const VERSION = 2;
export interface Point {
  x: number;
  y: number;
}
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export const WORLD = {
  width: 6400,
  height: 3200,
  ground: 560,
  spawn: { x: 400, y: 560 },
  safe: [80, 740],
  safeRect: { x: 80, y: 400, width: 660, height: 400 },
  store: 1090,
  trader: 1510,
  storePoint: { x: 1090, y: 650 },
  traderPoint: { x: 1510, y: 650 },
  scavenge: [1850, 2240, 2720, 3430, 4220, 5330],
  scavengePoints: [
    { x: 1850, y: 760 },
    { x: 2240, y: 650 },
    { x: 2720, y: 1200 },
    { x: 3430, y: 650 },
    { x: 4220, y: 1900 },
    { x: 5330, y: 1200 },
  ],
  parcels: [
    [2900, 3300],
    [3700, 4100],
    [4600, 5100],
    [5600, 6150],
  ],
  parcelRects: [
    { x: 2880, y: 1120, width: 448, height: 576 },
    { x: 3648, y: 1120, width: 512, height: 576 },
    { x: 4544, y: 1120, width: 576, height: 576 },
    { x: 5568, y: 1120, width: 640, height: 576 },
  ],
  roads: [
    { x: 0, y: 880, width: 6400, height: 192 },
    { x: 2400, y: 0, width: 192, height: 3200 },
    { x: 0, y: 2080, width: 6400, height: 160 },
  ],
  obstacles: [
    { x: 80, y: 376, width: 660, height: 24 },
    { x: 80, y: 376, width: 24, height: 424 },
    { x: 716, y: 376, width: 24, height: 424 },
    { x: 80, y: 776, width: 220, height: 24 },
    { x: 520, y: 776, width: 220, height: 24 },
    { x: 928, y: 352, width: 320, height: 224 },
    { x: 1408, y: 352, width: 288, height: 224 },
    { x: 1800, y: 240, width: 384, height: 288 },
    { x: 2848, y: 256, width: 448, height: 320 },
    { x: 3520, y: 288, width: 448, height: 288 },
    { x: 4704, y: 320, width: 544, height: 320 },
    { x: 5456, y: 272, width: 512, height: 320 },
    { x: 512, y: 1280, width: 480, height: 416 },
    { x: 1216, y: 1312, width: 480, height: 352 },
    { x: 1792, y: 1440, width: 352, height: 352 },
    { x: 3136, y: 2464, width: 544, height: 352 },
    { x: 4224, y: 2464, width: 544, height: 352 },
  ],
  grid: 64,
} as const;
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export const inRect = (p: Point, r: Rect, padding = 0) =>
  p.x >= r.x - padding &&
  p.x <= r.x + r.width + padding &&
  p.y >= r.y - padding &&
  p.y <= r.y + r.height + padding;
export const safe = (x: number, y: number = WORLD.ground) =>
  inRect({ x, y }, WORLD.safeRect);
export const buildGround = (p: Point) =>
  WORLD.parcelRects.some((r) =>
    inRect(p, {
      x: r.x + 32,
      y: r.y + 32,
      width: r.width - 64,
      height: r.height - 64,
    }),
  );
export function segmentRect(a: Point, b: Point, r: Rect) {
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
export const ITEMS = {
  water: { weight: 1, stack: 8, price: 3 },
  snack: { weight: 0.2, stack: 8, price: 3 },
  bandage: { weight: 0.1, stack: 8, price: 5 },
  // Building practice: starter wood uses no normal carrying slot or carry weight.
  wood: { weight: 0, stack: 10000, price: 1 },
  scrap: { weight: 1, stack: 50, price: 2 },
  stone: { weight: 2, stack: 50, price: 1 },
  brick: { weight: 2, stack: 50, price: 2 },
  concrete: { weight: 3, stack: 50, price: 3 },
  steel: { weight: 2, stack: 50, price: 4 },
  glass: { weight: 0.5, stack: 50, price: 2 },
  electronics: { weight: 1, stack: 20, price: 5 },
  backpack: { weight: 1, stack: 1, price: 10 },
  cash: { weight: 0, stack: 10000, price: 1 },
  bat: { weight: 2, stack: 1, price: 12 },
  pistol: { weight: 2, stack: 1, price: 40 },
  ammo: { weight: 0.03, stack: 60, price: 1 },
} as const;
export type Item = keyof typeof ITEMS;
export type Inventory = Partial<Record<Item, number>>;
export const PIECES = {
  foundation: { wood: 8, hp: 9999 },
  wall: { wood: 5, hp: 100 },
  door: { wood: 4, hp: 80 },
  roof: { wood: 4, hp: 70 },
  storage: { wood: 5, hp: 60 },
} as const;
export const BUILD_BUDGET = 100;
export const BUILD_KINDS = ["foundation", "wall", "door", "storage"] as const;
export const BUILDING = {
  floorSize: 128,
  cellSize: 64,
  wallThickness: 16,
} as const;
export function snapBuildPoint(
  kind: Kind,
  point: Point,
  floor?: Point,
): Point & { rotation?: 0 | 90 } {
  const cell = BUILDING.cellSize,
    half = BUILDING.floorSize / 2;
  const cx = floor?.x || 0,
    cy = floor?.y || 0;
  const snap = (value: number, center: number) =>
    Math.round((value - center - cell / 2) / cell) * cell + center + cell / 2;
  const edgeSlot = (value: number, center: number) =>
    Math.max(
      center - half + cell / 2,
      Math.min(center + half - cell / 2, snap(value, center)),
    );
  if (
    (kind === "wall" || kind === "door") &&
    floor &&
    Math.max(Math.abs(point.x - cx), Math.abs(point.y - cy)) <= half + cell / 2
  ) {
    const gridLine = (value: number, center: number) =>
      center +
      Math.max(
        -half,
        Math.min(half, Math.round((value - center) / cell) * cell),
      );
    const vertical = {
      x: gridLine(point.x, cx),
      y: edgeSlot(point.y, cy),
      rotation: 90 as const,
    };
    const horizontal = {
      x: edgeSlot(point.x, cx),
      y: gridLine(point.y, cy),
      rotation: 0 as const,
    };
    return Math.abs(point.x - vertical.x) < Math.abs(point.y - horizontal.y)
      ? vertical
      : horizontal;
  }
  if (kind === "foundation")
    return {
      x: Math.round(point.x / cell) * cell,
      y: Math.round(point.y / cell) * cell,
    };
  return { x: snap(point.x, cx), y: snap(point.y, cy), rotation: 0 };
}
export function resolveBuildFloor(
  owner: string,
  point: Point,
  structures: Structure[],
  selectedId?: string,
) {
  const floors = structures.filter(
    (s) => s.kind === "foundation" && s.owner === owner,
  );
  for (const radius of [
    BUILDING.floorSize / 2,
    BUILDING.floorSize / 2 + BUILDING.cellSize / 2,
  ]) {
    const candidates = floors.filter(
      (f) =>
        Math.abs(f.x - point.x) <= radius && Math.abs(f.y - point.y) <= radius,
    );
    if (candidates.length)
      return (
        candidates.find((f) => f.id === selectedId) ||
        candidates.sort((a, b) => distance(a, point) - distance(b, point))[0]
      );
  }
  return floors.find((f) => f.id === selectedId);
}
export function floorContainsCell(floor: Point, point: Point) {
  const inset = (BUILDING.floorSize - BUILDING.cellSize) / 2;
  return (
    Math.abs(floor.x - point.x) <= inset && Math.abs(floor.y - point.y) <= inset
  );
}
export function floorSupportsPiece(floor: Point, point: Point, kind: Kind) {
  if (kind === "storage") return floorContainsCell(floor, point);
  const dx = Math.abs(floor.x - point.x),
    dy = Math.abs(floor.y - point.y),
    half = BUILDING.floorSize / 2;
  return (
    ((dx === half || dx === 0) && dy <= half - BUILDING.cellSize / 2) ||
    ((dy === half || dy === 0) && dx <= half - BUILDING.cellSize / 2)
  );
}
export function structureFootprint(
  s: Point & { kind: Kind; rotation?: 0 | 90 },
): Rect {
  const wall = s.kind === "wall" || s.kind === "door";
  const width = wall
    ? s.rotation === 90
      ? BUILDING.wallThickness
      : BUILDING.cellSize
    : s.kind === "foundation"
      ? BUILDING.floorSize
      : 40;
  const height = wall
    ? s.rotation === 90
      ? BUILDING.cellSize
      : BUILDING.wallThickness
    : width;
  return { x: s.x - width / 2, y: s.y - height / 2, width, height };
}
export type Kind = keyof typeof PIECES;
export const appearanceSchema = z.object({
  skin: z.enum(["#c98c62", "#865641", "#efbe95"]),
  hair: z.enum(["#252939", "#72492e", "#e4bb65"]),
  top: z.enum(["#ec8753", "#5ba9aa", "#a897cf"]),
  body: z.enum(["standard", "broad"]),
  style: z.enum(["short", "long"]),
});
export type Appearance = z.infer<typeof appearanceSchema>;
export const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("move"),
    dir: z.number().int().min(-1).max(1),
    dirY: z.number().int().min(-1).max(1).default(0),
    sprint: z.boolean(),
    crouch: z.boolean(),
  }),
  z.object({
    type: z.literal("scavenge"),
    index: z.number().int().min(0).max(5),
  }),
  z.object({
    type: z.literal("consume"),
    item: z.enum(["water", "snack", "bandage"]),
  }),
  z.object({
    type: z.literal("build"),
    kind: z.enum(["foundation", "wall", "door", "roof", "storage"]),
    x: z.number().finite(),
    y: z.number().finite().optional(),
    foundation: z.string().max(80).optional(),
  }),
  z.object({
    type: z.literal("attack"),
    target: z.string().max(80),
    weapon: z.enum(["fists", "bat", "pistol"]),
  }),
  z.object({
    type: z.literal("loot"),
    id: z.string().max(80),
    item: z.enum(Object.keys(ITEMS) as [Item, ...Item[]]),
  }),
  z.object({
    type: z.literal("store"),
    id: z.string().max(80),
    item: z.enum(Object.keys(ITEMS) as [Item, ...Item[]]),
  }),
  z.object({
    type: z.literal("trade"),
    item: z.enum(Object.keys(ITEMS) as [Item, ...Item[]]),
    sell: z.boolean(),
  }),
  z.object({ type: z.literal("door"), id: z.string().max(80) }),
  z.object({ type: z.literal("repair"), id: z.string().max(80) }),
  z.object({ type: z.literal("dismantle"), id: z.string().max(80) }),
  z.object({
    type: z.literal("drop"),
    item: z.enum(Object.keys(ITEMS) as [Item, ...Item[]]),
  }),
  z.object({
    type: z.literal("equip"),
    item: z.enum(["fists", "bat", "pistol"]),
  }),
  z.object({ type: z.literal("craft"), item: z.literal("bat") }),
  z.object({ type: z.literal("enter"), foundation: z.string().max(80) }),
  z.object({ type: z.literal("exit") }),
  z.object({
    type: z.literal("aim"),
    x: z.number().finite(),
    y: z.number().finite(),
  }),
  z.object({ type: z.literal("reload") }),
  z.object({ type: z.literal("respawn") }),
  z.object({
    type: z.literal("chat"),
    text: z.string().trim().min(1).max(160),
  }),
]);
export const envelopeSchema = z.object({
  v: z.literal(VERSION),
  requestId: z.string().min(8).max(100),
  at: z.number().int().positive(),
  seq: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  action: actionSchema,
});
export type Action = z.infer<typeof actionSchema>;
export interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  lane: "street" | "parcel";
  parcel: string;
  facing: number;
  facingY: number;
  health: number;
  hunger: number;
  thirst: number;
  energy: number;
  temperature: number;
  inventory: Inventory;
  practiceWoodGranted?: boolean;
  equipped: Inventory;
  cash: number;
  bank: number;
  skills: Record<string, number>;
  appearance: Appearance;
  weapon: "fists" | "bat" | "pistol";
  ammo: number;
  reloadAt: number;
  attackAt: number;
  combatUntil: number;
  protected: boolean;
  dead: boolean;
  cooldowns: Record<string, number>;
}
export interface Structure {
  id: string;
  kind: Kind;
  rotation?: 0 | 90;
  x: number;
  y: number;
  owner: string;
  foundation: string;
  hp: number;
  open: boolean;
  inventory: Inventory;
  cash: number;
}
export interface Bag {
  id: string;
  x: number;
  y: number;
  inventory: Inventory;
  cash: number;
}
export interface StrayDog extends Point {
  id: string;
  homeX: number;
  homeY: number;
  health: number;
  facing: number;
  facingY: number;
  state: "idle" | "walk" | "chase" | "attack" | "hurt" | "dead";
  attackAt: number;
  attackUntil: number;
  biteAt: number;
  nextAttackAt: number;
  hurtUntil: number;
  respawnAt: number;
  roamUntil: number;
  targetId?: string;
  goalX: number;
  goalY: number;
  returning?: boolean;
}
export type DogView = Pick<
  StrayDog,
  | "id"
  | "x"
  | "y"
  | "health"
  | "facing"
  | "facingY"
  | "state"
  | "attackAt"
  | "attackUntil"
  | "hurtUntil"
  | "respawnAt"
>;
export interface ShotVisual {
  id: string;
  shooterId: string;
  from: Point;
  to: Point;
  at: number;
}
export interface WorldState {
  dogs?: Record<string, StrayDog>;
  shots?: Record<string, ShotVisual>;
  wildlifeVersion?: number;
  players: Record<string, Player>;
  structures: Record<string, Structure>;
  bags: Record<string, Bag>;
  clock: number;
  actions: Record<string, { at: number; result: string }>;
  layoutVersion?: number;
}
export function canCarry(inv: Inventory, item: Item, n = 1) {
  const next = { ...inv, [item]: (inv[item] || 0) + n };
  return (
    Object.keys(next).filter((k) => k !== "wood" && next[k as Item]! > 0)
      .length <= 8 &&
    Object.entries(next).every(([k, v]) => v <= ITEMS[k as Item].stack) &&
    Object.entries(next).reduce(
      (s, [k, v]) => s + ITEMS[k as Item].weight * v,
      0,
    ) <= 65
  );
}

export function placementReason(
  player: Pick<Player, "id" | "x" | "y" | "inventory">,
  kind: Kind,
  point: Point,
  structures: Structure[],
  foundationId?: string,
) {
  if (kind === "roof") return "Roofs are not needed";
  if (distance(player, point) > 210) return "Move closer";
  const margin =
    kind === "foundation"
      ? BUILDING.floorSize / 2
      : kind === "storage"
        ? 20
        : 0;
  if (
    safe(point.x, point.y) ||
    !WORLD.parcelRects.some((r) =>
      inRect(point, {
        x: r.x + margin,
        y: r.y + margin,
        width: r.width - margin * 2,
        height: r.height - margin * 2,
      }),
    ) ||
    WORLD.roads.some((r) => inRect(point, r, 32)) ||
    WORLD.obstacles.some((r) => inRect(point, r, 32))
  )
    return "Protected road, public area or parcel edge";
  if (
    structures.filter((s) => s.owner === player.id && s.kind !== "roof")
      .length >= BUILD_BUDGET
  )
    return "Build budget reached";
  if (kind !== "foundation") {
    const candidate = structureFootprint({
      ...point,
      kind,
      rotation: snapBuildPoint(
        kind,
        point,
        structures.find((s) => s.id === foundationId),
      ).rotation,
    });
    if (
      structures.some((s) => {
        if (s.kind === "foundation" || s.kind === "roof") return false;
        const existing = structureFootprint(s);
        const overlapX =
          Math.min(candidate.x + candidate.width, existing.x + existing.width) -
          Math.max(candidate.x, existing.x);
        const overlapY =
          Math.min(
            candidate.y + candidate.height,
            existing.y + existing.height,
          ) - Math.max(candidate.y, existing.y);
        if (overlapX <= 0 || overlapY <= 0) return false;
        const joinsCorner =
          (kind === "wall" || kind === "door") &&
          (s.kind === "wall" || s.kind === "door") &&
          overlapX * overlapY <= BUILDING.wallThickness ** 2 / 4;
        return !joinsCorner;
      })
    )
      return "Space occupied";
  }
  if (kind === "foundation") {
    if (
      structures.some(
        (s) =>
          s.kind === "foundation" &&
          Math.abs(s.x - point.x) < BUILDING.floorSize &&
          Math.abs(s.y - point.y) < BUILDING.floorSize,
      )
    )
      return "Floor overlaps another floor";
  } else {
    const f = structures.find((s) => s.id === foundationId);
    if (
      !f ||
      f.kind !== "foundation" ||
      f.owner !== player.id ||
      !floorSupportsPiece(f, point, kind)
    )
      return "Place this piece on a floor you own";
  }
  if (kind === "wall" || kind === "door" || kind === "storage") {
    const candidate = structureFootprint({
      ...point,
      kind,
      rotation: snapBuildPoint(
        kind,
        point,
        structures.find((s) => s.id === foundationId),
      ).rotation,
    });
    if (inRect(player, candidate, 12)) return "Move out of the placement cell";
  }
  if ((player.inventory.wood || 0) < PIECES[kind].wood)
    return "Not enough wood";
  return "";
}

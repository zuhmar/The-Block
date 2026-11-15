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
  wood: { weight: 1, stack: 50, price: 1 },
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
export interface WorldState {
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
    Object.keys(next).filter((k) => next[k as Item]! > 0).length <= 8 &&
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
  if (distance(player, point) > 210) return "Move closer";
  const margin = kind === "foundation" ? 128 : 32;
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
  if (structures.filter((s) => s.owner === player.id).length >= 40)
    return "Build budget reached";
  if (
    structures.some(
      (s) =>
        distance(s, point) < 48 &&
        (s.kind === kind ||
          (["wall", "door", "storage"].includes(s.kind) &&
            ["wall", "door", "storage"].includes(kind))),
    )
  )
    return "Space occupied";
  if (kind === "foundation") {
    if (
      structures.some(
        (s) => s.kind === "foundation" && distance(s, point) < 192,
      )
    )
      return "Foundation too close";
  } else {
    const f = structures.find((s) => s.id === foundationId);
    if (
      !f ||
      f.kind !== "foundation" ||
      f.owner !== player.id ||
      distance(f, point) > 128
    )
      return "Select a nearby owned foundation";
  }
  if (kind === "wall" || kind === "door" || kind === "storage") {
    if (distance(player, point) < 42) return "Move out of the placement cell";
  }
  return "";
}

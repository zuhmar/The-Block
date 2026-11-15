import { z } from "zod";
export const VERSION = 1;
export const WORLD = {
  width: 6400,
  ground: 560,
  safe: [80, 740],
  store: 1090,
  trader: 1510,
  scavenge: [1850, 2240, 2720, 3430, 4220, 5330],
  parcels: [
    [2900, 3300],
    [3700, 4100],
    [4600, 5100],
    [5600, 6150],
  ],
  grid: 64,
} as const;
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
  lane: "street" | "parcel";
  parcel: string;
  facing: number;
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
  inventory: Inventory;
  cash: number;
}
export interface WorldState {
  players: Record<string, Player>;
  structures: Record<string, Structure>;
  bags: Record<string, Bag>;
  clock: number;
  actions: Record<string, { at: number; result: string }>;
}
export const safe = (x: number) => x >= WORLD.safe[0] && x <= WORLD.safe[1];
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

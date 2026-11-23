export const GATHER_TYPES = {
  "tree-broadleaf": {
    name: "Broadleaf tree",
    resource: "wood",
    health: 100,
    damage: 25,
    yield: 25,
    duration: 0.9,
    respawnMs: 120000,
    action: "chop",
  },
  "tree-pine": {
    name: "Pine tree",
    resource: "wood",
    health: 100,
    damage: 25,
    yield: 25,
    duration: 0.9,
    respawnMs: 120000,
    action: "chop",
  },
  "tree-birch": {
    name: "Birch tree",
    resource: "wood",
    health: 100,
    damage: 25,
    yield: 25,
    duration: 0.9,
    respawnMs: 120000,
    action: "chop",
  },
  "node-rock": {
    name: "Rock node",
    resource: "rock",
    health: 100,
    damage: 25,
    yield: 8,
    duration: 1,
    respawnMs: 45000,
    action: "mine",
  },
  "node-sulfur": {
    name: "Sulfur node",
    resource: "sulfur",
    health: 100,
    damage: 25,
    yield: 5,
    duration: 1,
    respawnMs: 45000,
    action: "mine",
  },
  "node-metal": {
    name: "Metal node",
    resource: "metal",
    health: 125,
    damage: 25,
    yield: 6,
    duration: 1,
    respawnMs: 45000,
    action: "mine",
  },
} as const;
export type GatherKind = keyof typeof GATHER_TYPES;
export type GatherResource = "wood" | "rock" | "sulfur" | "metal";
export type ResourceWallet = { rock: number; sulfur: number; metal: number };
export type SavedResource = {
  id: string;
  kind: GatherKind;
  x: number;
  z: number;
  health: number;
  respawnAt: number;
  generation: number;
};
export type HarvestSave = {
  version: 1;
  trees: Record<string, { health: number; respawnAt: number }>;
  nodes: SavedResource[];
};
export function readWallet(value: unknown): ResourceWallet | undefined {
  if (!value || typeof value !== "object") return undefined;
  const v = value as Partial<ResourceWallet>,
    count = (n: unknown) =>
      typeof n === "number" && Number.isFinite(n)
        ? Math.max(0, Math.min(1000000, Math.floor(n)))
        : 0;
  return {
    rock: count(v.rock),
    sulfur: count(v.sulfur),
    metal: count(v.metal),
  };
}
export function readHarvest(
  value: unknown,
  maxCoordinate: number,
): HarvestSave | undefined {
  if (!value || typeof value !== "object") return undefined;
  const v = value as HarvestSave;
  if (
    v.version !== 1 ||
    !Array.isArray(v.nodes) ||
    v.nodes.length > 90 ||
    !v.trees ||
    typeof v.trees !== "object" ||
    Array.isArray(v.trees) ||
    Object.keys(v.trees).length > 1000
  )
    return undefined;
  const trees: HarvestSave["trees"] = {};
  for (const [id, t] of Object.entries(v.trees)) {
    if (
      !/^tree:-?\d+\.\d{3}:-?\d+\.\d{3}$/.test(id) ||
      !t ||
      !Number.isInteger(t.health) ||
      t.health < 0 ||
      t.health > 100 ||
      !Number.isFinite(t.respawnAt) ||
      t.respawnAt < 0
    )
      continue;
    trees[id] = { health: t.health, respawnAt: t.respawnAt };
  }
  const nodes: SavedResource[] = [],
    ids = new Set<string>();
  for (const n of v.nodes) {
    if (
      !n ||
      !/^node-\d+$/.test(n.id) ||
      ids.has(n.id) ||
      !Object.hasOwn(GATHER_TYPES, n.kind) ||
      !n.kind.startsWith("node-") ||
      !Number.isFinite(n.x) ||
      !Number.isFinite(n.z) ||
      Math.abs(n.x) > maxCoordinate ||
      Math.abs(n.z) > maxCoordinate ||
      !Number.isInteger(n.health) ||
      n.health < 0 ||
      n.health > GATHER_TYPES[n.kind].health ||
      !Number.isFinite(n.respawnAt) ||
      n.respawnAt < 0 ||
      !Number.isInteger(n.generation) ||
      n.generation < 0
    )
      continue;
    ids.add(n.id);
    nodes.push({ ...n });
  }
  return { version: 1, trees, nodes };
}

import { buildingBlocked } from "./building-layout";
export type Point = { x: number; z: number };
export type PieceKind = "floor" | "wall" | "doorway" | "storage";
export type Piece = Point & { id: string; kind: PieceKind; rotation: number };
export type Box = Point & { width: number; depth: number };
export const MAP_SIZE = 128;
export const BUILD_LIMIT = 100;
export const COST: Record<PieceKind, number> = {
  floor: 8,
  wall: 5,
  doorway: 4,
  storage: 5,
};
export const START = { x: 0, z: 14 };
export const ROAD = [
  { x: -60, z: 4 },
  { x: -36, z: 4 },
  { x: -18, z: 0 },
  { x: 8, z: 0 },
  { x: 28, z: 7 },
  { x: 61, z: 7 },
];
export { BUILDINGS } from "./building-layout";

export const LOOT = [
  {
    x: -6,
    z: 8,
    width: 0.8,
    depth: 0.7,
    height: 0.7,
    tier: 1,
    name: "Small supply crate",
    color: 0xb78a55,
  },
  {
    x: -6,
    z: -4,
    width: 1.1,
    depth: 0.85,
    height: 0.9,
    tier: 2,
    name: "Supply crate",
    color: 0x779789,
  },
  {
    x: 13,
    z: -3,
    width: 1.25,
    depth: 1,
    height: 1.05,
    tier: 3,
    name: "Reinforced cache",
    color: 0x688ca6,
  },
  {
    x: 26,
    z: 17,
    width: 2.1,
    depth: 0.6,
    height: 0.55,
    tier: 4,
    name: "Long weapon case",
    color: 0x8b79a9,
  },
  {
    x: 26,
    z: 20,
    width: 2.2,
    depth: 1,
    height: 0.9,
    tier: 5,
    name: "Heavy supply case",
    color: 0xc5a35c,
  },
];
export const riverX = (z: number) => 47 + Math.sin(z * 0.055) * 3;
export function segmentDistance(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    t = Math.max(
      0,
      Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)),
    );
  return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz);
}
export function roadDistance(p: Point) {
  return Math.min(
    ...ROAD.slice(1).map((b, i) => segmentDistance(p, ROAD[i], b)),
  );
}
export function inBox(p: Point, b: Box, radius = 0) {
  return (
    Math.abs(p.x - b.x) < b.width / 2 + radius &&
    Math.abs(p.z - b.z) < b.depth / 2 + radius
  );
}
export const inTown = (p: Point) =>
  p.x > -29 && p.x < 31 && p.z > -23 && p.z < 29;
export const onBridge = (p: Point) => Math.abs(p.z - 7) < 4 && p.x > 39;
export function blockedTerrain(p: Point, radius = 0.32) {
  return (
    Math.abs(p.x) > 61 - radius ||
    Math.abs(p.z) > 61 - radius ||
    (Math.abs(p.x - riverX(p.z)) < 3.3 + radius && !onBridge(p))
  );
}
// Sparse, deterministic trees; open meadows are deliberately left clear for homes.
export const TREES = Array.from({ length: 95 }, (_, i) => {
  const x = Math.sin(i * 127.1 + 31) * 57,
    z = Math.sin(i * 311.7 + 9) * 57;
  return { x, z, width: 0.65, depth: 0.65, scale: 0.8 + (i % 5) * 0.12 };
}).filter(
  (p) =>
    !inTown(p) &&
    roadDistance(p) > 7 &&
    Math.abs(p.x - riverX(p.z)) > 5 &&
    Math.hypot(p.x, p.z - START.z) > 8,
);
export function pieceBox(p: Piece): Box {
  const odd = p.rotation % 2 === 1;
  return {
    ...p,
    width:
      p.kind === "wall"
        ? odd
          ? 0.16
          : 2
        : p.kind === "doorway"
          ? odd
            ? 0.16
            : 2
          : p.kind === "storage"
            ? 1
            : 2,
    depth:
      p.kind === "wall"
        ? odd
          ? 2
          : 0.16
        : p.kind === "doorway"
          ? odd
            ? 2
            : 0.16
          : p.kind === "storage"
            ? 0.8
            : 2,
  };
}
export function blocked(p: Point, pieces: Piece[]) {
  return (
    blockedTerrain(p) ||
    buildingBlocked(p, 0.32) ||
    LOOT.some((b) => inBox(p, b, 0.32)) ||
    TREES.some((t) => inBox(p, t, 0.32)) ||
    pieces.some((s) => {
      if (s.kind === "floor") return false;
      if (s.kind !== "doorway") return inBox(p, pieceBox(s), 0.32);
      return [-0.78, 0.78].some((offset) =>
        inBox(
          p,
          {
            x: s.x + (s.rotation % 2 ? 0 : offset),
            z: s.z + (s.rotation % 2 ? offset : 0),
            width: s.rotation % 2 ? 0.16 : 0.44,
            depth: s.rotation % 2 ? 0.44 : 0.16,
          },
          0.32,
        ),
      );
    })
  );
}
export function movePlayer(p: Point, dx: number, dz: number, pieces: Piece[]) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.15));
  let x = p.x,
    z = p.z;
  for (let i = 0; i < steps; i++) {
    if (!blocked({ x: x + dx / steps, z }, pieces)) x += dx / steps;
    if (!blocked({ x, z: z + dz / steps }, pieces)) z += dz / steps;
  }
  return { x, z };
}
export function snapPiece(
  p: Point,
  kind: PieceKind,
  rotation: number,
): Omit<Piece, "id"> {
  const edge = kind === "wall" || kind === "doorway";
  return {
    kind,
    rotation: rotation % 4,
    x:
      Math.round((p.x - (edge && rotation % 2 === 1 ? 1 : 0)) / 2) * 2 +
      (edge && rotation % 2 === 1 ? 1 : 0),
    z:
      Math.round((p.z - (edge && rotation % 2 === 0 ? 1 : 0)) / 2) * 2 +
      (edge && rotation % 2 === 0 ? 1 : 0),
  };
}
export function placementReason(
  piece: Omit<Piece, "id">,
  player: Point,
  pieces: Piece[],
  wood: number,
) {
  if (pieces.length >= BUILD_LIMIT) return "Build limit reached · 100 pieces";
  if (wood < COST[piece.kind]) return "Not enough wood";
  if (Math.hypot(piece.x - player.x, piece.z - player.z) > 8)
    return "Move closer · building reach is 8 m";
  if (piece.kind === "wall" || piece.kind === "doorway") {
    const supported = pieces.some(
      (p) =>
        p.kind === "floor" &&
        (piece.rotation % 2 === 0
          ? Math.abs(p.x - piece.x) < 0.01 && Math.abs(p.z - piece.z) === 1
          : Math.abs(p.z - piece.z) < 0.01 && Math.abs(p.x - piece.x) === 1),
    );
    if (!supported) return "Place walls and doorways along a floor edge";
  } else if (piece.kind === "floor") {
    for (const dx of [-1, 0, 1])
      for (const dz of [-1, 0, 1]) {
        const p = { x: piece.x + dx, z: piece.z + dz };
        if (inTown(p)) return "Build in the meadows outside town";
        if (roadDistance(p) < 5) return "Keep roads and sidewalks clear";
        if (blockedTerrain(p, 0.3)) return "Choose dry, level ground";
        if (TREES.some((t) => inBox(p, t, 0.6))) return "Keep clear of trees";
      }
  } else if (
    !pieces.some(
      (p) => p.kind === "floor" && p.x === piece.x && p.z === piece.z,
    )
  )
    return "Place storage on a floor";
  if (
    pieces.some(
      (p) =>
        p.kind === piece.kind &&
        p.x === piece.x &&
        p.z === piece.z &&
        ((piece.kind !== "wall" && piece.kind !== "doorway") ||
          p.rotation % 2 === piece.rotation % 2),
    )
  )
    return "This position is occupied";
  if (
    (piece.kind === "wall" || piece.kind === "doorway") &&
    pieces.some(
      (p) =>
        (p.kind === "wall" || p.kind === "doorway") &&
        p.x === piece.x &&
        p.z === piece.z &&
        p.rotation % 2 === piece.rotation % 2,
    )
  )
    return "This edge is occupied";
  if (
    piece.kind !== "floor" &&
    piece.kind !== "doorway" &&
    inBox(player, pieceBox({ ...piece, id: "preview" }), 0.4)
  )
    return "Step out of the placement area";
  return "";
}
export function canRemove(piece: Piece, pieces: Piece[]) {
  if (piece.kind !== "floor") return true;
  return !pieces.some(
    (p) =>
      p.id !== piece.id &&
      (p.kind === "storage"
        ? p.x === piece.x && p.z === piece.z
        : (p.kind === "wall" || p.kind === "doorway") &&
          (p.rotation % 2 === 0
            ? p.x === piece.x && Math.abs(p.z - piece.z) === 1
            : p.z === piece.z && Math.abs(p.x - piece.x) === 1)),
  );
}
export type Save = {
  version: 1;
  wood: number;
  pieces: Piece[];
  opened: number[];
};
export function readSave(raw: string | null): Save {
  const fresh: Save = { version: 1, wood: 10000, pieces: [], opened: [] };
  if (!raw) return fresh;
  try {
    const s = JSON.parse(raw);
    if (
      s.version !== 1 ||
      !Number.isInteger(s.wood) ||
      s.wood < 0 ||
      s.wood > 1000000 ||
      !Array.isArray(s.pieces) ||
      s.pieces.length > 100 ||
      !Array.isArray(s.opened)
    )
      return fresh;
    const ids = new Set<string>();
    for (const p of s.pieces) {
      if (
        !p ||
        typeof p.id !== "string" ||
        ids.has(p.id) ||
        !Object.hasOwn(COST, p.kind) ||
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.z) ||
        Math.abs(p.x) > 60 ||
        Math.abs(p.z) > 60 ||
        !Number.isInteger(p.rotation) ||
        p.rotation < 0 ||
        p.rotation > 3
      )
        return fresh;
      ids.add(p.id);
    }
    return {
      version: 1,
      wood: s.wood,
      pieces: s.pieces,
      opened: s.opened.filter(
        (n: unknown) =>
          Number.isInteger(n) && Number(n) >= 0 && Number(n) < LOOT.length,
      ),
    };
  } catch {
    return fresh;
  }
}

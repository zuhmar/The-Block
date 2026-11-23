import {
  structureMaterial,
  structureHealth,
  maxStructureHealth,
  STRUCTURE_MATERIALS,
  type StructureMaterial,
} from "./structure-health";
import { westConnector } from "./west-road";
import {
  jailGroundBlocked,
  jailGroundSurface,
  jailGroundCeiling,
} from "./jail-ground-layout";
import {
  inWestQuarter,
  ROAD_BINS,
  BIN_SPECS,
  type BinKind,
} from "./west-quarter";
import {
  inCompound,
  compoundBlocked,
  compoundSurface,
} from "./military-compound";
import {
  BUILDINGS,
  buildingStories,
  STORY_HEIGHT,
  buildingSurface,
  buildingCeiling,
  buildingBlocked,
} from "./building-layout";
export type Point = { x: number; z: number; y?: number };
export type PieceKind =
  | "floor"
  | "wall"
  | "doorway"
  | "storage"
  | "foundation"
  | "door";
export type Piece = Point & {
  id: string;
  kind: PieceKind;
  rotation: number;
  open?: boolean;
  doorAngle?: number;
  material?: StructureMaterial;
  health?: number;
};
export type Box = Point & { width: number; depth: number };
export const MAP_SIZE = 384;
export const BUILD_LIMIT = 100;
export const COST: Record<PieceKind, number> = {
  floor: 8,
  foundation: 12,
  door: 4,
  wall: 5,
  doorway: 4,
  storage: 5,
};
export const pieceCost = (p: Pick<Piece, "kind" | "material">) =>
  COST[p.kind] * STRUCTURE_MATERIALS[structureMaterial(p)].costMultiplier;
export const dismantleRefund = (p: Piece) =>
  Math.floor((pieceCost(p) * structureHealth(p)) / maxStructureHealth(p));
export const START = { x: 0, z: 14 };
export const ROAD = [
  { x: -60, z: 4 },
  { x: -38, z: 4 },
  { x: -28, z: 0 },
  { x: -18, z: 0 },
];
export const ROADS = [
  ROAD,
  [
    { x: -18, z: 0 },
    { x: -18, z: -15 },
    { x: 18, z: -15 },
    { x: 18, z: 15 },
    { x: -18, z: 15 },
    { x: -18, z: 0 },
  ],
  [
    { x: 18, z: 3 },
    { x: 29, z: 3 },
    { x: 37, z: 7 },
    { x: 61, z: 7 },
    { x: 116, z: 7 },
    { x: 124, z: 13 },
  ],
];
ROADS.push([
  { x: -188, z: 0 },
  { x: -126, z: 0 },
]);
export const CITY_RING = ROADS[1];
export function configureWestRoad(pieces: Piece[]) {
  const route = westConnector(pieces, TREES, BUILDINGS);
  ROADS.splice(4);
  if (route.length > 1) ROADS.push(route);
}
export const pavedWidth = (road: Point[]) => (road === CITY_RING ? 5.4 : 9);
export function pavedRoadDistance(p: Point) {
  return Math.min(
    ...ROADS.flatMap((road) =>
      road
        .slice(1)
        .map((b, i) => segmentDistance(p, road[i], b) - pavedWidth(road) / 2),
    ),
  );
}
export { BUILDINGS } from "./building-layout";

export type Loot = {
  kind?: "trash";
  model?: BinKind;
  reward?: number;
  x: number;
  z: number;
  y?: number;
  width: number;
  depth: number;
  height: number;
  tier: number;
  name: string;
  color: number;
};
export const LOOT: Loot[] = [
  {
    x: -23,
    z: 6,
    width: 0.8,
    depth: 0.7,
    height: 0.7,
    tier: 1,
    name: "Small supply crate",
    color: 0xb78a55,
  },
  {
    x: -30,
    z: -17,
    width: 1.1,
    depth: 0.85,
    height: 0.9,
    tier: 2,
    name: "Supply crate",
    color: 0x779789,
  },
  {
    x: 24,
    z: -2,
    width: 1.25,
    depth: 1,
    height: 1.05,
    tier: 3,
    name: "Reinforced cache",
    color: 0x688ca6,
  },
  {
    x: 27.5,
    z: 16.5,
    width: 2.1,
    depth: 0.6,
    height: 0.55,
    tier: 4,
    name: "Long weapon case",
    color: 0x8b79a9,
  },
  {
    x: 28,
    z: 12,
    width: 2.2,
    depth: 1,
    height: 0.9,
    tier: 5,
    name: "Heavy supply case",
    color: 0xc5a35c,
  },
];
// Append only: legacy searched indices 0–4 remain stable across this expansion.
const crateTiers = LOOT.slice(0, 5);
BUILDINGS.slice(0, 13).forEach((b, index) => {
  const stories = buildingStories(b);
  const spots = b.type.startsWith("military-")
    ? [
        {
          x: (
            {
              "military-command": -2,
              "military-barracks": 3,
              "military-hangar": 0,
              "military-tent": 0,
              "military-medical": 0,
            } as Record<string, number>
          )[b.type],
          z: (
            {
              "military-command": 1,
              "military-barracks": 3,
              "military-hangar": 0,
              "military-tent": 1.2,
              "military-medical": 1.3,
            } as Record<string, number>
          )[b.type],
          y: 0,
          tier: (
            {
              "military-command": 4,
              "military-barracks": 3,
              "military-hangar": 5,
              "military-tent": 2,
              "military-medical": 3,
            } as Record<string, number>
          )[b.type],
        },
      ]
    : stories > 1
      ? Array.from({ length: stories }, (_, floor) => [
          {
            x: -3.2,
            z: -1.5,
            y: floor * STORY_HEIGHT,
            tier: Math.min(4, floor + 2),
          },
          {
            x: -3.2,
            z: 1.5,
            y: floor * STORY_HEIGHT,
            tier: floor === stories - 1 ? 5 : 1,
          },
        ]).flat()
      : [
          {
            x: [1.7, 2.3, -0.5, -2, 0, -4.8][index],
            z: [1.2, 3.8, 1.8, 2.4, -1.8, 1.4][index],
            y: 0,
            tier: (index % 3) + 1,
          },
        ];
  for (const spot of spots)
    LOOT.push({
      ...crateTiers[spot.tier - 1],
      x: b.x + spot.x,
      z: b.z + spot.z,
      y: spot.y,
    });
});
LOOT.push(
  { ...crateTiers[3], x: 104, z: 12, y: 0 },
  { ...crateTiers[4], x: 69, z: -19, y: 0 },
);
// New entries follow every legacy crate, preserving saved searched indices.
for (const b of BUILDINGS.slice(13)) {
  const stories = buildingStories(b);
  const spots =
    stories > 1
      ? Array.from({ length: stories }, (_, floor) =>
          [-1.5, 1.5].map((z) => ({
            x: -3.2,
            z,
            y: floor * STORY_HEIGHT,
            tier: floor === stories - 1 ? 5 : 2,
          })),
        ).flat()
      : [{ x: 0, z: 0, y: 0, tier: 2 }];
  for (const spot of spots)
    LOOT.push({
      ...crateTiers[spot.tier - 1],
      x: b.x + spot.x,
      z: b.z + spot.z,
      y: spot.y,
    });
}
ROAD_BINS.forEach((p, i) => {
  const model = (["metal", "wheelie", "litter"] as const)[i % 3];
  const spec = BIN_SPECS[model];
  LOOT.push({
    ...p,
    ...spec,
    kind: "trash",
    model,
    tier: 0,
    name:
      model === "wheelie"
        ? "Wheelie bin"
        : model === "metal"
          ? "Metal trash can"
          : "Street litter bin",
    color: model === "wheelie" ? 0x427c61 : 0x637c90,
  });
});
export const lootReward = (c: Loot) => c.reward ?? 20 + c.tier * 25;
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
    ...ROADS.flatMap((road) =>
      road.slice(1).map((b, i) => segmentDistance(p, road[i], b)),
    ),
  );
}
export function inBox(p: Point, b: Box, radius = 0) {
  return (
    Math.abs(p.x - b.x) < b.width / 2 + radius &&
    Math.abs(p.z - b.z) < b.depth / 2 + radius
  );
}
export const inTown = (p: Point) =>
  (p.x > -32 && p.x < 32 && p.z > -32 && p.z < 29) ||
  inCompound(p, 1) ||
  inWestQuarter(p);
export const onBridge = (p: Point) =>
  Math.abs(p.z - 7) < 3 && p.x > 39 && p.x < 54;
export function blockedTerrain(p: Point, radius = 0.32) {
  return (
    Math.abs(p.x) > MAP_SIZE / 2 - 3 - radius ||
    Math.abs(p.z) > MAP_SIZE / 2 - 3 - radius ||
    (Math.abs(p.x - riverX(p.z)) < 3.3 + radius && !onBridge(p))
  );
}
// Sparse, deterministic trees; open meadows are deliberately left clear for homes.
const legacyTrees = Array.from({ length: 95 }, (_, i) => {
  const x = Math.sin(i * 127.1 + 31) * 57,
    z = Math.sin(i * 311.7 + 9) * 57;
  return { x, z, width: 0.65, depth: 0.65, scale: 0.8 + (i % 5) * 0.12 };
});
const outerTrees = Array.from({ length: 280 }, (_, i) => ({
  x: Math.sin(i * 97.3 + 77) * 121,
  z: Math.sin(i * 233.7 + 41) * 121,
  width: 0.65,
  depth: 0.65,
  scale: 0.8 + (i % 5) * 0.12,
})).filter((p) => Math.max(Math.abs(p.x), Math.abs(p.z)) > 65);
export const TREES = [
  ...legacyTrees,
  ...outerTrees,
  ...Array.from({ length: 330 }, (_, i) => ({
    x: Math.sin(i * 97.3 + 16) * 185,
    z: Math.sin(i * 233.7 + 19) * 185,
    width: 0.65,
    depth: 0.65,
    scale: 0.8 + (i % 5) * 0.12,
  })).filter((p) => Math.max(Math.abs(p.x), Math.abs(p.z)) > 129),
].filter(
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
      p.kind === "wall" || p.kind === "door"
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
      p.kind === "wall" || p.kind === "door"
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
export function blocked(
  p: Point,
  pieces: Piece[],
  footHeight = p.y ?? 0,
  ignoreBuildingDoors = false,
) {
  return (
    blockedTerrain(p) ||
    jailGroundBlocked(p, footHeight) ||
    compoundBlocked(p, 0.32, footHeight) ||
    buildingBlocked({ ...p, y: footHeight }, 0.32, ignoreBuildingDoors) ||
    LOOT.some(
      (b) =>
        footHeight + 1.9 > (b.y ?? 0) &&
        footHeight < (b.y ?? 0) + b.height &&
        inBox(p, b, 0.32),
    ) ||
    TREES.some((t) => inBox(p, t, 0.32)) ||
    pieces.some((s) => {
      const bottom = pieceBase(s, pieces),
        top =
          bottom +
          (s.kind === "floor"
            ? 0.18
            : s.kind === "foundation"
              ? 0.5
              : s.kind === "storage"
                ? 1
                : 2.5);
      if (bottom >= footHeight + 1.9 - 0.01 || top <= footHeight + 0.02)
        return false;
      if (isPlatform(s))
        return top > footHeight + 0.75 && inBox(p, pieceBox(s), 0.32);
      if (s.kind === "door") return playerDoorBlocks(p, s, 0.32);
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
export function movePlayer(
  p: Point,
  dx: number,
  dz: number,
  pieces: Piece[],
  footHeight = p.y ?? 0,
) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.15));
  let x = p.x,
    z = p.z;
  for (let i = 0; i < steps; i++) {
    if (!blocked({ x: x + dx / steps, z }, pieces, footHeight)) x += dx / steps;
    if (!blocked({ x, z: z + dz / steps }, pieces, footHeight)) z += dz / steps;
  }
  return { x, z };
}
export function snapPiece(
  p: Point,
  kind: PieceKind,
  rotation: number,
): Omit<Piece, "id"> {
  const edge = kind === "wall" || kind === "doorway" || kind === "door";
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
  if (
    piece.y !== undefined &&
    (!Number.isFinite(piece.y) || piece.y < 0 || piece.y > 40)
  )
    return "Building height limit reached";
  if (pieces.length >= BUILD_LIMIT) return "Build limit reached · 100 pieces";
  if (wood < pieceCost(piece)) return "Not enough wood";
  if (Math.hypot(piece.x - player.x, piece.z - player.z) > 8)
    return "Move closer · building reach is 8 m";
  if (piece.kind === "door") {
    if (!pieces.some((p) => p.kind === "doorway" && sameEdge(p, piece, pieces)))
      return "Place a door in a doorway";
    if (
      (player.y ?? 0) + 1.9 > pieceBase(piece, pieces) &&
      (player.y ?? 0) < pieceBase(piece, pieces) + 2.1 &&
      playerDoorBlocks(player, { ...piece, id: "preview", open: false }, 0.4)
    )
      return "Step out of the doorway";
  } else if (piece.kind === "wall" || piece.kind === "doorway") {
    const supported = pieces.some(
      (p) =>
        isPlatform(p) &&
        (piece.y === undefined
          ? p.y === undefined
          : Math.abs(platformTop(p, pieces) - piece.y) < 0.01) &&
        (piece.rotation % 2 === 0
          ? Math.abs(p.x - piece.x) < 0.01 && Math.abs(p.z - piece.z) === 1
          : Math.abs(p.z - piece.z) < 0.01 && Math.abs(p.x - piece.x) === 1),
    );
    if (!supported) return "Place walls and doorways along a floor edge";
  } else if (isPlatform(piece)) {
    if (piece.y === undefined) {
      const next = [...pieces, { ...piece, id: "support-preview" }];
      const shifted = pieces.some(
        (w) =>
          (w.kind === "wall" || w.kind === "doorway") &&
          Math.abs(pieceBase(w, pieces) - pieceBase(w, next)) > 0.01 &&
          pieces.some(
            (f) =>
              f.kind === "floor" &&
              f.y !== undefined &&
              adjacentEdge(w, f) &&
              Math.abs(f.y - pieceBase(w, pieces) - 2.5) < 0.01,
          ),
      );
      if (shifted) return "Remove upper floors before raising their supports";
    }
    if (piece.kind === "foundation" && piece.y !== undefined && piece.y !== 0)
      return "Place foundations on the ground";
    if (
      piece.kind === "floor" &&
      piece.y !== undefined &&
      !pieces.some(
        (p) =>
          (p.kind === "wall" || p.kind === "doorway") &&
          adjacentEdge(p, piece) &&
          Math.abs(pieceBase(p, pieces) + 2.5 - piece.y!) < 0.01,
      )
    )
      return "Place upper floors on a wall top";
    for (const dx of [-1, 0, 1])
      for (const dz of [-1, 0, 1]) {
        const p = { x: piece.x + dx, z: piece.z + dz };
        if (inTown(p))
          return "Build in the meadows outside towns and compounds";
        if (roadDistance(p) < 5) return "Keep roads and sidewalks clear";
        if (blockedTerrain(p, 0.3)) return "Choose dry, level ground";
        if (TREES.some((t) => inBox(p, t, 0.6))) return "Keep clear of trees";
      }
  } else if (
    !pieces.some(
      (p) =>
        isPlatform(p) &&
        p.x === piece.x &&
        p.z === piece.z &&
        (piece.y === undefined
          ? p.y === undefined
          : Math.abs(platformTop(p, pieces) - piece.y) < 0.01),
    )
  )
    return "Place storage on a floor";
  if (
    pieces.some(
      (p) =>
        p.kind === piece.kind &&
        p.x === piece.x &&
        p.z === piece.z &&
        Math.abs(pieceBase(p, pieces) - pieceBase(piece, pieces)) < 0.01 &&
        ((piece.kind !== "wall" &&
          piece.kind !== "doorway" &&
          piece.kind !== "door") ||
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
        p.rotation % 2 === piece.rotation % 2 &&
        Math.abs(pieceBase(p, pieces) - pieceBase(piece, pieces)) < 0.01,
    )
  )
    return "This edge is occupied";
  if (
    !isPlatform(piece) &&
    piece.kind !== "doorway" &&
    piece.kind !== "door" &&
    Math.abs(pieceBase(piece, pieces) - (player.y ?? 0)) < 1.9 &&
    inBox(player, pieceBox({ ...piece, id: "preview" }), 0.4)
  )
    return "Step out of the placement area";
  return "";
}
export function isPlatform(p: Pick<Piece, "kind">) {
  return p.kind === "floor" || p.kind === "foundation";
}
export function adjacentEdge(edge: Omit<Piece, "id">, tile: Point) {
  return edge.rotation % 2 === 0
    ? Math.abs(edge.x - tile.x) < 0.01 && Math.abs(edge.z - tile.z) === 1
    : Math.abs(edge.z - tile.z) < 0.01 && Math.abs(edge.x - tile.x) === 1;
}
export function sameEdge(
  a: Omit<Piece, "id">,
  b: Omit<Piece, "id">,
  pieces: Piece[] = [],
) {
  return (
    a.x === b.x &&
    a.z === b.z &&
    a.rotation % 2 === b.rotation % 2 &&
    Math.abs(pieceBase(a, pieces) - pieceBase(b, pieces)) < 0.01
  );
}
export function platformTop(p: Omit<Piece, "id">, pieces: Piece[]) {
  return pieceBase(p, pieces) + (p.kind === "foundation" ? 0.5 : 0.18);
}
export function surfaceHeight(p: Point, pieces: Piece[], maxHeight = Infinity) {
  let height = Math.max(
    buildingSurface(p, maxHeight),
    jailGroundSurface(p, maxHeight),
    compoundSurface(p, maxHeight),
  );
  for (const piece of pieces)
    if (
      isPlatform(piece) &&
      inBox(p, { ...piece, width: 2, depth: 2 }, 0.025)
    ) {
      const top = platformTop(piece, pieces);
      if (top <= maxHeight + 0.001) height = Math.max(height, top);
    }
  return height;
}
export function ceilingHeight(p: Point, pieces: Piece[], feet: number) {
  let ceiling = Math.min(buildingCeiling(p, feet), jailGroundCeiling(p, feet));
  for (const s of pieces)
    if (s.kind === "floor" && inBox(p, { ...s, width: 2, depth: 2 }, 0.25)) {
      const base = pieceBase(s, pieces);
      if (base >= feet + 1.9 - 0.01) ceiling = Math.min(ceiling, base);
    }
  return ceiling;
}
export function pieceBase(p: Omit<Piece, "id">, pieces: Piece[]): number {
  if (p.y !== undefined) return p.y;
  if (p.kind === "foundation") return 0;
  if (p.kind === "floor")
    return pieces.some(
      (s) =>
        s.kind === "foundation" &&
        s.y === undefined &&
        s.x === p.x &&
        s.z === p.z,
    )
      ? 0.5
      : 0;
  if (p.kind === "storage") return surfaceHeight(p, pieces, 0.75);
  let h = 0.15;
  for (const s of pieces)
    if (isPlatform(s) && s.y === undefined && adjacentEdge(p, s))
      h = Math.max(h, platformTop(s, pieces));
  return h;
}
/** Infer a story from the actual surface under the crosshair, preserving legacy ground pieces. */
export function snapOnStructure(
  point: Point,
  kind: PieceKind,
  rotation: number,
  hit: Piece,
  pieces: Piece[],
): Omit<Piece, "id"> {
  const candidate = snapPiece(point, kind, rotation);
  if (kind === "floor" && (hit.kind === "wall" || hit.kind === "doorway")) {
    const supporting = pieces.filter(
      (p) =>
        isPlatform(p) &&
        adjacentEdge(hit, p) &&
        Math.abs(platformTop(p, pieces) - pieceBase(hit, pieces)) < 0.01,
    );
    const tile = supporting.sort(
      (a, b) =>
        Math.hypot(a.x - point.x, a.z - point.z) -
        Math.hypot(b.x - point.x, b.z - point.z),
    )[0];
    if (tile) {
      candidate.x = tile.x;
      candidate.z = tile.z;
      candidate.y = pieceBase(hit, pieces) + 2.5;
    }
  } else if (
    isPlatform(hit) &&
    hit.y !== undefined &&
    (kind === "wall" || kind === "doorway" || kind === "storage")
  )
    candidate.y = platformTop(hit, pieces);
  else if (kind === "door" && hit.kind === "doorway") {
    candidate.x = hit.x;
    candidate.z = hit.z;
    candidate.rotation =
      rotation % 2 === hit.rotation % 2 ? rotation : hit.rotation;
    if (hit.y !== undefined) candidate.y = pieceBase(hit, pieces);
  }
  return candidate;
}
export function playerDoorBlocks(
  p: Point,
  door: Piece,
  radius = 0.32,
  angle = door.doorAngle ?? (door.open ? -Math.PI / 2 : 0),
) {
  const r = (door.rotation * Math.PI) / 2,
    dx = p.x - door.x,
    dz = p.z - door.z;
  const x = Math.cos(r) * dx - Math.sin(r) * dz + 0.54,
    z = Math.sin(r) * dx + Math.cos(r) * dz;
  const localX = Math.cos(angle) * x - Math.sin(angle) * z - 0.54,
    localZ = Math.sin(angle) * x + Math.cos(angle) * z;
  return Math.abs(localX) < 0.54 + radius && Math.abs(localZ) < 0.05 + radius;
}
export function advancePlayerDoor(
  door: Piece,
  dt: number,
  occupants: Point[],
  pieces: Piece[] = [],
) {
  const current = door.doorAngle ?? (door.open ? -Math.PI / 2 : 0),
    target = door.open ? -Math.PI / 2 : 0;
  const next =
    current +
    Math.sign(target - current) *
      Math.min(Math.abs(target - current), dt * 3.2);
  const steps = Math.max(1, Math.ceil(Math.abs(next - current) / 0.04));
  for (let i = 1; i <= steps; i++)
    if (
      occupants.some(
        (p) =>
          (p.y === undefined ||
            (p.y + 1.9 > pieceBase(door, pieces) &&
              p.y < pieceBase(door, pieces) + 2.1)) &&
          playerDoorBlocks(
            p,
            door,
            0.34,
            current + ((next - current) * i) / steps,
          ),
      )
    ) {
      door.doorAngle = current;
      return;
    }
  door.doorAngle = next;
}
export function canRemove(piece: Piece, pieces: Piece[]) {
  if (
    piece.kind === "doorway" &&
    pieces.some((p) => p.kind === "door" && sameEdge(piece, p, pieces))
  )
    return false;
  if (piece.kind === "wall" || piece.kind === "doorway")
    return !pieces.some(
      (p) =>
        p.kind === "floor" &&
        p.y !== undefined &&
        adjacentEdge(piece, p) &&
        Math.abs(pieceBase(piece, pieces) + 2.5 - p.y) < 0.01,
    );
  if (!isPlatform(piece)) return true;
  const top = platformTop(piece, pieces);
  return !pieces.some(
    (p) =>
      p.id !== piece.id &&
      ((piece.kind === "foundation" &&
        p.kind === "floor" &&
        p.y === undefined &&
        p.x === piece.x &&
        p.z === piece.z) ||
        (p.kind === "storage" &&
          p.x === piece.x &&
          p.z === piece.z &&
          Math.abs(pieceBase(p, pieces) - top) < 0.01) ||
        ((p.kind === "wall" || p.kind === "doorway") &&
          adjacentEdge(p, piece) &&
          Math.abs(pieceBase(p, pieces) - top) < 0.01)),
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
        (p.y !== undefined && (!Number.isFinite(p.y) || p.y < 0 || p.y > 40)) ||
        Math.abs(p.x) > MAP_SIZE / 2 - 4 ||
        Math.abs(p.z) > MAP_SIZE / 2 - 4 ||
        !Number.isInteger(p.rotation) ||
        p.rotation < 0 ||
        p.rotation > 3 ||
        (p.open !== undefined &&
          (p.kind !== "door" || typeof p.open !== "boolean"))
      )
        return fresh;
      ids.add(p.id);
    }
    return {
      version: 1,
      wood: s.wood,
      pieces: s.pieces
        .filter((p: Piece) => p.health !== 0)
        .map((p: Piece) => ({
          id: p.id,
          kind: p.kind,
          x: p.x,
          z: p.z,
          rotation: p.rotation,
          ...(p.y !== undefined ? { y: p.y } : {}),
          ...(p.material !== undefined
            ? { material: structureMaterial(p) }
            : {}),
          ...(p.health !== undefined
            ? { health: Math.max(1, structureHealth(p)) }
            : {}),
          ...(p.kind === "door" ? { open: !!p.open } : {}),
        })),
      opened: s.opened.filter(
        (n: unknown) =>
          Number.isInteger(n) && Number(n) >= 0 && Number(n) < LOOT.length,
      ),
    };
  } catch {
    return fresh;
  }
}

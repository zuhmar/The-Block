import type { EnemyCombat } from "./enemy-combat";
/** Authored world reservations, fence collisions and outside patrol circuits. */
export const COMPOUND = { minX: 64, maxX: 112, minZ: -21, maxZ: 35 };
export function inCompound(p: { x: number; z: number }, margin = 0) {
  return (
    p.x > COMPOUND.minX - margin &&
    p.x < COMPOUND.maxX + margin &&
    p.z > COMPOUND.minZ - margin &&
    p.z < COMPOUND.maxZ + margin
  );
}
export const COMPOUND_BARRIERS = [
  ...[64, 112].flatMap((x) =>
    [-9, 23].map((z) => ({ x, z, width: 0.16, depth: 24, height: 2.5 })),
  ),
  ...[-21, 35].map((z) => ({ x: 88, z, width: 48, depth: 0.16, height: 2.5 })),
  ...[2, 12].map((z) => ({ x: 66, z, width: 2, depth: 1, height: 0.9 })),
];
export function compoundBlocked(
  p: { x: number; z: number },
  radius = 0.32,
  feet = 0,
) {
  return COMPOUND_BARRIERS.some(
    (b) =>
      (b.height < 1 ? feet + 0.75 < b.height : feet < b.height) &&
      feet + 1.9 > 0 &&
      Math.abs(p.x - b.x) < b.width / 2 + radius &&
      Math.abs(p.z - b.z) < b.depth / 2 + radius,
  );
}
export type PatrolSpec = {
  combat?: EnemyCombat;
  id: string;
  points: readonly { x: number; z: number }[];
  bounds: typeof COMPOUND;
};
export const COMPOUND_PATROLS: PatrolSpec[] = [
  {
    id: "gate-patrol",
    points: [
      { x: 68, z: -3 },
      { x: 68, z: 14 },
      { x: 80, z: 14 },
      { x: 80, z: -3 },
    ],
    bounds: COMPOUND,
  },
  {
    id: "north-patrol",
    points: [
      { x: 86, z: -18 },
      { x: 108, z: -18 },
      { x: 108, z: -3 },
      { x: 86, z: -3 },
    ],
    bounds: COMPOUND,
  },
  {
    id: "tent-patrol",
    points: [
      { x: 68, z: 30 },
      { x: 80, z: 30 },
      { x: 80, z: 14 },
      { x: 68, z: 14 },
    ],
    bounds: COMPOUND,
  },
  {
    id: "supply-patrol",
    points: [
      { x: 91, z: 14 },
      { x: 109, z: 14 },
      { x: 109, z: 32 },
      { x: 91, z: 32 },
    ],
    bounds: COMPOUND,
  },
];

export function compoundSurface(
  p: { x: number; z: number },
  maxHeight: number,
) {
  let height = 0;
  for (const b of COMPOUND_BARRIERS)
    if (
      b.height < 1 &&
      b.height <= maxHeight &&
      Math.abs(p.x - b.x) <= b.width / 2 &&
      Math.abs(p.z - b.z) <= b.depth / 2
    )
      height = Math.max(height, b.height);
  return height;
}

export const JAIL_OFFSET = { x: 0, z: 0 };
/** Permanent prison grounds fit inside the original town's reserved land. */
export const JAIL_GROUNDS = { minX: -14, maxX: 14, minZ: -12, maxZ: 12 };
export const JAIL_TOWERS = [-1, 1].flatMap((x) =>
  [-1, 1].map((z) => ({
    x: x * 11.5,
    z: z * 9.5,
    width: 3,
    depth: 3,
    y: 3.2,
    front: z,
  })),
);
export const JAIL_STAIRS = JAIL_TOWERS.map((t) => ({
  x: t.x,
  startZ: t.front * 2.5,
  direction: t.front,
  run: 5.5,
  width: 1.4,
  y: 0,
  rise: 3.2,
}));
export type GroundBox = {
  x: number;
  z: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  role: string;
};
export const JAIL_BOXES: GroundBox[] = [
  ...[-14, 14].map((x) => ({
    x,
    z: 0,
    y: 0,
    width: 0.15,
    depth: 24,
    height: 3,
    role: "fence",
  })),
  ...[-12, 12].flatMap((z) =>
    [-1, 1].map((side) => ({
      x: side * 8.1,
      z,
      y: 0,
      width: 11.8,
      depth: 0.15,
      height: 3,
      role: "fence",
    })),
  ),
  ...[-9.4, 9.4].map((x) => ({
    x,
    z: 0,
    y: 0,
    width: 0.6,
    depth: 2,
    height: 0.6,
    role: "bench",
  })),
  {
    x: 5.5,
    z: 10.5,
    y: 0,
    width: 0.16,
    depth: 0.16,
    height: 3.3,
    role: "hoop",
  },
  ...JAIL_TOWERS.flatMap((t) => [
    ...[-1, 1].flatMap((dx) =>
      [-1, 1].map((dz) => ({
        x: t.x + dx * 1.35,
        z: t.z + dz * 1.35,
        y: 0,
        width: 0.16,
        depth: 0.16,
        height: 6,
        role: "post",
      })),
    ),
    ...[-1, 1].map((side) => ({
      x: t.x + side * 1.45,
      z: t.z,
      y: t.y,
      width: 0.1,
      depth: 3,
      height: 1,
      role: "rail",
    })),
    {
      x: t.x,
      z: t.z + t.front * 1.45,
      y: t.y,
      width: 3,
      depth: 0.1,
      height: 1,
      role: "rail",
    },
    ...[-1, 1].map((side) => ({
      x: t.x + side * 1.15,
      z: t.z - t.front * 1.45,
      y: t.y,
      width: 0.7,
      depth: 0.1,
      height: 1,
      role: "rail",
    })),
  ]),
];
export function inJailGrounds(p: { x: number; z: number }, margin = 0) {
  return (
    Math.abs(p.x - JAIL_OFFSET.x) <= 14 + margin &&
    Math.abs(p.z - JAIL_OFFSET.z) <= 12 + margin
  );
}
function inside(
  p: { x: number; z: number },
  b: { x: number; z: number; width: number; depth: number },
  r = 0,
) {
  return (
    Math.abs(p.x - b.x) <= b.width / 2 + r &&
    Math.abs(p.z - b.z) <= b.depth / 2 + r
  );
}
export function jailGroundBlocked(
  p: { x: number; z: number },
  feet = 0,
  r = 0.32,
) {
  if (!inJailGrounds(p, 1)) return false;
  if (
    JAIL_BOXES.some(
      (b) =>
        feet + 1.9 > b.y &&
        (b.role === "bench" ? feet + 0.75 < b.height : feet < b.y + b.height) &&
        inside(p, b, r),
    )
  )
    return true;
  return JAIL_STAIRS.some((s) => {
    const progress = ((p.z - s.startZ) * s.direction) / s.run,
      top = s.y + progress * s.rise;
    if (progress < 0 || progress > 1) return false;
    if (
      feet + 1.9 > top &&
      feet < top + 0.9 &&
      [-1, 1].some(
        (side) => Math.abs(p.x - s.x - side * (s.width / 2 + 0.08)) < 0.025 + r,
      )
    )
      return true;
    return (
      Math.abs(p.x - s.x) < s.width / 2 + r &&
      feet + 1.9 > top - 0.2 &&
      feet < top - 0.45
    );
  });
}
export function jailGroundSurface(p: { x: number; z: number }, max: number) {
  if (!inJailGrounds(p)) return 0;
  let y = 0;
  for (const t of JAIL_TOWERS)
    if (t.y <= max + 0.001 && inside(p, t)) y = Math.max(y, t.y);
  for (const b of JAIL_BOXES)
    if (b.role === "bench" && b.height <= max + 0.001 && inside(p, b))
      y = Math.max(y, b.height);
  for (const s of JAIL_STAIRS) {
    const progress = ((p.z - s.startZ) * s.direction) / s.run,
      top = s.y + progress * s.rise;
    if (
      progress >= 0 &&
      progress <= 1 &&
      Math.abs(p.x - s.x) <= s.width / 2 &&
      top <= max + 0.001
    )
      y = Math.max(y, top);
  }
  return y;
}
export function jailGroundCeiling(p: { x: number; z: number }, feet: number) {
  if (!inJailGrounds(p)) return Infinity;
  let y = Infinity;
  for (const t of JAIL_TOWERS) {
    if (!inside(p, t, 0.12)) continue;
    if (t.y - 0.18 >= feet + 1.9 - 0.01) y = Math.min(y, t.y - 0.18);
    y = Math.min(y, 6.05);
  }
  for (const s of JAIL_STAIRS) {
    const progress = ((p.z - s.startZ) * s.direction) / s.run,
      under = s.y + progress * s.rise - 0.2;
    if (
      progress >= 0 &&
      progress <= 1 &&
      Math.abs(p.x - s.x) < s.width / 2 + 0.1 &&
      under >= feet + 1.9 - 0.01
    )
      y = Math.min(y, under);
  }
  return y;
}

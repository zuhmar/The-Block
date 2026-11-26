import { COMPACT } from "./compact-plan";
import architecture from "./models/timber-yard/colliders.json";
import catalog from "./models/timber-yard/catalog.json";
export const TIMBER_YARD = { x: 46, z: 102, width: 32, depth: 32 };
export const timberProps = [
  { asset: "timber-log-cradle", x: -10, z: -10, yaw: 0 },
  { asset: "timber-log-cradle", x: -10, z: 8, yaw: 0 },
  { asset: "timber-plank-pallet", x: -5, z: -9, yaw: 0 },
  { asset: "timber-plank-pallet", x: 8, z: 7, yaw: 0 },
  { asset: "timber-plank-pallet", x: -7, z: 5, yaw: 0 },
  { asset: "timber-forklift", x: 7, z: 1, yaw: Math.PI / 2 },
  { asset: "timber-saw-bench", x: 9, z: -10, yaw: 0 },
  { asset: "timber-capture-terminal", x: 0, z: 0, yaw: 0 },
  { asset: "timber-shipping-container", x: -2, z: -13, yaw: 0 },
] as const;
export const timberColliders = [
  ...architecture,
  ...timberProps.map((p) => {
    const c = catalog[p.asset],
      odd = Math.abs(Math.sin(p.yaw)) > 0.5;
    return {
      x: p.x,
      z: p.z,
      y: 0,
      width: odd ? c.depth : c.width,
      depth: odd ? c.width : c.depth,
      height: c.height,
      projectile: true,
      name: p.asset,
    };
  }),
].map((c) => ({ ...c, x: c.x + TIMBER_YARD.x, z: c.z + TIMBER_YARD.z }));
export function inTimberYard(p: { x: number; z: number }, margin = 0) {
  return (
    COMPACT.active &&
    Math.abs(p.x - TIMBER_YARD.x) <= 16 + margin &&
    Math.abs(p.z - TIMBER_YARD.z) <= 16 + margin
  );
}
export function timberBlocked(
  p: { x: number; z: number },
  feet = 0,
  radius = 0.32,
) {
  if (!inTimberYard(p, radius + 2)) return false;
  return timberColliders.some(
    (c) =>
      feet + 1.9 > c.y &&
      feet < c.y + c.height - 0.02 &&
      Math.abs(p.x - c.x) < c.width / 2 + radius &&
      Math.abs(p.z - c.z) < c.depth / 2 + radius,
  );
}

export function timberSurface(p: { x: number; z: number }, maxHeight: number) {
  return inTimberYard(p) &&
    Math.abs(p.x - TIMBER_YARD.x - 9) < 3 &&
    Math.abs(p.z - TIMBER_YARD.z + 10) < 3 &&
    maxHeight >= 0.03
    ? 0.03
    : 0;
}
export function timberCeiling(p: { x: number; z: number }, feet: number) {
  const x = Math.abs(p.x - TIMBER_YARD.x - 9),
    z = Math.abs(p.z - TIMBER_YARD.z + 10);
  const y = 3.3 + ((3.25 - x) * 1.2) / 3.25;
  return inTimberYard(p) && x < 3.25 && z < 3.25 && feet + 1.9 <= y + 0.01
    ? y
    : Infinity;
}

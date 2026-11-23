/** Small deterministic game-projectile simulation, independent of rendering. */
export type V3 = { x: number; y: number; z: number };
export type ChargeKind = "rocket" | "grenade" | "c4";
export const BLAST = {
  rocket: { radius: 6, damage: 160 },
  grenade: { radius: 5, damage: 110 },
  c4: { radius: 7, damage: 180 },
} as const;
export type Projectile = {
  id: number;
  kind: ChargeKind;
  position: V3;
  velocity: V3;
  fuse: number;
  settled: boolean;
  attachedPieceId?: string;
};
export type Impact = { point: V3; normal: V3 };
export function blastDamage(kind: ChargeKind, distance: number) {
  const b = BLAST[kind];
  return distance >= b.radius
    ? 0
    : Math.round(b.damage * (1 - distance / b.radius));
}
export function advanceProjectile(
  p: Projectile,
  dt: number,
  hit: (a: V3, b: V3) => Impact | undefined,
) {
  if (p.kind === "c4") return false;
  const steps = Math.max(1, Math.ceil(Math.max(0, dt) / 0.016));
  const h = Math.max(0, dt) / steps;
  for (let i = 0; i < steps; i++) {
    p.fuse -= h;
    if (p.fuse <= 0) return true;
    if (p.settled) continue;
    if (p.kind === "grenade") p.velocity.y -= 9.8 * h;
    const next = {
      x: p.position.x + p.velocity.x * h,
      y: p.position.y + p.velocity.y * h,
      z: p.position.z + p.velocity.z * h,
    };
    const collision = hit(p.position, next);
    if (collision) {
      if (p.kind === "rocket") {
        p.position = {
          x: collision.point.x + collision.normal.x * 0.1,
          y: collision.point.y + collision.normal.y * 0.1,
          z: collision.point.z + collision.normal.z * 0.1,
        };
        return true;
      }
      const n = collision.normal,
        dot = p.velocity.x * n.x + p.velocity.y * n.y + p.velocity.z * n.z;
      p.position = {
        x: collision.point.x + n.x * 0.09,
        y: collision.point.y + n.y * 0.09,
        z: collision.point.z + n.z * 0.09,
      };
      for (const axis of ["x", "y", "z"] as const)
        p.velocity[axis] = (p.velocity[axis] - 2 * dot * n[axis]) * 0.42;
      if (Math.hypot(p.velocity.x, p.velocity.y, p.velocity.z) < 1.1) {
        p.settled = true;
        p.velocity = { x: 0, y: 0, z: 0 };
      }
    } else p.position = next;
  }
  return false;
}

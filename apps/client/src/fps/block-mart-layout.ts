import plan from "./models/block-mart/meshy/layout.json";
import { COMPACT } from "./compact-plan";
export { plan as martPlan };
export const isMart = (b: { type: string }) =>
  COMPACT.active && b.type === "store";
type Point = { x: number; z: number; y?: number };
export const martInside = (p: Point) =>
  Math.abs(p.x) < 5 && Math.abs(p.z) < 5 && p.x + p.z < 8;
export const martGlass = [
  {
    a: [4.58, 3.42],
    b: [3.42, 4.58],
    bottom: 2.75,
    top: 3.3,
    thickness: 0.025,
    interior: false,
  },
  {
    a: [5, -3.9],
    b: [5, 1.9],
    bottom: 0.75,
    top: 3.1,
    thickness: 0.12,
    interior: false,
  },
  {
    a: [-3.9, 5],
    b: [1.9, 5],
    bottom: 0.75,
    top: 3.1,
    thickness: 0.12,
    interior: false,
  },
];
export const martFixtureBounds = [
  ...plan.fixtures.flatMap((f) => f.collision),
  ...plan.extras.map((f) => f.bounds),
];
const martWallBounds = [...plan.walls, ...martGlass];
const states = new Map<number, { angles: number[]; targets: boolean[] }>();
export function martState(i: number) {
  let s = states.get(i);
  if (!s) {
    s = { angles: [0, 0, 0], targets: [false, false, false] };
    states.set(i, s);
  }
  return s;
}
export function resetMartDoors() {
  states.clear();
}
export function martDoorPoint(id: number, angle: number) {
  const d = plan.doors[id],
    [tx, tz] = d.tangent,
    h = d.width / 2 - 0.1;
  const rx = tx * Math.cos(angle) + tz * Math.sin(angle),
    rz = tz * Math.cos(angle) - tx * Math.sin(angle);
  return { x: d.center[0] - tx * h + rx * h, z: d.center[1] - tz * h + rz * h };
}
export function martDoorBlocked(id: number, p: Point, angle: number, r = 0.32) {
  const d = plan.doors[id];
  if ((p.y ?? 0) >= d.height || (p.y ?? 0) + 1.9 <= 0) return false;
  const [tx, tz] = d.tangent,
    h = d.width / 2 - 0.1;
  const dx = p.x - (d.center[0] - tx * h),
    dz = p.z - (d.center[1] - tz * h);
  const rx = tx * Math.cos(angle) + tz * Math.sin(angle),
    rz = tz * Math.cos(angle) - tx * Math.sin(angle);
  const along = dx * rx + dz * rz,
    across = -dx * rz + dz * rx;
  return along > -r && along < d.width - 0.2 + r && Math.abs(across) < 0.07 + r;
}
export function animateMartDoors(i: number, dt: number, occupants: Point[]) {
  const s = martState(i);
  for (let id = 1; id < 3; id++) {
    const delta = (s.targets[id] ? Math.PI / 2 : 0) - s.angles[id];
    const next =
      s.angles[id] +
      Math.sign(delta) *
        Math.min(Math.abs(delta), Math.max(0, Math.min(dt, 0.05)) * 4.5);
    if (!occupants.some((p) => martDoorBlocked(id, p, next, 0.36)))
      s.angles[id] = next;
  }
}
export function martBlocked(
  i: number,
  p: Point,
  r: number,
  ignoreDoors: boolean,
  front: number,
) {
  const feet = p.y ?? 0;
  for (const w of martWallBounds) {
    if (feet >= w.top || feet + 1.9 <= w.bottom) continue;
    const dx = w.b[0] - w.a[0],
      dz = w.b[1] - w.a[1],
      length = Math.hypot(dx, dz);
    const x = p.x - w.a[0],
      z = p.z - w.a[1],
      along = (x * dx + z * dz) / length,
      across = (-x * dz + z * dx) / length;
    if (
      along > -r &&
      along < length + r &&
      Math.abs(across) < w.thickness / 2 + r
    )
      return true;
  }
  for (const bounds of martFixtureBounds) {
    const { min, max } = bounds;
    if (
      feet < max[1] &&
      feet + 1.9 > min[1] &&
      p.x > min[0] - r &&
      p.x < max[0] + r &&
      p.z > min[2] - r &&
      p.z < max[2] + r
    )
      return true;
  }
  if (
    !ignoreDoors &&
    plan.doors.some((_, id) =>
      martDoorBlocked(id, p, id === 0 ? front : martState(i).angles[id], r),
    )
  )
    return true;
  return false;
}

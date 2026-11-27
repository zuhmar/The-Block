import {
  ROADS,
  pavedWidth,
  segmentDistance,
  blocked,
  LOOT,
  type Point,
} from "./world";
import {
  COMPACT,
  CITY_PLOTS,
  RESOURCE_PARKS,
  inRect,
  onCityLand,
} from "./compact-plan";
import { CITY_FRONTAGES } from "./building-frontage";
import { BUILDINGS, buildingWorld } from "./building-layout";
export type StreetSegment = {
  a: Point;
  b: Point;
  length: number;
  ux: number;
  uz: number;
  width: number;
  lane: number;
};
export type StreetJunction = Point & { arms: Point[] };
export type StreetProp = Point & {
  kind: "lamp" | "clutter" | "bench" | "hydrant" | "dumpster";
  width: number;
  depth: number;
  height: number;
  y: number;
  yaw: number;
};
export const STREET_PLAN = {
  segments: [] as StreetSegment[],
  junctions: [] as StreetJunction[],
  props: [] as StreetProp[],
};
export function clearCityStreets() {
  STREET_PLAN.segments.splice(0);
  STREET_PLAN.junctions.splice(0);
  STREET_PLAN.props.splice(0);
}
export function streetPropBlocked(p: Point, feet = 0, radius = 0.32) {
  return (
    COMPACT.active &&
    STREET_PLAN.props.some(
      (c) =>
        feet < c.height &&
        feet + 1.9 > c.y &&
        Math.abs(p.x - c.x) < c.width / 2 + radius &&
        Math.abs(p.z - c.z) < c.depth / 2 + radius,
    )
  );
}
export function configureCityStreets() {
  clearCityStreets();
  if (!COMPACT.active) return;
  const seen = new Set<string>();
  for (const road of ROADS)
    for (let i = 1; i < road.length; i++) {
      const a = road[i - 1],
        b = road[i],
        length = Math.hypot(a.x - b.x, a.z - b.z);
      if (length < 0.01) continue;
      const key = [`${a.x},${a.z}`, `${b.x},${b.z}`].sort().join("/");
      if (seen.has(key)) continue;
      seen.add(key);
      const width = pavedWidth(road);
      STREET_PLAN.segments.push({
        a: { ...a },
        b: { ...b },
        length,
        ux: (b.x - a.x) / length,
        uz: (b.z - a.z) / length,
        width,
        lane: width < 6 ? 3.6 : 6,
      });
    }
  const candidates = new Map<string, Point>();
  const horizontal = STREET_PLAN.segments.filter((s) => Math.abs(s.uz) < 0.001),
    vertical = STREET_PLAN.segments.filter((s) => Math.abs(s.ux) < 0.001);
  for (const h of horizontal)
    for (const v of vertical) {
      const p = { x: v.a.x, z: h.a.z };
      if (
        p.x < Math.min(h.a.x, h.b.x) - 0.01 ||
        p.x > Math.max(h.a.x, h.b.x) + 0.01 ||
        p.z < Math.min(v.a.z, v.b.z) - 0.01 ||
        p.z > Math.max(v.a.z, v.b.z) + 0.01 ||
        !onCityLand(p)
      )
        continue;
      candidates.set(`${p.x},${p.z}`, p);
    }
  for (const p of candidates.values()) {
    const arms = [
      { x: 1, z: 0 },
      { x: -1, z: 0 },
      { x: 0, z: 1 },
      { x: 0, z: -1 },
    ].filter((d) =>
      STREET_PLAN.segments.some(
        (s) =>
          segmentDistance(p, s.a, s.b) < 0.01 &&
          segmentDistance(
            { x: p.x + d.x * 0.5, z: p.z + d.z * 0.5 },
            s.a,
            s.b,
          ) < 0.01,
      ),
    );
    if (arms.length >= 3) STREET_PLAN.junctions.push({ ...p, arms });
  }
  function free(p: Point, size: number) {
    return (
      onCityLand(p) &&
      !CITY_PLOTS.some((r) => inRect(p, r, size + 0.6)) &&
      !RESOURCE_PARKS.some((r) => inRect(p, r, size)) &&
      !CITY_FRONTAGES.some(
        (f) => segmentDistance(p, f.door, f.street) < size + 1.15,
      ) &&
      !STREET_PLAN.junctions.some(
        (j) => Math.hypot(j.x - p.x, j.z - p.z) < 8,
      ) &&
      !STREET_PLAN.props.some((c) => Math.hypot(c.x - p.x, c.z - p.z) < 6) &&
      !LOOT.some(
        (c) =>
          Math.abs(c.x - p.x) < c.width / 2 + size + 0.8 &&
          Math.abs(c.z - p.z) < c.depth / 2 + size + 0.8,
      ) &&
      [-size, 0, size].every((dx) =>
        [-size, 0, size].every(
          (dz) => !blocked({ x: p.x + dx, z: p.z + dz }, [], 0, true),
        ),
      )
    );
  }
  for (const [i, s] of STREET_PLAN.segments.entries())
    for (let t = 12; t < s.length - 9; t += 27) {
      const side = (Math.floor(t / 27) + i) % 2 ? 1 : -1,
        nx = -s.uz * side,
        nz = s.ux * side,
        p = {
          x: s.a.x + s.ux * t + nx * (s.width / 2 + 0.45),
          z: s.a.z + s.uz * t + nz * (s.width / 2 + 0.45),
        };
      if (free(p, 0.45))
        STREET_PLAN.props.push({
          ...p,
          y: 0,
          width: 0.26,
          depth: 0.26,
          height: 4.25,
          yaw: Math.atan2(-nx, -nz),
          kind: "lamp",
        });
    }
  for (const [i, b] of BUILDINGS.entries()) {
    if (
      i % 4 !== 0 ||
      b.type === "jail" ||
      b.type.startsWith("north-") ||
      b.type.startsWith("military-")
    )
      continue;
    const f = CITY_FRONTAGES.find((f) => f.index === i);
    if (!f) continue;
    const toward = buildingWorld(b, { x: 0, z: b.depth / 2 }),
      away = buildingWorld(b, { x: 0, z: -b.depth / 2 });
    const front =
      Math.hypot(toward.x - f.door.x, toward.z - f.door.z) <
      Math.hypot(away.x - f.door.x, away.z - f.door.z)
        ? 1
        : -1;
    const p = buildingWorld(b, {
      x: -b.width / 2 + 1,
      z: front * (b.depth / 2 + 1.1),
    });
    if (
      free(p, 0.55) &&
      STREET_PLAN.segments.every(
        (s) => segmentDistance(p, s.a, s.b) > s.lane / 2 + 0.9,
      )
    )
      STREET_PLAN.props.push({
        ...p,
        y: 0,
        width: 1,
        depth: 0.7,
        height: 0.56,
        yaw: 0,
        kind: "clutter",
      });
  }
  const dressing = [
    { kind: "bench" as const, width: 1.8, depth: 1.069, height: 1.242 },
    { kind: "hydrant" as const, width: 0.577, depth: 0.582, height: 0.85 },
    { kind: "dumpster" as const, width: 2, depth: 1.08, height: 1.554 },
  ];
  for (const [j, s] of STREET_PLAN.segments.entries())
    for (let t = 17; t < s.length - 12; t += 23) {
      const spec = dressing[(j + Math.floor(t / 23)) % 3];
      if (STREET_PLAN.props.filter((p) => p.kind === spec.kind).length >= 8)
        continue;
      const side = (j + Math.floor(t / 23)) % 2 ? 1 : -1,
        nx = -s.uz * side,
        nz = s.ux * side;
      const p = {
        x: s.a.x + s.ux * t + nx * (s.width / 2 + 1.35),
        z: s.a.z + s.uz * t + nz * (s.width / 2 + 1.35),
      };
      const yaw = spec.kind === "dumpster" ? 0 : Math.atan2(-nx, -nz),
        c = Math.abs(Math.cos(yaw)),
        a = Math.abs(Math.sin(yaw));
      const width = spec.width * c + spec.depth * a,
        depth = spec.depth * c + spec.width * a;
      if (free(p, Math.hypot(width, depth) / 2 + 0.15))
        STREET_PLAN.props.push({
          ...p,
          kind: spec.kind,
          width,
          depth,
          height: spec.height,
          y: 0.035,
          yaw,
        });
    }
}

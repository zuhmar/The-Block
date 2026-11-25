/** Shared authored city footprint. Legacy layouts remain available for save compatibility. */
export const COMPACT = { active: false };
export const JAIL_ISLAND = { x: 0, z: -124, rx: 24, rz: 26 };
export const JAIL_BRIDGE = { x: 0, minZ: -104, maxZ: -72, width: 8 };
export const CITY_OUTLINE = [
  { x: -158, z: -80 },
  { x: 158, z: -80 },
  { x: 162, z: -76 },
  { x: 162, z: 170 },
  { x: 156, z: 176 },
  { x: -156, z: 176 },
  { x: -162, z: 170 },
  { x: -162, z: -76 },
];
export const RESOURCE_PARKS = [
  { x: -144, z: 102, width: 24, depth: 28, kind: "node-rock" },
  { x: 132, z: 102, width: 24, depth: 28, kind: "node-sulfur" },
  { x: 132, z: 146, width: 24, depth: 28, kind: "node-metal" },
  { x: -144, z: 20, width: 22, depth: 24, kind: "tree" },
  { x: 44, z: 16, width: 22, depth: 24, kind: "tree" },
  { x: 42, z: 102, width: 20, depth: 24, kind: "tree" },
] as const;
export function inRect(
  p: { x: number; z: number },
  r: { x: number; z: number; width: number; depth: number },
  margin = 0,
) {
  return (
    Math.abs(p.x - r.x) <= r.width / 2 + margin &&
    Math.abs(p.z - r.z) <= r.depth / 2 + margin
  );
}
export function onCityLand(p: { x: number; z: number }) {
  let inside = false;
  for (
    let i = 0, j = CITY_OUTLINE.length - 1;
    i < CITY_OUTLINE.length;
    j = i++
  ) {
    const a = CITY_OUTLINE[i],
      b = CITY_OUTLINE[j];
    if (
      a.z > p.z !== b.z > p.z &&
      p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x
    )
      inside = !inside;
  }
  return inside;
}
export function onJailBridge(p: { x: number; z: number }, radius = 0) {
  return (
    Math.abs(p.x) < JAIL_BRIDGE.width / 2 - radius &&
    p.z > JAIL_BRIDGE.minZ &&
    p.z < JAIL_BRIDGE.maxZ
  );
}
export function compactLand(p: { x: number; z: number }, radius = 0) {
  return [
    [0, 0],
    [-radius, 0],
    [radius, 0],
    [0, -radius],
    [0, radius],
  ].every(([dx, dz]) => {
    const q = { x: p.x + dx, z: p.z + dz };
    return (
      onCityLand(q) ||
      ((q.x - JAIL_ISLAND.x) / JAIL_ISLAND.rx) ** 2 +
        ((q.z - JAIL_ISLAND.z) / JAIL_ISLAND.rz) ** 2 <
        1 ||
      onJailBridge(q)
    );
  });
}
export function parkSite(
  p: { x: number; z: number },
  radius: number,
  kind?: string,
) {
  return RESOURCE_PARKS.some(
    (r) =>
      (!kind || r.kind === (kind.startsWith("tree") ? "tree" : kind)) &&
      inRect(p, r, -radius),
  );
}
export function denseOutline(points: readonly { x: number; z: number }[]) {
  return points.flatMap((a, i) => {
    const b = points[(i + 1) % points.length],
      n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z));
    return Array.from({ length: n }, (_, j) => ({
      x: a.x + ((b.x - a.x) * j) / n,
      z: a.z + ((b.z - a.z) * j) / n,
    }));
  });
}
export const jailOutline = () =>
  Array.from({ length: 129 }, (_, i) => ({
    x: JAIL_ISLAND.x + Math.cos((i / 128) * Math.PI * 2) * JAIL_ISLAND.rx,
    z: JAIL_ISLAND.z + Math.sin((i / 128) * Math.PI * 2) * JAIL_ISLAND.rz,
  }));
export const CITY_PLOTS: import("./survival-state").HousingPlot[] = [];

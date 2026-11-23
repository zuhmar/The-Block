/** Coast stays outside every previously buildable point in the 384m world. */
export const WORLD_SIZE = 640;
export function coastLimits(x: number) {
  const h =
    250 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x) / 250, 6)), 1 / 6);
  const envelope = Math.min(1, h / 60),
    wave = (7 * Math.sin(x * 0.055) + 3 * Math.sin(x * 0.11)) * envelope;
  const blend = Math.min(
    1,
    Math.max(0, (x + 126) / 10),
    Math.max(0, (10 - x) / 10),
  );
  return {
    north: -h + wave,
    south: (h + wave * 0.6) * (1 - blend) + 234 * blend,
  };
}
export function onIsland(p: { x: number; z: number }, radius = 0) {
  for (const [dx, dz] of [
    [0, 0],
    [-radius, 0],
    [radius, 0],
    [0, -radius],
    [0, radius],
  ]) {
    const x = p.x + dx,
      z = p.z + dz;
    if (Math.abs(x) >= 250) return false;
    const edge = coastLimits(x);
    if (z <= edge.north || z >= edge.south) return false;
  }
  return true;
}
export const COASTLINE = [
  ...Array.from({ length: 1001 }, (_, i) => {
    const x = -250 + i * 0.5;
    return { x, z: coastLimits(x).south };
  }),
  ...Array.from({ length: 999 }, (_, i) => {
    const x = 249.5 - i * 0.5;
    return { x, z: coastLimits(x).north };
  }),
];

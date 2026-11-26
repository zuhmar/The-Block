export type WaterPoint = { x: number; z: number };
/** Extrude a closed coast along its outward normals, preserving corners and arc-length UVs. */
export function waterRibbon(
  points: readonly WaterPoint[],
  inner: number,
  outer: number,
  y: number,
) {
  const p = points.filter(
    (v, i) =>
      !i || Math.hypot(v.x - points[i - 1].x, v.z - points[i - 1].z) > 1e-5,
  );
  if (
    p.length > 1 &&
    Math.hypot(p[0].x - p.at(-1)!.x, p[0].z - p.at(-1)!.z) < 1e-5
  )
    p.pop();
  if (p.length < 3) throw Error("Water ribbon needs a closed outline");
  const area = p.reduce((s, a, i) => {
      const b = p[(i + 1) % p.length];
      return s + a.x * b.z - b.x * a.z;
    }, 0),
    sign = area >= 0 ? 1 : -1;
  const positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  const perimeter = p.reduce((sum, a, i) => {
    const b = p[(i + 1) % p.length];
    return sum + Math.hypot(b.x - a.x, b.z - a.z);
  }, 0);
  const repeats = Math.max(2, Math.round(perimeter / 12) * 2);
  let distance = 0;
  for (let i = 0; i <= p.length; i++) {
    const a = p[(i + p.length - 1) % p.length],
      b = p[i % p.length],
      c = p[(i + 1) % p.length];
    const prev = Math.hypot(b.x - a.x, b.z - a.z),
      next = Math.hypot(c.x - b.x, c.z - b.z);
    const nx1 = (sign * (b.z - a.z)) / prev,
      nz1 = (-sign * (b.x - a.x)) / prev,
      nx2 = (sign * (c.z - b.z)) / next,
      nz2 = (-sign * (c.x - b.x)) / next;
    let nx = nx1 + nx2,
      nz = nz1 + nz2;
    const length = Math.hypot(nx, nz);
    nx /= length || 1;
    nz /= length || 1;
    const miter = 1 / Math.max(0.3, nx * nx2 + nz * nz2);
    if (i) distance += prev;
    for (const [j, offset] of [inner, outer].entries()) {
      positions.push(b.x + nx * offset * miter, y, b.z + nz * offset * miter);
      uv.push((distance / perimeter) * repeats, j);
    }
    if (i < p.length) {
      const v = i * 2;
      indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
  }
  return { positions, uv, indices };
}
export function waterCircle(
  x: number,
  z: number,
  radius: number,
  segments = 12,
): WaterPoint[] {
  return Array.from({ length: segments }, (_, i) => ({
    x: x + Math.cos((i * Math.PI * 2) / segments) * radius,
    z: z + Math.sin((i * Math.PI * 2) / segments) * radius,
  }));
}
export const RIPPLE_LIMIT = 16,
  RIPPLE_SECONDS = 1.8;

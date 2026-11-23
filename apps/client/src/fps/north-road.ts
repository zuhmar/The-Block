import type { Piece, Point } from "./world";
import { northEntry, NORTH_LAB } from "./north-lab-layout";
export const NORTH_ROAD: Point[] = [];
export function northConnector(
  pieces: Piece[],
  buildings: (Point & { width: number; depth: number })[],
): Point[] {
  if (!NORTH_LAB.enabled) return [];
  const start = { x: 18, z: -15 },
    gate = northEntry(),
    end = { x: gate.x, z: gate.z + 6 };
  const clear = (p: Point) =>
    pieces.every((s) => Math.abs(s.x - p.x) > 5 || Math.abs(s.z - p.z) > 5) &&
    buildings.every(
      (b) =>
        Math.abs(b.x - p.x) > b.width / 2 + 3.5 ||
        Math.abs(b.z - p.z) > b.depth / 2 + 3.5,
    );
  const line = (a: Point, b: Point) => {
    const n = Math.max(1, Math.ceil(Math.hypot(a.x - b.x, a.z - b.z)));
    for (let i = 0; i <= n; i++)
      if (
        !clear({
          x: a.x + ((b.x - a.x) * i) / n,
          z: a.z + ((b.z - a.z) * i) / n,
        })
      )
        return false;
    return true;
  };
  // A broad S bend naturally leaves the city grid and approaches the compound gate.
  const controls = [
    start,
    { x: 18, z: -55 },
    { x: -12, z: -83 },
    { x: end.x + 24, z: end.z + 8 },
    end,
  ];
  const smooth: Point[] = [start];
  for (let i = 0; i < controls.length - 1; i++) {
    const a = controls[Math.max(0, i - 1)],
      b = controls[i],
      c = controls[i + 1],
      d = controls[Math.min(controls.length - 1, i + 2)];
    for (let j = 1; j <= 8; j++) {
      const t = j / 8,
        t2 = t * t,
        t3 = t2 * t;
      const at = (k: "x" | "z") =>
        0.5 *
        (2 * b[k] +
          (-a[k] + c[k]) * t +
          (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 +
          (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t3);
      smooth.push({ x: at("x"), z: at("z") });
    }
  }
  if (smooth.every((p, i) => !i || line(smooth[i - 1], p)))
    return [...smooth, gate];
  const key = (p: Point) => `${p.x},${p.z}`,
    queue = [start],
    parent = new Map<string, Point>(),
    seen = new Set([key(start)]);
  let goal: Point | undefined;
  for (let i = 0; i < queue.length && i < 22000; i++) {
    const p = queue[i];
    if (Math.hypot(p.x - end.x, p.z - end.z) < 3 && line(p, end)) {
      goal = p;
      break;
    }
    for (const [dx, dz] of [
      [0, -2],
      [-2, 0],
      [2, 0],
      [0, 2],
    ]) {
      const n = { x: p.x + dx, z: p.z + dz };
      if (
        n.x < -225 ||
        n.x > 30 ||
        n.z < -230 ||
        n.z > -13 ||
        seen.has(key(n)) ||
        !line(p, n)
      )
        continue;
      seen.add(key(n));
      parent.set(key(n), p);
      queue.push(n);
    }
  }
  if (!goal) return [];
  const path = [end, goal];
  while (parent.has(key(path.at(-1)!)))
    path.push(parent.get(key(path.at(-1)!))!);
  path.reverse();
  const result = [start];
  let i = 0;
  while (i < path.length - 1) {
    let j = path.length - 1;
    while (j > i + 1 && !line(path[i], path[j])) j--;
    result.push(path[j]);
    i = j;
  }
  return [...result, gate];
}

import type { Piece, Point } from "./world";
/** Route only the new connector around saved bases; existing roads never move. */
export function westConnector(
  pieces: Piece[],
  trees: Point[] = [],
  buildings: (Point & { width: number; depth: number })[] = [],
): Point[] {
  const start = { x: -60, z: 4 },
    end = { x: -126, z: 0 };
  const obstacles = [...pieces, ...trees]
    .filter((p) => p.x < -53 && p.x > -133)
    .map((p) => ({ x: p.x, z: p.z }));
  const clear = (p: Point) =>
    obstacles.every(
      (o) => Math.abs(p.x - o.x) > 6 || Math.abs(p.z - o.z) > 6,
    ) &&
    buildings.every(
      (b) =>
        Math.abs(p.x - b.x) > b.width / 2 + 4.7 ||
        Math.abs(p.z - b.z) > b.depth / 2 + 4.7,
    );
  const line = (a: Point, b: Point) => {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) * 2);
    for (let i = 0; i <= steps; i++)
      if (
        !clear({
          x: a.x + ((b.x - a.x) * i) / steps,
          z: a.z + ((b.z - a.z) * i) / steps,
        })
      )
        return false;
    return true;
  };
  if (line(start, end)) return [start, end];
  const key = (p: Point) => `${p.x},${p.z}`,
    queue = [start],
    parent = new Map<string, Point>(),
    seen = new Set([key(start)]);
  let goal: Point | undefined;
  for (let i = 0; i < queue.length && i < 12000; i++) {
    const p = queue[i];
    if (Math.hypot(p.x - end.x, p.z - end.z) <= 2 && line(p, end)) {
      goal = p;
      break;
    }
    for (const [dx, dz] of [
      [-2, 0],
      [0, -2],
      [0, 2],
      [2, 0],
    ]) {
      const n = { x: p.x + dx, z: p.z + dz };
      if (
        n.x < -128 ||
        n.x > -58 ||
        Math.abs(n.z) > 112 ||
        seen.has(key(n)) ||
        !line(p, n)
      )
        continue;
      seen.add(key(n));
      parent.set(key(n), p);
      queue.push(n);
    }
  }
  if (!goal) return []; // Keep a base intact if the route is completely enclosed.
  const path = [end, goal];
  while (parent.has(key(path[path.length - 1])))
    path.push(parent.get(key(path[path.length - 1]))!);
  path.reverse();
  const simplified = [path[0]];
  let i = 0;
  while (i < path.length - 1) {
    let j = path.length - 1;
    while (j > i + 1 && !line(path[i], path[j])) j--;
    simplified.push(path[j]);
    i = j;
  }
  return simplified;
}

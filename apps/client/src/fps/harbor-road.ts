import type { Point, Piece } from "./world";
import { HARBOR_ENTRY } from "./harbor-layout";
/** Smooth only new road segments that have full clearance from saved bases. */
export function harborConnector(
  pieces: Piece[],
  trees: Point[],
  buildings: (Point & { width: number; depth: number })[],
): Point[] {
  const start = { x: -14, z: 15 },
    end = HARBOR_ENTRY;
  const clear = (p: Point) =>
    pieces.every((o) => Math.abs(p.x - o.x) > 6 || Math.abs(p.z - o.z) > 6) &&
    trees.every((o) => Math.hypot(p.x - o.x, p.z - o.z) > 6) &&
    buildings.every(
      (b) =>
        Math.abs(p.x - b.x) > b.width / 2 + 5 ||
        Math.abs(p.z - b.z) > b.depth / 2 + 5,
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
  const key = (p: Point) => `${p.x},${p.z}`,
    queue = [start],
    prev = new Map<string, Point>(),
    scores = new Map([[key(start), 0]]);
  let goal: Point | undefined;
  for (let count = 0; queue.length && count < 18000; count++) {
    let best = 0;
    for (let i = 1; i < queue.length; i++)
      if (
        scores.get(key(queue[i]))! +
          Math.hypot(queue[i].x - end.x, queue[i].z - end.z) <
        scores.get(key(queue[best]))! +
          Math.hypot(queue[best].x - end.x, queue[best].z - end.z)
      )
        best = i;
    const p = queue.splice(best, 1)[0];
    if (Math.hypot(p.x - end.x, p.z - end.z) <= 2 && line(p, end)) {
      goal = p;
      break;
    }
    for (const [dx, dz] of [
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ]) {
      const n = { x: p.x + dx, z: p.z + dz };
      if (
        n.x < -124 ||
        n.x > 20 ||
        n.z < 15 ||
        n.z > 209 ||
        scores.has(key(n)) ||
        !line(p, n)
      )
        continue;
      scores.set(key(n), scores.get(key(p))! + 2);
      prev.set(key(n), p);
      queue.push(n);
    }
  }
  if (!goal) return [];
  const path = [end, goal];
  while (prev.has(key(path[path.length - 1])))
    path.push(prev.get(key(path[path.length - 1]))!);
  path.reverse();
  const result = [path[0]];
  for (let i = 0; i < path.length - 1; ) {
    let j = path.length - 1;
    while (j > i + 1 && !line(path[i], path[j])) j--;
    result.push(path[j]);
    i = j;
  }
  return result;
}

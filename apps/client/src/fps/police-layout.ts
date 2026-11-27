import { COMPACT } from "./compact-plan";
import { patrolPath } from "./enemy";
import type { PatrolSpec } from "./military-compound";
import type { Point } from "./world";
const blocks = [
  {
    name: "residential",
    corners: [
      [-123, -28],
      [-53, -28],
      [-53, 35],
      [-123, 35],
    ],
  },
  {
    name: "downtown",
    corners: [
      [-43, 45],
      [13, 45],
      [13, 75],
      [-43, 75],
    ],
  },
  {
    name: "industrial",
    corners: [
      [94, 86],
      [148, 86],
      [148, 118],
      [94, 118],
    ],
  },
];
let cached: PatrolSpec[] | undefined;
export function streetPolicePatrols(): PatrolSpec[] {
  if (!COMPACT.active) return [];
  if (cached) return cached;
  cached = blocks.flatMap(({ name, corners }) => {
    const points: Point[] = [];
    for (let i = 0; i < corners.length; i++) {
      const a = { x: corners[i][0], z: corners[i][1] },
        b = { x: corners[(i + 1) % 4][0], z: corners[(i + 1) % 4][1] };
      const leg = patrolPath(
        a,
        b,
        {
          id: name,
          points: [a, b],
          bounds: {
            minX: Math.min(a.x, b.x) - 4,
            maxX: Math.max(a.x, b.x) + 4,
            minZ: Math.min(a.z, b.z) - 4,
            maxZ: Math.max(a.z, b.z) + 4,
          },
        },
        [],
      );
      if (!leg.length)
        throw Error("No clear sidewalk patrol route for " + name);
      points.push(
        a,
        ...leg.filter((p) => Math.hypot(p.x - b.x, p.z - b.z) > 0.01),
      );
    }
    // Keep corners/detours only. Both partners walk the same route, three metres apart.
    const route = points.filter((p, i) => {
      const a = points[(i + points.length - 1) % points.length],
        b = points[(i + 1) % points.length];
      return (
        Math.abs((p.x - a.x) * (b.z - p.z) - (p.z - a.z) * (b.x - p.x)) > 0.001
      );
    });
    const a = route[0],
      b = route[route.length - 1],
      length = Math.hypot(b.x - a.x, b.z - a.z);
    const follower = {
      x: a.x + (b.x - a.x) * Math.min(3 / length, 0.7),
      z: a.z + (b.z - a.z) * Math.min(3 / length, 0.7),
    };
    const bounds = {
      minX: Math.min(...route.map((p) => p.x)) - 24,
      maxX: Math.max(...route.map((p) => p.x)) + 24,
      minZ: Math.min(...route.map((p) => p.z)) - 24,
      maxZ: Math.max(...route.map((p) => p.z)) + 24,
    };
    return [route, [follower, ...route]].map((points, i) => ({
      id: `street-police-${name}-${i + 1}`,
      points,
      bounds,
      combat: {
        health: 125,
        damage: 15,
        aim: 0.9,
        cooldown: 1.4,
        speed: 2.5,
        burst: 1,
        interval: 0.2,
        magazine: 12,
        reload: 1.8,
      },
    }));
  });
  return cached;
}

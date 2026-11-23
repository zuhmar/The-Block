import { doorBlocksPoint, frontOf } from "./building-layout";
import type { PatrolSpec } from "./military-compound";
import {
  BUILDINGS,
  blocked,
  movePlayer,
  type Point,
  type Piece,
} from "./world";
export const ENEMY_TYPES = {
  lookout: {
    name: "Lookout",
    spawn: { x: -14, z: 33 },
    health: 75,
    damage: 12,
    aim: 1.1,
    cooldown: 1.8,
    speed: 2,
  },
  police: {
    name: "Police",
    spawn: { x: -32, z: -30 },
    health: 125,
    damage: 15,
    aim: 0.9,
    cooldown: 1.4,
    speed: 2.2,
  },
  swat: {
    name: "SWAT",
    spawn: { x: 32, z: -32 },
    health: 225,
    damage: 18,
    aim: 0.7,
    cooldown: 1,
    speed: 2.6,
  },
} as const;
export type EnemyKind = keyof typeof ENEMY_TYPES;
export const ENEMY_SPAWN = { x: -14, z: 33 };
export type Enemy = Point & {
  kind: EnemyKind;
  health: number;
  state: "patrol" | "chase" | "aim" | "down";
  timer: number;
  target: Point;
  yaw: number;
  shots: number;
  patrol?: PatrolSpec;
  waypoint?: number;
  route?: Point[];
  stuckFor?: number;
};
export const newEnemy = (
  kind: EnemyKind = "lookout",
  pieces: Piece[] = [],
  patrol?: PatrolSpec,
): Enemy => {
  const seed = patrol?.points[0] ?? ENEMY_TYPES[kind].spawn;
  let spawn: Point = { ...seed };
  if (blocked(spawn, pieces)) {
    search: for (let radius = 1; radius <= 8; radius++)
      for (let n = 0; n < 16; n++) {
        const angle = (n * Math.PI) / 8,
          p = {
            x: seed.x + Math.cos(angle) * radius,
            z: seed.z + Math.sin(angle) * radius,
          };
        if (!blocked(p, pieces)) {
          spawn = p;
          break search;
        }
      }
  }
  return {
    kind,
    ...spawn,
    health: ENEMY_TYPES[kind].health,
    state: "patrol",
    timer: 0,
    target: { ...spawn },
    yaw: 0,
    shots: 0,
    ...(patrol ? { patrol, waypoint: 1, route: [] } : {}),
  };
};
/** A small cached grid is used only when a guard must rejoin its patrol after combat. */
const navCache = new Map<string, Set<string>>();
function patrolPath(
  from: Point,
  to: Point,
  spec: PatrolSpec,
  pieces: Piece[],
): Point[] {
  const bounds = spec.bounds,
    key = JSON.stringify(bounds);
  let cells = navCache.get(key);
  if (!cells) {
    cells = new Set<string>();
    for (let x = bounds.minX + 1; x < bounds.maxX; x++)
      for (let z = bounds.minZ + 1; z < bounds.maxZ; z++) {
        if (!blocked({ x, z }, [], 0, true)) cells.add(x + "," + z);
      }
    navCache.set(key, cells);
  }
  const goal = [Math.round(to.x), Math.round(to.z)],
    id = (x: number, z: number) => x + "," + z;
  const blockedDoors = new Set<string>();
  BUILDINGS.forEach((b, i) => {
    if (
      b.x + b.width / 2 < bounds.minX ||
      b.x - b.width / 2 > bounds.maxX ||
      b.z + b.depth / 2 < bounds.minZ ||
      b.z - b.depth / 2 > bounds.maxZ
    )
      return;
    const entry = b.z + (frontOf(b) * b.depth) / 2;
    for (let x = Math.floor(b.x) - 2; x <= Math.ceil(b.x) + 2; x++)
      for (let z = Math.floor(entry) - 2; z <= Math.ceil(entry) + 2; z++)
        if (doorBlocksPoint(i, { x, z })) blockedDoors.add(id(x, z));
  });
  const nearbyPieces = pieces.filter(
    (p) =>
      p.x > bounds.minX - 2 &&
      p.x < bounds.maxX + 2 &&
      p.z > bounds.minZ - 2 &&
      p.z < bounds.maxZ + 2,
  );
  const candidates: Point[] = [];
  for (let x = Math.round(from.x) - 2; x <= Math.round(from.x) + 2; x++)
    for (let z = Math.round(from.z) - 2; z <= Math.round(from.z) + 2; z++)
      if (cells.has(id(x, z)) && !blockedDoors.has(id(x, z)))
        candidates.push({ x, z });
  candidates.sort(
    (a, b) =>
      Math.hypot(a.x - from.x, a.z - from.z) -
      Math.hypot(b.x - from.x, b.z - from.z),
  );
  const entry = candidates.find((p) => {
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(p.x - from.x, p.z - from.z) / 0.1),
    );
    for (let i = 1; i <= steps; i++)
      if (
        blocked(
          {
            x: from.x + ((p.x - from.x) * i) / steps,
            z: from.z + ((p.z - from.z) * i) / steps,
          },
          nearbyPieces,
        )
      )
        return false;
    return true;
  });
  if (!entry) return [];
  const start = [entry.x, entry.z];
  const first = id(...(start as [number, number])),
    last = id(...(goal as [number, number]));
  const open = [{ x: start[0], z: start[1], cost: 0, score: 0 }],
    cost = new Map([[first, 0]]),
    parent = new Map<string, string>();
  let found = false;
  for (let n = 0; open.length && n < 4000; n++) {
    open.sort((a, b) => b.score - a.score);
    const p = open.pop()!,
      current = id(p.x, p.z);
    if (current === last) {
      found = true;
      break;
    }
    if (p.cost !== cost.get(current)) continue;
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = p.x + dx,
        z = p.z + dz,
        k = id(x, z),
        c = p.cost + 1;
      if (
        !cells.has(k) ||
        blockedDoors.has(k) ||
        c >= (cost.get(k) ?? Infinity) ||
        (nearbyPieces.length > 0 && blocked({ x, z }, nearbyPieces))
      )
        continue;
      cost.set(k, c);
      parent.set(k, current);
      open.push({
        x,
        z,
        cost: c,
        score: c + Math.abs(x - goal[0]) + Math.abs(z - goal[1]),
      });
    }
  }
  if (!found) return [];
  const path: Point[] = [{ ...to }];
  let cursor = last;
  while (cursor !== first) {
    const [x, z] = cursor.split(",").map(Number);
    path.push({ x, z });
    cursor = parent.get(cursor)!;
    if (!cursor) return [];
  }
  path.reverse();
  if (Math.hypot(entry.x - from.x, entry.z - from.z) > 0.01)
    path.unshift(entry);
  return path;
}
function roam(enemy: Enemy, pieces: Piece[], dt: number, returning: boolean) {
  const spec = enemy.patrol!;
  let at = enemy.waypoint ?? 1;
  if (returning) {
    at = spec.points.reduce(
      (best, p, i) =>
        Math.hypot(p.x - enemy.x, p.z - enemy.z) <
        Math.hypot(spec.points[best].x - enemy.x, spec.points[best].z - enemy.z)
          ? i
          : best,
      0,
    );
    enemy.waypoint = at;
    enemy.route = patrolPath(enemy, spec.points[at], spec, pieces);
  }
  let target = enemy.route?.[0] ?? spec.points[at];
  let distance = Math.hypot(target.x - enemy.x, target.z - enemy.z);
  if (distance < 0.18) {
    if (enemy.route?.length) enemy.route.shift();
    else enemy.waypoint = (at + 1) % spec.points.length;
    target = enemy.route?.[0] ?? spec.points[enemy.waypoint ?? 1];
    distance = Math.hypot(target.x - enemy.x, target.z - enemy.z);
  }
  if (distance < 0.001) return;
  const stride = Math.min(distance, 1.25 * dt),
    dx = (target.x - enemy.x) / distance,
    dz = (target.z - enemy.z) / distance;
  const next = movePlayer(enemy, dx * stride, dz * stride, pieces);
  if (Math.hypot(next.x - enemy.x, next.z - enemy.z) < 0.001) {
    enemy.stuckFor = (enemy.stuckFor ?? 0) + dt;
    if (enemy.stuckFor >= 0.6) {
      enemy.route = patrolPath(
        enemy,
        spec.points[enemy.waypoint ?? 1],
        spec,
        pieces,
      );
      enemy.stuckFor = 0;
    }
  } else enemy.stuckFor = 0;
  enemy.x = next.x;
  enemy.z = next.z;
  enemy.yaw = Math.atan2(-dx, -dz);
}
// Aim locks before firing, giving a moving player time to dodge the projectile.
export function updateEnemy(
  enemy: Enemy,
  player: Point,
  pieces: Piece[],
  dt: number,
  visible: boolean,
): Point | undefined {
  const tuning = ENEMY_TYPES[enemy.kind];
  dt = Math.min(0.1, Math.max(0, dt));
  if (enemy.health <= 0) {
    enemy.state = "down";
    enemy.timer += dt;
    if (enemy.timer >= 30)
      Object.assign(enemy, newEnemy(enemy.kind, pieces, enemy.patrol));
    return;
  }
  const distance = Math.hypot(player.x - enemy.x, player.z - enemy.z);
  if (distance > 23 || !visible) {
    const returning = enemy.state !== "patrol";
    enemy.state = "patrol";
    enemy.timer = 0;
    if (enemy.patrol) roam(enemy, pieces, dt, returning);
    return;
  }
  enemy.yaw = Math.atan2(enemy.x - player.x, enemy.z - player.z);
  if (enemy.state === "aim") {
    enemy.timer -= dt;
    if (enemy.timer <= 1e-6) {
      enemy.shots++;
      enemy.timer = tuning.cooldown;
      enemy.state = "chase";
      return { ...enemy.target };
    }
    return;
  }
  if (distance > 11) {
    const dx = (player.x - enemy.x) / distance,
      dz = (player.z - enemy.z) / distance;
    let next = movePlayer(
      enemy,
      dx * tuning.speed * dt,
      dz * tuning.speed * dt,
      pieces,
    );
    if (Math.hypot(next.x - enemy.x, next.z - enemy.z) < dt * 0.1)
      next = movePlayer(enemy, -dz * 1.5 * dt, dx * 1.5 * dt, pieces);
    const bounds = enemy.patrol?.bounds;
    if (
      !bounds ||
      (next.x > bounds.minX + 0.6 &&
        next.x < bounds.maxX - 0.6 &&
        next.z > bounds.minZ + 0.6 &&
        next.z < bounds.maxZ - 0.6)
    ) {
      enemy.x = next.x;
      enemy.z = next.z;
    }
  }
  enemy.state = "chase";
  enemy.timer = Math.max(0, enemy.timer - dt);
  if (distance < 18 && enemy.timer === 0) {
    enemy.state = "aim";
    enemy.timer = tuning.aim;
    enemy.target = { ...player };
  }
}
export function damageEnemy(enemy: Enemy, damage: number) {
  if (enemy.health <= 0) return false;
  enemy.health = Math.max(0, enemy.health - damage);
  if (!enemy.health) {
    enemy.state = "down";
    enemy.timer = 0;
  }
  return true;
}
export function segmentHitsPlayer(
  a: Point & { y: number },
  b: Point & { y: number },
  player: Point,
  height: number,
) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    dz = b.z - a.z,
    len = dx * dx + dy * dy + dz * dz;
  return [0.45, 0.95, 1.45].some((y) => {
    const t = Math.max(
      0,
      Math.min(
        1,
        ((player.x - a.x) * dx +
          (height + y - a.y) * dy +
          (player.z - a.z) * dz) /
          Math.max(0.00001, len),
      ),
    );
    return (
      Math.hypot(
        a.x + dx * t - player.x,
        a.y + dy * t - height - y,
        a.z + dz * t - player.z,
      ) < 0.35
    );
  });
}

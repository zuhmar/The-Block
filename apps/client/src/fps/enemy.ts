import { blocked, movePlayer, type Point, type Piece } from "./world";
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
};
export const newEnemy = (
  kind: EnemyKind = "lookout",
  pieces: Piece[] = [],
): Enemy => {
  const seed = ENEMY_TYPES[kind].spawn;
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
  };
};
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
    if (enemy.timer >= 30) Object.assign(enemy, newEnemy(enemy.kind, pieces));
    return;
  }
  const distance = Math.hypot(player.x - enemy.x, player.z - enemy.z);
  if (distance > 23 || !visible) {
    enemy.state = "patrol";
    enemy.timer = 0;
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
    enemy.x = next.x;
    enemy.z = next.z;
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

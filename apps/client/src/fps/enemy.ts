import { movePlayer, type Point, type Piece } from "./world";
export const ENEMY_SPAWN = { x: -14, z: 33 };
export type Enemy = Point & {
  health: number;
  state: "patrol" | "chase" | "aim" | "down";
  timer: number;
  target: Point;
  yaw: number;
  shots: number;
};
export const newEnemy = (): Enemy => ({
  ...ENEMY_SPAWN,
  health: 75,
  state: "patrol",
  timer: 0,
  target: { ...ENEMY_SPAWN },
  yaw: 0,
  shots: 0,
});
// Aim locks before firing, giving a moving player time to dodge the projectile.
export function updateEnemy(
  enemy: Enemy,
  player: Point,
  pieces: Piece[],
  dt: number,
  visible: boolean,
): Point | undefined {
  dt = Math.min(0.1, Math.max(0, dt));
  if (enemy.health <= 0) {
    enemy.state = "down";
    enemy.timer += dt;
    if (enemy.timer >= 30) Object.assign(enemy, newEnemy());
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
      enemy.timer = 1.8;
      enemy.state = "chase";
      return { ...enemy.target };
    }
    return;
  }
  if (distance > 11) {
    const dx = (player.x - enemy.x) / distance,
      dz = (player.z - enemy.z) / distance;
    let next = movePlayer(enemy, dx * 2 * dt, dz * 2 * dt, pieces);
    if (Math.hypot(next.x - enemy.x, next.z - enemy.z) < dt * 0.1)
      next = movePlayer(enemy, -dz * 1.5 * dt, dx * 1.5 * dt, pieces);
    enemy.x = next.x;
    enemy.z = next.z;
  }
  enemy.state = "chase";
  enemy.timer = Math.max(0, enemy.timer - dt);
  if (distance < 18 && enemy.timer === 0) {
    enemy.state = "aim";
    enemy.timer = 1.1;
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

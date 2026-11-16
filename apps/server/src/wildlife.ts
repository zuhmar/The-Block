import {
  WORLD,
  safe,
  distance,
  type Point,
  type Player,
  type StrayDog,
  type WorldState,
} from "../../../packages/shared/src/index.js";
import {
  DOG_HOMES,
  DOG_RULES as R,
} from "../../../packages/game-data/wildlife.js";

export function createDog(id: string, home: Point): StrayDog {
  return {
    id,
    ...home,
    homeX: home.x,
    homeY: home.y,
    health: R.health,
    facing: 1,
    facingY: 0,
    state: "idle",
    attackAt: 0,
    attackUntil: 0,
    biteAt: 0,
    nextAttackAt: 0,
    hurtUntil: 0,
    respawnAt: 0,
    roamUntil: 0,
    goalX: home.x,
    goalY: home.y,
  };
}
function spawnPoint(home: Point, blocked: (point: Point) => boolean) {
  for (let radius = 0; radius <= 192; radius += 24)
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const p = {
        x: Math.max(24, Math.min(WORLD.width - 24, home.x + radius * dx)),
        y: Math.max(24, Math.min(WORLD.height - 24, home.y + radius * dy)),
      };
      if (!safe(p.x, p.y) && !blocked(p)) return p;
    }
}
export function ensureDogs(
  world: WorldState,
  blocked: (point: Point) => boolean,
) {
  world.dogs ||= {};
  if (world.wildlifeVersion === 1) return;
  for (const [index, home] of DOG_HOMES.entries()) {
    const id = `stray-${index}`,
      point = spawnPoint(home, blocked);
    if (!world.dogs[id] && point)
      world.dogs[id] = { ...createDog(id, home), ...point };
  }
  world.wildlifeVersion = 1;
}
export function damageDog(dog: StrayDog, damage: number, now: number) {
  dog.health = Math.max(0, dog.health - damage);
  dog.biteAt = 0;
  dog.attackUntil = 0;
  dog.hurtUntil = now + 220;
  dog.state = dog.health ? "hurt" : "dead";
  if (!dog.health) {
    dog.respawnAt = now + R.respawnMs;
    dog.targetId = undefined;
  }
}
export function tickDogs(
  world: WorldState,
  dt: number,
  active: Set<string>,
  now: number,
  rules: {
    blocked(point: Point): boolean;
    obstruction(a: Point, b: Point): boolean;
    kill(player: Player): void;
  },
) {
  const eligible = (p: Player | undefined): p is Player =>
    !!p && active.has(p.id) && !p.dead && !p.protected && !safe(p.x, p.y);
  const step = Math.max(0, Math.min(dt, 0.25));
  function walk(dog: StrayDog, goal: Point, speed: number) {
    const length = distance(dog, goal);
    if (length < 4) return false;
    const dx = (goal.x - dog.x) / length,
      dy = (goal.y - dog.y) / length;
    dog.facing = dx;
    dog.facingY = dy;
    const amount = Math.min(length, speed * step),
      count = Math.max(1, Math.ceil(amount / 6));
    const before = { x: dog.x, y: dog.y };
    for (let i = 0; i < count; i++) {
      const x = Math.max(
        24,
        Math.min(WORLD.width - 24, dog.x + (dx * amount) / count),
      );
      if (!safe(x, dog.y) && !rules.blocked({ x, y: dog.y })) dog.x = x;
      const y = Math.max(
        24,
        Math.min(WORLD.height - 24, dog.y + (dy * amount) / count),
      );
      if (!safe(dog.x, y) && !rules.blocked({ x: dog.x, y })) dog.y = y;
    }
    return distance(before, dog) > 0.1;
  }
  for (const dog of Object.values(world.dogs || {})) {
    const home = { x: dog.homeX, y: dog.homeY };
    if (dog.health <= 0) {
      if (now >= dog.respawnAt) {
        const point = spawnPoint(home, rules.blocked);
        if (point)
          world.dogs![dog.id] = { ...createDog(dog.id, home), ...point };
      }
      continue;
    }
    if (dog.hurtUntil > now) {
      dog.state = "hurt";
      continue;
    }
    if (dog.biteAt && now >= dog.biteAt) {
      dog.biteAt = 0;
      const p = world.players[dog.targetId || ""];
      if (
        eligible(p) &&
        distance(dog, p) <= R.biteRange &&
        !rules.obstruction(dog, p) &&
        !safe(dog.x, dog.y)
      ) {
        p.health = Math.max(0, p.health - R.damage);
        p.combatUntil = now + 20000;
        if (p.health <= 0) rules.kill(p);
      }
    }
    if (dog.attackUntil > now) {
      dog.state = "attack";
      continue;
    }
    if (distance(dog, home) > R.leashRange) dog.returning = true;
    if (dog.returning) {
      dog.targetId = undefined;
      if (distance(dog, home) < 40) dog.returning = false;
      else {
        dog.state = walk(dog, home, R.chaseSpeed) ? "walk" : "idle";
        continue;
      }
    }
    let target: Player | undefined = world.players[dog.targetId || ""];
    if (
      !eligible(target) ||
      distance(dog, target) > R.chaseRange ||
      distance(home, target) > R.leashRange + 60 ||
      rules.obstruction(dog, target)
    )
      target = undefined;
    if (!target)
      target = Object.values(world.players)
        .filter(
          (p) =>
            eligible(p) &&
            distance(dog, p) <= R.aggroRange &&
            distance(home, p) <= R.leashRange + 60 &&
            !rules.obstruction(dog, p),
        )
        .sort((a, b) => distance(dog, a) - distance(dog, b))[0];
    dog.targetId = target?.id;
    if (target) {
      const length = distance(dog, target);
      if (length <= R.biteRange - 4) {
        dog.state = "idle";
        if (now >= dog.nextAttackAt) {
          dog.facing = (target.x - dog.x) / (length || 1);
          dog.facingY = (target.y - dog.y) / (length || 1);
          dog.attackAt = now;
          dog.attackUntil = now + R.attackMs;
          dog.biteAt = now + R.windupMs;
          dog.nextAttackAt = now + R.cooldownMs;
          dog.state = "attack";
        }
      } else dog.state = walk(dog, target, R.chaseSpeed) ? "chase" : "idle";
      continue;
    }
    if (now >= dog.roamUntil) {
      const seed = [...dog.id].reduce((n, c) => n + c.charCodeAt(0), 0),
        angle = now / 5000 + seed * 1.7;
      const goal = {
        x: home.x + Math.cos(angle) * 80,
        y: home.y + Math.sin(angle) * 80,
      };
      dog.goalX = goal.x;
      dog.goalY = goal.y;
      dog.roamUntil = now + 3000;
      if (safe(goal.x, goal.y) || rules.blocked(goal)) {
        dog.goalX = home.x;
        dog.goalY = home.y;
      }
    }
    dog.state = walk(dog, { x: dog.goalX, y: dog.goalY }, R.roamSpeed)
      ? "walk"
      : "idle";
  }
}

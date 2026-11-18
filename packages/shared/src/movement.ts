import {
  WORLD,
  inRect,
  structureFootprint,
  type Point,
  type Structure,
} from "./index.js";
import { terrainBlocked, mapObstacleEnabled } from "./terrain.js";
export interface MovementInput {
  dir: number;
  dirY: number;
  sprint: boolean;
  crouch: boolean;
}
export interface MovingActor extends Point {
  dead?: boolean;
  energy: number;
  hunger: number;
  thirst: number;
}
export const movementSpeed = (p: MovingActor, i: MovementInput) =>
  (i.crouch ? 60 : i.sprint && p.energy > 8 ? 235 : 145) *
  (p.hunger < 15 || p.thirst < 15 ? 0.7 : 1);
export function movementBlocked(
  structures: Iterable<Structure> | (() => Iterable<Structure>),
  p: Point,
) {
  if (
    terrainBlocked(p) ||
    WORLD.obstacles.some((r) => mapObstacleEnabled(r) && inRect(p, r, 12))
  )
    return true;
  for (const s of typeof structures === "function" ? structures() : structures)
    if (
      s.hp > 0 &&
      (s.kind === "wall" || (s.kind === "door" && !s.open)) &&
      inRect(p, structureFootprint(s), 12)
    )
      return true;
  return false;
}
export function advanceMovement(
  p: MovingActor,
  input: MovementInput,
  dt: number,
  blocked: (point: Point) => boolean,
): Point {
  const point = { x: p.x, y: p.y },
    magnitude = Math.hypot(input.dir, input.dirY);
  if (p.dead || !magnitude) return point;
  const step = movementSpeed(p, input) * Math.min(0.25, Math.max(0, dt)),
    dx = (input.dir / magnitude) * step,
    dy = (input.dirY / magnitude) * step,
    count = Math.max(1, Math.ceil(step / 8));
  for (let i = 0; i < count; i++) {
    const x = Math.max(24, Math.min(WORLD.width - 24, point.x + dx / count));
    if (!blocked({ x, y: point.y })) point.x = x;
    const y = Math.max(24, Math.min(WORLD.height - 24, point.y + dy / count));
    if (!blocked({ x: point.x, y })) point.y = y;
  }
  return point;
}

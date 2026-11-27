import { updateEnemy, patrolPath, type Enemy } from "./enemy";
import { blocked, movePlayer, type Point, type Piece } from "./world";
import { newPoliceMemory } from "./police-state";
export type PolicePerson = {
  id: string;
  position: Point;
  alive: boolean;
  safe: boolean;
};
export type PoliceSight = (from: Point, to: Point) => boolean;
export const isStreetPolice = (e: Enemy) =>
  e.kind === "police" && !!e.patrol?.id.startsWith("street-police-");
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
const eyes = (p: Point, height = 1.4) => ({ ...p, y: (p.y ?? 0) + height });
function canSee(
  e: Enemy,
  p: Point,
  sight: PoliceSight,
  range = 32,
  turn = false,
) {
  const d = distance(e, p);
  return (
    d <= range &&
    (turn ||
      d < 0.6 ||
      (-Math.sin(e.yaw) * (p.x - e.x) - Math.cos(e.yaw) * (p.z - e.z)) / d >
        -0.3) &&
    sight(eyes(e), eyes(p, 1.1))
  );
}
/** A sound gives a location, never an unseen player's identity or live position. */
export function reportPoliceViolence(
  officers: Enemy[],
  actor: PolicePerson,
  point: Point,
  kind: "gunfire" | "assault" | "explosion",
  sight: PoliceSight,
  now: number,
  victim?: Enemy,
) {
  const witnessed: Enemy[] = [];
  for (const e of officers) {
    if (!isStreetPolice(e) || e.health <= 0) continue;
    const m = (e.police ??= newPoliceMemory());
    const identified =
      actor.alive &&
      !actor.safe &&
      canSee(e, actor.position, sight, 32, victim === e) &&
      (kind !== "explosion" ||
        (distance(actor.position, point) <= 12 &&
          sight(eyes(e), eyes(point, 0.4))));
    if (
      identified &&
      (!m.suspectId ||
        m.suspectId === actor.id ||
        m.phase !== "pursue" ||
        victim === e)
    ) {
      const fresh = m.suspectId !== actor.id || m.phase !== "pursue";
      Object.assign(m, {
        phase: "pursue",
        suspectId: actor.id,
        lastSeen: { ...actor.position },
        forgetAt: now + 20000,
        searchLeft: 0,
        pauseLeft: 0,
        progressLeft: 10,
      });
      if (fresh) {
        m.cover = undefined;
        m.replanAt = 0;
        e.route = [];
        e.burst = undefined;
        e.timer = 0.25;
      }
      if (victim === e) m.underFireUntil = now + 2500;
      witnessed.push(e);
    } else if (kind !== "assault" && distance(e, point) <= 45 && !m.suspectId) {
      const changed =
        !m.lastSeen ||
        distance(m.lastSeen, point) > 2 ||
        m.phase === "patrol" ||
        m.phase === "return";
      m.forgetAt = now + 20000;
      if (changed) {
        Object.assign(m, {
          phase: "investigate",
          lastSeen: { ...point },
          searchLeft: 0,
          pauseLeft: 0,
          replanAt: 0,
          progressLeft: 10,
        });
        e.route = [];
      }
    }
  }
  // Only a nearby partner receives the report, including the last observed location.
  // It must reacquire that same suspect itself before firing.
  for (const witness of witnessed)
    for (const partner of officers) {
      if (
        partner === witness ||
        witnessed.includes(partner) ||
        !isStreetPolice(partner) ||
        partner.health <= 0 ||
        distance(partner, witness) > 20 ||
        partner.patrol!.id.slice(0, -1) !== witness.patrol!.id.slice(0, -1)
      )
        continue;
      const m = (partner.police ??= newPoliceMemory());
      if (m.suspectId && m.suspectId !== actor.id) continue;
      const changed =
        !m.lastSeen || distance(m.lastSeen, actor.position) > 2 || !m.suspectId;
      m.forgetAt = now + 20000;
      if (m.phase !== "pursue" && changed) {
        Object.assign(m, {
          phase: "investigate",
          suspectId: actor.id,
          lastSeen: { ...actor.position },
          searchLeft: 0,
          pauseLeft: 0,
          replanAt: 0,
          progressLeft: 10,
        });
        partner.route = [];
      }
    }
  return witnessed.length;
}
function clearWalk(a: Point, b: Point, pieces: Piece[]) {
  const n = Math.max(1, Math.ceil(distance(a, b) / 0.2));
  for (let i = 1; i <= n; i++)
    if (
      blocked(
        { x: a.x + ((b.x - a.x) * i) / n, z: a.z + ((b.z - a.z) * i) / n },
        pieces,
      )
    )
      return false;
  return true;
}
function walk(
  e: Enemy,
  goal: Point,
  pieces: Piece[],
  dt: number,
  speed: number,
  now: number,
) {
  const m = e.police!;
  if (distance(e, goal) < 0.35) return true;
  if (distance(e, goal) < 8 && clearWalk(e, goal, pieces))
    e.route = [{ ...goal }];
  else if (now >= m.replanAt) {
    m.replanAt = now + 1500;
    const bounds = e.patrol!.bounds;
    const local = {
      minX: Math.max(bounds.minX, Math.min(e.x, goal.x) - 6),
      maxX: Math.min(bounds.maxX, Math.max(e.x, goal.x) + 6),
      minZ: Math.max(bounds.minZ, Math.min(e.z, goal.z) - 6),
      maxZ: Math.min(bounds.maxZ, Math.max(e.z, goal.z) + 6),
    };
    e.route = patrolPath(e, goal, { ...e.patrol!, bounds: local }, pieces);
  }
  while (e.route?.length && distance(e, e.route[0]) < 0.15) e.route.shift();
  const next = e.route?.[0];
  if (!next) {
    m.progressLeft -= dt;
    return false;
  }
  const d = distance(e, next),
    stride = Math.min(d, speed * dt),
    dx = (next.x - e.x) / Math.max(d, 0.001),
    dz = (next.z - e.z) / Math.max(d, 0.001);
  const p = movePlayer(e, dx * stride, dz * stride, pieces);
  if (distance(e, p) < 0.001) m.progressLeft -= dt;
  else m.progressLeft = 10;
  e.x = p.x;
  e.z = p.z;
  e.yaw = Math.atan2(-dx, -dz);
  return distance(e, goal) < 0.35;
}
function chooseCover(
  e: Enemy,
  target: Point,
  pieces: Piece[],
  sight: PoliceSight,
) {
  const candidates: Point[] = [];
  for (const radius of [2, 4])
    for (let i = 0; i < 12; i++) {
      const p = {
        x: e.x + Math.cos((i * Math.PI) / 6) * radius,
        z: e.z + Math.sin((i * Math.PI) / 6) * radius,
      };
      const b = e.patrol!.bounds;
      if (
        p.x <= b.minX + 1 ||
        p.x >= b.maxX - 1 ||
        p.z <= b.minZ + 1 ||
        p.z >= b.maxZ - 1 ||
        blocked(p, pieces) ||
        !clearWalk(e, p, pieces)
      )
        continue;
      if (!sight(eyes(p, 0.8), eyes(target, 1.1))) candidates.push(p);
    }
  return candidates.sort((a, b) => distance(a, e) - distance(b, e))[0];
}
/** Neutral patrols never select the nearest innocent as a combat target. */
export function updatePolice(
  e: Enemy,
  people: PolicePerson[],
  pieces: Piece[],
  dt: number,
  sight: PoliceSight,
  now: number,
): { point: Point; suspectId: string } | undefined {
  dt = Math.min(0.1, Math.max(0, dt));
  if (e.health <= 0) {
    updateEnemy(e, e, pieces, dt, false);
    return;
  }
  const m = (e.police ??= newPoliceMemory()),
    spec = e.patrol!;
  const person = people.find((p) => p.id === m.suspectId && p.alive && !p.safe);
  const inBounds =
    person &&
    person.position.x > spec.bounds.minX + 1 &&
    person.position.x < spec.bounds.maxX - 1 &&
    person.position.z > spec.bounds.minZ + 1 &&
    person.position.z < spec.bounds.maxZ - 1;
  const visible = !!person && !!inBounds && canSee(e, person.position, sight);
  if (visible) {
    if (m.phase !== "pursue") {
      e.route = [];
      e.timer = 0.25;
      e.burst = undefined;
    }
    m.phase = "pursue";
    m.lastSeen = { ...person!.position };
    m.forgetAt = now + 12000;
    m.progressLeft = 10;
    if (m.underFireUntil && now < m.underFireUntil && !m.cover) {
      m.cover = chooseCover(e, person!.position, pieces, sight);
      m.underFireUntil = 0;
      m.replanAt = 0;
    }
    if (m.cover) {
      e.state = "chase";
      if (walk(e, m.cover, pieces, dt, 2.5, now)) m.cover = undefined;
      return;
    }
    if (distance(e, person!.position) > 22) {
      e.state = "chase";
      walk(e, person!.position, pieces, dt, 2.5, now);
      return;
    }
    const shot = updateEnemy(e, person!.position, pieces, dt, true);
    if (shot) return { point: shot, suspectId: person!.id };
    return;
  }
  // Losing sight cancels a locked aim/burst; only the saved location is searched.
  if (m.phase === "pursue") {
    m.phase = "investigate";
    m.replanAt = 0;
    e.route = [];
    e.burst = undefined;
    e.timer = 0;
  }
  if (
    (m.phase === "investigate" || m.phase === "search") &&
    (now >= m.forgetAt || m.progressLeft <= 0)
  ) {
    m.phase = "return";
    m.suspectId = undefined;
    m.lastSeen = undefined;
    m.cover = undefined;
    e.route = [];
    m.replanAt = 0;
    m.progressLeft = 10;
  }
  if (m.phase === "investigate" && m.lastSeen) {
    e.state = "chase";
    if (walk(e, m.lastSeen, pieces, dt, 1.8, now)) {
      m.phase = "search";
      m.searchLeft = 6;
      e.route = [];
    }
    return;
  }
  if (m.phase === "search") {
    e.state = "patrol";
    e.burst = undefined;
    m.searchLeft -= dt;
    e.yaw += dt * 0.65;
    if (m.searchLeft <= 0) {
      m.phase = "return";
      m.suspectId = undefined;
      m.lastSeen = undefined;
      m.replanAt = 0;
    }
    return;
  }
  if (m.phase === "return") {
    const at = spec.points.reduce(
      (best, p, i) =>
        distance(e, p) < distance(e, spec.points[best]) ? i : best,
      0,
    );
    e.state = "patrol";
    if (walk(e, spec.points[at], pieces, dt, 1.25, now)) {
      Object.assign(m, newPoliceMemory());
      e.waypoint = (at + 1) % spec.points.length;
      e.route = [];
    }
    return;
  }
  if (m.pauseLeft > 0) {
    m.pauseLeft = Math.max(0, m.pauseLeft - dt);
    e.state = "patrol";
    e.yaw += dt * 0.3;
    return;
  }
  const before = e.waypoint;
  updateEnemy(e, e, pieces, dt, false);
  if (before !== undefined && before !== e.waypoint) {
    const a =
        spec.points[(before + spec.points.length - 1) % spec.points.length],
      b = spec.points[before],
      c = spec.points[(before + 1) % spec.points.length];
    if (
      distance(a, b) > 6 &&
      distance(b, c) > 6 &&
      Math.abs((b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x)) > 0.01
    )
      m.pauseLeft = 1;
  }
}

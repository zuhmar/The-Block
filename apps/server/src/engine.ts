import { randomUUID } from "node:crypto";
import {
  WORLD,
  ITEMS,
  PIECES,
  safe,
  canCarry,
  distance,
  inRect,
  segmentRect,
  placementReason,
  snapBuildPoint,
  structureFootprint,
  type Point,
  type Player,
  type WorldState,
  type Action,
  type Item,
  type Appearance,
  type Structure,
} from "../../../packages/shared/src/index.js";
import { skills } from "../../../packages/game-data/content.js";
import {
  lootCrateAt,
  rollCrateLoot,
} from "../../../packages/game-data/loot-crates.js";
const fail = (message: string): never => {
  throw new Error(message);
};
export const emptyWorld = (): WorldState => ({
  players: {},
  structures: {},
  bags: {},
  clock: 0,
  actions: {},
  layoutVersion: 2,
});
export function createPlayer(
  id: string,
  name: string,
  appearance: Appearance,
): Player {
  return {
    id,
    name,
    x: WORLD.spawn.x,
    y: WORLD.spawn.y,
    lane: "street",
    parcel: "",
    facing: 1,
    facingY: 0,
    health: 100,
    hunger: 100,
    thirst: 100,
    energy: 100,
    temperature: 20,
    inventory: { water: 1, snack: 1, wood: 10000 },
    practiceWoodGranted: true,
    equipped: { backpack: 1 },
    cash: 10,
    bank: 0,
    skills: Object.fromEntries(skills.map((s) => [s, 0])),
    appearance,
    weapon: "fists",
    ammo: 0,
    reloadAt: 0,
    attackAt: 0,
    combatUntil: 0,
    protected: true,
    dead: false,
    cooldowns: {},
  };
}
function take(p: Player, item: Item, n = 1) {
  if ((p.inventory[item] || 0) < n) fail("Missing " + item);
  p.inventory[item]! -= n;
  if (!p.inventory[item]) delete p.inventory[item];
}
function give(p: Player, item: Item, n = 1) {
  if (!canCarry(p.inventory, item, n)) fail("Backpack full or too heavy");
  p.inventory[item] = (p.inventory[item] || 0) + n;
}
function near(p: Point, target: Point, range = 150) {
  if (distance(p, target) > range) fail("Move closer");
}
export function obstruction(
  w: WorldState,
  a: Point,
  b: Point,
  ignoreId?: string,
) {
  return (
    WORLD.obstacles.some((r) => segmentRect(a, b, r)) ||
    Object.values(w.structures).some(
      (s) =>
        s.id !== ignoreId &&
        s.hp > 0 &&
        (s.kind === "wall" || (s.kind === "door" && !s.open)) &&
        segmentRect(a, b, structureFootprint(s)),
    )
  );
}
function access(w: WorldState, p: Player, s: Structure) {
  near(p, s);
  if (obstruction(w, p, s, s.id))
    fail("Access blocked by a wall or closed door");
}
export function blocked(w: WorldState, p: Point) {
  return (
    WORLD.obstacles.some((r) => inRect(p, r, 12)) ||
    Object.values(w.structures).some(
      (s) =>
        s.hp > 0 &&
        (s.kind === "wall" || (s.kind === "door" && !s.open)) &&
        inRect(p, structureFootprint(s), 12),
    )
  );
}
export function upgradeWorld(w: WorldState) {
  w.layoutVersion = 2;
  w.actions ||= {};
  for (const p of Object.values(w.players)) {
    p.y ??= p.lane === "parcel" ? 1344 : WORLD.spawn.y;
    p.facingY ??= 0;
    if (!p.practiceWoodGranted) {
      p.inventory.wood = Math.max(p.inventory.wood || 0, 10000);
      p.practiceWoodGranted = true;
    }
  }
  for (const s of Object.values(w.structures)) s.y ??= 1344;
  for (const b of Object.values(w.bags)) b.y ??= WORLD.spawn.y;
  for (const p of Object.values(w.players)) {
    if (blocked(w, p)) {
      const original = { x: p.x, y: p.y };
      let found = false;
      for (let radius = 16; radius <= 192 && !found; radius += 16)
        for (const [dx, dy] of [
          [0, 1],
          [1, 0],
          [0, -1],
          [-1, 0],
          [1, 1],
          [-1, 1],
          [1, -1],
          [-1, -1],
        ]) {
          const point = {
            x: Math.max(
              24,
              Math.min(WORLD.width - 24, original.x + dx * radius),
            ),
            y: Math.max(
              24,
              Math.min(WORLD.height - 24, original.y + dy * radius),
            ),
          };
          if (!blocked(w, point)) {
            p.x = point.x;
            p.y = point.y;
            found = true;
            break;
          }
        }
    }
  }
  return w;
}
export function kill(w: WorldState, p: Player) {
  if (p.dead) return;
  p.dead = true;
  p.health = 0;
  const inventory = { ...p.inventory };
  if (p.ammo) inventory.ammo = (inventory.ammo || 0) + p.ammo;
  for (const [k, v] of Object.entries(p.equipped))
    inventory[k as Item] = (inventory[k as Item] || 0) + v;
  const id = randomUUID();
  w.bags[id] = { id, x: p.x, y: p.y, inventory, cash: p.cash };
  p.inventory = {};
  p.equipped = {};
  p.cash = 0;
  p.ammo = 0;
  p.weapon = "fists";
}
export function move(
  w: WorldState,
  p: Player,
  dir: number,
  sprint: boolean,
  crouch: boolean,
  dt: number,
  dirY = 0,
) {
  if (p.dead) return;
  const magnitude = Math.hypot(dir, dirY);
  if (!magnitude) return;
  const speed =
      (crouch ? 60 : sprint && p.energy > 8 ? 235 : 145) *
      (p.hunger < 15 || p.thirst < 15 ? 0.7 : 1),
    step = speed * Math.min(0.25, Math.max(0, dt));
  const dx = (dir / magnitude) * step,
    dy = (dirY / magnitude) * step;
  // Substeps prevent tunnelling through corners at sprint speed; separate axes allow wall sliding.
  const count = Math.max(1, Math.ceil(step / 8));
  for (let i = 0; i < count; i++) {
    const x = Math.max(24, Math.min(WORLD.width - 24, p.x + dx / count));
    if (!blocked(w, { x, y: p.y })) p.x = x;
    const y = Math.max(24, Math.min(WORLD.height - 24, p.y + dy / count));
    if (!blocked(w, { x: p.x, y })) p.y = y;
  }
  p.facing = dir;
  p.facingY = dirY;
  if (sprint && p.energy > 8) {
    p.energy = Math.max(0, p.energy - 4 * dt);
    p.skills.athletics += dt * 0.01;
  }
  if (!safe(p.x, p.y)) p.protected = false;
}
export function tick(
  w: WorldState,
  dt: number,
  active: Set<string>,
  now = Date.now(),
) {
  w.actions ||= {};
  for (const [key, value] of Object.entries(w.actions))
    if (value.at < now - 60000) delete w.actions[key];
  w.clock = (w.clock + dt) % 3600;
  for (const p of Object.values(w.players)) {
    if ((!active.has(p.id) && p.combatUntil < now) || p.dead) continue;
    p.hunger = Math.max(0, p.hunger - dt * 0.015);
    p.thirst = Math.max(0, p.thirst - dt * 0.022);
    p.energy = Math.min(100, p.energy + dt * (safe(p.x, p.y) ? 3 : 1));
    p.temperature = 20 + Math.sin((w.clock / 3600) * Math.PI * 2) * 8;
    p.skills.survival += dt * 0.001;
    if (safe(p.x, p.y)) p.health = Math.min(100, p.health + dt);
    if (p.hunger === 0 || p.thirst === 0) {
      p.health -= dt * 0.4;
      if (p.health <= 0) kill(w, p);
    }
    if (p.reloadAt && now >= p.reloadAt) {
      const n = Math.min(6 - p.ammo, p.inventory.ammo || 0);
      if (n) take(p, "ammo", n);
      p.ammo += n;
      p.reloadAt = 0;
    }
  }
}
export function act(
  w: WorldState,
  id: string,
  a: Action,
  now = Date.now(),
): string {
  const p = w.players[id];
  if (!p) fail("Character missing");
  if (a.type === "move" || a.type === "chat") return "";
  if (a.type === "respawn") {
    if (!p.dead) fail("You are alive");
    p.dead = false;
    p.x = WORLD.spawn.x;
    p.y = WORLD.spawn.y;
    p.lane = "street";
    p.parcel = "";
    p.health = 100;
    p.energy = 100;
    p.hunger = 65;
    p.thirst = 65;
    p.protected = true;
    return "Back at the shelter. Your belongings remain on the street.";
  }
  if (p.dead) fail("Respawn first");
  switch (a.type) {
    case "aim": {
      const length = distance(p, a);
      if (length > 0) {
        p.facing = (a.x - p.x) / length;
        p.facingY = (a.y - p.y) / length;
      }
      return "";
    }
    case "enter": {
      const f = w.structures[a.foundation];
      if (!f || f.kind !== "foundation") fail("Foundation missing");
      near(p, f, 210);
      return "Walk through an open door to enter the base";
    }
    case "exit": {
      p.lane = "street";
      p.parcel = "";
      return "Base access uses normal WASD movement";
    }
    case "scavenge": {
      near(p, WORLD.scavengePoints[a.index]);
      if ((p.cooldowns[a.index] || 0) > now)
        fail("Container depleted · return in a minute");
      const crate = lootCrateAt(a.index),
        reward = rollCrateLoot(crate.tier - 1, p.inventory);
      if (!Object.keys(reward.items).length)
        fail("Backpack full · make room before searching");
      p.inventory = reward.inventory;
      p.cooldowns[a.index] = now + 60000;
      p.skills.scavenging += 1;
      return (
        crate.name +
        " · " +
        Object.entries(reward.items)
          .map(([item, n]) => `${n} ${item}`)
          .join(", ")
      );
    }
    case "consume": {
      take(p, a.item);
      if (a.item === "water") p.thirst = Math.min(100, p.thirst + 35);
      if (a.item === "snack") p.hunger = Math.min(100, p.hunger + 30);
      if (a.item === "bandage") p.health = Math.min(100, p.health + 25);
      return "Used " + a.item;
    }
    case "equip": {
      if (a.item !== "fists" && !(p.inventory[a.item] || p.equipped[a.item]))
        fail("Weapon missing");
      p.weapon = a.item;
      return "Equipped " + a.item;
    }
    case "reload": {
      if (
        p.weapon !== "pistol" ||
        p.reloadAt ||
        p.ammo === 6 ||
        !p.inventory.ammo
      )
        fail("Cannot reload");
      p.reloadAt = now + 1800;
      return "Reloading…";
    }
    case "craft": {
      take(p, "wood", 3);
      give(p, "bat");
      p.skills.crafting++;
      return "Crafted bat";
    }
    case "trade": {
      near(p, a.sell ? WORLD.traderPoint : WORLD.storePoint);
      if (a.sell) {
        take(p, a.item);
        p.cash += ITEMS[a.item].price;
      } else {
        const price = ITEMS[a.item].price * 2;
        if (p.cash < price) fail("Not enough cash");
        give(p, a.item);
        p.cash -= price;
      }
      p.skills.trading += 0.1;
      return a.sell ? "Item sold" : "Purchased " + a.item;
    }
    case "build": {
      const { x, y, rotation } = snapBuildPoint(
        a.kind,
        { x: a.x, y: a.y ?? p.y },
        w.structures[a.foundation || ""],
      );
      const reason = placementReason(
        p,
        a.kind,
        { x, y },
        Object.values(w.structures),
        a.foundation,
      );
      if (reason) fail(reason);
      const foundation =
        a.kind === "foundation" ? undefined : w.structures[a.foundation || ""];
      take(p, "wood", PIECES[a.kind].wood);
      const sid = randomUUID();
      w.structures[sid] = {
        id: sid,
        kind: a.kind,
        ...(rotation !== undefined ? { rotation } : {}),
        x,
        y,
        owner: id,
        foundation: foundation?.id || sid,
        hp: PIECES[a.kind].hp,
        open: false,
        inventory: {},
        cash: 0,
      };
      p.skills.crafting++;
      return "Placed " + a.kind;
    }
    case "door": {
      const s = w.structures[a.id];
      if (!s || s.kind !== "door" || s.hp <= 0) fail("Door missing");
      near(p, s);
      if (s.owner !== id) fail("Owner access only");
      s.open = !s.open;
      return s.open ? "Door open" : "Door closed";
    }
    case "repair": {
      const s = w.structures[a.id];
      if (!s || s.owner !== id) fail("Owner access only");
      near(p, s);
      take(p, "wood", 2);
      s.hp = PIECES[s.kind].hp;
      return "Repaired";
    }
    case "dismantle": {
      const s = w.structures[a.id];
      if (!s || s.owner !== id) fail("Owner access only");
      near(p, s);
      if (p.combatUntil > now) fail("Cannot dismantle during combat");
      if (
        s.kind === "foundation" &&
        Object.values(w.structures).some(
          (o) => o.id !== s.id && o.foundation === s.id && o.kind !== "roof",
        )
      )
        fail("Remove attached modules first");
      if (Object.values(s.inventory).some((n) => n > 0) || s.cash)
        fail("Empty storage first");
      delete w.structures[s.id];
      return "Dismantled";
    }
    case "drop": {
      if (safe(p.x, p.y)) fail("Drop items outside the shelter");
      take(p, a.item);
      const bid = randomUUID();
      w.bags[bid] = {
        id: bid,
        x: p.x,
        y: p.y,
        inventory: { [a.item]: 1 },
        cash: 0,
      };
      return "Dropped " + a.item;
    }
    case "store":
    case "loot": {
      const s = w.structures[a.id],
        bag = w.bags[a.id];
      if (s && s.kind !== "storage") fail("Not a storage crate");
      if (!s && !bag) fail("Container empty");
      if (s) access(w, p, s);
      else near(p, bag);
      const c = s || bag;
      if (safe(c.x, c.y)) fail("No theft or item transfer in shelter");
      if (a.type === "store") {
        if (!s || s.owner !== id) fail("Owner storage only");
        take(p, a.item);
        c.inventory[a.item] = (c.inventory[a.item] || 0) + 1;
      } else {
        if (a.item === "cash" && c.cash) {
          p.cash += c.cash;
          c.cash = 0;
        } else {
          if (!c.inventory[a.item]) fail("Already claimed");
          give(p, a.item);
          c.inventory[a.item]!--;
          if (!c.inventory[a.item]) delete c.inventory[a.item];
        }
      }
      if (bag && !Object.values(bag.inventory).some((n) => n > 0) && !bag.cash)
        delete w.bags[bag.id];
      return a.type === "store" ? "Stored" : "Loot claimed";
    }
    case "attack": {
      if (p.protected || safe(p.x, p.y)) fail("Shelter protects both sides");
      if (p.weapon !== a.weapon) fail("Equip that weapon first");
      if (
        a.weapon !== "fists" &&
        !p.inventory[a.weapon] &&
        !p.equipped[a.weapon]
      )
        fail("Weapon missing");
      if (p.attackAt > now || p.reloadAt) fail("Weapon not ready");
      if (p.energy < 8) fail("Too exhausted");
      const t = w.players[a.target],
        s = w.structures[a.target];
      if (!t && !s) fail("Target missing");
      const target = t || s;
      const range = a.weapon === "pistol" ? 560 : 90;
      near(p, target, range);
      if ((target.x - p.x) * p.facing + (target.y - p.y) * p.facingY < -1)
        fail("Face your target");
      if (safe(target.x, target.y) || (t && (t.protected || t.dead)))
        fail("Target protected");
      if (obstruction(w, p, target, target.id)) fail("Line of sight blocked");
      if (s?.kind === "foundation") fail("Foundations cannot be raided");
      if (s && s.hp <= 0) fail("Already breached");
      if (a.weapon === "pistol") {
        if (!p.ammo) fail("Reload first");
        p.ammo--;
      }
      p.attackAt = now + (a.weapon === "pistol" ? 550 : 650);
      p.energy -= 8;
      p.combatUntil = now + 20000;
      const damage = a.weapon === "pistol" ? 28 : a.weapon === "bat" ? 18 : 9;
      if (t) t.health -= damage;
      else s.hp -= damage;
      if (t) {
        t.combatUntil = now + 20000;
        if (t.health <= 0) kill(w, t);
      } else s.hp = Math.max(0, s.hp);
      p.skills[a.weapon === "pistol" ? "marksmanship" : "melee"] += 0.2;
      return "Hit · " + damage;
    }
  }
}
export function commitAction(
  w: WorldState,
  id: string,
  requestId: string,
  at: number,
  action: Action,
  now = Date.now(),
) {
  if (Math.abs(now - at) > 30000) fail("Stale action; reconnect and try again");
  w.actions ||= {};
  const key = id + ":" + requestId;
  if (w.actions[key]) return w.actions[key].result;
  const result = act(w, id, action, now);
  w.actions[key] = { at: now, result };
  return result;
}
export function publicPlayer(p: Player) {
  return {
    id: p.id,
    name: p.name,
    x: p.x,
    y: p.y,
    lane: p.lane,
    parcel: p.parcel,
    facing: p.facing,
    facingY: p.facingY,
    health: p.health,
    dead: p.dead,
    appearance: p.appearance,
    weapon: p.weapon,
    protected: p.protected,
    attackAt: p.attackAt,
  };
}
export function visible(w: WorldState, id: string, online: Set<string>) {
  const p = w.players[id];
  return {
    clock: w.clock,
    self: p,
    players: Object.values(w.players)
      .filter((t) => online.has(t.id) && distance(t, p) < 1400)
      .map(publicPlayer),
    structures: Object.values(w.structures)
      .filter((s) => distance(s, p) < 1400)
      .map((s) => ({
        ...s,
        inventory:
          s.kind === "storage" &&
          distance(s, p) < 150 &&
          !obstruction(w, p, s, s.id)
            ? s.inventory
            : {},
      })),
    bags: Object.values(w.bags).filter((b) => distance(b, p) < 1400),
  };
}

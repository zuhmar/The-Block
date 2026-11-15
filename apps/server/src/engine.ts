import { randomUUID } from "node:crypto";
import {
  WORLD,
  ITEMS,
  PIECES,
  safe,
  canCarry,
  type Player,
  type WorldState,
  type Action,
  type Item,
  type Appearance,
  type Structure,
} from "../../../packages/shared/src/index.js";
import { skills, loot } from "../../../packages/game-data/content.js";
const fail = (message: string): never => {
  throw new Error(message);
};
export const emptyWorld = (): WorldState => ({
  players: {},
  structures: {},
  bags: {},
  clock: 0,
  actions: {},
});
export function createPlayer(
  id: string,
  name: string,
  appearance: Appearance,
): Player {
  return {
    id,
    name,
    x: 400,
    lane: "street",
    parcel: "",
    facing: 1,
    health: 100,
    hunger: 100,
    thirst: 100,
    energy: 100,
    temperature: 20,
    inventory: { water: 1, snack: 1 },
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
function near(p: Player, x: number, range = 150) {
  if (Math.abs(p.x - x) > range) fail("Move closer");
}
export function obstruction(w: WorldState, a: number, b: number) {
  return Object.values(w.structures).some(
    (s) =>
      s.hp > 0 &&
      (s.kind === "wall" || (s.kind === "door" && !s.open)) &&
      s.x > Math.min(a, b) &&
      s.x < Math.max(a, b),
  );
}
function access(w: WorldState, p: Player, s: Structure) {
  if (p.lane !== "parcel" || p.parcel !== s.foundation)
    fail("Enter this base from its west edge first");
  near(p, s.x);
  if (obstruction(w, p.x, s.x)) fail("Access blocked by a wall or closed door");
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
  w.bags[id] = { id, x: p.x, inventory, cash: p.cash };
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
) {
  if (p.dead) return;
  const speed = crouch ? 60 : sprint && p.energy > 8 ? 235 : 145;
  let next = Math.max(
    24,
    Math.min(
      WORLD.width - 24,
      p.x + dir * speed * (p.hunger < 15 || p.thirst < 15 ? 0.7 : 1) * dt,
    ),
  );
  if (p.lane === "parcel") {
    const f = w.structures[p.parcel];
    if (f) next = Math.max(f.x - 160, Math.min(f.x + 160, next));
    else p.lane = "street";
  }
  if (
    p.lane === "street" ||
    !Object.values(w.structures).some(
      (s) =>
        s.hp > 0 &&
        (s.kind === "wall" || (s.kind === "door" && !s.open)) &&
        Math.abs(next - s.x) < 18,
    )
  )
    p.x = next;
  if (dir) {
    p.facing = dir;
    if (sprint) {
      p.energy = Math.max(0, p.energy - 4 * dt);
      p.skills.athletics += dt * 0.01;
    }
    if (!safe(p.x)) p.protected = false;
  }
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
    p.energy = Math.min(100, p.energy + dt * (safe(p.x) ? 3 : 1));
    p.temperature = 20 + Math.sin((w.clock / 3600) * Math.PI * 2) * 8;
    p.skills.survival += dt * 0.001;
    if (safe(p.x)) p.health = Math.min(100, p.health + dt);
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
    p.x = 400;
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
    case "enter": {
      const f = w.structures[a.foundation];
      if (!f || f.kind !== "foundation") fail("Foundation missing");
      near(p, f.x - 160, 100);
      p.lane = "parcel";
      p.parcel = f.id;
      p.x = f.x - 160;
      return "Entered base lane · main street remains open";
    }
    case "exit": {
      p.lane = "street";
      p.parcel = "";
      return "Back on the main street";
    }
    case "scavenge": {
      near(p, WORLD.scavenge[a.index]);
      if ((p.cooldowns[a.index] || 0) > now)
        fail("Container depleted · return in a minute");
      const item = loot[Math.floor(Math.random() * loot.length)];
      give(p, item, item === "wood" ? 6 : 1);
      p.cooldowns[a.index] = now + 60000;
      p.skills.scavenging += 1;
      return "Found " + item;
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
      near(p, a.sell ? WORLD.trader : WORLD.store);
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
      const x = Math.round(a.x / 64) * 64;
      near(p, x, 210);
      if (
        safe(x) ||
        !WORLD.parcels.some(([l, r]) => x >= l + 32 && x <= r - 32)
      )
        fail("Protected road, public area or parcel edge");
      if (
        Object.values(w.structures).filter((s) => s.owner === id).length >= 40
      )
        fail("Build budget reached");
      if (
        Object.values(w.structures).some(
          (s) =>
            s.x === x &&
            (s.kind === a.kind ||
              (["wall", "door", "storage"].includes(s.kind) &&
                ["wall", "door", "storage"].includes(a.kind))),
        )
      )
        fail("Space occupied");
      let foundation: Structure | undefined;
      if (a.kind !== "foundation") {
        foundation = w.structures[a.foundation || ""];
        if (
          !foundation ||
          foundation.kind !== "foundation" ||
          foundation.owner !== id ||
          Math.abs(foundation.x - x) > 128
        )
          fail("Select an owned foundation within 128px");
      } else if (
        Object.values(w.structures).some(
          (s) => s.kind === "foundation" && Math.abs(s.x - x) < 192,
        )
      )
        fail("Foundation too close");
      take(p, "wood", PIECES[a.kind].wood);
      const sid = randomUUID();
      w.structures[sid] = {
        id: sid,
        kind: a.kind,
        x,
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
      near(p, s.x);
      if (s.owner !== id) fail("Owner access only");
      s.open = !s.open;
      return s.open ? "Door open" : "Door closed";
    }
    case "repair": {
      const s = w.structures[a.id];
      if (!s || s.owner !== id) fail("Owner access only");
      near(p, s.x);
      take(p, "wood", 2);
      s.hp = PIECES[s.kind].hp;
      return "Repaired";
    }
    case "dismantle": {
      const s = w.structures[a.id];
      if (!s || s.owner !== id) fail("Owner access only");
      near(p, s.x);
      if (p.combatUntil > now) fail("Cannot dismantle during combat");
      if (
        s.kind === "foundation" &&
        Object.values(w.structures).some(
          (o) => o.id !== s.id && o.foundation === s.id,
        )
      )
        fail("Remove attached modules first");
      if (Object.values(s.inventory).some((n) => n > 0) || s.cash)
        fail("Empty storage first");
      delete w.structures[s.id];
      return "Dismantled";
    }
    case "drop": {
      if (safe(p.x)) fail("Drop items outside the shelter");
      take(p, a.item);
      const bid = randomUUID();
      w.bags[bid] = { id: bid, x: p.x, inventory: { [a.item]: 1 }, cash: 0 };
      return "Dropped " + a.item;
    }
    case "store":
    case "loot": {
      const s = w.structures[a.id],
        bag = w.bags[a.id];
      if (s && s.kind !== "storage") fail("Not a storage crate");
      if (!s && !bag) fail("Container empty");
      if (s) access(w, p, s);
      else near(p, bag.x);
      const c = s || bag;
      if (safe(c.x)) fail("No theft or item transfer in shelter");
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
      if (p.protected || safe(p.x)) fail("Shelter protects both sides");
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
      near(p, target.x, range);
      if ((target.x - p.x) * p.facing < 0) fail("Face your target");
      if (safe(target.x) || (t && (t.protected || t.dead)))
        fail("Target protected");
      if (obstruction(w, p.x, target.x)) fail("Line of sight blocked");
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
    lane: p.lane,
    parcel: p.parcel,
    facing: p.facing,
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
      .filter((t) => online.has(t.id) && Math.abs(t.x - p.x) < 1400)
      .map(publicPlayer),
    structures: Object.values(w.structures)
      .filter((s) => Math.abs(s.x - p.x) < 1400)
      .map((s) => ({
        ...s,
        inventory:
          s.kind === "storage" &&
          Math.abs(s.x - p.x) < 150 &&
          !obstruction(w, p.x, s.x)
            ? s.inventory
            : {},
      })),
    bags: Object.values(w.bags).filter((b) => Math.abs(b.x - p.x) < 1400),
  };
}

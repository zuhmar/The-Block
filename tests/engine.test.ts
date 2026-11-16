import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyWorld,
  createPlayer,
  act,
  commitAction,
  move,
  kill,
  tick,
  visible,
  upgradeWorld,
  blocked,
} from "../apps/server/src/engine.js";
import { envelopeSchema, canCarry } from "../packages/shared/src/index.js";
const look = {
  skin: "#c98c62",
  hair: "#252939",
  top: "#ec8753",
  body: "standard",
  style: "short",
} as const;
function fixture() {
  const w = emptyWorld();
  const p = createPlayer("owner", "Owner", look),
    r = createPlayer("raider", "Raider", look);
  w.players = { owner: p, raider: r };
  p.x = 7096;
  p.y = 1344;
  p.protected = false;
  p.inventory = { wood: 45, bat: 1 };
  r.x = 7096;
  r.y = 1344;
  r.protected = false;
  r.inventory = { bat: 1 };
  r.weapon = "bat";
  return { w, p, r };
}
test("contracts reject untrusted state and invalid movement", () => {
  const envelope = {
    v: 2,
    requestId: "test-request-valid",
    at: Date.now(),
    seq: 1,
  };
  assert(
    envelopeSchema.safeParse({
      ...envelope,
      action: { type: "move", dir: 1, sprint: false, crouch: false },
    }).success,
  );
  assert(
    !envelopeSchema.safeParse({
      ...envelope,
      action: { type: "move", dir: 999, sprint: false, crouch: false },
    }).success,
  );
  assert(
    !envelopeSchema.safeParse({
      ...envelope,
      action: { type: "damage", health: 0 },
    }).success,
  );
  assert(!canCarry({ wood: 10000 }, "wood"));
  assert(canCarry({ wood: 10000, water: 1, snack: 1 }, "bandage"));
  assert(!canCarry({ stone: 32 }, "stone"));
});
test("placement masks, ownership, costs and foundation immunity", () => {
  const { w, p, r } = fixture();
  assert.throws(() =>
    act(w, p.id, { type: "build", kind: "foundation", x: 6656 }),
  );
  act(w, p.id, { type: "build", kind: "foundation", x: 7104 });
  const f = Object.values(w.structures)[0];
  assert.equal(p.inventory.wood, 37);
  assert.throws(() =>
    act(w, r.id, {
      type: "build",
      kind: "wall",
      x: 7136,
      y: 1280,
      foundation: f.id,
    }),
  );
  assert.throws(
    () => act(w, r.id, { type: "attack", weapon: "bat", target: f.id }),
    /cannot be raided/,
  );
  assert.equal(f.hp, 9999);
  act(w, p.id, {
    type: "build",
    kind: "wall",
    x: 7136,
    y: 1280,
    foundation: f.id,
  });
  assert.throws(
    () =>
      act(w, p.id, {
        type: "build",
        kind: "door",
        x: 7136,
        y: 1280,
        foundation: f.id,
      }),
    /occupied/,
  );
});
test("shelter edge prevents attacks from either side", () => {
  const { w, p, r } = fixture();
  p.x = 720;
  p.y = r.y = 560;
  r.x = 760;
  p.facing = 1;
  assert.throws(
    () => act(w, p.id, { type: "attack", weapon: "fists", target: r.id }),
    /Shelter/,
  );
  p.x = 760;
  r.x = 720;
  p.facing = -1;
  assert.throws(
    () => act(w, p.id, { type: "attack", weapon: "fists", target: r.id }),
    /protected/,
  );
});
test("death drops all inventory, equipment, cash once; preserves progression and assets", () => {
  const { w, p } = fixture();
  p.equipped = { backpack: 1, pistol: 1 };
  p.cash = 23;
  p.bank = 65;
  p.skills.melee = 8;
  kill(w, p);
  kill(w, p);
  const bags = Object.values(w.bags);
  assert.equal(bags.length, 1);
  assert.equal(bags[0].cash, 23);
  assert.equal(bags[0].inventory.backpack, 1);
  assert.equal(bags[0].inventory.pistol, 1);
  assert.deepEqual(p.inventory, {});
  assert.deepEqual(p.equipped, {});
  assert.equal(p.cash, 0);
  act(w, p.id, { type: "respawn" });
  assert.equal(p.bank, 65);
  assert.equal(p.skills.melee, 8);
  assert(p.protected);
});
test("offline-owner raid: access blocked until breach; loot is public and single-claim", () => {
  const { w, p, r } = fixture();
  act(w, p.id, { type: "build", kind: "foundation", x: 7104 });
  const f = Object.values(w.structures)[0];
  act(w, p.id, {
    type: "build",
    kind: "door",
    x: 7168,
    y: 1312,
    foundation: f.id,
  });
  act(w, p.id, { type: "build", kind: "foundation", x: 7232, y: 1344 });
  const secondFloor = Object.values(w.structures).find(
    (s) => s.kind === "foundation" && s.id !== f.id,
  )!;
  act(w, p.id, {
    type: "build",
    kind: "storage",
    x: 7200,
    y: 1312,
    foundation: secondFloor.id,
  });
  const door = Object.values(w.structures).find((s) => s.kind === "door")!,
    crate = Object.values(w.structures).find((s) => s.kind === "storage")!;
  p.x = 7200;
  p.y = 1312;
  p.lane = "parcel";
  p.parcel = f.id;
  p.inventory.scrap = 1;
  act(w, p.id, { type: "store", id: crate.id, item: "scrap" });
  r.x = 7096;
  r.y = 1312;
  r.lane = "parcel";
  r.parcel = f.id;
  r.facing = 1;
  assert.throws(
    () => act(w, r.id, { type: "loot", id: crate.id, item: "scrap" }),
    /blocked/,
  );
  for (let i = 0; i < 5; i++)
    act(
      w,
      r.id,
      { type: "attack", weapon: "bat", target: door.id },
      Date.now() + i * 700,
    );
  assert.equal(door.hp, 0);
  act(w, r.id, { type: "loot", id: crate.id, item: "scrap" });
  assert.equal(r.inventory.scrap, 1);
  assert.throws(
    () => act(w, r.id, { type: "loot", id: crate.id, item: "scrap" }),
    /claimed/,
  );
  assert.equal(f.hp, 9999);
  const restarted = JSON.parse(JSON.stringify(w));
  assert.equal(restarted.structures[door.id].hp, 0);
  assert(!restarted.structures[crate.id].inventory.scrap);
});
test("server movement limits speed and dead characters cannot walk", () => {
  const { w, p } = fixture();
  const x = p.x;
  move(w, p, 1, true, false, 0.1);
  assert(Math.abs(p.x - x - 23.5) < 0.00001);
  kill(w, p);
  const after = p.x;
  move(w, p, 1, true, false, 0.1);
  assert.equal(p.x, after);
});
test("survival ticks, shelter recovery and interest privacy", () => {
  const { w, p, r } = fixture();
  p.health = 60;
  p.x = 400;
  p.y = 560;
  r.x = 5000;
  tick(w, 1, new Set([p.id]));
  assert(p.health > 60);
  assert(p.thirst < 100);
  const view = visible(w, p.id, new Set([p.id, r.id]));
  assert.equal(view.players.length, 1);
  assert(!("inventory" in view.players[0]));
});
test("firearm reload, range and ammunition are server validated", () => {
  const { w, p, r } = fixture();
  p.inventory.pistol = 1;
  p.inventory.ammo = 6;
  p.weapon = "pistol";
  p.facing = 1;
  r.x = p.x + 300;
  assert.throws(
    () => act(w, p.id, { type: "attack", weapon: "pistol", target: r.id }),
    /Reload/,
  );
  const now = Date.now();
  act(w, p.id, { type: "reload" }, now);
  tick(w, 0.1, new Set([p.id]), now + 1900);
  assert.equal(p.ammo, 6);
  act(w, p.id, { type: "attack", weapon: "pistol", target: r.id }, now + 2000);
  assert.equal(p.ammo, 5);
  assert.equal(r.health, 72);
});

test("top-down walls block movement while protected roads remain open", () => {
  const { w, p, r } = fixture();
  act(w, p.id, { type: "build", kind: "foundation", x: 7104 });
  const f = Object.values(w.structures)[0];
  act(w, p.id, {
    type: "build",
    kind: "wall",
    x: 7136,
    y: 1280,
    foundation: f.id,
  });
  r.x = 7076;
  r.y = 1280;
  move(w, r, 1, false, false, 0.25);
  assert(r.x < 7100);
  r.x = 7126;
  r.y = 1410;
  move(w, r, 1, false, false, 0.25);
  assert(r.x > 7156);
  r.x = 7126;
  r.y = 976;
  move(w, r, 1, false, false, 0.25);
  assert(r.x > 7156);
  assert.throws(
    () => act(w, r.id, { type: "build", kind: "foundation", x: 7168, y: 976 }),
    /roads/,
  );
});
test("diagonal speed is normalized and vertical range cannot be spoofed", () => {
  const { w, p, r } = fixture();
  const origin = { x: p.x, y: p.y };
  move(w, p, 1, true, false, 0.1, 1);
  assert(Math.abs(Math.hypot(p.x - origin.x, p.y - origin.y) - 23.5) < 0.001);
  r.x = p.x;
  r.y = p.y + 400;
  assert.throws(
    () => act(w, p.id, { type: "attack", weapon: "fists", target: r.id }),
    /closer/,
  );
});
test("safe zones use both coordinates and spawn protection expires through the exit", () => {
  const { w, p } = fixture();
  p.x = 400;
  p.y = 790;
  p.protected = true;
  move(w, p, 0, false, false, 0.2, 1);
  assert(p.y > 800);
  assert(!p.protected);
});
test("legacy layout migration retains progress, inventory, cash and owned structures", () => {
  const { w, p } = fixture();
  act(w, p.id, { type: "build", kind: "foundation", x: 7104 });
  p.inventory = { wood: 7, water: 1 };
  p.cash = 42;
  p.skills.scavenging = 9;
  const old = JSON.parse(JSON.stringify(w));
  delete old.layoutVersion;
  for (const record of [
    ...Object.values(old.players),
    ...Object.values(old.structures),
  ] as any[])
    delete record.y;
  old.players.owner.lane = "parcel";
  const migrated = upgradeWorld(old);
  assert.equal(migrated.players.owner.y, 1344);
  assert.equal(migrated.players.owner.cash, 42);
  assert.equal(migrated.players.owner.skills.scavenging, 9);
  assert.deepEqual(migrated.players.owner.inventory, { wood: 7, water: 1 });
  assert.equal(Object.values(migrated.structures)[0].hp, 9999);
  assert(!blocked(migrated, migrated.players.owner));
  assert.deepEqual(
    upgradeWorld(JSON.parse(JSON.stringify(migrated))),
    migrated,
  );
});

test("durable request ledger makes retries idempotent and rejects stale requests", () => {
  const { w, p } = fixture();
  p.inventory.water = 2;
  const now = Date.now();
  const action = { type: "consume", item: "water" } as const;
  p.thirst = 10;
  commitAction(w, p.id, "request-unique", now, action, now);
  const restarted = JSON.parse(JSON.stringify(w));
  commitAction(restarted, p.id, "request-unique", now, action, now + 1000);
  assert.equal(restarted.players[p.id].inventory.water, 1);
  assert.equal(restarted.players[p.id].thirst, 45);
  assert.throws(
    () => commitAction(w, p.id, "another-unique", now - 40000, action, now),
    /Stale/,
  );
});

test("interaction and interest ranges include vertical distance", () => {
  const { w, p, r } = fixture();
  p.x = 1090;
  p.y = 2000;
  assert.throws(
    () => act(w, p.id, { type: "trade", item: "water", sell: false }),
    /closer/,
  );
  r.x = p.x;
  r.y = p.y + 1450;
  assert.equal(visible(w, p.id, new Set([p.id, r.id])).players.length, 1);
});

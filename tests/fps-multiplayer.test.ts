import { test } from "node:test";
import assert from "node:assert/strict";
import { FpsEngine } from "../apps/server/src/fps/engine.js";
import { FpsInputs } from "../apps/server/src/fps/input.js";
import { fpsActionSchema } from "../apps/server/src/fps/schema.js";
import {
  addItem,
  countItem,
  selectedItem,
} from "../apps/client/src/fps/inventory.js";
import { START, blocked } from "../apps/client/src/fps/world.js";
import { reconcileFpsPose } from "../apps/client/src/fps/network-physics.js";
const uid = () => crypto.randomUUID();
function engine() {
  const e = new FpsEngine();
  e.addPlayer("a", "Alpha");
  e.addPlayer("b", "Bravo");
  return e;
}
function equip(
  e: FpsEngine,
  id: string,
  kind: "pistol" | "c4" | "wood",
  n = 1,
) {
  const p = e.world.players[id];
  addItem(p.inventory, kind, n);
  const item = p.inventory.slots.find((s) => s?.kind === kind)!;
  p.inventory.hotbar[0] = item.id;
  p.inventory.active = 0;
  return item;
}
function clearLane(e: FpsEngine) {
  for (let z = -80; z < 130; z += 2)
    for (let x = -100; x < 100; x += 2) {
      const a = { x, z },
        b = { x: x + 3, z };
      if (
        !e.isSafe(a) &&
        !blocked(a, []) &&
        !blocked(b, []) &&
        e.cover.visible({ ...a, y: 1.65 }, { ...b, y: 1.65 })
      ) {
        return { a, b };
      }
    }
  throw Error("No lane");
}
test("FPS messages reject forged ownership, coordinates and invalid input", () => {
  assert.equal(
    fpsActionSchema.safeParse({
      type: "build",
      piece: { kind: "wall", x: 0, z: 0, rotation: 0, ownerId: "victim" },
    }).success,
    false,
  );
  assert.equal(
    fpsActionSchema.safeParse({ type: "fire", yaw: NaN, pitch: 0 }).success,
    false,
  );
  const i = new FpsInputs();
  assert.equal(
    i.push([{ seq: 1, x: 99, z: 0, run: true, jump: false, yaw: 0, pitch: 0 }]),
    false,
  );
});
test("movement credit caps speed and reconciliation replays unacknowledged inputs", () => {
  const e = engine(),
    p = e.world.players.a,
    inputs = new FpsInputs(),
    input = { seq: 1, x: 1, z: 0, run: true, jump: false, yaw: 0, pitch: 0 };
  assert.ok(
    inputs.push(
      Array.from({ length: 10 }, (_, n) => ({ ...input, seq: n + 1 })),
    ),
  );
  const pose = inputs.step(p.pose, [], 0.02, true);
  assert.ok(Math.hypot(pose.x - p.pose.x, pose.z - p.pose.z) <= 0.140001);
  assert.equal(inputs.ack, 1);
  assert.deepEqual(reconcileFpsPose(pose, 1, [input], []), pose);
  inputs.stop();
  assert.equal(inputs.pending.length, 0);
});
test("inventory conservation forbids item grants, magazine refill and reserve imports", () => {
  const e = engine(),
    gun = equip(e, "a", "pistol"),
    p = e.world.players.a;
  const forged = structuredClone(p.inventory);
  addItem(forged, "wood", 500);
  assert.throws(
    () => e.apply("a", { type: "inventory", inventory: forged }, uid()),
    /inventory|items|Inventory|carried|changed/i,
  );
  gun.magazine = 3;
  const refill = structuredClone(p.inventory);
  refill.slots.find((s) => s?.id === gun.id)!.magazine = 12;
  assert.throws(() =>
    e.apply("a", { type: "inventory", inventory: refill }, uid()),
  );
  const legal = structuredClone(p.inventory);
  [legal.slots[0], legal.slots[1]] = [legal.slots[1], legal.slots[0]];
  e.apply("a", { type: "inventory", inventory: legal }, uid());
  assert.equal(countItem(p.inventory, "pistol"), 1);
});
test("PvP consumes server ammo, applies full-loot death once and persists separately", () => {
  const e = engine(),
    lane = clearLane(e),
    p = e.world.players.a,
    v = e.world.players.b;
  Object.assign(p.pose, lane.a);
  Object.assign(v.pose, lane.b);
  equip(e, "a", "pistol");
  equip(e, "b", "wood", 100);
  v.survival.cash = 77;
  const now = Date.now();
  for (let n = 0; n < 4; n++)
    e.apply(
      "a",
      { type: "fire", yaw: -Math.PI / 2, pitch: 0 },
      uid(),
      now + n * 220,
    );
  assert.equal(v.health, 0);
  assert.equal(countItem(v.inventory, "wood"), 0);
  assert.equal(selectedItem(p.inventory)!.magazine, 8);
  assert.equal(
    e.world.drops
      .filter((d) => d.kind === "wood")
      .reduce((s, d) => s + d.quantity, 0),
    100,
  );
  assert.equal(e.world.drops.filter((d) => d.kind === "cash")[0].quantity, 77);
  const restored = new FpsEngine(JSON.parse(e.serialize()));
  assert.equal(restored.world.players.b.health, 0);
  assert.equal(restored.world.drops.length, e.world.drops.length);
  restored.apply("b", { type: "respawn" }, uid());
  assert.equal(restored.world.players.b.health, 100);
  assert.equal(restored.world.players.b.pose.x, START.x);
  assert.equal(countItem(restored.world.players.b.inventory, "wood"), 0);
});
test("safe release zone and cover block PvP; invalid C4 never spends a charge", () => {
  const e = engine();
  equip(e, "a", "pistol");
  assert.throws(
    () => e.apply("a", { type: "fire", yaw: 0, pitch: 0 }, uid()),
    /release/,
  );
  const lane = clearLane(e);
  Object.assign(e.world.players.a.pose, lane.a);
  equip(e, "a", "c4");
  e.world.players.a.inventory.hotbar[0] =
    e.world.players.a.inventory.slots.find((s) => s?.kind === "c4")!.id;
  assert.throws(() =>
    e.apply("a", { type: "fire", yaw: 0, pitch: 1.3 }, uid()),
  );
  assert.equal(countItem(e.world.players.a.inventory, "c4"), 1);
  const a = e.world.players.a,
    b = e.world.players.b;
  Object.assign(b.pose, lane.b);
  e.world.pieces.push({
    id: "cover",
    ownerId: "b",
    kind: "wall",
    x: (a.pose.x + b.pose.x) / 2,
    z: a.pose.z,
    rotation: 1,
    y: 0,
    material: "wood",
  });
  e.markWorld();
  e.cover.update(e.world.pieces, e.resources.entities, true);
  a.inventory.hotbar[0] = a.inventory.slots.find(
    (s) => s?.kind === "pistol",
  )!.id;
  e.apply("a", { type: "fire", yaw: -Math.PI / 2, pitch: 0 }, uid());
  assert.equal(b.health, 100);
});
test("drop requests are idempotent and public snapshots omit private storage", () => {
  const e = engine(),
    p = e.world.players.a,
    item = equip(e, "a", "wood", 99),
    request = uid();
  e.apply("a", { type: "drop", id: item.id }, request);
  e.apply("a", { type: "drop", id: item.id }, request);
  assert.equal(e.world.drops.length, 1);
  e.world.pieces.push({
    id: "private",
    ownerId: "a",
    kind: "storage",
    x: 1,
    z: 1,
    rotation: 0,
    contents: [{ id: uid(), kind: "wood", quantity: 20 }],
  });
  e.markWorld();
  const patch = e.worldPatch("b", {
    pieceRev: 0,
    resourceRev: 0,
    dropRev: -1,
    cell: "",
  });
  assert.equal(patch.pieces![0].contents, undefined);
  assert.equal(patch.fullPieces, true);
  assert.equal(p.inventory.drops.length, 0);
});

test("two players cannot claim the same shared drop or loot a station through cover", () => {
  const e = engine(),
    lane = clearLane(e),
    a = e.world.players.a,
    b = e.world.players.b;
  Object.assign(a.pose, lane.a);
  Object.assign(b.pose, lane.b);
  e.world.drops.push({
    id: "shared-drop",
    kind: "wood",
    quantity: 50,
    x: a.pose.x + 1.5,
    z: a.pose.z,
    y: 0,
  });
  e.apply("a", { type: "pickup", id: "shared-drop" }, uid());
  assert.throws(() =>
    e.apply("b", { type: "pickup", id: "shared-drop" }, uid()),
  );
  assert.equal(
    countItem(a.inventory, "wood") + countItem(b.inventory, "wood"),
    50,
  );
  e.world.pieces.push({
    id: "chest",
    ownerId: "a",
    kind: "storage",
    x: b.pose.x,
    z: b.pose.z,
    rotation: 0,
    contents: [{ id: "stash", kind: "metal", quantity: 20 }],
  });
  e.markWorld();
  e.cover.update(e.world.pieces, e.resources.entities, true);
  e.apply(
    "b",
    {
      type: "storage",
      station: "chest",
      side: "chest",
      index: 0,
      quantity: 20,
    },
    uid(),
  );
  assert.equal(countItem(b.inventory, "metal"), 20);
  assert.throws(
    () => e.apply("b", { type: "remove", id: "chest" }, uid()),
    /owner/,
  );
});
test("server reload waits for completion and deducts only carried ammunition", () => {
  const e = engine(),
    p = e.world.players.a,
    gun = equip(e, "a", "pistol");
  gun.magazine = 2;
  addItem(p.inventory, "pistol-ammo", 6);
  const now = Date.now();
  e.apply("a", { type: "reload" }, uid(), now);
  e.step(0.05, now + 500);
  assert.equal(gun.magazine, 2);
  e.step(0.05, now + 1600);
  assert.equal(gun.magazine, 8);
  assert.equal(countItem(p.inventory, "pistol-ammo"), 0);
});

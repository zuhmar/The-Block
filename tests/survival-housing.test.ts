import test from "node:test";
import assert from "node:assert/strict";
import {
  newSurvival,
  readSurvival,
  settleUpkeep,
  leaseStatus,
  purchasePlot,
  payUpkeep,
  DAY_MS,
  UPKEEP_GRACE_MS,
  ABANDONED_MS,
  inPlot,
} from "../apps/client/src/fps/survival-state";
import {
  createHousingPlots,
  housingPlacementReason,
} from "../apps/client/src/fps/housing";
import { dropCarriedOnDeath } from "../apps/client/src/fps/full-loot";
import {
  emptyInventory,
  addItem,
  countItem,
  readInventory,
  pickupDrop,
} from "../apps/client/src/fps/inventory";
import {
  configureWestRoad,
  readSave,
  blockedTerrain,
  roadDistance,
  inTown,
  type Piece,
} from "../apps/client/src/fps/world";
import {
  scavengeRewards,
  handcraft,
} from "../apps/client/src/fps/survival-loot";
import { ResourceWorld } from "../apps/client/src/fps/resource-world";
const now = 1800000000000;
function setup() {
  configureWestRoad([]);
  const s = newSurvival();
  s.plots = createHousingPlots([]);
  s.cash = 2000;
  return s;
}
test("plots occupy accessible wilderness, avoid old bases, and constrain whole structure footprints", () => {
  const s = setup();
  assert.equal(s.plots.length, 12);
  const p = s.plots[0];
  assert.equal(purchasePlot(s, p.id, now), "");
  assert.notEqual(purchasePlot(s, s.plots[1].id, now), "");
  for (const plot of s.plots)
    for (let x = -plot.width / 2; x <= plot.width / 2; x += 2)
      for (let z = -plot.depth / 2; z <= plot.depth / 2; z += 2) {
        const q = { x: plot.x + x, z: plot.z + z };
        assert.equal(blockedTerrain(q, 1), false);
        assert.equal(inTown(q), false);
        assert.ok(roadDistance(q) >= 7);
      }
  const piece = { kind: "foundation" as const, x: p.x, z: p.z, rotation: 0 };
  assert.equal(housingPlacementReason(s, piece, [], now), "");
  assert.match(
    housingPlacementReason(s, { ...piece, x: p.x + p.width / 2 }, [], now),
    /entire/,
  );
  assert.match(
    housingPlacementReason(s, { ...piece, y: 10 }, [], now),
    /height/,
  );
  const old: Piece = { ...piece, id: "legacy" };
  assert.ok(createHousingPlots([old]).every((plot) => !inPlot(old, plot, -2)));
});
test("upkeep covers real elapsed days, carries arrears, forfeits once and cleans up after abandonment", () => {
  const s = setup(),
    p = s.plots[0];
  purchasePlot(s, p.id, now);
  const cash = s.cash;
  assert.equal(payUpkeep(s, 7, now), "");
  assert.equal(s.cash, cash - 7 * p.daily);
  const due = s.lease!.paidUntil;
  assert.equal(leaseStatus(s, due), "grace");
  assert.equal(settleUpkeep(s, due + UPKEEP_GRACE_MS - 1).forfeited, false);
  assert.equal(payUpkeep(s, 1, due + DAY_MS), "");
  assert.equal(leaseStatus(s, due + DAY_MS), "grace");
  const expiry = s.lease!.paidUntil + UPKEEP_GRACE_MS;
  assert.equal(settleUpkeep(s, expiry).forfeited, true);
  assert.equal(s.lease, undefined);
  assert.equal(settleUpkeep(s, expiry).forfeited, false);
  assert.match(purchasePlot(s, p.id, expiry), /cleanup/);
  assert.deepEqual(settleUpkeep(s, expiry + ABANDONED_MS).cleared, [p.id]);
  assert.equal(purchasePlot(s, p.id, expiry + ABANDONED_MS), "");
});
test("full-loot death preserves loaded magazines, ammo and resources; does not duplicate or seize property/stored reserves", () => {
  const inv = emptyInventory(),
    s = setup();
  purchasePlot(s, s.plots[0].id, now);
  addItem(inv, "pistol", 1);
  addItem(inv, "pistol-ammo", 60);
  addItem(inv, "wood", 110);
  inv.slots[0]!.magazine = 3;
  inv.reserve.push({ id: "legacy-reserve", kind: "rock", quantity: 25 });
  inv.hotbar[0] = inv.slots[0]!.id;
  inv.active = 0;
  for (let i = 0; i < 200; i++)
    inv.drops.push({
      id: "old-drop-" + i,
      kind: "wood",
      quantity: 1,
      x: 40,
      z: 40,
      y: 0,
    });
  const lease = { ...s.lease! },
    cash = s.cash;
  assert.equal(dropCarriedOnDeath(inv, s, { x: 80, z: 80, y: 0 }), true);
  assert.ok(inv.slots.every((i) => i === null));
  assert.ok(inv.hotbar.every((i) => i === null));
  assert.equal(s.cash, 0);
  assert.deepEqual(s.lease, lease);
  assert.equal(inv.reserve[0].quantity, 25);
  assert.equal(inv.drops.find((d) => d.kind === "cash")!.quantity, cash);
  assert.equal(inv.drops.find((d) => d.kind === "pistol")!.magazine, 3);
  const count = inv.drops.length;
  assert.equal(dropCarriedOnDeath(inv, s, { x: 80, z: 80, y: 0 }), false);
  assert.equal(inv.drops.length, count);
  const restored = readInventory(JSON.parse(JSON.stringify(inv)))!;
  assert.equal(restored.drops.length, count);
  const gun = restored.drops.find((d) => d.kind === "pistol")!;
  assert.equal(pickupDrop(restored, gun.id), 1);
  assert.equal(restored.slots[0]!.magazine, 3);
});
test("migration preserves old builds and inventories and retains dead/lease state on reload", () => {
  const old = readSave(
    JSON.stringify({
      version: 1,
      wood: 10000,
      pieces: [{ id: "old", kind: "foundation", x: 80, z: 80, rotation: 0 }],
      opened: [0],
    }),
  );
  assert.equal(old.pieces.length, 1);
  assert.equal(old.wood, 10000);
  assert.equal(old.survival, undefined);
  const s = setup();
  purchasePlot(s, s.plots[0].id, now);
  s.dead = true;
  s.lootReadyAt["0"] = now + 1000;
  const next = readSave(JSON.stringify({ ...old, survival: s }));
  assert.equal(next.pieces.length, 1);
  assert.equal(next.survival!.dead, true);
  assert.deepEqual(next.survival!.lease, s.lease);
  assert.equal(
    readSurvival({ version: 1, plots: [{ id: "<script>" }], cash: -5 })!.cash,
    0,
  );
});
test("a fresh player can loot supplies, handcraft tools and earn plot cash; failed rewards/crafts do not consume supplies", () => {
  const inv = emptyInventory();
  inv.ammoVersion = 1;
  const reward = scavengeRewards(inv, 0, 30)!;
  assert.ok(reward.cash > 0);
  assert.equal(countItem(inv, "wood"), 0);
  assert.equal(countItem(reward.inventory, "axe"), 1);
  const next = handcraft(reward.inventory, "pickaxe")!;
  assert.equal(countItem(next, "pickaxe"), 1);
  assert.equal(countItem(next, "wood"), 5);
  assert.equal(countItem(reward.inventory, "wood"), 30);
  assert.equal(handcraft(emptyInventory(), "axe"), undefined);
  const full = emptyInventory();
  for (let i = 0; i < 20; i++) addItem(full, "pistol", 1);
  const before = JSON.stringify(full);
  assert.equal(scavengeRewards(full, 2, 50), undefined);
  assert.equal(JSON.stringify(full), before);
});
test("purchased land clears resource collision and prevents regrowth inside the plot without changing saved base pieces", () => {
  const world = new ResourceWorld(() => []);
  const tree = world.entities.find((r) => r.kind === "tree-broadleaf")!;
  world.reserveLand((p) => Math.hypot(p.x - tree.x, p.z - tree.z) > 10, now);
  assert.equal(tree.health, 0);
  world.tick(now + 20000);
  assert.equal(tree.health, 0);
  world.reserveLand(() => true, now + 21000);
  world.tick(now + 50000);
  assert.equal(tree.health, 100);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyInventory,
  addItem,
  countItem,
  roomFor,
  stackLimit,
  isGun,
  migrateInventory,
  bindHotbar,
  selectedItem,
  moveStack,
  splitStack,
  storeStack,
  withdrawStack,
  dropStack,
  pickupDrop,
  takeItem,
  useSelected,
  readInventory,
} from "../apps/client/src/fps/inventory";
import { readSave } from "../apps/client/src/fps/world";
const total = (inv: ReturnType<typeof emptyInventory>, kind: string) =>
  [...inv.slots, ...inv.reserve, ...inv.drops].reduce(
    (n, s) => n + (s?.kind === kind ? s.quantity : 0),
    0,
  );
test("twenty slots enforce resource 500, gun/tool 1 and explosive 5 without hidden hotbar capacity", () => {
  const inv = emptyInventory();
  assert.equal(addItem(inv, "wood", 10001), 10000);
  assert.equal(inv.slots.filter(Boolean).length, 20);
  assert.equal(countItem(inv, "wood"), 10000);
  assert.equal(addItem(inv, "pistol", 1), 0);
  assert.equal(addItem(inv, "rock", 1), 0);
  assert.equal(roomFor(inv, "wood"), 0);
  assert.equal(inv.hotbar.length, 5);
  const a = emptyInventory();
  addItem(a, "pistol", 2);
  addItem(a, "axe", 2);
  addItem(a, "c4", 12);
  assert.deepEqual(
    a.slots.filter((s) => s?.kind === "c4").map((s) => s!.quantity),
    [5, 5, 2],
  );
  assert.equal(new Set(a.slots.filter(Boolean).map((s) => s!.id)).size, 7);
  for (const s of a.slots) if (s) assert(s.quantity <= stackLimit(s.kind));
});
test("migration preserves every existing resource and supplies a bounded starter loadout once", () => {
  const inv = migrateInventory(10000, { rock: 745, sulfur: 53, metal: 999 });
  assert.equal(total(inv, "wood"), 10000);
  assert.equal(total(inv, "rock"), 745);
  assert.equal(total(inv, "sulfur"), 53);
  assert.equal(total(inv, "metal"), 999);
  assert(inv.slots.filter(Boolean).length <= 20);
  assert.equal(countItem(inv, "wood"), 2000);
  assert.equal(
    inv.reserve
      .filter((s) => s.kind === "wood")
      .reduce((n, s) => n + s.quantity, 0),
    8000,
  );
  assert.equal(inv.hotbar.filter(Boolean).length, 5);
  assert.equal(countItem(inv, "grenade"), 5);
  assert.equal(countItem(inv, "rockets"), 5);
  assert.equal(countItem(inv, "axe"), 1);
  assert.equal(countItem(inv, "pickaxe"), 1);
  const saved = readInventory(JSON.parse(JSON.stringify(inv)))!;
  assert.deepEqual(saved, inv);
  for (const s of saved.slots)
    if (s && isGun(s.kind)) assert.equal(s.quantity, 1);
});
test("hand bindings survive moves and cannot assign a sixth slot or reference a missing item", () => {
  const inv = emptyInventory();
  addItem(inv, "pistol", 1);
  addItem(inv, "wood", 500);
  const gun = inv.slots[0]!;
  bindHotbar(inv, gun.id, 0);
  inv.active = 0;
  assert.equal(selectedItem(inv), gun);
  moveStack(inv, 0, 12);
  assert.equal(selectedItem(inv), gun);
  assert.equal(bindHotbar(inv, gun.id, 5), false);
  assert.equal(bindHotbar(inv, "missing", 1), false);
  bindHotbar(inv, gun.id, 4);
  assert.equal(inv.hotbar.filter((id) => id === gun.id).length, 1);
  assert.equal(inv.active, -1);
});
test("split, move, merge and atomic resource costs conserve counts and stack bounds", () => {
  const inv = emptyInventory();
  addItem(inv, "wood", 700);
  const id = inv.slots[0]!.id;
  assert(splitStack(inv, id));
  assert.deepEqual(
    inv.slots.filter(Boolean).map((s) => s!.quantity),
    [250, 200, 250],
  );
  moveStack(inv, 2, 1);
  assert.deepEqual(
    inv.slots.filter(Boolean).map((s) => s!.quantity),
    [250, 450],
  );
  assert.equal(countItem(inv, "wood"), 700);
  assert(!takeItem(inv, "wood", 701));
  assert(!takeItem(inv, "wood", -1));
  assert.equal(countItem(inv, "wood"), 700);
  assert(takeItem(inv, "wood", 250));
  assert.equal(countItem(inv, "wood"), 450);
  assert.equal(addItem(inv, "wood", NaN), 0);
});
test("individual gun magazines survive reserve transfers, dropped pickups and reload of the save", () => {
  const inv = emptyInventory();
  addItem(inv, "pistol", 2);
  inv.slots[0]!.magazine = 2;
  inv.slots[1]!.magazine = 9;
  const id = inv.slots[0]!.id;
  storeStack(inv, id);
  assert.equal(withdrawStack(inv, "pistol"), 1);
  const gun = inv.slots.find((s) => s?.id === id)!;
  assert.equal(gun.magazine, 2);
  dropStack(inv, id, { x: 0, z: 14, y: 0 });
  assert.equal(pickupDrop(inv, id), 1);
  const reloaded = readInventory(JSON.parse(JSON.stringify(inv)))!;
  assert.equal(reloaded.slots.find((s) => s?.id === id)!.magazine, 2);
  assert.equal(reloaded.slots.filter((s) => s?.kind === "pistol").length, 2);
});
test("full inventory leaves dropped resources on the ground and explosive use consumes one real charge", () => {
  const inv = emptyInventory();
  addItem(inv, "wood", 10000);
  const id = inv.slots[0]!.id;
  dropStack(inv, id, { x: 2, z: 14, y: 0 });
  addItem(inv, "pistol", 1);
  assert.equal(pickupDrop(inv, id), 0);
  assert.equal(inv.drops[0].quantity, 500);
  takeItem(inv, "wood", 25);
  assert.equal(pickupDrop(inv, id), 25);
  assert.equal(inv.drops[0].quantity, 475);
  assert.equal(total(inv, "wood"), 9975);
  const exp = emptyInventory();
  addItem(exp, "c4", 5);
  bindHotbar(exp, exp.slots[0]!.id, 0);
  exp.active = 0;
  for (let i = 0; i < 5; i++) assert(useSelected(exp));
  assert.equal(countItem(exp, "c4"), 0);
  assert.equal(selectedItem(exp), undefined);
  assert(!useSelected(exp));
});
test("inventory serialization keeps old buildings, opened containers and optional corrupt data isolated", () => {
  const inv = migrateInventory(9800);
  const save = readSave(
    JSON.stringify({
      version: 1,
      wood: 2000,
      pieces: [{ id: "home", kind: "foundation", x: 40, z: 40, rotation: 0 }],
      opened: [0, 4],
      inventory: inv,
    }),
  );
  assert.equal(save.pieces[0].id, "home");
  assert.deepEqual(save.opened, [0, 4]);
  assert.deepEqual(save.inventory, inv);
  const bad = readSave(JSON.stringify({ ...save, inventory: { version: 99 } }));
  assert.equal(bad.pieces[0].id, "home");
  assert.equal(bad.wood, 2000);
  assert.equal(bad.inventory, undefined);
  inv.hotbar[0] = "ghost";
  const fixed = readInventory(inv)!;
  assert.equal(fixed.hotbar[0], null);
  assert.equal(fixed.slots.length, 20);
  assert.equal(fixed.hotbar.length, 5);
});
test("merging two bound stacks keeps the active hand reference on the surviving stack", () => {
  const inv = emptyInventory();
  addItem(inv, "wood", 750);
  const a = inv.slots[0]!,
    b = inv.slots[1]!;
  takeItem(inv, "wood", 250);
  bindHotbar(inv, a.id, 0);
  bindHotbar(inv, b.id, 4);
  inv.active = 4;
  assert(moveStack(inv, 0, 1));
  assert.equal(selectedItem(inv)?.id, b.id);
  assert.equal(inv.active, 4);
  assert.equal(inv.hotbar.filter((id) => id === b.id).length, 1);
});

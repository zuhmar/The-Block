import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyStorage,
  readStorage,
  transferStorage,
} from "../apps/client/src/fps/storage";
import {
  emptyInventory,
  addItem,
  cleanHotbar,
} from "../apps/client/src/fps/inventory";
import { readSave, type Piece } from "../apps/client/src/fps/world";
test("storage transfers resource stacks both ways and keeps overflow at source", () => {
  const inv = emptyInventory(),
    chest = emptyStorage();
  addItem(inv, "wood", 500);
  assert.equal(transferStorage(inv.slots, chest, 0, 250), 250);
  assert.equal(inv.slots[0]?.quantity, 250);
  assert.equal(chest[0]?.quantity, 250);
  assert.equal(transferStorage(chest, inv.slots, 0), 250);
  assert.equal(inv.slots[0]?.quantity, 500);
  assert.equal(chest[0], null);
});
test("full destination never consumes items; partial space accepts only what fits", () => {
  const bag = emptyStorage(),
    chest = emptyStorage();
  bag[0] = { id: "wood", kind: "wood", quantity: 500 };
  for (let i = 0; i < 20; i++)
    chest[i] = { id: "c" + i, kind: "wood", quantity: 500 };
  assert.equal(transferStorage(bag, chest, 0), 0);
  chest[4]!.quantity = 499;
  assert.equal(transferStorage(bag, chest, 0), 1);
  assert.equal(bag[0]?.quantity, 499);
  assert.equal(chest[4]?.quantity, 500);
});
test("guns retain magazines through deposit, save parsing, and withdrawal; hotbar clears", () => {
  const inv = emptyInventory(),
    chest = emptyStorage();
  addItem(inv, "pistol", 1);
  inv.slots[0]!.magazine = 3;
  inv.hotbar[0] = inv.slots[0]!.id;
  assert.equal(transferStorage(inv.slots, chest, 0), 1);
  cleanHotbar(inv);
  assert.equal(inv.hotbar[0], null);
  assert.equal(chest[0]?.magazine, 3);
  const restored = readStorage(JSON.parse(JSON.stringify(chest)));
  assert.equal(transferStorage(restored, inv.slots, 0), 1);
  assert.equal(inv.slots[0]?.magazine, 3);
});
test("explosives retain stack cap and invalid transfers do nothing", () => {
  const bag = emptyStorage(),
    chest = emptyStorage();
  bag[0] = { id: "c4", kind: "c4", quantity: 5 };
  chest[0] = { id: "stored", kind: "c4", quantity: 4 };
  assert.equal(transferStorage(bag, chest, 0), 5);
  assert.equal(chest[0]?.quantity, 5);
  assert.equal(chest[1]?.quantity, 4);
  assert.equal(transferStorage(chest, chest, 0), 0);
  assert.equal(transferStorage(chest, bag, -1), 0);
  assert.equal(transferStorage(chest, bag, 0, NaN), 0);
});
test("legacy placed chests become empty containers; saved contents round trip without resetting world", () => {
  const p: Piece = {
    id: "chest",
    kind: "storage",
    x: -42,
    z: 40,
    rotation: 0,
    contents: emptyStorage(),
  };
  p.contents![0] = { id: "kept", kind: "metal", quantity: 125 };
  const raw = { version: 1, wood: 42, pieces: [p], opened: [] };
  const restored = readSave(JSON.stringify(raw));
  assert.equal(restored.wood, 42);
  assert.equal(restored.pieces[0].contents?.[0]?.quantity, 125);
  delete p.contents;
  const legacy = readSave(JSON.stringify(raw));
  assert.equal(legacy.pieces[0].contents?.length, 20);
  assert.equal(legacy.pieces[0].contents?.filter(Boolean).length, 0);
});

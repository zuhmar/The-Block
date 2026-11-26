import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  LOOT_ITEM_KINDS,
  lootItemSpec,
} from "../apps/client/src/fps/loot-item-spec";
import {
  emptyInventory,
  addItem,
  readInventory,
  itemIcon,
  itemTool,
  dropStack,
  pickupDrop,
  countItem,
  bindHotbar,
} from "../apps/client/src/fps/inventory";
import { scavengeRewards } from "../apps/client/src/fps/survival-loot";
import { useLootItem } from "../apps/client/src/fps/use-loot-item";

test("all 42 Meshy pickups have exact runtime models/icons and survive saving and dropping", () => {
  for (const kind of LOOT_ITEM_KINDS) {
    for (const [folder, ext] of [
      ["models", "glb"],
      ["sprites", "png"],
    ]) {
      const hash = (path: string) =>
        createHash("sha256").update(readFileSync(path)).digest("hex");
      assert.equal(
        hash(`apps/client/static/assets/loot-items/${kind}.${ext}`),
        hash(`art/loot-items/meshy-v1/${folder}/${kind}.${ext}`),
      );
    }
    assert.match(itemIcon(kind), /loot-items/);
    assert.equal(itemTool(kind), "hands");
    const inv = emptyInventory();
    const quantity = Math.min(lootItemSpec(kind).stack, 5);
    assert.equal(addItem(inv, kind, quantity), quantity);
    const restored = readInventory(JSON.parse(JSON.stringify(inv)))!;
    assert.equal(countItem(restored, kind), quantity);
    const id = restored.slots.find(Boolean)!.id;
    assert.ok(dropStack(restored, id, { x: 0, z: 0, y: 0 }));
    assert.equal(restored.drops[0].kind, kind);
    assert.ok(pickupDrop(restored, restored.drops[0].id));
    assert.equal(countItem(restored, kind), quantity);
  }
});
test("loot tiers expose every pickup and full bags never lose items", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 100; i++) {
    const result = scavengeRewards(emptyInventory(), i, 30, {
      tier: 5,
      name: "Military crate",
    })!;
    result.items.forEach(([k]) => seen.add(k));
    const trash = scavengeRewards(emptyInventory(), i, 30, {
      kind: "trash",
      tier: 0,
      name: "Trash",
    })!;
    for (const [k] of trash.items.slice(-2))
      assert.ok(lootItemSpec(k).minTier <= 1);
  }
  for (const kind of LOOT_ITEM_KINDS.filter((k) => k !== "cash"))
    assert.ok(seen.has(kind), kind);
  const full = emptyInventory();
  addItem(full, "wood", 10000);
  const before = JSON.stringify(full);
  assert.equal(scavengeRewards(full, 0, 30), undefined);
  assert.equal(JSON.stringify(full), before);
});
test("medicine heals only living wounded players and consumes the selected stack", () => {
  const inv = emptyInventory();
  addItem(inv, "medkit", 1);
  addItem(inv, "bandage", 2);
  const id = inv.slots[0]!.id;
  bindHotbar(inv, id, 0);
  assert.equal(useLootItem(inv, id, 100), undefined);
  assert.equal(useLootItem(inv, id, 0), undefined);
  const result = useLootItem(inv, id, 75)!;
  assert.equal(result.health, 100);
  assert.equal(countItem(result.inventory, "medkit"), 0);
  assert.equal(countItem(result.inventory, "bandage"), 2);
  assert.equal(result.inventory.hotbar[0], null);
  assert.equal(countItem(inv, "medkit"), 1);
});

test("new pickups transfer through persistent player storage without loss", async () => {
  const { emptyStorage, readStorage, transferStorage } = await import(
    "../apps/client/src/fps/storage"
  );
  for (const kind of LOOT_ITEM_KINDS) {
    const inv = emptyInventory();
    addItem(inv, kind, Math.min(lootItemSpec(kind).stack, 5));
    const quantity = countItem(inv, kind),
      chest = emptyStorage();
    assert.equal(transferStorage(inv.slots, chest, 0), quantity);
    const restored = readStorage(JSON.parse(JSON.stringify(chest)));
    assert.equal(transferStorage(restored, inv.slots, 0), quantity);
    assert.equal(countItem(inv, kind), quantity);
  }
});

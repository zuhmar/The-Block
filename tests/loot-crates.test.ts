import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LOOT_CRATES,
  SCAVENGE_CRATE_TIERS,
  lootCrateAt,
  rollCrateLoot,
} from "../packages/game-data/loot-crates.js";
import {
  ITEMS,
  WORLD,
  BUILD_KINDS,
  type Item,
} from "../packages/shared/src/index.js";
import { act, emptyWorld, createPlayer } from "../apps/server/src/engine.js";
const look = {
  skin: "#c98c62",
  hair: "#252939",
  top: "#ec8753",
  body: "standard",
  style: "short",
} as const;
function setup(index = 0) {
  const world = emptyWorld(),
    player = createPlayer("searcher", "Searcher", look);
  Object.assign(player, WORLD.scavengePoints[index]);
  world.players[player.id] = player;
  return { world, player };
}
test("all five loot tiers appear on the map and average reward value rises with tier", () => {
  assert.equal(LOOT_CRATES.length, 5);
  assert.equal(SCAVENGE_CRATE_TIERS.length, WORLD.scavengePoints.length);
  assert.equal(new Set(SCAVENGE_CRATE_TIERS).size, 5);
  let previous = 0;
  for (let tier = 0; tier < 5; tier++) {
    let seed = 1777,
      total = 0;
    const random = () =>
      (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let sample = 0; sample < 600; sample++) {
      const result = rollCrateLoot(tier, {}, random);
      total += Object.entries(result.items).reduce(
        (sum, [item, n]) => sum + ITEMS[item as Item].price * n!,
        0,
      );
    }
    assert(
      total > previous,
      `Tier ${tier + 1} must improve average reward value`,
    );
    previous = total;
  }
  assert.equal(lootCrateAt(5).id, "advanced");
});
test("rewards skip full starter wood and duplicate weapons without changing input inventory", () => {
  const inventory = { wood: 10000, water: 1, snack: 1 };
  assert.deepEqual(rollCrateLoot(0, inventory, () => 0).items, { scrap: 1 });
  assert.deepEqual(inventory, { wood: 10000, water: 1, snack: 1 });
  const advanced = rollCrateLoot(4, {}, () => 0);
  assert.equal(advanced.items.pistol, 1);
  const armed = rollCrateLoot(4, { pistol: 1 }, () => 0);
  assert.equal(armed.inventory.pistol, 1);
  assert.equal(armed.items.pistol, undefined);
  assert.equal(
    Object.values(armed.items).reduce((n, v) => n + v!, 0),
    5,
  );
});
test("scavenging is server validated and cooldowns survive a reconnect/restart", () => {
  const { world, player } = setup();
  const now = Date.now();
  const result = act(world, player.id, { type: "scavenge", index: 0 }, now);
  assert.match(result, /Small crate/);
  assert.equal(player.cooldowns[0], now + 60000);
  const inventory = { ...player.inventory };
  assert.throws(
    () => act(world, player.id, { type: "scavenge", index: 0 }, now + 1),
    /depleted/,
  );
  assert.deepEqual(player.inventory, inventory);
  const restarted = JSON.parse(JSON.stringify(world));
  assert.throws(
    () =>
      act(restarted, player.id, { type: "scavenge", index: 0 }, now + 30000),
    /depleted/,
  );
  act(restarted, player.id, { type: "scavenge", index: 0 }, now + 60001);
  assert.throws(
    () => act(world, player.id, { type: "scavenge", index: 5 }, now),
    /closer/,
  );
});
test("a full backpack does not lose items or consume a cache cooldown", () => {
  const { world, player } = setup(5);
  player.inventory = { stone: 32, water: 1 };
  assert.throws(
    () => act(world, player.id, { type: "scavenge", index: 5 }),
    /Backpack full/,
  );
  assert.deepEqual(player.inventory, { stone: 32, water: 1 });
  assert.equal(player.cooldowns[5], undefined);
});
test("craftable storage stays the original empty storage piece", () => {
  const { world, player } = setup();
  player.x = 3000;
  player.y = 1344;
  act(world, player.id, {
    type: "build",
    kind: "foundation",
    x: 3008,
    y: 1344,
  });
  const floor = Object.values(world.structures)[0];
  act(world, player.id, {
    type: "build",
    kind: "storage",
    x: 3040,
    y: 1312,
    foundation: floor.id,
  });
  const storage = Object.values(world.structures).find(
    (s) => s.kind === "storage",
  )!;
  assert.deepEqual(storage.inventory, {});
  assert.equal(storage.hp, 60);
  assert.deepEqual(BUILD_KINDS, ["foundation", "wall", "door", "storage"]);
});

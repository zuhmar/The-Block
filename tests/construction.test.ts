import { test } from "node:test";
import assert from "node:assert/strict";
import {
  act,
  createPlayer,
  emptyWorld,
  obstruction,
  upgradeWorld,
} from "../apps/server/src/engine.js";
import {
  BUILD_KINDS,
  canCarry,
  floorSupportsPiece,
  snapBuildPoint,
  placementReason,
} from "../packages/shared/src/index.js";

const look = {
  skin: "#c98c62",
  hair: "#252939",
  top: "#ec8753",
  body: "standard",
  style: "short",
} as const;
function setup() {
  const world = emptyWorld(),
    player = createPlayer("owner", "Builder", look);
  player.x = 3000;
  player.y = 1344;
  player.inventory = { wood: 50 };
  world.players[player.id] = player;
  act(world, player.id, {
    type: "build",
    kind: "foundation",
    x: 3008,
    y: 1344,
  });
  const floor = Object.values(world.structures)[0];
  return { world, player, floor };
}
test("walls snap to a floor edge and the authoritative placement matches the preview", () => {
  const { world, player, floor } = setup();
  const requested = { x: 3034, y: 1307 },
    point = snapBuildPoint("wall", requested, floor);
  assert(floorSupportsPiece(floor, point, "wall"));
  assert.equal(
    placementReason(
      player,
      "wall",
      point,
      Object.values(world.structures),
      floor.id,
    ),
    "",
  );
  act(world, player.id, {
    type: "build",
    kind: "wall",
    ...requested,
    foundation: floor.id,
  });
  const wall = Object.values(world.structures).find((s) => s.kind === "wall")!;
  assert.deepEqual({ x: wall.x, y: wall.y, rotation: wall.rotation }, point);
  assert.equal(wall.foundation, floor.id);
  assert.equal(world.structures[floor.id].hp, 9999);
});
test("floors join without overlap and off-floor pieces, occupied cells and roofs are rejected", () => {
  const { world, player, floor } = setup();
  const wood = player.inventory.wood;
  assert.throws(
    () =>
      act(world, player.id, {
        type: "build",
        kind: "foundation",
        x: 3072,
        y: 1344,
      }),
    /overlaps/,
  );
  assert.equal(player.inventory.wood, wood);
  act(world, player.id, {
    type: "build",
    kind: "foundation",
    x: 3136,
    y: 1344,
  });
  assert.equal(
    Object.values(world.structures).filter((s) => s.kind === "foundation")
      .length,
    2,
  );
  assert.throws(
    () =>
      act(world, player.id, {
        type: "build",
        kind: "wall",
        x: 3168,
        y: 1312,
        foundation: floor.id,
      }),
    /selected floor/,
  );
  act(world, player.id, {
    type: "build",
    kind: "door",
    x: 3040,
    y: 1312,
    foundation: floor.id,
  });
  assert.throws(
    () =>
      act(world, player.id, {
        type: "build",
        kind: "wall",
        x: 3040,
        y: 1312,
        foundation: floor.id,
      }),
    /occupied/,
  );
  assert(!BUILD_KINDS.some((kind) => (kind as string) === "roof"));
  assert.throws(
    () =>
      act(world, player.id, {
        type: "build",
        kind: "roof",
        x: 3040,
        y: 1376,
        foundation: floor.id,
      }),
    /Roofs are not needed/,
  );
});
test("a green preview requires sufficient wood and a floor owned by the builder", () => {
  const { world, player, floor } = setup();
  const point = snapBuildPoint("storage", { x: 3040, y: 1312 }, floor);
  player.inventory = {};
  assert.match(
    placementReason(player, "storage", point, [floor], floor.id),
    /wood/,
  );
  player.inventory = { wood: 10 };
  floor.owner = "someone-else";
  assert.match(
    placementReason(
      player,
      "storage",
      point,
      Object.values(world.structures),
      floor.id,
    ),
    /selected floor/,
  );
});

test("perimeter segments join at corners and an open door clears the actual wall opening", () => {
  const { world, player, floor } = setup();
  for (const dx of [-32, 32])
    for (const dy of [-64, 64])
      act(world, player.id, {
        type: "build",
        kind: dx === 32 && dy === -64 ? "door" : "wall",
        x: floor.x + dx,
        y: floor.y + dy,
        foundation: floor.id,
      });
  for (const dx of [-64, 64])
    for (const dy of [-32, 32])
      act(world, player.id, {
        type: "build",
        kind: "wall",
        x: floor.x + dx,
        y: floor.y + dy,
        foundation: floor.id,
      });
  assert.equal(
    Object.values(world.structures).filter((s) => s.kind === "wall").length,
    7,
  );
  const door = Object.values(world.structures).find((s) => s.kind === "door")!;
  const inside = { x: door.x, y: door.y + 30 },
    outside = { x: door.x, y: door.y - 50 };
  assert(obstruction(world, inside, outside));
  act(world, player.id, { type: "door", id: door.id });
  assert(!obstruction(world, inside, outside));
  const rotated = Object.values(world.structures).filter(
    (s) => s.rotation === 90,
  );
  assert.equal(rotated.length, 4);
  assert.equal(
    JSON.parse(JSON.stringify(world)).structures[rotated[0].id].rotation,
    90,
  );
});

test("new characters can build immediately using their 10000 starter wood", () => {
  const world = emptyWorld(),
    player = createPlayer("practice", "Practice", look);
  world.players[player.id] = player;
  assert.equal(player.inventory.wood, 10000);
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
    kind: "wall",
    x: 3040,
    y: 1280,
    foundation: floor.id,
  });
  assert.equal(player.inventory.wood, 9987);
  assert.equal(player.inventory.water, 1);
  assert.equal(player.inventory.snack, 1);
});

test("existing characters receive wood once without losing items or refilling after restart", () => {
  const world = emptyWorld(),
    player = createPlayer("existing", "Existing", look);
  delete player.practiceWoodGranted;
  player.inventory = { wood: 7, water: 2, snack: 1, scrap: 3 };
  world.players[player.id] = player;
  const upgraded = upgradeWorld(world);
  assert.deepEqual(upgraded.players.existing.inventory, {
    wood: 10000,
    water: 2,
    snack: 1,
    scrap: 3,
  });
  assert.equal(player.practiceWoodGranted, true);
  player.inventory.wood = 9992;
  assert.equal(
    upgradeWorld(JSON.parse(JSON.stringify(upgraded))).players.existing
      .inventory.wood,
    9992,
  );
  const fresh = createPlayer("fresh", "Fresh", look);
  fresh.inventory.wood = 9987;
  upgraded.players.fresh = fresh;
  assert.equal(upgradeWorld(upgraded).players.fresh.inventory.wood, 9987);
});

test("practice wood does not consume any of the eight normal carrying slots", () => {
  const inventory = {
    wood: 10000,
    water: 1,
    snack: 1,
    bandage: 1,
    scrap: 1,
    stone: 1,
    brick: 1,
    glass: 1,
  };
  assert(canCarry(inventory, "electronics"));
  assert(!canCarry({ ...inventory, electronics: 1 }, "steel"));
});

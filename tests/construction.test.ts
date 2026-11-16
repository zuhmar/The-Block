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
  resolveBuildFloor,
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
  player.x = 7096;
  player.y = 1344;
  player.inventory = { wood: 50 };
  world.players[player.id] = player;
  act(world, player.id, {
    type: "build",
    kind: "foundation",
    x: 7104,
    y: 1344,
  });
  const floor = Object.values(world.structures)[0];
  return { world, player, floor };
}
test("walls snap to a floor edge and the authoritative placement matches the preview", () => {
  const { world, player, floor } = setup();
  const requested = { x: 7130, y: 1279 },
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
        x: 7168,
        y: 1344,
      }),
    /overlaps/,
  );
  assert.equal(player.inventory.wood, wood);
  act(world, player.id, {
    type: "build",
    kind: "foundation",
    x: 7232,
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
        x: 7264,
        y: 1280,
        foundation: floor.id,
      }),
    /floor you own/,
  );
  act(world, player.id, {
    type: "build",
    kind: "door",
    x: 7136,
    y: 1280,
    foundation: floor.id,
  });
  assert.throws(
    () =>
      act(world, player.id, {
        type: "build",
        kind: "wall",
        x: 7136,
        y: 1280,
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
        x: 7136,
        y: 1376,
        foundation: floor.id,
      }),
    /Roofs are not needed/,
  );
});
test("a green preview requires sufficient wood and a floor owned by the builder", () => {
  const { world, player, floor } = setup();
  const point = snapBuildPoint("storage", { x: 7136, y: 1312 }, floor);
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
    /floor you own/,
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
  player.x = 7096;
  player.y = 1344;
  act(world, player.id, {
    type: "build",
    kind: "foundation",
    x: 7104,
    y: 1344,
  });
  const floor = Object.values(world.structures)[0];
  act(world, player.id, {
    type: "build",
    kind: "wall",
    x: 7136,
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

test("wall snapping stays on the floor at every corner and supports interior partitions", () => {
  const { world, player, floor } = setup();
  for (const dx of [-64, 64])
    for (const dy of [-64, 64]) {
      const point = snapBuildPoint(
        "wall",
        { x: floor.x + dx, y: floor.y + dy },
        floor,
      );
      assert(floorSupportsPiece(floor, point, "wall"));
      assert.deepEqual(snapBuildPoint("wall", point, floor), point);
    }
  player.y = 1440;
  const requested = { x: floor.x + 25, y: floor.y + 5 };
  const partition = snapBuildPoint("wall", requested, floor);
  assert.equal(partition.y, floor.y);
  assert.equal(
    placementReason(player, "wall", partition, [floor], floor.id),
    "",
  );
  act(world, player.id, {
    type: "build",
    kind: "wall",
    ...requested,
    foundation: floor.id,
  });
  assert(
    Object.values(world.structures).some(
      (s) => s.kind === "wall" && s.y === floor.y,
    ),
  );
});

test("hovering a different owned floor selects it despite a stale preferred floor", () => {
  const { world, player, floor } = setup();
  act(world, player.id, {
    type: "build",
    kind: "foundation",
    x: floor.x + 128,
    y: floor.y,
  });
  const structures = Object.values(world.structures),
    next = structures.find((s) => s.id !== floor.id)!;
  const requested = { x: next.x + 40, y: next.y - 60 };
  const resolved = resolveBuildFloor(
    player.id,
    requested,
    structures,
    floor.id,
  )!;
  assert.equal(resolved.id, next.id);
  const point = snapBuildPoint("wall", requested, resolved);
  assert.equal(
    placementReason(player, "wall", point, structures, resolved.id),
    "",
  );
  act(world, player.id, {
    type: "build",
    kind: "wall",
    ...point,
    foundation: resolved.id,
  });
  assert(
    Object.values(world.structures).some(
      (s) => s.kind === "wall" && s.foundation === next.id,
    ),
  );
  next.owner = "other";
  assert.notEqual(
    resolveBuildFloor(player.id, requested, structures, next.id)?.id,
    next.id,
  );
});

test("walls on a floor at the parcel boundary are allowed without extending the floor outside the parcel", () => {
  const { world, player } = setup();
  player.x = 6726;
  player.y = 1260;
  act(world, player.id, {
    type: "build",
    kind: "foundation",
    x: 6720,
    y: 1216,
  });
  const floor = Object.values(world.structures).find((s) => s.x === 6720)!;
  const point = snapBuildPoint("wall", { x: 6656, y: floor.y - 32 }, floor);
  assert.equal(point.x, 6656);
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
    ...point,
    foundation: floor.id,
  });
});

test("a player can place their 100th piece but not their 101st", () => {
  const { world, player, floor } = setup();
  for (let i = 0; i < 98; i++) {
    const id = `existing-${i}`;
    world.structures[id] = { ...floor, id, kind: "storage", x: 6000, y: 6896 };
  }
  act(world, player.id, {
    type: "build",
    kind: "wall",
    x: floor.x + 32,
    y: floor.y - 64,
    foundation: floor.id,
  });
  assert.equal(Object.values(world.structures).length, 100);
  const wood = player.inventory.wood;
  assert.throws(
    () =>
      act(world, player.id, {
        type: "build",
        kind: "wall",
        x: floor.x - 32,
        y: floor.y - 64,
        foundation: floor.id,
      }),
    /Build budget reached/,
  );
  assert.equal(player.inventory.wood, wood);
});

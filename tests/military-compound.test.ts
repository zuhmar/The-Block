import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as THREE from "three";
import {
  COMPOUND,
  COMPOUND_BARRIERS,
  COMPOUND_PATROLS,
  inCompound,
  compoundBlocked,
} from "../apps/client/src/fps/military-compound";
import {
  BUILDINGS,
  fixtures,
  frontOf,
  buildingBlocked,
  resetDoors,
  toggleDoor,
  animateDoors,
} from "../apps/client/src/fps/building-layout";
import {
  MAP_SIZE,
  LOOT,
  START,
  TREES,
  blocked,
  blockedTerrain,
  movePlayer,
  readSave,
  placementReason,
} from "../apps/client/src/fps/world";
import {
  newEnemy,
  updateEnemy,
  damageEnemy,
} from "../apps/client/src/fps/enemy";
test("expanded world keeps the bridge continuous and reserves the military compound", () => {
  assert.equal(MAP_SIZE, 384);
  assert(COMPOUND.maxX < MAP_SIZE / 2 - 3);
  assert(!blocked(START, []));
  for (let x = 35; x < 124; x += 0.25)
    assert(!blocked({ x, z: 7 }, []), `bridge/approach ${x}`);
  assert(blockedTerrain({ x: MAP_SIZE / 2 - 1, z: 7 }));
  assert(!blockedTerrain({ x: 118, z: 60 }));
  assert(blockedTerrain({ x: 47, z: 0 }));
  assert(!blockedTerrain({ x: 48, z: 7 }));
  for (const b of COMPOUND_BARRIERS) {
    assert(compoundBlocked(b));
  }
  assert(!compoundBlocked({ x: 64, z: 7 }));
  assert(!compoundBlocked({ x: 112, z: 7 }));
  assert(
    movePlayer({ x: 67.1, z: 2 }, 0.1, 0, [], 0.8).x > 67.15,
    "can step off low cover without getting trapped",
  );
  assert(TREES.every((t) => !inCompound(t, 1)));
  assert(TREES.some((t) => Math.abs(t.x) > 65 || Math.abs(t.z) > 65));
  const far = {
    id: "new-land",
    kind: "floor" as const,
    x: 116,
    z: 60,
    rotation: 0,
  };
  const saved = {
    version: 1,
    wood: 8765,
    pieces: [
      far,
      { id: "old-house", kind: "floor", x: 40, z: 40, rotation: 0 },
    ],
    opened: [0, 4, 13, 19],
  };
  assert.deepEqual(readSave(JSON.stringify(saved)), saved);
  assert.match(
    placementReason(
      { kind: "floor", x: 88, z: 7, rotation: 0 },
      { x: 88, z: 9 },
      [],
      10000,
    ),
    /compound/,
  );
});
test("four SWAT patrols complete clear circuits without leaving their compound", () => {
  for (const spec of COMPOUND_PATROLS) {
    const guard = newEnemy("swat", [], spec),
      start = { x: guard.x, z: guard.z };
    let traveled = 0;
    const visited = new Set<number>();
    for (let i = 0; i < 1800; i++) {
      const before = { x: guard.x, z: guard.z };
      const shot = updateEnemy(guard, START, [], 0.1, false);
      assert.equal(shot, undefined);
      assert(!blocked(guard, []), `${spec.id} obstacle ${guard.x},${guard.z}`);
      assert(inCompound(guard));
      traveled += Math.hypot(guard.x - before.x, guard.z - before.z);
      visited.add(guard.waypoint!);
    }
    assert(traveled > 180, `${spec.id} traveled ${traveled}`);
    assert.equal(visited.size, 4);
    assert(Math.hypot(guard.x - start.x, guard.z - start.z) > 1);
  }
});
test("patrol SWAT shoots, returns to its route after combat, and respawns at its own post", () => {
  const spec = COMPOUND_PATROLS[0],
    guard = newEnemy("swat", [], spec),
    player = { x: 75, z: -3 };
  let fired = false;
  for (let i = 0; i < 20; i++)
    fired ||= Boolean(updateEnemy(guard, player, [], 0.1, true));
  assert(fired);
  // Chase out of the original circuit, then lose sight and resume the patrol.
  for (let i = 0; i < 100; i++)
    updateEnemy(guard, { x: 88, z: 8 }, [], 0.1, true);
  let distance = 0;
  for (let i = 0; i < 700; i++) {
    const before = { x: guard.x, z: guard.z };
    updateEnemy(guard, START, [], 0.1, false);
    distance += Math.hypot(guard.x - before.x, guard.z - before.z);
    assert(inCompound(guard));
    assert(!blocked(guard, []));
  }
  assert(distance > 60);
  damageEnemy(guard, 1000);
  for (let i = 0; i < 302; i++) updateEnemy(guard, START, [], 0.1, false);
  assert.equal(guard.health, 225);
  assert.equal(guard.patrol, spec);
  assert(
    Math.hypot(guard.x - spec.points[0].x, guard.z - spec.points[0].z) < 1,
  );
});
test("five military models have furnished hollow interiors, working entry hinges and matched loot", async () => {
  resetDoors();
  assert.equal(
    BUILDINGS.filter((b) => b.type.startsWith("military-")).length,
    5,
  );
  assert.equal(LOOT.length, 65);
  for (const [i, b] of BUILDINGS.entries()) {
    if (!b.type.startsWith("military-")) continue;
    const raw = await readFile(
      `apps/client/src/fps/models/buildings/${b.type}.glb`,
    );
    assert(raw.length < 600000);
    const g = await new GLTFLoader().parseAsync(
      raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength),
      "",
    );
    assert(g.scene.getObjectByName(b.type + "-door-hinge"));
    let interior = 0;
    g.scene.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData.part === "interior") interior++;
    });
    assert(interior > 0);
    assert(fixtures(i).length >= 4);
    const entry = { x: b.x, z: b.z + (frontOf(b) * b.depth) / 2 };
    assert(buildingBlocked(entry));
    toggleDoor(i);
    for (let t = 0; t < 16; t++) animateDoors(0.05, []);
    assert(!buildingBlocked(entry));
  }
  for (const c of LOOT.slice(21, 28)) {
    assert(!blockedTerrain(c));
    assert(!buildingBlocked(c));
    assert(inCompound(c));
  }
  resetDoors();
});

test("a guard that follows combat indoors can rejoin an outdoor patrol through an open entry", () => {
  resetDoors();
  const index = BUILDINGS.findIndex((b) => b.type === "military-hangar");
  toggleDoor(index);
  for (let i = 0; i < 16; i++) animateDoors(0.05, []);
  const guard = newEnemy("swat", [], COMPOUND_PATROLS[3]);
  guard.x = 97;
  guard.z = 21;
  guard.state = "chase";
  let escaped = false;
  for (let i = 0; i < 700; i++) {
    updateEnemy(guard, START, [], 0.1, false);
    assert(!blocked(guard, []));
    if (guard.z < 18.5) escaped = true;
  }
  assert(escaped, `guard stuck indoors ${guard.x},${guard.z}`);
  resetDoors();
});

test("a guard waiting inside a closed hangar finds the exit when the door reopens", () => {
  resetDoors();
  const i = BUILDINGS.findIndex((b) => b.type === "military-hangar");
  const guard = newEnemy("swat", [], COMPOUND_PATROLS[3]);
  guard.x = 97;
  guard.z = 21;
  guard.state = "chase";
  for (let t = 0; t < 160; t++) updateEnemy(guard, START, [], 0.1, false);
  assert(guard.z > 19, "closed door keeps guard indoors");
  toggleDoor(i);
  for (let t = 0; t < 16; t++) animateDoors(0.05, []);
  let escaped = false;
  for (let t = 0; t < 700; t++) {
    updateEnemy(guard, START, [], 0.1, false);
    assert(!blocked(guard, []));
    if (guard.z < 18.5) escaped = true;
  }
  assert(escaped, `failed to recover ${guard.x},${guard.z}`);
  resetDoors();
});

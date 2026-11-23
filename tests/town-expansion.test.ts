import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  BUILDINGS,
  LOOT,
  lootReward,
  blocked,
  surfaceHeight,
  ceilingHeight,
  readSave,
  configureWestRoad,
  ROADS,
  pavedRoadDistance,
} from "../apps/client/src/fps/world";
import {
  JAIL_STAIRS,
  JAIL_TOWERS,
} from "../apps/client/src/fps/jail-ground-layout";
import { westConnector } from "../apps/client/src/fps/west-road";
import {
  buildingStories,
  buildingBlocked,
  resetDoors,
} from "../apps/client/src/fps/building-layout";
test("prison gates stay open, fences block and all four stairways reach the platforms continuously", () => {
  assert(!blocked({ x: 0, z: 12 }, []));
  assert(blocked({ x: 5, z: 12 }, []));
  assert(blocked({ x: 14, z: 0 }, []));
  for (const s of JAIL_STAIRS) {
    let y = 0;
    for (let i = 0; i <= 110; i++) {
      const p = { x: s.x, z: s.startZ + (s.direction * s.run * i) / 110 };
      const h = surfaceHeight(p, [], y + 0.2);
      assert(Math.abs(h - (s.rise * i) / 110) < 0.03);
      assert(!blocked(p, [], h));
      assert(ceilingHeight(p, [], h) > h + 1.9);
      y = h;
    }
    assert.equal(y, 3.2);
  }
  for (const t of JAIL_TOWERS) assert.equal(surfaceHeight(t, [], 3.3), 3.2);
});
test("six distinct new buildings, appended crates and roadside trash preserve old saves", async () => {
  resetDoors();
  assert.equal(BUILDINGS.length, 19);
  assert.equal(LOOT.length, 65);
  assert.equal(LOOT.filter((l) => l.kind === "trash").length, 23);
  assert.equal(LOOT[26].x, 104);
  assert.equal(LOOT[27].x, 69);
  for (const [i, b] of BUILDINGS.entries()) {
    if (i < 13) continue;
    assert(b.x < -125);
    const bytes = await readFile(
      `apps/client/src/fps/models/buildings/${b.type}.glb`,
    );
    const g = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
    );
    assert(g.scene.getObjectByName(b.type + "-door-hinge"));
    assert(
      LOOT.some(
        (l) =>
          Math.abs(l.x - b.x) < b.width / 2 &&
          Math.abs(l.z - b.z) < b.depth / 2,
      ),
    );
    if (b.type === "district-offices") assert.equal(buildingStories(b), 3);
  }
  for (const l of LOOT) {
    assert(Number.isFinite(l.x) && Number.isFinite(l.z));
    assert(!buildingBlocked(l));
    if (l.kind === "trash")
      assert(lootReward(l) > 0 && lootReward(l) < lootReward(LOOT[0]));
  }
  const save = {
    version: 1,
    wood: 1234,
    pieces: [{ id: "old", kind: "floor", rotation: 0, x: -90, z: 4 }],
    opened: [0, 13, 26, 27],
  };
  assert.deepEqual(readSave(JSON.stringify(save)), save);
});
test("new western connector detours around existing houses without moving their coordinates", () => {
  const piece = {
    id: "old",
    kind: "floor" as const,
    rotation: 0,
    x: -90,
    z: 2,
  };
  const road = westConnector([piece]);
  assert(road.length >= 3);
  for (let j = 1; j < road.length; j++) {
    const a = road[j - 1],
      b = road[j];
    for (let i = 0; i <= 100; i++) {
      const p = {
        x: a.x + ((b.x - a.x) * i) / 100,
        z: a.z + ((b.z - a.z) * i) / 100,
      };
      assert(Math.abs(p.x - piece.x) > 5.9 || Math.abs(p.z - piece.z) > 5.9);
    }
  }
  assert.equal(piece.x, -90);
});

test("three original bin models match physical bounds and prison artwork has no solid gate panel", async () => {
  const THREE = await import("three");
  for (const [kind, w, d, h] of [
    ["metal", 0.6, 0.6, 0.95],
    ["wheelie", 0.65, 0.7, 1.1],
    ["litter", 0.65, 0.65, 1],
  ] as const) {
    const b = await readFile(
      `apps/client/src/fps/models/street/bin-${kind}.glb`,
    );
    const g = await new GLTFLoader().parseAsync(
      b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
      "",
    );
    const bounds = new THREE.Box3().setFromObject(g.scene),
      size = bounds.getSize(new THREE.Vector3());
    assert(
      size.x <= w + 0.01 && size.z <= d + 0.01 && size.y <= h + 0.01,
      kind,
    );
    assert(bounds.min.y >= -0.01);
  }
  const b = await readFile(
    "apps/client/src/fps/models/street/jail-grounds.glb",
  );
  const g = await new GLTFLoader().parseAsync(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
    "",
  );
  g.scene.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(0, 1.6, 14),
    new THREE.Vector3(0, 0, -1),
    0,
    5,
  );
  assert.equal(ray.intersectObject(g.scene, true).length, 0);
});

test("resolved western connector has room for sidewalks beside every building", () => {
  configureWestRoad([]);
  assert.equal(ROADS.length, 5);
  for (const b of BUILDINGS)
    for (const x of [-b.width / 2, b.width / 2])
      for (const z of [-b.depth / 2, b.depth / 2])
        assert(pavedRoadDistance({ x: b.x + x, z: b.z + z }) > 0, b.name);
});

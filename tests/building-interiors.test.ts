import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  BUILDINGS,
  fixtures,
  frontOf,
  doorAngles,
  doorTargets,
  doorBlocksPoint,
  animateDoors,
  toggleDoor,
  resetDoors,
  buildingBlocked,
  containingBuilding,
} from "../apps/client/src/fps/building-layout.js";
import { movePlayer } from "../apps/client/src/fps/world.js";
import { createBuildingModel } from "../apps/client/src/fps/building-models.js";
test("every building has an entry blocked by its closed door and a clear passage when opened", () => {
  resetDoors();
  for (let i = 0; i < BUILDINGS.length; i++) {
    const b = BUILDINGS[i],
      front = frontOf(b),
      entry = { x: b.x, z: b.z + (front * b.depth) / 2 };
    assert(buildingBlocked(entry));
    toggleDoor(i);
    for (let t = 0; t < 12; t++) animateDoors(0.05, []);
    assert(Math.abs(doorAngles[i] - (front * Math.PI) / 2) < 0.001);
    assert(!buildingBlocked(entry), b.name);
    const start = { x: b.x, z: entry.z + front * 1.2 };
    const result = movePlayer(start, 0, -front * 2.5, []);
    assert.equal(containingBuilding(result), i, b.name);
    assert(buildingBlocked({ x: b.x + b.width / 2, z: b.z }), b.name);
  }
  resetDoors();
});
test("doors block at the same oriented pose as their rendered hinge and never swing through a player", () => {
  resetDoors();
  const b = BUILDINGS[1],
    p = { x: b.x, z: b.z + b.depth / 2 };
  assert(doorBlocksPoint(1, p, 0));
  assert(!doorBlocksPoint(1, p, Math.PI / 2));
  assert(doorBlocksPoint(1, { x: b.x - 0.8, z: p.z - 0.8 }, Math.PI / 2));
  toggleDoor(1);
  const occupant = { x: b.x + 0.1, z: p.z - 0.4 };
  for (let t = 0; t < 15; t++) animateDoors(0.05, [occupant]);
  assert(doorAngles[1] < Math.PI / 2);
  assert(!doorBlocksPoint(1, occupant));
  for (let t = 0; t < 15; t++) animateDoors(0.05, []);
  assert(Math.abs(doorAngles[1] - Math.PI / 2) < 0.001);
  assert(doorTargets[1]);
  resetDoors();
});
test("each building has purpose-specific furniture kept within its walls and clear of the doorway approach", () => {
  const kinds = new Set<string>();
  for (let i = 0; i < BUILDINGS.length; i++) {
    const b = BUILDINGS[i],
      front = frontOf(b);
    assert(fixtures(i).length >= 4);
    for (const f of fixtures(i)) {
      kinds.add(f.kind);
      assert(Math.abs(f.x) + f.width / 2 <= b.width / 2 - 0.1, b.name + f.kind);
      assert(Math.abs(f.z) + f.depth / 2 <= b.depth / 2 - 0.1, b.name + f.kind);
      assert(buildingBlocked({ x: b.x + f.x, z: b.z + f.z }));
    }
    doorAngles[i] = (front * Math.PI) / 2;
    for (let d = 0; d < 1.25; d += 0.2)
      assert(
        !buildingBlocked({ x: b.x, z: b.z + front * (b.depth / 2 - d) }),
        b.name,
      );
    resetDoors();
  }
  for (const kind of [
    "shelf",
    "counter",
    "bed",
    "workbench",
    "sofa",
    "kitchen",
    "rack",
    "pallet",
  ])
    assert(kinds.has(kind));
});
test("building geometry has hollow rooms, named animated doors, furniture and real windows without exceeding mesh triangle budgets", () => {
  for (let i = 0; i < BUILDINGS.length; i++) {
    const m = createBuildingModel(i);
    m.root.updateMatrixWorld(true);
    assert(m.root.getObjectByName("floor"));
    assert(m.root.getObjectByName("window-glass"));
    assert(m.root.getObjectByName("ceiling-light"));
    assert.equal(m.door.name, "door-hinge");
    assert(m.doorPanel.userData.dynamicDoor);
    const ray = new THREE.Raycaster(
      new THREE.Vector3(0, 1.6, 0),
      new THREE.Vector3(0, 1, 0),
      0,
      0.6,
    );
    assert.equal(
      ray.intersectObjects(m.root.children, true).length,
      0,
      "room center should not be a solid cuboid",
    );
    let triangles = 0;
    m.root.traverse((o) => {
      if (o instanceof THREE.Mesh)
        triangles +=
          (o.geometry.index?.count || o.geometry.attributes.position.count) / 3;
    });
    assert(triangles < 6000, BUILDINGS[i].name + ": " + triangles);
  }
});

test("all five reusable building GLBs load furnished rooms and both door animation clips", async () => {
  for (const building of BUILDINGS) {
    const bytes = await readFile(
      "art/models/buildings/" + building.type + ".glb",
    );
    const model = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
    );
    assert(model.scene.getObjectByName("door-hinge"));
    assert(model.scene.getObjectByName("floor"));
    assert(model.animations.some((clip) => clip.name === "open-door"));
    assert(model.animations.some((clip) => clip.name === "close-door"));
    assert(!new THREE.Box3().setFromObject(model.scene).isEmpty());
  }
});

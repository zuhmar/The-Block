import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as THREE from "three";
import {
  BUILDINGS,
  frontOf,
  resetDoors,
  toggleDoor,
  animateDoors,
  buildingBlocked,
} from "../apps/client/src/fps/building-layout";
import {
  LOOT,
  pavedRoadDistance,
  START,
  blocked,
  readSave,
} from "../apps/client/src/fps/world";
test("central jail, surrounding city and loot have clear road and walking envelopes", () => {
  const jail = BUILDINGS.find((b) => b.type === "jail")!;
  assert.equal(jail.x, 0);
  assert.equal(jail.z, 0);
  assert(!blocked(START, []));
  resetDoors();
  for (const b of BUILDINGS) {
    for (let x = -b.width / 2; x <= b.width / 2; x += 0.5)
      for (let z = -b.depth / 2; z <= b.depth / 2; z += 0.5)
        assert(
          pavedRoadDistance({ x: b.x + x, z: b.z + z }) > 0,
          `${b.name} overlaps street/sidewalk`,
        );
  }
  for (const l of LOOT) {
    if (l.kind === "trash") continue;
    assert(!buildingBlocked(l), `loot T${l.tier} intersects building`);
    for (const x of [-l.width / 2, l.width / 2])
      for (const z of [-l.depth / 2, l.depth / 2])
        assert(
          pavedRoadDistance({ x: l.x + x, z: l.z + z }) >= 0,
          `loot T${l.tier} overlaps pavement`,
        );
  }
  const i = BUILDINGS.indexOf(jail);
  toggleDoor(i);
  for (let t = 0; t < 15; t++) animateDoors(0.05, []);
  for (const z of [9, 7, 5, 2, 0, -2])
    assert(!buildingBlocked({ x: 0, z }), `jail central passage ${z}`);
  for (const x of [-5.3, 0, 5.3])
    for (const z of [0.5, -0.5, -2])
      assert(!buildingBlocked({ x, z }), `cell doorway ${x},${z}`);
  assert(buildingBlocked({ x: 2.65, z: -3 }), "cell divider collision");
  resetDoors();
  assert.equal(frontOf(jail), 1);
  const legacy = {
    version: 1,
    wood: 8765,
    pieces: [{ id: "saved-house", kind: "floor", x: 40, z: 40, rotation: 0 }],
    opened: [0, 4],
  };
  assert.deepEqual(readSave(JSON.stringify(legacy)), legacy);
});
test("jail GLB has hollow playable rooms, culled interior parts and a correctly aligned hinged door", async () => {
  const b = await readFile("apps/client/src/fps/models/buildings/jail.glb");
  assert(b.length < 1200000);
  const g = await new GLTFLoader().parseAsync(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
    "",
  );
  const hinge = g.scene.getObjectByName("jail-door-hinge")!;
  assert(hinge);
  g.scene.updateMatrixWorld(true);
  let triangles = 0,
    interior = 0;
  g.scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      triangles += o.geometry.index!.count / 3;
      if (o.userData.part === "interior") interior++;
    }
  });
  assert(interior > 0);
  assert(triangles < 16000);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(0, 1.6, 9),
    new THREE.Vector3(0, 0, -1),
    0,
    3,
  );
  assert(
    ray.intersectObject(g.scene, true).length > 0,
    "closed entrance blocks shot",
  );
  hinge.rotation.y = Math.PI / 2;
  g.scene.updateMatrixWorld(true);
  assert.equal(
    ray.intersectObject(g.scene, true).length,
    0,
    "open entrance clear",
  );
});

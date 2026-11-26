import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { configureCompactCity } from "../apps/client/src/fps/compact-city";
import {
  BUILDINGS,
  buildingBlocked,
  doorAngles,
  doorPosition,
  toggleDoor,
  animateDoors,
  resetDoors,
  containingBuilding,
  buildingCeiling,
} from "../apps/client/src/fps/building-layout";
import {
  martPlan,
  martState,
  martDoorPoint,
  martDoorBlocked,
} from "../apps/client/src/fps/block-mart-layout";
import { createMartProxy } from "../apps/client/src/fps/block-mart-view";
import { LOOT } from "../apps/client/src/fps/world";
test("Block Mart doors, chamfer, stockroom, aisles and loot share the authored layout", () => {
  const undo = configureCompactCity();
  resetDoors();
  try {
    const b = BUILDINGS[0],
      world = (x: number, z: number, y = 0) => ({ x: b.x + x, z: b.z + z, y });
    assert.equal(b.name, "BLOCK MART");
    assert.deepEqual(doorPosition(0), { x: b.x + 4, z: b.z + 4 });
    assert(buildingBlocked(world(4, 4)), "closed diagonal entrance");
    assert.equal(
      containingBuilding(world(4.7, 4.7)),
      -1,
      "cut corner is outdoors",
    );
    assert(!buildingBlocked(world(4.7, 4.7)), "no phantom square corner wall");
    toggleDoor(0);
    for (let i = 0; i < 20; i++) animateDoors(0.05, []);
    assert.equal(doorAngles[0], Math.PI / 2);
    for (let k = -1; k <= 1; k += 0.1)
      assert(
        !buildingBlocked(world(4 + k * 0.707, 4 + k * 0.707)),
        `diagonal entry ${k}`,
      );
    for (const [x, z] of [
      [0.9, 0],
      [3.4, 0],
      [-2, 0],
      [-3.1, -2.5],
    ])
      assert(!buildingBlocked(world(x, z)), `clear aisle ${x},${z}`);
    for (const [x, z] of [
      [-0.3, 0],
      [2.1, 0],
      [0.3, 3.6],
      [2, -4.4],
      [-1.2, -3],
      [5, 0],
      [0, 5],
    ])
      assert(
        buildingBlocked(world(x, z)),
        `solid fixture/window/wall ${x},${z}`,
      );
    for (const id of [1, 2]) {
      const s = martState(0),
        d = martPlan.doors[id];
      assert(buildingBlocked(world(...(d.center as [number, number]))));
      s.targets[id] = true;
      for (let i = 0; i < 20; i++) animateDoors(0.05, []);
      assert.equal(s.angles[id], Math.PI / 2);
      assert(
        !buildingBlocked(world(...(d.center as [number, number]))),
        `open ${d.id}`,
      );
    }
    const route = [
      [3.2, 3.2],
      [3.4, 1],
      [3.4, 1.95],
      [0.9, 1.95],
      [0.9, 1],
      [0.9, 1.95],
      [-2, 1.95],
      [-2, 0.4],
      [-3.1, -0.2],
      [-3.1, -2.3],
      [-3.1, -3.8],
      [-3.1, -6.2],
    ];
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1],
        b = route[i];
      for (let t = 0; t <= 1; t += 0.025)
        assert(
          !buildingBlocked(
            world(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t),
          ),
          `connected playable route ${i},${t}`,
        );
    }
    assert.equal(buildingCeiling(world(-2, 0), 0), 4.04);
    const loot = LOOT.find(
      (l) => Math.abs(l.x - b.x + 3.2) < 0.01 && Math.abs(l.z - b.z - 1) < 0.01,
    );
    assert(loot, "existing crate relocated to clear floor");
    assert(!buildingBlocked(loot));
    martState(0).targets[2] = false;
    const occupant = martDoorPoint(2, Math.PI / 2 - 0.05);
    animateDoors(0.01, [world(occupant.x, occupant.z)]);
    assert.equal(
      martState(0).angles[2],
      Math.PI / 2,
      "door does not close through occupant",
    );
    resetDoors();
    assert.deepEqual(martState(0).angles, [0, 0, 0]);
  } finally {
    resetDoors();
    undo();
  }
});
test("every door's shooting panel follows the same hinge as physical collision", () => {
  const proxy = createMartProxy(0),
    ray = new THREE.Raycaster();
  for (let id = 0; id < 3; id++)
    for (const angle of [0, Math.PI / 4, Math.PI / 2]) {
      proxy.hinges[id].rotation.y = angle;
      proxy.root.updateMatrixWorld(true);
      const p = martDoorPoint(id, angle),
        d = martPlan.doors[id],
        tx = d.tangent[0] * Math.cos(angle) + d.tangent[1] * Math.sin(angle),
        tz = d.tangent[1] * Math.cos(angle) - d.tangent[0] * Math.sin(angle);
      ray.set(
        new THREE.Vector3(p.x - tz * 0.5, 1, p.z + tx * 0.5),
        new THREE.Vector3(tz, 0, -tx),
      );
      ray.far = 1;
      const panel = proxy.hinges[id].children[0],
        hits = ray.intersectObject(panel);
      assert(hits.length, `${d.id} bullet cover at ${angle}`);
      assert(martDoorBlocked(id, { ...p, y: 0 }, angle));
      assert.equal(hits[0].object.userData.martDoorId, id);
    }
  proxy.root.updateMatrixWorld(true);
  ray.set(new THREE.Vector3(4.7, 10, 4.7), new THREE.Vector3(0, -1, 0));
  ray.far = 20;
  assert.equal(
    ray.intersectObject(proxy.root, true).length,
    0,
    "roof keeps chamfer",
  );
});
test("runtime building and reusable parts are exact Blender exports", async () => {
  for (const name of [
    "block-mart.glb",
    "block-mart-lod.glb",
    "layout.json",
    ...["retail-shelf", "checkout-counter", "stockroom-door"].map(
      (n) => `parts/${n}.glb`,
    ),
  ])
    assert.deepEqual(
      await readFile(`apps/client/src/fps/models/block-mart/${name}`),
      await readFile(`art/buildings/block-mart/${name}`),
    );
});

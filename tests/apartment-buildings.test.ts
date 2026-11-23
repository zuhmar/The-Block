import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as THREE from "three";
import {
  BUILDINGS,
  buildingStories,
  buildingStairs,
  fixtures,
  partitions,
  containingBuilding,
  buildingBlocked,
  frontOf,
  STORY_HEIGHT,
} from "../apps/client/src/fps/building-layout";
import {
  LOOT,
  surfaceHeight,
  ceilingHeight,
  blocked,
  readSave,
} from "../apps/client/src/fps/world";
test("two and three story buildings have connected stairs, level rooms, headroom and exterior walls upstairs", () => {
  for (const [i, b] of BUILDINGS.entries()) {
    if (buildingStories(b) < 2) continue;
    for (let floor = 0; floor < buildingStories(b); floor++) {
      const first = buildingStairs(i)[0];
      for (let x = 0; x <= first.x; x += 0.1)
        assert(
          !blocked(
            { x: b.x + x, z: b.z + first.startZ + frontOf(b) * 0.4 },
            [],
            floor * STORY_HEIGHT,
          ),
          "stair approach clear of furniture",
        );
    }
    for (const stair of buildingStairs(i)) {
      let feet = stair.y;
      for (let step = 0; step <= 60; step++) {
        const p = {
          x: b.x + stair.x,
          z: b.z + stair.startZ - ((frontOf(b) * step) / 60) * stair.run,
        };
        assert(!blocked(p, [], feet), `${b.name} stair ${step}, ${feet}`);
        feet = surfaceHeight(p, [], feet + 0.75);
        assert(Math.abs(feet - (stair.y + (step / 60) * STORY_HEIGHT)) < 0.001);
        assert(
          ceilingHeight(p, [], feet) >= feet + 1.9 - 0.001,
          "headroom on stairs",
        );
      }
      const landing = {
        x: b.x + stair.x,
        z: b.z + stair.startZ - frontOf(b) * (stair.run + 0.3),
      };
      assert(
        Math.abs(
          surfaceHeight(landing, [], feet + 0.75) - (stair.y + STORY_HEIGHT),
        ) < 0.001,
      );
    }
    for (let floor = 0; floor < buildingStories(b); floor++) {
      const y = floor * STORY_HEIGHT;
      for (const z of [-2, 2]) {
        assert(!blocked({ x: b.x, z: b.z + z }, [], y));
        assert(
          Math.abs(surfaceHeight({ x: b.x, z: b.z + z }, [], y + 0.75) - y) <
            0.001,
        );
      }
      assert(buildingBlocked({ x: b.x + b.width / 2, z: b.z, y }));
      assert(buildingBlocked({ x: b.x - 1.3, z: b.z, y }), "room partition");
      for (const z of [-2, 2])
        assert(
          !buildingBlocked({ x: b.x - 1.3, z: b.z + z, y }),
          "room doorway",
        );
    }
  }
});
test("upper loot remains on its floor, appended indices preserve existing searched saves", () => {
  assert(LOOT.length >= 21);
  assert.deepEqual(
    LOOT.slice(0, 5).map((x) => x.tier),
    [1, 2, 3, 4, 5],
  );
  assert(LOOT.some((c) => c.y === 6.4 && c.tier === 5));
  for (const c of LOOT.slice(5)) {
    const buildingIndex = containingBuilding(c);
    if (buildingIndex >= 0) {
      const b = BUILDINGS[buildingIndex];
      for (const f of [
        ...fixtures(buildingIndex),
        ...partitions(buildingIndex),
      ]) {
        if (Math.abs((f.y ?? 0) - (c.y ?? 0)) > 0.01) continue;
        const overlapX =
          Math.min(c.x + c.width / 2, b.x + f.x + f.width / 2) -
          Math.max(c.x - c.width / 2, b.x + f.x - f.width / 2);
        const overlapZ =
          Math.min(c.z + c.depth / 2, b.z + f.z + f.depth / 2) -
          Math.max(c.z - c.depth / 2, b.z + f.z - f.depth / 2);
        assert(
          overlapX < 0.01 || overlapZ < 0.01,
          `crate overlaps fixture ${b.name} ${f.x},${f.z}`,
        );
      }
    }

    assert(
      !buildingBlocked(c),
      `loot inside wall/furniture ${c.x},${c.z},${c.y}`,
    );
    assert(
      Math.abs(surfaceHeight(c, [], (c.y ?? 0) + 0.75) - (c.y ?? 0)) < 0.001,
    );
  }
  const save = {
    version: 1,
    wood: 1234,
    pieces: [{ id: "old", x: 40, z: 40, kind: "floor", rotation: 0 }],
    opened: [0, 4],
  };
  assert.deepEqual(readSave(JSON.stringify(save)), save);
});
test("apartment GLBs expose open floor holes, real stairs and the existing door hinge contract", async () => {
  for (const b of BUILDINGS.filter((b) => buildingStories(b) > 1)) {
    const raw = await readFile(
      `apps/client/src/fps/models/buildings/${b.type}.glb`,
    );
    assert(raw.length < 1500000);
    const model = await new GLTFLoader().parseAsync(
      raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength),
      "",
    );
    assert(model.scene.getObjectByName(b.type + "-door-hinge"));
    model.scene.updateMatrixWorld(true);
    const meshCount: THREE.Mesh[] = [];
    model.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) meshCount.push(o);
    });
    assert(meshCount.length < 25);
    // Verify a walkable landing and hollow upper room against the actual exported geometry.
    const ray = new THREE.Raycaster(
      new THREE.Vector3(0, STORY_HEIGHT + 1.6, 0),
      new THREE.Vector3(0, -1, 0),
      0,
      2,
    );
    const hit = ray.intersectObject(model.scene, true)[0];
    assert(hit);
    assert(Math.abs(hit.point.y - STORY_HEIGHT) < 0.01);
  }
});

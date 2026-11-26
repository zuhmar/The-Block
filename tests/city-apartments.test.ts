import { HARBOR_BOXES } from "../apps/client/src/fps/harbor-layout";
import { COMPOUND_BARRIERS } from "../apps/client/src/fps/military-compound";
import "./helpers/model-textures";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { configureCompactCity } from "../apps/client/src/fps/compact-city";
import {
  BUILDINGS,
  LOOT,
  blocked,
  surfaceHeight,
  ceilingHeight,
} from "../apps/client/src/fps/world";
import {
  buildingStairs,
  buildingSlabs,
  buildingBlocked,
  fixtures,
  partitions,
} from "../apps/client/src/fps/building-layout";
import {
  apartmentDoors,
  apartmentDoorState,
  apartmentDoorBlocked,
  animateApartmentDoors,
} from "../apps/client/src/fps/city-apartments-layout";
import { createBuildingShotProxy } from "../apps/client/src/fps/blender-buildings";

test("West Court appends six larger apartments without changing existing tenements or loot identities", () => {
  const originals = BUILDINGS.map((b) => ({ ...b })),
    oldLoot = LOOT.map((c) => ({ ...c }));
  const undo = configureCompactCity();
  try {
    const index = BUILDINGS.findIndex((b) => b.type === "city-apartments"),
      b = BUILDINGS[index];
    assert.equal(index, 36);
    assert.equal(b.width * b.depth, 288);
    for (const prop of [...HARBOR_BOXES, ...COMPOUND_BARRIERS])
      assert(
        Math.abs(b.x - prop.x) > (b.width + prop.width) / 2 + 1 ||
          Math.abs(b.z - prop.z) > (b.depth + prop.depth) / 2 + 1,
        "New apartments must not overlap existing harbor or military props",
      );
    assert.deepEqual(BUILDINGS[7], originals[7]);
    assert.deepEqual(BUILDINGS[30], {
      ...originals[7],
      x: -62,
      z: 102,
      name: "SOUTH TENEMENTS",
    });
    assert.equal(LOOT.slice(oldLoot.length + 10).length, 6);
    for (const c of LOOT.slice(oldLoot.length + 10)) {
      assert.equal(
        buildingBlocked(c),
        false,
        "crate clear of walls, doors and furniture",
      );
      assert.equal(surfaceHeight(c, [], (c.y ?? 0) + 0.75), c.y);
    }
    assert.equal(apartmentDoors.length, 7);
    assert.equal(fixtures(index).filter((f) => f.kind === "bed").length, 6);
  } finally {
    undo();
  }
  assert.deepEqual(BUILDINGS, originals);
  assert.deepEqual(LOOT, oldLoot);
});
test("three continuous stair flights reach a usable roof with headroom and solid parapets", () => {
  const undo = configureCompactCity();
  try {
    const index = 36,
      b = BUILDINGS[index];
    assert.equal(buildingStairs(index).length, 3);
    const point = (x: number, z: number) => ({ x: b.x + x, z: b.z + z });
    for (const stair of buildingStairs(index)) {
      let feet = stair.y;
      for (let n = 0; n <= 100; n++) {
        const p = point(stair.x, stair.startZ - (stair.run * n) / 100);
        assert.equal(blocked(p, [], feet), false, `stair ${stair.y} step ${n}`);
        feet = surfaceHeight(p, [], feet + 0.75);
        assert(Math.abs(feet - (stair.y + (3.2 * n) / 100)) < 0.001);
        assert(ceilingHeight(p, [], feet) >= feet + 1.9 - 0.001);
      }
      assert(
        Math.abs(
          surfaceHeight(point(stair.x, -5.15), [], feet + 0.75) -
            (stair.y + 3.2),
        ) < 0.001,
      );
    }
    const s = apartmentDoorState(index);
    s.angles[6] = -Math.PI / 2;
    for (let x = 7.65; x >= 4; x -= 0.05) {
      assert(!blocked(point(x, -5.15), [], 9.6));
      assert(Math.abs(surfaceHeight(point(x, -5.15), [], 10) - 9.6) < 0.001);
    }
    for (const [x, z] of [
      [-7, 6],
      [4, 6],
      [-7, -6],
      [4, -6],
    ]) {
      assert(!blocked(point(x, z), [], 9.6));
      assert(Math.abs(surfaceHeight(point(x, z), [], 10) - 9.6) < 0.001);
      assert.equal(ceilingHeight(point(x, z), [], 9.6), Infinity);
    }
    for (const [x, z] of [
      [-9, 0],
      [9, 0],
      [0, -8],
      [0, 8],
    ])
      assert(blocked(point(x, z), [], 9.6), "roof edge guarded");
    const shot = createBuildingShotProxy(index);
    shot.root.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(
      new THREE.Vector3(7.65, 9.7, 0),
      new THREE.Vector3(0, 1, 0),
    );
    const hit = ray.intersectObject(shot.root, true)[0];
    assert(
      hit && hit.point.y > 12,
      "roof hole is not sealed by shooting proxy",
    );
  } finally {
    undo();
  }
});
test("every apartment has an operable private doorway and a separate bedroom opening", () => {
  const undo = configureCompactCity();
  try {
    const index = 36,
      b = BUILDINGS[index],
      s = apartmentDoorState(index);
    apartmentDoors.forEach((d, id) => {
      const p = { x: d.x, z: d.z + 0.7, y: d.y };
      assert(apartmentDoorBlocked(index, id, p));
      s.targets[id] = true;
      for (let n = 0; n < 15; n++) animateApartmentDoors(index, 0.05, []);
      assert(Math.abs(s.angles[id] + Math.PI / 2) < 0.001);
      assert(!apartmentDoorBlocked(index, id, p));
      if (id < 6) {
        for (let x = 5.1; x >= -4.3; x -= 0.05)
          assert(
            !blocked({ x: b.x + x, z: b.z + p.z }, [], d.y),
            `${d.label} entrance/bedroom ${x}`,
          );
        assert(
          blocked({ x: b.x - 3, z: b.z + p.z + 1.3 }, [], d.y),
          "bedroom wall beside opening",
        );
      }
    });
    s.targets[0] = false;
    const occupied = { x: 3.8, z: -4, y: 0 };
    for (let n = 0; n < 15; n++) animateApartmentDoors(index, 0.05, [occupied]);
    assert(
      !apartmentDoorBlocked(index, 0, occupied),
      "door cannot close into an occupant",
    );
    assert(partitions(index).length > 20);
  } finally {
    undo();
  }
});
async function load(path: string) {
  const bytes = readFileSync(path);
  return new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
}
test("Blender prefab uses the same enlarged layout and exports real door openings and a light exterior LOD", async () => {
  const undo = configureCompactCity();
  try {
    const layout = JSON.parse(
      readFileSync(
        "apps/client/src/fps/models/city-apartments/layout.json",
        "utf8",
      ),
    );
    assert.deepEqual(layout.stairs, buildingStairs(36));
    assert.deepEqual(layout.slabs, buildingSlabs(36));
    assert.deepEqual(layout.partitions, partitions(36));
    const full = await load(
        "apps/client/src/fps/models/city-apartments/city-apartments.glb",
      ),
      low = await load(
        "apps/client/src/fps/models/city-apartments/city-apartments-lod.glb",
      );
    for (const gltf of [full, low])
      gltf.scene.traverse((o) =>
        assert(
          Math.max(...o.scale.toArray().map((v) => Math.abs(v - 1))) < 0.00001,
          "unit-scale geometry",
        ),
      );
    for (let id = 0; id < 7; id++)
      assert(full.scene.getObjectByName("apartment-door-" + id));
    full.scene.updateMatrixWorld(true);
    for (const [name, z] of [
      ["101", -4],
      ["102", 3],
    ] as const) {
      const number = full.scene.getObjectByName(name);
      assert(number);
      let readable = false;
      for (const dy of [0.035, 0.06, 0.085])
        for (const dz of [-0.07, -0.035, 0, 0.035, 0.07]) {
          const labelRay = new THREE.Raycaster(
            new THREE.Vector3(5, 2.04 + dy, z + dz),
            new THREE.Vector3(-1, 0, 0),
          );
          readable ||= labelRay.intersectObject(number, true).length > 0;
        }
      assert(readable, "Unit numbers face the shared hallway");
    }

    const ray = new THREE.Raycaster(
      new THREE.Vector3(7.65, 9.7, 0),
      new THREE.Vector3(0, 1, 0),
    );
    const hit = ray.intersectObject(full.scene, true)[0];
    assert(hit && hit.point.y > 12, "rendered roof hole remains open");
    assert(
      readFileSync(
        "apps/client/src/fps/models/city-apartments/city-apartments-lod.glb",
      ).length < 1800000,
    );
  } finally {
    undo();
  }
});

import "./helpers/model-textures";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  configureCompactCity,
  cityPlotClear,
} from "../apps/client/src/fps/compact-city";
import { CITY_FRONTAGES } from "../apps/client/src/fps/building-frontage";
import { CITY_PLOTS } from "../apps/client/src/fps/compact-plan";
import {
  BUILDINGS,
  movePlayer,
  blocked,
  surfaceHeight,
} from "../apps/client/src/fps/world";
import {
  buildingWorld,
  buildingYaw,
  buildingStairs,
  frontOf,
  doorAngles,
  containingBuilding,
} from "../apps/client/src/fps/building-layout";
import { createBuildingShotProxy } from "../apps/client/src/fps/blender-buildings";
import { orientBuildingRoots } from "../apps/client/src/fps/building-orientation-view";

test("every public city entrance faces a road with a continuous walk outside housing plots", () => {
  const undo = configureCompactCity();
  try {
    const publicIndices = BUILDINGS.flatMap((b, i) =>
      b.type === "jail" ||
      b.type.startsWith("north-") ||
      b.type.startsWith("military-")
        ? []
        : [i],
    );
    assert.equal(CITY_FRONTAGES.length, publicIndices.length);
    assert.ok(CITY_PLOTS.every(cityPlotClear));
    for (const f of CITY_FRONTAGES) {
      const dx = (f.street.x - f.door.x) / f.distance,
        dz = (f.street.z - f.door.z) / f.distance;
      const target = { x: f.door.x + dx * 0.7, z: f.door.z + dz * 0.7 };
      const end = movePlayer(
        f.street,
        target.x - f.street.x,
        target.z - f.street.z,
        [],
      );
      assert.ok(
        Math.hypot(end.x - target.x, end.z - target.z) < 0.001,
        BUILDINGS[f.index].name + " street walk",
      );
    }
  } finally {
    undo();
  }
});

test("a rotated tenement keeps operable door collision and continuous stairs in world coordinates", () => {
  const undo = configureCompactCity();
  try {
    const i = 7,
      b = BUILDINGS[i];
    assert.ok(Math.abs(buildingYaw(b)) > 1);
    const outer = buildingWorld(b, {
        x: 0,
        z: frontOf(b) * (b.depth / 2 + 0.8),
      }),
      inner = buildingWorld(b, { x: 0, z: frontOf(b) * (b.depth / 2 - 0.8) });
    assert.ok(
      Math.hypot(
        movePlayer(outer, inner.x - outer.x, inner.z - outer.z, []).x - inner.x,
        movePlayer(outer, inner.x - outer.x, inner.z - outer.z, []).z - inner.z,
      ) > 0.2,
    );
    doorAngles[i] = (frontOf(b) * Math.PI) / 2;
    const entered = movePlayer(outer, inner.x - outer.x, inner.z - outer.z, []);
    assert.ok(Math.hypot(entered.x - inner.x, entered.z - inner.z) < 0.001);
    assert.equal(containingBuilding(inner), i);
    for (const stair of buildingStairs(i))
      for (let n = 0; n <= 80; n++) {
        const p = buildingWorld(b, {
            x: stair.x,
            z: stair.startZ - (frontOf(b) * stair.run * n) / 80,
          }),
          y = stair.y + (3.2 * n) / 80;
        assert.equal(blocked(p, [], y), false);
        assert.ok(Math.abs(surfaceHeight(p, [], y + 0.01) - y) < 0.001);
      }
  } finally {
    doorAngles[7] = 0;
    undo();
  }
});

test("rendered Blender doorway, shooting proxy and physical entrance rotate together", async () => {
  const bytes = readFileSync(
    "apps/client/src/fps/models/tenement-v2/tenement.glb",
  );
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  const undo = configureCompactCity();
  try {
    const i = 7,
      b = BUILDINGS[i],
      shot = createBuildingShotProxy(i),
      roots = orientBuildingRoots(gltf.scene, shot.root, b);
    const hinge = gltf.scene.getObjectByName("tenement-door-hinge")!;
    assert.ok(hinge);
    const visual = hinge.getWorldPosition(new THREE.Vector3()),
      proxy = shot.door.getWorldPosition(new THREE.Vector3());
    assert.ok(Math.hypot(visual.x - proxy.x, visual.z - proxy.z) < 0.001);
    assert.equal(roots.root.rotation.y, buildingYaw(b));
    assert.deepEqual(roots.root.scale.toArray(), [1, 1, 1]);
  } finally {
    undo();
  }
});

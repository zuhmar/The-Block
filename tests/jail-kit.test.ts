import "./helpers/model-textures";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { configureCompactCity } from "../apps/client/src/fps/compact-city";
import {
  blocked,
  surfaceHeight,
  ceilingHeight,
} from "../apps/client/src/fps/world";
import {
  JAIL_STAIRS,
  JAIL_TOWERS,
  jailGate,
  jailGateNearby,
  animateJailGate,
} from "../apps/client/src/fps/jail-ground-layout";
async function load(path: string) {
  const bytes = await readFile(path);
  return new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
}
test("compound gates block, open from the courtyard, and stop before closing through players", () => {
  const undo = configureCompactCity();
  jailGate.angle = 0;
  jailGate.open = false;
  try {
    assert(blocked({ x: 0, z: -107 }, []));
    assert(blocked({ x: 7, z: -107 }, []));
    assert(jailGateNearby({ x: 0, z: -109 }));
    jailGate.open = true;
    for (let i = 0; i < 40; i++) animateJailGate(0.05, [{ x: 0, z: -109 }]);
    assert.equal(jailGate.angle, -Math.PI / 2);
    for (let z = -110; z <= -74; z += 0.2)
      assert(!blocked({ x: 0, z }, []), "release/bridge route " + z);
    jailGate.open = false;
    for (let i = 0; i < 60; i++) {
      animateJailGate(0.05, [{ x: 0, z: -107 }]);
      assert(
        !blocked({ x: 0, z: -107 }, []),
        "closing gate must not penetrate player",
      );
    }
    assert(jailGate.angle < 0);
  } finally {
    jailGate.angle = 0;
    jailGate.open = false;
    undo();
  }
});
test("all four island towers have continuous safe stair access; courtyard and gatehouse are walkable", () => {
  const undo = configureCompactCity();
  try {
    for (const stair of JAIL_STAIRS) {
      let feet = 0;
      for (let i = 0; i <= 110; i++) {
        const p = {
          x: stair.x,
          z: stair.startZ + (stair.direction * stair.run * i) / 110,
        };
        feet = surfaceHeight(p, [], feet + 0.2);
        assert(Math.abs(feet - (stair.rise * i) / 110) < 0.03);
        assert(!blocked(p, [], feet), JSON.stringify(p));
        assert(ceilingHeight(p, [], feet) > feet + 1.9);
      }
    }
    for (const t of JAIL_TOWERS) assert.equal(surfaceHeight(t, [], 3.3), 3.2);
    for (let z = -116; z <= -109; z += 0.25) assert(!blocked({ x: 0, z }, []));
    for (let z = -111; z <= -109; z += 0.1)
      assert(!blocked({ x: -7, z }, []), "gatehouse entry");
    assert(blocked({ x: -8.5, z: -109 }, []), "gatehouse walls block");
    assert(
      ceilingHeight({ x: -7, z: -109 }, [], 0) < 2.9,
      "gatehouse roof stops jumps",
    );
    assert.equal(
      surfaceHeight({ x: -10, z: -113 }, [], 1),
      0.9,
      "courtyard benches support standing",
    );
  } finally {
    undo();
  }
});
test("prepared Meshy jail kit embeds textures, has independent gate hinges, and keeps the open exit clear", async () => {
  const dir = "apps/client/src/fps/models/jail-kit/";
  assert.equal(
    (await readdir(dir)).filter((p) => p.endsWith(".glb")).length,
    18,
  );
  const report = JSON.parse(
    await readFile(
      "art/building-kits/jail-meshy/integration-report.json",
      "utf8",
    ),
  );
  assert.equal(Object.keys(report.sources).length, 18);
  const grounds = await load(
    "apps/client/src/fps/models/street/jail-meshy-grounds.glb",
  );
  const main = grounds.scene.getObjectByName("jail-vehicle-hinge")!,
    ped = grounds.scene.getObjectByName("jail-pedestrian-hinge")!;
  assert(main && ped);
  assert(Math.abs(main.position.x + 2) < 0.001);
  main.rotation.y = ped.rotation.y = -Math.PI / 2;
  const barrier = grounds.scene.getObjectByName("jail-barrier-hinge")!;
  assert(barrier);
  barrier.rotation.z = (Math.PI / 2) * Number(barrier.userData.raiseDirection);
  grounds.scene.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(0, 1.6, 15),
    new THREE.Vector3(0, 0, 1),
    0,
    7,
  );
  assert.equal(
    ray.intersectObject(grounds.scene, true).length,
    0,
    "open compound exit must be visibly clear",
  );
  let faces = 0;
  grounds.scene.traverse((o) => {
    if (o instanceof THREE.Mesh)
      faces +=
        (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
  });
  assert(faces < 125000, "phone geometry budget");
  const fence = await load(dir + "fence-straight.glb");
  // A ray inside a diamond opening must cross the panel without hitting opaque infill.
  let gaps = 0;
  for (let x = -1.5; x <= 1.5; x += 0.17) {
    const r = new THREE.Raycaster(
      new THREE.Vector3(x, 0.8, 1),
      new THREE.Vector3(0, 0, -1),
      0,
      2,
    );
    fence.scene.updateMatrixWorld(true);
    if (!r.intersectObject(fence.scene, true).length) gaps++;
  }
  assert(gaps > 8, "chain link has real open gaps");
});

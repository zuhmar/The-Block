import "./helpers/model-textures";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  BUILDINGS,
  buildingStories,
  buildingStairs,
  buildingSlabs,
  fixtures,
  partitions,
} from "../apps/client/src/fps/building-layout";
import { createBuildingShotProxy } from "../apps/client/src/fps/blender-buildings";
const root = "art/buildings/apartments/tenement-v2",
  runtime = "apps/client/src/fps/models/tenement-v2";
async function load(name: string) {
  const b = await readFile(`${runtime}/${name}.glb`);
  return new GLTFLoader().parseAsync(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
    "",
  );
}
test("three-story tenement uses the new concept, real recessed glazing and a lighter distance model", async () => {
  const full = await load("tenement"),
    low = await load("tenement-lod"),
    sha = createHash("sha256")
      .update(await readFile(`${root}/references/concept.png`))
      .digest("hex");
  let fullCount = 0,
    lowCount = 0,
    branded = false;
  const floors = new Set<number>();
  full.scene.updateMatrixWorld(true);
  full.scene.traverse((o) => {
    branded ||=
      o.userData.referenceSha256 === sha &&
      o.userData.assetVersion === "tenement-v2";
    assert(
      o
        .getWorldScale(new THREE.Vector3())
        .distanceTo(new THREE.Vector3(1, 1, 1)) < 0.0001,
    );
    if (o instanceof THREE.Mesh) {
      fullCount +=
        (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
      if (o.userData.part === "interior") floors.add(o.userData.floor);
    }
  });
  low.scene.traverse((o) => {
    if (o instanceof THREE.Mesh)
      lowCount +=
        (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
  });
  assert(branded);
  assert.deepEqual([...floors].sort(), [0, 1, 2]);
  assert(fullCount < 80_000);
  assert(lowCount < 18_000 && lowCount < fullCount * 0.35);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(-3.7, 1.8, 6),
    new THREE.Vector3(0, 0, -1),
  );
  const hit = ray.intersectObject(full.scene, true)[0];
  assert(hit);
  assert.equal(
    (hit.object as THREE.Mesh<THREE.BufferGeometry, THREE.Material>).material
      .name,
    "apt-glass",
    "window is a glazed wall opening, not a decal on a solid box",
  );
  assert((await readFile(`${runtime}/tenement-lod.glb`)).length < 1_600_000);
});
test("the new apartment preserves shared room, stair, slab and furniture coordinates", async () => {
  const d = JSON.parse(await readFile(`${root}/layout.json`, "utf8")),
    index = BUILDINGS.findIndex((b) => b.type === "tenement");
  assert.equal(d.stories, buildingStories(BUILDINGS[index]));
  assert.deepEqual(d.stairs, buildingStairs(index));
  assert.deepEqual(d.slabs, buildingSlabs(index));
  assert.deepEqual(d.fixtures, fixtures(index));
  assert.deepEqual(d.partitions, partitions(index));
  assert.equal(d.stairs.length, 2);
  assert.deepEqual(
    d.stairs.map((s: { y: number }) => s.y),
    [0, 3.2],
  );
  const proxy = createBuildingShotProxy(index);
  proxy.root.updateMatrixWorld(true);
  const s = d.stairs[0];
  const ray = new THREE.Raycaster(
    new THREE.Vector3(s.x, 1.8, s.startZ - 1.9),
    new THREE.Vector3(0, 1, 0),
  );
  const hit = ray.intersectObject(proxy.root, true)[0];
  assert(
    hit && hit.point.y > 3.9,
    "no fictitious ceiling closes the first stairwell opening",
  );
});
test("full and distant apartment door clips retain the actual interaction hinge", async () => {
  for (const name of ["tenement", "tenement-lod"]) {
    const asset = await load(name),
      hinge = asset.scene.getObjectByName("tenement-door-hinge");
    assert(hinge);
    assert(Math.abs(hinge.rotation.y) < 0.001);
    for (const label of ["open", "close"]) {
      const clip = asset.animations.find(
        (c) => c.name === `tenement-door-${label}`,
      );
      assert(clip);
      const mixer = new THREE.AnimationMixer(asset.scene);
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
      mixer.update(0.5);
      assert(hinge.rotation.y > 0.6 && hinge.rotation.y < 1.0);
      mixer.stopAllAction();
    }
  }
});

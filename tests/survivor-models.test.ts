import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  createSurvivor,
  OUTFITS,
} from "../apps/client/src/fps/survivor-models.js";

test("all approved survivors share a featureless spherical black base, limb pivots and a bounded render budget", () => {
  for (const outfit of OUTFITS) {
    const actor = createSurvivor(outfit),
      bounds = new THREE.Box3().setFromObject(actor.root);
    assert(bounds.min.y >= -0.01 && bounds.max.y < 2.1);
    const head = actor.root.getObjectByName(
      "featureless-black-head",
    ) as THREE.Mesh;
    assert(head.geometry instanceof THREE.SphereGeometry);
    assert.equal(
      (head.material as THREE.MeshStandardMaterial).color.getHex(),
      0x090b10,
    );
    assert.equal(actor.arms.length, 2);
    assert.equal(actor.legs.length, 2);
    let calls = 0,
      triangles = 0;
    actor.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        calls++;
        triangles +=
          (o.geometry.index?.count || o.geometry.attributes.position.count) / 3;
      }
    });
    const budget = outfit === "base" ? 10000 : 24000;
    assert(
      calls < 65 && triangles < budget,
      `${outfit}: ${calls} calls, ${triangles} triangles`,
    );
    console.log(outfit, calls, triangles);
  }
});
test("equipment slots reveal the base independently and follow articulated arms and legs", () => {
  for (const outfit of OUTFITS.slice(1)) {
    const actor = createSurvivor(outfit);
    for (const slot of ["headwear", "torso", "legs", "footwear"] as const) {
      assert(actor.slots[slot].length > 0);
      actor.setSlot(slot, false);
      assert(actor.slots[slot].every((g) => !g.visible));
      assert(actor.head.visible && actor.torso.visible);
      actor.setSlot(slot, true);
      assert(actor.slots[slot].every((g) => g.visible));
    }
    assert(actor.slots.torso.some((g) => g.parent === actor.arms[0]));
    assert(actor.slots.footwear.some((g) => g.parent === actor.legs[0]));
    actor.root.updateMatrixWorld(true);
    const shoe = actor.slots.footwear[0],
      before = new THREE.Box3()
        .setFromObject(shoe)
        .getCenter(new THREE.Vector3());
    actor.legs[0].rotation.x = 0.5;
    actor.root.updateMatrixWorld(true);
    // The footwear mesh follows its leg instead of remaining at the rest pose.
    assert.equal(shoe.parent, actor.legs[0]);
    assert(
      before.distanceTo(
        new THREE.Box3().setFromObject(shoe).getCenter(new THREE.Vector3()),
      ) > 0.1,
    );
  }
});
test("military helmet exposes the face while armored helmet closes the entire face", () => {
  const ray = new THREE.Raycaster(
    new THREE.Vector3(0, 1.58, -1),
    new THREE.Vector3(0, 0, 1),
  );
  const open = createSurvivor("reinforced"),
    closed = createSurvivor("armored");
  for (const actor of [open, closed]) actor.root.updateMatrixWorld(true);
  assert.equal(ray.intersectObjects(open.slots.headwear, true).length, 0);
  assert(ray.intersectObjects(closed.slots.headwear, true).length > 0);
  closed.setSlot("headwear", false);
  assert(closed.head.getObjectByName("featureless-black-head"));
});
test("all four GLB survivors roundtrip with walk animation and separable clothing nodes", async () => {
  for (const outfit of OUTFITS) {
    const bytes = await readFile(`art/models/survivor-${outfit}.glb`);
    const imported = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
    );
    assert(imported.animations.some((a) => a.name === "walk"));
    assert(imported.scene.getObjectByName("featureless-black-head"));
    if (outfit !== "base")
      for (const slot of ["headwear", "torso", "legs", "footwear"])
        assert(imported.scene.getObjectByName(`${outfit}-${slot}`));
  }
});

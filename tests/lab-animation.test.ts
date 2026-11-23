import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { prepareLabNpc } from "../apps/client/src/fps/lab-npc-image";
import { LAB_MODELS } from "../apps/client/src/fps/lab-enemies";
test("Blender lab rigs have weighted skins, independent mixers and hand-following guns through combat and revival", async () => {
  Object.defineProperty(globalThis, "self", {
    value: globalThis,
    configurable: true,
  });
  Object.defineProperty(globalThis, "createImageBitmap", {
    value: async () => ({ width: 1024, height: 1024, close() {} }),
    configurable: true,
  });
  for (const kind of LAB_MODELS) {
    const bytes = await readFile(
      `apps/client/src/fps/models/north-lab-npcs/${kind}.glb`,
    );
    assert.ok(bytes.length < 1500000);
    const gltf = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length),
      "",
    );
    assert.deepEqual(gltf.animations.map((a) => a.name).sort(), [
      "Aim",
      "Death",
      "Fire",
      "Hit",
      "Idle",
      "Reload",
      "Run",
      "Walk",
    ]);
    let skin: THREE.SkinnedMesh | undefined;
    gltf.scene.traverse((o) => {
      if (o instanceof THREE.SkinnedMesh) skin = o;
    });
    assert.ok(skin);
    assert.equal(skin.skeleton.bones.length, 22);
    const weights = skin.geometry.getAttribute("skinWeight");
    for (let i = 0; i < weights.count; i++)
      assert.ok(
        Math.abs(
          weights.getX(i) +
            weights.getY(i) +
            weights.getZ(i) +
            weights.getW(i) -
            1,
        ) < 0.001,
      );
    const actor = new THREE.Group(),
      rig = prepareLabNpc(gltf.scene, gltf.animations),
      other = prepareLabNpc(clone(gltf.scene) as THREE.Group, gltf.animations);
    actor.add(rig.root);
    const gun = new THREE.Group();
    rig.attachWeapon(gun);
    assert.equal(gun.parent?.name, "LabRightHand");
    const local = gun.position.clone();
    rig.animate(true, 0.2, true);
    assert.equal(other.mixer.time, 0);
    rig.animate(true, 0.2, false, { reloading: true });
    assert.match(rig.root.userData.labAnimation, /Reload/);
    assert.ok(gun.position.distanceTo(local) < 1e-6);
    rig.animate(false, 0.2, false, { down: true });
    assert.equal(rig.root.userData.labAnimation, "Death");
    rig.animate(false, 0.1);
    assert.match(rig.root.userData.labAnimation, /Aim/);
  }
});

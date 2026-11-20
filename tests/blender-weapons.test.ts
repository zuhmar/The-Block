import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as THREE from "three";
test("Blender weapon exports keep forward muzzle, separate recoil parts, distinct silhouettes and bounded geometry", async () => {
  const lengths: number[] = [];
  for (const kind of ["pistol", "smg", "rifle", "sniper"]) {
    const b = await readFile(`apps/client/src/fps/models/weapons/${kind}.glb`);
    const g = await new GLTFLoader().parseAsync(
      b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
      "",
    );
    const bounds = new THREE.Box3().setFromObject(g.scene);
    g.scene.updateMatrixWorld(true);
    const muzzle = g.scene.getObjectByName(kind + "-muzzle");
    assert(muzzle);
    assert(
      muzzle.getWorldPosition(new THREE.Vector3()).z <= bounds.min.z + 0.02,
    );
    let tris = 0,
      parts = 0,
      moving = false;
    g.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        parts++;
        tris +=
          (o.geometry.index?.count || o.geometry.attributes.position.count) / 3;
        moving ||= o.userData.weaponPart === "slide";
      }
    });
    assert(moving);
    assert(parts <= 9);
    assert(tris < 25000, `${kind}: ${tris}`);
    lengths.push(bounds.max.z - bounds.min.z);
  }
  assert(lengths.every((n, i) => i === 0 || n > lengths[i - 1]));
});

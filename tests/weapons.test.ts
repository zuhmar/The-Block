import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { readFile } from "node:fs/promises";
import {
  createWeapon,
  createFirstPersonRig,
} from "../apps/client/src/fps/actor-models.js";
import {
  WEAPONS,
  canShoot,
  type WeaponKind,
} from "../apps/client/src/fps/weapons.js";
test("SMG, assault rifle and sniper have distinct cadence, range, damage and zoom", () => {
  assert(
    WEAPONS.smg.interval < WEAPONS.rifle.interval &&
      WEAPONS.rifle.interval < WEAPONS.sniper.interval,
  );
  assert(
    WEAPONS.smg.range < WEAPONS.rifle.range &&
      WEAPONS.rifle.range < WEAPONS.sniper.range,
  );
  assert(WEAPONS.sniper.damage >= 75);
  assert(WEAPONS.sniper.zoom < WEAPONS.rifle.zoom);
  for (const kind of ["smg", "rifle", "sniper"] as WeaponKind[]) {
    assert(!canShoot(kind, WEAPONS[kind].interval - 1, 0));
    assert(canShoot(kind, WEAPONS[kind].interval, 0));
  }
});
test("three original weapon meshes have increasing lengths, named moving parts, forward muzzles and bounded geometry", () => {
  let previous = 0;
  for (const kind of ["smg", "rifle", "sniper"] as WeaponKind[]) {
    const gun = createWeapon(kind),
      box = new THREE.Box3().setFromObject(gun.root),
      length = box.max.z - box.min.z;
    assert(length > previous);
    previous = length;
    assert(gun.muzzle.position.z < box.min.z);
    assert(gun.slide.name.includes("bolt"));
    let meshes = 0,
      triangles = 0;
    gun.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        meshes++;
        triangles +=
          (o.geometry.index?.count ||
            o.geometry.getAttribute("position").count) / 3;
      }
    });
    assert(
      meshes < 12 && triangles < 8000,
      JSON.stringify({ kind, meshes, triangles }),
    );
  }
});
test("every weapon remains inside the portrait muzzle frustum and animates its own bolt", () => {
  for (const kind of ["smg", "rifle", "sniper"] as WeaponKind[]) {
    const rig = createFirstPersonRig(kind),
      camera = new THREE.PerspectiveCamera(72, 390 / 844, 0.07, 150);
    camera.add(rig.root);
    rig.equip(true);
    rig.setAspect(camera.aspect);
    camera.updateMatrixWorld(true);
    const p = rig.gun.muzzle
      .getWorldPosition(new THREE.Vector3())
      .project(camera);
    assert(
      Math.abs(p.x) < 0.9 && Math.abs(p.y) < 0.9,
      JSON.stringify({ kind, p }),
    );
    rig.animate(0, false, 1);
    assert(rig.gun.slide.position.z > 0);
    rig.animate(1, false, 0);
    assert.equal(rig.gun.slide.position.z, 0);
  }
});
test("new weapon GLBs roundtrip through the loader with no external textures or buffers", async () => {
  for (const file of ["street-smg", "street-assault-rifle", "street-sniper"]) {
    const b = await readFile("art/models/" + file + ".glb");
    assert.equal(b.toString("utf8", 0, 4), "glTF");
    const gltf = await new GLTFLoader().parseAsync(
      b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
      "",
    );
    assert(!new THREE.Box3().setFromObject(gltf.scene).isEmpty());
    const data = JSON.parse(b.toString("utf8", 20, 20 + b.readUInt32LE(12)));
    assert(!data.images?.length);
    assert(data.buffers.every((entry: { uri?: string }) => !entry.uri));
  }
});

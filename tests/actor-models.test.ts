import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { readFile } from "node:fs/promises";
import {
  createStickPlayer,
  createPistol,
  createFirstPersonRig,
} from "../apps/client/src/fps/actor-models.js";
function metrics(root: THREE.Object3D) {
  let meshes = 0,
    triangles = 0;
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      meshes++;
      triangles +=
        (o.geometry.index?.count || o.geometry.getAttribute("position").count) /
        3;
    }
  });
  return { meshes, triangles };
}
test("rounded stick player has articulated limbs, a full-body silhouette and a weapon socket within a small geometry budget", () => {
  const p = createStickPlayer(),
    bounds = new THREE.Box3().setFromObject(p.root),
    m = metrics(p.root);
  assert(bounds.min.y >= -0.01);
  assert(bounds.max.y > 1.8 && bounds.max.y < 2);
  assert.equal(p.legs.length, 2);
  assert.equal(p.arms.length, 2);
  assert.equal(p.handSocket.name, "right-hand-socket");
  assert(m.meshes <= 10 && m.triangles < 4000, JSON.stringify(m));
  p.legs[0].rotation.x = 0.3;
  assert.notEqual(p.legs[0].quaternion.x, 0);
});
test("pistol has an independently movable slide, real open trigger-guard geometry and a forward muzzle socket", () => {
  const p = createPistol(),
    m = metrics(p.root),
    bounds = new THREE.Box3().setFromObject(p.root);
  assert(p.muzzle.position.z < bounds.min.z + 0.01);
  assert.equal(p.slide.name, "pistol-slide");
  assert(bounds.max.z - bounds.min.z > 0.2);
  assert(bounds.max.y - bounds.min.y > 0.16);
  assert(m.meshes < 10 && m.triangles < 5000, JSON.stringify(m));
});
test("equipping changes the hand pose, recoil moves the slide, and the tracer origin follows the animated muzzle", () => {
  const rig = createFirstPersonRig();
  assert(!rig.gun.root.visible);
  rig.equip(true);
  assert(rig.gun.root.visible);
  assert(!rig.root.getObjectByName("relaxed-hands")!.visible);
  rig.root.updateMatrixWorld(true);
  const before = rig.gun.muzzle.getWorldPosition(new THREE.Vector3());
  rig.animate(0, false, 1);
  rig.root.updateMatrixWorld(true);
  const after = rig.gun.muzzle.getWorldPosition(new THREE.Vector3());
  assert(rig.gun.slide.position.z > 0);
  assert(before.distanceTo(after) > 0.01);
  rig.animate(1, false, 0);
  assert.equal(rig.gun.slide.position.z, 0);
  rig.equip(false);
  assert(!rig.gun.root.visible);
  assert(rig.root.getObjectByName("relaxed-hands")!.visible);
});
test("reusable player and pistol exports are self-contained GLB 2 files with named model parts and a player walk animation", async () => {
  for (const name of ["black-stick-player", "street-pistol"]) {
    const buffer = await readFile("art/models/" + name + ".glb");
    assert.equal(buffer.toString("utf8", 0, 4), "glTF");
    assert.equal(buffer.readUInt32LE(4), 2);
    assert.equal(buffer.readUInt32LE(8), buffer.length);
    const json = JSON.parse(
      buffer.toString("utf8", 20, 20 + buffer.readUInt32LE(12)),
    );
    assert.equal(json.asset.version, "2.0");
    const bytes = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );
    const imported = await new GLTFLoader().parseAsync(bytes, "");
    const bounds = new THREE.Box3().setFromObject(imported.scene);
    assert(!bounds.isEmpty());
    if (name === "black-stick-player")
      assert(imported.animations.some((clip) => clip.name === "walk"));
    assert(json.meshes.length > 0);
    assert(json.buffers.every((b: { uri?: string }) => !b.uri));
    if (name === "black-stick-player") {
      assert(json.animations.some((a: { name: string }) => a.name === "walk"));
      assert(
        json.nodes.some(
          (n: { name: string }) => n.name === "right-hand-socket",
        ),
      );
    }
  }
});

test("portrait view keeps the pistol muzzle inside the camera frustum without breaking the gripping pose", () => {
  const rig = createFirstPersonRig(),
    camera = new THREE.PerspectiveCamera(72, 390 / 844, 0.07, 100);
  rig.setAspect(camera.aspect);
  rig.equip(true);
  camera.add(rig.root);
  camera.updateMatrixWorld(true);
  const point = rig.gun.muzzle
    .getWorldPosition(new THREE.Vector3())
    .project(camera);
  assert(
    Math.abs(point.x) < 0.9 && Math.abs(point.y) < 0.9,
    JSON.stringify(point),
  );
  const offset = rig.root.getObjectByName("pistol-hands")!.position.x;
  assert.equal(rig.gun.root.position.x - 0.18, offset);
});

test("both unarmed fists stay within the clear view on portrait and landscape screens", () => {
  for (const aspect of [390 / 844, 844 / 390, 1280 / 800]) {
    const rig = createFirstPersonRig();
    const camera = new THREE.PerspectiveCamera(72, aspect, 0.07, 100);
    camera.add(rig.root);
    rig.setAspect(aspect);
    for (const equipped of [true, false]) rig.equip(equipped);
    camera.updateMatrixWorld(true);
    const hands = rig.root.getObjectByName("relaxed-hands")!;
    assert(hands.visible);
    assert(!rig.gun.root.visible);
    for (const side of [-1, 1]) {
      const hand = rig.root.getObjectByName(
        side < 0 ? "unarmed-left" : "unarmed-right",
      )!;
      const fist = hand
        .localToWorld(new THREE.Vector3(side * 0.22, -0.29, -0.51))
        .project(camera);
      if (aspect < 0.8)
        assert(fist.y > -0.25, "Fists must clear phone controls");
      assert(
        Math.abs(fist.x) < 0.8 && fist.y > -0.7 && fist.y < -0.05,
        JSON.stringify({ aspect, fist }),
      );
    }
  }
});

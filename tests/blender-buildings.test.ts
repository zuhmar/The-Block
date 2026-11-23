import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as THREE from "three";
import { BUILDINGS, frontOf } from "../apps/client/src/fps/building-layout";
import { createBuildingShotProxy } from "../apps/client/src/fps/blender-buildings";
async function model(path: string) {
  const b = await readFile(path);
  return new GLTFLoader().parseAsync(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
    "",
  );
}
test("five fresh Blender buildings identify their reference and match the existing door pivot and dimensions", async () => {
  const refs = [
    "general-store",
    "the-haven",
    "workshop",
    "old-residence",
    "warehouse",
  ];
  for (const [i, b] of BUILDINGS.slice(0, refs.length).entries()) {
    const g = await model(`apps/client/src/fps/models/buildings/${b.type}.glb`);
    const sha = createHash("sha256")
      .update(await readFile(`art/buildings/references/${refs[i]}.png`))
      .digest("hex");
    const root = g.scene.getObjectByProperty("type", "Group");
    assert(root);
    let provenance = false,
      interior = 0,
      tris = 0,
      meshes = 0;
    g.scene.traverse((o) => {
      provenance ||= o.userData.referenceSha256 === sha;
      if (o instanceof THREE.Mesh) {
        meshes++;
        tris +=
          (o.geometry.index?.count || o.geometry.attributes.position.count) / 3;
        if (o.userData.part === "interior") interior++;
      }
    });
    assert(provenance);
    assert(interior >= 3);
    assert(tris < 40000, `${b.type}: ${tris}`);
    assert(meshes < 30);
    const wholeBounds = new THREE.Box3().setFromObject(g.scene),
      size = wholeBounds.getSize(new THREE.Vector3());
    assert(
      size.x < b.width + 0.81 && size.z < b.depth + 3,
      b.type + " footprint",
    );
    const door = g.scene.getObjectByName(b.type + "-door-hinge");
    assert(door);
    g.scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(door),
      center = bounds.getCenter(new THREE.Vector3());
    assert(Math.abs(door.position.x + 0.8) < 1e-5);
    assert(Math.abs(door.position.z - (frontOf(b) * b.depth) / 2) < 1e-5);
    assert(Math.abs(center.x) < 1e-5);
    assert(Math.abs(center.z - (frontOf(b) * b.depth) / 2) < 0.08);
    assert(Math.abs(bounds.getSize(new THREE.Vector3()).x - 1.6) < 1e-4);
    door.rotation.y = (frontOf(b) * Math.PI) / 2;
    g.scene.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(
      new THREE.Vector3(0, 1.4, frontOf(b) * (b.depth / 2 + 1)),
      new THREE.Vector3(0, 0, -frontOf(b)),
    );
    assert.equal(ray.intersectObject(door, true).length, 0);
  }
});
test("all 30 standalone props export without external images, terrain bases or oversized mesh budgets", async () => {
  const dir = "art/buildings/blender/props/",
    files = (await readdir(dir)).filter((f) => f.endsWith(".glb"));
  assert.equal(files.length, 30);
  for (const file of files) {
    const raw = await readFile(dir + file),
      j = JSON.parse(raw.toString("utf8", 20, 20 + raw.readUInt32LE(12)));
    assert(!j.images?.length);
    assert(j.buffers.every((b: { uri?: string }) => !b.uri));
    const g = await model(dir + file);
    let tris = 0;
    g.scene.traverse((o) => {
      if (o instanceof THREE.Mesh)
        tris +=
          (o.geometry.index?.count || o.geometry.attributes.position.count) / 3;
    });
    assert(tris > 100 && tris < 5000, `${file}: ${tris}`);
  }
  const script = await readFile(
    "packages/art-tools/build-blender-buildings.py",
    "utf8",
  );
  assert(script.includes("read_factory_settings(use_empty=True)"));
  assert(!script.includes("import_scene"));
  assert(!script.includes("libraries.load"));
});
test("lightweight shot proxies retain closed-door cover and clear the doorway when opened", () => {
  for (const [i, b] of BUILDINGS.entries()) {
    const p = createBuildingShotProxy(i),
      front = frontOf(b),
      ray = new THREE.Raycaster(
        new THREE.Vector3(0, 1.4, front * (b.depth / 2 + 2)),
        new THREE.Vector3(0, 0, -front),
      );
    p.root.updateMatrixWorld(true);
    assert.equal(
      ray.intersectObject(p.root, true)[0]?.object.userData.doorIndex,
      i,
    );
    p.door.rotation.y = (front * Math.PI) / 2;
    p.root.updateMatrixWorld(true);
    assert.notEqual(
      ray.intersectObject(p.root, true)[0]?.object.userData.doorIndex,
      i,
    );
  }
});

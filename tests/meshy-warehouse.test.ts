import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as THREE from "three";
import { fixtures } from "../apps/client/src/fps/building-layout";
const folder = "art/buildings/meshy-warehouse/";
function parse(b: Buffer) {
  return JSON.parse(b.toString("utf8", 20, 20 + b.readUInt32LE(12)));
}
async function geometryOnly(b: Buffer) {
  const j = parse(b),
    oldLength = b.readUInt32LE(12);
  // Geometry verification does not require a browser image decoder.
  j.materials = j.materials.map(() => ({
    pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1] },
  }));
  const encoded = Buffer.from(JSON.stringify(j));
  const padding = (4 - (encoded.length % 4)) % 4;
  const json = Buffer.concat([encoded, Buffer.alloc(padding, 32)]),
    bin = b.subarray(20 + oldLength);
  const head = Buffer.alloc(20);
  head.write("glTF");
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(20 + json.length + bin.length, 8);
  head.writeUInt32LE(json.length, 12);
  head.writeUInt32LE(0x4e4f534a, 16);
  const glb = Buffer.concat([head, json, bin]);
  return new GLTFLoader().parseAsync(
    glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.length),
    "",
  );
}
test("warehouse preserves uploaded sources, bounds mobile art cost and keeps all props in existing fixture reservations", async () => {
  const report = JSON.parse(await readFile(folder + "report.json", "utf8"));
  for (const [name, sha] of Object.entries(report.sources))
    assert.equal(
      createHash("sha256")
        .update(await readFile(folder + "originals/" + name + ".glb"))
        .digest("hex"),
      sha,
    );
  assert(report.buildingTriangles < 60000);
  assert(report.buildingMeshes < 24);
  assert(report.buildingBytes < 6 * 1024 * 1024);
  assert.equal(Object.keys(report.sources).length, 7);
  for (const p of report.placements)
    assert(
      fixtures(4).some(
        (f) =>
          Math.abs(p.x - f.x) + p.width / 2 <= f.width / 2 + 0.001 &&
          Math.abs(p.z - f.z) + p.depth / 2 <= f.depth / 2 + 0.001,
      ),
      p.name + " outside collision reservation",
    );
  const raw = await readFile(
      "apps/client/src/fps/models/meshy-warehouse/warehouse.glb",
    ),
    j = parse(raw);
  assert.equal(j.images.length, 18);
  assert(
    j.nodes.some(
      (n: any) => n.extras?.originalSha256 === report.sources.warehouse,
    ),
  );
  const gltf = await geometryOnly(raw);
  gltf.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const attribute of Object.values(object.geometry.attributes))
      assert(
        Array.from(attribute.array).every(Number.isFinite),
        object.name + " invalid vertex data",
      );
    const indices = object.geometry.index;
    if (indices)
      assert(
        Array.from(indices.array).every(
          (i) => i < object.geometry.attributes.position.count,
        ),
      );
  });
  gltf.scene.updateMatrixWorld(true);
  const size = new THREE.Box3()
    .setFromObject(gltf.scene)
    .getSize(new THREE.Vector3());
  assert(size.x < 12.5 && size.z < 9.6 && size.y < 5.5, JSON.stringify(size));
  const hinge = gltf.scene.getObjectByName("warehouse-door-hinge");
  assert(hinge);
  assert(Math.abs(hinge.position.x + 0.8) < 0.001);
  assert(Math.abs(hinge.position.z + 4.5) < 0.001);
  for (const y of [0.5, 1.65, 2.6]) {
    const ray = new THREE.Raycaster(
      new THREE.Vector3(0, y, -6),
      new THREE.Vector3(0, 0, 1),
      0,
      4,
    );
    assert(
      ray.intersectObject(hinge, true).length > 0,
      "closed entrance must block",
    );
  }
  hinge.rotation.y = -Math.PI / 2;
  gltf.scene.updateMatrixWorld(true);
  for (const x of [-0.4, 0, 0.4]) {
    const ray = new THREE.Raycaster(
      new THREE.Vector3(x, 1.65, -6),
      new THREE.Vector3(0, 0, 1),
      0,
      3.5,
    );
    assert.equal(
      ray.intersectObject(gltf.scene, true).length,
      0,
      "open entrance must be visually clear",
    );
  }
  for (const name of [
    "parcels",
    "packing-station",
    "pallet",
    "pallet-jack",
    "cabinet",
    "rack",
  ])
    assert(j.nodes.some((n: any) => n.extras?.propSource === name));
});

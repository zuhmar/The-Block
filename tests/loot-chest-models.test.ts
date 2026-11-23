import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { LOOT } from "../apps/client/src/fps/world";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as THREE from "three";

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
test("all loot tier GLBs match gameplay footprints, floor contact and mobile asset budgets", async () => {
  const names = [
    "tier-1-small",
    "tier-2-supply",
    "tier-3-reinforced",
    "tier-4-long",
    "tier-5-heavy",
  ];
  let bytes = 0;
  for (const [i, name] of names.entries()) {
    const data = await readFile(
      `apps/client/src/fps/models/loot-chests/${name}.glb`,
    );
    bytes += data.length;
    const json = parse(data);
    assert.equal(json.images.length, 1);
    assert(json.images[0].bufferView !== undefined, "self-contained texture");
    assert.equal(json.images[0].mimeType, "image/jpeg");
    const gltf = await geometryOnly(data);
    gltf.scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(gltf.scene);
    const size = bounds.getSize(new THREE.Vector3()).toArray();
    const expected = [LOOT[i].width, LOOT[i].height, LOOT[i].depth];
    size.forEach((value, axis) =>
      assert(Math.abs(value - expected[axis]) < 0.001, name),
    );
    assert(Math.abs(bounds.min.y) < 0.001, "rests on terrain");
    assert(
      Math.abs(bounds.min.x + bounds.max.x) < 0.001,
      "centered on collision",
    );
    assert(
      Math.abs(bounds.min.z + bounds.max.z) < 0.001,
      "centered on collision",
    );
    let triangles = 0;
    gltf.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        assert(o.geometry.attributes.uv);
        triangles += o.geometry.index!.count / 3;
      }
    });
    assert(triangles < 5500);
  }
  assert(bytes < 2.1 * 1024 * 1024, "five tiers fit mobile download budget");
});

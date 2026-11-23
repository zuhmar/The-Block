import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as THREE from "three";

const folder = "art/building-kits/wood/";
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
test("uploaded wood kit keeps source hashes, exact module envelopes, clear doorway and hinge-local door geometry", async () => {
  const report = JSON.parse(await readFile(folder + "report.json", "utf8"));
  assert(report.runtimeBytes < 3 * 1024 * 1024);
  const dimensions: Record<string, number[]> = {
    floor: [2, 0.18, 2],
    wall: [2, 2.5, 0.16],
    foundation: [2, 0.5, 2],
    doorway: [2, 2.5, 0.16],
    door: [1.08, 2.06, 0.1],
  };
  for (const [name, size] of Object.entries(dimensions)) {
    assert.equal(
      createHash("sha256")
        .update(await readFile(folder + "originals/" + name + ".glb"))
        .digest("hex"),
      report.sources[name],
    );
    const b = await readFile(
        "apps/client/src/fps/models/build-wood/" + name + ".glb",
      ),
      j = parse(b);
    assert.equal(j.meshes.length, 1);
    assert.equal(j.images.length, 3);
    assert(report.props[name].triangles < 4000);
    const g = await geometryOnly(b);
    g.scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(g.scene),
      actual = bounds.getSize(new THREE.Vector3());
    for (const [i, v] of actual.toArray().entries())
      assert(
        Math.abs(v - size[i]) < 0.025,
        name + ": " + JSON.stringify(actual),
      );
    assert(Math.abs(bounds.min.y) < 0.02, name + " floor contact");
    if (name === "door")
      assert(Math.abs(bounds.min.x) < 0.02, "door hinge at left edge");
    if (name === "doorway")
      for (const x of [-0.22, 0, 0.22])
        for (const y of [0.35, 1.65, 2.02]) {
          const ray = new THREE.Raycaster(
            new THREE.Vector3(x, y, -1),
            new THREE.Vector3(0, 0, 1),
            0,
            2,
          );
          assert.equal(
            ray.intersectObject(g.scene, true).length,
            0,
            "clear player opening",
          );
        }
  }
});

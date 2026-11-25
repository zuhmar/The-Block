import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import sharp from "sharp";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
test("Meshy gathering exports preserve source provenance, existing world envelopes and economical textured LODs", async () => {
  Object.defineProperty(globalThis, "self", {
    value: globalThis,
    configurable: true,
  });
  Object.defineProperty(globalThis, "createImageBitmap", {
    value: async (blob: Blob) => {
      const m = await sharp(Buffer.from(await blob.arrayBuffer())).metadata();
      return { width: m.width, height: m.height, close() {} };
    },
    configurable: true,
  });
  const dir = "apps/client/static/assets/meshy-nature-v1",
    manifest = JSON.parse(await readFile(dir + "/manifest.json", "utf8"));
  assert.equal(manifest.models.length, 12);
  const counts = new Map<string, number>();
  for (const info of manifest.models) {
    const bytes = await readFile(dir + "/" + info.file);
    const doc = JSON.parse(
      bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)),
    );
    const binary = bytes.subarray(28 + bytes.readUInt32LE(12));
    assert.ok(bytes.length < 700000);
    assert.equal(doc.materials.length, 1);
    for (const im of doc.images) {
      const v = doc.bufferViews[im.bufferView];
      const m = await sharp(
        binary.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength),
      ).metadata();
      assert.ok(m.width! <= info.textureMax && m.height! <= info.textureMax);
    }
    const g = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length),
      "",
    );
    const bounds = new THREE.Box3().setFromObject(g.scene);
    assert.ok(Math.abs(bounds.min.y) < 0.002, info.file);
    const size = bounds.getSize(new THREE.Vector3());
    for (const axis of ["x", "y", "z"] as const)
      assert.ok(
        Math.abs(size[axis] - info.sizeMetres[axis]) < (info.lod ? 0.4 : 0.005),
        info.file + " " + axis,
      );
    const source = await readFile(
      "art/models/meshy-gathering/" + info.id + ".glb",
    );
    assert.equal(
      info.sourceSHA256,
      createHash("sha256").update(source).digest("hex"),
    );
    let triangles = 0;
    g.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        assert.equal(o.userData.source, "meshy");
        triangles +=
          (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
        assert.ok((o.material as THREE.MeshStandardMaterial).map);
      }
    });
    assert.equal(triangles, info.triangles);
    counts.set(info.file, triangles);
  }
  for (const info of manifest.models.filter(
    (m: { lod: number }) => m.lod === 0,
  ))
    assert.ok(counts.get(info.id + "-lod1.glb")! < info.triangles * 0.3);
});

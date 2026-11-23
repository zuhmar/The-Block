import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
test("Blender harvest tools preserve sprite provenance, grip origins, UVs and mobile mesh budgets", async () => {
  // Decode embedded images in Node while GLTFLoader constructs real textures.
  Object.defineProperty(globalThis, "self", {
    value: globalThis,
    configurable: true,
  });
  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    value: async (blob: Blob) => {
      const image = await sharp(
        Buffer.from(await blob.arrayBuffer()),
      ).metadata();
      return {
        width: image.width,
        height: image.height,
        close() {},
      } as ImageBitmap;
    },
  });
  const dir = "apps/client/static/assets/harvest-tools";
  const manifest = JSON.parse(await readFile(dir + "/manifest.json", "utf8"));
  assert.deepEqual(
    manifest.models.map((m: { id: string }) => m.id),
    ["axe", "pickaxe"],
  );
  for (const info of manifest.models) {
    const bytes = await readFile(dir + "/" + info.file),
      reference = await readFile(info.sourceReference);
    assert.equal(
      info.sourceSHA256,
      createHash("sha256").update(reference).digest("hex"),
    );
    const raw = JSON.parse(
      bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)),
    );
    assert(raw.buffers.every((b: { uri?: string }) => !b.uri));
    assert.equal(
      raw.images?.length,
      1,
      "reference color image is embedded once and shared",
    );
    assert(
      raw.images.every(
        (image: { uri?: string; bufferView?: number }) =>
          !image.uri && typeof image.bufferView === "number",
      ),
    );
    const gltf = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
    );
    const root = gltf.scene.getObjectByName(info.id);
    assert(root);
    assert.equal(root.userData.sourceSHA256, info.sourceSHA256);
    const bounds = new THREE.Box3().setFromObject(root),
      size = bounds.getSize(new THREE.Vector3());
    assert(
      bounds.min.y < 0 && bounds.max.y > 0.8,
      "hand grip must remain at local origin",
    );
    for (const axis of ["x", "y", "z"] as const)
      assert(Math.abs(size[axis] - info.sizeMetres[axis]) < 0.005);
    let triangles = 0,
      draws = 0;
    const materials = new Set<string>();
    root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        draws++;
        const p = o.geometry.getAttribute("position");
        assert(o.geometry.getAttribute("uv"));
        for (const v of p.array) assert(Number.isFinite(v));
        triangles += (o.geometry.index?.count ?? p.count) / 3;
        const material = o.material as THREE.MeshStandardMaterial;
        materials.add(material.name);
        assert(
          material.map,
          "reference texture must survive GLTFLoader import",
        );
        assert.equal((material.map.image as ImageBitmap).width, 1536);
      }
    });
    assert(triangles < 12000);
    assert.equal(triangles, info.triangles);
    assert(draws <= 6);
    assert(
      materials.has("binding") &&
        materials.has("edge") &&
        materials.has("grip"),
    );
  }
});

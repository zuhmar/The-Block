import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
test("four image-matched resource items contain three solid outward-facing volumes and the corrected source colors", async () => {
  Object.defineProperty(globalThis, "self", {
    value: globalThis,
    configurable: true,
  });
  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    value: async (blob: Blob) => {
      const info = await sharp(
        Buffer.from(await blob.arrayBuffer()),
      ).metadata();
      return {
        width: info.width,
        height: info.height,
        close() {},
      } as ImageBitmap;
    },
  });
  const dir = "apps/client/static/assets/resource-items",
    manifest = JSON.parse(await readFile(dir + "/manifest.json", "utf8")),
    source = await readFile(manifest.sourceReference);
  assert.equal(
    manifest.sourceSHA256,
    createHash("sha256").update(source).digest("hex"),
  );
  assert.deepEqual(
    manifest.models.map((m: { id: string }) => m.id),
    ["wood", "rock", "sulfur", "metal"],
  );
  for (const [i, info] of manifest.models.entries()) {
    const bytes = await readFile(dir + "/" + info.file),
      jsonLength = bytes.readUInt32LE(12),
      raw = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength));
    assert.equal(raw.images.length, 1);
    assert(!raw.images[0].uri);
    assert(raw.buffers.every((b: { uri?: string }) => !b.uri));
    assert(
      raw.materials.every(
        (m: { alphaMode?: string }) => !m.alphaMode || m.alphaMode === "OPAQUE",
      ),
    );
    const imageView = raw.bufferViews[raw.images[0].bufferView],
      image = bytes.subarray(
        28 + jsonLength + (imageView.byteOffset ?? 0),
        28 + jsonLength + (imageView.byteOffset ?? 0) + imageView.byteLength,
      );
    const actual = await sharp(image).ensureAlpha().raw().toBuffer(),
      expected = await sharp(source)
        .extract({
          left: (i % 2) * 654,
          top: Math.floor(i / 2) * 601,
          width: 654,
          height: 601,
        })
        .ensureAlpha()
        .raw()
        .toBuffer();
    if (info.id === "wood") {
      const atlas = await sharp(image).metadata();
      assert.equal(atlas.width, 2048);
      assert.equal(atlas.height, 1024);
      const originalCrop = await sharp(
        await readFile("art/models/resource-items/wood-color.png"),
      )
        .ensureAlpha()
        .raw()
        .toBuffer();
      assert(originalCrop.equals(expected));
    } else
      assert(
        actual.equals(expected),
        "ore textures must preserve the corrected original pixels",
      );
    const g = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
    );
    const root = g.scene.getObjectByName("item-" + info.id);
    assert(root);
    assert.equal(root.userData.sourceSHA256, manifest.sourceSHA256);
    assert.equal(root.userData.chunkCount, 3);
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root),
      size = bounds.getSize(new THREE.Vector3());
    assert(Math.abs(bounds.min.y) < 0.001);
    assert(size.z > 0.2, "item must have real depth");
    for (const axis of ["x", "y", "z"] as const)
      assert(Math.abs(size[axis] - info.sizeMetres[axis]) < 0.005);
    let meshes = 0,
      triangles = 0;
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      meshes++;
      const geom = o.geometry,
        p = geom.getAttribute("position"),
        uv = geom.getAttribute("uv"),
        indices = geom.index;
      assert(uv);
      for (const value of p.array) assert(Number.isFinite(value));
      const count = indices?.count ?? p.count;
      triangles += count / 3;
      let volume = 0;
      const a = new THREE.Vector3(),
        b = new THREE.Vector3(),
        c = new THREE.Vector3();
      for (let k = 0; k < count; k += 3) {
        a.fromBufferAttribute(p, indices ? indices.getX(k) : k);
        b.fromBufferAttribute(p, indices ? indices.getX(k + 1) : k + 1);
        c.fromBufferAttribute(p, indices ? indices.getX(k + 2) : k + 2);
        volume += a.dot(b.cross(c)) / 6;
      }
      assert(volume > 1e-5, "closed outward-facing volume");
      assert((o.material as THREE.MeshStandardMaterial).map);
      assert(
        !(o.material as THREE.MeshStandardMaterial).vertexColors,
        "bake masks must not tint runtime materials",
      );
    });
    assert.equal(meshes, 3);
    assert.equal(triangles, info.triangles);
    assert(triangles < 3000);
  }
});

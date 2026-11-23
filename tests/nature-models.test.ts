import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const directory = "apps/client/static/assets/nature-models";
test("six original nature models and their distant LODs are self-contained, ground-aligned, and within rendering budgets", async () => {
  const manifest = JSON.parse(
    await readFile(directory + "/manifest.json", "utf8"),
  );
  assert.equal(manifest.models.length, 12);
  const reference = await readFile("art/ai/nature/tree-resource-nodes.png");
  assert.equal(
    manifest.sourceSHA256,
    createHash("sha256").update(reference).digest("hex"),
  );
  const counts = new Map<string, number>();
  for (const info of manifest.models) {
    const bytes = await readFile(directory + "/" + info.file);
    const raw = JSON.parse(
      bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)),
    );
    assert(raw.buffers.every((b: { uri?: string }) => !b.uri));
    assert(
      !raw.images?.length,
      "palette assets must not depend on external image files",
    );
    const gltf = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
    );
    const root = gltf.scene.getObjectByName(
      info.id + (info.lod ? "-lod1" : ""),
    );
    assert(root, info.file);
    assert.equal(root.userData.sourceSHA256, manifest.sourceSHA256);
    assert.equal(root.userData.lod, info.lod);
    assert(
      root.userData.collisionRadius > 0 && root.userData.collisionHeight > 0,
    );
    const bounds = new THREE.Box3().setFromObject(gltf.scene),
      size = bounds.getSize(new THREE.Vector3());
    assert(Math.abs(bounds.min.y) < 0.001, info.file);
    for (const axis of ["x", "y", "z"] as const) {
      assert(Number.isFinite(size[axis]));
      assert(
        Math.abs(size[axis] - info.sizeMetres[axis]) < 0.015,
        `${info.file} ${axis}`,
      );
    }
    let triangles = 0,
      draws = 0;
    const materials = new Set<string>();
    root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        assert(!(o instanceof THREE.SkinnedMesh));
        const pos = o.geometry.getAttribute("position");
        for (let i = 0; i < pos.count; i++)
          assert(
            Number.isFinite(pos.getX(i)) &&
              Number.isFinite(pos.getY(i)) &&
              Number.isFinite(pos.getZ(i)),
          );
        triangles += (o.geometry.index?.count ?? pos.count) / 3;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          materials.add(m.name);
          draws++;
        }
        let node: THREE.Object3D | null = o;
        while (node && !node.userData.part) node = node.parent;
        assert(
          node &&
            ["bark", "canopy", "stone", "mineral"].includes(node.userData.part),
        );
      }
    });
    assert.equal(triangles, info.triangles, info.file);
    assert.equal(draws, info.drawCalls, info.file);
    assert(draws <= 8);
    assert(triangles <= (info.lod ? 2000 : 12000));
    counts.set(info.file, triangles);
    if (info.id.startsWith("tree")) assert(size.y > 6 && materials.size >= 3);
    if (info.id === "node-rock")
      assert(![...materials].some((m) => /sulfur|copper|rust/.test(m)));
    if (info.id === "node-sulfur") assert(materials.has("sulfur"));
    if (info.id === "node-metal")
      assert(materials.has("rust") && materials.has("copper"));
  }
  for (const info of manifest.models.filter(
    (m: { lod: number }) => m.lod === 0,
  ))
    assert(counts.get(info.id + "-lod1.glb")! < info.triangles * 0.4, info.id);
});

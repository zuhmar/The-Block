import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
function decode(bytes: Buffer) {
  assert.equal(bytes.toString("ascii", 0, 4), "glTF");
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const length = bytes.readUInt32LE(12),
    json = JSON.parse(bytes.toString("utf8", 20, 20 + length));
  return { json, bin: bytes.subarray(28 + length) };
}
test("Street V2 contains real skin weights, articulated joints, removable clothing, embedded AO and named motion clips", async () => {
  const { json: j, bin } = decode(
    await readFile("apps/client/src/fps/models/street-v2.glb"),
  );
  assert(j.skins.length === 1);
  const names = j.nodes.map((n: { name?: string }) => n.name);
  for (const name of [
    "forearm.L",
    "forearm.R",
    "shin.L",
    "shin.R",
    "hand.R",
    "finger0.R",
  ])
    assert(names.includes(name), name);
  for (const slot of ["base", "torso", "legs", "footwear", "headwear"])
    assert(
      j.nodes.some(
        (n: { extras?: { clothingSlot?: string } }) =>
          n.extras?.clothingSlot === slot,
      ),
      slot,
    );
  for (const clip of ["idle", "walk", "grip"])
    assert(j.animations.some((a: { name: string }) => a.name === clip));
  let triangles = 0;
  for (const mesh of j.meshes)
    for (const p of mesh.primitives) {
      assert(p.attributes.JOINTS_0 !== undefined);
      assert(p.attributes.WEIGHTS_0 !== undefined);
      triangles += j.accessors[p.indices].count / 3;
      const a = j.accessors[p.attributes.WEIGHTS_0],
        view = j.bufferViews[a.bufferView];
      assert.equal(a.componentType, 5126);
      for (let v = 0; v < a.count; v++) {
        const start =
          (view.byteOffset || 0) +
          (a.byteOffset || 0) +
          v * (view.byteStride || 16);
        const weights = Array.from({ length: 4 }, (_, i) =>
          bin.readFloatLE(start + i * 4),
        );
        assert(Math.abs(weights.reduce((x, y) => x + y, 0) - 1) < 0.001);
      }
    }
  assert(triangles < 45000, `${triangles} triangles`);
  assert(
    j.materials.every(
      (m: { occlusionTexture?: unknown }) => !!m.occlusionTexture,
    ),
  );
  assert(j.images.length === 1 && !j.images[0].uri);
  const view = j.bufferViews[j.images[0].bufferView],
    png = bin.subarray(view.byteOffset, view.byteOffset + view.byteLength);
  assert.equal(png.readUInt32BE(16), 512);
  assert.equal(png.readUInt32BE(20), 512);
  const roughnesses = new Set(
    j.materials.map(
      (m: { pbrMetallicRoughness: { roughnessFactor: number } }) =>
        m.pbrMetallicRoughness.roughnessFactor,
    ),
  );
  assert(roughnesses.size >= 5);
});
test("Street V2 lower-detail asset keeps its rig and animations while reducing geometry", async () => {
  const { json: j } = decode(
    await readFile("art/characters/street-v2/street-v2-lod.glb"),
  );
  let triangles = 0;
  for (const mesh of j.meshes)
    for (const p of mesh.primitives)
      triangles += j.accessors[p.indices].count / 3;
  assert(triangles < 22000, `${triangles}`);
  assert(j.skins.length === 1);
  assert(j.animations.some((a: { name: string }) => a.name === "walk"));
});

test("review cleanup releases shared GPU resources once", async () => {
  const THREE = await import("three");
  const { disposeReview } = await import(
    "../apps/client/src/fps/street-review.js"
  );
  const root = new THREE.Group(),
    geo = new THREE.BoxGeometry(),
    tex = new THREE.Texture(),
    mat = new THREE.MeshStandardMaterial({ map: tex, aoMap: tex });
  let imageCloses = 0;
  tex.image = { close: () => imageCloses++ };
  let geometries = 0,
    textures = 0,
    materials = 0;
  geo.addEventListener("dispose", () => geometries++);
  tex.addEventListener("dispose", () => textures++);
  mat.addEventListener("dispose", () => materials++);
  root.add(new THREE.Mesh(geo, mat), new THREE.Mesh(geo, mat));
  disposeReview(root);
  assert.equal(imageCloses, 1);
  assert.deepEqual(
    { geometries, textures, materials },
    { geometries: 1, textures: 1, materials: 1 },
  );
});

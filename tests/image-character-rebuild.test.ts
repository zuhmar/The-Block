import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const DIR = "apps/client/src/fps/models/image-rebuild/";
function parse(b: Buffer) {
  assert.equal(b.toString("ascii", 0, 4), "glTF");
  const n = b.readUInt32LE(12);
  return JSON.parse(b.toString("utf8", 20, 20 + n));
}
test("all four fresh image models identify the saved reference and have independent skin/animation data", async () => {
  const image = await readFile("art/characters/image-rebuild/reference.png"),
    sha = createHash("sha256").update(image).digest("hex");
  assert.equal(
    createHash("sha256")
      .update(await readFile(DIR + "reference.png"))
      .digest("hex"),
    sha,
  );
  for (const kind of ["base", "street", "reinforced", "armored"]) {
    const j = parse(await readFile(DIR + kind + ".glb"));
    assert(
      j.nodes.some(
        (n: { extras?: { referenceSha256: string } }) =>
          n.extras?.referenceSha256 === sha,
      ),
    );
    assert.equal(j.skins.length, 1);
    assert.equal(j.skins[0].joints.length, 28);
    assert.deepEqual(j.animations.map((a: { name: string }) => a.name).sort(), [
      "grip",
      "idle",
      "walk",
    ]);
    let triangles = 0;
    for (const m of j.meshes)
      for (const p of m.primitives) {
        assert(p.attributes.JOINTS_0 !== undefined);
        assert(p.attributes.WEIGHTS_0 !== undefined);
        triangles += j.accessors[p.indices].count / 3;
      }
    assert(triangles < 50000, kind + ": " + triangles);
    assert.equal(j.images.length, 1);
    assert(
      j.materials.every(
        (m: { occlusionTexture: unknown }) => !!m.occlusionTexture,
      ),
    );
    if (kind !== "base")
      for (const slot of ["headwear", "torso", "legs", "footwear"])
        assert(
          j.nodes.some(
            (n: { extras?: { clothingSlot: string } }) =>
              n.extras?.clothingSlot === slot,
          ),
        );
  }
});
test("rebuild provenance is the reference and pixel landmarks, without importing existing geometry", async () => {
  const source = await readFile(
    "packages/art-tools/build-image-characters.py",
    "utf8",
  );
  assert(source.includes("read_factory_settings(use_empty=True)"));
  assert(!source.includes("import_scene"));
  assert(!source.includes("libraries.load"));
  assert(!source.includes("build-street-v2"));
  const d = JSON.parse(
    await readFile("art/characters/image-rebuild/landmarks.json", "utf8"),
  );
  assert.equal(d.groundPixel, 939);
  assert.equal(d.imageSize[0], 1536);
  assert.equal(d.head.radiusPixels, 100);
});

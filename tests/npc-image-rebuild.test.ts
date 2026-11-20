import * as THREE from "three";
import { createNpcHitbox } from "../apps/client/src/fps/npc-image";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const DIR = "apps/client/src/fps/models/npc-image-rebuild/";
function parse(b: Buffer) {
  assert.equal(b.toString("ascii", 0, 4), "glTF");
  const n = b.readUInt32LE(12);
  return JSON.parse(b.toString("utf8", 20, 20 + n));
}
test("all three fresh NPC models identify the saved reference and have independent skin/animation data", async () => {
  const image = await readFile(
      "art/characters/npc-image-rebuild/reference.png",
    ),
    sha = createHash("sha256").update(image).digest("hex");
  assert.equal(
    createHash("sha256")
      .update(await readFile(DIR + "reference.png"))
      .digest("hex"),
    sha,
  );
  for (const kind of ["lookout", "police", "swat"]) {
    const j = parse(await readFile(DIR + kind + ".glb"));
    assert(
      j.nodes.some(
        (n: { extras?: { referenceSha256: string } }) =>
          n.extras?.referenceSha256 === sha,
      ),
    );
    const skin = j.materials.find((m: { name: string }) =>
      m.name.endsWith("_skin"),
    );
    assert(skin, kind + " white skin material");
    assert(
      skin.pbrMetallicRoughness.baseColorFactor
        .slice(0, 3)
        .every((v: number) => v > 0.8),
    );
    if (kind === "swat") {
      const visor = j.materials.find((m: { name: string }) =>
        m.name.includes("clear_shield"),
      );
      assert.equal(visor.alphaMode, "BLEND");
      assert(visor.pbrMetallicRoughness.baseColorFactor[3] < 0.3);
    }
    assert.equal(j.skins.length, 1);
    assert.equal(j.skins[0].joints.length, 28);
    assert.deepEqual(j.animations.map((a: { name: string }) => a.name).sort(), [
      "combat",
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
    assert(triangles < 52000, kind + ": " + triangles);
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

test("shooting volumes hit invisible head and torso without detailed skin raycasts", () => {
  const hitbox = createNpcHitbox();
  hitbox.updateMatrixWorld(true);
  for (const y of [0.8, 1.7])
    assert(
      new THREE.Raycaster(
        new THREE.Vector3(0, y, 4),
        new THREE.Vector3(0, 0, -1),
      ).intersectObject(hitbox, true).length > 0,
    );
  assert.equal(
    new THREE.Raycaster(
      new THREE.Vector3(2, 1, 4),
      new THREE.Vector3(0, 0, -1),
    ).intersectObject(hitbox, true).length,
    0,
  );
});

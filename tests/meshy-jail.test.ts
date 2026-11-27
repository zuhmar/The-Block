import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
function glb(bytes: Buffer) {
  assert.equal(bytes.toString("ascii", 0, 4), "glTF");
  return JSON.parse(bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)));
}
function triangles(j: any) {
  return j.meshes.reduce(
    (n: number, m: any) =>
      n +
      m.primitives.reduce(
        (s: number, p: any) => s + j.accessors[p.indices].count / 3,
        0,
      ),
    0,
  );
}
test("uploaded jail character preserves its Meshy topology and rig while gaining the existing action set", async () => {
  const path = "art/characters/meshy-jail/";
  const original = await readFile(path + "original.glb"),
    source = glb(original),
    model = glb(await readFile(path + "animated.glb")),
    existing = glb(
      await readFile("apps/client/src/fps/models/meshy-shadow/animated.glb"),
    ),
    report = JSON.parse(await readFile(path + "animation-report.json", "utf8"));
  assert.equal(
    createHash("sha256").update(original).digest("hex"),
    report.originalSha256,
  );
  assert.equal(triangles(model), triangles(source));
  assert.equal(model.skins[0].joints.length, source.skins[0].joints.length);
  assert.deepEqual(
    model.animations.map((a: any) => a.name).sort(),
    existing.animations.map((a: any) => a.name).sort(),
  );
  assert.deepEqual(source.animations.map((a: any) => a.name).sort(), [
    "Running",
    "Walking",
  ]);
  for (const mesh of model.meshes)
    for (const p of mesh.primitives) {
      assert.notEqual(p.attributes.JOINTS_0, undefined);
      assert.notEqual(p.attributes.WEIGHTS_0, undefined);
    }
  assert.ok(model.images.every((i: any) => i.bufferView !== undefined));
  assert.equal(report.newMeshyCredits, 0);
});

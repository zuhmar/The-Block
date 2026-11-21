import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

test("Swat runtime preserves the uploaded rig, clips and mesh within phone asset budget", async () => {
  const original = await readFile("art/characters/meshy-swat/original.glb");
  assert.equal(
    createHash("sha256").update(original).digest("hex"),
    "1b1213872134105a078e9989c33e15e7120ceec3288e633926b973ae50d4fbed",
  );
  const b = await readFile(
    "apps/client/src/fps/models/meshy-swat/animated.glb",
  );
  const j = JSON.parse(b.toString("utf8", 20, 20 + b.readUInt32LE(12)));
  assert.equal(j.skins.length, 1);
  assert.equal(j.skins[0].joints.length, 58);
  assert.deepEqual(j.animations.map((a: { name: string }) => a.name).sort(), [
    "Idle_3",
    "Rifle_Fire",
    "Rifle_Hold",
    "Running",
    "Walking",
  ]);
  let triangles = 0;
  for (const m of j.meshes)
    for (const p of m.primitives) {
      assert(p.attributes.JOINTS_0 !== undefined);
      triangles += j.accessors[p.indices].count / 3;
    }
  assert.equal(triangles, 10403);
  assert(b.length < 2500000);
  assert.equal(j.images.length, 3);
});

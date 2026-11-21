import sharp from "sharp";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
function parse(b: Buffer) {
  return JSON.parse(b.toString("utf8", 20, 20 + b.readUInt32LE(12)));
}
test("Meshy source is unchanged and review export retains the rig, native clips and 14 combat clips", async () => {
  const original = await readFile("art/characters/meshy-shadow/original.glb"),
    sha = createHash("sha256").update(original).digest("hex"),
    src = parse(original);
  assert.equal(
    sha,
    "de9596603ea1572d40f5aea648899562b4ae2ab837478eaf766e07bcbc9660d1",
  );
  const b = await readFile(
      "apps/client/src/fps/models/meshy-shadow/animated.glb",
    ),
    g = parse(b);
  assert.equal(g.meshes.length, 1);
  assert.equal(g.images.length, 3);
  const tex = g.materials[0].pbrMetallicRoughness.baseColorTexture.index;
  const image = g.images[g.textures[tex].source],
    view = g.bufferViews[image.bufferView];
  const start = 28 + b.readUInt32LE(12) + (view.byteOffset || 0);
  const stats = await sharp(b.subarray(start, start + view.byteLength)).stats();
  assert(
    stats.channels.slice(0, 3).every((c) => c.mean < 70),
    "Glossy black base color must survive texture optimization",
  );
  assert.equal(g.skins.length, 1);
  assert.equal(g.skins[0].joints.length, 32);
  assert(
    g.nodes.some(
      (n: { extras?: { originalSha256: string } }) =>
        n.extras?.originalSha256 === sha,
    ),
  );
  assert.equal(g.animations.length, 19);
  const duration = (j: any, a: any) =>
    Math.max(...a.samplers.map((s: any) => j.accessors[s.input].max[0]));
  for (const a of src.animations) {
    const found = g.animations.find((v: any) => v.name === a.name);
    assert(found);
    assert(Math.abs(duration(src, a) - duration(g, found)) < 0.04, a.name);
  }
  for (const name of [
    "Punch_Left",
    "Punch_Right",
    ...["Pistol", "SMG", "Rifle", "Sniper"].flatMap((k) => [
      k + "_Hold",
      k + "_Fire",
      k + "_Reload",
    ]),
  ])
    assert(
      g.animations.some((a: any) => a.name === name),
      name,
    );
  for (const [k, d] of [
    ["Pistol", 1.4],
    ["SMG", 1.8],
    ["Rifle", 2.1],
    ["Sniper", 2.6],
  ] as const)
    assert(
      Math.abs(
        duration(
          g,
          g.animations.find((a: any) => a.name === k + "_Reload"),
        ) - d,
      ) < 0.001,
    );
  const tris = g.meshes.reduce(
    (n: number, m: any) =>
      n +
      m.primitives.reduce(
        (sum: number, p: any) => sum + g.accessors[p.indices].count / 3,
        0,
      ),
    0,
  );
  assert(tris < 25000);
  assert(b.length < 2500000);
  assert(g.nodes.some((n: any) => n.name === "left-weapon-socket"));
  assert(g.nodes.some((n: any) => n.name === "right-weapon-socket"));
});

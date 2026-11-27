import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { JAIL_INTRO_SECONDS } from "../apps/client/src/fps/jail-intro-state.js";
test("jail intro ships the real Blender scene and matching mobile video, using unchanged game models", async () => {
  const root = "art/cinematics/jail-release/",
    manifest = JSON.parse(await readFile(root + "manifest.json", "utf8"));
  assert.equal(manifest.duration, JAIL_INTRO_SECONDS);
  assert.equal(manifest.actors.length, 3);
  assert.equal(manifest.shots.length, 4);
  for (const [path, hash] of Object.entries(manifest.sources))
    assert.equal(
      createHash("sha256")
        .update(await readFile(path))
        .digest("hex"),
      hash,
      path,
    );
  const blend = await readFile(root + "jail-release.blend");
  assert.ok(blend.length > 1000000);
  assert.equal(blend[0], 0x28); // Blender's compressed Zstandard source.
  const check = JSON.parse(await readFile(root + "blender-check.json", "utf8"));
  assert.equal(check.shots, 4);
  assert.ok(
    check.actors.every((a: any) => a.walkStrips.length && a.rigBones >= 32),
  );
  assert.ok(check.samples.every((s: any) => Math.abs(s.soleZ - 0.015) < 0.005));
  const video = "apps/client/static/assets/cinematics/jail-release-v1.mp4",
    bytes = await readFile(video),
    meta = JSON.parse(await readFile(root + "video-check.json", "utf8"));
  assert.ok(Math.abs(meta.duration - JAIL_INTRO_SECONDS) < 0.05);
  assert.ok(bytes.length < 8000000);
  assert.equal(bytes.subarray(4, 8).toString(), "ftyp");
  assert.equal(createHash("sha256").update(bytes).digest("hex"), meta.sha256);
  assert.ok(
    meta.streams.some(
      (s: any) =>
        s.type === "video" &&
        s.codec === "h264" &&
        s.width === 960 &&
        s.height === 540,
    ),
  );
  assert.ok(meta.streams.some((s: any) => s.codec === "aac"));
  assert.ok(
    (await stat("apps/client/static/assets/cinematics/jail-release-v1.webp"))
      .size > 1000,
  );
});

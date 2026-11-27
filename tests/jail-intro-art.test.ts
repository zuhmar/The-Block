import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  JAIL_INTRO_SECONDS,
  JAIL_INTRO_VIDEO,
  JAIL_INTRO_POSTER,
} from "../apps/client/src/fps/jail-intro-state.js";
test("jail intro uses the uploaded jail actor, grounded escort, branded ending and matching video", async () => {
  const root = "art/cinematics/jail-release/",
    manifest = JSON.parse(await readFile(root + "manifest.json", "utf8"));
  assert.equal(manifest.duration, JAIL_INTRO_SECONDS);
  assert.equal(manifest.actors.length, 3);
  assert.equal(manifest.welcome.text, "WELCOME TO SURVIVE THE BLOCK");
  assert.ok(manifest.sources["art/characters/meshy-jail/animated.glb"]);
  assert.equal(manifest.welcome.startFrame, 289);
  assert.equal(manifest.shots.length, 5);
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
  assert.equal(check.shots, 5);
  assert.equal(check.frames, 360);
  assert.equal(check.samples.length, 18);
  assert.equal(check.firstPersonActorHidden, true);
  assert.ok(
    check.actors.every((a: any) => a.walkStrips.length && a.rigBones >= 32),
  );
  assert.ok(
    check.samples.every((s: any) => Math.abs(s.clearance - 0.002) < 0.003),
  );
  const video = "apps/client/static" + JAIL_INTRO_VIDEO,
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
  assert.ok((await stat("apps/client/static" + JAIL_INTRO_POSTER)).size > 1000);
});

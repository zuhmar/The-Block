import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Box3, Vector3 } from "three";
import { STORAGE_SPECS } from "../apps/client/src/fps/storage-spec";
for (const size of ["small", "large"] as const)
  test(`${size} chest ships its original alpha sprite and grounded, size-matched Blender model`, async () => {
    const base = "apps/client/static/assets/player-storage/",
      ref = await readFile(`art/ai/player-storage/chest-${size}-reference.png`),
      sprite = sharp(base + `chest-${size}.png`),
      meta = await sprite.metadata(),
      stats = await sprite.stats();
    assert.equal(meta.hasAlpha, true);
    assert.equal(stats.channels[3].min, 0);
    assert.equal(stats.channels[3].max, 255);
    assert.ok(Math.max(meta.width!, meta.height!) <= 512);
    const bytes = await readFile(base + `chest-${size}.glb`),
      g = await new GLTFLoader().parseAsync(
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer,
        "",
      );
    const bounds = new Box3().setFromObject(g.scene),
      dimensions = bounds.getSize(new Vector3()),
      spec = STORAGE_SPECS[size];
    assert.ok(Math.abs(bounds.min.y) < 0.01);
    assert.ok(Math.abs(dimensions.y - spec.height) < 0.02);
    assert.ok(Math.abs(dimensions.x - spec.width) < 0.03);
    assert.ok(Math.abs(dimensions.z - spec.depth) < 0.03);
    const root = g.scene.getObjectByName(`chest-${size}`)!;
    assert.equal(
      root.userData.sourceSHA256,
      createHash("sha256").update(ref).digest("hex"),
    );
    assert.ok(bytes.length < 400000);
  });

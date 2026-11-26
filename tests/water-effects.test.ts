import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import sharp from "sharp";
import {
  waterRibbon,
  RIPPLE_LIMIT,
} from "../apps/client/src/fps/water-geometry";
import { createWater } from "../apps/client/src/fps/water-view";
import { configureCompactCity } from "../apps/client/src/fps/compact-city";
import { CITY_OUTLINE, jailOutline } from "../apps/client/src/fps/compact-plan";
import { blockedTerrain } from "../apps/client/src/fps/world";
test("coastal foam follows outward normals, closes its geometry and repeats without a texture seam", () => {
  const outline = [
    { x: -10, z: -10 },
    { x: 10, z: -10 },
    { x: 10, z: 10 },
    { x: -10, z: 10 },
    { x: -10, z: -10 },
  ];
  for (const points of [outline, outline.slice().reverse(), jailOutline()]) {
    const band = waterRibbon(points, 0.1, 2, -0.135);
    assert(band.positions.every(Number.isFinite));
    assert.deepEqual(band.positions.slice(0, 6), band.positions.slice(-6));
    assert(Math.abs(band.uv.at(-4)! % 2) < 1e-6);
    assert(band.indices.every((i) => i < band.positions.length / 3));
  }
  const square = waterRibbon(outline, 0.1, 2, -0.135);
  assert(
    square.positions[0] < -10 && square.positions[2] < -10,
    "both edges remain outside the land at a corner",
  );
});
test("ripple pool remains bounded, expires, and creates impacts only on exposed water without changing terrain", () => {
  const undo = configureCompactCity();
  try {
    const water = createWater([CITY_OUTLINE, jailOutline()]);
    water.update(10);
    assert.equal(water.root.children.length, 3);
    assert.equal(water.stats().pool, RIPPLE_LIMIT);
    assert(!water.splash({ x: 0, z: 0 }));
    assert(!water.splash({ x: 0, z: -88 }), "bridge remains dry");
    assert(!water.splash({ x: -60, z: 191 }), "harbor pier remains dry");
    const wet = { x: 10, z: -90 },
      before = blockedTerrain(wet);
    for (let i = 0; i < 100; i++) assert(water.splash(wet));
    assert.equal(water.stats().active, RIPPLE_LIMIT);
    assert.equal(water.pool.count, RIPPLE_LIMIT);
    water.update(12);
    assert.equal(water.stats().active, 0);
    const down = new THREE.Ray(
      new THREE.Vector3(10, 2, -90),
      new THREE.Vector3(0, -1, 0),
    );
    assert(!water.splashRay(down, 1));
    assert(water.splashRay(down, 3));
    assert(
      !water.splashRay(
        new THREE.Ray(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, -1, 0)),
        3,
      ),
    );
    assert.equal(blockedTerrain(wet), before);
    assert.equal(water.material.uniforms.uTime.value, 12);
    assert.equal(water.foam.material.uniforms.uTime.value, 12);
  } finally {
    undo();
  }
});
test("AI water artwork fits a small texture budget and keeps transparent foam and ripples", async () => {
  const manifest = JSON.parse(
    await readFile("art/ai/water/manifest.json", "utf8"),
  );
  let bytes = 0;
  for (const item of manifest.assets) {
    const source = await readFile(`art/ai/water/references/${item.name}.png`);
    assert.equal(
      createHash("sha256").update(source).digest("hex"),
      item.referenceSha256,
    );
    const asset = await readFile(
      `apps/client/src/fps/textures/water/${item.file}`,
    );
    bytes += asset.length;
    const info = await sharp(asset).metadata();
    assert.equal(info.width, item.width);
    assert.equal(info.height, item.height);
    if (item.name !== "water") {
      assert(info.hasAlpha);
      const stats = await sharp(asset).stats();
      assert.equal(stats.channels[3].min, 0);
      assert(stats.channels[3].max > 200);
    }
  }
  assert(bytes < 100000, "three textures stay below 100KB total");
});

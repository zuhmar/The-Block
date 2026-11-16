import { readFile } from "node:fs/promises";
import sharp from "sharp";
import assert from "node:assert/strict";
import { ITEMS, PIECES } from "../shared/src/index.js";
const root = new URL("../../apps/client/public/assets/", import.meta.url);
const { assets, version, view } = JSON.parse(
  await readFile(new URL("manifest.json", root), "utf8"),
);
assert.equal(version, 2);
assert.equal(view, "top-down");
for (const direction of ["south", "north", "east", "west"])
  assert(
    assets[`player-stick-${direction}`]?.source === "ai-generated",
    "AI stick figures required in all four directions",
  );
for (const key of [
  ...Object.keys(ITEMS),
  "td-grass",
  "td-dirt",
  "td-concrete",
  "td-asphalt",
  "td-floor",
  "td-building-0",
  "td-building-1",
  "td-building-2",
  "td-building-3",
  "td-tree-0",
  "td-rubble",
  "td-bush",
  "td-bed",
  "td-pallet",
  "td-bench",
  "td-streetlamp",
  "ui-craft",
  "ui-inventory",
  "ui-build",
  "ui-skills",
  "ui-journal",
  "ui-map",
  "ui-chat",
  "ui-fists",

  ...Object.keys(PIECES).flatMap((k) =>
    ["intact", "damaged", "breached"].map((s) => k + "-" + s),
  ),
  "shelter",
  "shop",
  "dumpster",
  "caretaker",
  "trader",
  "shopkeeper",
  "hostile",
  "loot",
  "health",
  "hunger",
  "thirst",
  "energy",
  "temperature",
  "inventory",
  "build",
  "interact",
  "chat",
  "hit",
  "muzzle",
  "impact",
  "construction",
  "debris",
])
  assert(assets[key], `Missing ${key}`);
for (const [key, a] of Object.entries(assets) as [string, any][]) {
  const image = sharp(new URL(a.file, root).pathname);
  const m = await image.metadata();
  assert.equal(m.width, a.width, key);
  assert.equal(m.height, a.height, key);
  assert(m.hasAlpha, key);
  assert.equal(
    a.frames,
    ((a.width / a.frameWidth) * a.height) / a.frameHeight,
    key,
  );
  assert(a.anchor.x >= 0 && a.anchor.y <= 1, key);
  if (key.startsWith("player-")) {
    assert.equal(a.frameWidth, 128);
    assert.equal(a.frames, 64);
    assert.equal(Object.keys(a.animations).length, 8);
    for (const v of Object.values(a.animations) as any[])
      assert(v.start >= 0 && v.end < a.frames && v.fps > 0);
    const { data } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert(
      data.some((_, i) => i % 4 === 3 && data[i] === 0),
      "Real transparent pixels required",
    );
    for (let frame = 0; frame < a.frames; frame++) {
      const left = (frame % (a.width / 128)) * 128,
        top = Math.floor(frame / (a.width / 128)) * 128;
      let visible = 0;
      for (let y = 4; y < 124; y += 4)
        for (let x = 4; x < 124; x += 4)
          if (data[((top + y) * a.width + left + x) * 4 + 3] > 0) visible++;
      assert(visible > 0, `${key} frame ${frame} is empty or clipped`);
    }
  }
}
console.log(
  `Validated ${Object.keys(assets).length} images, dimensions, alpha, cells, animations and required keys.`,
);

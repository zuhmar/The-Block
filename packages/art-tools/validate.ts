import { readFile } from "node:fs/promises";
import sharp from "sharp";
import assert from "node:assert/strict";
import { ITEMS, PIECES, BUILD_KINDS } from "../shared/src/index.js";
import { LOOT_CRATES } from "../game-data/loot-crates.js";
const root = new URL("../../apps/client/public/assets/", import.meta.url);
const { assets, version, view } = JSON.parse(
  await readFile(new URL("manifest.json", root), "utf8"),
);
assert.equal(version, 2);
assert.equal(view, "top-down");
for (const weapon of ["fists", "pistol", "bat"])
  for (const direction of ["south", "north", "east", "west"]) {
    const key = `player-stick-${weapon === "fists" ? "" : weapon + "-"}${direction}`;
    assert.equal(assets[key]?.source, "ai-generated", key);
    assert.equal(assets[key]?.equipment, weapon, key);
    if (weapon !== "fists")
      for (const state of ["idle", "walk", "run", "crouch", "hurt"])
        assert(
          assets[key].stateSources[state].file.includes(weapon) ||
            assets[key].stateSources[state].file === "stick-armed-base.png",
          `${key}/${state} must retain equipped-weapon artwork`,
        );
  }
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
const worldPack = JSON.parse(
  await readFile(
    new URL("../../art/ai/world/manifest.json", import.meta.url),
    "utf8",
  ),
);
for (const sourceKey of Object.keys(worldPack.assets).filter(
  (key) =>
    ![
      "buildings-foundation",
      "buildings-wall",
      "buildings-door",
      "buildings-storage-chest",
    ].includes(key),
))
  assert(
    Object.values(assets).some(
      (a: any) => a.source === "ai-generated" && a.sourceAsset === sourceKey,
    ),
    `Missing runtime mapping for ${sourceKey}`,
  );
for (const kind of BUILD_KINDS)
  for (const [row, state] of ["intact", "damaged", "breached"].entries()) {
    const asset = assets[`${kind}-${state}`];
    assert.equal(asset.sourceGroup, "construction");
    assert.equal(
      asset.sourceCell.row,
      row,
      "Actual AI damage-state art is required",
    );
    assert.deepEqual(asset.anchor, { x: 0.5, y: 0.5 });
  }
for (const item of Object.keys(ITEMS))
  assert.equal(assets[item].source, "ai-generated", item);
for (const crate of LOOT_CRATES) {
  const key = `loot-crate-${crate.id}`;
  assert.equal(assets[key]?.sourceGroup, "loot-crates", key);
  if (crate.id === "military")
    assert(
      assets[key].width / assets[key].height >= 3,
      "Military cache must be long and skinny",
    );
  if (crate.id === "advanced")
    assert(
      assets[key].width / assets[key].height >= 1.7 &&
        assets[key].width / assets[key].height < 3,
      "Advanced cache must be long and thick",
    );
  const stats = await sharp(new URL(assets[key].file, root).pathname).stats();
  assert(
    stats.channels[3].min === 0 && stats.channels[3].max > 180,
    `${key} needs real transparent padding and visible artwork`,
  );
}
for (const direction of ["south", "north", "east", "west"]) {
  const dog = assets[`dog-stray-${direction}`];
  assert.equal(dog?.sourceGroup, "wildlife");
  assert.equal(dog.frames, 48);
  const dogAlpha = await sharp(new URL(dog.file, root).pathname).stats();
  assert.equal(dogAlpha.channels[3].min, 0);
  for (const state of ["idle", "walk", "run", "attack", "hurt", "death"])
    assert(dog.animations[state], `Missing dog ${state}`);
}
for (const key of [
  "projectile-bullet",
  "fx-muzzle",
  "fx-bullet-impact",
  "fx-bite",
])
  assert.equal(assets[key]?.sourceGroup, "combat-effects", key);
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

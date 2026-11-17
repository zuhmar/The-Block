import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mapObjects } from "../packages/shared/src/terrain.js";
import {
  propVisual,
  sceneryVisual,
  usesSceneryVisual,
} from "../packages/game-data/map-visuals.js";

test("scenery preserves proportions inside existing placement envelopes and keeps tree/lamp bases fixed", async () => {
  const { assets } = JSON.parse(
    await readFile("apps/client/public/assets/manifest.json", "utf8"),
  );
  for (const raw of mapObjects()) {
    const o = propVisual(raw);
    if (!o || !usesSceneryVisual(o)) continue;
    const f = assets[o.asset],
      b = f.contentBounds;
    assert.ok(b && b.width > 0 && b.height > 0, o.id);
    const v = sceneryVisual(o, f),
      scale = v.width / f.width;
    assert.ok(
      Math.abs(scale - v.height / f.height) < 1e-9,
      o.id + " uniform scale",
    );
    const left = v.x - v.originX * v.width + b.x * scale,
      top = v.y - v.originY * v.height + b.y * scale;
    const tree = o.kind === "tree",
      lamp = o.asset === "map-prop-4";
    const width = tree ? 128 : raw.width,
      height = tree ? 158 : raw.height,
      centerY = tree ? raw.y - 60 : raw.y;
    assert.ok(
      left >= raw.x - width / 2 - 1e-6 &&
        left + b.width * scale <= raw.x + width / 2 + 1e-6,
      o.id + " horizontal envelope",
    );
    assert.ok(
      top >= centerY - height / 2 - 1e-6 &&
        top + b.height * scale <= centerY + height / 2 + 1e-6,
      o.id + " vertical envelope",
    );
    if (tree || lamp)
      assert.ok(
        Math.abs(
          top + b.height * scale - (tree ? raw.y + 19 : raw.y + raw.height / 2),
        ) < 1e-6,
        o.id + " base",
      );
    if (raw.asset === "map-prop-6") assert.equal(o.asset, "map-street-sedan");
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DISTRICTS } from "../packages/shared/src/official-map.js";
import { mapObjects } from "../packages/shared/src/terrain.js";
import { districtFrontage } from "../packages/game-data/district-frontage.js";

test("district dressing reduces repeated frontage and preserves authored/physical scenery and placement cells", async () => {
  const raw = mapObjects(),
    before = JSON.stringify(raw),
    { assets } = JSON.parse(
      await readFile("apps/client/public/assets/manifest.json", "utf8"),
    );
  for (const o of raw) {
    const v = districtFrontage(o);
    if (o.solid || o.id.startsWith("market-") || o.id.startsWith("court-"))
      assert.equal(v, undefined, o.id);
    if (v) {
      assert.equal(v.x, o.x);
      assert.equal(v.y, o.y);
      assert.ok(v.width <= o.width && v.height <= o.height);
      assert.ok(assets[v.asset], v.asset);
    }
  }
  for (const d of DISTRICTS) {
    const objects = raw.filter(
      (o) =>
        o.id.startsWith("streetscape-") &&
        o.x >= d.x &&
        o.x < d.x + d.width &&
        o.y >= d.y &&
        o.y < d.y + d.height,
    );
    const shown = objects.map(districtFrontage).filter(Boolean);
    assert.ok(
      shown.length > 0 && shown.length < objects.length * 0.8,
      d.id + " deliberate open frontage",
    );
    if (d.id !== "uptown")
      assert.ok(
        new Set(shown.map((o) => o!.asset)).size >= 2,
        d.id + " variety",
      );
  }
  assert.equal(
    JSON.stringify(raw),
    before,
    "presentation leaves world objects unchanged",
  );
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  renderProfile,
  defaultViewZoom,
  viewZoom,
} from "../apps/client/src/render-quality.js";
test("render density sharpens retina screens without changing CSS viewport or allowing unbounded buffers", () => {
  assert.deepEqual(renderProfile(390, 844, 3), {
    ratio: 2,
    width: 780,
    height: 1688,
  });
  assert.deepEqual(renderProfile(1360, 900, 1), {
    ratio: 1,
    width: 1360,
    height: 900,
  });
  const large = renderProfile(1920, 1080, 3);
  assert(large.ratio > 1 && large.width * large.height <= 6_000_000);
  assert.equal(defaultViewZoom(390), 0.9);
  assert.equal(defaultViewZoom(1360), 1);
  assert.equal(viewZoom(2, 2, 100), viewZoom(1, 1, 100));
  assert.equal(viewZoom(2, 2, -10000), 1.45);
  assert.equal(viewZoom(2, 2, 10000), 0.65);
  assert(viewZoom(1, 1, 1) < 1, "small trackpad deltas must remain responsive");
});

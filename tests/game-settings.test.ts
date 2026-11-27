import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SETTINGS,
  readGameSettings,
  settingsPixelRatio,
} from "../apps/client/src/fps/settings";
test("invalid saved preferences cannot create unsafe camera, render or control values", () => {
  for (const raw of [null, "{bad", "null", "[]", "false"])
    assert.deepEqual(readGameSettings(raw), DEFAULT_SETTINGS);
  const bad = readGameSettings(
    JSON.stringify({
      fov: 400,
      sensitivity: -10,
      quality: "ultra",
      crosshair: "no",
      headBob: null,
      invertY: 1,
    }),
  );
  assert.equal(bad.fov, 100);
  assert.equal(bad.sensitivity, 0.25);
  assert.equal(bad.quality, "balanced");
  assert.equal(bad.crosshair, true);
  assert.equal(bad.headBob, true);
  assert.equal(bad.invertY, false);
  assert.equal(readGameSettings('{"fov":"80","sensitivity":null}').fov, 72);
});
test("valid settings roundtrip without changing defaults or saved game fields", () => {
  const value = {
    sensitivity: 1.75,
    crosshair: false,
    fov: 95,
    quality: "low" as const,
    invertY: true,
    headBob: false,
  };
  assert.deepEqual(readGameSettings(JSON.stringify(value)), value);
  assert.equal(DEFAULT_SETTINGS.fov, 72);
  assert.equal(DEFAULT_SETTINGS.crosshair, true);
  assert.deepEqual(
    readGameSettings(
      JSON.stringify({ ...value, wood: 999999, inventory: { slots: [] } }),
    ),
    value,
  );
});
test("render resolution respects phone budgets and device resolution", () => {
  assert.equal(settingsPixelRatio(3, true, "balanced"), 1.25);
  assert.equal(settingsPixelRatio(3, false, "balanced"), 1.5);
  assert.equal(settingsPixelRatio(3, true, "high"), 1.75);
  assert.equal(settingsPixelRatio(3, false, "high"), 2);
  assert.equal(settingsPixelRatio(3, true, "low"), 0.75);
  assert.equal(settingsPixelRatio(1, false, "high"), 1);
  assert.equal(settingsPixelRatio(NaN, true, "balanced"), 1);
});

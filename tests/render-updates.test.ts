import test from "node:test";
import assert from "node:assert/strict";
import {
  setLabelColor,
  setHudHTML,
  meterWidth,
} from "../apps/client/src/render-updates.js";

test("unchanged label colors do not redraw/upload text textures", () => {
  let uploads = 0;
  const label = {
    style: { color: "#fff" },
    setColor(color: string) {
      this.style.color = color;
      uploads++;
    },
  };
  for (let frame = 0; frame < 120; frame++) setLabelColor(label, "#fff");
  assert.equal(uploads, 0);
  setLabelColor(label, "#aaa");
  setLabelColor(label, "#aaa");
  assert.equal(uploads, 1);
});

test("HUD updates retain controls until their displayed state changes", () => {
  let replacements = 0;
  const element = {
    set innerHTML(_html: string) {
      replacements++;
    },
  } as HTMLElement;
  for (let tick = 0; tick < 100; tick++) setHudHTML(element, "connected");
  assert.equal(replacements, 1);
  setHudHTML(element, "disconnected");
  setHudHTML(element, "connected");
  assert.equal(replacements, 3);
  assert.equal(meterWidth(99.999), 100);
  assert.equal(meterWidth(-1), 0);
  assert.equal(meterWidth(101), 100);
  assert.equal(meterWidth(52.34), 52.3);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MapHistory,
  makeObject,
  validateMap,
  validateGlb,
  coastValid,
  type MapDocument,
} from "../apps/client/src/editor/document";
import { exportBundle, importBundle } from "../apps/client/src/editor/storage";
import { COASTLINE } from "../apps/client/src/fps/coast";
const known = new Set(["box"]);
function map(): MapDocument {
  return {
    format: "street-survival-map",
    version: 1,
    name: "Test",
    worldSize: 640,
    coast: COASTLINE.filter((_, i) => i % 16 === 0).map((p) => ({ ...p })),
    objects: [makeObject("box", "Box", "Props")],
    assets: [],
  };
}
function glb(
  json: unknown = { asset: { version: "2.0" }, scenes: [{}], scene: 0 },
) {
  const text = JSON.stringify(json),
    padding = (4 - (text.length % 4)) % 4,
    data = new TextEncoder().encode(text + " ".repeat(padding)),
    out = new ArrayBuffer(20 + data.length),
    v = new DataView(out);
  v.setUint32(0, 0x46546c67, true);
  v.setUint32(4, 2, true);
  v.setUint32(8, out.byteLength, true);
  v.setUint32(12, data.length, true);
  v.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(out, 20).set(data);
  return out;
}
test("editor validates the natural island and returns isolated data", () => {
  const d = map(),
    result = validateMap(d, known);
  result.objects[0].x = 20;
  assert.equal(d.objects[0].x, 0);
  assert.ok(coastValid(d.coast));
});
test("editor rejects malformed transforms, duplicate IDs and unavailable models", () => {
  for (const mutate of [
    (d: MapDocument) => (d.objects[0].x = Infinity),
    (d: MapDocument) => (d.objects[0].scale[1] = 0),
    (d: MapDocument) => d.objects.push({ ...d.objects[0] }),
    (d: MapDocument) => (d.objects[0].asset = "unavailable"),
    (d: MapDocument) => (d.objects[0].lootTier = 2.5),
    (d: MapDocument) => (d.objects[0].y = 81),
  ]) {
    const d = map();
    mutate(d);
    assert.throws(() => validateMap(d, known));
  }
});
test("editor rejects crossing shoreline and oversized object lists", () => {
  const d = map();
  [d.coast[5], d.coast[50]] = [d.coast[50], d.coast[5]];
  assert.throws(() => validateMap(d, known));
  const huge = map();
  huge.objects = Array.from({ length: 2001 }, () =>
    makeObject("box", "Box", "Props"),
  );
  assert.throws(() => validateMap(huge, known));
});
test("undo and redo restore complete map snapshots; edits invalidate redo", () => {
  const h = new MapHistory(),
    a = map(),
    b = structuredClone(a);
  b.objects[0].x = 10;
  h.commit(a);
  const restored = h.undo(b)!;
  assert.equal(restored.objects[0].x, 0);
  assert.equal(h.redo(restored)!.objects[0].x, 10);
  h.undo(b);
  h.commit(a);
  assert.equal(h.canRedo, false);
});
test("ZIP roundtrip retains custom GLB bytes and rejects missing models", () => {
  const d = map(),
    bytes = glb(),
    id = "custom:example";
  d.assets = [{ id, name: "Custom", bytes: bytes.byteLength }];
  d.objects.push(makeObject(id, "Imported", "Props"));
  const bundle = exportBundle(d, new Map([[id, bytes]])),
    result = importBundle(bundle, known);
  assert.deepEqual(result.doc, d);
  assert.deepEqual(result.assets.get(id), bytes);
  assert.throws(() => exportBundle(d, new Map()));
});
test("GLB validation rejects external resources and broken headers", () => {
  assert.doesNotThrow(() => validateGlb(glb()));
  assert.throws(() =>
    validateGlb(
      glb({
        asset: { version: "2.0" },
        images: [{ uri: "https://example.com/image.png" }],
      }),
    ),
  );
  const bytes = glb();
  new DataView(bytes).setUint32(8, 0, true);
  assert.throws(() => validateGlb(bytes));
});

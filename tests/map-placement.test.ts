import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fitDetailProps,
  groundFootprint,
  PlacementGrid,
  isFixedScenery,
  gridEnvelope,
  routeFootprints,
} from "../packages/shared/src/map-placement.js";
import {
  mapObjects,
  buildingWalkways,
} from "../packages/shared/src/terrain.js";
import {
  BUILDINGS,
  SERVICE_POINTS,
  type MapObject,
} from "../packages/shared/src/official-map.js";

test("detail props find separate grid cells and omit when no space remains", () => {
  const prop = (id: string): MapObject => ({
    id,
    asset: "map-prop-0",
    kind: "decoration",
    x: 31,
    y: 31,
    width: 32,
    height: 32,
    solid: true,
  });
  const result = fitDetailProps(
    [prop("a"), prop("b"), prop("c")],
    [],
    (r) => r.x < 0 || r.y < 0 || r.x + r.width > 64 || r.y + r.height > 32,
  );
  assert.equal(result.objects.length, 2);
  assert.equal(result.report.omitted.length, 1);
  const grid = new PlacementGrid();
  for (const o of result.objects) {
    assert.equal(o.x % 16, 0);
    assert.equal(o.y % 16, 0);
    assert.equal(grid.overlaps(groundFootprint(o)), false);
    grid.reserve(groundFootprint(o));
  }
});
test("lamp reservation follows its base rather than its tall artwork", () => {
  const lamp = {
    id: "lamp",
    asset: "map-prop-4",
    kind: "decoration",
    x: 100,
    y: 100,
    width: 40,
    height: 100,
    solid: false,
  } as MapObject;
  assert.deepEqual(groundFootprint(lamp), {
    x: 88,
    y: 134,
    width: 24,
    height: 16,
  });
});
test("official scenery reserves non-overlapping detail cells outside building footprints", () => {
  const objects = mapObjects(),
    grid = new PlacementGrid();
  for (const b of BUILDINGS)
    grid.reserve(
      gridEnvelope(
        {
          x: b.x - b.width / 2,
          y: b.y - b.height / 2,
          width: b.width,
          height: b.height,
        },
        64,
      ),
    );
  for (const p of SERVICE_POINTS)
    grid.reserve(
      gridEnvelope({ x: p.x - 64, y: p.y - 64, width: 128, height: 128 }),
    );
  for (const route of buildingWalkways())
    for (const rect of routeFootprints(route.points, route.width))
      grid.reserve(rect);
  for (const o of objects.filter(isFixedScenery))
    grid.reserve(groundFootprint(o));
  for (const o of objects.filter((o) => !isFixedScenery(o))) {
    const r = groundFootprint(o);
    assert.equal((r.x + r.width / 2) % 16, 0, o.id);
    assert.equal((r.y + r.height / 2) % 16, 0, o.id);
    assert.equal(grid.overlaps(r), false, o.id);
    grid.reserve(r);
  }
  assert.ok(buildingWalkways().length > 150);
  assert.ok(objects.some((o) => o.id === "market-fountain"));
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  neighborhoodPaths,
  neighborhoodPathEnabled,
  pathRects,
} from "../packages/game-data/neighborhood-paths.js";
import { BUILDINGS } from "../packages/shared/src/official-map.js";
import {
  mapObjects,
  roadOverlapsRect,
  terrainRectBlocked,
  setMapReservations,
} from "../packages/shared/src/terrain.js";
import { propVisual } from "../packages/game-data/map-visuals.js";
import {
  groundFootprint,
  type PlacementRect,
} from "../packages/shared/src/map-placement.js";
const overlap = (a: PlacementRect, b: PlacementRect) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

test("block connections use clear grid-aligned circulation without changing world objects", () => {
  const objects = mapObjects(),
    original = JSON.stringify(objects),
    paths = neighborhoodPaths(),
    degree = new Map<string, number>();
  assert.ok(paths.length >= 20 && paths.length <= 100);
  for (const d of ["the-block", "projects", "industrial", "uptown"])
    assert.ok(
      paths.some((p) => p.district === d),
      d,
    );
  for (const p of paths) {
    for (const b of p.buildings) degree.set(b.id, (degree.get(b.id) || 0) + 1);
    for (const [i, point] of p.points.entries()) {
      assert.equal(point.x % 16, 0);
      assert.equal(point.y % 16, 0);
      if (i)
        assert.ok(
          point.x === p.points[i - 1].x || point.y === p.points[i - 1].y,
        );
    }
    for (const r of pathRects(p.points, p.width + 8)) {
      assert.equal(roadOverlapsRect(r, 12), false, p.id + " road");
      assert.equal(terrainRectBlocked(r), false, p.id + " terrain");
      for (const b of BUILDINGS)
        assert.equal(
          overlap(r, {
            x: b.x - b.width / 2 - 8,
            y: b.y - b.height / 2 - 8,
            width: b.width + 16,
            height: b.height + 16,
          }),
          false,
          p.id + " building",
        );
      for (const raw of objects) {
        const o = propVisual(raw);
        if (o && !["mountain", "cliff", "waterfall"].includes(o.kind))
          assert.equal(
            overlap(r, groundFootprint(o)),
            false,
            p.id + " " + o.id,
          );
      }
    }
    for (const [i, end] of [p.points[0], p.points.at(-1)!].entries()) {
      const b = p.buildings[i];
      assert.ok(Math.abs(end.x - b.x) <= 8);
      assert.ok(end.y - b.y - b.height / 2 <= p.width / 2 + 40);
    }
  }
  assert.ok(
    [...degree.values()].every((d) => d <= 2),
    "limited connections preserve broad lawns",
  );
  assert.equal(JSON.stringify(objects), original);
});

test("new paths yield to saved building reservations", () => {
  const p = neighborhoodPaths()[0];
  assert.equal(neighborhoodPathEnabled(p), true);
  const point = p.points[0];
  try {
    setMapReservations([
      { x: point.x - 32, y: point.y - 32, width: 64, height: 64 },
    ]);
    assert.equal(neighborhoodPathEnabled(p), false);
  } finally {
    setMapReservations([]);
  }
  assert.equal(neighborhoodPathEnabled(p), true);
});

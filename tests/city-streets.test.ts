import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  configureCompactCity,
  cityPlotClear,
} from "../apps/client/src/fps/compact-city";
import { STREET_PLAN } from "../apps/client/src/fps/city-streets-layout";
import { createCityStreets } from "../apps/client/src/fps/city-streets-view";
import {
  CITY_PLOTS,
  RESOURCE_PARKS,
  inRect,
} from "../apps/client/src/fps/compact-plan";
import { CITY_FRONTAGES } from "../apps/client/src/fps/building-frontage";
import {
  blocked,
  segmentDistance,
  BUILDINGS,
  LOOT,
} from "../apps/client/src/fps/world";

test("street furniture preserves entrances, housing and resources, with matching physical collision", () => {
  const undo = configureCompactCity();
  try {
    assert.ok(STREET_PLAN.props.filter((p) => p.kind === "lamp").length >= 50);
    assert.ok(CITY_PLOTS.every(cityPlotClear));
    for (const p of STREET_PLAN.props) {
      assert.equal(blocked(p, []), true, p.kind + " collision");
      assert.ok(!CITY_PLOTS.some((r) => inRect(p, r, 0.7)));
      assert.ok(!RESOURCE_PARKS.some((r) => inRect(p, r, 0.4)));
      assert.ok(
        CITY_FRONTAGES.every((f) => segmentDistance(p, f.door, f.street) > 1.5),
      );
    }
  } finally {
    undo();
  }
  assert.equal(
    STREET_PLAN.props.length,
    0,
    "Legacy world must not retain invisible street obstacles",
  );
});

test("polished streets batch visual detail, repeat consistent pavement UVs and preserve world identities", () => {
  const undo = configureCompactCity();
  try {
    const buildings = BUILDINGS.map((b) => ({ ...b })),
      loot = LOOT.map((l) => ({ ...l }));
    const view = createCityStreets();
    assert.equal(view.stats.junctions, 30);
    assert.ok(view.stats.crossings >= 80);
    assert.ok(view.stats.drains > 100);
    assert.ok(view.stats.batches <= 25);
    assert.equal(view.proxy.children.length, STREET_PLAN.props.length);
    assert.deepEqual(BUILDINGS, buildings);
    assert.deepEqual(LOOT, loot);
    assert.ok(
      view.root.children
        .slice(2)
        .every((o) => o instanceof THREE.InstancedMesh),
    );
    for (const o of view.root.children.slice(0, 2)) {
      const g = (o as THREE.Mesh).geometry,
        position = g.getAttribute("position"),
        uv = g.getAttribute("uv");
      for (let i = 0; i < position.count; i++) {
        assert.ok(Math.abs(uv.getX(i) - position.getX(i) / 6) < 0.00001);
        assert.ok(Math.abs(uv.getY(i) - position.getZ(i) / 6) < 0.00001);
      }
    }
  } finally {
    undo();
  }
});

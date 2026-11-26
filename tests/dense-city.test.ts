import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  configureCompactCity,
  cityPlotClear,
} from "../apps/client/src/fps/compact-city";
import { BUILDINGS, LOOT } from "../apps/client/src/fps/world";
import {
  buildingFootprint,
  buildingStories,
  buildingBlocked,
} from "../apps/client/src/fps/building-layout";
import {
  CITY_PLOTS,
  RESOURCE_PARKS,
} from "../apps/client/src/fps/compact-plan";
import { CITY_FRONTAGES } from "../apps/client/src/fps/building-frontage";
import { createCityRowRender } from "../apps/client/src/fps/city-row-render";

test("dense street rows add full-size usable buildings while retaining all housing and resource areas", () => {
  const undo = configureCompactCity();
  try {
    const rows = BUILDINGS.filter((b) => b.name.startsWith("STREET ROW "));
    assert.equal(BUILDINGS.length, 75);
    assert.equal(rows.length, 24);
    assert.equal(rows.filter((b) => buildingStories(b) === 3).length, 18);
    assert.ok(CITY_PLOTS.every(cityPlotClear));
    for (const b of rows) {
      const f = buildingFootprint(b);
      assert.ok(CITY_FRONTAGES.some((c) => BUILDINGS[c.index] === b));
      for (const other of BUILDINGS.filter((o) => o !== b).map(
        buildingFootprint,
      ))
        assert.ok(
          Math.abs(f.x - other.x) >= (f.width + other.width) / 2 + 1.5 ||
            Math.abs(f.z - other.z) >= (f.depth + other.depth) / 2 + 1.5,
          b.name + " alley clearance",
        );
      for (const r of RESOURCE_PARKS)
        assert.ok(
          Math.abs(f.x - r.x) >= (f.width + r.width) / 2 + 1.5 ||
            Math.abs(f.z - r.z) >= (f.depth + r.depth) / 2 + 1.5,
          b.name + " resource clearance",
        );
    }
    const caches = LOOT.filter((l) => l.name === "Street row supplies");
    assert.equal(caches.length, 24);
    for (const cache of caches)
      assert.equal(
        buildingBlocked(cache),
        false,
        "Loot remains clear of furniture and partitions",
      );
  } finally {
    undo();
  }
});

test("distant rows share draw batches, omit interiors and switch to full buildings on approach", () => {
  const undo = configureCompactCity();
  try {
    const geometry = new THREE.BoxGeometry(1, 1, 1),
      material = new THREE.MeshBasicMaterial();
    const models = BUILDINGS.map((b) => {
      const root = new THREE.Group();
      root.position.set(b.x, 0, b.z);
      const exterior = new THREE.Mesh(geometry, material);
      root.add(exterior);
      const interior = new THREE.Mesh(geometry, material);
      interior.userData.interiorBuilding = 1;
      root.add(interior);
      return { root };
    });
    const view = createCityRowRender(models);
    assert.equal(view.rows, 24);
    assert.equal(view.batches, 1);
    assert.equal(view.instances, 24);
    const first = BUILDINGS.findIndex((b) => b.name === "STREET ROW 1"),
      b = BUILDINGS[first];
    view.update(b);
    assert.equal(models[first].root.visible, true);
    view.update({ x: b.x + 60, z: b.z });
    assert.equal(models[first].root.visible, false);
    const batch = view.root.children[0] as THREE.InstancedMesh,
      m = new THREE.Matrix4();
    batch.getMatrixAt(0, m);
    assert.ok(m.determinant() > 0.9);
    assert.ok(
      batch.boundingSphere!.containsPoint(new THREE.Vector3(b.x, 0, b.z)),
    );
    view.update({ x: 1000, z: 1000 });
    batch.getMatrixAt(0, m);
    assert.equal(m.determinant(), 0);
  } finally {
    undo();
  }
});

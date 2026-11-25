import * as THREE from "three";
import { primitiveModel } from "../apps/client/src/editor/primitives";
import test from "node:test";
import assert from "node:assert/strict";
import {
  configureCompactCity,
  migrateCompactSave,
  cityPlotClear,
} from "../apps/client/src/fps/compact-city";
import {
  COMPACT,
  CITY_PLOTS,
  RESOURCE_PARKS,
  JAIL_BRIDGE,
  compactLand,
} from "../apps/client/src/fps/compact-plan";
import {
  BUILDINGS,
  ROADS,
  START,
  LOOT,
  blocked,
  blockedTerrain,
  readSave,
  type Piece,
} from "../apps/client/src/fps/world";
import {
  frontOf,
  fixtures,
  partitions,
  doorAngles,
} from "../apps/client/src/fps/building-layout";
import {
  createHousingPlots,
  housingPlacementReason,
} from "../apps/client/src/fps/housing";
import { newSurvival } from "../apps/client/src/fps/survival-state";
import { ResourceWorld } from "../apps/client/src/fps/resource-world";
import { COMPOUND_PATROLS } from "../apps/client/src/fps/military-compound";
import { labEncounters } from "../apps/client/src/fps/lab-enemies";
test("compact city has connected clear street blocks, a genuinely separated jail island and safe infill housing", () => {
  const undo = configureCompactCity();
  try {
    assert.equal(BUILDINGS.length, 36);
    assert.deepEqual(START, { x: 0, z: -110 });
    assert.equal(CITY_PLOTS.length, 12);
    assert.ok(CITY_PLOTS.every(cityPlotClear));
    for (let i = 0; i < BUILDINGS.length; i++) {
      const a = BUILDINGS[i];
      assert.ok(fixtures(i));
      assert.ok(partitions(i));
      assert.equal(typeof doorAngles[i], "number");
      for (const b of BUILDINGS.slice(i + 1))
        assert.ok(
          Math.abs(a.x - b.x) >= (a.width + b.width) / 2 ||
            Math.abs(a.z - b.z) >= (a.depth + b.depth) / 2,
          `${a.name}/${b.name}`,
        );
    }
    for (const road of ROADS)
      for (let i = 1; i < road.length; i++)
        for (let t = 0; t <= 1; t += 0.02) {
          const a = road[i - 1],
            b = road[i];
          assert.equal(
            blocked({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, []),
            false,
            "Street collision",
          );
        }
    for (let z = START.z; z <= -70; z += 0.2)
      assert.equal(blocked({ x: 0, z }, []), false, "Jail exit to city");
    assert.equal(compactLand({ x: 12, z: -88 }), false);
    assert.equal(blockedTerrain({ x: 12, z: -88 }), true);
    assert.equal(blockedTerrain({ x: 0, z: -88 }), false);
    assert.equal(blockedTerrain({ x: 220, z: 0 }), true);
    assert.equal(JAIL_BRIDGE.width, 8);
    for (const plot of CITY_PLOTS) {
      assert.ok(
        BUILDINGS.some((b) => Math.hypot(b.x - plot.x, b.z - plot.z) < 45),
        "Each plot has building neighbors",
      );
      assert.ok(
        !RESOURCE_PARKS.some(
          (p) =>
            Math.abs(p.x - plot.x) < (p.width + plot.width) / 2 &&
            Math.abs(p.z - plot.z) < (p.depth + plot.depth) / 2,
        ),
      );
    }
  } finally {
    undo();
  }
  assert.equal(COMPACT.active, false);
  assert.deepEqual(START, { x: 0, z: 14 });
});
test("relocated districts retain building-front orientation, loot alignment and unblocked guard patrols", () => {
  const source = BUILDINGS.map((b) => ({ ...b, front: frontOf(b) })),
    oldLoot = LOOT.map((l) => ({ ...l }));
  const undo = configureCompactCity();
  try {
    for (let i = 0; i < source.length; i++)
      assert.equal(frontOf(BUILDINGS[i]), source[i].front);
    for (let i = 0; i < oldLoot.length; i++) {
      const old = oldLoot[i],
        owner = source.find(
          (b) =>
            Math.abs(b.x - old.x) < b.width / 2 &&
            Math.abs(b.z - old.z) < b.depth / 2,
        );
      if (owner) {
        const b = BUILDINGS[source.indexOf(owner)];
        assert.ok(Math.abs(LOOT[i].x - b.x - (old.x - owner.x)) < 0.001);
        assert.ok(Math.abs(LOOT[i].z - b.z - (old.z - owner.z)) < 0.001);
      }
    }
    for (const spec of [
      ...COMPOUND_PATROLS,
      ...labEncounters().map((e) => e.patrol),
    ])
      for (let i = 0; i < spec.points.length; i++) {
        const a = spec.points[i],
          b = spec.points[(i + 1) % spec.points.length];
        for (let t = 0; t <= 1; t += 0.025)
          assert.equal(
            blocked({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, []),
            false,
            spec.id,
          );
      }
    const world = new ResourceWorld(
      () => [],
      undefined,
      10000,
      (() => {
        let n = 73;
        return () => (n = (n * 1664525 + 1013904223) >>> 0) / 4294967296;
      })(),
    );
    for (const kind of ["node-rock", "node-sulfur", "node-metal"])
      assert.equal(
        world.entities.filter((r) => r.kind === kind && r.health > 0).length,
        25,
      );
    assert.ok(
      world.entities.filter((r) => r.kind.startsWith("tree") && r.health > 0)
        .length >= 12,
    );
  } finally {
    undo();
  }
});
test("a purchased home migrates intact once, retaining plot identity, health, stored weapon magazines and upkeep", () => {
  const save = readSave(null);
  save.survival = newSurvival();
  save.survival.plots = createHousingPlots([]);
  const p = save.survival.plots[2];
  save.survival.lease = {
    plotId: p.id,
    boughtAt: 10000,
    paidUntil: 9999999999999,
  };
  save.survival.cash = 123;
  save.pieces = [
    {
      id: "base",
      kind: "foundation",
      x: p.x,
      z: p.z,
      rotation: 0,
      health: 100,
    },
    {
      id: "chest",
      kind: "storage",
      x: p.x + 2,
      z: p.z,
      y: 0.5,
      rotation: 0,
      contents: [
        { id: "stored-gun", kind: "pistol", quantity: 1, magazine: 3 },
      ],
    },
  ];
  const deadline = save.survival.lease.paidUntil;
  const undo = configureCompactCity();
  try {
    migrateCompactSave(save);
    const plot = save.survival.plots.find((a) => a.id === p.id)!;
    assert.equal(save.pieces[0].x, plot.x);
    assert.equal(save.pieces[0].z, plot.z);
    assert.equal(save.pieces[1].x, plot.x + 2);
    assert.equal(save.pieces[1].contents![0]!.magazine, 3);
    assert.equal(save.survival.cash, 123);
    assert.equal(save.survival.lease!.paidUntil, deadline);
    assert.equal(
      housingPlacementReason(
        save.survival,
        { kind: "foundation", x: plot.x + 6, z: plot.z, rotation: 0 },
        save.pieces,
        10000,
      ),
      "",
    );
    const copy = JSON.stringify(save);
    migrateCompactSave(save);
    assert.equal(JSON.stringify(save), copy);
    const restored = readSave(copy);
    assert.equal(restored.survival!.mapVersion, 2);
  } finally {
    undo();
  }
});
test("legacy structures stay whole on reserved infill lots, and oversized saves can retain their original world", () => {
  const save = readSave(null);
  save.pieces = [
    { id: "old", kind: "foundation", x: 150, z: 150, rotation: 0 },
  ];
  let undo = configureCompactCity();
  try {
    migrateCompactSave(save);
    assert.equal(save.pieces.length, 1);
    assert.ok(
      CITY_PLOTS.some(
        (p) => p.x === save.pieces[0].x && p.z === save.pieces[0].z,
      ),
    );
    assert.equal(save.survival!.plots.length, 11);
  } finally {
    undo();
  }
  const oversized = readSave(null);
  oversized.pieces = Array.from(
    { length: 100 },
    (_, i) =>
      ({
        id: "old-" + i,
        kind: "foundation",
        x: -200 + i * 4,
        z: 180,
        rotation: 0,
      }) as Piece,
  );
  const raw = JSON.stringify(oversized);
  undo = configureCompactCity();
  try {
    assert.throws(
      () => migrateCompactSave(structuredClone(oversized)),
      /larger parcel/,
    );
  } finally {
    undo();
  }
  assert.equal(JSON.stringify(oversized), raw);
  assert.equal(COMPACT.active, false);
});

test("editor ground and housing prefabs contain no fallback spawn marker", () => {
  for (const kind of ["jail-island", "housing-plot"]) {
    const bounds = new THREE.Box3().setFromObject(primitiveModel(kind));
    assert.ok(bounds.max.y < 0.1);
    assert.ok(bounds.getSize(new THREE.Vector3()).x < 1.1);
  }
});

test("legacy asymmetric bases preserve the two-metre construction grid", () => {
  const save = readSave(null);
  save.pieces = [
    { id: "base", kind: "foundation", x: 150, z: 150, rotation: 0 },
    { id: "edge", kind: "wall", x: 150, z: 151, rotation: 0 },
  ];
  const undo = configureCompactCity();
  try {
    migrateCompactSave(save);
    assert.equal(save.pieces[0].x % 2, 0);
    assert.equal(save.pieces[0].z % 2, 0);
    assert.equal(save.pieces[1].z - save.pieces[0].z, 1);
  } finally {
    undo();
  }
});

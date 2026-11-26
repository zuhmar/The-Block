import test from "node:test";
import assert from "node:assert/strict";
import { configureCompactCity } from "../apps/client/src/fps/compact-city";
import {
  TIMBER_YARD,
  timberColliders,
  timberProps,
} from "../apps/client/src/fps/timber-yard-layout";
import {
  blocked,
  movePlayer,
  surfaceHeight,
  ceilingHeight,
  BUILDINGS,
  LOOT,
  ROADS,
} from "../apps/client/src/fps/world";
import { frontOf, buildingWorld } from "../apps/client/src/fps/building-layout";
import { ResourceWorld } from "../apps/client/src/fps/resource-world";
import { jailGate } from "../apps/client/src/fps/jail-ground-layout";

test("lumberyard entrances connect to city roads, shed remains enterable and props provide cover", () => {
  const undo = configureCompactCity();
  try {
    const point = (x: number, z: number) => ({
      x: x + TIMBER_YARD.x,
      z: z + TIMBER_YARD.z,
    });
    // Check complete routes from three external street connections through the open gates.
    for (const route of [
      [
        [0, 22],
        [0, 4],
      ],
      [
        [-28, 0],
        [-3, 0],
      ],
      [
        [20, 22],
        [20, 0],
        [12, 0],
      ],
    ])
      for (let i = 1; i < route.length; i++) {
        const a = route[i - 1],
          b = route[i],
          end = movePlayer(point(a[0], a[1]), b[0] - a[0], b[1] - a[1], []);
        assert.ok(
          Math.hypot(end.x - point(b[0], b[1]).x, end.z - point(b[0], b[1]).z) <
            0.001,
          JSON.stringify(route),
        );
      }
    for (let z = -6; z >= -8; z -= 0.1)
      assert.equal(blocked(point(9, z), [], 0.03), false, "Shed entrance");
    assert.equal(surfaceHeight(point(9, -8), [], 0.1), 0.03);
    assert.ok(ceilingHeight(point(9, -8), [], 0) > 3.3);
    assert.equal(blocked(point(-16, -8), []), true, "Fence collision");
    assert.equal(blocked(point(0, 0), []), true, "Capture terminal collision");
    assert.equal(new Set(timberProps.map((p) => p.asset)).size, 6);
    const resources = new ResourceWorld(() => []);
    assert.ok(
      resources.entities.some(
        (r) =>
          r.kind.startsWith("tree") &&
          r.health > 0 &&
          Math.abs(r.x - TIMBER_YARD.x) < 16 &&
          Math.abs(r.z - TIMBER_YARD.z) < 16,
      ),
      "Harvestable trees inside yard",
    );
    for (const r of resources.entities.filter((r) => r.health > 0))
      assert.ok(
        !timberColliders.some(
          (c) =>
            c.y < 1.9 &&
            Math.abs(r.x - c.x) < c.width / 2 + 0.35 &&
            Math.abs(r.z - c.z) < c.depth / 2 + 0.35,
        ),
        "Resource trunk overlaps prop",
      );
  } finally {
    undo();
  }
});

test("denser city keeps fine-grained road routes and infill entrances clear", () => {
  const before = LOOT.length,
    undo = configureCompactCity();
  try {
    jailGate.open = true;
    jailGate.angle = -Math.PI / 2;
    for (const road of ROADS)
      for (let i = 1; i < road.length; i++) {
        const a = road[i - 1],
          b = road[i],
          steps = Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / 0.25);
        for (let n = 0; n <= steps; n++)
          assert.equal(
            blocked(
              {
                x: a.x + ((b.x - a.x) * n) / steps,
                z: a.z + ((b.z - a.z) * n) / steps,
              },
              [],
            ),
            false,
            JSON.stringify(road),
          );
      }
    const added = BUILDINGS.filter((b) => b.name.startsWith("CITY BLOCK "));
    assert.ok(added.length >= 14);
    for (const b of added)
      assert.equal(
        blocked(
          buildingWorld(b, { x: 0, z: frontOf(b) * (b.depth / 2 + 0.7) }),
          [],
        ),
        false,
        b.name + " entrance apron",
      );
    assert.ok(LOOT.length > before);
  } finally {
    jailGate.open = false;
    jailGate.angle = 0;
    undo();
  }
});

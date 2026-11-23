import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  NORTH_LAB,
  NORTH_BUILDINGS,
  NORTH_PROPS,
  northBounds,
  northEntry,
  northYardBoxes,
  northBlocked,
  inNorthLab,
} from "../apps/client/src/fps/north-lab-layout";
import { NORTH_ROAD } from "../apps/client/src/fps/north-road";
import {
  MAP_SIZE,
  LOOT,
  START,
  configureWestRoad,
  ROADS,
  blocked,
  readSave,
  placementReason,
  type Piece,
} from "../apps/client/src/fps/world";
import { onIsland, coastLimits } from "../apps/client/src/fps/coast";
import {
  BUILDINGS,
  buildingEnabled,
  buildingBlocked,
  doorAngles,
  frontOf,
  resetDoors,
} from "../apps/client/src/fps/building-layout";
test("North Works fits the existing northern shoreline without expanding the map or shifting old buildings/loot", () => {
  configureWestRoad([]);
  assert.equal(MAP_SIZE, 640);
  assert.equal(NORTH_BUILDINGS.length, 7);
  assert.equal(BUILDINGS.length, 26);
  assert.deepEqual(
    BUILDINGS.slice(0, 3).map((b) => [b.x, b.z]),
    [
      [-26.5, -10],
      [0, -24],
      [26.5, -9],
    ],
  );
  assert.equal(LOOT.length, 70);
  assert.equal(LOOT[26].x, 104);
  const bounds = northBounds();
  assert.ok(bounds.maxZ < -100);
  assert.ok(Math.abs(bounds.minZ - coastLimits(NORTH_LAB.x).north) < 30);
  for (const x of [bounds.minX, bounds.maxX])
    for (const z of [bounds.minZ, bounds.maxZ])
      assert.ok(onIsland({ x, z }, 3));
  assert.equal(blocked(START, []), false);
});
test("seven furnished buildings are separated, with yard props clear of their shells", () => {
  configureWestRoad([]);
  for (let i = 0; i < NORTH_BUILDINGS.length; i++) {
    const a = NORTH_BUILDINGS[i];
    for (const b of NORTH_BUILDINGS.slice(i + 1))
      assert.ok(
        Math.abs(a.x - b.x) > (a.width + b.width) / 2 + 2 ||
          Math.abs(a.z - b.z) > (a.depth + b.depth) / 2 + 2,
        a.type + " / " + b.type,
      );
    for (const p of NORTH_PROPS) {
      const x = p.x + NORTH_LAB.x,
        z = p.z + NORTH_LAB.z;
      assert.ok(
        Math.abs(x - a.x) > (p.width + a.width) / 2 + 0.05 ||
          Math.abs(z - a.z) > (p.depth + a.depth) / 2 + 0.05,
        p.kind + " overlaps " + a.type + " at " + p.x + "," + p.z,
      );
    }
  }
});
test("curved road joins the jail district to the front gate and detours around saved construction", () => {
  configureWestRoad([]);
  assert.equal(ROADS.length, 7);
  assert.ok(NORTH_ROAD.length > 10);
  assert.deepEqual(NORTH_ROAD.at(-1), northEntry());
  const obstruction = NORTH_ROAD[Math.floor(NORTH_ROAD.length / 2)],
    piece: Piece = {
      id: "saved-floor",
      kind: "floor",
      rotation: 0,
      x: obstruction.x,
      z: obstruction.z,
    };
  const before = structuredClone(piece);
  configureWestRoad([piece]);
  assert.deepEqual(piece, before);
  assert.ok(NORTH_ROAD.length > 1);
  for (let i = 1; i < NORTH_ROAD.length; i++) {
    const a = NORTH_ROAD[i - 1],
      b = NORTH_ROAD[i];
    for (let j = 0; j <= 20; j++) {
      const x = a.x + ((b.x - a.x) * j) / 20,
        z = a.z + ((b.z - a.z) * j) / 20;
      assert.ok(Math.abs(x - piece.x) > 4.9 || Math.abs(z - piece.z) > 4.9);
    }
  }
  configureWestRoad([]);
});
test("saved northern bases trigger an alternate shoreline site, or omission if all sites are occupied", () => {
  const pieces: Piece[] = [
      { id: "home", kind: "floor", rotation: 0, x: -80, z: -188 },
    ],
    before = structuredClone(pieces);
  configureWestRoad(pieces);
  assert.ok(NORTH_LAB.enabled);
  assert.ok(!inNorthLab(pieces[0], 3));
  assert.deepEqual(pieces, before);
  pieces.push({ id: "other", kind: "floor", rotation: 0, x: -150, z: -172 });
  configureWestRoad(pieces);
  assert.equal(NORTH_LAB.enabled, false);
  assert.equal(northYardBoxes().length, 0);
  assert.ok(NORTH_BUILDINGS.every((b) => !buildingEnabled(b)));
  assert.equal(
    buildingBlocked({
      x: NORTH_BUILDINGS[0].x + NORTH_BUILDINGS[0].width / 2,
      z: NORTH_BUILDINGS[0].z,
    }),
    false,
  );
  assert.equal(
    readSave(JSON.stringify({ version: 1, wood: 55, pieces, opened: [0, 5] }))
      .pieces.length,
    2,
  );
  configureWestRoad([]);
});
test("both perimeter entrances and all seven building interiors are reachable from the main gate", () => {
  configureWestRoad([]);
  resetDoors();
  BUILDINGS.forEach((b, i) => {
    if (b.type.startsWith("north-")) doorAngles[i] = (frontOf(b) * Math.PI) / 2;
  });
  const bounds = northBounds(),
    start = { ...northEntry(), z: northEntry().z + 2 },
    queue = [start],
    key = (x: number, z: number) => `${x},${z}`,
    seen = new Set([key(start.x, start.z)]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = { x: p.x + dx, z: p.z + dz };
      if (
        n.x < bounds.minX - 2 ||
        n.x > bounds.maxX + 2 ||
        n.z < bounds.minZ - 2 ||
        n.z > bounds.maxZ + 2 ||
        seen.has(key(n.x, n.z)) ||
        blocked(n, [])
      )
        continue;
      seen.add(key(n.x, n.z));
      queue.push(n);
    }
  }
  for (const b of NORTH_BUILDINGS) {
    const target = { x: b.x, z: b.z + frontOf(b) * (b.depth / 2 - 1) };
    assert.ok(seen.has(key(target.x, target.z)), b.type + " inaccessible");
  }
  assert.equal(northBlocked({ x: bounds.maxX, z: NORTH_LAB.z - 38 }), false);
  assert.equal(northBlocked({ x: bounds.minX, z: NORTH_LAB.z }), true);
  assert.ok(
    placementReason(
      { kind: "floor", x: NORTH_LAB.x, z: NORTH_LAB.z + 20, rotation: 0 },
      { x: NORTH_LAB.x - 3, z: NORTH_LAB.z + 20 },
      [],
      500,
    ).includes("outside"),
  );
  resetDoors();
});
test("new GLBs retain roof cutaways, furnishings, working door hinges and bounded draw budgets", async () => {
  for (const b of NORTH_BUILDINGS) {
    const bytes = await readFile(
        `apps/client/src/fps/models/buildings/${b.type}.glb`,
      ),
      g = await new GLTFLoader().parseAsync(
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer,
        "",
      );
    assert.ok(g.scene.getObjectByName(b.type + "-door-hinge"));
    const roles = new Set();
    let draws = 0;
    g.scene.traverse((o) => {
      if (o.type === "Mesh") {
        roles.add(o.userData.part);
        draws++;
      }
    });
    for (const role of ["shell", "roof", "interior", "door"])
      assert.ok(roles.has(role));
    assert.ok(draws <= 22);
    assert.ok(bytes.length < 900000);
  }
  const report = JSON.parse(
    await readFile("apps/client/static/assets/north-lab/manifest.json", "utf8"),
  );
  assert.equal(report.length, 8);
  assert.ok(report.every((r: { triangles: number }) => r.triangles < 60000));
});

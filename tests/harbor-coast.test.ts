import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { onIsland, coastLimits, COASTLINE } from "../apps/client/src/fps/coast";
import {
  HARBOR_ENTRY,
  PIERS,
  CONTAINERS,
  onDock,
  harborBlocked,
  HARBOR_BOXES,
  inHarbor,
} from "../apps/client/src/fps/harbor-layout";
import { harborConnector } from "../apps/client/src/fps/harbor-road";
import {
  BUILDINGS,
  TREES,
  LOOT,
  blockedTerrain,
  blocked,
  surfaceHeight,
  placementReason,
  readSave,
  movePlayer,
  type Piece,
} from "../apps/client/src/fps/world";
test("coast surrounds all four sides while keeping the previous buildable land dry", () => {
  for (let x = -189; x <= 189; x += 3)
    for (let z = -189; z <= 189; z += 3)
      assert(onIsland({ x, z }, 2), `${x},${z}`);
  for (const p of [
    { x: 0, z: -280 },
    { x: 280, z: 0 },
    { x: 0, z: 280 },
    { x: -280, z: 0 },
  ]) {
    assert(!onIsland(p));
    assert(blockedTerrain(p));
  }
  assert.equal(coastLimits(-60).south, 234);
  assert.equal(COASTLINE.length, 2000);
});
test("southern road reaches harbor and routes around player homes without moving any saved piece", () => {
  const pieces: Piece[] = [
    { id: "old-base", kind: "foundation", x: -50, z: 112, rotation: 0 },
  ];
  const copy = JSON.stringify(pieces);
  const road = harborConnector(pieces, TREES, BUILDINGS);
  assert(road.length >= 2);
  assert.deepEqual(road.at(-1), HARBOR_ENTRY);
  for (let i = 1; i < road.length; i++) {
    const a = road[i - 1],
      b = road[i],
      d = Math.hypot(a.x - b.x, a.z - b.z);
    for (let t = 0; t <= d; t += 0.25) {
      const p = {
        x: a.x + ((b.x - a.x) * t) / d,
        z: a.z + ((b.z - a.z) * t) / d,
      };
      assert(!blockedTerrain(p));
      assert(Math.abs(p.x + 50) > 6 || Math.abs(p.z - 112) > 6);
    }
  }
  assert.equal(JSON.stringify(pieces), copy);
  const restored = readSave(
    JSON.stringify({
      version: 1,
      wood: 9123,
      pieces,
      opened: [0, 4, 64],
      resources: { rock: 32, sulfur: 10, metal: 6 },
    }),
  );
  assert.equal(restored.pieces[0].id, "old-base");
  assert.deepEqual(restored.opened, [0, 4, 64]);
});
test("all piers connect to shore, block water beside them, and retain rail/container collisions", () => {
  for (const pier of PIERS) {
    for (let z = 228.5; z <= 268; z += 0.25) {
      const p = { x: pier.x, z };
      assert(onDock(p));
      assert(!blockedTerrain(p));
      assert(!blocked(p, [], 0.18));
      assert.equal(surfaceHeight(p, [], 1), 0.18);
    }
    assert(blockedTerrain({ x: pier.x + 4, z: 250 }));
    assert(harborBlocked({ x: pier.x + 2.9, z: 250 }, 0.18));
    const p = movePlayer({ x: pier.x, z: 268 }, 0, 4, [], 0.18);
    assert(p.z < 269);
  }
  for (const c of CONTAINERS) assert(harborBlocked(c, c.y));
  assert(!harborBlocked({ x: -111, z: 201 }));
  assert(!harborBlocked({ x: -111, z: 198 }));
  assert(inHarbor(HARBOR_ENTRY));
  assert(
    placementReason(
      { kind: "foundation", rotation: 0, x: -60, z: 208 },
      { x: -60, z: 206 },
      [],
      10000,
    ),
  );
  assert.equal(LOOT.length, 70);
  for (const c of LOOT.slice(65)) {
    assert(!blockedTerrain(c));
    assert(!harborBlocked(c, c.y));
  }
});
test("harbor Blender asset matches the shared deck/cargo layout within rendering budgets", async () => {
  const bytes = await readFile(
      "apps/client/static/assets/harbor/south-harbor.glb",
    ),
    manifest = JSON.parse(
      await readFile("apps/client/static/assets/harbor/manifest.json", "utf8"),
    );
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  assert(gltf.scene.getObjectByName("south-harbor"));
  let triangles = 0,
    draws = 0;
  gltf.scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      draws++;
      triangles +=
        (o.geometry.index?.count ?? o.geometry.getAttribute("position").count) /
        3;
      for (const v of o.geometry.getAttribute("position").array)
        assert(Number.isFinite(v));
    }
  });
  assert.equal(triangles, manifest.triangles);
  assert(triangles < 100000);
  assert(draws <= 12);
  assert.equal(manifest.containers, 12);
  assert.equal(manifest.piers, 3);
  assert(HARBOR_BOXES.length > 30);
  const bounds = new THREE.Box3().setFromObject(gltf.scene);
  assert(bounds.max.y > 13);
  assert(bounds.min.z < 196 && bounds.max.z >= 269);
});

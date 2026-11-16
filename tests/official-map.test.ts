import {
  citySurfaces,
  streetConnections,
} from "../packages/game-data/map-presentation.js";
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import {
  MAP_SIZE,
  CHUNK_SIZE,
  DISTRICTS,
  visibleChunkKeys,
  BUILDINGS,
} from "../packages/shared/src/official-map.js";
import {
  WORLD,
  inRect,
  type WorldState,
} from "../packages/shared/src/index.js";
import {
  groundKind,
  mapChunk,
  mapObjects,
  ROADS,
  terrainBlocked,
  terrainObstruction,
  setMapReservations,
  treeOverlapsRect,
  mapObjectEnabled,
} from "../packages/shared/src/terrain.js";
import {
  emptyWorld,
  createPlayer,
  upgradeWorld,
  blocked,
  move,
} from "../apps/server/src/engine.js";
const look = {
  skin: "#c98c62",
  hair: "#252939",
  top: "#ec8753",
  body: "standard",
  style: "short",
} as const;
afterEach(() => setMapReservations([]));
test("256-square tile world and 16-square chunks cover the map exactly with bounded camera working sets", () => {
  assert.equal(WORLD.width, 16384);
  assert.equal(WORLD.height, 16384);
  assert.equal(WORLD.grid, 64);
  assert.equal(MAP_SIZE / 64, 256);
  assert.equal(CHUNK_SIZE, 1024);
  const ids = new Set<string>();
  for (let cy = 0; cy < 16; cy++)
    for (let cx = 0; cx < 16; cx++)
      for (let ty = 0; ty < 16; ty++)
        for (let tx = 0; tx < 16; tx++)
          ids.add(cx * 16 + tx + "," + (cy * 16 + ty));
  assert.equal(ids.size, 65536);
  for (const [cx, cy] of [
    [0, 0],
    [15, 0],
    [0, 15],
    [15, 15],
  ]) {
    const c = mapChunk(cx, cy);
    assert.equal(c.tiles.length, 256);
    assert(
      c.tiles.every(
        (t) =>
          t.x >= cx * 16 &&
          t.x < (cx + 1) * 16 &&
          t.y >= cy * 16 &&
          t.y < (cy + 1) * 16,
      ),
    );
  }
  assert.throws(() => mapChunk(16, 0));
  const first = new Set(
    visibleChunkKeys({ x: 0, y: 0, width: 1200, height: 800 }),
  );
  const last = new Set(
    visibleChunkKeys({ x: 15000, y: 15000, width: 1200, height: 800 }),
  );
  assert(first.size <= 12 && last.size <= 12);
  assert([...first].every((k) => !last.has(k)));
  assert(last.has("15,15"));
});
test("measured terrain distribution meets the requested city/grass/mountain/other targets", () => {
  const counts: Record<string, number> = {};
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const k = groundKind({ x: x * 64 + 32, y: y * 64 + 32 });
      counts[k] = (counts[k] || 0) + 1;
    }
  for (const [key, target] of [
    ["city", 35],
    ["grassland", 40],
    ["mountain", 15],
  ] as const)
    assert(
      Math.abs((counts[key] / 65536) * 100 - target) < 2,
      key + JSON.stringify(counts),
    );
  assert(
    Math.abs((((counts.rocky || 0) + (counts.water || 0)) / 65536) * 100 - 10) <
      2,
  );
  assert.equal(DISTRICTS.length, 5);
  const trees = mapObjects().filter((o) => o.kind === "tree");
  assert(trees.length > 100 && trees.length < 800);
});
test("all road corridors, existing services and five districts remain connected and traversable", () => {
  const w = emptyWorld();
  setMapReservations([]);
  for (const r of ROADS)
    for (const p of r.points)
      assert(!blocked(w, p), r.name + JSON.stringify(p));
  for (const p of [
    WORLD.spawn,
    WORLD.storePoint,
    WORLD.traderPoint,
    ...WORLD.scavengePoints,
  ])
    assert(!blocked(w, p), JSON.stringify(p));
  for (const d of DISTRICTS)
    assert(
      ROADS.some((r) => r.points.some((p) => inRect(p, d))),
      d.name,
    );
  // Graph links use actual overlapping road widths, including sampled curved intersections.
  const reached = new Set([0]);
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < ROADS.length; i++)
      if (!reached.has(i))
        for (const j of reached)
          if (
            ROADS[i].points.some((a) =>
              ROADS[j].points.some(
                (b) =>
                  Math.hypot(a.x - b.x, a.y - b.y) <
                  (ROADS[i].width + ROADS[j].width) / 2,
              ),
            )
          ) {
            reached.add(i);
            changed = true;
            break;
          }
  }
  assert.equal(reached.size, ROADS.length);
  for (const role of [
    "bank",
    "hospital",
    "police",
    "warehouse",
    "factory",
    "apartments",
    "luxury",
    "premium",
  ])
    assert(
      BUILDINGS.some((b) => b.asset === "map-building-" + role),
      role,
    );
});
test("trees and rocks stop the existing controller while open country remains usable", () => {
  const w = emptyWorld(),
    p = createPlayer("walk", "Walk", look);
  w.players[p.id] = p;
  for (const kind of ["tree", "rock"] as const) {
    const o = mapObjects().find((o) => o.kind === kind)!;
    assert(terrainBlocked(o));
    assert(
      terrainObstruction({ x: o.x - 100, y: o.y }, { x: o.x + 100, y: o.y }),
    );
    p.x = o.x - 100;
    p.y = o.y;
    for (let i = 0; i < 8; i++) move(w, p, 1, true, false, 0.1);
    assert(p.x < o.x, kind);
  }
});
test("house footprints cannot overlap the visible canopy beyond a tree trunk", () => {
  const t = mapObjects().find((o) => o.kind === "tree")!;
  assert(
    treeOverlapsRect({ x: t.x + 36, y: t.y - 100, width: 128, height: 128 }),
  );
});
test("legacy map migration translates once and preserves housing, containers, characters and action ledger", () => {
  const w = emptyWorld();
  delete w.mapVersion;
  const p = createPlayer("saved", "Saved", look);
  p.x = 7104;
  p.y = 1344;
  p.cash = 77;
  p.bank = 123;
  p.skills.crafting = 15;
  w.players[p.id] = p;
  w.structures.floor = {
    id: "floor",
    owner: p.id,
    kind: "foundation",
    x: p.x,
    y: p.y,
    hp: 9999,
    foundation: "floor",
    open: false,
    inventory: {},
    cash: 0,
  };
  w.structures.chest = {
    ...w.structures.floor,
    id: "chest",
    kind: "storage",
    foundation: "floor",
    inventory: { scrap: 7 },
    cash: 42,
  };
  w.bags.bag = {
    id: "bag",
    x: 7200,
    y: 1400,
    inventory: { steel: 2 },
    cash: 9,
  };
  w.actions.saved = { at: 123, result: "kept" };
  const before = JSON.parse(JSON.stringify(w)) as WorldState;
  upgradeWorld(w);
  assert.equal(w.mapVersion, 3);
  assert.equal(w.structures.floor.x, before.structures.floor.x + 4096);
  assert.equal(w.structures.floor.y, before.structures.floor.y + 4096);
  assert.equal(w.structures.chest.foundation, "floor");
  assert.deepEqual(w.structures.chest.inventory, { scrap: 7 });
  assert.equal(w.structures.chest.cash, 42);
  assert.equal(p.cash, 77);
  assert.equal(p.bank, 123);
  assert.equal(p.skills.crafting, 15);
  assert.deepEqual(p.inventory, before.players.saved.inventory);
  assert.deepEqual(w.actions, before.actions);
  assert.equal(w.bags.bag.x, 11296);
  assert(!blocked(w, p));
  const overlapping = {
    x: w.structures.floor.x,
    y: w.structures.floor.y,
    width: 200,
    height: 200,
  };
  assert(!mapObjectEnabled(overlapping));
  const saved = JSON.parse(JSON.stringify(w));
  upgradeWorld(w);
  assert.deepEqual(w, saved);
});
test("official map assets retain transparency and AI terrain tile edges repeat exactly", async () => {
  const root = "apps/client/public/assets/",
    { assets } = JSON.parse(await readFile(root + "manifest.json", "utf8"));
  const keys = Object.keys(assets).filter(
    (k) => assets[k].sourceGroup === "official-map",
  );
  assert.equal(keys.length, 51);
  for (const key of keys) {
    assert.equal(assets[key].source, "ai-generated");
    const { data, info } = await sharp(root + assets[key].file)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (!key.startsWith("map-tile")) {
      assert(
        data.some((v, i) => i % 4 === 3 && v === 0),
        key,
      );
      continue;
    }
    assert.equal(info.width, 64);
    assert.equal(info.height, 64);
    for (let i = 0; i < 64; i++)
      for (let c = 0; c < 4; c++) {
        assert.equal(data[i * 64 * 4 + c], data[(i * 64 + 63) * 4 + c], key);
        assert.equal(data[i * 4 + c], data[(63 * 64 + i) * 4 + c], key);
      }
  }
});

test("scenery polish reserves current bases without moving players or container contents", () => {
  const w = emptyWorld();
  w.sceneryVersion = 1;
  const p = createPlayer("resident", "Resident", look);
  w.players[p.id] = p;
  w.structures.base = {
    id: "base",
    kind: "foundation",
    owner: p.id,
    foundation: "base",
    x: 8200,
    y: 6200,
    hp: 9999,
    open: false,
    inventory: { wood: 17 },
    cash: 23,
  };
  const before = structuredClone(w);
  upgradeWorld(w);
  assert.equal(w.sceneryVersion, 2);
  assert.deepEqual(w.players, before.players);
  assert.deepEqual(w.structures, before.structures);
  assert(!mapObjectEnabled({ x: 8200, y: 6200, width: 200, height: 200 }));
  const saved = structuredClone(w);
  upgradeWorld(w);
  assert.deepEqual(w, saved);
});

test("street infill has frontage connections stay inside the world", () => {
  assert(BUILDINGS.filter((b) => b.id.startsWith("frontage-")).length >= 25);
  const walks = streetConnections();
  assert(walks.length >= 100);
  for (const walk of walks) {
    assert(
      walk.points.every(
        (p) => p.x >= 0 && p.y >= 0 && p.x < MAP_SIZE && p.y < MAP_SIZE,
      ),
    );
    assert(walk.width >= 44 && walk.width <= 72);
  }
});

test("commercial infill preserves road shoulders and civic landmarks stay unique", () => {
  const shops = BUILDINGS.filter((b) => b.id.startsWith("shoprow-"));
  assert(shops.length >= 30);
  for (const shop of shops) {
    assert(
      !blocked(emptyWorld(), { x: shop.x, y: shop.y + shop.height / 2 + 24 }),
      shop.id + " entrance",
    );
  }
  const downtown = BUILDINGS.filter(
    (b) => b.x >= 7040 && b.x < 9664 && b.y >= 4096 && b.y < 7488,
  );
  for (const role of ["bank", "hospital", "police"])
    assert.equal(
      downtown.filter((b) => b.asset === "map-building-" + role).length,
      1,
      role,
    );
  assert(citySurfaces().filter((s) => s.alley).length >= 30);
  assert(
    citySurfaces().every(
      (s) => s.buildings.length > 0 && s.points.length === 4,
    ),
  );
});

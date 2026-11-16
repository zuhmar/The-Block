import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COAST,
  ROADS,
  RIVER,
  CLIFFS,
  isWater,
  terrainBlocked,
  terrainRectBlocked,
  onRoad,
  onBridge,
  roadOverlapsRect,
} from "../packages/shared/src/terrain.js";
import { WORLD, placementReason } from "../packages/shared/src/index.js";
import {
  emptyWorld,
  createPlayer,
  move,
  blocked,
  obstruction,
  upgradeWorld,
} from "../apps/server/src/engine.js";
const look = {
  skin: "#c98c62",
  hair: "#252939",
  top: "#ec8753",
  body: "standard",
  style: "short",
} as const;
test("coastline, river and lake block travel while routes and bridge crossings stay usable", () => {
  assert(COAST.length > 100);
  for (const point of [
    { x: 16370, y: 16370 },
    { x: 30, y: 30 },
    { x: 13400, y: 9500 },
    { x: 7450, y: 13200 },
  ])
    assert(isWater(point), JSON.stringify(point));
  const w = emptyWorld();
  for (const point of [
    WORLD.spawn,
    WORLD.storePoint,
    WORLD.traderPoint,
    ...WORLD.scavengePoints,
  ])
    assert(!terrainBlocked(point));
  for (const road of ROADS)
    for (const p of road.points)
      assert(!terrainBlocked(p), road.name + JSON.stringify(p));
  const bridge = ROADS[0].points.find((p) => onBridge(p));
  assert(bridge);
  assert(!isWater(bridge));
  const crossing = RIVER.find((p) => onRoad(p, -30));
  assert(crossing);
  assert(!terrainBlocked(crossing));
  const p = createPlayer("walker", "Walker", look);
  w.players[p.id] = p;
  p.x = bridge.x - 130;
  p.y = bridge.y;
  for (let i = 0; i < 12; i++) move(w, p, 1, false, false, 0.2);
  assert(p.x > bridge.x + 100);
});
test("cliffs stop movement and sight; a footprint cannot straddle the shore or river", () => {
  const w = emptyWorld(),
    p = createPlayer("builder", "Builder", look);
  w.players[p.id] = p;
  const cliff = CLIFFS[0];
  p.x = cliff.x - 30;
  p.y = cliff.y + 50;
  for (let i = 0; i < 5; i++) move(w, p, 1, true, false, 0.25);
  assert(p.x < cliff.x);
  assert(blocked(w, { x: cliff.x + 10, y: cliff.y + 10 }));
  assert(
    obstruction(
      w,
      { x: cliff.x - 50, y: cliff.y + 40 },
      { x: cliff.x + cliff.width + 50, y: cliff.y + 40 },
    ),
  );
  assert(terrainRectBlocked({ x: 13400, y: 9500, width: 128, height: 128 }));
  p.x = cliff.x + 64;
  p.y = cliff.y + 64;
  assert.match(placementReason(p, "foundation", p, []), /cliffs/);
  const bent = ROADS[3].points.find((p) => p.x > 7500 && p.y > 3500)!;
  assert(
    roadOverlapsRect({
      x: bent.x - 64,
      y: bent.y - 64,
      width: 128,
      height: 128,
    }),
  );
});
test("saved characters stranded beyond the new coast return to dry ground without losing belongings", () => {
  const w = emptyWorld(),
    p = createPlayer("saved", "Saved", look);
  w.players[p.id] = p;
  p.x = 16370;
  p.y = 16370;
  p.cash = 42;
  const inventory = { ...p.inventory };
  upgradeWorld(w);
  assert(!blocked(w, p));
  assert.deepEqual(p.inventory, inventory);
  assert.equal(p.cash, 42);
  assert.deepEqual({ x: p.x, y: p.y }, WORLD.spawn);
});

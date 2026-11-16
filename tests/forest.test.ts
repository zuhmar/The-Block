import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WORLD,
  inRect,
  placementReason,
  buildGround,
} from "../packages/shared/src/index.js";
import {
  forestTrees,
  onRoad,
  terrainBlocked,
  ROADS,
} from "../packages/shared/src/terrain.js";
import {
  act,
  createPlayer,
  emptyWorld,
  upgradeWorld,
} from "../apps/server/src/engine.js";
const look = {
  skin: "#c98c62",
  hair: "#252939",
  top: "#ec8753",
  body: "standard",
  style: "short",
} as const;
test("open countryside supports homes without designated plots; protected terrain spends no wood", () => {
  const w = emptyWorld(),
    p = createPlayer("builder", "Builder", look);
  w.players[p.id] = p;
  for (const point of [
    { x: 7104, y: 1344 },
    { x: 7104, y: 1536 },
    { x: 6848, y: 1536 },
  ]) {
    p.x = point.x;
    p.y = point.y;
    assert(buildGround(p));
    act(w, p.id, { type: "build", kind: "foundation", ...point });
  }
  for (const point of [
    WORLD.spawn,
    { x: 13600, y: 5300 },
    { x: 13400, y: 9500 },
    { x: 2700, y: 1700 },
  ]) {
    p.x = point.x;
    p.y = point.y;
    const wood = p.inventory.wood,
      count = Object.keys(w.structures).length;
    assert(
      placementReason(p, "foundation", point, Object.values(w.structures)),
    );
    assert.throws(() =>
      act(w, p.id, { type: "build", kind: "foundation", ...point }),
    );
    assert.equal(p.inventory.wood, wood);
    assert.equal(Object.keys(w.structures).length, count);
  }
});
test("natural forest is deterministic and clear of water, cliffs and winding road shoulders", () => {
  const trees = forestTrees();
  assert(trees.length > 150 && trees.length < 800);
  assert.deepEqual(trees, forestTrees());
  for (const tree of trees) {
    assert(!inRect(tree, WORLD.townRect));
    assert(!onRoad(tree, 90));
    assert(terrainBlocked(tree, 0));
  }
  assert(ROADS.some((r) => r.points.some((p) => p.x > 8000)));
  assert(ROADS.some((r) => r.points.some((p) => p.y > 5700)));
});
test("existing town homes survive reload while additions in town are rejected", () => {
  const w = emptyWorld(),
    p = createPlayer("owner", "Owner", look);
  w.players[p.id] = p;
  p.x = WORLD.spawn.x;
  p.y = WORLD.spawn.y;
  w.structures.legacy = {
    id: "legacy",
    owner: p.id,
    kind: "foundation",
    x: p.x,
    y: p.y,
    hp: 9999,
    foundation: "legacy",
    open: false,
    inventory: {},
    cash: 0,
  };
  const saved = JSON.parse(JSON.stringify(w));
  upgradeWorld(saved);
  assert.deepEqual(saved.structures.legacy, w.structures.legacy);
  assert.throws(
    () =>
      act(saved, p.id, {
        type: "build",
        kind: "wall",
        x: p.x + 32,
        y: p.y - 64,
        foundation: "legacy",
      }),
    /town/,
  );
});

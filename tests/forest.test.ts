import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WORLD,
  inRect,
  placementReason,
  buildGround,
} from "../packages/shared/src/index.js";
import { forestTrees } from "../packages/game-data/forest.js";
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
test("every woodland clearing supports a complete floor; town and road placement spend no wood", () => {
  const w = emptyWorld(),
    p = createPlayer("builder", "Builder", look);
  w.players[p.id] = p;
  for (const r of WORLD.parcelRects) {
    p.x = Math.ceil((r.x + 128) / 64) * 64;
    p.y = Math.ceil((r.y + 128) / 64) * 64;
    assert(buildGround(p));
    act(w, p.id, { type: "build", kind: "foundation", x: p.x, y: p.y });
  }
  for (const point of [
    { x: 3008, y: 1344 },
    { x: 7104, y: 960 },
    { x: 7104, y: 2080 },
    { x: 7104, y: 4480 },
    { x: 9408, y: 3456 },
    { x: 2496, y: 5120 },
    { x: 7104, y: 1152 },
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
test("forest is deterministic, dense and clear of house plots and connecting roads", () => {
  const trees = forestTrees();
  assert(trees.length > 500);
  assert.deepEqual(trees, forestTrees());
  for (const tree of trees) {
    assert(!inRect(tree, WORLD.townRect));
    assert(!WORLD.roads.some((r) => inRect(tree, r, 100)));
    assert(!WORLD.parcelRects.some((r) => inRect(tree, r, 72)));
  }
  assert(WORLD.roads.some((r) => r.width === WORLD.width));
  assert(WORLD.roads.some((r) => r.height === WORLD.height));
});
test("existing town homes survive reload while additions in town are rejected", () => {
  const w = emptyWorld(),
    p = createPlayer("owner", "Owner", look);
  w.players[p.id] = p;
  p.x = 3008;
  p.y = 1344;
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
        x: 3040,
        y: 1280,
        foundation: "legacy",
      }),
    /town/,
  );
});

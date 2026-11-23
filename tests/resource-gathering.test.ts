import test from "node:test";
import assert from "node:assert/strict";
import {
  ResourceWorld,
  RESOURCE_NODE_COUNT,
} from "../apps/client/src/fps/resource-world";
import { GATHER_TYPES } from "../apps/client/src/fps/resource-state";
import { harvestPose } from "../apps/client/src/fps/harvest-animation";
import { createNatureRenderer } from "../apps/client/src/fps/nature-models";
import {
  blockedTerrain,
  inTown,
  roadDistance,
  readSave,
  setResourceCollisionProvider,
  blocked,
  type Piece,
} from "../apps/client/src/fps/world";
const random =
  (seed = 9) =>
  () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
const now = 1000000;
test("all six nature types populate safe wilderness, with 25 nodes of every mineral", () => {
  const world = new ResourceWorld(() => [], undefined, now, random());
  for (const kind of Object.keys(GATHER_TYPES)) {
    const matching = world.entities.filter(
      (r) => r.kind === kind && r.health > 0,
    );
    assert(matching.length > 0, kind);
    if (kind.startsWith("node-"))
      assert.equal(matching.length, RESOURCE_NODE_COUNT / 3);
  }
  for (const r of world.entities.filter((r) => r.health > 0)) {
    assert(!inTown(r));
    assert(!blockedTerrain(r, 1.5));
    assert(roadDistance(r) > 6);
  }
});
test("chopping awards four strikes, removes collision, persists depletion, and regrows the same tree", () => {
  const world = new ResourceWorld(() => [], undefined, now, random()),
    tree = world.entities.find((r) => r.kind === "tree-broadleaf")!,
    original = { x: tree.x, z: tree.z };
  let total = 0;
  setResourceCollisionProvider((p, y, b, r) => world.blocked(p, y, b, r));
  try {
    assert(blocked(tree, []));
    for (let i = 0; i < 4; i++) {
      const hit = world.hit(tree.id, now + i * 1000)!;
      total += hit.amount;
      assert.equal(hit.resource, "wood");
    }
    assert.equal(total, 100);
    assert.equal(tree.health, 0);
    assert(!blocked(tree, []));
    assert.equal(world.hit(tree.id, now + 8000), undefined);
    const saved = readSave(
      JSON.stringify({
        version: 1,
        wood: 10100,
        pieces: [],
        opened: [0, 4],
        harvest: world.snapshot(),
        resources: { rock: 0, sulfur: 0, metal: 0 },
      }),
    );
    const restored = new ResourceWorld(
      () => [],
      saved.harvest,
      now + 6000,
      random(91),
    );
    assert.equal(restored.get(tree.id)!.health, 0);
    const due = restored.get(tree.id)!.respawnAt;
    restored.tick(due + 1);
    assert.deepEqual(
      { x: restored.get(tree.id)!.x, z: restored.get(tree.id)!.z },
      original,
    );
    assert.equal(restored.get(tree.id)!.health, 100);
  } finally {
    setResourceCollisionProvider(undefined);
  }
});
test("each depleted mineral returns at a new location, never near the player or on new bases", () => {
  const pieces: Piece[] = [],
    world = new ResourceWorld(() => pieces, undefined, now, random());
  let clock = now;
  for (const kind of ["node-rock", "node-sulfur", "node-metal"] as const) {
    const node = world.entities.find((r) => r.kind === kind)!,
      old = { x: node.x, z: node.z },
      count = GATHER_TYPES[kind].health / GATHER_TYPES[kind].damage;
    let total = 0;
    for (let i = 0; i < count; i++)
      total += world.hit(node.id, clock + i * 1000)!.amount;
    assert.equal(total, count * GATHER_TYPES[kind].yield);
    const due = node.respawnAt;
    pieces.push({ id: kind, kind: "floor", x: old.x, z: old.z, rotation: 0 });
    assert.equal(node.health, 0);
    clock = due + 1001;
    world.tick(clock, old);
    assert.equal(node.health, GATHER_TYPES[kind].health);
    assert(Math.hypot(node.x - old.x, node.z - old.z) >= 10);
    assert(!inTown(node));
    assert(roadDistance(node) > 6);
  }
});
test("tree regeneration waits for a house to move instead of growing through saved structures", () => {
  const pieces: Piece[] = [],
    world = new ResourceWorld(() => pieces, undefined, now, random()),
    tree = world.entities.find((r) => r.kind === "tree-pine")!;
  for (let i = 0; i < 4; i++) world.hit(tree.id, now + i * 1000);
  pieces.push({
    id: "new-house",
    kind: "floor",
    x: tree.x,
    z: tree.z,
    rotation: 0,
  });
  world.tick(tree.respawnAt + 1);
  assert.equal(tree.health, 0);
  pieces.length = 0;
  world.tick(tree.respawnAt + 1);
  assert.equal(tree.health, 100);
});
test("partial resources and wallets survive reload, and simultaneous/spam hits cannot duplicate yields", () => {
  const world = new ResourceWorld(() => [], undefined, now, random()),
    node = world.entities.find((r) => r.kind === "node-metal")!;
  assert(world.hit(node.id, now));
  assert.equal(world.hit(node.id, now), undefined);
  assert.equal(node.health, 100);
  const save = readSave(
    JSON.stringify({
      version: 1,
      wood: 9911,
      pieces: [],
      opened: [1],
      resources: { rock: 24, sulfur: 10, metal: 6 },
      harvest: world.snapshot(),
    }),
  );
  const restored = new ResourceWorld(
    () => [],
    save.harvest,
    now + 3000,
    random(73),
  );
  assert.equal(restored.get(node.id)!.health, 100);
  assert.equal(restored.get(node.id)!.x, node.x);
  assert.deepEqual(save.resources, { rock: 24, sulfur: 10, metal: 6 });
  assert.equal(save.wood, 9911);
  assert.deepEqual(save.opened, [1]);
  const old = { version: 1, wood: 9500, pieces: [], opened: [0, 4] };
  assert.deepEqual(readSave(JSON.stringify(old)), old);
});
test("a failed spawn search leaves nodes depleted rather than placing them inside town", () => {
  const world = new ResourceWorld(
    () => [],
    undefined,
    now,
    () => 0.5,
  );
  assert(
    world.entities.some((r) => r.kind.startsWith("node-") && r.health === 0),
  );
  assert(
    world.entities
      .filter((r) => r.kind.startsWith("node-") && r.health > 0)
      .every((r) => !inTown(r) && !blockedTerrain(r, 1.5)),
  );
});
test("harvest swings wind up, follow through and return to neutral; untouched render chunks/proxies are retained", () => {
  for (const kind of ["chop", "mine"] as const) {
    assert.deepEqual(harvestPose(kind, 0), harvestPose(kind, 1));
    assert(harvestPose(kind, 0.28).shoulder > 0.5);
    assert(harvestPose(kind, 0.55).shoulder < -0.5);
  }
  const world = new ResourceWorld(() => [], undefined, now, random()),
    renderer = createNatureRenderer(world),
    tree = world.entities.find((r) => r.kind.startsWith("tree-"))!,
    other = world.entities.find((r) => r.id !== tree.id)!;
  const proxy = renderer.proxies.get(other.id);
  for (let i = 0; i < 4; i++) world.hit(tree.id, now + i * 1000);
  renderer.update({ x: 0, z: 14 }, 0);
  assert(!renderer.proxies.has(tree.id));
  assert.equal(renderer.proxies.get(other.id), proxy);
});

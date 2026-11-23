import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  emptyInventory,
  addItem,
  countItem,
  takeItem,
} from "../apps/client/src/fps/inventory";
import {
  startProduction,
  collectProduction,
  cancelProduction,
  advanceProduction,
  readProductionJob,
  RECIPES,
  STATIONS,
} from "../apps/client/src/fps/crafting";
import {
  readSave,
  placementReason,
  pieceBase,
  snapOnStructure,
  platformTop,
  pieceBox,
  canRemove,
  blocked,
  pieceCost,
  type Piece,
} from "../apps/client/src/fps/world";
import { damageStructuresWithC4 } from "../apps/client/src/fps/structure-damage";
const furnace = (): Piece => ({
  id: "furnace",
  kind: "furnace",
  material: "stone",
  x: 0,
  z: 34,
  rotation: 0,
});
const bench = (): Piece => ({
  id: "bench",
  kind: "workbench",
  material: "wood",
  x: 4,
  z: 34,
  rotation: 0,
});
test("ore, wood and charcoal form a complete finite smelting → gunpowder → ammo chain", () => {
  const inv = emptyInventory(),
    f = furnace(),
    b = bench();
  addItem(inv, "wood", 100);
  addItem(inv, "sulfur", 10);
  addItem(inv, "metal", 10);
  assert.equal(startProduction(f, inv, "smelt-metal"), "");
  assert.equal(countItem(inv, "metal"), 0);
  assert.equal(countItem(inv, "wood"), 80);
  assert.match(collectProduction(f, inv), /Still/);
  advanceProduction([f], 12);
  assert.equal(collectProduction(f, inv), "");
  assert.equal(countItem(inv, "metal-fragments"), 10);
  assert.equal(startProduction(f, inv, "smelt-sulfur"), "");
  advanceProduction([f], 10);
  collectProduction(f, inv);
  assert.equal(countItem(inv, "sulfur-refined"), 10);
  assert.equal(countItem(inv, "charcoal"), 20);
  assert.equal(startProduction(b, inv, "gunpowder"), "");
  advanceProduction([b], 3);
  collectProduction(b, inv);
  assert.equal(countItem(inv, "gunpowder"), 10);
  assert.equal(startProduction(b, inv, "craft-pistol"), "");
  advanceProduction([b], 4);
  assert.equal(collectProduction(b, inv), "");
  assert.equal(countItem(inv, "pistol-ammo"), 20);
  assert.equal(countItem(inv, "metal-fragments"), 2);
  assert.equal(countItem(inv, "gunpowder"), 6);
  assert.equal(countItem(inv, "charcoal"), 10);
  assert.equal(countItem(inv, "wood"), 60);
  assert.match(collectProduction(b, inv), /No job/);
  assert.equal(countItem(inv, "pistol-ammo"), 20);
});
test("a full bag cannot partially collect outputs or partially refund cancelled ingredients", () => {
  const inv = emptyInventory(),
    f = furnace();
  addItem(inv, "wood", 10000);
  f.job = { recipe: "smelt-metal", remaining: 0 };
  takeItem(inv, "wood", 500);
  const before = structuredClone(inv);
  assert.match(collectProduction(f, inv), /Inventory full/);
  assert.deepEqual(inv, before);
  assert(f.job);
  takeItem(inv, "wood", 500);
  assert.equal(collectProduction(f, inv), "");
  assert.equal(countItem(inv, "metal-fragments"), 10);
  assert.equal(countItem(inv, "charcoal"), 10);
  assert.equal(f.job, undefined);
  const bag = emptyInventory(),
    b = bench();
  addItem(bag, "metal-fragments", 8);
  addItem(bag, "gunpowder", 4);
  startProduction(b, bag, "craft-pistol");
  addItem(bag, "wood", 10000);
  const full = structuredClone(bag);
  assert.match(cancelProduction(b, bag), /Inventory full/);
  assert.deepEqual(bag, full);
  assert(b.job);
  takeItem(bag, "wood", 1000);
  assert.equal(cancelProduction(b, bag), "");
  assert.equal(countItem(bag, "metal-fragments"), 8);
  assert.equal(countItem(bag, "gunpowder"), 4);
  assert.equal(countItem(bag, "pistol-ammo"), 0);
});
test("wrong-station, unavailable and busy recipes cannot spend inputs; jobs persist without offline grants", () => {
  const inv = emptyInventory(),
    f = furnace();
  addItem(inv, "wood", 100);
  const before = structuredClone(inv);
  assert.match(startProduction(f, inv, "craft-pistol"), /unavailable/);
  assert.match(startProduction(f, inv, "smelt-metal"), /Need/);
  assert.deepEqual(inv, before);
  startProduction(f, inv, "burn-charcoal");
  const after = structuredClone(inv);
  assert.match(startProduction(f, inv, "burn-charcoal"), /current job/);
  assert.deepEqual(inv, after);
  advanceProduction([f], 2.5);
  const saved = readSave(
    JSON.stringify({
      version: 1,
      wood: 80,
      pieces: [f],
      opened: [0],
      inventory: inv,
    }),
  );
  assert.equal(saved.pieces[0].job?.remaining, 5.5);
  assert.equal(saved.opened[0], 0);
  assert.equal(countItem(saved.inventory!, "charcoal"), 0);
  assert.equal(
    readProductionJob("furnace", { recipe: "craft-pistol", remaining: 0 }),
    undefined,
  );
  assert.equal(
    readProductionJob("furnace", { recipe: "smelt-metal", remaining: -1 }),
    undefined,
  );
  assert.equal(
    readProductionJob("furnace", { recipe: "smelt-metal", remaining: 999 }),
    undefined,
  );
  assert.equal(
    readSave(
      JSON.stringify({
        ...saved,
        pieces: [{ ...f, job: { recipe: "bad", remaining: 4 } }],
      }),
    ).pieces.length,
    1,
  );
});
test("stations share the two-metre floor grid, protect supporting floors and do not overlap storage", () => {
  const floor: Piece = { id: "floor", kind: "floor", x: 0, z: 34, rotation: 0 },
    f = furnace(),
    player = { x: 3, z: 34 };
  assert.match(placementReason(f, player, [], 1000), /floor or foundation/);
  assert.equal(placementReason(f, player, [floor], 1000), "");
  assert.equal(pieceBase(f, [floor]), 0.18);
  assert(!canRemove(floor, [floor, f]));
  assert.match(
    placementReason({ ...f, kind: "workbench" }, player, [floor, f], 1000),
    /occupied/,
  );
  assert.match(
    placementReason({ ...f, kind: "storage" }, player, [floor, f], 1000),
    /occupied/,
  );
  assert(blocked({ x: 0, z: 34 }, [floor, f], 0.18));
  assert.equal(pieceCost(f), 50);
  assert.equal(pieceCost({ ...f, kind: "workbench", material: "metal" }), 100);
  const top = { ...floor, id: "upper", y: 2.68 };
  const placed = snapOnStructure({ x: 0.2, z: 34.2 }, "workbench", 1, top, [
    top,
  ]);
  assert.equal(placed.y, platformTop(top, [top]));
  assert.equal(
    pieceBox({ ...placed, id: "preview" }).depth,
    STATIONS.workbench.width,
  );
});
test("station health uses the existing C4 rules with physical station bounds", () => {
  let f = furnace();
  for (let i = 0; i < 2; i++) {
    const result = damageStructuresWithC4([f], { x: 0, y: 0.6, z: 34 }, f.id);
    assert.equal(result.pieces.length, 1);
    f = result.pieces[0];
  }
  assert.equal(
    damageStructuresWithC4([f], { x: 0, y: 0.6, z: 34 }, f.id).pieces.length,
    0,
  );
  const b = bench();
  assert.equal(
    damageStructuresWithC4([b], { x: 4, y: 0.6, z: 34 }, b.id).pieces.length,
    0,
  );
});
test("six real Blender exports have valid bounded geometry and all recipe outputs map to inventory items", () => {
  const base = "apps/client/static/assets/crafting/";
  for (const key of [
    "station-workbench",
    "station-furnace",
    "item-sulfur-refined",
    "item-metal-fragments",
    "item-charcoal",
    "item-gunpowder",
  ]) {
    const bytes = readFileSync(base + key + ".glb");
    assert.equal(bytes.toString("utf8", 0, 4), "glTF");
    const g = JSON.parse(
      bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)),
    );
    assert(g.nodes.some((n: { name: string }) => n.name === key));
    const tris = g.meshes
      .flatMap((m: { primitives: { indices: number }[] }) => m.primitives)
      .reduce(
        (n: number, p: { indices: number }) =>
          n + g.accessors[p.indices].count / 3,
        0,
      );
    assert(tris < 10000);
  }
  for (const r of RECIPES)
    for (const [kind, n] of Object.entries(r.outputs)) {
      const inv = emptyInventory();
      assert.equal(addItem(inv, kind as Parameters<typeof addItem>[1], n!), n);
    }
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  readSave,
  pieceBase,
  pieceCost,
  dismantleRefund,
  blocked,
  type Piece,
  type PieceKind,
} from "../apps/client/src/fps/world";
import {
  structureHealth,
  maxStructureHealth,
  structureMaterial,
  type StructureMaterial,
} from "../apps/client/src/fps/structure-health";
import {
  damageStructuresWithC4,
  structureBlastPoint,
} from "../apps/client/src/fps/structure-damage";
const piece = (
  material?: StructureMaterial,
  kind: PieceKind = "wall",
): Piece => ({
  id: "target",
  kind,
  x: 40,
  z: 42,
  rotation: 0,
  ...(material ? { material } : {}),
});
test("every player piece takes exactly one, three, or five C4 charges for wood, stone, or metal", () => {
  for (const kind of [
    "floor",
    "foundation",
    "wall",
    "doorway",
    "door",
    "storage",
  ] as const)
    for (const [material, count] of [
      ["wood", 1],
      ["stone", 3],
      ["metal", 5],
    ] as const) {
      const p = piece(material, kind);
      let pieces = [p];
      assert.equal(maxStructureHealth(p), count * 100);
      for (let charge = 1; charge <= count; charge++) {
        const result = damageStructuresWithC4(
          pieces,
          { x: 40, y: 1, z: 42 },
          p.id,
        );
        pieces = result.pieces;
        if (charge < count) {
          assert.equal(pieces.length, 1);
          assert.equal(structureHealth(pieces[0]), (count - charge) * 100);
        } else assert.equal(pieces.length, 0);
      }
    }
});
test("old saved structures remain full-health wood; tier and partial damage survive reload", () => {
  const legacy = { version: 1, wood: 600, pieces: [piece()], opened: [0, 4] };
  assert.deepEqual(readSave(JSON.stringify(legacy)), legacy);
  assert.equal(structureHealth(legacy.pieces[0]), 100);
  assert.equal(structureMaterial(legacy.pieces[0]), "wood");
  let save = { ...legacy, pieces: [piece("metal")] };
  save.pieces = damageStructuresWithC4(
    save.pieces,
    { x: 40, y: 1, z: 42 },
    "target",
  ).pieces;
  save = readSave(JSON.stringify(save));
  assert.equal(save.pieces[0].health, 400);
  for (let i = 0; i < 4; i++)
    save.pieces = damageStructuresWithC4(
      save.pieces,
      { x: 40, y: 1, z: 42 },
      "target",
    ).pieces;
  assert.equal(readSave(JSON.stringify(save)).pieces.length, 0);
  assert.equal(save.wood, 600);
  assert.deepEqual(save.opened, [0, 4]);
});
test("C4 uses the nearest physical surface, respects cover, and cannot damage distant or other-level pieces", () => {
  const near = piece("stone"),
    hidden = { ...piece("metal"), id: "hidden", x: 42 },
    far = { ...piece("wood"), id: "far", x: 50 },
    upper = { ...piece("wood"), id: "upper", y: 8 };
  const result = damageStructuresWithC4(
    [near, hidden, far, upper],
    { x: 40, y: 1, z: 42 },
    "target",
    (p) => p.id !== "hidden",
  );
  assert.deepEqual(result.damaged, ["target"]);
  assert.equal(near.health, 200);
  assert.equal(hidden.health, undefined);
  assert.equal(upper.health, undefined);
  const wide = piece("wood");
  const blast = { x: 42.9, y: 1, z: 42 };
  assert(Math.hypot(wide.x - blast.x, wide.z - blast.z) > 2.5);
  assert.equal(damageStructuresWithC4([wide], blast).destroyed.length, 1);
});
test("destroyed geometry leaves collision and intact legacy pieces keep their height", () => {
  const wall = piece();
  assert(blocked({ x: 40, z: 42 }, [wall]));
  const result = damageStructuresWithC4(
    [wall],
    { x: 40, y: 1, z: 42 },
    wall.id,
  );
  assert(!blocked({ x: 40, z: 42 }, result.pieces));
  const foundation = { ...piece("wood", "foundation"), id: "base" },
    floor = { ...piece("metal", "floor"), id: "slab" };
  const before = pieceBase(floor, [foundation, floor]);
  assert.equal(before, 0.5);
  const after = damageStructuresWithC4(
    [foundation, floor],
    { x: 40, y: 0.2, z: 42 },
    foundation.id,
  ).pieces;
  assert.equal(after.length, 1);
  assert.equal(pieceBase(after[0], after), before);
  assert.equal(after[0].health, 400);
});
test("open doors use their rotated panel and damaged dismantles cannot refund a pristine piece", () => {
  const door = { ...piece("stone", "door"), open: true };
  const p = structureBlastPoint(door, [door], { x: 39.46, y: 1, z: 42.5 });
  assert(Math.abs(p.x - 39.46) < 0.06);
  assert.equal(pieceCost(piece("metal", "floor")), 40);
  assert.equal(
    dismantleRefund({ ...piece("stone", "floor"), health: 200 }),
    16,
  );
  assert.equal(dismantleRefund(piece()), 5);
});
test("optional corrupt durability fields do not wipe an otherwise valid old base", () => {
  const save = readSave(
    JSON.stringify({
      version: 1,
      wood: 800,
      pieces: [{ ...piece(), material: "bad", health: 9999 }],
      opened: [],
    }),
  );
  assert.equal(save.pieces.length, 1);
  assert.equal(structureMaterial(save.pieces[0]), "wood");
  assert.equal(structureHealth(save.pieces[0]), 100);
});

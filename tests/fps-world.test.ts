import test from "node:test";
import assert from "node:assert/strict";
import {
  START,
  BUILDINGS,
  LOOT,
  TREES,
  blocked,
  blockedTerrain,
  movePlayer,
  snapPiece,
  placementReason,
  canRemove,
  readSave,
  riverX,
  type Piece,
} from "../apps/client/src/fps/world.js";
test("small 3D world has a clear spawn, blocked building walls, trees and water, and a passable bridge", () => {
  assert(!blocked(START, []));
  for (const b of BUILDINGS)
    assert(blocked({ x: b.x + b.width / 2, z: b.z }, []));
  for (const t of TREES) assert(blocked(t, []));
  assert(blockedTerrain({ x: riverX(30), z: 30 }));
  assert(!blockedTerrain({ x: 47, z: 7 }));
  assert(blockedTerrain({ x: 63, z: 0 }));
  assert(LOOT.length >= 5);
  assert(LOOT[3].width / LOOT[3].depth > LOOT[4].width / LOOT[4].depth);
});
test("first-person movement cannot tunnel through a building or player wall", () => {
  const result = movePlayer({ x: 3, z: -3 }, 0, -20, []);
  assert(result.z >= -5.7);
  const wall: Piece = { id: "w", kind: "wall", x: 40, z: 42, rotation: 0 };
  const stopped = movePlayer({ x: 40, z: 38 }, 0, 12, [wall]);
  assert(stopped.z < 42);
  const slide = movePlayer({ x: 40, z: 41.5 }, 3, 2, [wall]);
  assert(slide.x > 41);
});
test("floors use a two-meter grid, and walls and doorways snap to supported floor edges", () => {
  const floor: Piece = { ...snapPiece({ x: 0, z: 34 }, "floor", 0), id: "f" };
  const player = { x: 3, z: 34 };
  assert.equal(placementReason(floor, player, [], 10000), "");
  for (const rotation of [0, 1, 2, 3]) {
    const wall = snapPiece({ x: 0, z: 34 }, "wall", rotation);
    assert.equal(placementReason(wall, player, [floor], 10000), "");
    assert.match(placementReason(wall, player, [], 10000), /floor edge/);
  }
  assert.match(
    placementReason({ ...floor, x: 0, z: 14 }, START, [], 10000),
    /outside town/,
  );
  assert.match(
    placementReason({ ...floor, x: -40, z: 4 }, { x: -40, z: 8 }, [], 10000),
    /roads/,
  );
  assert.match(placementReason(floor, player, [], 0), /wood/);
  const wall: Piece = { ...snapPiece({ x: 0, z: 34 }, "wall", 0), id: "w" };
  assert(!canRemove(floor, [floor, wall]));
  assert(canRemove(wall, [floor, wall]));
  assert.match(
    placementReason({ ...wall, kind: "doorway" }, player, [floor, wall], 10000),
    /occupied/,
  );
});
test("prototype save is isolated, validated, and retains wood and placed pieces", () => {
  assert.equal(readSave(null).wood, 10000);
  assert.deepEqual(readSave("{bad"), readSave(null));
  const piece: Piece = { id: "f", kind: "floor", x: 0, z: 34, rotation: 0 };
  const saved = { version: 1, wood: 9992, pieces: [piece], opened: [0, 4] };
  assert.deepEqual(readSave(JSON.stringify(saved)), saved);
  assert.deepEqual(
    readSave(
      JSON.stringify({ ...saved, pieces: [{ ...piece, kind: "constructor" }] }),
    ),
    readSave(null),
  );
  assert.deepEqual(
    readSave(JSON.stringify({ ...saved, pieces: [piece, piece] })),
    readSave(null),
  );
  assert.deepEqual(
    readSave(JSON.stringify({ ...saved, pieces: [{ ...piece, x: Infinity }] })),
    readSave(null),
  );
});

test("open doorways allow their opening but block their posts, and the 100-piece limit is enforced", () => {
  const door: Piece = { id: "d", kind: "doorway", x: 0, z: 34, rotation: 0 };
  assert(!blocked({ x: 0, z: 34 }, [door]));
  assert(blocked({ x: 0.78, z: 34 }, [door]));
  const floor: Piece = { id: "f", kind: "floor", x: 0, z: 34, rotation: 0 };
  assert.match(
    placementReason(
      floor,
      { x: 3, z: 34 },
      Array.from({ length: 100 }, (_, i) => ({ ...floor, id: String(i) })),
      10000,
    ),
    /limit/,
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  placementReason,
  snapPiece,
  pieceBase,
  surfaceHeight,
  movePlayer,
  canRemove,
  readSave,
  advancePlayerDoor,
  playerDoorBlocks,
  type Piece,
} from "../apps/client/src/fps/world";
const foundation: Piece = {
  id: "base",
  kind: "foundation",
  x: 40,
  z: 40,
  rotation: 0,
};
const floor: Piece = { ...foundation, id: "floor", kind: "floor" };
const doorway: Piece = {
  id: "frame",
  kind: "doorway",
  x: 40,
  z: 39,
  rotation: 0,
};
const door: Piece = { ...doorway, id: "door", kind: "door", open: false };
test("wood platforms preserve the 2m grid, support walls and floors, and stay out of town/roads", () => {
  assert.deepEqual(snapPiece({ x: 40.2, z: 40.1 }, "foundation", 0), {
    kind: "foundation",
    rotation: 0,
    x: 40,
    z: 40,
  });
  assert.equal(
    placementReason(doorway, { x: 40, z: 37 }, [foundation], 10000),
    "",
  );
  assert.equal(pieceBase(floor, [foundation]), 0.5);
  assert(Math.abs(surfaceHeight(floor, [foundation, floor]) - 0.68) < 1e-9);
  assert(Math.abs(pieceBase(doorway, [foundation, floor]) - 0.68) < 1e-9);
  assert.match(
    placementReason({ ...foundation, x: 0, z: 14 }, { x: 0, z: 14 }, [], 10000),
    /outside town/,
  );
  assert.match(
    placementReason(
      { ...doorway, kind: "door" },
      { x: 40, z: 37 },
      [foundation],
      10000,
    ),
    /in a doorway/,
  );
  assert.equal(
    placementReason(
      { ...doorway, kind: "door" },
      { x: 40, z: 37 },
      [foundation, doorway],
      10000,
    ),
    "",
  );
  assert.equal(
    placementReason(floor, { x: 40, z: 37 }, [foundation], 10000),
    "",
  );
});
test("player doors rotate with the frame and a closing leaf cannot sweep through a player", () => {
  for (const rotation of [0, 1, 2, 3]) {
    const d = { ...door, rotation };
    const yaw = (rotation * Math.PI) / 2;
    const player = {
      x: d.x + Math.sin(yaw) * 0.2,
      z: d.z + Math.cos(yaw) * 0.2,
    };
    assert(playerDoorBlocks(player, d));
    d.open = true;
    advancePlayerDoor(d, 1, []);
    assert(!playerDoorBlocks({ x: d.x, z: d.z }, d));
    d.open = false;
    advancePlayerDoor(d, 1, [player]);
    assert(Math.abs(d.doorAngle!) > 0.1);
  }
  const closed = movePlayer({ x: 40, z: 37 }, 0, 4, [
    foundation,
    doorway,
    door,
  ]);
  assert(closed.z < 39);
  const opened = movePlayer({ x: 40, z: 37 }, 0, 4, [
    foundation,
    doorway,
    { ...door, open: true },
  ]);
  assert(opened.z > 40);
});
test("saved wood and old floors survive new kinds, while door state persists without transient animation", () => {
  const saved = readSave(
    JSON.stringify({
      version: 1,
      wood: 9876,
      pieces: [
        foundation,
        floor,
        doorway,
        { ...door, open: true, doorAngle: -0.3 },
      ],
      opened: [0],
    }),
  );
  assert.equal(saved.wood, 9876);
  assert.equal(saved.pieces.length, 4);
  assert.equal(saved.pieces[3].open, true);
  assert.equal(saved.pieces[3].doorAngle, undefined);
  assert(!canRemove(foundation, saved.pieces));
  assert(!canRemove(floor, saved.pieces));
  assert(!canRemove(doorway, saved.pieces));
  assert(canRemove(door, saved.pieces));
  assert.equal(
    readSave(
      JSON.stringify({ version: 1, wood: 1234, pieces: [floor], opened: [] }),
    ).wood,
    1234,
  );
});

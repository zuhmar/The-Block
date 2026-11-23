import test from "node:test";
import assert from "node:assert/strict";
import {
  snapOnStructure,
  pieceBase,
  placementReason,
  canRemove,
  surfaceHeight,
  ceilingHeight,
  blocked,
  readSave,
  type Piece,
} from "../apps/client/src/fps/world";
const base: Piece = {
  id: "base",
  kind: "foundation",
  x: 40,
  z: 40,
  rotation: 0,
};
const floor: Piece = { ...base, id: "ground", kind: "floor" };
const wall: Piece = { id: "wall", kind: "wall", x: 40, z: 39, rotation: 0 };
const initial = [base, floor, wall];
const upper: Piece = { ...floor, id: "upper", y: 3.18 };
const all = [...initial, upper];
test("floors snap to wall tops above an occupied ground cell and keep their elevation on reload", () => {
  const p = snapOnStructure(
    { x: 40, z: 39, y: 2.8 },
    "floor",
    0,
    wall,
    initial,
  );
  assert.equal(p.x, 40);
  assert.equal(p.z, 40);
  assert(Math.abs(p.y! - 3.18) < 1e-8);
  assert.equal(placementReason(p, { x: 40, z: 37, y: 0 }, initial, 10000), "");
  assert.match(placementReason(p, { x: 40, z: 37 }, all, 10000), /occupied/);
  assert.match(
    placementReason({ ...p, y: 8 }, { x: 40, z: 37 }, initial, 10000),
    /wall top/,
  );
  const loaded = readSave(
    JSON.stringify({ version: 1, wood: 9899, pieces: all, opened: [] }),
  );
  assert.equal(loaded.wood, 9899);
  assert.equal(loaded.pieces[3].y, 3.18);
  assert.equal(loaded.pieces[1].y, undefined);
});
test("upper walls and doorways snap to the upper floor and are independent from lower edges", () => {
  const p = snapOnStructure(
    { x: 40, z: 39.05, y: 3.36 },
    "doorway",
    0,
    upper,
    all,
  );
  assert(Math.abs(p.y! - 3.36) < 1e-8);
  assert.equal(placementReason(p, { x: 40, z: 37, y: 0 }, all, 10000), "");
  const frame: Piece = { ...p, id: "frame" };
  const door = snapOnStructure({ x: 40, z: 39, y: 4 }, "door", 0, frame, [
    ...all,
    frame,
  ]);
  assert(Math.abs(door.y! - 3.36) < 1e-8);
  assert.equal(
    placementReason(door, { x: 40, z: 37, y: 0 }, [...all, frame], 10000),
    "",
  );
  assert(Math.abs(pieceBase(frame, all) - 3.36) < 1e-8);
});
test("ceilings do not teleport ground players upstairs, and each story collides at its own height", () => {
  assert(Math.abs(surfaceHeight({ x: 40, z: 40 }, all, 0.75) - 0.68) < 1e-8);
  assert(Math.abs(surfaceHeight({ x: 40, z: 40 }, all, 3.5) - 3.36) < 1e-8);
  assert.equal(ceilingHeight({ x: 40, z: 40 }, all, 0.68), 3.18);
  assert.equal(ceilingHeight({ x: 40, z: 40 }, all, 3.36), Infinity);
  assert(blocked({ x: 40, z: 39 }, all, 0.68));
  assert(!blocked({ x: 40, z: 39 }, all, 3.36));
  const topWall: Piece = { ...wall, id: "top-wall", y: 3.36 };
  assert(blocked({ x: 40, z: 39 }, [...all, topWall], 3.36));
});
test("supporting walls and upper floors cannot be dismantled out from underneath dependent pieces", () => {
  assert(!canRemove(wall, all));
  assert(canRemove(upper, all));
  const topWall: Piece = { ...wall, id: "top-wall", y: 3.36 };
  assert(!canRemove(upper, [...all, topWall]));
  assert(canRemove(topWall, [...all, topWall]));
  assert(!canRemove(floor, all));
});

test("adding a ground slab cannot move walls away from their saved upper floor", () => {
  const ceiling: Piece = { ...upper, y: 3 };
  assert.match(
    placementReason(floor, { x: 40, z: 37 }, [base, wall, ceiling], 10000),
    /upper floors/,
  );
});

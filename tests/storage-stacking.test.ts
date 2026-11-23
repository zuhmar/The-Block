import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pieceBase,
  platformTop,
  placementReason,
  snapOnStructure,
  pieceBox,
  canRemove,
  surfaceHeight,
  ceilingHeight,
  pieceCost,
  type Piece,
} from "../apps/client/src/fps/world";
import { storageSpec } from "../apps/client/src/fps/storage-spec";
const floor: Piece = { id: "floor", kind: "floor", x: -42, z: 40, rotation: 0 };
const player = { x: -46, z: 40 };
const chest = (
  id: string,
  size: "small" | "large" = "small",
  y?: number,
): Piece => ({
  id,
  kind: "storage",
  storageSize: size,
  x: floor.x,
  z: floor.z,
  rotation: 0,
  ...(y === undefined ? {} : { y }),
});
test("small and large storage have distinct capacities, footprints and build costs", () => {
  const small = chest("small"),
    large = chest("large", "large");
  assert.equal(storageSpec(small).slots, 20);
  assert.equal(storageSpec(large).slots, 40);
  assert.equal(pieceCost(small), 5);
  assert.equal(pieceCost(large), 15);
  assert.equal(pieceBox(large).width, 1.8);
  large.rotation = 1;
  assert.equal(pieceBox(large).depth, 1.8);
  assert.equal(pieceBox(large).width, 1);
});
test("chests snap to the exact supporting lid, including rotated large stacks", () => {
  const lower = chest("lower", "large");
  lower.rotation = 1;
  const pieces = [floor, lower],
    upper = {
      ...snapOnStructure({ x: -41.9, z: 40.1 }, "storage", 1, lower, pieces),
      storageSize: "large" as const,
    };
  assert.equal(upper.x, lower.x);
  assert.equal(upper.z, lower.z);
  assert.equal(upper.y, pieceBase(lower, pieces) + storageSpec(lower).height);
  assert.equal(placementReason(upper, player, pieces, 500), "");
  assert.equal(canRemove(lower, [...pieces, { ...upper, id: "upper" }]), false);
  assert.equal(
    canRemove({ ...upper, id: "upper" }, [
      ...pieces,
      { ...upper, id: "upper" },
    ]),
    true,
  );
});
test("small-on-large and small-on-small are allowed; large overhang and unsupported heights are rejected", () => {
  for (const size of ["small", "large"] as const) {
    const lower = chest("lower", size),
      pieces = [floor, lower],
      small = {
        ...snapOnStructure(lower, "storage", 0, lower, pieces),
        storageSize: "small" as const,
      };
    assert.equal(placementReason(small, player, pieces, 500), "");
  }
  const lower = chest("lower"),
    pieces = [floor, lower],
    large = {
      ...snapOnStructure(lower, "storage", 0, lower, pieces),
      storageSize: "large" as const,
    };
  assert.match(placementReason(large, player, pieces, 500), /supported/);
  assert.match(
    placementReason(chest("floating", "small", 5), player, [floor], 500),
    /supported/,
  );
});
test("placement rejects an occupied lid, side overhang and intersections with an upper floor", () => {
  const lower = chest("lower", "large"),
    pieces = [floor, lower],
    upper = {
      ...snapOnStructure(lower, "storage", 0, lower, pieces),
      storageSize: "small" as const,
      id: "upper",
    };
  assert.match(
    placementReason(upper, player, [...pieces, upper], 500),
    /overlap|occupied/,
  );
  assert.match(
    placementReason({ ...upper, x: upper.x + 0.7 }, player, pieces, 500),
    /supported/,
  );
  const ceiling: Piece = { ...floor, id: "ceiling", y: 1.5 };
  assert.match(
    placementReason(upper, player, [...pieces, ceiling], 500),
    /overlap/,
  );
});
test("stack tops supply walkable surfaces without recursive legacy base calculations", () => {
  const lower = chest("lower"),
    pieces = [floor, lower],
    upper = {
      ...snapOnStructure(lower, "storage", 0, lower, pieces),
      id: "upper",
      storageSize: "small" as const,
    };
  pieces.push(upper);
  assert.equal(pieceBase(lower, pieces), platformTop(floor, pieces));
  assert.equal(surfaceHeight(floor, pieces, 3), pieceBase(upper, pieces) + 0.8);
  assert.equal(canRemove(floor, pieces), false);
  assert.equal(ceilingHeight(floor, [floor, chest("above", "large", 2)], 0), 2);
});

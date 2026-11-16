import { WORLD, inRect } from "../shared/src/index.js";

// Shared deterministic scenery keeps the world and district map in agreement.
// Trees stay outside every house clearing and road shoulder.
export function forestTrees() {
  const trees: { x: number; y: number; variant: number; scale: number }[] = [];
  let seed = 78231;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let y = 96; y < WORLD.height - 64; y += 56)
    for (let x = 96; x < WORLD.width - 64; x += 56) {
      const point = { x: x + random() * 40 - 20, y: y + random() * 40 - 20 };
      if (
        inRect(point, WORLD.townRect) ||
        WORLD.roads.some((r) => inRect(point, r, 100)) ||
        WORLD.parcelRects.some((r) => inRect(point, r, 72)) ||
        random() < 0.15
      )
        continue;
      trees.push({
        ...point,
        variant: Math.floor(random() * 4),
        scale: 0.8 + random() * 0.35,
      });
    }
  return trees;
}

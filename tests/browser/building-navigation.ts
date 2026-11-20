import { writeFile } from "node:fs/promises";
import { blocked } from "../../apps/client/src/fps/world";
import {
  BUILDINGS,
  frontOf,
  resetDoors,
} from "../../apps/client/src/fps/building-layout";
resetDoors();
const minX = -28,
  maxX = 32,
  minZ = -24,
  maxZ = 30,
  step = 0.5,
  width = Math.round((maxX - minX) / step) + 1,
  height = Math.round((maxZ - minZ) / step) + 1,
  walls: number[] = [];
for (let y = 0; y < height; y++)
  for (let x = 0; x < width; x++)
    if (
      [
        [-0.15, -0.15],
        [-0.15, 0.15],
        [0.15, -0.15],
        [0.15, 0.15],
      ].some(([dx, dz]) =>
        blocked({ x: minX + x * step + dx, z: minZ + y * step + dz }, []),
      )
    )
      walls.push(y * width + x);
await writeFile(
  "work/building-nav.json",
  JSON.stringify({
    minX,
    minZ,
    step,
    width,
    height,
    walls,
    buildings: BUILDINGS.map((b, i) => ({
      ...b,
      index: i,
      front: frontOf(b),
      doorZ: b.z + (frontOf(b) * b.depth) / 2,
    })),
  }),
);

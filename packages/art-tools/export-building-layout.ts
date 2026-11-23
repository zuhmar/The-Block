import { writeFile } from "node:fs/promises";
import {
  BUILDINGS,
  fixtures,
  partitions,
  buildingSlabs,
  buildingStairs,
  buildingStories,
  frontOf,
  DOOR_WIDTH,
  OPENING_WIDTH,
  WALL,
} from "../../apps/client/src/fps/building-layout";
await writeFile(
  "art/buildings/blender/layout.json",
  JSON.stringify(
    {
      doorWidth: DOOR_WIDTH,
      openingWidth: OPENING_WIDTH,
      wall: WALL,
      buildings: BUILDINGS.map((b, i) => ({
        ...b,
        front: frontOf(b),
        stories: buildingStories(b),
        slabs: buildingSlabs(i),
        stairs: buildingStairs(i),
        fixtures: fixtures(i),
        partitions: partitions(i),
      })),
    },
    null,
    2,
  ) + "\n",
);

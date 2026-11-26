import { mkdirSync, writeFileSync } from "node:fs";
import {
  BUILDINGS,
  frontOf,
  buildingStories,
  buildingStairs,
  buildingSlabs,
  fixtures,
  partitions,
  STORY_HEIGHT,
  DOOR_WIDTH,
  OPENING_WIDTH,
  WALL,
} from "../../apps/client/src/fps/building-layout";
const index = BUILDINGS.findIndex((b) => b.type === "tenement"),
  b = BUILDINGS[index];
const root = "art/buildings/apartments/tenement-v2";
mkdirSync(root, { recursive: true });
writeFileSync(
  `${root}/layout.json`,
  JSON.stringify(
    {
      ...b,
      front: frontOf(b),
      stories: buildingStories(b),
      storyHeight: STORY_HEIGHT,
      doorWidth: DOOR_WIDTH,
      openingWidth: OPENING_WIDTH,
      wallThickness: WALL,
      stairs: buildingStairs(index),
      slabs: buildingSlabs(index),
      fixtures: fixtures(index),
      partitions: partitions(index),
    },
    null,
    2,
  ) + "\n",
);

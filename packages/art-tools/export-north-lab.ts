import { writeFile } from "node:fs/promises";
import {
  NORTH_PROPS,
  NORTH_LAB,
  northYardBoxes,
  isNorthBuilding,
} from "../../apps/client/src/fps/north-lab-layout";
import {
  BUILDINGS,
  fixtures,
  partitions,
  frontOf,
} from "../../apps/client/src/fps/building-layout";
await writeFile(
  "art/buildings/north-lab/yard.json",
  JSON.stringify(
    {
      center: NORTH_LAB,
      props: NORTH_PROPS,
      barriers: northYardBoxes().slice(0, 8),
    },
    null,
    2,
  ),
);
await writeFile(
  "art/buildings/north-lab/layout.json",
  JSON.stringify(
    BUILDINGS.flatMap((b, i) =>
      isNorthBuilding(b.type)
        ? [
            {
              ...b,
              front: frontOf(b),
              fixtures: fixtures(i),
              partitions: partitions(i),
            },
          ]
        : [],
    ),
    null,
    2,
  ),
);

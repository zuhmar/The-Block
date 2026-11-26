import { mkdirSync, writeFileSync } from "node:fs";
import { configureCompactCity } from "../../apps/client/src/fps/compact-city";
import {
  BUILDINGS,
  buildingSlabs,
  buildingStairs,
  fixtures,
  partitions,
} from "../../apps/client/src/fps/building-layout";
import { apartmentDoors } from "../../apps/client/src/fps/city-apartments-layout";
const undo = configureCompactCity();
try {
  const index = BUILDINGS.findIndex((b) => b.type === "city-apartments");
  const root = "art/buildings/apartments/west-court";
  mkdirSync(root, { recursive: true });
  writeFileSync(
    `${root}/layout.json`,
    JSON.stringify(
      {
        ...BUILDINGS[index],
        front: 1,
        stories: 3,
        doorWidth: 1.6,
        openingWidth: 1.8,
        wallThickness: 0.22,
        stairs: buildingStairs(index),
        slabs: buildingSlabs(index),
        fixtures: fixtures(index),
        partitions: partitions(index),
        doors: apartmentDoors,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  undo();
}

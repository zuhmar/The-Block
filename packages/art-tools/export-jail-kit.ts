import {
  BUILDINGS,
  fixtures,
  partitions,
} from "../../apps/client/src/fps/building-layout";
import { writeFileSync } from "node:fs";
import {
  JAIL_KIT_TOWERS,
  JAIL_KIT_PROPS,
  JAIL_KIT_GATES,
  JAIL_BUILDING_WALLS,
  JAIL_BUILDING_SLABS,
} from "../../apps/client/src/fps/jail-kit-layout";
writeFileSync(
  "art/building-kits/jail-meshy/integration-layout.json",
  JSON.stringify({
    jail: {
      walls: JAIL_BUILDING_WALLS,
      slabs: JAIL_BUILDING_SLABS,
      fixtures: fixtures(BUILDINGS.findIndex((b) => b.type === "jail")),
      partitions: partitions(BUILDINGS.findIndex((b) => b.type === "jail")),
    },
    towers: JAIL_KIT_TOWERS,
    props: JAIL_KIT_PROPS,
    gates: JAIL_KIT_GATES,
  }),
);

import { writeFileSync } from "node:fs";
import {
  JAIL_KIT_TOWERS,
  JAIL_KIT_PROPS,
  JAIL_KIT_GATES,
} from "../../apps/client/src/fps/jail-kit-layout";
writeFileSync(
  "art/building-kits/jail-meshy/integration-layout.json",
  JSON.stringify({
    towers: JAIL_KIT_TOWERS,
    props: JAIL_KIT_PROPS,
    gates: JAIL_KIT_GATES,
  }),
);

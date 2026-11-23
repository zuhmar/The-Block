import { mkdirSync, writeFileSync } from "node:fs";
import {
  HARBOR,
  DECKS,
  PIERS,
  CONTAINERS,
  HARBOR_BOXES,
} from "../../apps/client/src/fps/harbor-layout";
mkdirSync("art/models/harbor", { recursive: true });
writeFileSync(
  "art/models/harbor/layout.json",
  JSON.stringify(
    {
      bounds: HARBOR,
      decks: DECKS,
      piers: PIERS,
      containers: CONTAINERS,
      boxes: HARBOR_BOXES,
    },
    null,
    2,
  ) + "\n",
);

import { initializeFpsMap } from "../../apps/server/src/fps/map.js";
import {
  BUILDINGS,
  buildingYaw,
} from "../../apps/client/src/fps/building-layout.js";
import { JAIL_OFFSET } from "../../apps/client/src/fps/jail-ground-layout.js";
import { existsSync, writeFileSync } from "node:fs";
initializeFpsMap();
const city = BUILDINGS.filter(
  (b) =>
    Math.abs(b.x) < 90 &&
    b.z > -80 &&
    b.z < -20 &&
    existsSync(`apps/client/src/fps/models/buildings/${b.type}.glb`),
)
  .slice(0, 8)
  .map((b) => ({ ...b, z: b.z - JAIL_OFFSET.z, yaw: buildingYaw(b) }));
writeFileSync(
  "art/cinematics/jail-release/layout.json",
  JSON.stringify({ offset: JAIL_OFFSET, city }, null, 2),
);

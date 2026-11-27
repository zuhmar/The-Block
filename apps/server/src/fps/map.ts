import { configureCompactCity } from "../../../client/src/fps/compact-city.js";
import { COMPACT } from "../../../client/src/fps/compact-plan.js";
import { normalizeRoadsideLoot } from "../../../client/src/fps/roadside-bounds.js";
export function initializeFpsMap() {
  if (!COMPACT.active) configureCompactCity();
  normalizeRoadsideLoot();
}

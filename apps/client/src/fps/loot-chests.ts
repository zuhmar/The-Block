import {
  preloadRoadsideModels,
  roadsideModel,
  roadsideSources,
} from "./roadside-models";
const names = [
  "tier-1-small",
  "tier-2-supply",
  "tier-3-reinforced",
  "tier-4-long",
  "tier-5-heavy",
];
export const preloadLootChests = preloadRoadsideModels;
export function lootChestModel(tier: number) {
  return roadsideModel(names[tier - 1]);
}
export function lootChestSources() {
  return names
    .map(
      (name, i) =>
        `${i + 1}:${roadsideSources().includes(name) ? "meshy-roadside" : "fallback"}`,
    )
    .join(",");
}

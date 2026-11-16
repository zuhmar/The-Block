import { canCarry, type Inventory, type Item } from "../shared/src/index.js";

export const LOOT_CRATES = [
  {
    id: "small",
    name: "Small crate",
    color: "#c9ad7e",
    size: 56,
    rolls: 1,
    pool: ["wood", "scrap", "water", "snack", "stone"],
  },
  {
    id: "supply",
    name: "Supply crate",
    color: "#b6d3a3",
    size: 60,
    rolls: 2,
    pool: ["bandage", "brick", "concrete", "glass", "water"],
  },
  {
    id: "reinforced",
    name: "Reinforced crate",
    color: "#8fbde5",
    size: 64,
    rolls: 3,
    pool: ["steel", "electronics", "bandage", "ammo", "glass"],
  },
  {
    id: "military",
    name: "Military cache",
    color: "#e4c875",
    size: 96,
    rolls: 4,
    pool: ["electronics", "steel", "bandage", "ammo", "pistol"],
  },
  {
    id: "advanced",
    name: "Advanced cache",
    color: "#7de8df",
    size: 104,
    rolls: 5,
    pool: ["pistol", "electronics", "steel", "ammo", "bandage"],
  },
] as const;
// Progression follows the city's scavenging sites; the best cache is far east.
export const SCAVENGE_CRATE_TIERS = [0, 1, 2, 3, 2, 4] as const;
export function lootCrateAt(index: number) {
  const tier = SCAVENGE_CRATE_TIERS[index] ?? 0;
  return {
    ...LOOT_CRATES[tier],
    tier: tier + 1,
    key: `loot-crate-${LOOT_CRATES[tier].id}`,
  };
}

// Plan rewards without mutating inventory. Skip full stacks and repeated unique
// weapons, rather than making a high-tier cache unusable for an armed survivor.
export function rollCrateLoot(
  tierIndex: number,
  inventory: Inventory,
  random = Math.random,
) {
  const tier = LOOT_CRATES[tierIndex];
  if (!tier) throw Error("Invalid crate tier");
  const next = { ...inventory },
    items: Inventory = {};
  const quantity = (item: Item) =>
    item === "wood" ? 6 : item === "ammo" ? 2 + tierIndex * 2 : 1;
  for (let roll = 0; roll < tier.rolls; roll++) {
    const pool = (tier.pool as readonly Item[]).filter((item) =>
      canCarry(next, item, quantity(item)),
    );
    if (!pool.length) break;
    const item =
      tierIndex === 4 && roll === 0 && pool.includes("pistol")
        ? "pistol"
        : pool[
            Math.min(
              pool.length - 1,
              Math.max(0, Math.floor(random() * pool.length)),
            )
          ];
    const n = quantity(item);
    next[item] = (next[item] || 0) + n;
    items[item] = (items[item] || 0) + n;
  }
  return { inventory: next, items };
}

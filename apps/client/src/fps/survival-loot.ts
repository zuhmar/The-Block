import { LOOT_ITEM_KINDS, lootItemSpec } from "./loot-item-spec";
import {
  addItem,
  countItem,
  takeItem,
  type Inventory,
  type ItemKind,
} from "./inventory";
export const LOOT_COOLDOWN_MS = 10 * 60 * 1000;
export function scavengeRewards(
  inv: Inventory,
  index: number,
  wood: number,
  context?: { kind?: "trash"; tier: number; name: string },
  cycle = 0,
) {
  const next = structuredClone(inv),
    items: [ItemKind, number][] = [
      ["wood", Math.max(25, wood)],
      ["rock", 20],
      ["pistol-ammo", 24],
    ];
  const extra: ItemKind[] = [
    "axe",
    "pickaxe",
    "pistol",
    "smg",
    "rifle",
    "grenade",
  ];
  const kind = extra[index % extra.length];
  if (!countItem(next, kind)) items.push([kind, 1]);
  const tier = context?.kind === "trash" ? 1 : Math.max(1, context?.tier ?? 1);
  const pool = LOOT_ITEM_KINDS.filter(
    (k) => k !== "cash" && lootItemSpec(k).minTier <= tier,
  );
  // Rotate through every eligible pickup across containers and restocks.
  const offset = Math.abs(index + cycle);
  for (let n = 0; n < 2; n++) {
    const pickup = pool[(offset + n * 7) % pool.length];
    items.push([
      pickup,
      lootItemSpec(pickup).category === "materials" ? 10 : 1,
    ]);
  }
  for (const [k, n] of items) if (addItem(next, k, n) !== n) return;
  return { inventory: next, items, cash: 25 + (index % 6) * 15 };
}
export function handcraft(inv: Inventory, kind: "axe" | "pickaxe") {
  const rock = kind === "axe" ? 10 : 15;
  if (countItem(inv, "wood") < 25 || countItem(inv, "rock") < rock) return;
  const next = structuredClone(inv);
  takeItem(next, "wood", 25);
  takeItem(next, "rock", rock);
  if (addItem(next, kind, 1) !== 1) return;
  return next;
}

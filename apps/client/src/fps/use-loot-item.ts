import { lootItemSpec } from "./loot-item-spec";
import { cleanHotbar, type Inventory } from "./inventory";
export function useLootItem(inv: Inventory, id: string, health: number) {
  const index = inv.slots.findIndex((s) => s?.id === id),
    item = inv.slots[index],
    heal = item ? lootItemSpec(item.kind)?.heal : 0;
  if (
    !item ||
    !heal ||
    !Number.isFinite(health) ||
    health <= 0 ||
    health >= 100
  )
    return;
  const next = structuredClone(inv);
  const stack = next.slots[index]!;
  if (--stack.quantity === 0) next.slots[index] = null;
  cleanHotbar(next);
  return {
    inventory: next,
    health: Math.min(100, health + heal),
    kind: item.kind,
  };
}

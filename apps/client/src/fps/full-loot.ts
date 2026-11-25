import { emptyInventory, type Inventory, type WorldDrop } from "./inventory";
import type { SurvivalState } from "./survival-state";
/** Drop only carried equipment. Existing home/legacy reserve contents are not carried. */
export function dropCarriedOnDeath(
  inv: Inventory,
  s: SurvivalState,
  p: { x: number; z: number; y: number },
) {
  if (s.dead) return false;
  s.dead = true;
  const carried = inv.slots.filter(Boolean);
  let i = 0;
  for (const stack of carried) {
    const a = i++ * 2.39996;
    inv.drops.push({
      ...stack!,
      x: p.x + Math.cos(a) * 0.65,
      z: p.z + Math.sin(a) * 0.65,
      y: p.y,
    } as WorldDrop);
  }
  if (s.cash) {
    inv.drops.push({
      id: "cash-" + crypto.randomUUID(),
      kind: "cash",
      quantity: s.cash,
      ...p,
    });
    s.cash = 0;
  }
  const empty = emptyInventory();
  inv.slots = empty.slots;
  inv.hotbar = empty.hotbar;
  inv.active = -1;
  inv.ammoVersion = 1;
  return true;
}

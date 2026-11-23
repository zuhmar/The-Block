import { ammoFor } from "./ammo";
import { countItem, takeItem, type Inventory } from "./inventory";
import { advanceReload, type WeaponState } from "./weapon-state";
/** Transfer carried bullets into the active magazine only when its animation completes.
 * Rockets already consume their carried charge at launch, so reloading never spends a second rocket. */
export function advanceInventoryReload(
  state: WeaponState,
  inv: Inventory,
  dt: number,
) {
  const kind = state.reload?.kind;
  if (!kind) return false;
  const ammo = ammoFor(kind),
    before = state.rounds[kind];
  const available = ammo ? countItem(inv, ammo) : 0;
  if (
    !advanceReload(
      state,
      dt,
      kind === "rocket" ? Math.min(1, available) : available,
    )
  )
    return false;
  const loaded = state.rounds[kind] - before;
  if (loaded && ammo && ammo !== "rockets") takeItem(inv, ammo, loaded);
  return true;
}

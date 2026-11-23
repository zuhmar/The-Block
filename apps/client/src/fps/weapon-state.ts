import { WEAPONS, type WeaponKind } from "./weapons";
export const MELEE = {
  range: 2.1,
  damage: 20,
  duration: 0.4,
  interval: 0.5,
  impactAt: 0.12,
} as const;
export function newWeaponState() {
  return {
    rounds: Object.fromEntries(
      Object.entries(WEAPONS).map(([k, w]) => [k, w.magazineSize]),
    ) as Record<WeaponKind, number>,
    reload: undefined as
      | { kind: WeaponKind; remaining: number; duration: number }
      | undefined,
  };
}
export type WeaponState = ReturnType<typeof newWeaponState>;
export function spendRound(state: WeaponState, kind: WeaponKind) {
  if (state.reload || state.rounds[kind] <= 0) return false;
  state.rounds[kind]--;
  return true;
}
export function beginReload(state: WeaponState, kind: WeaponKind) {
  if (state.reload || state.rounds[kind] >= WEAPONS[kind].magazineSize)
    return false;
  const duration = WEAPONS[kind].reloadSeconds;
  state.reload = { kind, remaining: duration, duration };
  return true;
}
export function advanceReload(
  state: WeaponState,
  dt: number,
  available = Infinity,
) {
  if (!state.reload) return false;
  state.reload.remaining = Math.max(
    0,
    state.reload.remaining - Math.max(0, dt),
  );
  if (state.reload.remaining > 0) return false;
  const kind = state.reload.kind;
  state.rounds[kind] += Math.min(
    WEAPONS[kind].magazineSize - state.rounds[kind],
    Math.max(0, Math.floor(available)),
  );
  state.reload = undefined;
  return true;
}
export function cancelReload(state: WeaponState) {
  state.reload = undefined;
}

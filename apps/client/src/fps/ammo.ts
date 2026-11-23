import type { WeaponKind } from "./weapons";
export const BULLET_AMMO = [
  "pistol-ammo",
  "smg-ammo",
  "rifle-ammo",
  "sniper-ammo",
  "lmg-ammo",
] as const;
export type BulletAmmo = (typeof BULLET_AMMO)[number];
export const isBulletAmmo = (kind: string): kind is BulletAmmo =>
  (BULLET_AMMO as readonly string[]).includes(kind);
export const ammoFor = (
  kind: WeaponKind,
): BulletAmmo | "rockets" | undefined =>
  kind === "rocket"
    ? "rockets"
    : kind === "grenade" || kind === "c4"
      ? undefined
      : (`${kind}-ammo` as BulletAmmo);
export const ammoModelKind = (kind: string) =>
  kind === "rockets"
    ? kind
    : isBulletAmmo(kind)
      ? kind.replace("-ammo", "")
      : undefined;
export const STARTER_AMMO: Record<BulletAmmo, number> = {
  "pistol-ammo": 120,
  "smg-ammo": 180,
  "rifle-ammo": 180,
  "sniper-ammo": 30,
  "lmg-ammo": 240,
};
export const LOOT_AMMO: Record<BulletAmmo, number> = {
  "pistol-ammo": 24,
  "smg-ammo": 30,
  "rifle-ammo": 30,
  "sniper-ammo": 5,
  "lmg-ammo": 45,
};

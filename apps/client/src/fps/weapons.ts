export const WEAPONS = {
  pistol: {
    name: "Pistol",
    magazineSize: 12,
    reloadSeconds: 1.4,
    interval: 200,
    damage: 25,
    range: 45,
    recoil: 0.7,
    zoom: 52,
    supportZ: -0.458,
  },
  smg: {
    name: "SMG",
    magazineSize: 30,
    reloadSeconds: 1.8,
    interval: 85,
    damage: 15,
    range: 35,
    recoil: 0.5,
    zoom: 50,
    supportZ: -0.65,
  },
  rifle: {
    name: "Assault rifle",
    magazineSize: 30,
    reloadSeconds: 2.1,
    interval: 135,
    damage: 30,
    range: 70,
    recoil: 1,
    zoom: 42,
    supportZ: -0.76,
  },
  sniper: {
    name: "Sniper rifle",
    magazineSize: 5,
    reloadSeconds: 2.6,
    interval: 1100,
    damage: 90,
    range: 120,
    recoil: 1.8,
    zoom: 20,
    supportZ: -0.84,
  },
  lmg: {
    name: "Light machine gun",
    magazineSize: 60,
    reloadSeconds: 3.6,
    interval: 110,
    damage: 24,
    range: 85,
    recoil: 1.2,
    zoom: 46,
    supportZ: -0.76,
  },
  rocket: {
    name: "Rocket launcher",
    magazineSize: 1,
    reloadSeconds: 3.2,
    interval: 900,
    damage: 160,
    range: 100,
    recoil: 2,
    zoom: 55,
    supportZ: -0.7,
  },
  grenade: {
    name: "Grenade",
    magazineSize: 3,
    reloadSeconds: 2,
    interval: 1100,
    damage: 110,
    range: 25,
    recoil: 0,
    zoom: 72,
    supportZ: -0.45,
  },
  c4: {
    name: "C4",
    magazineSize: 2,
    reloadSeconds: 2.4,
    interval: 900,
    damage: 180,
    range: 3,
    recoil: 0,
    zoom: 72,
    supportZ: -0.45,
  },
} as const;
export type WeaponKind = keyof typeof WEAPONS;
export type Tool = WeaponKind | "hands";
export function canShoot(kind: WeaponKind, now: number, last: number) {
  return now - last >= WEAPONS[kind].interval;
}

export const WEAPON_KINDS = Object.keys(WEAPONS) as WeaponKind[];
export const explosiveKind = (kind: WeaponKind) =>
  kind === "rocket" || kind === "grenade" || kind === "c4";
export const animationFamily = (kind: WeaponKind) =>
  (
    ({
      lmg: "Rifle",
      rocket: "Rifle",
      grenade: "Pistol",
      c4: "Pistol",
      pistol: "Pistol",
      smg: "SMG",
      rifle: "Rifle",
      sniper: "Sniper",
    }) as const
  )[kind];

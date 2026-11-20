export const WEAPONS = {
  pistol: {
    name: "Pistol",
    interval: 200,
    damage: 25,
    range: 45,
    recoil: 0.7,
    zoom: 52,
    supportZ: -0.458,
  },
  smg: {
    name: "SMG",
    interval: 85,
    damage: 15,
    range: 35,
    recoil: 0.5,
    zoom: 50,
    supportZ: -0.65,
  },
  rifle: {
    name: "Assault rifle",
    interval: 135,
    damage: 30,
    range: 70,
    recoil: 1,
    zoom: 42,
    supportZ: -0.76,
  },
  sniper: {
    name: "Sniper rifle",
    interval: 1100,
    damage: 90,
    range: 120,
    recoil: 1.8,
    zoom: 20,
    supportZ: -0.84,
  },
} as const;
export type WeaponKind = keyof typeof WEAPONS;
export type Tool = WeaponKind | "hands";
export function canShoot(kind: WeaponKind, now: number, last: number) {
  return now - last >= WEAPONS[kind].interval;
}

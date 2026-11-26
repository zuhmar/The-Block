import {
  LOOT_ITEM_KINDS,
  lootItemSpec,
  lootSprite,
  isLootItem,
} from "./loot-item-spec";
import { BULLET_AMMO, isBulletAmmo, ammoModelKind, STARTER_AMMO } from "./ammo";
import { WEAPONS, type WeaponKind, type Tool } from "./weapons";
export const CARRY_SLOTS = 20,
  HOTBAR_SLOTS = 5;
export const ITEM_KINDS = [
  ...LOOT_ITEM_KINDS,
  ...BULLET_AMMO,
  "sulfur-refined",
  "metal-fragments",
  "charcoal",
  "gunpowder",
  "wood",
  "rock",
  "sulfur",
  "metal",
  "pistol",
  "smg",
  "rifle",
  "sniper",
  "lmg",
  "rocket",
  "grenade",
  "c4",
  "rockets",
  "axe",
  "pickaxe",
] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];
export const isHarvestTool = (k: ItemKind) => k === "axe" || k === "pickaxe";
export const isResource = (k: ItemKind) =>
  [
    "wood",
    "rock",
    "sulfur",
    "metal",
    "sulfur-refined",
    "metal-fragments",
    "charcoal",
    "gunpowder",
  ].includes(k);
export const isGun = (k: ItemKind) =>
  ["pistol", "smg", "rifle", "sniper", "lmg", "rocket"].includes(k);
export const stackLimit = (k: ItemKind) =>
  lootItemSpec(k)?.stack ??
  (k === "cash"
    ? 1000000
    : isResource(k) || isBulletAmmo(k)
      ? 500
      : isGun(k) || isHarvestTool(k)
        ? 1
        : 5);
export const itemName = (k: ItemKind) =>
  lootItemSpec(k)?.name ??
  (k === "cash"
    ? "Cash"
    : ((
        {
          "pistol-ammo": "Pistol rounds",
          "smg-ammo": "SMG rounds",
          "rifle-ammo": "Rifle rounds",
          "sniper-ammo": "Sniper rounds",
          "lmg-ammo": "LMG rounds",
          wood: "Wood",
          rock: "Rock",
          sulfur: "Sulfur ore",
          "sulfur-refined": "Refined sulfur",
          "metal-fragments": "Metal fragments",
          charcoal: "Charcoal",
          gunpowder: "Gunpowder",
          metal: "Metal ore",
          rockets: "Rockets",
          axe: "Axe",
          pickaxe: "Pickaxe",
        } as Partial<Record<ItemKind, string>>
      )[k] ?? WEAPONS[k as WeaponKind].name));
export const itemIcon = (k: ItemKind) =>
  isLootItem(k)
    ? lootSprite(k)
    : ["sulfur-refined", "metal-fragments", "charcoal", "gunpowder"].includes(k)
      ? `/assets/crafting/item-${k}.png`
      : ammoModelKind(k)
        ? `/assets/ammo/ammo-${ammoModelKind(k)}.png`
        : isHarvestTool(k)
          ? `/assets/harvest-tools/${k}-preview.png`
          : isResource(k)
            ? `/assets/resource-items/item-${k}.png`
            : `/assets/weapon-icons/${({ rifle: "assault-rifle", lmg: "light-machine-gun", rocket: "rocket-launcher", rockets: "rocket-launcher" } as Partial<Record<ItemKind, string>>)[k] ?? k}.png`;
export const itemTool = (k: ItemKind): Tool =>
  isLootItem(k) ||
  isResource(k) ||
  isHarvestTool(k) ||
  isBulletAmmo(k) ||
  k === "rockets"
    ? "hands"
    : (k as WeaponKind);
export type ItemStack = {
  id: string;
  kind: ItemKind;
  quantity: number;
  magazine?: number;
};
export type WorldDrop = ItemStack & { x: number; z: number; y: number };
export type Inventory = {
  version: 1;
  ammoVersion?: 1;
  sequence: number;
  slots: (ItemStack | null)[];
  hotbar: (string | null)[];
  active: number;
  reserve: ItemStack[];
  drops: WorldDrop[];
};
export const emptyInventory = (): Inventory => ({
  version: 1,
  sequence: 1,
  slots: Array(CARRY_SLOTS).fill(null),
  hotbar: Array(HOTBAR_SLOTS).fill(null),
  active: -1,
  reserve: [],
  drops: [],
});
function nextId(inv: Inventory) {
  return "item-" + inv.sequence++;
}
export function countItem(inv: Inventory, kind: ItemKind) {
  return inv.slots.reduce(
    (sum, s) => sum + (s?.kind === kind ? s.quantity : 0),
    0,
  );
}
export function roomFor(inv: Inventory, kind: ItemKind) {
  return inv.slots.reduce(
    (n, s) =>
      n +
      (!s
        ? stackLimit(kind)
        : s.kind === kind && !isGun(kind)
          ? stackLimit(kind) - s.quantity
          : 0),
    0,
  );
}
export function addItem(inv: Inventory, kind: ItemKind, quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) return 0;
  let left = Math.max(0, Math.floor(quantity));
  const original = left,
    limit = stackLimit(kind);
  if (!isGun(kind))
    for (const s of inv.slots)
      if (s?.kind === kind) {
        const n = Math.min(left, limit - s.quantity);
        s.quantity += n;
        left -= n;
      }
  for (let i = 0; i < CARRY_SLOTS && left; i++)
    if (!inv.slots[i]) {
      const n = Math.min(left, limit);
      inv.slots[i] = {
        id: nextId(inv),
        kind,
        quantity: n,
        ...(isGun(kind)
          ? { magazine: WEAPONS[kind as WeaponKind].magazineSize }
          : {}),
      };
      left -= n;
    }
  return original - left;
}
export function cleanHotbar(inv: Inventory) {
  const ids = new Set(inv.slots.filter(Boolean).map((s) => s!.id));
  const seen = new Set<string>();
  const old = inv.hotbar,
    next: (string | null)[] = Array(5).fill(null);
  const order =
    inv.active >= 0 && inv.active < 5
      ? [inv.active, ...[0, 1, 2, 3, 4].filter((i) => i !== inv.active)]
      : [0, 1, 2, 3, 4];
  for (const i of order) {
    const id = old[i];
    if (id && ids.has(id) && !seen.has(id)) {
      seen.add(id);
      next[i] = id;
    }
  }
  inv.hotbar = next;
  if (inv.active < 0 || inv.active >= 5 || !inv.hotbar[inv.active])
    inv.active = -1;
}
export const selectedItem = (inv: Inventory) =>
  inv.slots.find((s) => s?.id === inv.hotbar[inv.active]) ?? undefined;
export function takeItem(inv: Inventory, kind: ItemKind, quantity: number) {
  if (
    !Number.isSafeInteger(quantity) ||
    quantity <= 0 ||
    countItem(inv, kind) < quantity
  )
    return false;
  let left = quantity;
  for (let i = 0; i < 20 && left; i++) {
    const s = inv.slots[i];
    if (s?.kind !== kind) continue;
    const n = Math.min(left, s.quantity);
    s.quantity -= n;
    left -= n;
    if (!s.quantity) inv.slots[i] = null;
  }
  cleanHotbar(inv);
  return true;
}
export function useSelected(inv: Inventory) {
  const s = selectedItem(inv);
  if (!s) return false;
  s.quantity--;
  if (!s.quantity) {
    inv.slots[inv.slots.indexOf(s)] = null;
    cleanHotbar(inv);
  }
  return true;
}
export function bindHotbar(inv: Inventory, id: string | null, index: number) {
  if (index < 0 || index >= 5 || (id && !inv.slots.some((s) => s?.id === id)))
    return false;
  inv.hotbar = inv.hotbar.map((v) => (v === id ? null : v));
  inv.hotbar[index] = id;
  cleanHotbar(inv);
  return true;
}
export function moveStack(inv: Inventory, from: number, to: number) {
  if (from < 0 || to < 0 || from >= 20 || to >= 20 || from === to) return false;
  const a = inv.slots[from],
    b = inv.slots[to];
  if (!a) return false;
  if (b && a.kind === b.kind && !isGun(a.kind)) {
    const n = Math.min(a.quantity, stackLimit(a.kind) - b.quantity);
    if (!n) return false;
    a.quantity -= n;
    b.quantity += n;
    if (!a.quantity) {
      inv.hotbar = inv.hotbar.map((id) => (id === a.id ? b.id : id));
      inv.slots[from] = null;
    }
  } else {
    inv.slots[to] = a;
    inv.slots[from] = b;
  }
  cleanHotbar(inv);
  return true;
}
export function splitStack(inv: Inventory, id: string) {
  const s = inv.slots.find((s) => s?.id === id),
    i = inv.slots.indexOf(null);
  if (!s || s.quantity < 2 || i < 0) return false;
  const n = Math.floor(s.quantity / 2);
  s.quantity -= n;
  inv.slots[i] = { id: nextId(inv), kind: s.kind, quantity: n };
  return true;
}
function reserveItems(inv: Inventory, kind: ItemKind, quantity: number) {
  let left = quantity;
  const limit = stackLimit(kind);
  if (!isGun(kind))
    for (const s of inv.reserve)
      if (s.kind === kind) {
        const n = Math.min(left, limit - s.quantity);
        s.quantity += n;
        left -= n;
      }
  while (left > 0) {
    const n = Math.min(left, limit);
    inv.reserve.push({ id: nextId(inv), kind, quantity: n });
    left -= n;
  }
}
export function storeStack(inv: Inventory, id: string) {
  const i = inv.slots.findIndex((s) => s?.id === id);
  if (i < 0) return false;
  const s = inv.slots[i]!;
  if (isGun(s.kind)) inv.reserve.push(s);
  else reserveItems(inv, s.kind, s.quantity);
  inv.slots[i] = null;
  cleanHotbar(inv);
  return true;
}
export function withdrawStack(inv: Inventory, kind: ItemKind) {
  const i = inv.reserve.findIndex((s) => s.kind === kind);
  if (i < 0) return 0;
  const s = inv.reserve[i];
  if (isGun(kind)) {
    const slot = inv.slots.indexOf(null);
    if (slot < 0) return 0;
    inv.slots[slot] = s;
    inv.reserve.splice(i, 1);
    return 1;
  }
  const n = addItem(inv, kind, s.quantity);
  s.quantity -= n;
  if (!s.quantity) inv.reserve.splice(i, 1);
  return n;
}
export function dropStack(
  inv: Inventory,
  id: string,
  p: { x: number; z: number; y: number },
) {
  const i = inv.slots.findIndex((s) => s?.id === id);
  if (i < 0 || inv.drops.length >= 200) return false;
  inv.drops.push({ ...inv.slots[i]!, ...p });
  inv.slots[i] = null;
  cleanHotbar(inv);
  return true;
}
export function pickupDrop(inv: Inventory, id: string) {
  const i = inv.drops.findIndex((d) => d.id === id);
  if (i < 0) return 0;
  const d = inv.drops[i];
  if (isGun(d.kind)) {
    const slot = inv.slots.indexOf(null);
    if (slot < 0) return 0;
    const { x: _, z: __, y: ___, ...stack } = d;
    void _;
    void __;
    void ___;
    inv.slots[slot] = stack;
    inv.drops.splice(i, 1);
    return 1;
  }
  const n = addItem(inv, d.kind, d.quantity);
  d.quantity -= n;
  if (!d.quantity) inv.drops.splice(i, 1);
  return n;
}
/** Grant the new ammunition once; preserve full existing inventories through reserve overflow. */
export function ensureStarterAmmo(inv: Inventory) {
  if (inv.ammoVersion === 1) return false;
  for (const kind of BULLET_AMMO) {
    const amount = STARTER_AMMO[kind],
      added = addItem(inv, kind, amount);
    reserveItems(inv, kind, amount - added);
  }
  inv.ammoVersion = 1;
  return true;
}
export function migrateInventory(
  wood: number,
  resources?: { rock: number; sulfur: number; metal: number },
) {
  const inv = emptyInventory();
  for (const kind of [
    "pistol",
    "smg",
    "rifle",
    "sniper",
    "lmg",
    "rocket",
    "grenade",
    "c4",
    "rockets",
    "axe",
    "pickaxe",
  ] as ItemKind[])
    addItem(inv, kind, isGun(kind) || isHarvestTool(kind) ? 1 : 5);
  for (const kind of ["wood", "rock", "sulfur", "metal"] as const) {
    const n = kind === "wood" ? wood : (resources?.[kind] ?? 0);
    const carried = addItem(
      inv,
      kind,
      Math.min(n, kind === "wood" ? 2000 : 500),
    );
    reserveItems(inv, kind, n - carried);
  }
  for (const [i, kind] of (
    ["pistol", "axe", "pickaxe", "grenade", "c4"] as const
  ).entries())
    inv.hotbar[i] = inv.slots.find((s) => s?.kind === kind)!.id;
  ensureStarterAmmo(inv);
  return inv;
}
export function readInventory(value: unknown): Inventory | undefined {
  if (!value || typeof value !== "object") return;
  const v = value as Inventory;
  if (
    v.version !== 1 ||
    !Array.isArray(v.slots) ||
    v.slots.length > 20 ||
    !Array.isArray(v.hotbar) ||
    !Array.isArray(v.reserve) ||
    v.reserve.length > 12000 ||
    !Array.isArray(v.drops) ||
    v.drops.length > 12000
  )
    return;
  const inv = emptyInventory(),
    ids = new Set<string>();
  inv.sequence =
    Number.isSafeInteger(v.sequence) && v.sequence > 0 ? v.sequence : 1;
  const parse = (s: ItemStack | null) => {
    if (
      !s ||
      typeof s.id !== "string" ||
      !s.id.length ||
      s.id.length > 80 ||
      ids.has(s.id) ||
      !ITEM_KINDS.includes(s.kind) ||
      !Number.isInteger(s.quantity) ||
      s.quantity <= 0 ||
      s.quantity > stackLimit(s.kind)
    )
      return null;
    ids.add(s.id);
    const numeric = /^item-(\d+)$/.exec(s.id);
    if (numeric) inv.sequence = Math.max(inv.sequence, Number(numeric[1]) + 1);
    return {
      id: s.id,
      kind: s.kind,
      quantity: s.quantity,
      ...(isGun(s.kind)
        ? {
            magazine: Number.isInteger(s.magazine)
              ? Math.max(
                  0,
                  Math.min(
                    WEAPONS[s.kind as WeaponKind].magazineSize,
                    s.magazine!,
                  ),
                )
              : WEAPONS[s.kind as WeaponKind].magazineSize,
          }
        : {}),
    };
  };
  if (v.ammoVersion === 1) inv.ammoVersion = 1;
  inv.slots = Array.from({ length: 20 }, (_, i) => parse(v.slots[i]));
  inv.reserve = v.reserve.map(parse).filter((s): s is ItemStack => !!s);
  for (const d of v.drops) {
    if (
      !d ||
      ![d.x, d.z, d.y].every(Number.isFinite) ||
      Math.abs(d.x) > 320 ||
      Math.abs(d.z) > 320 ||
      d.y < 0 ||
      d.y > 50
    )
      continue;
    const s = parse(d);
    if (s) inv.drops.push({ ...s, x: d.x, z: d.z, y: d.y });
  }
  inv.hotbar = Array.from({ length: 5 }, (_, i) =>
    typeof v.hotbar[i] === "string" ? v.hotbar[i] : null,
  );
  inv.active = Number.isInteger(v.active) ? v.active : -1;
  cleanHotbar(inv);
  return inv;
}

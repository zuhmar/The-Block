import {
  emptyInventory,
  readInventory,
  stackLimit,
  type ItemStack,
} from "./inventory";
export const STORAGE_SLOTS = 20;
export type StorageSlots = (ItemStack | null)[];
export const emptyStorage = (): StorageSlots => Array(STORAGE_SLOTS).fill(null);
export function readStorage(value: unknown): StorageSlots {
  if (!Array.isArray(value) || value.length > STORAGE_SLOTS)
    return emptyStorage();
  return (
    readInventory({ ...emptyInventory(), slots: value })?.slots ??
    emptyStorage()
  );
}
/** Transfers only what fits, retaining weapon state and leaving overflow at the source. */
export function transferStorage(
  from: StorageSlots,
  to: StorageSlots,
  index: number,
  quantity = Infinity,
) {
  if (
    from === to ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= from.length ||
    !(quantity > 0)
  )
    return 0;
  const source = from[index];
  if (!source) return 0;
  let remaining = Math.min(source.quantity, Math.floor(quantity)),
    moved = 0;
  const limit = stackLimit(source.kind);
  for (const target of to) {
    if (!target || target.kind !== source.kind) continue;
    const n = Math.min(remaining, limit - target.quantity);
    target.quantity += n;
    remaining -= n;
    moved += n;
    if (!remaining) break;
  }
  for (let i = 0; i < to.length && remaining; i++) {
    if (to[i]) continue;
    const n = Math.min(remaining, limit);
    to[i] = {
      ...source,
      id:
        n === source.quantity && !to.some((s) => s?.id === source.id)
          ? source.id
          : "stored-" + crypto.randomUUID(),
      quantity: n,
    };
    remaining -= n;
    moved += n;
  }
  source.quantity -= moved;
  if (!source.quantity) from[index] = null;
  return moved;
}

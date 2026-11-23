export const STORAGE_SPECS = {
  small: {
    name: "Small chest",
    slots: 20,
    width: 1,
    depth: 0.8,
    height: 0.8,
    wood: 5,
  },
  large: {
    name: "Large chest",
    slots: 40,
    width: 1.8,
    depth: 1,
    height: 0.95,
    wood: 15,
  },
} as const;
export type StorageSize = keyof typeof STORAGE_SPECS;
export const storageSize = (piece: { storageSize?: unknown }): StorageSize =>
  piece.storageSize === "large" ? "large" : "small";
export const storageSpec = (piece: { storageSize?: unknown }) =>
  STORAGE_SPECS[storageSize(piece)];

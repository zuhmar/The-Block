import catalog from "./loot-item-catalog.json";
export type LootItemKind = keyof typeof catalog;
export const LOOT_ITEM_KINDS = Object.keys(catalog) as LootItemKind[];
export const lootItemSpec = (kind: string) => catalog[kind as LootItemKind];
export const isLootItem = (kind: string): kind is LootItemKind =>
  Object.hasOwn(catalog, kind);
export const lootSprite = (kind: LootItemKind) =>
  `/assets/loot-items/${kind}.png`;
export const lootModelUrl = (kind: LootItemKind) =>
  `/assets/loot-items/${kind}.glb`;

import {
  addItem,
  countItem,
  takeItem,
  itemName,
  type Inventory,
  type ItemKind,
} from "./inventory";
import type { Piece } from "./world";
export const STATIONS = {
  workbench: {
    name: "Crafting bench",
    wood: 100,
    extras: { metal: 20 },
    width: 1.6,
    depth: 0.85,
    height: 1.55,
    material: "wood",
  },
  furnace: {
    name: "Furnace",
    wood: 50,
    extras: { rock: 100 },
    width: 1.3,
    depth: 1.4,
    height: 1.65,
    material: "stone",
  },
} as const;
export type StationKind = keyof typeof STATIONS;
export const isStationKind = (kind: string): kind is StationKind =>
  Object.hasOwn(STATIONS, kind);
export type Ingredients = Partial<Record<ItemKind, number>>;
export type Recipe = {
  id: string;
  station: StationKind;
  name: string;
  seconds: number;
  inputs: Ingredients;
  outputs: Ingredients;
};
export const RECIPES: readonly Recipe[] = [
  {
    id: "smelt-sulfur",
    station: "furnace",
    name: "Refine sulfur",
    seconds: 10,
    inputs: { sulfur: 10, wood: 20 },
    outputs: { "sulfur-refined": 10, charcoal: 10 },
  },
  {
    id: "smelt-metal",
    station: "furnace",
    name: "Smelt metal ore",
    seconds: 12,
    inputs: { metal: 10, wood: 20 },
    outputs: { "metal-fragments": 10, charcoal: 10 },
  },
  {
    id: "burn-charcoal",
    station: "furnace",
    name: "Burn charcoal",
    seconds: 8,
    inputs: { wood: 20 },
    outputs: { charcoal: 10 },
  },
  {
    id: "gunpowder",
    station: "workbench",
    name: "Mix gunpowder",
    seconds: 3,
    inputs: { "sulfur-refined": 10, charcoal: 10 },
    outputs: { gunpowder: 10 },
  },
  {
    id: "craft-pistol",
    station: "workbench",
    name: "Pistol rounds",
    seconds: 4,
    inputs: { "metal-fragments": 8, gunpowder: 4 },
    outputs: { "pistol-ammo": 20 },
  },
  {
    id: "craft-smg",
    station: "workbench",
    name: "SMG rounds",
    seconds: 5,
    inputs: { "metal-fragments": 12, gunpowder: 6 },
    outputs: { "smg-ammo": 30 },
  },
  {
    id: "craft-rifle",
    station: "workbench",
    name: "Rifle rounds",
    seconds: 6,
    inputs: { "metal-fragments": 15, gunpowder: 10 },
    outputs: { "rifle-ammo": 30 },
  },
  {
    id: "craft-sniper",
    station: "workbench",
    name: "Sniper rounds",
    seconds: 6,
    inputs: { "metal-fragments": 10, gunpowder: 8 },
    outputs: { "sniper-ammo": 5 },
  },
  {
    id: "craft-lmg",
    station: "workbench",
    name: "LMG rounds",
    seconds: 8,
    inputs: { "metal-fragments": 30, gunpowder: 20 },
    outputs: { "lmg-ammo": 60 },
  },
  {
    id: "craft-rocket",
    station: "workbench",
    name: "Rocket",
    seconds: 12,
    inputs: { "metal-fragments": 40, gunpowder: 30 },
    outputs: { rockets: 1 },
  },
];
export type ProductionJob = { recipe: string; remaining: number };
export const recipeFor = (kind: string, id: string) =>
  RECIPES.find((r) => r.station === kind && r.id === id);
export function readProductionJob(
  kind: string,
  value: unknown,
): ProductionJob | undefined {
  if (!isStationKind(kind) || !value || typeof value !== "object") return;
  const job = value as ProductionJob,
    recipe = recipeFor(kind, job.recipe);
  if (
    !recipe ||
    !Number.isFinite(job.remaining) ||
    job.remaining < 0 ||
    job.remaining > recipe.seconds
  )
    return;
  return { recipe: recipe.id, remaining: job.remaining };
}
export function ingredientEntries(values: Ingredients) {
  return Object.entries(values) as [ItemKind, number][];
}
export function missingIngredients(inv: Inventory, values: Ingredients) {
  return ingredientEntries(values)
    .filter(([k, n]) => countItem(inv, k) < n)
    .map(([k, n]) => `${itemName(k)} ${countItem(inv, k)} / ${n}`)
    .join(" · ");
}
export function startProduction(piece: Piece, inv: Inventory, id: string) {
  const recipe = recipeFor(piece.kind, id);
  if (!recipe) return "Recipe unavailable at this station";
  if (piece.job) return "Collect or cancel the current job first";
  const missing = missingIngredients(inv, recipe.inputs);
  if (missing) return "Need " + missing;
  const next = structuredClone(inv);
  for (const [kind, n] of ingredientEntries(recipe.inputs))
    if (!takeItem(next, kind, n)) return "Ingredients changed";
  Object.assign(inv, next);
  piece.job = { recipe: id, remaining: recipe.seconds };
  return "";
}
function receive(inv: Inventory, values: Ingredients) {
  const next = structuredClone(inv);
  for (const [kind, n] of ingredientEntries(values))
    if (addItem(next, kind, n) !== n) return false;
  Object.assign(inv, next);
  return true;
}
export function collectProduction(piece: Piece, inv: Inventory) {
  const job = piece.job,
    recipe = job && recipeFor(piece.kind, job.recipe);
  if (!job || !recipe) return "No job at this station";
  if (job.remaining > 0) return "Still processing";
  if (!receive(inv, recipe.outputs))
    return "Inventory full · make room for all outputs";
  delete piece.job;
  return "";
}
export function cancelProduction(piece: Piece, inv: Inventory) {
  const job = piece.job,
    recipe = job && recipeFor(piece.kind, job.recipe);
  if (!job || !recipe) return "No job at this station";
  if (job.remaining === 0) return "Collect the completed output";
  if (!receive(inv, recipe.inputs))
    return "Inventory full · make room for the ingredient refund";
  delete piece.job;
  return "";
}
export function advanceProduction(pieces: Piece[], seconds: number) {
  const completed: string[] = [];
  if (!Number.isFinite(seconds) || seconds <= 0) return completed;
  for (const piece of pieces)
    if (isStationKind(piece.kind) && piece.job && piece.job.remaining > 0) {
      piece.job.remaining = Math.max(0, piece.job.remaining - seconds);
      if (piece.job.remaining === 0) completed.push(piece.id);
    }
  return completed;
}
export function stationBuildCost(kind: StationKind): Ingredients {
  return { wood: STATIONS[kind].wood, ...STATIONS[kind].extras };
}

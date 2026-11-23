import type { Piece } from "./world";
export const STRUCTURE_MATERIALS = {
  wood: { name: "Wood", maxHealth: 100, costMultiplier: 1, color: 0xb78b4e },
  stone: { name: "Stone", maxHealth: 300, costMultiplier: 3, color: 0x89918f },
  metal: { name: "Metal", maxHealth: 500, costMultiplier: 5, color: 0x647f91 },
} as const;
export type StructureMaterial = keyof typeof STRUCTURE_MATERIALS;
export const C4_STRUCTURE_DAMAGE = 100;
export const C4_STRUCTURE_RADIUS = 2.5;
export function structureMaterial(
  p: Pick<Piece, "material">,
): StructureMaterial {
  return typeof p.material === "string" &&
    Object.hasOwn(STRUCTURE_MATERIALS, p.material)
    ? p.material
    : "wood";
}
export const maxStructureHealth = (p: Pick<Piece, "material">) =>
  STRUCTURE_MATERIALS[structureMaterial(p)].maxHealth;
export function structureHealth(p: Pick<Piece, "material" | "health">) {
  const max = maxStructureHealth(p);
  return p.health === undefined || !Number.isFinite(p.health)
    ? max
    : Math.max(0, Math.min(max, Math.floor(p.health)));
}

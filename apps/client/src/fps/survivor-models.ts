import * as THREE from "three";
import { createSmoothSurvivor } from "./smooth-survivor";
import { addProtectiveOutfit } from "./protective-outfits";

export const OUTFITS = ["base", "street", "reinforced", "armored"] as const;
export type Outfit = (typeof OUTFITS)[number];
export const OUTFIT_NAMES: Record<Outfit, string> = {
  base: "Bare black stick figure",
  street: "Tier 1 · Street · Burgundy hoodie & cap",
  reinforced: "Tier 2 · Reinforced · Black military outfit & helmet",
  armored: "Tier 3 · Armored · Amber plates & full-face helmet",
};
export type ClothingSlot = "headwear" | "torso" | "legs" | "footwear";
const materials = new Map<number, THREE.MeshStandardMaterial>();
function material(color: number) {
  if (!materials.has(color))
    materials.set(
      color,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.36,
        metalness: 0.08,
      }),
    );
  return materials.get(color)!;
}
const BLACK = 0x090b10,
  CHARCOAL = 0x242932,
  EDGE = 0x4b535e,
  BURGUNDY = 0x861f3d,
  CUFF = 0x50152a,
  IVORY = 0xe9dfc7,
  AMBER = 0xe9a51d;

/** Clothing remains attached to the shared smooth base's articulated pivots. */
export function createSurvivor(outfit: Outfit = "base") {
  const actor = createSmoothSurvivor(
    outfit === "street",
    material(BLACK),
    material(BURGUNDY),
    material(CUFF),
    material(CHARCOAL),
    material(IVORY),
    material(0xd8ac40),
  );
  if (outfit === "reinforced" || outfit === "armored")
    addProtectiveOutfit(
      actor,
      outfit === "armored",
      material(BLACK),
      material(CHARCOAL),
      material(0x131820),
      material(EDGE),
      material(AMBER),
    );
  return {
    ...actor,
    outfit,
    setSlot(slot: ClothingSlot, visible: boolean) {
      actor.slots[slot].forEach((g) => (g.visible = visible));
    },
  };
}

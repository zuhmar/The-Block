import { NORTH_LAB, NORTH_BUILDINGS, northBounds } from "./north-lab-layout";
import { LAB_COMBAT } from "./enemy-combat";
import type { EnemyKind } from "./enemy";
import type { PatrolSpec } from "./military-compound";
export const LAB_MODELS = [
  "easy-worker",
  "medium-security",
  "hard-enforcer",
] as const;
export type LabNpcModel = (typeof LAB_MODELS)[number];
export type LabTier = "easy" | "medium" | "hard";
export type LabEncounter = {
  id: string;
  kind: EnemyKind;
  labModel: LabNpcModel;
  labTier: LabTier;
  weapon: "pistol" | "rifle" | "lmg";
  patrol: PatrolSpec;
};
export function labEncounters(): LabEncounter[] {
  if (!NORTH_LAB.enabled) return [];
  const entries: [LabTier, number, number, number, number, string?][] = [
    ["easy", -34, -5, -32, -1, "north-main-lab"],
    ["easy", -34, 3, -31, 8, "north-main-lab"],
    ["easy", -45, -38, -42, -34, "north-workshop"],
    ["easy", -3, -38, 1, -30, "north-warehouse"],
    ["easy", -18, -28, -16, -25, "north-warehouse"],
    ["easy", 40, -28, 42, -26, "north-secondary-lab"],
    ["easy", 40, -4, 42, 3, "north-packing"],
    ["easy", 34, 34, 35, 39, "north-staff"],
    ["easy", -55, 18, -52, 26],
    ["easy", 44, 24, 49, 28],
    ["medium", -18, 38, -10, 44],
    ["medium", 6, 35, 14, 43],
    ["medium", 54, -37, 56, -28],
    ["medium", 21, -12, 24, 4],
    ["hard", 5, -18, 13, -12],
  ];
  return entries.map(([tier, x1, z1, x2, z2, room], i) => {
    const points = [
      [x1, z1],
      [x2, z1],
      [x2, z2],
      [x1, z2],
    ].map(([x, z]) => ({ x: x + NORTH_LAB.x, z: z + NORTH_LAB.z }));
    const b = room && NORTH_BUILDINGS.find((b) => b.type === room);
    const id = `lab-${tier}-${i + 1}`;
    const bounds = b
      ? {
          minX: b.x - b.width / 2,
          maxX: b.x + b.width / 2,
          minZ: b.z - b.depth / 2,
          maxZ: b.z + b.depth / 2,
        }
      : {
          minX: Math.max(
            northBounds().minX,
            Math.min(...points.map((p) => p.x)) - 12,
          ),
          maxX: Math.min(
            northBounds().maxX,
            Math.max(...points.map((p) => p.x)) + 12,
          ),
          minZ: Math.max(
            northBounds().minZ,
            Math.min(...points.map((p) => p.z)) - 12,
          ),
          maxZ: Math.min(
            northBounds().maxZ,
            Math.max(...points.map((p) => p.z)) + 12,
          ),
        };
    return {
      id,
      kind: tier === "easy" ? "lookout" : tier === "medium" ? "police" : "swat",
      labTier: tier,
      labModel:
        tier === "easy"
          ? "easy-worker"
          : tier === "medium"
            ? "medium-security"
            : "hard-enforcer",
      weapon: tier === "easy" ? "pistol" : tier === "medium" ? "rifle" : "lmg",
      patrol: { id, points, bounds, combat: LAB_COMBAT[tier] },
    };
  });
}

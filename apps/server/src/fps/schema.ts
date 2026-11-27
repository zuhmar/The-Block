import { z } from "zod";
const id = z.string().min(1).max(100),
  index = z.number().int().min(0).max(5000),
  angle = z.number().finite().min(-1e6).max(1e6);
const piece = z
  .object({
    kind: z.enum([
      "foundation",
      "floor",
      "wall",
      "doorway",
      "door",
      "storage",
      "workbench",
      "furnace",
    ]),
    x: z.number().finite().min(-250).max(250),
    z: z.number().finite().min(-250).max(250),
    y: z.number().finite().min(0).max(9).optional(),
    rotation: z.number().int().min(0).max(3),
    material: z.enum(["wood", "stone", "metal"]).optional(),
    storageSize: z.enum(["small", "large"]).optional(),
  })
  .strict();
export const fpsActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("inventory"), inventory: z.unknown() }),
  z.object({ type: z.literal("equip"), slot: z.number().int().min(-1).max(4) }),
  z.object({ type: z.literal("loot"), index }),
  ...(
    ["pickup", "drop", "use", "remove", "harvest", "buy", "inspect"] as const
  ).map((type) => z.object({ type: z.literal(type), id })),
  z.object({
    type: z.literal("upkeep"),
    days: z.number().int().min(1).max(30),
  }),
  z.object({ type: z.literal("craft"), kind: z.enum(["axe", "pickaxe"]) }),
  z.object({ type: z.literal("build"), piece }),
  z.object({
    type: z.literal("storage"),
    station: id,
    side: z.enum(["bag", "chest"]),
    index,
    quantity: z.number().int().min(1).max(1000000),
  }),
  z.object({
    type: z.literal("production"),
    station: id,
    action: z.enum(["start", "collect", "cancel"]),
    recipe: z.string().max(60).optional(),
  }),
  z.object({
    type: z.literal("door"),
    kind: z.enum(["building", "mart", "apartment", "jail", "player"]),
    index: index.optional(),
    part: index.optional(),
    id: id.optional(),
  }),
  z.object({
    type: z.literal("fire"),
    yaw: angle,
    pitch: z.number().finite().min(-1.35).max(1.35),
  }),
  ...(["reload", "detonate", "respawn", "intro"] as const).map((type) =>
    z.object({ type: z.literal(type) }),
  ),
]);

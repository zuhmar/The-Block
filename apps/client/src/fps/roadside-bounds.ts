import dimensions from "./roadside-dimensions.json";
import { LOOT } from "./world";
const fitted = new WeakSet<object>();
export function normalizeRoadsideLoot() {
  for (const loot of LOOT) {
    if (fitted.has(loot)) continue;
    const name =
      loot.kind === "trash"
        ? {
            metal: "trash-can-metal",
            wheelie: "wheelie-bin",
            litter: "litter-basket",
            dumpster: "dumpster",
          }[loot.model ?? "metal"]
        : `tier-${loot.tier}-${["", "small", "supply", "reinforced", "long", "heavy"][loot.tier]}`;
    const size = dimensions[name as keyof typeof dimensions];
    if (!size) continue;
    const scale = Math.min(
      loot.width / size.width,
      loot.height / size.height,
      loot.depth / size.depth,
    );
    loot.width = size.width * scale;
    loot.height = size.height * scale;
    loot.depth = size.depth * scale;
    fitted.add(loot);
  }
}

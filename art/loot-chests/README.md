# Loot chest tier references

Five original AI-generated glossy cartoon chest sprites, supplied as individual transparent PNGs. These are lootable container designs for the current 3D game's modeling pipeline. They are not craftable storage designs. Runtime models, loot tables, and gameplay are unchanged.

| Tier | Reference | Design | Suggested model size (width × depth × height, meters) |
| --- | --- | --- | --- |
| 1 | [Small supply crate](references/tier-1-small.png) | Honey-brown wood, simple iron bands and latch | 0.8 × 0.7 × 0.7 |
| 2 | [Supply chest](references/tier-2-supply.png) | Olive utility chest, reinforced corners, twin latches | 1.1 × 0.85 × 0.9 |
| 3 | [Reinforced cache](references/tier-3-reinforced.png) | Blue steel security crate, heavy locking plate | 1.25 × 1.0 × 1.05 |
| 4 | [Long weapon case](references/tier-4-long.png) | Purple and charcoal, long skinny silhouette | 2.1 × 0.6 × 0.55 |
| 5 | [Heavy supply case](references/tier-5-heavy.png) | Golden-ochre and charcoal, long thick cargo trunk | 2.2 × 1.0 × 0.9 |

Sizes are modeling targets, not measurements inferred from the artwork. Images are individually framed and are not to a common pixel scale. Preserve distinct silhouettes when building the models. Keep lids separate with rear hinge pivots for future opening animations; keep interiors clear of baked loot so contents can vary.

All images show closed containers in three-quarter view, with no embedded ground, ground shadows, grass, or glow. Visual review and PNG alpha/dimension checks are recorded in `image-check.json`. Original generated files remain in the workspace generated-images directory.

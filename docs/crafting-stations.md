# Player crafting stations

Open BUILD (B). The new **Crafting bench** (7) costs 100 wood + 20 metal ore; **Furnace** (8) costs 50 wood + 100 rock. Both snap to the same two-metre grid as player floors/foundations, require a supporting player platform, count toward the 100-piece build budget and cannot share a cell with storage or another station. They work on upper player floors as well. The bench is a fixed wood structure (100 HP); the furnace is fixed stone (300 HP), using existing C4 damage rules.

Stand within 3.2 metres on the same floor and press E / USE. Walls between the player and station block access. The workshop popup shows ingredients in the carried inventory, output quantities, processing time, and collect/cancel controls. Wood is furnace fuel; burning it also yields charcoal. Both stations have original glossy sprites, editable Blender models and matching icons. Refined materials have their own inventory/held/drop models and stack to 500. Raw sulfur ore and metal ore keep their existing items and node artwork.

| Station | Recipe | Consumed | Output | Time |
| --- | --- | --- | --- | --- |
| Furnace | Refine sulfur | 10 sulfur ore + 20 wood | 10 refined sulfur + 10 charcoal | 10 s |
| Furnace | Smelt metal | 10 metal ore + 20 wood | 10 metal fragments + 10 charcoal | 12 s |
| Furnace | Burn charcoal | 20 wood | 10 charcoal | 8 s |
| Bench | Gunpowder | 10 refined sulfur + 10 charcoal | 10 gunpowder | 3 s |
| Bench | Pistol ammo | 8 metal fragments + 4 gunpowder | 20 rounds | 4 s |
| Bench | SMG ammo | 12 metal fragments + 6 gunpowder | 30 rounds | 5 s |
| Bench | Rifle ammo | 15 metal fragments + 10 gunpowder | 30 rounds | 6 s |
| Bench | Sniper ammo | 10 metal fragments + 8 gunpowder | 5 rounds | 6 s |
| Bench | LMG ammo | 30 metal fragments + 20 gunpowder | 60 rounds | 8 s |
| Bench | Rocket | 40 metal fragments + 30 gunpowder | 1 rocket | 12 s |

One job runs per station. Starting consumes the exact recipe inputs once. Outputs stay in the station until collected; they do not spill, overwrite a stack or disappear when the 20-slot inventory is full. Collection requires room for every output and is atomic. An unfinished job can be cancelled for its inputs, provided the whole refund fits. Completed jobs must be collected. The five hotbar slots still reference the twenty carried slots; no station supplies hidden backpack capacity. Spawn reserves cannot pay remote station costs.

Production advances in real elapsed seconds while exploring or viewing a workshop; the workshop pauses player movement and combat while leaving production running. It stops in the pause menu, inventory, a backgrounded tab and while the device-local game is closed. Active jobs save roughly once per second and on actions/pause; ready outputs persist until collection. Optional validated `job: { recipe, remaining }` data is stored on each placed piece without changing the existing save version. Existing buildings, inventories, searched containers and resource state are retained.

A station with an active or completed job cannot be dismantled until cancelled/collected. Supporting floors cannot be removed first. Empty stations refund wood and their additional rock/ore in proportion to remaining health, only if the complete refund fits. C4 destruction intentionally destroys the station and its job with it; there is no dismantling refund for a destroyed station.

Source art: `art/ai/crafting/stations-reference.png`. Blender sources: `art/models/crafting`. Rebuild with `pnpm assets:crafting`. Download sources/exports/icons from `/assets/crafting/street-survival-crafting.zip`.

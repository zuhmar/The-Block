# Official Street Survival world artwork

Original AI-generated sources, using the supplied Street Survival reference for composition, palette and overhead glossy cartoon styling:

- `buildings.png`: 4 × 4 coordinated overhead building roles. The roof view was revised from the first generation; a second edit cleaned exterior fringes.
- `nature.png`: 4 × 4 trees, shrubs, flowers, rocks, log, mountains, plateaus, cliffs and waterfalls.
- `props.png`: 3 × 3 docks, crane, containers, fountain, lamp, bench, car, tank and cargo.
- `tiles.png`: 3 × 2 grass, dirt, gravel, asphalt, concrete and water textures.

`import-official-map.ts` crops and trims sources, conditions highly saturated fringe pixels only next to transparent matte edges and removes tiny disconnected export specks, and packs 47 runtime assets. Standalone objects retain alpha. Tile samples are mirrored in four quadrants so opposite edges match exactly. These operations prepare AI artwork; they do not generate replacement illustrations.

World and city previews render actual authored map coordinates with these sprites. They do not include playable-terrain district labels, legends, colored outlines or player construction markers. The separate map UI renders district labels from the same map model.

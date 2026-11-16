# Official Street Survival world artwork

Original AI-generated sources, using the supplied Street Survival reference for composition, palette and overhead glossy cartoon styling:

- `buildings.png`: 4 × 4 coordinated overhead building roles. The roof view was revised from the first generation; a second edit cleaned exterior fringes.
- `storefronts.png`: 2 × 2 original AI-generated cafe, laundromat, grocery and bookstore sprites, matched to the existing shop reference. Transparent cutouts; preparation only crops, trims and resizes them.
- `nature.png`: 4 × 4 trees, shrubs, flowers, rocks, log, mountains, plateaus, cliffs and waterfalls.
- `props.png`: 3 × 3 docks, crane, containers, fountain, lamp, bench, car, tank and cargo.
- `tiles.png`: 3 × 2 grass, dirt, gravel, asphalt, concrete and water textures.

`import-official-map.ts` crops and trims sources, conditions highly saturated fringe pixels only next to transparent matte edges and removes tiny disconnected export specks, and packs 71 runtime assets. Standalone objects retain alpha. Tile samples are mirrored in four quadrants so opposite edges match exactly. These operations prepare AI artwork; they do not generate replacement illustrations.

World and city previews render actual authored map coordinates with these sprites. They do not include playable-terrain district labels, legends, colored outlines or player construction markers. The separate map UI renders district labels from the same map model.

- `city-buildings.png`: eight AI-generated kiosk, bakery, garage, diner, apartment slab, brick warehouse, corner office and duplex designs. Their runtime footprints vary from 96 to 352 pixels wide within the previous safe architecture envelopes.
- `street-props.png`: twelve AI-generated street furniture and vehicle cutouts. The source uses a manually measured third-row boundary at y=690 so vehicle rooftops are not clipped. New cutouts receive four transparent pixels of padding after fitting.

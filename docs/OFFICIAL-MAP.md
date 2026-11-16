# Official world map

The world is 16,384 × 16,384 pixels: 256 × 256 tiles at 64 pixels per tile. Each streaming chunk is 16 × 16 tiles (1,024 pixels), making 16 × 16 world chunks. Tile and object coordinates are deterministic; no new gameplay simulation or networking layer is introduced.

The Block, Downtown, Industrial District, The Projects and Uptown form the central city. Architecture includes shelter and convenience-store locations, bank/hospital/police façades, offices, restaurants, industrial warehouses and factories, apartments, luxury homes, courtyards and waterfront cargo. Existing merchants, shelter and all six loot sites remain reachable. New façades do not add new service mechanics.

The outer world has open unmarked grassland, sparse trees, clusters of vegetation, rocks/logs/flowers, natural trails, outer mountain ranges and bluffs, northwest falls/stream, ponds and an eastern river. Road crossings use the same bridge geometry for drawing and collision. Wilderness has no premade player houses, prescribed housing lots or district labels painted on the ground.

## Terrain survey

The test samples all 65,536 tile centers and requires city, grassland, mountain and other land-use targets to be within two percentage points of 35/40/15/10. Water is included in “other” alongside rocky terrain. The city classification includes streets, civic land, courtyards, parks and building land rather than only solid roofs. The test measures the current exported data; it does not infer percentages from a concept image.

## Collision and building

The existing movement and construction entry points consume the new static terrain model. Water, cliffs, tree trunks, rocks, mountain outcrops and building footprints block movement. Solid map objects also feed the existing line-of-sight query; weapon rules and authoritative hitscan behavior are unchanged. The full floor footprint is checked before charging materials. City and road restrictions are retained. Open rural land remains buildable without plot membership. Mountains leave traversable passages and road corridors. Static object collision uses chunk-indexed bins. Tile records expose center collision samples plus exact object geometry through their chunks.

## Persistence

Before upgrading a world without `mapVersion: 3`, the server inserts its original JSON into `world_layout_backups` with layout key 3. The migration adds 4096 to X and Y once. It preserves actor/structure/container IDs, ownership, floor links, contents, money, skills, equipment and the request ledger. Existing foundations receive merged map reservations: new static objects yield, and legacy home footprints remain dry and accessible. The snapshot carries those reservations so client rendering and server collision agree. A player stranded by new terrain is recovered to nearby dry ground or the original shelter with belongings intact.

No accounts, sessions or world records are reset. The original layout/protocol version stays 2; the map marker is independent and additive.

## Verification

Automated tests cover map extent, complete tile coordinate coverage, chunk selection and bounds, terrain proportions, graph connectivity and passable road corridors, original service access, tree/rock/cliff/water collision, bridges, unchanged floor/wall placement, persistence and migration idempotence. Artwork checks verify all 47 new AI entries, transparency and exact matching tile edges. The normal multiplayer, inventory, combat and PostgreSQL regression suites still run.

`pnpm map:preview` exports the actual map model and sprites as whole-world and city PNGs in `work/`. These are not browser screenshots. Manual Phaser/WebGL and mobile rendering checks are listed in BROWSER-QA.md; automated geometry and network tests do not establish rendered browser performance.

The optional `tests/browser/map-smoke.py` uses an existing Chromium and Python Playwright installation against local servers backed by an isolated database. It checks actual Phaser WebGL rendering, camera travel and chunk retirement, desktop and mobile viewports, first-login player visibility and the map UI. It does not measure physical phone performance.

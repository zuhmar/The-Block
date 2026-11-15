# Street Survival: top-down urban sandbox

The user approved replacing the original side-scrolling direction with a top-down world and a CryoFall-inspired HUD on 2026-11-15. This supersedes the camera, traversal and UI portions of `ORIGINAL-SPEC.md`; the persistent urban survival, free construction, public death loot and offline raiding rules remain.

## Reference and original identity

CryoFall's official [Steam screenshots](https://store.steampowered.com/app/829590/CryoFall/) informed the overhead composition, compact edge HUD, quick-access items and inventory/crafting windows. Reference screenshots were inspected only and are not game assets. Street Survival retains its own urban setting, names, palette, procedural drawings and interface design.

The world uses a slightly elevated overhead view, four-direction characters, roofs, walkable shelter interior, streets, alleys, trees, props and vacant building ground. Original flat cartoon vectors use restrained highlights, dark clean outlines, sage terrain, slate roads, weathered timber and muted steel-green UI with brass accents.

## The playable loop

1. Start in The Haven, with equal stats and a basic backpack, water, snack and cash.
2. Explore with WASD, search alley containers, and manage hunger, thirst, health and energy.
3. Trade recyclables, buy supplies, craft a bat and equip weapons.
4. Claim valid open ground with a foundation. Build walls, doors, roofs and storage on the 64px grid.
5. Defend or breach bases. Walls block movement and line of sight in two dimensions; accessible storage is lootable even when the owner is offline.
6. Improve persistent skills by using them. Death drops carried assets while preserving learned skills and property.

Crafting currently includes the bat and construction pieces. The character window shows actual persistent skill experience. This update does not claim CryoFall's agriculture, industry or full research tree is implemented.

## HUD and controls

- Top center: inventory, crafting, character, building, journal, map and chat.
- Upper right: real-position minimap and a short optional survival objective.
- Lower left: character name, active weapon, health and energy.
- Lower center: ten quick actions for supplies, weapons, reload, crafting, building and backpack.
- Lower right: food and water.
- Contextual E interaction and floating inventory, merchant, crafting, construction, skills, journal, map and chat windows.
- WASD/arrows movement; Shift sprint; Ctrl crouch; mouse aiming/attacking; E interact; R reload; Tab backpack; C craft; K character; B build; J journal; M map; Enter chat; Escape close; 1–0 quick actions. Wheel zooms the world.

Construction uses a compact side panel so the placement preview and the world remain visible. The mobile layout keeps a D-pad and action buttons; visual device QA remains pending.

## Authority, compatibility and migration

Protocol v2 adds vertical intent and authoritative Y positions. Diagonal movement is normalized and collision uses substeps and wall sliding. Combat, storage access, merchant distance, interest management and safe zones use Euclidean distance or world rectangles, not horizontal distance alone. Static building footprints and player-built barriers block line of sight.

Startup holds the city authority lock before running migrations. A legacy JSONB world is copied once into `world_layout_backups` before its layout changes. Characters retain IDs, appearance, inventory, equipment, cash, bank and skills. Structures retain IDs, owners, storage and raid damage, with legacy bases placed at y=1344. Existing drops receive a ground Y coordinate. Characters caught inside a new static footprint are moved to nearby walkable ground. The migration is idempotent and tested.

The old separate base lane has been retired. Walk through open doors or around barriers; there is no teleport into storage. Roads remain unbuildable, so player walls cannot seal the district's public routes.

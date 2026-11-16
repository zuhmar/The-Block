# Street Survival: top-down urban sandbox

The user approved replacing the original side-scrolling direction with a top-down world and a CryoFall-inspired HUD on 2026-11-15. This supersedes the camera, traversal and UI portions of `ORIGINAL-SPEC.md`; the persistent urban survival, free construction, public death loot and offline raiding rules remain.

## Reference and original identity

CryoFall's official [Steam screenshots](https://store.steampowered.com/app/829590/CryoFall/) informed the overhead composition, compact edge HUD, quick-access items and inventory/crafting windows. Reference screenshots were inspected only and are not game assets. Street Survival retains its own urban setting, names, palette, procedural drawings and interface design.

The world uses a slightly elevated overhead view, four-direction characters, walkable shelter interior, streets, alleys, trees, props and vacant building ground. Original flat cartoon vectors use restrained highlights, dark clean outlines, sage terrain, slate roads, weathered timber and muted steel-green UI with brass accents.

## The playable loop

1. Start in The Haven, with equal stats and a basic backpack, water, snack and cash.
2. Explore with WASD, search alley containers, and manage hunger, thirst, health and energy.
3. Trade recyclables, buy supplies, craft a bat and equip weapons.
4. Claim valid open ground with a foundation. Join 128px floor tiles edge to edge, then place 64px wall/door segments along outer or interior floor grid lines and storage inside. Wall segments are 16px thick and automatically rotate for vertical edges. Roofs are not required or buildable.
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

Construction now uses shared `snapBuildPoint` and `floorContainsCell` rules for the authoritative server and client preview. Wall/door segments align with the hovered owned floor's outer or interior grid lines and storage fits inside; adjacent floors may touch but not overlap. Existing structure positions are retained. Legacy roof records are preserved but hidden, and new roof actions are rejected.

`structureFootprint` supplies wall/door rectangles to placement overlap checks, movement collision, line of sight and the build guide. Perpendicular end joints may overlap at the corner cap; other overlapping objects are rejected. Roof records do not count against the active build budget or prevent floor dismantling.

Placement resolves the owned floor under the pointer before snapping and sends that floor ID with the displayed target. A previously selected dropdown floor is only a preference at shared borders. Segment ends clamp to the nearest valid slot at corners. Walls on the boundary of an otherwise valid owned floor are allowed at the parcel edge; roads and public obstacles remain protected.

World scavenging uses five loot-only crate tiers with progressively better reward pools and up to one through five rolls. The six existing locations retain their indices, proximity checks and persisted per-player 60-second cooldowns. Reward planning checks backpack limits before commit and skips full stacks/duplicate weapons; if nothing fits, no cooldown is spent. Craftable storage and its contents are unchanged. Loot outlines/labels, tier markers on the map and explicit depleted countdowns distinguish caches from props.

Wildlife: twelve persisted brown stray dogs have 45 HP, 260px acquisition range, 175px/s chase speed and a 420px home leash. Bites have a 250ms wind-up, deal 8 damage within 50px and cool down for 1.2 seconds. A dodge, wall/closed door, entering the Haven or disconnecting before contact prevents damage. Dogs cannot enter the Haven, do not attack protected/dead/offline players, and use normal player death/drop handling. Defeated dogs respawn near their homes after 90 seconds, avoiding blocked tiles. Seeding is idempotent; saved dog state survives restarts.

Successful pistol attacks record short-lived authoritative shot visuals in the same transaction as damage/ammunition changes. Nearby snapshots carry them once per event ID; the client animates an AI bullet tracer from muzzle to impact. Combat remains hitscan, not a new ballistic simulation. Rejected/replayed attacks do not duplicate tracers or spend extra ammunition. Fists now use a dedicated punch sheet; dog attacks use a four-phase bite sequence. Attack clips play once rather than repeating damage poses throughout the cooldown.

## Woodland expansion

World bounds are 9600 × 6400. The original 6400 × 3200 town is protected from new construction, including its former vacant plots. Eight woodland clearings provide house space east and south of town. Shared placement validation checks the full floor footprint, town limits, road shoulders and clearing bounds before costs are charged. Existing town structures are preserved and remain usable, but additions must be outside town.

Existing east/west and north/south roads now reach the new world edges. A southern crossroad and eastern connecting road form routes for future towns. Road shoulders stay clear of trees and houses. Deterministic scenery uses the existing AI tree sprites, with a 72px gap around every house clearing. Trees are decorative outside the clearings; the forest is traversable. No new resources, harvesting or towns are introduced.

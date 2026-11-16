# Implementation review

The original master prompt describes a complete multiplayer urban survival game. The user subsequently approved a top-down world and CryoFall-inspired HUD; `DESIGN.md` records that direction. Street Survival keeps its own original art and urban setting.

## Implemented and checked

- Real Phaser/Vite client, Colyseus authority and PostgreSQL persistence; no fake multiplayer.
- One authoritative city, guarded by a PostgreSQL session lock acquired before world migration.
- Protocol v2 with authoritative X/Y movement, normalized diagonals, substep collision, wall sliding, safe-zone rectangles, Euclidean interaction/interest ranges and 2D line of sight.
- Secure accounts, expiring hashed sessions, message validation/rate limits, replay rejection and durable successful-action IDs.
- Survival, scavenging, item/weight limits, merchants, bat crafting, firearm ammo/reload and skills that persist through death.
- Two-dimensional foundation/wall/door/roof/storage construction, owner permissions, physical access, repair, controlled dismantling, offline raiding and public death loot.
- Full-screen world, navigation rail, minimap, hotbar, survival meters and inventory/equipment, crafting, skills, journal, merchant, building, chat and map panels.
- 121 manifest entries: AI-generated black stick-figure characters in four directions and eight state rows, plus AI world-pack sprites and a coordinated floor/wall/door/storage atlas with separate damage states. Terrain, bed, effects and UI symbols retain procedural art. Held-frame states and source mappings are documented in art/ai/characters/README.md. Required keys, dimensions, alpha, cells and nonempty frames validate.
- 19 tests, lint, typecheck and production build pass, including two-axis real-WebSocket movement/reconnect/restart, concurrent claims, offline raids, stored damage/theft, 2D range/collision and legacy layout preservation.

The database migration keeps a one-time pre-layout world backup. IDs, inventory, cash, bank, skills, property, storage and damage remain. Legacy bases receive y=1344; a player inside a new solid footprint moves to nearby free ground. No foundations are silently deleted.

## Verification limits and remaining product work

1. Browser rendering, two-window manual gameplay and mobile-device QA remain unverified because managed browser tooling was unavailable. Asset contact sheets were inspected; this is not a substitute for browser screenshots.
2. Full modular equipment visuals, selectable bottoms/shoes, durability and distinct equipment-slot transfers remain. All players now render as black stick figures; legacy appearance data and weapon/backpack gameplay are retained.
3. Hostile NPC AI is not implemented. Merchant interactions and the shelter's recovery area work; the caretaker links to the survival guide.
4. Temperature exposure effects, combat blocking, recoil and richer aim/accuracy mechanics remain. Current attacks validate distance, facing, LOS, cooldown, stamina, ammo and reload on the server.
5. Rotatable wall modules, collaborator permission editing, bounded crate capacity and more advanced building interiors remain. Current 2D barriers can physically enclose storage and be breached.
6. Banking services, deeper account progression, agriculture/industry and a full research tree remain. The crafting and skill windows show only implemented recipes and actual experience, not simulated research progress.
7. Sustained capacity/soak testing, monitoring and database restore rehearsals remain. The 20-client local check is a five-second network smoke test.

Vercel serves the frontend and Railway runs the server and persistent PostgreSQL. `deployment/verification.json` records the latest completed hosted checks; its version/commit must be considered when checking a subsequent redesign deployment.

## Technical tradeoffs

All city mutations are serialized in a single PostgreSQL JSONB row. This keeps transfers, death and raiding atomic but needs profiling and normalization for larger cities. Static map masks reserve public routes while buildable regions contain player structures. Old artificial base lanes are retired; access now depends on normal movement and barriers.

The city requires a single writer. A replacement may wait for its predecessor to release the lock, but cannot migrate or simulate while that lock is held. Operations must coordinate the game-server handover; the database does not need a restart.

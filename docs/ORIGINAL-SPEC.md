# STREET SURVIVAL — CODEX MASTER BUILD PROMPT

You are the lead engineer, technical artist, and game designer building a real, playable, browser-based 2D online multiplayer urban survival game named **Street Survival**. Implement working code, tests, asset generation, documentation, and a reproducible local setup. Do not deliver only mockups or an architecture proposal. Work incrementally, run builds/tests after each milestone, and report what is actually implemented versus planned.

## Locked creative direction

- Side-scrolling 2D, grounded left/right walking, sprinting, crouching; no platformer jumping or parkour.
- Original flat glossy cartoon art, clean silhouettes and consistent proportions, side-view environments.
- Hardcore but balanced urban survival: health, hunger, thirst, energy, temperature; gradual depletion and meaningful consequences.
- Online multiplayer from day one; one authoritative shared city instance initially, target 20 concurrent players subject to load testing.
- Seamlessly connected city districts eventually: The Block, Downtown, Industrial District, The Projects, Uptown. Implement **The Block** first.
- Open player-versus-player combat outside protected safe zones. Melee and firearms are both required in MVP.
- Death: drop ALL carried items, equipped gear, and carried cash into an immediately public loot bag; anyone may loot immediately. Preserve learned skills, account progression, owned foundations and structures, stored property, and banked funds. Avoid duplicating items during death/reconnect.
- Free-form player construction on valid ground outside roads, safe zones, critical paths, public buildings and NPC interaction zones; no preassigned housing lots.
- Player bases are raidable 24/7, including when the owner is offline. Walls and doors can be breached and destroyed; foundations cannot be damaged by raids. Owners may dismantle their own foundations under controlled rules. Accessible storage is lootable. Server persists damage, storage, and ownership.
- Browser-first with usable desktop controls and basic mobile touch controls.
- Codex MUST create all artwork needed for implemented features through an automated, reproducible asset-generation pipeline; no manual sprite uploads required to play MVP.

## Architecture

Use a TypeScript monorepo (pnpm workspaces):

- `apps/client`: Phaser 3 + Vite + TypeScript, responsive HTML HUD and UI overlays.
- `apps/server`: Node.js + Colyseus authoritative multiplayer server; persistent process and WebSockets.
- `packages/shared`: versioned network message contracts, enums, item definitions, survival balancing, world constants, schemas (e.g. Zod).
- `packages/art-tools`: deterministic procedural vector-art generators, rasterizer, sprite-sheet packer, atlas metadata builder, and validation scripts.
- `packages/game-data`: content manifests, loot tables, crafting recipes, structure types, NPC definitions, district map data.
- `prisma`: PostgreSQL schema and migrations (or documented equivalent if monorepo placement differs).
- `tests`: unit, integration, and multiplayer end-to-end tests.

Use Vercel only for the static frontend; host the persistent Node/Colyseus server on a WebSocket-capable always-on host. Configure frontend server URL via environment variables. Provide Docker Compose for local PostgreSQL, `.env.example`, seed data, and a documented one-command developer startup. Do not hardcode secrets or require paid services for the local playable version.

## Non-negotiable multiplayer model

- Server authoritative for position/speed validation, player state, health, survival ticks, attack hit resolution, ammunition, inventory, scavenging, crafting, construction, damage, looting, ownership and PvP safe-zone checks.
- Client sends intent, never trusted final state. Client-side interpolation/prediction may improve feel but reconcile with server.
- Proximity-based state interest management so only nearby entities synchronize at full frequency.
- All persistent transfers and loot claims are atomic and idempotent. Reject stale/replayed actions and prevent double claims.
- Persist account, character appearance, skills, inventory, equipped items, wallet, stored items, foundation ownership, construction modules, structure health, container contents and world drops.
- World remains mutable while owners are offline. Restarting the server must preserve raided walls, loot, and all legitimate inventory transfers.
- Handle reconnect, disconnect during combat, disconnect during loot, multiple concurrent attackers, and database errors without item duplication.
- Accounts must use secure authentication and password hashing; never store plaintext passwords. Validate and rate-limit messages.

## MVP world: The Block

Create one continuous horizontal playable district with layered parallax city backgrounds, sidewalk and roadway, collision geometry, an interior public shelter safe zone, a convenience store, scrap trader, alley scavenging area, and several buildable vacant parcels that are not assigned lots. Map boundaries and traversal lanes must remain unobstructed even after many players build. Allow future district streaming and expansion.

The public shelter is a safe zone: no PvP damage, theft, hostile actions, or base building within its boundaries. Safe-zone edge checks must prevent attacking from safety into danger. Respawn at shelter with temporary spawn protection that expires on leaving the protected area.

## Character creation and starting state

- Account creation/login; choose unique name, body preset, skin tone, hairstyle/color, starter top/bottom/shoes. Modular layers so gear appearance changes without replacing the whole sprite.
- Same base stats for everyone, no classes or paid advantages.
- Spawn with worn backpack (8 slots), water bottle, snack bar, basic street clothes, and $10 carried cash.
- Optional onboarding tasks: move, interact, scavenge, sell recyclables, drink/eat, build first foundation, visit shelter. Never lock sandbox freedom behind the tutorial.
- Skills improve by use: scavenging, athletics, strength, melee, marksmanship, crafting, trading, survival. Keep progression persistent.

## Survival and inventory

- Health, hunger, thirst, energy, temperature; design values for a 60-minute full in-game day, tuned for hardcore but not tedious play.
- Running and combat use stamina/energy; hunger and thirst gradually degrade performance before health loss.
- Server-ticked status changes with clear HUD, item consumption, and recovery at shelter.
- Inventory has slots, stack sizes, weights, item condition where relevant, equip slots, and server-validated pickups/drops.
- Scavenging: dumpsters, trash cans, abandoned containers; server-generated loot tables and cooldowns; basic resources wood, scrap metal, stone, brick, concrete, steel, glass, electronics, food, water and bandages.
- One scrap buyer and one basic store with server-validated purchases and sales. Expand to jobs and full player trading after core loop is stable.

## Grounded movement and combat

- Side-view walk/run/crouch, facing left/right, no jumping.
- Keyboard: A/D move, Shift sprint, Ctrl crouch, E interact, Tab inventory, M map, Enter chat, left-click attack/fire, right-click aim/block, R reload. Provide touch UI for mobile.
- Melee: fists and one craftable melee weapon, reach, cooldown, stamina cost, hit reaction.
- Firearm: one basic firearm, ammunition, reload, recoil, server-side projectile/hit validation; abstract in-game combat only.
- PvP on all non-safe-zone streets. Damage validation includes line of sight, range, cooldown, ammo, and anti-cheat speed checks.
- Death produces one immediately public loot bag holding carried cash, equipped gear and inventory; banked or stored items do not drop. On respawn, retain progression, skills, foundations, stored assets and ownership. Make loot bags atomic under simultaneous looting.

## Free-form construction and 24/7 raiding

- Build mode with snap-to-grid preview and valid/invalid placement feedback. The server validates every piece against protected road/path/safe-zone masks, collisions, world bounds, maximum footprint, adjacency and build budget.
- Place foundation on eligible ground; foundation persists and is raid-invulnerable. Players can build modular walls, floors, doors, roof pieces and storage crates attached to a valid owned foundation.
- At MVP implement at least wood foundation, wood wall, wooden door, basic roof, and storage crate. Provide art for intact, damaged and breached wall/door states.
- Every piece has a unique ID, owner/foundation association, material cost, HP and persistence. Walls/doors lose HP and become passable when destroyed. Foundation never receives raid damage.
- Raiders can attack player buildings at any time, including when owners are disconnected. Storage can be accessed/looted only when physically reachable and after relevant access checks; no client-only ownership bypass.
- Owner and optional authorized collaborators may build, repair, open doors and dismantle, with separate permissions for access, build, demolish and storage.
- Include repair costs, placement limits, building obstruction prevention and controlled owner dismantling. Plan a future inactivity/reclamation mechanism but DO NOT silently delete foundations in MVP.
- Base damage and theft must persist through logout/restart; tests must simulate offline-owner raids.

## Automated artwork generation — required, not optional

Codex must generate all sprites used in the implemented MVP without waiting for user uploads. Implement deterministic procedural SVG art with a shared style palette and reusable vector primitives, then rasterize to PNG (e.g. using Sharp or another available library). This is original programmatically drawn art, not an unsupported claim of AI illustration quality. If a configured image generation API is available, make it an optional provider with asset-manifest compatibility; do not require it.

Art direction: flat glossy cartoon, clean consistent outline thickness, readable shapes, controlled highlights, consistent side-view scale, transparent background for standalone assets, and coherent city palette. No external copyrighted sprites, emoji placeholders, or permanent debug rectangles.

Create at least:

- Player base sprite with skin/body/hair/clothing variations and left/right idle, walk, run, crouch, melee, firearm, hurt and death animations. Use 128x128 frame cells and explicit pivot/anchor metadata; mirror only when appropriate and validate alignment.
- NPC sprites: shelter caretaker, scrap trader, shopkeeper, one hostile street NPC.
- Environment: seamless 64x64 sidewalk, asphalt, curb, wall/ground tiles, background buildings, alley details, shelter, shop, signage, trash cans, dumpsters, streetlights and parked vehicle props.
- Construction: 128-based modular foundation, wall, door, roof, storage; distinct intact, damaged, breached states; ownership/build-mode preview indicators.
- Items/icons: 64x64 water, snack, bandage, wood, scrap, stone, brick, concrete, steel, glass, electronics, backpack, cash, melee weapon, firearm, ammo.
- Combat/interaction effects: hit, muzzle flash, impact, loot bag, construction effect, damage debris.
- UI icons: health, hunger, thirst, energy, temperature, inventory, build, interact, chat.

Organize assets under `apps/client/public/assets/` with a manifest mapping asset keys to files, atlas coordinates, frame dimensions, animation durations and anchor points. Provide scripts `pnpm assets:generate` and `pnpm assets:validate` that check existence, frame counts, image dimensions, transparency, sprite-sheet consistency and manifest completeness. All implemented features must have actual generated artwork and be playable after running setup.

## UI/UX

- Responsive login and character creation.
- In-game survival bars, carried cash, hotbar, inventory/equipment, scavenging panel, merchant panel, build palette, material costs, structure health, nearby player labels, simple chat, death/respawn and loot-bag interface.
- Build preview indicates blocked roads, collision, missing materials, and valid placements.
- Provide readable mobile touch buttons and scale HUD to narrow screens. Prioritize desktop gameplay if a complex mobile interaction requires later polish.

## Milestone order — implement and verify sequentially

1. **Repository/bootstrap**: workspaces, Phaser client, Colyseus server, shared contracts, PostgreSQL/Prisma, Docker Compose, scripts, env examples, README. Confirm build and local launch.
2. **Art pipeline and scene**: procedural asset generator, manifest, Phaser loader, coherent side-view The Block map, player animations. Verify art validation and render.
3. **Real multiplayer**: secure accounts, persistent characters, 2+ connected clients, movement synchronization, chat, shelter safe zone, reconnect tests.
4. **Survival/scavenging**: authoritative survival ticks, inventory, loot containers, resource items, merchants, persistence tests.
5. **Free building**: valid placement, foundations, walls, doors, roofs, storage, construction UI, resource costs, ownership, restart persistence.
6. **Combat/death/raiding**: fists, melee weapon, firearm, open PvP, safe-zone restrictions, immediate public death loot, destructible walls/doors, offline raiding and storage theft.
7. **Hardening**: concurrent loot claims, anti-duplication tests, restart/reconnect tests, server validation, rate limiting, performance measurements, deployment documentation.

At each milestone, implement real code, run typecheck/lint/tests/build, fix failures, and record a concise completion report. Do not skip ahead to future districts or cosmetic features if the current milestone is broken. If external infrastructure or credentials are missing, use local defaults/mocks only for infrastructure and explain precisely what remains for deployment; never simulate multiplayer with fake players and claim success.

## Acceptance criteria for MVP

- Two real browser sessions connect to the same authoritative world and see each other's movement.
- Characters, skills and inventory persist after logout/restart.
- Two clients cannot loot the same item twice.
- A player can scavenge wood, place a foundation on valid open ground, build a wall and door, store items, log out, and have another player breach and loot the base while the owner is offline.
- Foundation survives raid damage; door/wall breach and stolen storage remain saved after server restart.
- Safe zones prevent PvP and construction; open streets allow PvP.
- Player death drops ALL carried gear, items and cash immediately for public looting, while permanent skills and owned structures persist.
- All required implemented sprites are generated and loaded without manual art uploads.
- `pnpm install`, documented database startup/migration, `pnpm assets:generate`, and `pnpm dev` produce a playable local environment.
- Tests cover authorization, collision/placement, inventory transfer, death loot, concurrent looting, offline raids, foundation immunity, and persistence.

## Start now

Inspect the repository first. If empty, scaffold the monorepo. Then begin Milestone 1 and proceed milestone by milestone as the environment permits. Create the actual files, not just an explanation. When blocked, state the exact blocker and a concrete next action. Keep the game visually consistent and the core gameplay functional before adding scope.

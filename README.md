# Street Survival

A browser-based **top-down urban survival sandbox** inspired by CryoFall's world composition and HUD organization, with original flat cartoon artwork. Built with Phaser 3, Vite, TypeScript, Colyseus and PostgreSQL.

Live frontend: **https://the-block-tau-eight.vercel.app**. The authoritative server and PostgreSQL run on Railway. See `deployment/verification.json` for the last hosted verification and `docs/DESIGN.md` for the approved redesign.

## Start locally

Install Node.js 24+, pnpm 11 and Docker with Compose, then run:

```sh
pnpm setup && pnpm dev
```

Open **http://localhost:5173** in two browser profiles and create different accounts. Names must be unique and passwords at least 10 characters. No API keys, paid services or manual sprite uploads are needed locally.

Setup installs locked dependencies, waits for PostgreSQL, applies the idempotent SQL migration and generates art. The initial city is seeded without shared demo credentials. Copy `.env.example` to `.env` at the repository root to customize `DATABASE_URL`, `PORT`, `CLIENT_ORIGIN` and `VITE_SERVER_URL`. The server and Vite both read the root configuration; only `VITE_` variables are public.

PostgreSQL data survives `docker compose down`. Do not use `down -v` if you want to keep the city. Only one server authority may run per database.

## Play

- **WASD / arrow keys** move freely on both axes. **Shift** sprints, **Ctrl** crouches. Diagonal movement has the same speed as straight movement; there is no jumping.
- **E** interacts with the nearest merchant, container, base piece or bag.
- **Tab** backpack; **C** crafting; **K** character and skills; **B** building; **J** journal; **M** district map; **Enter** chat; **Escape** closes a panel.
- **1–0** activate the ten hotbar actions. **R** reloads. **Right click** aims; **left click** attacks a nearby target at the cursor. Wheel zooms.
- Mobile has a D-pad, run/crouch buttons, interaction and attack controls. Desktop is the primary target; visual mobile QA remains pending.

Start in **The Haven**, a walkable protected shelter. Its southern doorway leads toward the main street. Visit Mara at (1090, 650) for supplies and Otis at (1510, 650) to sell recyclables. Scavenging containers appear on the map and have per-character 60-second cooldowns. Craft a bat for three wood; buy a pistol and ammunition at the store and reload before firing.

The full in-game day lasts 60 real minutes. Hunger and thirst drain gradually, low values slow movement, and empty values cause health loss. Running and attacks use energy. The shelter restores health and energy. Temperature is displayed but exposure consequences are still pending.

The HUD puts navigation across the top, a minimap at upper right, health/energy at lower left, food/water at lower right, and ten quick actions below the world. All displayed survivor counts, inventory and status values come from the shared server.

### Build and raid

Vacant grounds lie east of the main north/south crossing and below the east/west road. Follow the minimap. Stand within 210px, press B, choose a foundation, and click valid ground. Modules must be within 128px of a selected owned foundation. Costs: foundation eight wood, wall five, door four, roof four, crate five. Maximum 40 pieces per owner.

The preview checks roads, shelter, static footprints, reach, materials, collision, ownership and footprint bounds. The server validates placement again. Roads and public buildings cannot be claimed. Foundations are raid immune. Existing legacy structures are retained during the world migration.

Walk normally into your base through an open door. Closed walls and doors block movement and storage access in both dimensions. Owners can open doors, repair for two wood, and dismantle empty modules outside combat. Remove attached modules before their foundation. There is no automatic foundation deletion.

Other players can breach barriers and take physically accessible storage while you are offline. Death produces one public bag with all carried items, equipped gear, loaded ammo and carried cash. Learned skills, bank balance, owned structures and stored contents remain. Respawn gives no free replacement inventory; spawn protection expires on leaving the shelter. The bank balance persists, but banking services are not yet exposed in the UI.

## Verify

With local PostgreSQL running:

```sh
pnpm verify
```

Verification runs lint, 19 tests, TypeScript checks, asset validation and a Vite production build. Tests create uniquely named temporary databases, so the database user needs `CREATEDB`; the Compose user has this permission. Tests never reset the developer's shared city. Ports 2568 and 2569 must be free.

The suite checks two-axis multiplayer movement, reconnect and real server restart, normalized diagonals, 2D safe zones and interaction ranges, placement/collision, public death loot, atomic concurrent claims, durable request IDs, offline-owner raids, foundation immunity, persisted breach/theft, and legacy world backup/migration. A five-second 20-client network smoke test records snapshot gaps in `docs/load-smoke.json`; it is not a sustained capacity benchmark.

```sh
pnpm assets:generate
pnpm assets:validate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The asset build produces **121 manifest entries**. Characters use original AI-generated black stick-figure PNGs: four directions, eight state rows, NPC roles and matching portraits. `art/ai/characters/README.md` documents the source poses and held-frame states. The importer crops, scales and packs existing artwork reproducibly; local setup needs no image API. World-pack icons, props and city buildings are integrated. Floor, wall, door and storage art now comes from a coordinated AI construction atlas with distinct intact, damaged and breached states. Floors join edge to edge; walls and doors snap to floor edges and storage sits inside. The coordinated art uses thin cream/slate walls, plain timber floors and matching doorways, with automatic wall rotation and matching collision. Roofs are no longer buildable or displayed. Terrain, bed, effects and UI symbols retain procedural SVG/PNG art. Validation checks required keys, dimensions, alpha and nonempty character cells. All four character atlases load together; saved legacy appearance data remains intact.

Browser automation was unavailable in the build environment. Asset sheets were inspected and network/rules checks run, but visual browser/mobile acceptance is not claimed. Follow `docs/BROWSER-QA.md` locally.

## Repository and persistence

| Path                 | Purpose                                                                     |
| -------------------- | --------------------------------------------------------------------------- |
| `apps/client`        | Phaser top-down world, interpolation, responsive game HUD and intent client |
| `apps/server`        | Colyseus authority, HTTP auth, rules, migrations and SQL repository         |
| `packages/shared`    | Protocol v2, geometry, items, balance, map and placement checks             |
| `packages/game-data` | District, NPC and loot definitions                                          |
| `packages/art-tools` | Original SVG generation, Sharp rasterization and atlas validation           |
| `prisma`             | PostgreSQL model reference and executable SQL migration                     |
| `tests`              | Rules, PostgreSQL, real-WebSocket and load-smoke checks                     |
| `deployment`         | Non-secret hosting targets and live verification reports                    |
| `docs`               | Design, review, QA, milestones and deployment guidance                      |

The `pg` repository and SQL migration are authoritative; Prisma is a model reference rather than the runtime ORM. A transactionally locked JSONB row holds the city. Accounts and hashed sessions are separate tables. `world_layout_backups` retains the pre-top-down world before its first upgrade; progress, inventory, ownership, storage and damage are preserved. This serialized first-district design needs profiling and normalization before larger scale.

See `docs/REVIEW.md` for remaining product gaps and `docs/DEPLOYMENT.md` for operations.

New characters start with 10,000 wood for building practice, alongside water, a snack and $10. Wood stacks to 10,000 in one slot and uses no carry weight, so other supplies remain usable. Existing saved inventories are unchanged.

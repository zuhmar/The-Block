# Street Survival

A real local multiplayer vertical slice of **The Block**, built with Phaser 3, Vite, TypeScript, Colyseus and PostgreSQL. Includes generated SVG/PNG art, account authentication, server movement, survival, scavenging, merchants, construction, combat, public death loot, persistent offline raids and automated tests. It is an initial implementation, not a claim that every master-prompt detail has passed browser acceptance.

## Start locally

Install Node.js 24+, pnpm 11 and Docker with Compose. From this repository:

```sh
pnpm setup && pnpm dev
```

Open **http://localhost:5173** in two browser profiles/private windows. Create **different accounts** (unique names, passwords of at least 10 characters). Both connect to the same city on port 2567. No API keys, paid services or uploaded sprites are needed. Local PostgreSQL credentials in Compose are development defaults.

`pnpm setup` installs the locked dependencies, starts and waits for PostgreSQL, applies the idempotent SQL migration and generates artwork. The map, NPCs and loot tables are deterministic content in `packages/game-data` and `packages/shared`; accounts are created at sign-up. No shared demo credentials are seeded.

To customize configuration, copy `.env.example` to `.env` in the repository root. The server loads that file; Vite reads frontend `VITE_` variables from the same root. Shell environment variables override file defaults. `DATABASE_URL`, `PORT`, `CLIENT_ORIGIN` and `VITE_SERVER_URL` are configurable. Never expose database credentials as `VITE_` values.

Stop development with Ctrl+C. PostgreSQL data survives `docker compose down`; do not use `down -v` if you want to keep the city. Run only one authority per database; an advisory lock enforces this.

## Play

- **A/D** walk, **Shift** run, **Ctrl** crouch. No jumping.
- **E** interacts with the closest merchant, scavenging container, structure or bag.
- **Tab** backpack and skills; **B** construction; **M** district map; **Enter** chat. The footer provides clickable alternatives.
- **Left click** attacks the nearest target in front of you. Equip a bat or pistol in the backpack. **R** reloads the pistol; **right click** shows the firearm aiming pose.
- On mobile, use the movement, run, crouch, hit and reload buttons and footer panels. Desktop is the primary target; touch rendering awaits device QA.

You begin in the protected shelter with a worn backpack (eight inventory slots), water, a snack and $10. Walk east to the store at 1090, scrap buyer at 1510 and scavenging containers at 1850 and beyond. Containers have a per-character 60-second cooldown. Sell resources for cash or buy wood and supplies. Consume food/water through the backpack. Craft a bat for three wood. Pistols and ammo are available at the store; reload before firing.

The day lasts 60 real minutes. Hunger and thirst drain gradually; low values slow movement, empty values damage health. Running and attacks consume energy. The shelter restores health and energy. Temperature follows the day cycle and is displayed; exposure damage is not implemented yet.

### Build and raid

Vacant parcels are marked east of x=2900. Stand within 210px, press B, select a foundation, then click valid ground. Modules require selecting an owned foundation within 128px. Costs are in the palette. Foundations cost eight wood; walls five; doors four; roofs four; crates five. Maximum: 40 pieces per owner. The server checks the build mask, grid, spacing, ownership and materials.

The main street is a permanent traversal lane. Base modules occupy a separate side-view lane above it, preventing buildings from trapping the whole district. To access storage, interact with the foundation **within 100px of its west entrance (foundation x − 160)** and select **Enter base**. Walk right through that lane. Closed doors and walls block movement and storage access. Owners can open their doors. Use **Exit to street** in the backpack or structure panel to leave. This is a compact one-dimensional base model, not a full room/interior construction system.

Store items through your crate panel. Other players can enter from the same west edge, attack walls/doors, breach them and take reachable contents while you are offline. Foundations ignore raid attacks. Repair costs two wood. Dismantling requires ownership, no active combat, an empty container, and removal of dependent modules before its foundation. There is no automatic foundation reclamation.

All carried items, equipped backpack, loaded ammunition and carried cash drop publicly on death, once. Anyone can claim them immediately on the open street. Skills, bank balance, property and stored items remain. Respawn gives no free replacement gear or supplies. Spawn protection expires on leaving the shelter. Bank balance persists but there is no banking service UI yet.

## Verify

Start PostgreSQL, then run:

```sh
pnpm verify
```

This runs lint, 13 tests, TypeScript checks, asset validation and the Vite production build. Tests create and drop uniquely named databases, so the configured database user needs `CREATEDB`. The Compose user has this permission. Tests do not reset your city. Ports 2568/2569 must be free for isolated server subprocesses.

Tests include two real WebSocket clients, server-controlled movement, shared chat, stale sequence rejection, reconnect, actual process restart, offline-owner door breach/storage theft and persistence after another restart. Unit/integration checks cover public death loot, foundation immunity, placement, authorization, concurrent database claims, rollback and durable request deduplication. A separate 20-client, five-second network smoke test records measured snapshot gaps in `docs/load-smoke.json`. It is not a sustained capacity or browser rendering benchmark.

```sh
pnpm assets:generate
pnpm assets:validate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Browser QA was unavailable in the build environment: no managed `cua_repl.js`/browser-control tool was exposed. No claim of two _browser_ sessions or completed visual/mobile acceptance is made. Follow `docs/BROWSER-QA.md` locally.

## Repository

| Path                 | Purpose                                                             |
| -------------------- | ------------------------------------------------------------------- |
| `apps/client`        | Phaser scene, interpolation, responsive HTML UI, intent client      |
| `apps/server`        | Colyseus room, validated game rules, HTTP auth, SQL repository      |
| `packages/shared`    | Versioned Zod contracts, inventory/balance/world definitions        |
| `packages/game-data` | District, NPC and scavenging content                                |
| `packages/art-tools` | Deterministic SVG generation, Sharp rasterization, atlas validation |
| `prisma`             | PostgreSQL model reference and executable SQL migration             |
| `tests`              | Unit, PostgreSQL, real-WebSocket and load-smoke tests               |
| `docs`               | Review, milestones, verification limits and deployment              |

The SQL migration and `pg` repository are authoritative; Prisma documents the three tables and is not the runtime ORM. World entities are currently persisted together in one JSONB row locked transactionally. This deliberate first-district implementation makes transfers and world changes atomic but needs profiling and normalization before a larger deployment.

See `docs/REVIEW.md` for remaining master-prompt gaps, `docs/DEPLOYMENT.md` for hosting, and `docs/MILESTONES.md` for completion evidence.

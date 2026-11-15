# Review of the supplied master prompt

The document is a technically detailed product specification, not merely an art prompt. The main engineering risks are transactional item ownership, offline world mutation, obstruction in a side-scrolling construction system, real browser verification and sustained multiplayer capacity. A single authoritative city and one district are appropriate constraints for a first build.

The implementation uses the specified stack, original deterministic procedural artwork and real PostgreSQL/WebSocket infrastructure. It does not substitute fake players or an in-browser multiplayer simulation. A PostgreSQL advisory lock prevents multiple authorities, and the server refuses creation of extra rooms. The browser receives the existing city ID and joins it directly.

## Acceptance status

| Requirement                                            | Evidence / status                                                                                                                                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two browser sessions see movement                      | Two real WebSocket clients pass. Browser rendering is **unverified** because browser tools are unavailable.                                                                                             |
| Persistent character, inventory, skills                | PostgreSQL snapshots; reconnect and real process-restart tests pass.                                                                                                                                    |
| No double loot claims                                  | Concurrent transactions serialize under row lock; exactly one claimant succeeds.                                                                                                                        |
| Build, store, offline-owner breach and theft           | Building/storage unit tests and real-WebSocket offline raid pass.                                                                                                                                       |
| Foundation immune; breach/theft persist                | Unit and database tests plus real server process restart after a raid pass.                                                                                                                             |
| Shelter safety and open-street PvP                     | Both attack endpoints and construction masks checked on server; tests pass.                                                                                                                             |
| Death drops carried assets; preserves permanent state  | Tested for inventory, equipment, cash, bank and skills; buildings remain in the world. Loaded ammo also drops.                                                                                          |
| Generated sprites without uploads                      | 283 manifest-backed SVG/PNG assets, including 108 appearance combinations in both directions. All generated/validated.                                                                                  |
| Reproducible startup                                   | Locked pnpm workspace, Compose database, idempotent migration, setup/dev scripts. Full install, migration, tests and frontend build exercised. Interactive `pnpm dev` browser launch awaits browser QA. |
| Validation, transfers, death, raids, persistence tests | 15 passing tests; see milestone report.                                                                                                                                                                 |

## Deliberate implementation choices

- **Separate base lane:** construction cannot seal the public horizontal street. Bases are entered from their west edge; walls/doors block that lane. Storage requires physical entry into the associated base and clear access. This is a compact 1D construction model, not fully enclosed 2D rooms.
- **PostgreSQL JSONB world row:** one `FOR UPDATE` transaction owns each mutation and all item transfers. Accounts and hashed sessions have separate tables. Normalize entities if profiling shows the world row becoming a bottleneck. Prisma's model is supplied as documentation; `pg` runs the SQL migration.
- **Durable action IDs:** requests carry protocol version, monotonically increasing per-connection sequence, unique ID and timestamp. Successful persistent actions and results commit with the world. Same-ID retries return the stored result; old messages are rejected. Ledger retention exceeds the accepted timestamp window.
- **Offline combat:** disconnected combatants remain targetable for their remaining combat timer. Their position and belongings persist; there is no disconnect escape to safety.
- **20 clients:** a local five-second network smoke test passes. This cannot establish sustained hosting capacity or mobile rendering performance.

## Remaining gaps before calling the entire master prompt complete

1. Browser visual/gameplay QA, two-window manual acceptance and mobile device testing. Managed browser tooling was absent, so these checks could not be executed here.
2. Full modular equipment visuals, selectable bottom/shoe garments, item durability/condition and moving equipment between distinct equipped slots. Current appearance selections persist and generate correctly; weapons and backpack are functional, with weapon selection in inventory.
3. Hostile NPC AI and interactions with the shelter caretaker. NPC artwork exists; merchants are functional interaction points.
4. Temperature exposure consequences, gameplay blocking/aim accuracy/recoil, and richer hit-reaction animations. Current combat uses authoritative direct range/line-of-sight hits, cooldowns, stamina, ammo and reload timing. Right-click currently shows an aiming pose; it does not implement a blocking mechanic.
5. Full enclosure/floor/interior building semantics, collaborator permission editing, and bounded crate capacity. Current owner-only access/build/repair/dismantle is enforced server-side; raiders may loot reachable storage.
6. Banking interface, explicit account progression beyond persistent learned skills, a dedicated hotbar and optional onboarding task tracking.
7. Sustained load/soak testing, production HTTPS/WebSocket hosting, monitoring and database recovery rehearsals. Vercel and Railway deployment is now live, with two-client hosted WebSocket and inventory-persistence smoke checks.

These are concrete remaining product tasks, not hidden behind completed milestone claims. No extra districts, paid services, fake multiplayer or external sprite packs were added.

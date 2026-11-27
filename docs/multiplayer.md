# 3D multiplayer

Choose **Play Online** on the entry screen and sign in or create an account (3–20 letters/numbers/underscores, starting with a letter; password at least 10 characters). Accounts are shared with the original server. Online characters start empty at the jail release area. Device-only single-player saves are never imported or overwritten. Use **Play Single Player** to return to that save.

One persistent compact city supports 20 concurrent players. The authority runs movement at fixed 20 ms steps, simulation at 20 Hz, and snapshots at 10 Hz. The client predicts its own movement immediately and replays unacknowledged inputs; other players interpolate between snapshots. Nearby players use the approved black stick figure, with names and weapon animations. The server controls NPCs, health, ammunition, reloading, gathering, loot cooldowns, drops, inventory conservation, plot ownership, upkeep, construction, storage and crafting. Doors, resources, buildings and explosives are shared. Menus do not pause the city. The jail release radius remains protected; combat logging leaves a character vulnerable for 30 seconds.

All carried items and cash drop on death. Personal storage contents are sent only while inspecting a reachable station. Player doors are owner-operated; accessible storage remains raidable. Existing C4 damage thresholds apply. No offline inventory, balance, damage or position is accepted as authority.

## Storage and recovery

Additive migration `prisma/002_fps.sql` creates `fps_worlds`, separate from `worlds`. One process owns both rooms using the existing PostgreSQL advisory lock. Economic actions serialize and checkpoint before acknowledgement. Combat and movement checkpoint every two seconds and on departure. An abrupt process loss can roll back at most the most recent checkpoint interval of transient activity. Database errors freeze the 3D world until a successful checkpoint; clients never silently fall back to a local authority. Reconnect from the menu after a disconnect. A deployment disconnects clients; reconnect restores saved progress.

The production backend runs on Railway and the frontend on Vercel. `VITE_SERVER_URL` selects the API/WebSocket authority. Railway must remain at one replica unless the world is explicitly sharded. Authentication sessions expire after seven days; one connection per account is accepted. Request validation, rate limits, server-observed movement credit, inventory conservation, distance checks, line-of-sight checks and duplicate economic request IDs are enforced. This is an initial multiplayer release, not a substitute for sustained load testing or abuse monitoring.

## Local verification

Use an isolated PostgreSQL database; never point tests at production. Set `DATABASE_URL`, `CLIENT_ORIGIN` and `PORT` for `pnpm --filter @street/server start`, and point the Vite client at that port. `pnpm test` covers FPS authority validation, prediction, PvP/cover, full-loot death, replay protection and private storage visibility alongside the existing regression suite. Open two independent browser contexts/accounts to exercise shared movement, visible avatars and reconnects. The legacy `/auth`, `/world` and `block` room remain supported. New endpoints are `/fps/auth`, `/fps/world` and the existing Colyseus matchmaking endpoint for the `block3d` room.

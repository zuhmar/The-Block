# Deployment

The frontend is deployed on Vercel, with the persistent Node server and PostgreSQL deployed on Railway. See `HOSTING-SETUP.md` for the live URLs and `deployment/verification.json` for live checks.

## Persistent server

Use an always-on Node.js 24 host supporting WebSockets and a PostgreSQL database. A Dockerfile is included; Railway service settings are configured directly through its API. Railway builds from the repository root with Docker and probes `/health`; readiness requires both the database and the city room. Use a direct PostgreSQL connection or session-mode pooler, never a transaction-mode pooler: the authority holds a session advisory lock. Run exactly one replica for a database; PostgreSQL advisory locking rejects a second authority. No process-local database substitutes are used. A Railway replacement waits up to 90 seconds for the previous authority to release its lock. After the new image reaches the waiting log, restart the previous game-server deployment (not PostgreSQL) to release the lock and let the successor take over. Expect a brief reconnect window; migrations run only after the successor owns the lock. Monitor both deployments until the new one is healthy.

Set `NODE_ENV=production`, `DATABASE_URL`, `PORT` and `CLIENT_ORIGIN` (the exact HTTPS frontend origin). Configure HTTPS/WSS termination, proxy WebSocket upgrades and expose `/health` for readiness. The server applies the idempotent SQL migration at startup, then opens the singleton city. `/world` returns its current room ID; the client fetches it afresh after a restart.

`pnpm --filter @street/server start` runs the TypeScript authority with tsx. The provided container installs the locked development tools as well as production dependencies so tsx is available. Improve the runtime image/build compilation before a larger deployment if necessary. The local container initially could not reach the npm registry. Railway subsequently built and ran the complete Docker image successfully; its health check and live two-client WebSocket test passed.

Use a non-default database password, private database networking and secret environment variables. Do not ship `.env`. Configure the reverse proxy's client IP handling deliberately before adjusting Express trust-proxy or relying on per-IP limits behind a proxy. The current HTTP auth limiter allows 60 requests per minute per observed IP; game intents allow 45 per second per connection. Passwords use scrypt with per-account random salts; bearer tokens are 32 random bytes, stored hashed, and expire after seven days. There is no account recovery or email verification.

The current room sends proximity-filtered state at 10Hz and commits its world in one PostgreSQL JSONB row. The local smoke result is insufficient for production capacity planning. Profile bandwidth, database CPU, queue delay and memory under sustained 20-client traffic before increasing limits. Benchmark snapshots with a large accumulated building/drop count, not just a newly seeded map.

## Vercel static frontend

The root `vercel.json` sets install/build/output paths. Set `VITE_SERVER_URL=https://your-persistent-server.example` at build time. Vercel builds reject a missing, localhost or non-HTTPS server origin rather than deploying a client pointed at the visitor’s localhost. Keep the Vercel Root Directory at the repository root. Deploy only the Vite output under `apps/client/dist`. Vercel does not host the persistent Colyseus process. Configure the authority's `CLIENT_ORIGIN` to the deployed frontend origin and use HTTPS/WSS for both endpoints.

## Backups and operations

Back up PostgreSQL with `pg_dump` and exercise restore to a separate database. All legitimate committed item transfers, dropped bags, ownership and damaged structures live in `worlds.data`. Accounts and hashed sessions are separate tables. Database errors roll back actions and show a failure notice; clients should reconnect after an outage. Expired sessions and old successful-action IDs can be pruned; foundation reclamation must be a separately designed, explicit policy, not silent deletion.

## Known limits

See `REVIEW.md`. No production availability, penetration-test result, sustained 20-player capacity or completed browser/mobile acceptance is claimed.

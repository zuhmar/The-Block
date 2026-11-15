# Hosting handoff: Vercel + Railway

Status: live on Vercel and Railway. The PostgreSQL service has a persistent 500MB volume in `iad`. The server uses a private database-variable reference; no database credentials are stored in GitHub.

- Frontend: https://the-block-tau-eight.vercel.app
- Game server: https://street-survival-server-production.up.railway.app
- Railway project: https://railway.com/project/d6c8f776-3f6b-4e6b-9f46-9d4b4d5596f7

`deployment/targets.json` records non-secret resource identifiers. `deployment/verification.json` records the successful live HTTP, CORS, signup/login, two-client WebSocket movement and persistent-inventory checks. Browser rendering and mobile QA remain unverified.

## Architecture

```text
Browser → Vercel static frontend
        → Railway HTTPS + WebSocket game server → Railway PostgreSQL
```

The browser never connects directly to PostgreSQL. Do not add `DATABASE_URL` to Vercel or prefix secrets with `VITE_`.

## Reproduce the setup

1. Create/import a Vercel project from `zuhmar/The-Block`, branch `main`, repository root. Use `vercel.json`'s existing build/output settings. Record the assigned production frontend origin; do not assume a particular `vercel.app` hostname is available.
2. Create a Railway project with a PostgreSQL service and a Docker service sourced from the same GitHub repository. Keep its source root at the repository root so `Dockerfile` is used.
3. Set the server's variables below. Reference the PostgreSQL service's **direct** `DATABASE_URL` through Railway's variable-reference UI. Do not copy that value into this file or GitHub.
4. Expose a Railway HTTPS domain for the server and deploy. Verify `/health` returns `ok: true` and `/world` returns a nonempty `roomId`. Startup applies the idempotent SQL migration and seeds an empty city without overwriting existing records.
5. Set the frontend's `VITE_SERVER_URL` to that HTTPS server origin, then deploy/redeploy Vercel. Set `CLIENT_ORIGIN` on the server to the actual frontend production origin if it differs from the originally recorded value.
6. Verify signup/login, two browser sessions, WebSocket movement, a persistent action and reconnect. Use `BROWSER-QA.md` for the complete gameplay checks.

| Service             | Variable          | Value                                                                        |
| ------------------- | ----------------- | ---------------------------------------------------------------------------- |
| Railway game server | `NODE_ENV`        | `production`                                                                 |
| Railway game server | `DATABASE_URL`    | Secret reference to the PostgreSQL service's direct URL                      |
| Railway game server | `CLIENT_ORIGIN`   | Exact Vercel production origin, e.g. `https://<assigned-project>.vercel.app` |
| Railway game server | `PORT`            | Railway-assigned port; server binds this automatically                       |
| Vercel frontend     | `VITE_SERVER_URL` | Exact Railway HTTPS server origin                                            |

`CLIENT_ORIGIN` permits the production frontend. Arbitrary Vercel preview domains are not enabled automatically. A preview frontend should use a separately configured test backend if needed.

## Operational constraints

- Deploy exactly one game-server replica. The session advisory lock rejects another authority using the same database. Disable sleeping/serverless execution for the game service.
- For server upgrades, wait until the successor logs that it is waiting for the previous authority, then restart the previous game-server deployment by its deployment ID. The successor polls the lock before migrating and simulating; the database stays running. Expect a brief reconnect window and verify the new deployment becomes healthy.
- Do not use a transaction-mode database pooler: the advisory lock requires a stable PostgreSQL session.
- Keep provider TLS options on the connection URL; do not disable certificate verification to make a connection work.
- Select provider plans deliberately. Infrastructure uses the account’s existing provider plan and default resource allocation; no plan upgrade was selected. Check Railway usage in the project dashboard.
- GitHub `main` is linked to both hosts. Server watch patterns cover runtime/dependency changes and exclude documentation-only updates. Railway service settings are configured through its API: Dockerfile, `/health`, one replica in `iad`, sleeping disabled, zero overlap and five-second draining. The deprecated `railway.json` was removed; new Railway services no longer accept it.

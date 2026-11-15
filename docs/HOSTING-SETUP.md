# Hosting handoff: Vercel + Railway

Status: configuration committed; account connections and live provisioning are pending. No credentials or paid infrastructure were created in this session.

## Architecture

```text
Browser → Vercel static frontend
        → Railway HTTPS + WebSocket game server → Railway PostgreSQL
```

The browser never connects directly to PostgreSQL. Do not add `DATABASE_URL` to Vercel or prefix secrets with `VITE_`.

## Provision after connecting the accounts

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
- For later server upgrades, stop the existing authority before starting its replacement. A rolling deploy can fail readiness while the old authority retains the lock. The current release does not provide zero-downtime handover.
- Do not use a transaction-mode database pooler: the advisory lock requires a stable PostgreSQL session.
- Keep provider TLS options on the connection URL; do not disable certificate verification to make a connection work.
- Select provider plans deliberately. Infrastructure provisioning may require billing; no plan has been selected or charged by this setup work.
- GitHub is already linked and the deployment files can be pushed independently of provider authorization. Live provisioning still needs the Vercel and Railway account connections.

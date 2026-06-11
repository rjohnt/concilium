# Deploying Concilium

**Hosting model:** the Next.js app runs on **Railway**; **Supabase** provides the
database, auth, and realtime. Supabase does *not* host the app itself.

## Railway — auto-deploy on merge to main

Concilium uses Railway's **native GitHub integration** — no CI workflow needed.

1. In the Railway project → service → **Settings → Source**, connect the
   GitHub repo and set the **production branch to `main`**.
2. Every merge to `main` then auto-builds (Nixpacks, Node 22) and deploys.
3. Build/run is driven by `railway.json`:
   - build: Nixpacks → `npm run build`
   - start: `npm run start` (`next start`)
   - healthcheck: `GET /api/health` (returns `{ status: "ok", dataBackend }`)
   - restart on failure, up to 5 retries

PRs build but do not deploy; only `main` deploys.

## Required environment variables (Railway → service → Variables)

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL (auth, realtime, client reads) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only** | Enables the Postgres data layer. **Without it the server falls back to local SQLite, which is ephemeral on Railway and wiped on every redeploy — set this in production.** |
| `DEEPSEEK_API_KEY` | server-only | Mediator, AI stand-ins, build specs |
| `CONCILIUM_BUILD_EXECUTOR` | optional | `report` (default) or `local-claude` |
| `CONCILIUM_BUILD_WORKSPACE` | optional | Sandbox dir for `local-claude` builds |

> The Postgres data layer (and therefore `SUPABASE_SERVICE_ROLE_KEY`) requires
> the Supabase-migration change to be on `main`. Until then the app runs on
> SQLite regardless of the key.

## Verifying a deploy

```bash
curl https://<your-railway-domain>/api/health
# { "status": "ok", "dataBackend": "supabase-postgres", "supabaseConfigured": true, ... }
```

`dataBackend: "sqlite"` means `SUPABASE_SERVICE_ROLE_KEY` is missing — data will
not persist across redeploys until it's set.

## Supabase

The schema (tickets / feedback / build_reports, with RLS and the realtime
publication) lives in the Supabase project. See the migration notes in the repo
history. The `DEEPSEEK_API_KEY` is also stored in Supabase secrets for any
future edge-function use, but the Railway app reads it from Railway env.

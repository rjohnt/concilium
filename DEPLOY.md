# Deploying Concilium

**Hosting model:** the Next.js app runs on **Railway**; **Supabase** provides the
database, auth, and realtime. Supabase does *not* host the app itself.

## Deploy-on-green — merge to main → tests → Railway

Deploys are driven by **GitHub Actions** (`.github/workflows/test.yml`), not
Railway's native git integration (its GitHub App isn't installed on this
repo). The flow, on every push to `main`:

1. **`test` job** — full unit suite (`npm test`) + production build. A red
   suite blocks the deploy entirely (see AGENTS.md: green suite is the
   definition of done).
2. **`deploy` job** — calls Railway's GraphQL API
   (`serviceInstanceDeployV2`) **pinned to the exact merge commit SHA**,
   polls the deployment until `SUCCESS`, then smoke-checks
   `GET /api/health`. Requires the `RAILWAY_TOKEN` repo secret (a Railway
   team token).

PRs run the `test` job only; nothing deploys from a PR. On Railway's side,
build/run is driven by `railway.json`:
- build: Nixpacks → `npm run build`
- start: `npm run start` (`next start`)
- healthcheck: `GET /api/health` (returns `{ status: "ok", dataBackend }`)
- restart on failure, up to 5 retries

> Manual deploy (e.g. rollback to a known-good SHA): run the same
> `serviceInstanceDeployV2` mutation with `commitSha` set — without it,
> Railway redeploys the previously cached commit, not latest main.

## Required environment variables (Railway → service → Variables)

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL (auth, realtime, client reads) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only** | Enables the Postgres data layer. **Without it the server falls back to local SQLite, which is ephemeral on Railway and wiped on every redeploy — set this in production.** |
| `DEEPSEEK_API_KEY` | server-only | Mediator, AI stand-ins, build specs |
| `CONCILIUM_BUILD_EXECUTOR` | optional | `report` (default) or `local-claude` |
| `CONCILIUM_BUILD_WORKSPACE` | optional | Sandbox dir for `local-claude` builds |
| `CONCILIUM_SANDBOX_PROVIDER` | optional | Default sandbox provider: `local` (default), `docker`, or `daytona` (projects can override) |
| `DAYTONA_API_KEY` | server-only | Required for the `daytona` sandbox provider — builds fail with a config error without it |
| `DAYTONA_API_URL` | optional | Daytona API endpoint (defaults to Daytona's hosted API) |
| `DAYTONA_GIT_PAT` | optional | Personal access token for cloning/pushing private repos from Daytona sandboxes |
| `GITHUB_APP_ID` | server-only | GitHub App id (the ConciliumAI app). With the private key below, builds mint short-lived installation tokens scoped to the project's repo — the customer-repeatable way to open PRs. Customers install the app on their repos; PRs are authored by the app's bot |
| `GITHUB_APP_PRIVATE_KEY` | server-only | The app's private key PEM content (`\n`-escaped newlines allowed) — use this on hosts where a file path isn't practical |
| `GITHUB_APP_PRIVATE_KEY_PATH` | server-only | Alternative to the above: path to the downloaded `.pem` file |
| `GITHUB_TOKEN` | server-only | Fallback when the app isn't configured/installed: a PAT (classic `repo`, or fine-grained with Contents + Pull requests: read/write) used to open PRs. Without any credential the branch still pushes; the build records a "Pull request skipped" note instead of failing |

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

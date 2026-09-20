# NexusTrace deployment foundation

## Prerequisites

- Node.js `22.13.0` or later and pnpm `11.19.0`.
- PostgreSQL 16 or later. The application uses PostgreSQL through Prisma 7.
- A persistent, access-controlled filesystem location for evidence. The local adapter is intentionally the current deployment adapter; S3/MinIO may replace it later without changing database-controlled evidence IDs.
- HTTPS termination in front of the application for non-local deployments. MapLibre retrieves authorized basemap tiles, fonts, and styles from `https://tiles.openfreemap.org`.

Copy `.env.example` into a deployment-managed environment file or secret store. Do not commit it. Required application variables are `DATABASE_URL`, `APP_ORIGIN`, and `EVIDENCE_STORAGE_ROOT`. `APP_ORIGIN` must be HTTPS outside localhost. `AUTH_SECRET` is not used: NexusTrace uses opaque, random, database-backed session tokens and does not configure a second signing secret.

`POSTGRES_*` variables are only used by the supplied Compose database. Never use its placeholder password outside a local demo.

## Canonical production commands

```bash
pnpm install --frozen-lockfile
pnpm db:deploy
pnpm build
pnpm start
```

`pnpm build` is the supported deterministic Webpack build path and runs Prisma Client generation first. `pnpm start` validates its production configuration before it launches the generated Next standalone server, so a missing `APP_ORIGIN`, database URL, or evidence root prevents a misleading partial start. The default Turbopack build is not supported in this host because its CSS worker cannot bind an internal port; this does not affect the Webpack production path.

## Docker and Compose

```bash
cp .env.example .env
# Replace every placeholder, especially POSTGRES_PASSWORD and APP_ORIGIN.
docker compose up --build -d
docker compose ps
curl -fsS http://localhost:3000/api/health
```

The Docker image is multi-stage, generates Prisma Client during its build, runs as a non-root user, and exposes the Next standalone server. Compose runs the existing migration history in a dedicated one-shot build-stage job after PostgreSQL becomes healthy, then starts the application only after that job succeeds. It mounts both `nexustrace-postgres` and `nexustrace-evidence` named volumes. Restarting or replacing only the app container does not remove evidence.

For a direct image run, mount the evidence root and pass environment values at runtime:

```bash
docker run --rm -p 3000:3000 \
  -e DATABASE_URL='postgresql://...' \
  -e APP_ORIGIN='https://nexustrace.example.gov' \
  -e EVIDENCE_STORAGE_ROOT=/var/lib/nexustrace/evidence \
  -v nexustrace-evidence:/var/lib/nexustrace/evidence \
  nexustrace-ai
```

## Database migrations and recovery

Use only `pnpm db:deploy` (`prisma migrate deploy`) in deployment. It applies existing migration history without generating, resetting, or dropping schema. Initial deployment is: provision PostgreSQL, set environment values, run `pnpm db:deploy`, then start the app. Subsequent release: backup database and evidence together, deploy the new image, run the same migration command, health-check, and retain the preceding image for rollback.

### Current migration-history constraint

The active local schema is current and `pnpm db:deploy` is clean against it. A fresh-database deployment test currently stops at historical migration `20260918211048_add_activity_records`, which references `IncidentVerificationLevel` before the enum is created in the historical sequence. This is an existing migration-order defect, not a runtime schema change in this task. It is deliberately not rewritten, squashed, or bypassed here because doing so would alter established migration history. A real first deployment requires a reviewed, separately authorized migration-history repair or a validated baseline strategy before it can be considered production-ready.

Do not use `prisma migrate dev`, `prisma db push`, or `prisma migrate reset` against a deployed database. Rollback is an application-image rollback when the schema remains compatible; otherwise restore a verified database and evidence backup matching the prior application/migration version. Existing history must not be rewritten or squashed.

PostgreSQL backup example:

```bash
pg_dump --format=custom --no-owner --file=nexustrace-$(date +%F).dump "$DATABASE_URL"
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" nexustrace-YYYY-MM-DD.dump
pnpm db:deploy
curl -fsS "$APP_ORIGIN/api/health"
```

Back up the evidence volume at the same logical point as PostgreSQL (for example, a stopped-app filesystem snapshot or a coordinated archive). Restore it to the configured `EVIDENCE_STORAGE_ROOT` with owner-only access. Verify checksum-backed evidence retrieval through an authorized account after restore. Neither database backups nor reports expose a local storage path to users.

## Security and operations

All routes receive `nosniff`, strict referrer, frame-denial, and restrictive permissions headers. A per-request CSP nonce protects Next scripts. `style-src 'unsafe-inline'` is narrowly retained because MapLibre creates runtime style nodes; `script-src 'unsafe-eval'` is enabled only for the Next/React development server because its diagnostic call stacks require it, and is absent from production builds. Map network, image, font, and worker permissions are otherwise restricted to NexusTrace and OpenFreeMap sources. HSTS is emitted only for HTTPS production requests.

Next Server Actions enforce same-origin protection. The request proxy denies cross-origin mutating `/api` requests. The local rate limiter applies bounded per-identity limits to login, search, report generation, evidence attachment, graph/geographic traversal, and investigation analysis. It is deliberately process-local for a single instance; replace this module with Redis or deployment-native storage before horizontal scaling. Operational JSON logs redact credentials, tokens, cookie values, checksums, storage keys, and evidence content. They are distinct from immutable application audit records.

`/api/health` is a no-auth liveness/readiness probe. It reports only application/database state and safe optional build version; it never returns environment values, paths, credentials, or investigation data.

## Updating and troubleshooting

1. Back up PostgreSQL and evidence storage.
2. Pull/build the new image or checkout.
3. Run `pnpm db:deploy` once against the target database.
4. Restart the app, then verify `/api/health`, protected login, and an authorized evidence download.

If health is degraded, inspect structured server logs and database availability first. Do not seed synthetic data in production: `pnpm db:seed` is only for an explicitly requested demo database. Fresh production startup depends on migrations, not seed records.

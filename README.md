# NexusTrace AI

NexusTrace is a synthetic-data criminal network intelligence and investigation prototype for authorized investigative workflows.

The first vertical slice is under active development. Architecture and delivery decisions are documented in `docs/superpowers/`.

## Local development

1. Copy `.env.example` to `.env` and replace every placeholder.
2. Start PostgreSQL with `docker compose up -d postgres`.
3. Run `pnpm db:migrate`, then `pnpm db:seed`.
4. Start the application with `pnpm dev`.

The seed contains synthetic demonstration data only. The three demo accounts share the password `NexusTraceDemo!2026`:

- `admin@nexustrace.demo`
- `department@nexustrace.demo`
- `investigator@nexustrace.demo`

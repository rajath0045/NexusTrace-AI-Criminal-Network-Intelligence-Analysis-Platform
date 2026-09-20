# NexusTrace AI

NexusTrace is a synthetic-data criminal network intelligence and investigation prototype for authorized investigative workflows.

The first vertical slice is under active development. Architecture and delivery decisions are documented in `docs/superpowers/`.

## Local development

1. Copy `.env.example` to `.env` and replace every placeholder.
2. Start PostgreSQL and the rebuildable Neo4j projection with `docker compose up -d postgres neo4j`.
3. Run `pnpm db:migrate`, then `pnpm db:seed`.
4. Start the application with `pnpm dev`.

## Relationship intelligence projection

PostgreSQL/Prisma is NexusTrace's canonical system of record. Neo4j contains only a server-side, disposable projection of authorized graph entities, semantic relationships, communications, and financial transfers. Browser code never receives Neo4j credentials or arbitrary Cypher access.

Set all four `NEO4J_*` values from `.env.example`, then run `pnpm graph:sync` to initialize Neo4j constraints and project canonical records. `pnpm graph:rebuild` clears only Neo4j `GraphEntity` projection nodes and deterministically reconstructs them from PostgreSQL; it does not modify any canonical evidence, relationships, or audit history.

Back up PostgreSQL as the source of truth. Neo4j's `/data` volume is persistent for development convenience, but a deleted or corrupted graph is recovered with `pnpm graph:rebuild`. The health endpoint reports graph status without exposing connection details. Failed projection events remain in PostgreSQL's retryable outbox and never roll back valid investigative writes.

The seed contains synthetic demonstration data only. The three demo accounts share the password `NexusTraceDemo!2026`:

- `admin@nexustrace.demo`
- `department@nexustrace.demo`
- `investigator@nexustrace.demo`

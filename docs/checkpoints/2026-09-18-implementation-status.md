# NexusTrace Implementation Status

## 2026-09-18 — Task 1 complete

- Project scaffold, strict TypeScript, Tailwind, Vitest, Testing Library, Playwright, and Next.js App Router foundation are implemented.
- ESLint is pinned to the supported 9.x line (`9.39.5`) with the Next.js core-web-vitals, TypeScript, React, and React Hooks rules active.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- The production application builds successfully with `next build --webpack`. The default Turbopack build reaches CSS processing but this execution host denies the worker's internal port bind; the project configuration remains unchanged.
- Next implementation phase: Task 2, PostgreSQL schema and deterministic synthetic seed data.

## 2026-09-18 — Task 2 complete

- Added the normalized PostgreSQL schema and initial migration for departments, identities, sessions, cases, people, evidence, graph entities, evidence-backed relationships, and audit events.
- Added a strict server-environment boundary and a Prisma 7 PostgreSQL-adapter singleton.
- Added an idempotent synthetic seed with three departments, one account per role, two FIRs, four people, evidence metadata, graph entities, and two verified evidence-backed relationships.
- Prisma schema validation, client generation, migration, seed, lint, typecheck, unit tests, and PostgreSQL integration tests pass.
- Docker Compose remains the standard local-development path. This execution host stalled while pulling the container image, so verification used its installed PostgreSQL 18 server with an ignored project-local data directory and the same configured port.
- Next implementation phase: Task 3, authentication, sessions, RBAC, and the protected application shell.

## 2026-09-18 — Task 3 complete

- Added role capabilities and department-scoping policy for Investigator, Department User, and Administrator actors.
- Added Argon2 password verification and revocable database sessions that persist only SHA-256 token hashes while using opaque HttpOnly, SameSite=Lax cookies.
- Added session rotation, expiry enforcement, inactive-user denial, safe stale-session cleanup, and logout destruction.
- Added audited credential login, generic credential failures, authenticated redirects, a capability-driven protected shell, and reusable loading, empty, error, and status primitives.
- The login and shell preserve the established compact dark interface across desktop and narrow layouts with semantic controls, visible focus, and reduced-motion handling.
- The external 21st source-upload review was not run because this environment did not authorize exporting repository code; an equivalent local semantic, responsive, focus, and reduced-motion review was completed.
- Targeted authentication tests, full unit tests, integration tests, ESLint, TypeScript, and the production webpack build pass.
- Next implementation phase: Task 4, authorized Case/FIR workflow.

## 2026-09-18 — Task 4 complete

- Added validated Case/FIR domain inputs, typed not-found/conflict failures, and a service boundary that independently enforces capabilities.
- Added actor-scoped PostgreSQL list/detail queries that return no record for unauthorized departments while allowing Administrator cross-department access.
- Case creation now writes the case, its first-class CASE graph entity, and its audit event in one transaction and translates unique FIR/case conflicts safely.
- Added authenticated case list, registration, and detail routes with role-aware actions, accessible form errors, loading/error/empty states, and responsive tables and panels.
- Corrected the unit-test script's integration exclude quoting after multiple integration files exposed shell glob expansion.
- ESLint, TypeScript, 11 unit/component tests, 4 PostgreSQL integration tests, and the production webpack build pass.
- Next implementation phase: Task 5, consolidated person profiles.

## 2026-09-18 — Task 5 complete

- Added canonical person-profile projections with identity details, aliases, actor-visible case roles, evidence summaries, and graph focus identifiers.
- Added server-side department scoping that returns no profile for people without an authorized case and filters every case/evidence join independently.
- Added audited case participation for suspect, victim, witness, complainant, and investigator roles; Department Users and Administrators can associate profiles while Investigators remain read-only.
- Case records list linked people and reopen the canonical profile; profiles link back to each authorized case.
- Added all nine planned keyboard-operable profile sections, rendering real current-slice data for Identity, Cases, and Evidence and explicit deferred empty states for future domains.
- The installed 21st design context guided the compact dark UI. No authenticated `21st` executable or component catalog configuration was available, so implementation used existing project components and a local accessibility/responsive review.
- ESLint, TypeScript, 15 unit/component tests, 7 PostgreSQL integration tests, and the production webpack build pass. The default Turbopack build remains blocked by the host's internal CSS-worker port restriction.
- Next implementation phase: Task 6, evidence attachment and authenticated retrieval.

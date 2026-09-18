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

## 2026-09-18 — Task 6 complete

- Added a local evidence-storage boundary rooted outside public assets, using generated storage keys and rejecting traversal or absolute paths.
- Added server-side allowlisted MIME validation for PDF, JPEG, PNG, CSV, and plain text; non-empty files are capped at 10 MB and display filenames are normalized.
- Evidence attachment verifies role and case scope before writing bytes, calculates SHA-256, persists metadata plus an audit event transactionally, and removes stored bytes when metadata persistence fails.
- Added actor-scoped evidence list and lookup queries that do not reveal cross-department records to non-administrators.
- Added the case evidence list and Department User/Administrator upload form using the existing compact dark design system; Investigators receive read-only access.
- Added an authenticated streaming download route with private/no-store caching, safe encoded filenames, declared content length/type, and `nosniff` protection. Person-profile evidence entries reuse this protected route.
- Added 10 focused file-safety/service/component/route tests and 2 repository integration tests; the complete suite now passes 25 unit/component tests and 9 PostgreSQL integration tests.
- ESLint, TypeScript, and the production webpack build pass. The default Turbopack build still reaches CSS processing but cannot bind its internal worker port on this host.
- Next implementation phase: Task 7, evidence-backed graph domain, traversal, and relationship verification.

## 2026-09-18 — Task 7 complete

- Added framework-independent graph contracts for authorized entity lookup, bounded neighborhoods, connection detail, provenance, proposals, verified creation, and administrative review.
- Added presentation-safe graph entity, edge, neighborhood, source, and relationship-detail projections without duplicating canonical Person, Case, or Evidence data.
- Added bounded PostgreSQL traversal for one, two, or three hops with strength and verification filters, per-layer limits, and duplicate node/edge protection.
- Graph queries return no root, edge, count, metadata, or provenance when department scope denies access; service identifiers are validated before repository access.
- Added relationship invariants for self edges, duplicate directed semantic edges, same-department endpoints, exact evidence/case provenance, verifier identity, verification timestamp, and at least one source for verified intelligence.
- Investigators and Department Users can submit pending intelligence; only Administrators can create or approve verified relationships. Strength remains independent from evidence confidence and verification state.
- Relationship proposals, verified creation, verification, rejection, and changes-requested reviews write audit events in the same transaction as graph mutations.
- Extended the deterministic synthetic seed to 11 graph entities and 5 relationships covering primary, secondary, tertiary, verified, and pending intelligence with observation timestamps and interaction counts.
- ESLint, TypeScript, 33 unit tests, 20 PostgreSQL integration tests, and the production webpack build pass.
- Next implementation phase: Task 8, focused Cytoscape network exploration and connection details.

## 2026-09-18 — Customizable Dashboard and Cases workspace milestone complete

- Added a versioned, presentation-only `UserWorkspaceLayout` PostgreSQL preference with a unique `(userId, workspaceKey)` constraint. Layouts persist only widget ID, authoritative label, and size; no case, person, evidence, or investigation records are stored in layout JSON.
- Workspace operations derive the user exclusively from the authenticated server session. The service strictly validates layout payloads, rejects duplicate or structural fields, migrates recognized legacy versions, filters unauthorized and stale widget IDs, and always restores server-authoritative labels and role capabilities before returning a layout.
- Added role-aware defaults and independent user preferences for the Dashboard and Cases workspace keys. A saved arrangement survives refresh and logout/login, while Customize mode is intentionally client-local and every page opens in fixed professional mode.
- Added a reusable workspace grid and toolbar with fixed/customize modes, keyboard-supported foundation interaction, Small/Wide/Tall/Large controls, Save, and Reset Page Layout. Normal mode passes `editable={false}`; only an explicit Customize action enables editing.
- Added the authenticated Dashboard and integrated `/cases` without replacing the Cases header, Register Case action, authorization, or real case table. The Cases table is the primary workspace content; supporting widgets show only actor-authorized, already-projected case information.
- Verified Administrator persistence and reset behavior plus a Department User's isolated role-default experience through the protected UI. Automated coverage includes service validation, authorization filtering, user isolation, repository upsert uniqueness, widget-grid interaction, and workspace save/reset behavior.
- `pnpm typecheck`, `pnpm lint`, 53 unit/component tests, 22 PostgreSQL integration tests, and `next build --webpack` pass.
- The graph/Cytoscape workspace phase has not started; Task 8 remains the next implementation phase.

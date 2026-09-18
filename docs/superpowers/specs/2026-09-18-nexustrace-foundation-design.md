# NexusTrace Foundation and First Vertical Slice Design

**Date:** 2026-09-18

**Status:** Approved architecture

## Goal

Build the first functional NexusTrace SIH vertical slice as a modular Next.js application backed exclusively by PostgreSQL. The slice must prove the real investigation data flow from authenticated access through cases, profiles, evidence, verified relationships, and graph exploration without disconnected mock screens.

## Product Boundary

This slice includes:

1. Database-backed login and secure sessions.
2. Administrator, Department User, and Investigator roles.
3. UI, server-action/API, service, repository, and query-level authorization.
4. Case/FIR creation and viewing.
5. Consolidated person investigation profiles.
6. Evidence metadata and safe development-mode file attachment.
7. Administrator creation of verified relationships supported by provenance.
8. A first-class graph domain and PostgreSQL persistence.
9. One-hop graph exploration with entity pivoting.
10. An external connection-details panel.
11. Synthetic demonstration data.
12. A shared professional dark design system.
13. Unit, integration, authorization, persistence, and browser-flow tests.

AI investigation, incident-window analysis, anomaly detection, cross-case intelligence, and the Investigation Copilot are deliberately deferred until this core data path is reliable.

## Architecture

NexusTrace is a modular full-stack monolith using Next.js App Router and TypeScript. React Server Components perform authorized reads, and server actions or route handlers accept validated mutations. Domain services implement business rules and depend on repository interfaces rather than Prisma directly.

PostgreSQL is the only database. Prisma supplies schema migrations and the concrete persistence implementation. The network graph is a domain projection over reusable entities and relationships stored in PostgreSQL; graph rendering does not own or embed relationship data.

The application is divided into clear boundaries:

- `src/app`: routing, protected layouts, server-rendered screens, and mutation entry points.
- `src/components`: reusable design-system primitives and the shared application shell.
- `src/features`: case, profile, evidence, and graph presentation components.
- `src/server/auth`: credential verification, session handling, and request identity.
- `src/server/authorization`: permission policies and department-scoping rules.
- `src/server/db`: Prisma client lifecycle and transaction helpers.
- `src/server/repositories`: scoped persistence implementations.
- `src/server/services`: use cases and domain orchestration.
- `src/server/graph`: graph contracts, traversal, path-ready projections, and Prisma adapters.
- `src/server/storage`: evidence storage interface and local development adapter.
- `src/domain`: framework-independent domain types, schemas, and errors.
- `prisma`: schema, migrations, and deterministic synthetic seed data.
- `tests`: unit, integration, and end-to-end coverage.

## Technology Choices

- Next.js App Router with strict TypeScript.
- React and Tailwind CSS for the application UI.
- PostgreSQL as the only persistence engine.
- Prisma for typed relational access and migrations.
- Auth.js-compatible session architecture with database-backed sessions and credential login for synthetic demo accounts. Passwords are stored only as strong hashes.
- Zod for server-boundary validation.
- Cytoscape.js for interactive graph rendering.
- Vitest for domain and service tests.
- React Testing Library for focused component behavior.
- Playwright for the critical browser flow.

Exact dependency versions are selected from current official documentation at scaffold time and committed through the package lockfile.

## Core Data Model

### Identity and authorization

- `User`: synthetic identity, password hash, role, active state, and department membership.
- `Department`: organizational boundary used for ownership and data scoping.
- `Session`: revocable database-backed authenticated session.

### Investigation records

- `Case`: FIR/case identifiers, department ownership, category, occurrence details, status, description, and investigating officer.
- `Person`: one canonical investigation profile with identity fields and aliases.
- `CasePerson`: typed participation linking a person to a case as suspect, victim, witness, complainant, or investigator.
- `Evidence`: source case, uploader, department, filename, media type, size, checksum, storage key, description, and verification state.

### First-class graph domain

- `GraphEntity`: stable node identity, entity type, display label, verification state, source department, and optional link to the canonical domain record.
- `GraphRelationship`: directed semantic edge, relationship type, strength, evidence confidence, verification state, interaction summary, temporal bounds, and creator/verifier metadata.
- `RelationshipEvidence`: many-to-many provenance linking a relationship to supporting evidence and its source case.
- `GraphSource`: a normalized source descriptor returned by graph queries so UI consumers never infer provenance from presentation data.

Enumerations are explicit and validated:

- Entity type: `PERSON`, `VEHICLE`, `PROPERTY`, `PHONE`, `DEVICE`, `BANK_ACCOUNT`, `ORGANIZATION`, `LOCATION`, `CASE`, `INCIDENT`.
- Relationship strength: `PRIMARY`, `SECONDARY`, `TERTIARY`.
- Evidence confidence: `VERIFIED`, `PROBABLE`, `UNVERIFIED`.
- Verification state: `PENDING`, `VERIFIED`, `REJECTED`, `CHANGES_REQUESTED`.

Relationships cannot become verified without a verifier, verification timestamp, and at least one provenance source. Investigators cannot create verified relationships directly.

## Graph Abstraction

The graph layer exposes repository interfaces independent of Prisma and Cytoscape:

- Load one entity by ID within the caller's authorization scope.
- Load a bounded neighborhood for a root entity, hop depth, relationship strengths, and verification filters.
- Load complete relationship details and provenance for an authorized edge.
- Create a proposed or verified relationship through role-aware domain services.
- Resolve an authorized connection path between two entities in later slices.

The PostgreSQL adapter satisfies these interfaces using relational queries and bounded breadth-first traversal. UI components receive graph view models containing nodes, edges, and provenance summaries; they never query Prisma or hard-code relationships.

A future graph database adapter can implement the same graph repository contracts without changing domain services, authorization, or presentation components.

## Authorization Model

Permissions are capability-based and checked at every protected boundary:

- Investigator: view authorized records, analyse, and submit suggestions.
- Department User: Investigator capabilities plus create department-owned cases, attach evidence, and submit contributions.
- Administrator: cross-department authorized access plus verify, edit, approve, reject, and create verified relationships.

Authorization is not inferred from hidden controls. Every protected page, server action, route handler, service mutation, repository query, and file operation receives an authenticated actor and enforces both role and department scope. Unauthorized access returns a typed denial without revealing record existence across departments.

## End-to-End Data Flow

1. A synthetic user authenticates and receives a revocable server-side session.
2. The protected shell resolves the actor and renders only permitted navigation and actions.
3. A Department User creates a department-owned case through validated server input.
4. The user associates an existing or newly created person with the case.
5. Evidence is validated, checksummed, stored through the storage adapter, and recorded with uploader, department, case, and provenance metadata.
6. An Administrator creates a verified relationship between authorized graph entities, selecting relationship strength, confidence, and supporting evidence.
7. The graph service loads the focus entity and verified one-hop neighborhood through the graph repository.
8. Cytoscape renders the returned projection with primary relationships visible by default.
9. Selecting a connected node changes the focus while preserving authorized filters.
10. Selecting an edge opens a side panel populated from the relationship-detail query and supporting records.

## Evidence Handling

The development adapter stores evidence outside public web assets under an ignored application-data directory. Uploads enforce an allowlist of demonstration-safe media types, maximum size, generated storage keys, normalized filenames, and SHA-256 checksums. Downloads pass through authenticated handlers so possession of a storage path does not grant access.

The storage interface supports a later object-storage implementation without changing evidence services. No evidence bytes are committed to Git; seed data uses metadata-only synthetic evidence or generated harmless fixtures.

## Interface Design

The visual system uses a near-black surface hierarchy, readable high-contrast typography, muted borders, restrained cool accents, and semantic verification/status colors. It avoids gradients, glass effects, gaming aesthetics, and decorative motion.

Shared primitives include:

- Application shell and navigation.
- Page headers and contextual action areas.
- Cards, tables, forms, dialogs, drawers, tabs, and filters.
- Verification, confidence, relationship-strength, role, and case-status badges.
- Skeleton loading, empty, denied, validation-error, and unexpected-error states.

The layout is desktop-first but maintains usable navigation, forms, tables, graph controls, and drawers on narrower screens. Controls are semantic, keyboard-accessible, visibly focused, and compatible with reduced-motion preferences.

The 21st plugin may supply grounded component references or deterministic review when available through Codex. Its absence must not block implementation.

## Error Handling and Auditability

Domain failures use typed errors for unauthenticated, forbidden, not found, validation, conflict, and storage failures. Entry points translate them into non-sensitive UI or HTTP responses. Server logs never include passwords, session tokens, or evidence contents.

Important mutations create `AuditEvent` records in the same database transaction as the business change. The initial slice records login outcomes, case creation, evidence attachment, relationship creation, and relationship verification with actor, department, action, target, timestamp, and safe structured metadata.

## Testing Strategy

Development follows red-green-refactor for domain behavior and authorization rules.

- Unit tests cover permission policies, validation, graph filters, one-hop traversal, relationship verification invariants, and storage-key safety.
- PostgreSQL integration tests cover repository scoping, transactions, persistence, and provenance joins.
- Component tests cover conditional actions, accessible forms, empty/error states, and connection-panel behavior.
- Playwright covers login, authorized case creation, profile access, evidence attachment, verified relationship creation, graph exploration, pivoting, and relationship details.
- Negative tests prove that an Investigator cannot create verified relationships, a Department User cannot read another department's restricted case, and unauthenticated requests cannot access protected records.

## Deployment

Local development uses PostgreSQL through Docker Compose and local evidence storage. The application reads secrets only from ignored environment files validated on startup. A production deployment uses the same PostgreSQL schema and replaces only the evidence storage adapter with durable object storage.

Preview deployment is deferred until the complete vertical slice passes local tests. No deployment credentials are required during foundation work.

## Delivery Sequence

1. Project configuration, environment validation, and test harness.
2. Prisma schema, migration, and deterministic seed data.
3. Authentication, sessions, permission policies, and protected shell.
4. Case/FIR creation and viewing through scoped repositories.
5. Person profiles and case participation.
6. Evidence attachment and authenticated retrieval.
7. Graph repository contracts, PostgreSQL adapter, and verification service.
8. Cytoscape one-hop exploration, pivoting, and relationship details.
9. Full vertical-slice E2E verification, accessibility review, Git diff review, checkpoint documentation, and commit.

## Completion Criteria

The slice is complete when all of the following are demonstrated from persisted PostgreSQL data:

- Each synthetic role can authenticate.
- Navigation and server operations reflect the role's permissions.
- A Department User can create and reopen a department-owned case.
- An authorized user can open a consolidated person profile associated with the case.
- Evidence can be attached and retrieved only by authorized users.
- An Administrator can create a verified, evidence-backed relationship.
- The relationship appears in the focused entity's one-hop network.
- Primary relationships are the default graph filter.
- A connected entity can become the new focus.
- The connection panel shows relationship attributes and provenance.
- Cross-department and role-escalation attempts are rejected server-side.
- Unit, integration, and E2E checks pass.
- No secrets, uploaded evidence, generated builds, or caches are included in Git.

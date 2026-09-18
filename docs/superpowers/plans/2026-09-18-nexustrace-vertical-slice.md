# NexusTrace First Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a database-backed NexusTrace workflow from authenticated login through role-scoped case/profile/evidence access to verified one-hop relationship exploration.

**Architecture:** Build a strict-TypeScript Next.js App Router modular monolith. PostgreSQL is the sole data store; Prisma repositories sit behind domain interfaces, including a first-class graph repository that can be replaced without changing services or UI. Protected server actions and route handlers resolve a database session, apply capability and department scope, validate input, and then call domain services.

**Tech Stack:** Node.js 22.12, pnpm, Next.js App Router, React, Tailwind CSS, PostgreSQL, Prisma 7, Zod, Argon2, Cytoscape.js, Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-18-nexustrace-foundation-design.md`

## Global Constraints

- PostgreSQL is the primary and only database for the initial SIH build.
- The graph is a first-class domain; UI code never hard-codes relationships or imports Prisma.
- Repository interfaces isolate graph services from PostgreSQL and Cytoscape.
- All records and identities are synthetic demonstration data.
- Authorization is enforced in the UI, mutation boundary, service layer, and scoped repository queries.
- AI analysis is outside this vertical slice.
- No `.env`, uploaded evidence, credentials, build products, test artifacts, or generated caches enter Git.
- Every production behavior follows red-green-refactor.
- Do not use Figma.

---

### Task 1: Project Configuration and Test Harness

**Files:**
- Create: `package.json`
- Create: `pnpm-lock.yaml` through `pnpm install`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `docker-compose.yml`
- Create: `README.md`
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Produces: scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:integration`, and `test:e2e`.
- Produces: import alias `@/*` mapped to `src/*`.
- Produces: validated environment names `DATABASE_URL`, `AUTH_SECRET`, `EVIDENCE_STORAGE_ROOT`.

- [x] **Step 1: Pin compatible dependencies**

Use current package metadata to pin a Next.js release compatible with Node 22.12 and Prisma 7 rather than Prisma 8, whose current documentation requires Node 24.

- [x] **Step 2: Create the generated/configuration scaffold**

Create strict TypeScript, Next.js, Tailwind, ESLint, Vitest, Testing Library, and Playwright configuration. Add `.next/`, `node_modules/`, `.env*` except `.env.example`, `coverage/`, `playwright-report/`, `test-results/`, and `.data/` to `.gitignore`.

- [x] **Step 3: Write the first component test**

```tsx
it("identifies NexusTrace as an investigation platform", () => {
  render(<HomePage />);
  expect(screen.getByRole("heading", { name: /NexusTrace/i })).toBeVisible();
});
```

- [x] **Step 4: Verify the test fails for the missing page export**

Run: `pnpm vitest run src/app/page.test.tsx`

Expected: FAIL because `HomePage` is not implemented.

- [x] **Step 5: Implement the minimal root page and design tokens**

Export `HomePage`, render the product name and a link to `/login`, and define semantic CSS variables for background, surfaces, borders, text, accent, success, warning, and danger.

- [x] **Step 6: Verify the foundation**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build`

Expected: all commands exit 0.

Verified on 2026-09-18 with ESLint 9.39.5 and the full Next.js React rule set enabled. `lint`, `typecheck`, and unit tests pass through the project scripts. The sandbox prevents Turbopack's CSS worker from binding its internal port, so the unchanged application was production-built successfully with the supported one-off `next build --webpack` fallback; no runtime or architecture setting was changed.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs vitest.config.ts playwright.config.ts src .gitignore .env.example docker-compose.yml README.md
git commit -m "chore: scaffold NexusTrace application"
```

### Task 2: PostgreSQL Schema and Synthetic Seed

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma.config.ts`
- Create: `prisma/seed.ts`
- Create: `src/server/db/client.ts`
- Create: `src/server/env.ts`
- Create: `src/domain/model.ts`
- Create: `tests/integration/database.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: Prisma models `Department`, `User`, `Session`, `Case`, `Person`, `CasePerson`, `Evidence`, `GraphEntity`, `GraphRelationship`, `RelationshipEvidence`, and `AuditEvent`.
- Produces: `prisma` singleton and `seedSyntheticDemoData()`.
- Produces: enums for roles, case participation, case status, graph entity type, relationship strength, evidence confidence, and verification state.

- [ ] **Step 1: Write a failing persistence test**

```ts
it("persists a case-person relationship and graph entities in PostgreSQL", async () => {
  const caseRecord = await prisma.case.findUnique({
    where: { firNumber: "FIR-108" },
    include: { people: true },
  });
  expect(caseRecord?.people.length).toBeGreaterThan(0);
  expect(await prisma.graphEntity.count()).toBeGreaterThan(1);
});
```

- [ ] **Step 2: Verify the database test fails**

Run: `pnpm vitest run --config vitest.config.ts tests/integration/database.test.ts`

Expected: FAIL because the Prisma client and schema do not exist.

- [ ] **Step 3: Define the normalized schema**

Use UUID identifiers, indexed foreign keys, unique FIR/case identifiers, explicit enums, created/updated timestamps, and provenance joins. Enforce relationship verifier/timestamp/source invariants in the service because they span optional fields and relation counts.

- [ ] **Step 4: Add deterministic synthetic data**

Seed three departments, one user per role, two cases, at least four people, evidence metadata, graph entities, and evidence-backed relationships. Hash the documented demo passwords with Argon2; never seed plaintext password fields.

- [ ] **Step 5: Apply the migration and seed**

Run: `pnpm prisma migrate dev --name init && pnpm prisma db seed`

Expected: migration succeeds and the seed reports deterministic upserts.

- [ ] **Step 6: Verify persistence**

Run: `pnpm vitest run tests/integration/database.test.ts`

Expected: PASS against PostgreSQL.

- [ ] **Step 7: Commit**

```bash
git add prisma prisma.config.ts src/server/db src/server/env.ts src/domain/model.ts tests/integration package.json pnpm-lock.yaml
git commit -m "feat: add PostgreSQL investigation data model"
```

### Task 3: Authentication, Sessions, RBAC, and Protected Shell

**Files:**
- Create: `src/domain/auth.ts`
- Create: `src/server/auth/password.ts`
- Create: `src/server/auth/session.ts`
- Create: `src/server/authorization/policy.ts`
- Create: `src/server/repositories/session-repository.ts`
- Create: `src/server/repositories/prisma-session-repository.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/actions.ts`
- Create: `src/app/(protected)/layout.tsx`
- Create: `src/components/shell/app-shell.tsx`
- Create: `src/components/ui/status-badge.tsx`
- Create: `src/components/ui/empty-state.tsx`
- Create: `src/components/ui/error-state.tsx`
- Create: `src/components/ui/loading-state.tsx`
- Test: `src/server/authorization/policy.test.ts`
- Test: `src/server/auth/session.test.ts`
- Test: `src/app/login/login-form.test.tsx`

**Interfaces:**
- Produces: `Actor`, `Capability`, `can(actor, capability)`, `assertCan(actor, capability)`, `createSession(userId)`, `getCurrentActor()`, and `destroyCurrentSession()`.
- Produces: capabilities `CASE_VIEW`, `CASE_CREATE`, `EVIDENCE_ATTACH`, `RELATIONSHIP_SUGGEST`, `RELATIONSHIP_VERIFY`, and `ADMINISTER`.

- [ ] **Step 1: Write failing policy tests**

```ts
it("prevents investigators from creating verified relationships", () => {
  expect(can(investigatorActor, "RELATIONSHIP_VERIFY")).toBe(false);
});

it("allows department users to create cases only for their department", () => {
  expect(can(departmentActor, "CASE_CREATE")).toBe(true);
  expect(canAccessDepartment(departmentActor, departmentActor.departmentId)).toBe(true);
  expect(canAccessDepartment(departmentActor, "another-department")).toBe(false);
});
```

- [ ] **Step 2: Verify the policy tests fail**

Run: `pnpm vitest run src/server/authorization/policy.test.ts`

Expected: FAIL because the policy API is missing.

- [ ] **Step 3: Implement policy and session services**

Store only a random session-token hash in PostgreSQL, place the opaque token in an `HttpOnly`, `Secure` in production, `SameSite=Lax` cookie, rotate it on login, and enforce expiry and active-user checks on every actor resolution.

- [ ] **Step 4: Implement login and protected shell**

Validate credentials server-side, use a generic invalid-credentials response, record safe audit metadata, redirect authenticated users to `/cases`, and render navigation actions from capabilities.

- [ ] **Step 5: Verify authentication and authorization**

Run: `pnpm vitest run src/server/auth src/server/authorization src/app/login`

Expected: PASS, including expired-session and role-denial cases.

- [ ] **Step 6: Commit**

```bash
git add src/domain/auth.ts src/server/auth src/server/authorization src/server/repositories src/app/login 'src/app/(protected)' src/components
git commit -m "feat: add secure sessions and role authorization"
```

### Task 4: Case and FIR Workflow

**Files:**
- Create: `src/domain/case.ts`
- Create: `src/server/repositories/case-repository.ts`
- Create: `src/server/repositories/prisma-case-repository.ts`
- Create: `src/server/services/case-service.ts`
- Create: `src/app/(protected)/cases/page.tsx`
- Create: `src/app/(protected)/cases/new/page.tsx`
- Create: `src/app/(protected)/cases/actions.ts`
- Create: `src/app/(protected)/cases/[caseId]/page.tsx`
- Create: `src/features/cases/case-form.tsx`
- Create: `src/features/cases/case-table.tsx`
- Create: `src/features/cases/case-overview.tsx`
- Test: `src/server/services/case-service.test.ts`
- Test: `tests/integration/case-repository.test.ts`

**Interfaces:**
- Produces: `CaseRepository.listForActor`, `CaseRepository.findForActor`, `CaseRepository.create`, `createCase(actor, input)`, and `getCase(actor, caseId)`.

- [ ] **Step 1: Write failing scoped-access tests**

```ts
it("does not reveal a restricted case from another department", async () => {
  await expect(service.getCase(departmentActor, otherDepartmentCaseId))
    .rejects.toMatchObject({ code: "NOT_FOUND" });
});
```

- [ ] **Step 2: Verify the tests fail**

Run: `pnpm vitest run src/server/services/case-service.test.ts tests/integration/case-repository.test.ts`

- [ ] **Step 3: Implement scoped repositories and transactional creation**

Create the case and its CASE graph entity in one PostgreSQL transaction, write an audit event, and reject FIR/case-number conflicts without leaking other-department records.

- [ ] **Step 4: Implement accessible list, form, and detail UI**

Use server-rendered queries, labels and field errors, role-aware create actions, table empty state, and route-level loading/error boundaries.

- [ ] **Step 5: Verify case behavior**

Run: `pnpm vitest run src/server/services/case-service.test.ts tests/integration/case-repository.test.ts && pnpm lint && pnpm typecheck`

- [ ] **Step 6: Commit**

```bash
git add src/domain/case.ts src/server/repositories src/server/services/case-service.ts 'src/app/(protected)/cases' src/features/cases tests/integration/case-repository.test.ts
git commit -m "feat: implement authorized FIR workflow"
```

### Task 5: Consolidated Person Profiles

**Files:**
- Create: `src/domain/person.ts`
- Create: `src/server/repositories/person-repository.ts`
- Create: `src/server/repositories/prisma-person-repository.ts`
- Create: `src/server/services/person-service.ts`
- Create: `src/app/(protected)/people/[personId]/page.tsx`
- Create: `src/features/people/profile-header.tsx`
- Create: `src/features/people/profile-tabs.tsx`
- Create: `src/features/people/profile-cases.tsx`
- Create: `src/features/people/profile-relationships.tsx`
- Test: `src/server/services/person-service.test.ts`
- Test: `src/features/people/profile-tabs.test.tsx`

**Interfaces:**
- Produces: `PersonRepository.findProfileForActor` and `getPersonProfile(actor, personId)` returning identity, aliases, authorized case roles, evidence summaries, and graph focus ID.

- [ ] **Step 1: Write failing profile authorization and tab tests**

Assert that unauthorized cases are omitted and the Identity, Cases, Associates, Communications, Financial Activity, Assets, Locations, Evidence, and Relationships tabs remain keyboard-operable.

- [ ] **Step 2: Verify tests fail**

Run: `pnpm vitest run src/server/services/person-service.test.ts src/features/people/profile-tabs.test.tsx`

- [ ] **Step 3: Implement profile projection and tabbed UI**

Load a single shared person record, join only actor-visible records, and render explicit empty states for future-domain tabs rather than invented metrics.

- [ ] **Step 4: Verify profile behavior**

Run: `pnpm vitest run src/server/services/person-service.test.ts src/features/people/profile-tabs.test.tsx && pnpm typecheck`

- [ ] **Step 5: Commit**

```bash
git add src/domain/person.ts src/server/repositories src/server/services/person-service.ts 'src/app/(protected)/people' src/features/people
git commit -m "feat: add consolidated investigation profiles"
```

### Task 6: Evidence Attachment and Authenticated Retrieval

**Files:**
- Create: `src/domain/evidence.ts`
- Create: `src/server/storage/evidence-storage.ts`
- Create: `src/server/storage/local-evidence-storage.ts`
- Create: `src/server/repositories/evidence-repository.ts`
- Create: `src/server/repositories/prisma-evidence-repository.ts`
- Create: `src/server/services/evidence-service.ts`
- Create: `src/app/(protected)/cases/[caseId]/evidence/actions.ts`
- Create: `src/app/api/evidence/[evidenceId]/route.ts`
- Create: `src/features/evidence/evidence-upload-form.tsx`
- Create: `src/features/evidence/evidence-list.tsx`
- Test: `src/server/services/evidence-service.test.ts`
- Test: `src/server/storage/local-evidence-storage.test.ts`
- Test: `tests/integration/evidence-repository.test.ts`

**Interfaces:**
- Produces: `EvidenceStorage.put`, `EvidenceStorage.open`, `attachEvidence(actor, caseId, file, input)`, and `openEvidence(actor, evidenceId)`.

- [ ] **Step 1: Write failing file-safety and authorization tests**

Cover filename normalization, allowlisted MIME types, size rejection, generated storage keys, checksum calculation, department denial, and authenticated retrieval.

- [ ] **Step 2: Verify tests fail**

Run: `pnpm vitest run src/server/services/evidence-service.test.ts src/server/storage/local-evidence-storage.test.ts`

- [ ] **Step 3: Implement storage and transactional evidence metadata**

Write files under `.data/evidence`, never use the supplied filename as a path, record metadata and an audit event transactionally, and delete the stored file if metadata persistence fails.

- [ ] **Step 4: Implement upload and retrieval UI**

Render the upload action only with `EVIDENCE_ATTACH`, but independently enforce it in the action and service. Stream downloads through the authenticated route with safe content headers.

- [ ] **Step 5: Verify evidence behavior**

Run: `pnpm vitest run src/server/services/evidence-service.test.ts src/server/storage/local-evidence-storage.test.ts tests/integration/evidence-repository.test.ts`

- [ ] **Step 6: Commit**

```bash
git add src/domain/evidence.ts src/server/storage src/server/repositories src/server/services/evidence-service.ts 'src/app/(protected)/cases' src/app/api/evidence src/features/evidence tests/integration/evidence-repository.test.ts
git commit -m "feat: add protected evidence provenance workflow"
```

### Task 7: Graph Domain, Repository, Traversal, and Verification

**Files:**
- Create: `src/domain/graph.ts`
- Create: `src/server/graph/graph-repository.ts`
- Create: `src/server/graph/prisma-graph-repository.ts`
- Create: `src/server/graph/breadth-first-traversal.ts`
- Create: `src/server/services/relationship-service.ts`
- Create: `src/server/services/graph-service.ts`
- Create: `src/app/(protected)/relationships/actions.ts`
- Test: `src/server/graph/breadth-first-traversal.test.ts`
- Test: `src/server/services/relationship-service.test.ts`
- Test: `tests/integration/graph-repository.test.ts`

**Interfaces:**
- Produces: `GraphNode`, `GraphEdge`, `GraphSource`, `GraphNeighborhood`, `RelationshipDetail`, and `GraphRepository`.
- Produces: `getNeighborhood(actor, rootId, { hops, strengths, verificationStates })` and `getRelationshipDetail(actor, relationshipId)`.
- Produces: `createVerifiedRelationship(actor, input)` requiring Administrator capability and at least one authorized evidence source.

- [ ] **Step 1: Write failing graph-contract tests**

```ts
it("returns only verified primary one-hop edges by default", async () => {
  const graph = await service.getNeighborhood(actor, rootId, {
    hops: 1,
    strengths: ["PRIMARY"],
    verificationStates: ["VERIFIED"],
  });
  expect(graph.edges.every((edge) => edge.strength === "PRIMARY")).toBe(true);
  expect(graph.edges.every((edge) => edge.verificationState === "VERIFIED")).toBe(true);
});
```

Also prove that unauthorized nodes cannot be inferred through edge results and that relationship verification fails without evidence, verifier identity, or verification timestamp.

- [ ] **Step 2: Verify tests fail**

Run: `pnpm vitest run src/server/graph src/server/services/relationship-service.test.ts tests/integration/graph-repository.test.ts`

- [ ] **Step 3: Implement the repository contract and PostgreSQL adapter**

Load authorized edges in bounded layers, deduplicate nodes and edges, stop at the requested depth, preserve source summaries, and cap the result size. Keep Prisma types inside the adapter.

- [ ] **Step 4: Implement verified relationship creation**

Validate graph entity visibility, evidence visibility, strength/confidence separation, provenance, and Administrator permission; persist relationship, evidence joins, and audit event in one transaction.

- [ ] **Step 5: Verify graph behavior**

Run: `pnpm vitest run src/server/graph src/server/services/relationship-service.test.ts tests/integration/graph-repository.test.ts`

- [ ] **Step 6: Commit**

```bash
git add src/domain/graph.ts src/server/graph src/server/services/relationship-service.ts src/server/services/graph-service.ts 'src/app/(protected)/relationships' tests/integration/graph-repository.test.ts
git commit -m "feat: add evidence-backed graph domain"
```

### Task 8: One-Hop Graph UI, Pivoting, and Relationship Details

**Files:**
- Create: `src/app/(protected)/network/page.tsx`
- Create: `src/app/(protected)/network/loading.tsx`
- Create: `src/app/(protected)/network/error.tsx`
- Create: `src/features/graph/network-explorer.tsx`
- Create: `src/features/graph/network-canvas.tsx`
- Create: `src/features/graph/network-controls.tsx`
- Create: `src/features/graph/connection-panel.tsx`
- Create: `src/features/graph/graph-legend.tsx`
- Test: `src/features/graph/network-explorer.test.tsx`
- Test: `src/features/graph/connection-panel.test.tsx`

**Interfaces:**
- Consumes: serialized `GraphNeighborhood` and `RelationshipDetail` only.
- Produces: URL-addressable focus `?focus=<graphEntityId>` and strength filters, with `PRIMARY` enabled by default.

- [ ] **Step 1: Write failing interaction tests**

Assert that primary is enabled by default, selecting a connected node requests that node as the new focus, selecting an edge opens the details panel, and Escape closes the panel and returns focus to the invoking control.

- [ ] **Step 2: Verify tests fail**

Run: `pnpm vitest run src/features/graph`

- [ ] **Step 3: Implement the graph presentation**

Map domain nodes and edges into Cytoscape elements in one adapter component, use restrained entity colors and strength-specific edge styles, keep labels readable, and render details outside the canvas. Provide a semantic relationship list fallback for keyboard and narrow-screen access.

- [ ] **Step 4: Run UI quality checks**

Run: `pnpm vitest run src/features/graph && pnpm lint && pnpm typecheck && pnpm build`

If the 21st CLI is available through the package runner, run `pnpm dlx @21st-dev/cli review src/features/graph --json`; otherwise record its unavailability and perform the same deterministic accessibility/responsive checklist manually.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(protected)/network' src/features/graph package.json pnpm-lock.yaml
git commit -m "feat: add focused one-hop network explorer"
```

### Task 9: Full Vertical-Slice Verification and Checkpoint

**Files:**
- Create: `tests/e2e/auth-rbac.spec.ts`
- Create: `tests/e2e/investigation-flow.spec.ts`
- Create: `tests/e2e/graph-exploration.spec.ts`
- Create: `docs/checkpoints/2026-09-18-first-vertical-slice.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: the completed application and deterministic seed accounts.
- Produces: repeatable setup and verification commands documented in `README.md`.

- [ ] **Step 1: Write failing browser-flow tests**

Cover login, role-visible actions, department-scoped case creation, case reopening, person profile access, evidence attachment/retrieval, Administrator relationship creation, one-hop graph rendering, node pivoting, and relationship provenance details.

- [ ] **Step 2: Add explicit negative E2E tests**

Prove unauthenticated redirect, Investigator mutation denial, Department User cross-department record denial, and Department User verified-relationship denial.

- [ ] **Step 3: Verify the E2E tests fail before the final wiring**

Run: `pnpm test:e2e`

Expected: FAIL on at least one missing integration point rather than test configuration.

- [ ] **Step 4: Complete only the missing integration wiring**

Connect the already-tested route entry points, forms, services, and redirects required by the browser flow without introducing new domain behavior.

- [ ] **Step 5: Run the complete verification suite**

Run: `pnpm test && pnpm test:integration && pnpm lint && pnpm typecheck && pnpm build && pnpm test:e2e`

Expected: all commands exit 0 with no failing tests.

- [ ] **Step 6: Verify repository hygiene and diff**

Run: `git status --short && git diff --check && git ls-files | rg '(^|/)(\.env|\.data|node_modules|\.next|playwright-report|test-results)(/|$)'`

Expected: only intentional source/docs changes are present; the tracked-artifact search returns no matches.

- [ ] **Step 7: Record the checkpoint**

Document completed capabilities, test commands and counts, demo credentials marked synthetic, known limitations, 21st availability, and the next phase: incidents/timeline followed by deterministic incident-window analysis.

- [ ] **Step 8: Commit**

```bash
git add tests/e2e docs/checkpoints README.md
git commit -m "test: verify NexusTrace vertical slice"
```

## Plan Self-Review

- The plan covers every completion criterion in the approved foundation design.
- PostgreSQL remains the only database.
- Graph persistence and traversal are accessed through framework-independent contracts.
- AI features remain outside this slice.
- Each behavioral task begins with a failing test and ends with focused and regression verification.
- No task depends on Figma, external credentials, or a hosted service.

# PRD: End-to-end browser test harness for the multi-signer journey

## 1. Context

### Problem
Lunar Sign currently has only a thin Playwright suite (`e2e/public-flows.spec.ts`)
that exercises two unauthenticated endpoints. We have **no executable check**
that the core business workflow — *creator builds a template → drafts a
document → invites two signers → both sign → document is finalized* — works
end‑to‑end. Regressions in any of these steps reach `main` undetected and only
surface as bug reports.

### Why now
- The signing flow has been hardened through several recent migrations
  (signer field assignment, signer index backfill, legal defensibility,
  cancellation flows). The contract is now stable enough to lock in with a
  durable harness.
- Multi-signer ordering, field assignment, and notification fan-out are easy
  to break and impossible to validate with unit tests alone.
- We want the freedom to refactor UI components (Shadcn/Tailwind churn)
  without fearing silent breakage of the journey.

### Assumptions
- Stack stays Next.js 16 App Router + Supabase (Postgres + Auth + Storage) +
  nodemailer (Mailtrap) + `@drvillo/react-browser-e-signing` + OpenTimestamps.
- Playwright stays the e2e tool of choice (already wired up in
  `playwright.config.ts`).
- A local Supabase instance can be started via `supabase start` on developer
  machines and CI runners. (`supabase/migrations/` already exists.)
- Adding a small (≤ 50 KB) PDF fixture to the repo is acceptable.
- The harness runs in Chromium only.

---

## 2. Goals

### Goals
- Validate the **happy path** of the multi-signer journey end-to-end through
  a real browser, including DB state transitions, UI state transitions, and
  outbound side‑effects (email + OpenTimestamps).
- Make the harness **robust to UI styling changes**: zero coupling to CSS,
  Tailwind classes, DOM hierarchy, or component internals — only role/label/
  testid selectors and observable user-visible text.
- Make the harness **deterministic and hermetic**: no real Google OAuth, no
  real SMTP, no real OpenTimestamps calendar calls, no shared cloud DB.
- Provide rich **failure forensics**: when a test fails, dump a chronological
  text-based audit of every action and the DB state changes that preceded
  the failure.
- Land a **separate, edge-case-focused suite** for the real signature canvas
  rendering / drawing path so the journey suite can stay fast and stable.
- Be **runnable with a single command** that's part of `pnpm test:e2e`.

### Non-goals
- Visual regression / snapshot tests of UI components.
- Accessibility audits.
- Multi-company / RBAC / permissions matrix testing.
- Cross-browser matrix (Firefox, WebKit) — Chromium only.
- Performance / load testing.
- Real third-party integration testing (real Google, real SMTP, real OTS).
- Replacing the existing `e2e/public-flows.spec.ts` (it stays as a smoke
  layer).

---

## 3. Users & use cases

### Personas
- **Creator (C)** — internal user with a Supabase account, builds templates
  and dispatches documents.
- **Signer S1, S2** — external users, signed-in via signed link tokens (no
  account required), sign in any order.
- **Engineer on-call** — reads the test failure report to triage breakage.

### Jobs-to-be-done
- As an engineer, I want a single `pnpm test:e2e` command that exercises the
  whole multi-signer journey and exits non-zero on any deviation, so I can
  block PRs that break the contract.
- As an engineer debugging a failure, I want a per-test artifact bundle
  (Playwright trace + screenshots + DB-state audit log) so I can reproduce
  the failure without re-running.

---

## 4. Functional requirements

Numbering: **MUST** = blocking, **SHOULD** = strong, **COULD** = nice-to-have.

### 4.1 Test environment & isolation
1. **MUST** start a dedicated local Supabase instance via `supabase start`
   before the suite begins (orchestrated by Playwright `globalSetup` or a
   wrapper script). Migrations must be applied before tests run.
2. **MUST** reset DB state between *every test* (truncate domain tables and
   purge storage buckets, OR use `supabase db reset` between worker runs).
   No test may depend on side effects of another test.
3. **MUST** read all credentials from a dedicated `.env.e2e` (committed
   sample at `.env.e2e.example`, gitignored real values).
4. **MUST** fail fast (clear actionable error) when Supabase is not running
   locally, instead of hanging or producing misleading failures.

### 4.2 Auth stubbing
5. **MUST** bypass real Google OAuth. Creator users are pre-created via the
   Supabase admin API (`auth.admin.createUser`) and a session is injected
   into a `BrowserContext` via `storageState` (cookies + localStorage from a
   programmatic sign-in).
6. **MUST** expose a typed helper `createCreatorContext({ email })` that
   returns a `BrowserContext` already authenticated as a fresh creator.
7. **MUST NOT** call `accounts.google.com` or any Google endpoint during the
   suite. A network guard (Playwright route handler) **SHOULD** block any
   request to non-allowlisted hosts and fail the test with a descriptive
   message.

### 4.3 Email stubbing
8. **MUST** stub `lib/email/client.ts` so no SMTP connection is opened.
   Strategy: at runtime, when `E2E_TEST_MODE=true`, the email module
   appends every `sendEmail(...)` call as a single JSON line to a
   plain text file at `test-results/e2e-inbox.log` (JSON-lines format,
   one email per line: `{ id, to, subject, html, sentAt }`).
   The file is created on first write and truncated by `globalSetup`
   before each suite run.
9. **MUST** provide a Playwright fixture `inbox` (TypeScript helper
   that reads the file directly from the test process — no API route
   needed) with helpers:
   `inbox.waitFor({ to, subjectMatches, timeoutMs })`,
   `inbox.list({ to })`,
   `inbox.clear()`.
   Polling reads the file with bounded backoff until the predicate
   matches or the timeout expires.
10. **MUST NOT** add any database table, migration, or HTTP route for
    email capture. Zero production-code surface area.

### 4.4 OpenTimestamps stubbing
11. **MUST** stub the OpenTimestamps module (`lib/esigning/timestamps.ts`)
    when `E2E_TEST_MODE=true` so that **no HTTP request to a calendar
    server is issued**. The stub appends every invocation
    (`{ fnName, args, calledAt }`) as a JSON line to
    `test-results/e2e-ots.log`. The test process reads the file
    directly via an `ots` Playwright fixture. Truncated by
    `globalSetup` before each suite run. No DB table, no HTTP route.
12. **MUST** assert in the journey test that `stampHash` was called
    **exactly once per finalized signed PDF**, with the SHA-256 of the
    document, **after** all signers have signed (timing assertion via the
    stub's recorded timestamp).
13. **SHOULD** assert the stub was called with the same hash that's stored
    in the corresponding `signature_evidence`/document row.

### 4.5 Signature capture stubbing
14. **MUST**, in the journey suite, stub the in-browser signature capture
    so a deterministic PNG payload is submitted without requiring real
    pointer gestures. Strategy: when `NEXT_PUBLIC_E2E_TEST_MODE=true`, the
    sign page renders a hidden test affordance (e.g. a `data-testid=
    "e2e-submit-signature"` button) that injects a canned signature
    payload into the same code path the real component uses.
15. **MUST NOT** ship the test affordance to production. The flag is read
    at build/runtime; the component renders nothing when the flag is
    falsy.
16. **MUST** keep a *separate* suite (`e2e/signature-canvas/`) that drives
    the real signature canvas via `page.mouse.move/down/up` and covers
    edge cases (see § 4.10).

### 4.6 Test PDF fixture
17. **MUST** commit a small (≤ 50 KB), real, multi-page PDF at
    `e2e/fixtures/sample.pdf` with at least 1 page rendered correctly so
    the field-placement UI works against a real document, not a stub
    bytestring.

### 4.7 Test data lifecycle
18. **MUST** assign every test a unique `e2e_run_id` (UUID per test) and
    derive randomized emails (`s1+<uuid>@e2e.lunarsign.local`) so parallel
    runs cannot collide even if cleanup misbehaves.
19. **MUST** clean up created storage objects after each test (best-effort
    delete in a Playwright `afterEach`).

### 4.8 The journey test (the canonical scenario)
The single canonical test file `e2e/journeys/multi-signer.spec.ts` MUST
implement the following scenario with the assertions enumerated in § 4.9:

> **Actors:** Creator C (authenticated), Signer S1 (link), Signer S2 (link).
>
> 1. C creates a **template** based on `sample.pdf`.
>    - 1.1 C adds **one text field assigned to C** (label "Company") and
>      **two signature fields**, one assigned to S1 and one to S2.
> 2. C creates a **document from the template** and invites S1 + S2 using
>    randomly generated emails.
>    - 2.1 C fills in the text field value on the draft.
> 3. S1 and S2 each open their signing link in **separate
>    `BrowserContext`s** and sign **sequentially** (S1 first, then S2),
>    asserting state in between.
> 4. The system finalizes the document and the test asserts the
>    post-conditions.

### 4.9 Per-step assertions

For each numbered step the test MUST assert all of the following.
*UI assertions use role/label/testid selectors only.*

#### Step 1 — Template creation
- 1.a (UI) Creator lands on the templates list and sees the new template
  by **title text**.
- 1.b (DB) `templates` row exists with `created_by = C.id`,
  `field_metadata` length = 3.
- 1.c (DB) Of the 3 fields: 1 is `type='text'` `forSigner=false`, 2 are
  `type='signature'` `forSigner=true`, with distinct `signerIndex` (or
  equivalent assignment column) values pointing to S1 and S2.
- 1.d (UI) Field palette and field‑placement controls are present and
  reachable by accessible name (resilient to styling).

#### Step 2 — Document creation from template + invite
- 2.a (UI) "Create document from template" affordance is reachable by
  role/name; after submission the creator lands on the draft.
- 2.b (DB) `documents` row exists with `status='pending'` (or equivalent
  pre-send state), `template_id` pointing at the template from step 1,
  `uploaded_by = C.id`, and `field_metadata` copied from the template.
- 2.c (UI) After C fills the text field with a value (e.g. `"Acme Corp"`)
  and saves, the draft view shows that value.
- 2.d (DB) The text field's `value` is persisted on the document's
  `field_metadata`.
- 2.e (UI) After C invites S1 and S2 with the random emails, the document
  detail view lists both invitees by email.
- 2.f (DB) Two `signature_requests` rows exist for the document with
  `status='pending'`, distinct tokens, distinct `signer_email`s matching
  the random addresses, and `requested_by = C.id`.
- 2.g (Email) Two emails captured in the inbox addressed to S1 and S2,
  each containing a signing URL whose token matches the corresponding
  `signature_requests.token`.

#### Step 3 — S1 signs
- 3.a (UI) S1 opens `/sign/<token>` in their own `BrowserContext` and the
  page renders the document title and S1's assigned signature field.
- 3.b (UI) The text field set by C is rendered as **read-only** (S1
  cannot edit it).
- 3.c (UI) S1 invokes the e2e-only "submit signature" affordance; on
  success the page shows a "thank you / you're done" type confirmation
  identifiable by **role and accessible name**.
- 3.d (DB) S1's `signature_requests` row transitions to `status='signed'`,
  `signed_at` is set, `signature_evidence` (or equivalent) row is created
  with a non-empty payload.
- 3.e (DB) Document status remains "in progress" (not yet completed —
  S2 hasn't signed).
- 3.f (DB) S2's `signature_requests` row is still `status='pending'`.
- 3.g (OTS stub) `stampHash` has **NOT** yet been called.

#### Step 4 — S2 signs (and finalization)
- 4.a Same UI assertions as 3.a–3.c, in S2's `BrowserContext`.
- 4.b (DB) S2's `signature_requests` row transitions to
  `status='signed'`.
- 4.c (DB) `documents` row transitions to `status='completed'` with
  `completed_at` set and `latest_signed_pdf_path` populated.
- 4.d (Storage) The signed PDF blob exists at
  `latest_signed_pdf_path` in the `signed-documents` bucket and is a
  valid PDF (header `%PDF`).
- 4.e (Email) Three completion emails captured in the inbox: one to C,
  one to S1, one to S2 (subjects matched by regex; specific copy is not
  asserted to keep the test resilient to copy changes).
- 4.f (OTS stub) `stampHash` was called **exactly once**, **after** the
  recorded timestamp of S2's `signed_at`, with the SHA-256 of the
  finalized PDF bytes.
- 4.g (UI) When C reloads the document detail page, it shows a
  "completed" indicator (asserted by accessible name / aria-label, not
  by colour or icon class) and the document field rendering shows the
  text value plus both signatures.

### 4.10 Separate signature-canvas suite
20. **MUST** create `e2e/signature-canvas/canvas.spec.ts` that drives the
    real `@drvillo/react-browser-e-signing` canvas via `page.mouse` and
    covers at minimum:
    - drawing a non-trivial path produces a non-empty data URL submission
    - clearing the canvas resets state
    - submitting an empty canvas is blocked at the UI level
    - re-drawing after clear works
21. This suite **MUST NOT** be a precondition for the journey suite to
    pass; it exists to catch regressions in the real signature capture
    component independently.

### 4.11 Failure forensics
22. **MUST** maintain, per test, an in-memory ordered log of:
    - every Playwright user action (high-level: navigation, click,
      `fill`, `goto`, `inbox.waitFor`, etc.)
    - every DB write observed via the test's helper layer (insert /
      update / delete intent + table + row id)
    - every captured email
    - every OTS stub invocation
23. **MUST**, on any test failure, write the log to disk at
    `test-results/<test-name>/audit.txt` (plain text, one event per line,
    ISO timestamps). The Playwright trace and screenshots remain
    enabled separately.
24. **SHOULD**, on failure, also dump a snapshot of relevant DB rows
    (the document, its signature_requests, its signature_evidence rows)
    to `test-results/<test-name>/db-snapshot.json`.

### 4.12 Runner & dev ergonomics
25. **MUST** add a single command: `pnpm test:e2e` runs **both** the
    journey suite and the existing public-flows suite. The signature-
    canvas suite is included by default but **MAY** be skipped via
    `pnpm test:e2e --grep-invert canvas` for faster iteration.
26. **MUST** keep `pnpm test:e2e` green on a clean checkout, given:
    Node + pnpm + a running local Supabase (`supabase start`). Anything
    else missing should produce an actionable error.
27. **SHOULD** print a one-line summary at the end of the suite:
    `<n> tests passed, journey duration <m>s, captured <k> emails`.

### 4.13 Resilient selectors (cross-cutting)
28. **MUST** select UI elements only via:
    - `page.getByRole(role, { name })`
    - `page.getByLabel(label)`
    - `page.getByText(text)` for content-driven assertions
    - `page.getByTestId(testId)` for unambiguous hooks
29. **MUST NOT** use Tailwind class selectors, deep CSS paths, or
    structural XPath. Lint rule (eslint plugin or simple regex check in
    CI) **SHOULD** enforce this.
30. **MUST** add `data-testid` attributes to ambiguous controls
    encountered during implementation, in the production code, with
    stable names (e.g. `data-testid="template-create-button"`).

---

## 5. User experience

### Key flows
- Engineer runs `pnpm test:e2e`. Playwright spins up Next.js, applies
  migrations, runs the journey, prints results.
- On failure, the engineer opens `test-results/<test>/audit.txt` and
  `test-results/<test>/trace.zip` to debug.

### Edge cases (the harness MUST handle)
- Local Supabase not running → fail fast with a clear message linking to
  setup docs.
- A previous run left orphan rows → `globalSetup` truncates / resets.
- Random email collisions across parallel workers → use UUID-suffixed
  emails per test.
- A test's afterEach runs after a hard failure → cleanup is `best-effort`
  and does not mask the original error.

### Error states
- Stub layer not loaded (e.g. `E2E_TEST_MODE` unset) → tests refuse to
  start with a clear message, not a hang.
- OTS stub not invoked when expected → assertion failure with the
  recorded log dumped to the audit file.

### Accessibility notes
- Out of scope; we only consume accessible names because that's the
  most resilient selector strategy.

---

## 6. Technical considerations

### Proposed approach (high level)
- New folder layout under `e2e/`:
  ```
  e2e/
    public-flows.spec.ts         (existing, untouched)
    seed.ts                      (existing globalSetup, refactored)
    journeys/
      multi-signer.spec.ts       (the canonical test)
    signature-canvas/
      canvas.spec.ts             (real-canvas edge cases)
    fixtures/
      sample.pdf                 (committed)
      users.ts                   (createCreator helper)
    helpers/
      auth.ts                    (programmatic Supabase auth + storageState)
      db.ts                      (typed Supabase admin client + truncation)
      inbox.ts                   (reads test-results/e2e-inbox.log)
      ots.ts                     (reads test-results/e2e-ots.log)
      audit.ts                   (per-test audit log writer)
      selectors.ts               (high-level page objects: TemplateBuilder,
                                  DocumentDraft, SignPage)
    .auth/                       (gitignored — storageState files if cached)
  ```
- A Playwright **`test.extend`** custom test type provides typed fixtures
  (`creator`, `inbox`, `ots`, `db`, `audit`) so individual specs stay
  declarative.
- A new env flag **`E2E_TEST_MODE`** (server) + **`NEXT_PUBLIC_E2E_TEST_MODE`**
  (client) gates all stubbing. Both default to off (production safety).

### Data / schema changes
- **None.** Email capture and OTS call recording are file-based
  (JSON-lines under `test-results/`); no DB tables, no migrations.

### API changes / contracts
- **No new HTTP routes.** Email inbox and OTS call log are read by
  test fixtures directly from `test-results/e2e-inbox.log` and
  `test-results/e2e-ots.log` in the same process / filesystem.
- The only production-code change is inside `lib/email/client.ts`
  and `lib/esigning/timestamps.ts`: a single early branch
  `if (process.env.E2E_TEST_MODE === 'true') { appendJsonLine(...); return ... }`
  guarded so it cannot run in production.

### Security / permissions
- **Critical**: every test-only surface (signature affordance, email
  file-stub, OTS file-stub) **MUST** be gated by `E2E_TEST_MODE` /
  `NEXT_PUBLIC_E2E_TEST_MODE`. The flag is read **only from
  `process.env`** at module/runtime — never from a request header,
  cookie, query string, or any user-controlled input.
- Unit tests assert that with the flag unset, the real SMTP transport
  is constructed and the real OTS calendar code path runs (no file
  write).
- The Supabase service-role key is used only by the helpers, never
  exposed to the browser. `.env.e2e` is gitignored.

### Performance / scalability
- The journey test budget: **< 60 s wall time** locally, < 90 s in CI.
- Parallel workers default to 1 for the journey suite (DB cleanup is
  global), or use per-test schemas if we later need parallelism.

### Observability
- Each test writes `test-results/<name>/audit.txt`. Playwright trace,
  screenshots, video on failure. HTML report.

---

## 7. Rollout plan

### Feature flagging
- `E2E_TEST_MODE` env var defaults to unset → all stubbing is inert
  (real SMTP, real OTS calendars). No production impact.

### Migration / backfill
- None — schema unchanged.

### Staged rollout & rollback
- Land behind no flag in product; the harness only runs when invoked
  via `pnpm test:e2e` against a local Supabase. To roll back, revert
  the PR.

---

## 8. Analytics & success metrics

### KPIs
- `pnpm test:e2e` passes on `main` 100 % of the time (post-merge).
- Mean time to triage an e2e failure < 10 minutes (audit log + trace
  enable this).

### Guardrail metrics
- Journey test wall time < 60 s locally.
- Zero production code paths newly invoked when `E2E_TEST_MODE` is
  unset (verified by unit test).

---

## 9. Testing plan

### Scope
- This PRD *is* the test plan. The deliverable is a test harness.
- In addition:
  - Unit tests in `__tests__/` for the gating in `lib/email/client.ts`
    and `lib/esigning/timestamps.ts`: when `E2E_TEST_MODE` is unset
    the file-write branch is *not* taken and the real transport /
    real calendar code path runs (mocked at the module boundary).
  - The new code itself is exercised exclusively via the harness it
    creates, plus those unit tests.

### Acceptance criteria checklist
- [ ] `pnpm test:e2e` runs locally on a clean checkout with a local
      Supabase and passes.
- [ ] The journey test asserts every item in § 4.9 (each as a separate
      `expect`).
- [ ] With `E2E_TEST_MODE` unset, `lib/email/client.ts` opens an SMTP
      transport (mocked) and `lib/esigning/timestamps.ts` invokes the
      OTS calendar code path (mocked) — i.e. the file-stub branch is
      never taken (asserted by unit test).
- [ ] No `app/api/test/*` routes exist (file-based stubs only).
- [ ] No real network calls leave the process during the suite (verified
      by Playwright `route` allowlist).
- [ ] On forced failure (e.g. break the journey in source), the audit
      log at `test-results/<name>/audit.txt` exists and contains the
      ordered events leading to the failure.
- [ ] Removing all Tailwind classes from one of the touched UI
      components does not break any selector used by the harness
      (manual check at PR review).
- [ ] `e2e/signature-canvas/canvas.spec.ts` covers the four edge cases
      enumerated in § 4.10 and passes.
- [ ] PDF fixture committed at `e2e/fixtures/sample.pdf` and < 50 KB.

---

## 10. Milestones

### Tasks (planning-level)
1. **M1 — Foundations** (env, runner, local Supabase orchestration).
   - Add `.env.e2e.example`, gitignore real file.
   - `globalSetup` boots local Supabase, applies migrations,
     truncates / creates the JSON-lines stub files
     (`test-results/e2e-inbox.log`, `test-results/e2e-ots.log`).
   - Wire `pnpm test:e2e` to run journey + public + canvas.
2. **M2 — Stubs**.
   - Email transport file-stub branch in `lib/email/client.ts`
     + unit test.
   - OTS file-stub branch in `lib/esigning/timestamps.ts`
     + unit test.
   - `NEXT_PUBLIC_E2E_TEST_MODE`-gated signature submission affordance.
   - Network allowlist guard.
3. **M3 — Helpers & fixtures**.
   - `helpers/auth.ts` (programmatic creator creation + storageState).
   - `helpers/db.ts`, `helpers/inbox.ts`, `helpers/ots.ts`,
     `helpers/audit.ts`.
   - Page objects for TemplateBuilder, DocumentDraft, SignPage.
   - Commit `e2e/fixtures/sample.pdf`.
4. **M4 — The journey test** (`e2e/journeys/multi-signer.spec.ts`)
   implementing every assertion in § 4.9.
5. **M5 — Signature-canvas suite**
   (`e2e/signature-canvas/canvas.spec.ts`) covering the four edge
   cases.
6. **M6 — Failure forensics**
   - Audit log writer plumbed into all helpers.
   - DB snapshot dumper on failure.
7. **M7 — Documentation**.
   - Short README at `e2e/README.md` (how to run, prerequisites,
     troubleshooting).
   - Reference from top-level README.

### Dependencies
- `supabase` CLI on the dev machine / CI runner.
- Existing migrations in `supabase/migrations/` continue to apply
  cleanly.

### Risks & mitigations
- **Risk:** Stubbing the signature component creates a divergence
  between test path and prod path.
  **Mitigation:** the stub injects via the *same* submission code path
  as the real component, only bypassing the canvas drawing. The
  separate canvas suite covers the drawing path.
- **Risk:** File-stub branch accidentally activated in production.
  **Mitigation:** the branch is a single `if (process.env.E2E_TEST_MODE === 'true')`
  early return; unit test asserts the real code path runs when the
  env is unset; the env is never read from request input.
- **Risk:** Local Supabase boot is slow and flakes.
  **Mitigation:** `globalSetup` waits with bounded backoff and
  surfaces a clear error on timeout; reuse running instance when
  possible.
- **Risk:** Selector brittleness creeps back over time.
  **Mitigation:** explicit "no Tailwind class selectors" rule in the
  e2e README; lint guard in M7 (CI grep against `e2e/**/*.spec.ts`).

### Open questions
- None blocking. (Email & OTS capture: file-based JSON-lines under
  `test-results/`. No DB tables, no HTTP routes.)


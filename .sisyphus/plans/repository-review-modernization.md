# Repository Review & Modernization

## TL;DR
> **Summary**: Reconcile local work against fresh `origin/main` first, then harden the reconciled app into an open-source-ready Expo project with deterministic thermal printing, full app/UI i18n across all Scryfall-supported locales, 95% global line coverage, and enforceable quality gates.
> **Deliverables**:
> - audited upstream reconciliation report and integrated codebase
> - completed thermal printer pipeline with deterministic 1-bit dithering
> - full UI + card-data localization across all supported locales with English fallback only for missing API-localized card data
> - root README plus maintained `expo/docs/*`
> - ESLint (Airbnb + Expo/React/TS), Prettier, CI workflows, coverage gates
> - 95% global line coverage with automated reporting
> **Effort**: XL
> **Parallel**: YES - 4 waves
> **Critical Path**: 1 → 2 → 3 → 6 → 8 → 9 → 11 → 12 → 14

## Context
### Original Request
- Refresh the repository against `origin` before continuing feature work.
- Plan a full review/remediation process first.
- Reach at least 95% global coverage.
- Produce open-source-grade documentation including a canonical repo-root README.
- Add missing ESLint, Prettier, tests, GitHub workflows, and related quality automation.
- Use Airbnb ESLint rules plus Expo and React rules.
- Fix thermal printing for true 1-bit printers with dithering.
- Audit hardcoded strings and implement full i18n through the entire app.
- Ensure summon/search fetch cards in the app language, falling back to English only if localized API data is absent.

### Interview Summary
- Reconciliation strategy: **audit-first merge** against latest `origin/main`.
- Coverage gate: **95% global line coverage**.
- Documentation strategy: **repo-root README + deeper docs under `expo/docs/`**.
- i18n release scope: **full UI translation for all locales Scryfall supports**.
- Printer image pipeline: **deterministic JavaScript-side dithering required**.
- Current local repo state at planning time: local `HEAD` is `6ea740b`, locally tracked `origin/main` is `5a87630`, and live remote `main` is `77441f0`. The remote advanced by 13 commits since the last known local `origin/main` and those commits touch critical-path files including `expo/app/(tabs)/(home)/index.tsx`, `expo/app/(tabs)/search/index.tsx`, `expo/app/(tabs)/settings/printer.tsx`, `expo/app/card.tsx`, `expo/app/print-preview.tsx`, `expo/i18n/index.ts`, all locale files, `expo/services/scryfall.ts`, `expo/components/DitheredImage.tsx`, `expo/utils/dither.ts`, and `expo/providers/NetworkProvider.tsx`.

### Metis Review (gaps addressed)
- Lock one canonical locale-mapping source and forbid duplicated Scryfall locale tables.
- Define “localized data missing” at the **field/record fallback policy** level, not vaguely.
- Reconcile with upstream **before** introducing coverage ratchets and strict lint gates.
- Make dithering deterministic by contract: same input + same options => identical output bytes.
- Add explicit acceptance criteria for sync review, CI thresholds, localization behavior, and printer output constraints.
- Treat newly landed upstream printer/i18n/UI commits as reconciliation-sensitive inputs, not as optional later review.

## Work Objectives
### Core Objective
Produce a reconciled, open-source-ready Expo codebase whose behavior reflects latest upstream changes and whose quality/process/tooling are strong enough to sustain external contributors without regressing localization, printer correctness, or testability.

### Deliverables
- Upstream audit report and reconciled implementation baseline
- Finished thermal printer workflow end-to-end, including auto-print/queue UX completion
- Deterministic JS dithering renderer for 1-bit thermal images
- Fully localized app UI and card flows for all supported locales
- Root README + maintained deep docs under `expo/docs/`
- ESLint/Prettier/test/coverage/GitHub Actions automation
- 95% global line coverage report enforced in CI

### Definition of Done (verifiable conditions with commands)
- `git fetch origin && git status --branch && git log --left-right --graph --oneline origin/main...HEAD` reviewed and reconciled per Task 1 evidence.
- `cd expo && bunx eslint .` exits 0.
- `cd expo && bunx prettier --check .` exits 0.
- `cd expo && bunx tsc --noEmit` exits 0.
- `cd expo && bun run test -- --runInBand --coverage` exits 0.
- `cd expo && node -e "const s=require('./coverage/coverage-summary.json'); const p=s.total.lines.pct; if(p<95) process.exit(1)"` exits 0.
- GitHub Actions CI workflow passes lint, typecheck, tests, and coverage gate.
- Localization smoke tests prove a Portuguese app session shows Portuguese UI strings and Portuguese card/search/print data when Scryfall provides it, with English fallback only when localized API data is absent.
- Printer rendering tests prove deterministic byte output, multiples-of-8 width normalization, and dithering golden outputs.

### Must Have
- Audit-first upstream review before codebase-wide cleanup
- Single locale mapping source shared by app i18n and Scryfall fetch layer
- Deterministic JS dithering with reproducible tests
- Root README as canonical OSS entrypoint
- Full UI localization for every shipped locale
- 95% global line coverage enforced automatically

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No direct hardcoded user-facing strings left in app UI or printer UX flows
- No duplicate locale mapping tables or ad hoc fallback logic scattered through code
- No placeholder/opaque image-print path that bypasses deterministic preprocessing
- No CI gate added against unreconciled upstream behavior
- No empty “100% docs” fluff; docs must reference real files and real workflows
- No silent SDK/platform upgrade unless an audited blocker requires it

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: **tests-after** on reconciled codebase, with TDD required for high-risk localization/printer modules
- QA policy: Every task includes executable happy-path + failure/edge validation
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Reconciliation baseline, quality baseline, locale baseline, printer contract baseline, documentation baseline

Wave 2: Upstream integration, tooling/CI, i18n infrastructure consolidation, printer dithering implementation, thermal workflow completion

Wave 3: Whole-app UI localization, localized summon/search/print behavior, broad test expansion, docs finalization

Wave 4: Coverage ratchet, final cleanup, release-readiness verification

### Dependency Matrix (full, all tasks)
- 1 blocks 2, 3, 4, 5, 6, 7
- 2 blocks 8, 9, 10, 11, 12, 13
- 3 blocks 6, 12, 13
- 4 blocks 9, 11
- 5 blocks 10, 14
- 6 blocks 12, 13
- 7 blocks 8, 10, 11, 14
- 8 blocks 12, 13, 14
- 9 blocks 11, 13
- 10 blocks 14
- 11 blocks 14
- 12 blocks 14
- 13 blocks 14

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 7 tasks → deep, unspecified-high, writing
- Wave 2 → 4 tasks → visual-engineering, unspecified-high, deep
- Wave 3 → 2 tasks → unspecified-high, writing
- Wave 4 → 1 task → deep

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Audit Fresh Origin Divergence And Freeze Review Baseline

  **What to do**: Fetch latest `origin/main`, capture divergence against current `HEAD`, and produce a classified reconciliation matrix: `preserve-local`, `accept-upstream`, `manual-merge`, `drop-local`. Include file-level rationale for thermal printer, i18n, docs, and UI changes. Persist evidence before any broad refactor work begins.
  **Must NOT do**: Do not auto-merge or rebase blindly. Do not apply lint/coverage/tooling changes before the divergence matrix is approved by the execution flow.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: requires careful upstream/local reasoning and merge-risk classification
  - Skills: `[]` — no special injected skill required
  - Omitted: `[]` — no omissions

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2,3,4,5,6,7 | Blocked By: none

  **References**:
  - Pattern: `.git/` state + current branch `main` tracking `origin/main` — baseline audit target
  - Pattern: `expo/app/(tabs)/settings/printer.tsx` — recent local printer UI work to classify during reconciliation
  - Pattern: `expo/app/print-preview.tsx` — recent local queue submission work to classify during reconciliation
  - Pattern: `expo/services/printer/**` — local printer-domain work to compare against upstream
  - Pattern: live remote delta `5a87630...77441f0` — upstream changes now include printer UX, search/home/card flows, locale files, `expo/services/scryfall.ts`, `expo/components/DitheredImage.tsx`, `expo/utils/dither.ts`, and `expo/providers/NetworkProvider.tsx`

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/task-1-origin-audit.md` exists with fetch timestamp, branch state, ahead/behind count, and per-file classification
  - [ ] `git fetch origin && git status --branch` evidence captured
  - [ ] `git log --left-right --graph --oneline origin/main...HEAD` evidence captured
  - [ ] No implementation task starts without the reconciliation matrix

  **QA Scenarios**:
  ```
  Scenario: Fresh divergence report generated
    Tool: Bash
    Steps: run git fetch origin; capture git status --branch; capture git log --left-right --graph --oneline origin/main...HEAD; write evidence report
    Expected: evidence file contains current remote state and classified action for each divergent area
    Evidence: .sisyphus/evidence/task-1-origin-audit.md

  Scenario: Dirty-tree risk detected before merge work
    Tool: Bash
    Steps: run git status --short before reconciliation
    Expected: report calls out local non-source artifacts separately so they do not pollute merge decisions
    Evidence: .sisyphus/evidence/task-1-origin-audit.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: n/a

- [ ] 2. Reconcile Upstream UI And Behavior Into Local Baseline

  **What to do**: Apply the Task 1 matrix to reconcile all upstream visual/functionality changes into the current local branch, with explicit focus on router screens, settings, printer screens, search, card detail, preview, and shared components. Resolve conflicts by preserving the chosen source of truth per file. Ensure local thermal/i18n work is re-based conceptually onto the reconciled UI instead of forcing stale UI assumptions.
  **Must NOT do**: Do not introduce new product behavior beyond reconciliation choices from Task 1. Do not leave conflict markers or “temporary” compatibility shims.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: cross-file reconciliation with behavior preservation
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 8,9,10,11,12,13 | Blocked By: 1

  **References**:
  - Pattern: `expo/app/**` — app/router surface to reconcile
  - Pattern: `expo/components/**` — component-level upstream deltas
  - Pattern: `expo/providers/**` — provider API changes that can invalidate downstream work
  - Pattern: `expo/components/DitheredImage.tsx`, `expo/components/Toast.tsx`, `expo/components/HistorySheet.tsx`, `expo/providers/NetworkProvider.tsx` — upstream-added surfaces that must be explicitly classified during reconciliation
  - Test: `expo/__tests__/services/scryfall.test.ts` — preserve current tested service behavior unless reconciliation explicitly changes it

  **Acceptance Criteria**:
  - [ ] `git diff --check` exits 0 after reconciliation
  - [ ] No conflict markers remain (`<<<<<<<`, `=======`, `>>>>>>>`)
  - [ ] `.sisyphus/evidence/task-2-reconciliation.md` lists each resolved conflict area and chosen source of truth

  **QA Scenarios**:
  ```
  Scenario: Reconciled app compiles cleanly
    Tool: Bash
    Steps: run git diff --check; run bunx tsc --noEmit inside expo
    Expected: no conflict markers, no new TypeScript compile failures from reconciliation
    Evidence: .sisyphus/evidence/task-2-reconciliation.txt

  Scenario: Reconciliation did not silently drop local printer/i18n work
    Tool: Bash
    Steps: compare current HEAD against task-1 matrix for files under expo/services/printer and expo/i18n
    Expected: each preserved-local or manual-merge file from the matrix still matches its intended outcome
    Evidence: .sisyphus/evidence/task-2-reconciliation-audit.md
  ```

  **Commit**: YES | Message: `refactor(reconcile): integrate upstream UI and behavior baseline` | Files: `expo/app/**`, `expo/components/**`, `expo/providers/**`, related reconciled files

- [ ] 3. Establish Quality Baseline And Coverage Measurement Contract

  **What to do**: Measure current coverage on the reconciled codebase, define inclusion/exclusion rules for the 95% global line gate, and wire deterministic reporting outputs. Exclude tests, mocks, docs, config files, generated/native glue, and tooling-only files from app-source coverage. Publish the exact command + summary format that CI will enforce.
  **Must NOT do**: Do not declare 95% achieved by excluding product code. Do not use branch-only or file-by-file gates instead of the agreed global line gate.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: measurement setup + policy definition
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 6,12,13 | Blocked By: 1

  **References**:
  - Pattern: `expo/jest.config.js` — existing test runner configuration
  - Test: `expo/__tests__/printer/**` and `expo/__tests__/services/scryfall.test.ts` — current coverage contributors
  - Config: `expo/package.json` — scripts surface to normalize

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/task-3-coverage-baseline.json` contains current totals
  - [ ] Coverage include/exclude list is documented in repo config/comments and reflected in CI command
  - [ ] A single command fails when global line coverage is below 95

  **QA Scenarios**:
  ```
  Scenario: Coverage baseline is reproducible
    Tool: Bash
    Steps: run bun run test -- --runInBand --coverage; capture coverage-summary.json
    Expected: summary file generated and parseable by a follow-up node command
    Evidence: .sisyphus/evidence/task-3-coverage-baseline.json

  Scenario: Coverage gate fails below threshold
    Tool: Bash
    Steps: execute the final coverage-threshold command against a deliberately reduced threshold check simulation
    Expected: command exits non-zero when below 95 and zero when at/above 95
    Evidence: .sisyphus/evidence/task-3-coverage-gate.txt
  ```

  **Commit**: YES | Message: `chore(test): define global coverage contract` | Files: `expo/jest.config.js`, `expo/package.json`, related test config

- [ ] 4. Lock Canonical Locale Architecture And Scryfall Fallback Semantics

  **What to do**: Make `expo/i18n/index.ts` the single canonical locale source for app UI and Scryfall locale mapping. Remove duplicated locale tables from `expo/services/scryfall.ts`. Define exact fallback semantics: try localized object/endpoint first; if localized card record is missing, use English record; do not replace localized UI strings with English. If localized record is partial, apply field-level fallback policy explicitly and consistently.
  **Must NOT do**: Do not leave duplicated locale maps. Do not use broad “if locale fetch fails then whole flow in English” logic for UI.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: high-impact contract for all card flows and translations
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 6,12,13 | Blocked By: 1

  **References**:
  - Pattern: `expo/i18n/index.ts` — canonical locale/provider source
  - Pattern: `expo/i18n/types.ts` and `expo/i18n/locales/*.ts` — upstream-expanded locale contract surface
  - Pattern: `expo/services/scryfall.ts` — current localized fetch/search logic and duplicate locale mapping
  - Pattern: `expo/app/(tabs)/(home)/index.tsx` — summon/random card entrypoint
  - Pattern: `expo/app/(tabs)/search/index.tsx` — search entrypoint

  **Acceptance Criteria**:
  - [ ] Locale→Scryfall mapping exists in exactly one source file
  - [ ] Tests cover localized fetch success, missing localized record fallback, and partial localized data semantics for at least Portuguese and one non-Latin locale
  - [ ] No UI locale fallback depends on Scryfall response success/failure

  **QA Scenarios**:
  ```
  Scenario: Canonical locale map drives Scryfall fetch
    Tool: Bash
    Steps: run targeted locale tests for summon/search service paths
    Expected: locale routing uses one canonical mapping source and tests prove correct endpoint language selection
    Evidence: .sisyphus/evidence/task-4-locale-contract.txt

  Scenario: English fallback only for missing card localization
    Tool: Bash
    Steps: run tests simulating missing localized card data vs localized UI strings present
    Expected: card data falls back to English while UI strings remain translated in app locale
    Evidence: .sisyphus/evidence/task-4-locale-fallback.txt
  ```

  **Commit**: YES | Message: `refactor(i18n): unify locale mapping and fallback semantics` | Files: `expo/i18n/index.ts`, `expo/services/scryfall.ts`, affected tests

- [ ] 5. Finalize Thermal Printer Contract For 1-Bit Output

  **What to do**: Define the execution contract for printer rendering: supported transports remain current app scope (BLE on iOS; BLE/classic/TCP where adapter supports), supported paper widths are 58/80mm, image widths must be normalized to multiples of 8, raster output must be deterministic, and default dithering algorithm is **Atkinson** for card art with a testable option to switch to Floyd–Steinberg for regression comparison. Document printer byte expectations and failure policy.
  **Must NOT do**: Do not defer image-quality decisions to the native module. Do not leave raster/column mode ambiguous in the implementation plan.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: hardware contract definition with implementation/testing impact
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 10,11 | Blocked By: 1

  **References**:
  - Pattern: `expo/services/printer/render/escpos.ts` — current placeholder image path
  - Pattern: `expo/services/printer/render/document.ts` — card receipt image call site
  - Pattern: `expo/services/printer/adapters/native.ts` — current image send bridge
  - Pattern: `expo/utils/dither.ts` and `expo/components/DitheredImage.tsx` — upstream-added dithering/image-display surfaces to audit before deciding reuse vs replacement
  - External: ReceiptPrinterEncoder / ESC-POS references from dithering research — multiples-of-8 and raster-mode constraints

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/task-5-printer-contract.md` documents algorithm choice, pixel normalization rules, width constraints, and supported transport assumptions
  - [ ] Contract defines exact behavior for unsupported image sizes and missing art URLs
  - [ ] Contract defines deterministic golden-test policy for image bytes

  **QA Scenarios**:
  ```
  Scenario: Printer contract is executable
    Tool: Bash
    Steps: review generated renderer tests against contract checklist
    Expected: every printer image rule in the contract maps to at least one automated test case
    Evidence: .sisyphus/evidence/task-5-printer-contract.md

  Scenario: Width normalization rules cover 58mm and 80mm
    Tool: Bash
    Steps: inspect golden test cases for both paper widths and off-by-one image widths
    Expected: each width is rounded/padded to multiples of 8 with explicit expected byte output
    Evidence: .sisyphus/evidence/task-5-printer-widths.txt
  ```

  **Commit**: YES | Message: `docs(printer): codify 1-bit thermal rendering contract` | Files: `expo/docs/PRINTER.md`, related printer tests/docs

- [ ] 6. Install Open-Source Tooling Baseline (ESLint, Prettier, Scripts)

  **What to do**: Extend the existing flat `expo/eslint.config.js` into the project’s canonical ESLint v9 config using Expo base + React/React Native + TypeScript + Airbnb rules, with `eslint-config-prettier/flat` last. Add Prettier config and scripts. Normalize package scripts for `lint`, `format`, `format:check`, `typecheck`, `test`, `coverage`. Ensure config covers TS/TSX, ignores build artifacts, and does not fight Prettier.
  **Must NOT do**: Do not mix legacy `.eslintrc` with flat config. Do not add stylistic rules that conflict with Prettier. Do not enable gates before Task 2 reconciliation finishes.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: toolchain integration with compatibility edge cases
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 12,13,14 | Blocked By: 1,3,4

  **References**:
  - Pattern: `expo/eslint.config.js` — current minimal flat config
  - Config: `expo/package.json` — scripts + dependency surface
  - External: Expo ESLint docs, TypeScript-ESLint flat config guidance, `eslint-config-prettier/flat`

  **Acceptance Criteria**:
  - [ ] `cd expo && bunx eslint .` exits 0
  - [ ] `cd expo && bunx prettier --check .` exits 0
  - [ ] `expo/package.json` contains canonical scripts for lint/format/typecheck/test/coverage
  - [ ] Airbnb + Expo/React/TS rules are present and documented in config comments

  **QA Scenarios**:
  ```
  Scenario: ESLint flat config composes correctly
    Tool: Bash
    Steps: run bunx eslint . inside expo
    Expected: no config-resolution errors; lint exits 0 on reconciled codebase
    Evidence: .sisyphus/evidence/task-6-eslint.txt

  Scenario: Prettier integration does not fight ESLint
    Tool: Bash
    Steps: run bunx prettier --check .; run eslint-config-prettier conflict check if configured
    Expected: formatter check passes and no conflicting formatting rules remain active
    Evidence: .sisyphus/evidence/task-6-prettier.txt
  ```

  **Commit**: YES | Message: `chore(tooling): add eslint and prettier baseline` | Files: `expo/eslint.config.js`, Prettier config, `expo/package.json`, ignore files

- [ ] 7. Add GitHub Workflows For Lint Typecheck Test And Coverage

  **What to do**: Add `.github/workflows/ci.yml` as the canonical pull-request/push workflow for repo-root orchestration of the Expo app. Run install, lint, typecheck, tests, and coverage gate. Upload coverage artifacts. Use Bun + Node versions explicitly, cache dependencies, and fail fast on lint/type errors before tests. Add optional docs validation if markdown linting is adopted.
  **Must NOT do**: Do not require Expo secrets or EAS credentials for default OSS CI. Do not add fragile device/simulator jobs to the required path.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: CI correctness and OSS contributor UX
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 14 | Blocked By: 1

  **References**:
  - Config: `expo/package.json` — scripts the workflow must call
  - External: Expo GitHub Action and standard Node/Bun CI patterns

  **Acceptance Criteria**:
  - [ ] `.github/workflows/ci.yml` exists and validates with `actionlint` or equivalent config check
  - [ ] Workflow runs lint → typecheck → test/coverage in order
  - [ ] Coverage artifact upload step is present

  **QA Scenarios**:
  ```
  Scenario: Workflow file is syntactically valid
    Tool: Bash
    Steps: run actionlint or yaml validation against .github/workflows/ci.yml
    Expected: validation exits 0
    Evidence: .sisyphus/evidence/task-7-ci-validation.txt

  Scenario: Workflow commands match local scripts
    Tool: Bash
    Steps: compare workflow command list against expo/package.json scripts and run them locally
    Expected: each workflow command exists and succeeds locally
    Evidence: .sisyphus/evidence/task-7-ci-commands.txt
  ```

  **Commit**: YES | Message: `ci: add open-source quality workflow` | Files: `.github/workflows/ci.yml`, related helper files

- [ ] 8. Complete Thermal Workflow Wiring (Auto-Print, Queue Lifecycle, Status UX)

  **What to do**: Finish the remaining thermal plan work by reconciling and wiring Tasks 11 and 12 into the reconciled app: auto-print entrypoints from card/summon flows, queue lifecycle worker triggering, retry status UX, failure/manual-retry states, and surfaced job status on settings/preview/card flows. Ensure current Tasks 9 and 10 remain intact after upstream reconciliation.
  **Must NOT do**: Do not bypass the queue by printing directly from UI screens. Do not hide failure states behind generic alerts.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: user-facing screen/flow wiring with printer lifecycle behavior
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 12,13,14 | Blocked By: 2,5,7

  **References**:
  - Pattern: `expo/app/(tabs)/settings/printer.tsx` — reconciled printer settings screen
  - Pattern: `expo/app/print-preview.tsx` — queue-backed print preview flow
  - Pattern: `expo/app/card.tsx` — card detail entrypoint to print/preview
  - Pattern: `expo/providers/NetworkProvider.tsx` — upstream-added notification/connection-status surface likely to intersect printer UX
  - Pattern: `expo/services/printer/queue/engine.ts`, `expo/services/printer/storage/repositories.ts` — queue lifecycle primitives

  **Acceptance Criteria**:
  - [ ] Auto-print can enqueue jobs from intended card flow entrypoints when enabled
  - [ ] Retry/pending/failed-manual/completed statuses are visible in UI where specified
  - [ ] No direct printer adapter calls originate from UI screens

  **QA Scenarios**:
  ```
  Scenario: Auto-print enqueue path works
    Tool: Playwright / interactive_bash
    Steps: enable auto-print in settings; summon a card; inspect job creation and UI status
    Expected: a queued job appears without manual print tap and status updates are visible
    Evidence: .sisyphus/evidence/task-8-auto-print.png

  Scenario: Failed printer job surfaces retry state
    Tool: Playwright / Bash
    Steps: force fake adapter failure; enqueue print; observe retry/failed-manual UI state
    Expected: user sees queued → retry_wait or failed_manual state with explicit message/action
    Evidence: .sisyphus/evidence/task-8-queue-status.png
  ```

  **Commit**: YES | Message: `feat(printer): finish auto-print and queue lifecycle UX` | Files: `expo/app/**`, `expo/services/printer/**`, related tests

- [ ] 9. Implement Deterministic JavaScript Dithering Renderer

  **What to do**: Replace placeholder image handling in `expo/services/printer/render/escpos.ts` with a real JS image pipeline: fetch/prepare card art, resize to printer width, convert to grayscale, dither to 1-bit using **Atkinson** by default, support deterministic Floyd–Steinberg comparison mode for tests, pad/normalize width to multiples of 8, and emit stable raster bytes. Update `document.ts` and adapter contract as needed so the renderer owns preprocessing, not the native module.
  **Must NOT do**: Do not leave image conversion to native black-box behavior. Do not use randomness or device-dependent rendering paths in the byte-generation code.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: algorithmic rendering + printer byte correctness
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 11,14 | Blocked By: 2,5

  **References**:
  - Pattern: `expo/services/printer/render/escpos.ts` — current placeholder image implementation to replace
  - Pattern: `expo/services/printer/render/document.ts` — image-render call sites for card receipts
  - Pattern: `expo/services/printer/adapters/native.ts` — downstream base64/image send surface
  - Test: `expo/__tests__/printer/escpos-renderer.test.ts` — extend with golden image/dither tests
  - External: thermal printer research on Atkinson/Floyd–Steinberg and multiples-of-8 width alignment

  **Acceptance Criteria**:
  - [ ] Golden tests prove deterministic byte output for the same image/options input
  - [ ] Width normalization to multiples of 8 is covered for 58mm and 80mm
  - [ ] Placeholder image path is removed from production renderer
  - [ ] Missing image URL gracefully skips art without breaking receipt generation

  **QA Scenarios**:
  ```
  Scenario: Deterministic dithering golden output
    Tool: Bash
    Steps: run printer renderer golden tests for Atkinson and Floyd–Steinberg fixtures
    Expected: identical bytes across repeated runs; fixtures pass without snapshot drift
    Evidence: .sisyphus/evidence/task-9-dithering.txt

  Scenario: Invalid image dimensions normalize correctly
    Tool: Bash
    Steps: run tests with off-width images for 58mm and 80mm targets
    Expected: output width is padded/truncated to multiples of 8 and renderer still emits valid bytes
    Evidence: .sisyphus/evidence/task-9-width-normalization.txt
  ```

  **Commit**: YES | Message: `feat(printer): add deterministic 1-bit dithering renderer` | Files: `expo/services/printer/render/**`, related tests/fixtures

- [ ] 10. Build Canonical OSS Documentation Surface

  **What to do**: Create/replace the repo-root `README.md` as the canonical OSS entrypoint and update `expo/docs/README.md`, `expo/docs/ARCHITECTURE.md`, `expo/docs/PRINTER.md`, and `expo/docs/CONTRIBUTING.md` to match the reconciled behavior, tooling, CI, and localization model. The root README must link to deep docs, contributor setup, printer support limitations, supported locales, and CI expectations.
  **Must NOT do**: Do not leave stale statements about placeholder printer behavior or incomplete i18n. Do not duplicate long-form docs in the root README.

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: repo-specific OSS documentation synthesis
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 14 | Blocked By: 2,5,7

  **References**:
  - Pattern: `expo/docs/*.md` — existing deep-doc structure to update
  - Pattern: `expo/package.json`, `.github/workflows/ci.yml`, `expo/services/printer/**`, `expo/i18n/index.ts` — documentation sources of truth

  **Acceptance Criteria**:
  - [ ] Repo-root `README.md` exists and links to `expo/docs/*`
  - [ ] Documentation matches actual scripts, CI workflow names, printer capabilities, and locale support
  - [ ] `git diff --check` shows no markdown formatting issues in docs changes

  **QA Scenarios**:
  ```
  Scenario: Root README covers OSS onboarding
    Tool: Bash
    Steps: verify README contains install, run, test, lint, coverage, docs, printer, and locale sections with valid relative links
    Expected: all required sections present and links resolve
    Evidence: .sisyphus/evidence/task-10-readme-check.txt

  Scenario: Deep docs align with implementation
    Tool: Bash
    Steps: compare documented commands and supported locales against actual package scripts and locale files
    Expected: no mismatches between docs and code/config
    Evidence: .sisyphus/evidence/task-10-doc-audit.md
  ```

  **Commit**: YES | Message: `docs: publish canonical open-source documentation` | Files: `README.md`, `expo/docs/**`

- [ ] 11. Make Search Summon And Print Flows Locale-Correct End-To-End

  **What to do**: Ensure summon/random card fetch, search results, autocomplete, card detail, print-preview payloads, and printed receipt content all use the active app locale and the canonical fallback semantics from Task 4. Portuguese app sessions must return/print Portuguese cards when Scryfall provides localized data. Apply the same logic across every locale supported by the canonical mapping.
  **Must NOT do**: Do not localize by name only while leaving printed/oracle text in English. Do not let print payloads drift from on-screen card language.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: cross-flow data correctness and localization behavior
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 14 | Blocked By: 2,8,9

  **References**:
  - Pattern: `expo/services/scryfall.ts` — fetch/search/autocomplete/localization logic
  - Pattern: `expo/app/(tabs)/(home)/index.tsx` — summon/random card flow
  - Pattern: `expo/app/(tabs)/search/index.tsx` — search flow
  - Pattern: `expo/app/card.tsx`, `expo/app/print-preview.tsx` — detail/preview/print payload generation
  - Pattern: upstream commits `56dc516f`, `819e5415` — remote localization fixes that must be reviewed before reworking locale logic
  - Pattern: `expo/services/printer/render/document.ts` — receipt data consumption

  **Acceptance Criteria**:
  - [ ] End-to-end tests prove Portuguese summon/search/print produces Portuguese content when available
  - [ ] Localized print payloads match localized on-screen card data
  - [ ] English fallback occurs only when Scryfall localized record is absent per Task 4 policy

  **QA Scenarios**:
  ```
  Scenario: Portuguese summon prints Portuguese card
    Tool: Playwright / interactive_bash
    Steps: set locale to Portuguese; summon a known localized card; open print preview; inspect queued payload/preview content
    Expected: card name/oracle text/print payload are Portuguese when Scryfall has localized data
    Evidence: .sisyphus/evidence/task-11-pt-print.png

  Scenario: Missing localization falls back only for card data
    Tool: Playwright / Bash
    Steps: set locale to a supported locale with a known missing localized card; perform summon/search; inspect UI and payload
    Expected: UI remains in app locale while card data falls back to English per policy
    Evidence: .sisyphus/evidence/task-11-fallback.png
  ```

  **Commit**: YES | Message: `feat(i18n): localize summon search and print flows` | Files: `expo/services/scryfall.ts`, `expo/app/**`, related tests

- [ ] 12. Remove Hardcoded Strings And Complete Full UI Translation Coverage

  **What to do**: Audit all user-visible strings across screens, components, providers, error banners, printer UX, navigation labels, empty states, and alerts. Replace them with translation keys. Fill every locale file under `expo/i18n/locales/` so the shipped UI is fully translated for all supported locales. Add automated checks that fail when user-visible strings bypass the translation layer in audited directories.
  **Must NOT do**: Do not translate internal logs/debug strings unless they are user-facing. Do not leave one-off untranslated alerts in printer or search flows.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: broad UI sweep plus translation completeness enforcement
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 14 | Blocked By: 2,4,6,8

  **References**:
  - Pattern: `expo/app/print-preview.tsx`, `expo/app/_layout.tsx`, `expo/app/+not-found.tsx` — known hardcoded-string hotspots
  - Pattern: `expo/components/**`, `expo/app/**`, `expo/providers/**` — broader user-facing string audit surface
  - Pattern: `expo/i18n/locales/*.ts` — translation files to complete
  - Pattern: upstream commits `a886cb44`, `77441f0` — new notifications/alerts and detail copy that increase the hardcoded-string audit surface

  **Acceptance Criteria**:
  - [ ] Known hotspots no longer contain hardcoded user-facing strings
  - [ ] All shipped locale files contain all required keys for the full UI surface
  - [ ] Automated scan/check exists for audited directories to catch untranslated user-visible strings

  **QA Scenarios**:
  ```
  Scenario: Hardcoded-string audit passes
    Tool: Bash
    Steps: run grep/AST-based untranslated-string audit against app/components/providers audit scope
    Expected: zero unauthorized hardcoded user-facing strings remain
    Evidence: .sisyphus/evidence/task-12-string-audit.txt

  Scenario: Locale completeness is enforced
    Tool: Bash
    Steps: run locale-key parity script across all translation files
    Expected: all locale dictionaries contain the same key set as canonical source
    Evidence: .sisyphus/evidence/task-12-locale-parity.txt
  ```

  **Commit**: YES | Message: `feat(i18n): translate full UI surface` | Files: `expo/app/**`, `expo/components/**`, `expo/providers/**`, `expo/i18n/locales/**`, audit scripts/tests

- [ ] 13. Expand Automated Tests To Reach 95 Percent Global Lines

  **What to do**: Add risk-based tests for providers, screens, i18n, printer UI, search flows, summon flows, queue lifecycle, and docs/tooling assertions until the measured global line coverage reaches at least 95%. Prefer behavior tests over snapshots. Add targeted mocks/utilities where needed, but keep tests deterministic and meaningful.
  **Must NOT do**: Do not inflate coverage with trivial no-op tests or snapshot spam. Do not weaken the coverage include list from Task 3.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: large-volume test authoring across app layers
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 14 | Blocked By: 2,3,4,6,8,11,12

  **References**:
  - Test: `expo/__tests__/printer/**` — established test style for service-heavy modules
  - Test: `expo/__tests__/services/scryfall.test.ts` — service testing style to reuse
  - Pattern: `expo/providers/SettingsProvider.tsx`, `expo/app/(tabs)/(home)/index.tsx`, `expo/app/(tabs)/search/index.tsx`, `expo/app/card.tsx`, `expo/app/print-preview.tsx` — highest-value remaining gaps

  **Acceptance Criteria**:
  - [ ] Global line coverage reaches or exceeds 95% using the Task 3 contract
  - [ ] New tests cover provider logic, search/summon/print flows, i18n behavior, and printer UI/queue states
  - [ ] Full suite passes locally and in CI

  **QA Scenarios**:
  ```
  Scenario: Coverage target achieved
    Tool: Bash
    Steps: run full suite with coverage and threshold command
    Expected: coverage summary shows >=95% total lines and threshold command exits 0
    Evidence: .sisyphus/evidence/task-13-coverage-summary.json

  Scenario: High-risk flows have real behavior tests
    Tool: Bash
    Steps: run targeted tests for settings provider, search flow, summon flow, print-preview, and printer settings UI
    Expected: targeted suites pass and exercise the intended user-facing behavior, not snapshots only
    Evidence: .sisyphus/evidence/task-13-high-risk-tests.txt
  ```

  **Commit**: YES | Message: `test(app): reach global coverage target` | Files: `expo/__tests__/**`, test utilities/mocks, minimal supporting code

- [ ] 14. Run Release-Readiness Cleanup And OSS Finalization

  **What to do**: Run the entire quality stack on the fully reconciled/translated/printed/tested app, remove dead code (including placeholder renderer paths if obsolete), normalize scripts/docs references, and prepare the repo for final verification. This task is the final implementation cleanup before the mandatory 4-agent verification wave.
  **Must NOT do**: Do not hide failures with ignores or weakened gates. Do not leave obsolete printer placeholder paths, dead locale mappings, or stale docs references.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: holistic final cleanup against all prior tasks
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: F1,F2,F3,F4 | Blocked By: 7,8,9,10,11,12,13

  **References**:
  - Pattern: all files touched by Tasks 2-13
  - Config: `.github/workflows/ci.yml`, `expo/package.json`, `README.md`, `expo/docs/**`

  **Acceptance Criteria**:
  - [ ] `cd expo && bunx eslint .` exits 0
  - [ ] `cd expo && bunx prettier --check .` exits 0
  - [ ] `cd expo && bunx tsc --noEmit` exits 0
  - [ ] `cd expo && bun run test -- --runInBand --coverage` exits 0 with >=95% lines
  - [ ] No dead placeholder printer/image code remains in production paths

  **QA Scenarios**:
  ```
  Scenario: Full quality stack passes
    Tool: Bash
    Steps: run lint, prettier check, typecheck, tests, coverage gate in sequence
    Expected: all commands exit 0
    Evidence: .sisyphus/evidence/task-14-quality-stack.txt

  Scenario: Final cleanup removed obsolete placeholder logic
    Tool: Bash
    Steps: grep for placeholder renderer/image comments, dead paths, and duplicated locale mapping remnants
    Expected: obsolete codepaths from earlier scaffolding no longer exist in production source
    Evidence: .sisyphus/evidence/task-14-cleanup-audit.txt
  ```

  **Commit**: YES | Message: `chore(release): finalize open-source readiness` | Files: repo-wide final cleanup set

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle

  **Verification Scenario**:
  ```
  Scenario: Implementation matches plan commitments
    Tool: task (oracle) + Bash
    Steps: run oracle review against the repo and this plan; compare completed files, commands, CI, docs, printer flow, i18n flow, and coverage gate against Tasks 1-14 acceptance criteria; capture any missing task-level commitments
    Expected: oracle explicitly approves that completed work satisfies every mandatory task acceptance criterion or returns a concrete defect list to fix
    Evidence: .sisyphus/evidence/f1-plan-compliance.md
  ```
- [ ] F2. Code Quality Review — unspecified-high

  **Verification Scenario**:
  ```
  Scenario: Code quality and maintainability audit
    Tool: task (unspecified-high) + Bash
    Steps: review changed source for dead code, duplicated locale logic, placeholder printer paths, brittle tests, CI/script drift, and lint/type smells; run lint/typecheck/test stack while auditing
    Expected: reviewer explicitly approves code quality or returns file-specific remediation items; lint/typecheck/tests all pass during review
    Evidence: .sisyphus/evidence/f2-code-quality.md
  ```
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)

  **Verification Scenario**:
  ```
  Scenario: User-visible flows work end-to-end
    Tool: task (unspecified-high) + Playwright + Bash
    Steps: launch the app or web/dev target; exercise settings, locale switching, summon/search, card detail, print preview, printer settings, and queue status flows; capture console/runtime errors and screenshots
    Expected: reviewed flows behave correctly, translated UI appears for tested locales, localized card data follows fallback rules, and printer queue UX is visible without console/runtime errors
    Evidence: .sisyphus/evidence/f3-manual-qa.md
  ```
- [ ] F4. Scope Fidelity Check — deep

  **Verification Scenario**:
  ```
  Scenario: No scope creep or missed requested work
    Tool: task (deep) + Bash
    Steps: compare final repo state against the original request and this plan; confirm origin reconciliation, 95% coverage, root README + expo/docs, ESLint/Prettier/workflows, deterministic dithering, and full UI/card i18n were all delivered without unrelated platform rewrites
    Expected: reviewer explicitly approves that the final state matches requested scope and flags no missing deliverables or unauthorized expansions
    Evidence: .sisyphus/evidence/f4-scope-fidelity.md
  ```

## Commit Strategy
- Commit 1: audit/reconciliation evidence and baseline decisions
- Commit 2: upstream reconciliation of app/UI behavior
- Commit 3: locale contract + coverage contract
- Commit 4: tooling baseline (ESLint/Prettier/scripts) + CI workflow
- Commit 5: printer contract + deterministic dithering implementation
- Commit 6: thermal workflow completion (auto-print/queue UX)
- Commit 7: localization implementation (UI + summon/search/print)
- Commit 8: coverage expansion to 95% and test utilities
- Commit 9: root README + docs finalization
- Commit 10: release-readiness cleanup before verification wave

## Success Criteria
- Latest upstream `origin/main` changes are reconciled intentionally with an auditable matrix
- The app is open-source ready with canonical root README, deep docs, contributor workflow, and CI
- All app UI is translated for all supported locales, and card content follows locale with precise English fallback semantics
- Thermal image printing uses deterministic 1-bit JavaScript dithering validated by golden tests and width-normalization rules
- Global line coverage is >=95% and enforced automatically
- Final verification wave approves plan compliance, code quality, manual QA, and scope fidelity

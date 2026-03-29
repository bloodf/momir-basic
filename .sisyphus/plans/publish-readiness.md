# Publish Readiness Plan

## TL;DR
> **Summary**: Make the Expo app publish-ready for **iOS + Android** using a **managed Expo/EAS-first** approach, including **production OTA readiness** and a **full App Store / Play Store submission checklist**.
> **Deliverables**:
> - Hardened Expo/EAS production config and versioning policy
> - Privacy/compliance/legal artifacts and permission audit
> - CI/CD, release runbook, crash reporting, and rollback path
> - Store metadata, screenshots, submission assets, and evidence pack
> **Effort**: Large
> **Parallel**: YES - 4 waves
> **Critical Path**: 1 → 2 → 5 → 8 → 11 → F1-F4

## Context
### Original Request
Plan what is missing to make the app ready for publishing and production use.

### Interview Summary
- Optimize for **iOS + Android together**.
- Cover **Stores + OTA** readiness.
- Include a **full submission checklist**, not just technical blockers.
- Default to **managed Expo/EAS-first**; do not assume committed native folders are the source of truth.

### Metis Review (gaps addressed)
- Treat OTA policy, version/build increments, credential ownership, privacy/data-safety, and physical Bluetooth validation as first-class workstreams.
- Keep scope to publish readiness only; no feature work, design polish, or unrelated refactors.
- Require executable verification and evidence artifacts for store, OTA, and hardware validation.

## Work Objectives
### Core Objective
Produce a decision-complete execution path that gets this Expo app from “buildable” to “publishable and operable” on iOS and Android, including production OTA rollout discipline.

### Deliverables
- Production-safe Expo/EAS configuration
- Release/versioning policy for iOS + Android + OTA
- Privacy/compliance/legal package
- Crash/error monitoring and operational runbooks
- CI/CD release gates and evidence artifacts
- Store submission assets/metadata checklist and submission-ready records

### Definition of Done (verifiable conditions with commands)
- `cd expo && bun run lint` exits without errors.
- `cd expo && bunx tsc --noEmit` exits cleanly.
- `cd expo && bun run test -- --runInBand` exits cleanly.
- `cd expo && bunx playwright test e2e/printer-qa.spec.ts` exits cleanly or only skips explicitly documented cases.
- `cd expo && eas build --platform ios --profile production --non-interactive` succeeds.
- `cd expo && eas build --platform android --profile production --non-interactive` succeeds.
- `cd expo && eas update --branch staging --non-interactive --message "publish-readiness smoke"` succeeds using the documented OTA lane.
- Store submission artifacts, privacy URLs, screenshots, and metadata files exist in the repo or in the documented release system with evidence references.

### Must Have
- Managed Expo/EAS-first release path
- Explicit OTA runtime/channel policy
- Explicit build/version increment policy
- Privacy policy URL and data-safety/privacy labeling inputs
- Physical-device Bluetooth printer validation
- Release rollback procedure

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No feature additions unrelated to publishing.
- No analytics expansion beyond release-critical crash/error monitoring unless required for launch.
- No bare/native migration unless a blocker proves managed Expo/EAS cannot satisfy publishing.
- No OTA to production for native/permission/config changes that require store binaries.
- No changing `bundleIdentifier`, Android package, app slug, or scheme after store setup begins.

## Verification Strategy
> ZERO HUMAN INTERVENTION is the default. Task 10 is the only allowed exception category, and it must use an agent-accessible device lab. If no such lab exists, stop on `[DECISION NEEDED: hardware validation environment]` before release sign-off.
- Test decision: tests-after + existing Jest/Playwright/Expo/EAS tooling
- QA policy: Every task includes agent-executed scenarios; physical-device QA must run through an agent-accessible device lab or remain blocked as an explicit external prerequisite.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
Wave 1: release config + permissions + compliance foundation
Wave 2: operations/monitoring + CI/CD + OTA lane setup
Wave 3: store submission assets + metadata + credentials + dry-run builds
Wave 4: physical-device validation + release rehearsal + final evidence pack

### Dependency Matrix (full, all tasks)
- 1 blocks 2, 3, 5, 6, 8
- 2 blocks 8, 11
- 3 blocks 9, 11
- 4 blocks 11
- 5 blocks 10, 11
- 6 blocks 8, 11
- 7 blocks 11
- 8 blocks 11
- 9 blocks 11
- 10 blocks 11

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 3 tasks → unspecified-high, writing
- Wave 2 → 3 tasks → unspecified-high, deep
- Wave 3 → 2 tasks → writing, unspecified-high
- Wave 4 → 3 tasks → unspecified-high, deep

## TODOs

- [x] 1. Lock the release model and versioning policy

  **What to do**: Standardize on managed Expo/EAS. Define exact policies for `version`, `ios.buildNumber`, `android.versionCode`, `cli.appVersionSource`, EAS `production`/`preview` profiles, branch/channel mapping, and OTA/native-change rules. Decide default runtime policy: increment runtime for native/config/permission changes; OTA only for JS-safe changes.
  **Must NOT do**: Do not assume committed `ios/` or `android/` folders are canonical. Do not leave versioning behavior implicit.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: release policy and config correctness
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2, 3, 5, 6, 8 | Blocked By: none

  **References**:
  - Pattern: `expo/app.json` — current Expo config surface
  - Pattern: `expo/eas.json` — current EAS profile structure
  - External: `https://docs.expo.dev/deploy/build-project/` — Expo build/version policy
  - External: `https://docs.expo.dev/eas-update/deployment/` — branch/channel rollout model

  **Acceptance Criteria**:
  - [ ] A documented, repo-backed policy exists for version/build increments and OTA/runtime rules.
  - [ ] `expo/app.json` and `expo/eas.json` contain the exact production-ready fields required by that policy.

  **QA Scenarios**:
  ```
  Scenario: Release config is internally consistent
    Tool: Bash
    Steps: cd expo && bunx tsc --noEmit
    Expected: Config-backed code compiles cleanly after release policy changes.
    Evidence: .sisyphus/evidence/task-1-release-config.txt

  Scenario: EAS profiles resolve for production lanes
    Tool: Bash
    Steps: cd expo && eas config --platform ios && eas config --platform android
    Expected: Output shows valid production/preview profile resolution with no missing required keys.
    Evidence: .sisyphus/evidence/task-1-release-config-error.txt
  ```

  **Commit**: YES | Message: `chore(release): define versioning and ota policy` | Files: `expo/app.json`, `expo/eas.json`, release docs

- [x] 2. Audit and fix permissions, privacy manifest, and platform compliance config

  **What to do**: Reconcile actual app capability usage with declared permissions and privacy requirements. Add the required Apple privacy manifest coverage, precise usage descriptions for media/photo saving and Bluetooth-related access, and remove or justify any unused permission strings. Ensure config is managed-Expo compatible.
  **Must NOT do**: Do not leave placeholder or generic permission strings. Do not add permissions for unused features.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: platform compliance is rejection-sensitive
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 8, 11 | Blocked By: 1

  **References**:
  - Pattern: `expo/app.json` — current iOS/Android permission configuration
  - Pattern: `expo/app/print-preview.tsx` — media-library/photo-saving behavior to justify permissions
  - External: `https://docs.expo.dev/guides/apple-privacy/` — Apple privacy manifest guidance

  **Acceptance Criteria**:
  - [ ] All declared iOS/Android permissions map to a real app behavior.
  - [ ] Apple privacy manifest and permission text are present, specific, and publish-safe.

  **QA Scenarios**:
  ```
  Scenario: Permission config matches actual app behavior
    Tool: Bash
    Steps: cd expo && bun run lint
    Expected: No new config/code issues; permission-bearing features still compile and lint cleanly.
    Evidence: .sisyphus/evidence/task-2-permissions.txt

  Scenario: Compliance artifacts are present
    Tool: Bash
    Steps: cd expo && npx expo config --json > /tmp/expo-config.json && python - <<'PY'
import json
app=json.load(open('/tmp/expo-config.json'))
ios=app.get('ios', {})
info=ios.get('infoPlist', {})
assert info.get('NSPhotoLibraryAddUsageDescription')
assert info.get('NSBluetoothAlwaysUsageDescription')
assert ios.get('privacyManifests') or ios.get('privacyManifest')
print('ok')
PY
    Expected: Required permission strings and privacy manifest declarations are present and non-placeholder.
    Evidence: .sisyphus/evidence/task-2-permissions-error.txt
  ```

  **Commit**: YES | Message: `chore(compliance): align permissions and privacy manifest` | Files: Expo config and privacy artifacts

- [x] 3. Add legal/compliance submission artifacts

  **What to do**: Create `expo/docs/release/LEGAL_INPUTS.md`, `expo/docs/release/PRIVACY_POLICY.md`, `expo/docs/release/TERMS.md`, and `expo/docs/release/STORE_COMPLIANCE.md`. `LEGAL_INPUTS.md` must hold the canonical legal entity name, support email/URL, privacy-policy host URL, and export-compliance answers. If those values are unavailable, stop on `[DECISION NEEDED: legal owner + support URL + privacy policy host + export compliance answers]` before drafting final submission copy.
  **Must NOT do**: Do not leave legal placeholders or “TBD” values.

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: legal/compliance and store-facing prose
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 9, 11 | Blocked By: 1

  **References**:
  - Pattern: repo-wide absence of privacy/legal docs — gap to close
  - External: App Store / Play privacy-policy and data-safety requirements from Expo submit docs

  **Acceptance Criteria**:
  - [ ] `expo/docs/release/LEGAL_INPUTS.md` exists and contains the canonical legal/support/export values required to finish store submission.
  - [ ] Privacy policy URL, support URL, and store-compliance input docs are complete and non-placeholder.
  - [ ] Hardware support limitations are explicitly documented for submission/review use.

  **QA Scenarios**:
  ```
  Scenario: Legal artifact set is complete
    Tool: Bash
    Steps: test -f expo/docs/release/LEGAL_INPUTS.md && test -f expo/docs/release/PRIVACY_POLICY.md && test -f expo/docs/release/TERMS.md && test -f expo/docs/release/STORE_COMPLIANCE.md
    Expected: Privacy, support, data safety, and submission input docs all exist and are complete.
    Evidence: .sisyphus/evidence/task-3-legal.txt

  Scenario: No placeholder legal text remains
    Tool: Bash
    Steps: ! grep -RniE 'TODO|TBD|placeholder' expo/docs/release/LEGAL_INPUTS.md expo/docs/release/PRIVACY_POLICY.md expo/docs/release/TERMS.md expo/docs/release/STORE_COMPLIANCE.md
    Expected: Zero unresolved placeholders in submission-facing content.
    Evidence: .sisyphus/evidence/task-3-legal-error.txt
  ```

  **Commit**: YES | Message: `docs(release): add privacy and store compliance artifacts` | Files: release/legal docs

- [x] 4. Add crash/error monitoring and production observability minimums

  **What to do**: Integrate release-critical crash/error monitoring (default: Sentry), sourcemap upload, release/environment tagging, and a minimal operational alerting/runbook path. Document exactly what constitutes a launch-blocking production failure.
  **Must NOT do**: Do not expand into broad product analytics. Do not ship with untagged production errors.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: runtime observability and release diagnosis
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 11 | Blocked By: 1

  **References**:
  - External: Expo/Sentry integration guidance and sourcemap upload workflow
  - Pattern: repo currently lacks crash tracking per audit

  **Acceptance Criteria**:
  - [ ] Production errors are captured with release/environment context.
  - [ ] Sourcemap upload and release tagging are part of the release runbook.

  **QA Scenarios**:
  ```
  Scenario: Monitoring integration initializes in production config
    Tool: Bash
    Steps: cd expo && bun run lint && bunx tsc --noEmit && npx expo config --json > /tmp/expo-config.json && test -f sentry.properties
    Expected: App compiles/tests cleanly and monitoring configuration is present for production builds.
    Evidence: .sisyphus/evidence/task-4-observability.txt

  Scenario: Synthetic error reaches monitoring workflow
    Tool: interactive_bash / Bash
    Steps: Trigger a controlled synthetic production-like error in a test build path and inspect monitoring receipt evidence.
    Expected: Error is visible with release tag, environment, and sourcemap-friendly stack context.
    Evidence: .sisyphus/evidence/task-4-observability-error.txt
  ```

  **Commit**: YES | Message: `feat(release): add crash monitoring for production` | Files: monitoring setup + docs

- [x] 5. Build CI/CD release gates for publishing

  **What to do**: Add GitHub Actions (or the repo’s canonical CI) for lint, typecheck, Jest, targeted Playwright, and production build validation. Define required statuses for merge-to-release. Add a release workflow that can produce production builds and attach evidence without auto-submitting by default.
  **Must NOT do**: Do not make store submission automatic on every merge. Do not skip hardware validation gates.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: release automation and gating design
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8, 11 | Blocked By: 1

  **References**:
  - Pattern: repo currently lacks `.github/workflows/` per audit
  - Pattern: `expo/package.json`, `expo/jest.config.js`, `expo/playwright.config.ts` — existing verification entrypoints

  **Acceptance Criteria**:
  - [ ] CI runs lint, typecheck, unit tests, and targeted E2E on every release-bound change.
  - [ ] Release workflow can produce production build artifacts reproducibly.

  **QA Scenarios**:
  ```
  Scenario: CI pipeline succeeds on release branch
    Tool: Bash
    Steps: gh workflow run ci.yml --ref <release-branch> && gh run watch $(gh run list --workflow ci.yml --limit 1 --json databaseId --jq '.[0].databaseId')
    Expected: All gates succeed with no manual intervention.
    Evidence: .sisyphus/evidence/task-5-ci.txt

  Scenario: Release workflow fails closed on broken config
    Tool: Bash
    Steps: gh workflow run release-build.yml --ref <release-branch> -f dry_run=true -f platform=ios && gh run watch $(gh run list --workflow release-build.yml --limit 1 --json databaseId --jq '.[0].databaseId')
    Expected: Workflow performs build-only validation and does not auto-submit to the store when `dry_run=true`.
    Evidence: .sisyphus/evidence/task-5-ci-error.txt
  ```

  **Commit**: YES | Message: `ci(release): add publish readiness gates` | Files: CI workflow files + release docs

- [x] 6. Implement credentials, signing, and account ownership runbook

  **What to do**: Define and configure Apple/Google credentials ownership, recovery, rotation, and EAS credential management. Ensure Android release signing is not debug-based, and document exactly where ownership lives for app store accounts, API keys, and keystores.
  **Must NOT do**: Do not leave credentials ownership implicit. Do not rely on a single engineer’s local machine.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: release continuity and store access risk
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8, 11 | Blocked By: 1

  **References**:
  - Pattern: `expo/eas.json` — EAS profile base
  - External: Expo submit/build credential docs

  **Acceptance Criteria**:
  - [ ] Production signing and submission credentials are owned, recoverable, and documented.
  - [ ] Android release signing no longer depends on debug defaults.

  **QA Scenarios**:
  ```
  Scenario: Credentials are valid for both platforms
    Tool: Bash
    Steps: cd expo && eas credentials --platform ios --non-interactive && eas credentials --platform android --non-interactive
    Expected: Credentials resolve successfully for production build lanes.
    Evidence: .sisyphus/evidence/task-6-credentials.txt

  Scenario: Ownership and recovery path is documented
    Tool: Bash
    Steps: test -f expo/docs/release/RELEASE_CREDENTIALS.md && ! grep -nE 'TODO|TBD|placeholder' expo/docs/release/RELEASE_CREDENTIALS.md
    Expected: No credential artifact is undocumented or single-owner-only.
    Evidence: .sisyphus/evidence/task-6-credentials-error.txt
  ```

  **Commit**: YES | Message: `chore(release): formalize signing and credential ownership` | Files: release runbooks + EAS-related config

- [x] 7. Define staging/production environment separation and OTA rollback operations

  **What to do**: Formalize staging vs production environment variables, EAS Update branch/channel mapping, build provenance, OTA approval flow, rollback command path, and native-change escalation rules. Document when OTA is allowed and when a store build is mandatory.
  **Must NOT do**: Do not permit production OTA from an untested staging environment. Do not mix preview secrets with production.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: OTA discipline and rollback safety
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 11 | Blocked By: 1

  **References**:
  - External: `https://docs.expo.dev/eas-update/deployment/` — channels/branches/rollout
  - Pattern: `expo/eas.json` — current EAS lane base

  **Acceptance Criteria**:
  - [ ] Staging and production OTA lanes are explicitly separated and documented.
  - [ ] A tested rollback path exists before launch.

  **QA Scenarios**:
  ```
  Scenario: Staging OTA publishes successfully
    Tool: Bash
    Steps: cd expo && eas update --branch staging --non-interactive --message "staging smoke"
    Expected: Update publishes to staging lane with expected branch/channel mapping.
    Evidence: .sisyphus/evidence/task-7-ota.txt

  Scenario: Rollback procedure is executable
    Tool: Bash
    Steps: test -f expo/docs/release/ROLLBACK.md && grep -n 'eas update' expo/docs/release/ROLLBACK.md && grep -n 'branch' expo/docs/release/ROLLBACK.md
    Expected: Prior good update can be restored using the documented commands and evidence is captured.
    Evidence: .sisyphus/evidence/task-7-ota-error.txt
  ```

  **Commit**: YES | Message: `docs(ota): define rollout and rollback operations` | Files: EAS config + release runbooks

- [x] 8. Prepare full App Store / Play Store submission package

  **What to do**: Produce `expo/docs/release/STORE_METADATA.md` and `expo/docs/release/STORE_ASSETS_MANIFEST.md` with exact store listing requirements: app title, subtitle/short description, full descriptions, keywords, support URL, privacy policy URL, review notes, hardware support notes, screenshots for required device classes, promotional assets, category choices, age/content rating inputs, and submission checklist sequencing.
  **Must NOT do**: Do not leave screenshots or review notes as TBD. Do not forget Bluetooth hardware support explanation for reviewers.

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: store metadata and reviewer-facing artifacts
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 11 | Blocked By: 1, 2, 5, 6

  **References**:
  - External: Expo submit docs + store metadata requirements
  - Pattern: supported app locales under `expo/i18n/locales/` — localization considerations for store copy

  **Acceptance Criteria**:
  - [ ] Complete store metadata exists for both stores, including URLs and review notes.
  - [ ] Screenshot/device-asset matrix is complete for required device classes.

  **QA Scenarios**:
  ```
  Scenario: Submission artifact inventory is complete
    Tool: Bash
    Steps: test -f expo/docs/release/STORE_METADATA.md && test -f expo/docs/release/STORE_ASSETS_MANIFEST.md
    Expected: No required store field or asset class is missing for iOS or Android.
    Evidence: .sisyphus/evidence/task-8-store-assets.txt

  Scenario: Reviewer notes cover hardware dependencies
    Tool: Bash
    Steps: grep -n 'Bluetooth' expo/docs/release/STORE_METADATA.md
    Expected: Bluetooth printer dependency, login/state assumptions, and test account/reproduction notes are explicit if needed.
    Evidence: .sisyphus/evidence/task-8-store-assets-error.txt
  ```

  **Commit**: YES | Message: `docs(store): prepare submission metadata and assets` | Files: store submission docs/assets manifest

- [x] 9. Run release build rehearsals for iOS and Android

  **What to do**: Execute production build rehearsals, verify build outputs, inspect final app metadata, and confirm no managed/native build blockers remain. Capture build IDs, build logs, and any submission-preflight results.
  **Must NOT do**: Do not treat preview builds as proof of production readiness. Do not skip both platforms.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: release build validation
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 11 | Blocked By: 3, 6

  **References**:
  - Pattern: `expo/eas.json` — production profile
  - External: Expo build and submit docs

  **Acceptance Criteria**:
  - [ ] Production EAS builds succeed on iOS and Android.
  - [ ] Build metadata and evidence are captured for release review.

  **QA Scenarios**:
  ```
  Scenario: iOS production build succeeds
    Tool: Bash
    Steps: cd expo && eas build --platform ios --profile production --non-interactive
    Expected: Production iOS build completes successfully and returns a build ID.
    Evidence: .sisyphus/evidence/task-9-ios-build.txt

  Scenario: Android production build succeeds
    Tool: Bash
    Steps: cd expo && eas build --platform android --profile production --non-interactive
    Expected: Production Android build completes successfully and returns a build ID.
    Evidence: .sisyphus/evidence/task-9-android-build.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: none

- [x] 10. Execute physical-device release validation matrix

  **What to do**: Validate the production candidate on at least one real iPhone, one real Android device, and one real supported Bluetooth printer using an agent-accessible device lab. If no such lab exists, stop on `[DECISION NEEDED: hardware validation environment]` and do not mark the release publish-ready. Verify install/update behavior, permissions, Bluetooth printer setup, print flows, failure handling, offline behavior, and post-install OTA-safe behavior.
  **Must NOT do**: Do not rely on simulators/emulators for Bluetooth printer proof. Do not skip production-like install paths.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: hardware-dependent real-world validation
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 11 | Blocked By: 2, 7

  **References**:
  - Pattern: `expo/e2e/printer-qa.spec.ts` — current web smoke path only
  - Pattern: printer flows under `expo/app/(tabs)/settings/printer.tsx` and `expo/app/print-preview.tsx`

  **Acceptance Criteria**:
  - [ ] Physical-device evidence exists for iOS + Android + real printer.
  - [ ] Bluetooth printing, permission prompts, and recovery flows are validated in production-like builds.

  **QA Scenarios**:
  ```
  Scenario: iPhone + printer validation succeeds
    Tool: interactive_bash / Bash
    Steps: Install production-like iOS build on a real iPhone, pair/use supported printer, run the documented print flow and collect screenshots/logs.
    Expected: Printer discovery, connect, test print, and print preview flows succeed without app crash or reviewer-blocking issues.
    Evidence: .sisyphus/evidence/task-10-ios-hardware.txt

  Scenario: Android + printer validation succeeds
    Tool: interactive_bash / Bash
    Steps: Install production-like Android build on a real Android device, validate Bluetooth permissions and print flows with a real printer.
    Expected: Permissions, pairing, retry/error handling, and completed print flow work as documented.
    Evidence: .sisyphus/evidence/task-10-android-hardware.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: none

- [x] 11. Run a full release rehearsal and produce the launch packet

  **What to do**: Perform the end-to-end release rehearsal: final CI pass, final builds, staging OTA drill, rollback drill, store metadata review, compliance review, build provenance capture, and a publish/no-publish checklist. Produce a final release packet with evidence links, build IDs, URLs, reviewer notes, and owners.
  **Must NOT do**: Do not mark publish-ready without evidence for both stores and OTA rollback.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: cross-functional release synthesis
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: F1-F4 | Blocked By: 2, 3, 4, 5, 6, 7, 8, 9, 10

  **References**:
  - All release docs, build outputs, OTA docs, CI workflows, and submission artifacts created by tasks 1-10

  **Acceptance Criteria**:
  - [ ] A complete launch packet exists with technical, legal, operational, and store-submission evidence.
  - [ ] Publish/no-publish decision can be made without additional discovery work.

  **QA Scenarios**:
  ```
  Scenario: Full release checklist passes
    Tool: Bash
    Steps: test -f expo/docs/release/RELEASE_RUNBOOK.md && test -f expo/docs/release/LAUNCH_PACKET.md && ! grep -RniE 'TODO|TBD|placeholder' expo/docs/release/LAUNCH_PACKET.md expo/docs/release/RELEASE_RUNBOOK.md
    Expected: Every step passes or is documented with an explicit blocker classification and owner.
    Evidence: .sisyphus/evidence/task-11-release-rehearsal.txt

  Scenario: Rollback remains viable after rehearsal
    Tool: Bash
    Steps: test -f expo/docs/release/ROLLBACK.md && grep -n 'production' expo/docs/release/ROLLBACK.md && grep -n 'staging' expo/docs/release/ROLLBACK.md
    Expected: Rollback procedure still works from the finalized release configuration.
    Evidence: .sisyphus/evidence/task-11-release-rehearsal-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: none

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
  - Tool: `task(subagent_type="oracle")`
  - Steps: Review executed work against `.sisyphus/plans/publish-readiness.md` and compare completed artifacts to every TODO acceptance criterion.
  - Expected: Oracle explicitly approves or returns a bounded defect list.
  - Evidence: `.sisyphus/evidence/f1-plan-compliance.txt`
- [x] F2. Code Quality Review — unspecified-high
  - Tool: `task(category="unspecified-high")`
  - Steps: Review changed config, workflows, monitoring setup, and docs for correctness, maintainability, and accidental scope creep.
  - Expected: Reviewer approves or returns actionable issues with file paths.
  - Evidence: `.sisyphus/evidence/f2-code-quality.txt`
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
  - Tool: `task(category="unspecified-high")` + Playwright/Bash evidence commands
  - Steps: Re-run release-critical commands (`bun run lint`, `bunx tsc --noEmit`, `bun run test -- --runInBand`, `bunx playwright test e2e/printer-qa.spec.ts`) and inspect launch-packet evidence.
  - Expected: All release-critical checks pass and evidence pack is complete.
  - Evidence: `.sisyphus/evidence/f3-real-qa.txt`
- [x] F4. Scope Fidelity Check — deep
  - Tool: `task(category="deep")`
  - Steps: Audit whether delivered work stayed inside publish-readiness scope and did not silently add feature/product work.
  - Expected: Deep reviewer confirms release scope fidelity or returns explicit drift items.
  - Evidence: `.sisyphus/evidence/f4-scope-fidelity.txt`

## Commit Strategy
- Commit 1: `chore(release): define versioning and ota policy`
- Commit 2: `chore(compliance): align permissions and privacy manifest`
- Commit 3: `docs(release): add privacy and store compliance artifacts`
- Commit 4: `feat(release): add crash monitoring for production`
- Commit 5: `ci(release): add publish readiness gates`
- Commit 6: `chore(release): formalize signing and credential ownership`
- Commit 7: `docs(ota): define rollout and rollback operations`
- Commit 8: `docs(store): prepare submission metadata and assets`

## Success Criteria
- The app can produce valid iOS and Android production builds via EAS.
- OTA rollout is production-safe, environment-separated, and rollback-tested.
- Privacy/legal/store-submission requirements are complete and non-placeholder.
- Release ownership, credentials, and recovery paths are documented and durable.
- Physical Bluetooth printer validation exists on real iOS and Android hardware.
- A release packet exists that is sufficient for publish/no-publish review without new discovery.

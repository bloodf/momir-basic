# Thermal Printer Infrastructure for the Expo App

## TL;DR
> **Summary**: Replace the repo’s mock Bluetooth printer flow with a real, queue-backed thermal-printing architecture built around `react-native-thermal-pos-printer`, Expo prebuild/custom dev builds, and a shared PrintDocument model that powers both preview and printing.
> **Deliverables**:
> - Real printer discovery, connect, save, test-print, and disconnect flows
> - Persistent print queue with retry semantics and restart recovery
> - Shared card receipt/test-print document pipeline wired into existing screens
> - Automated test infrastructure plus deterministic fake-printer QA path
> **Effort**: XL
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 8 → Task 9 → Task 10 → Task 12

## Context
### Original Request
Implement full thermal printer support in the application for generic Chinese Bluetooth thermal printers on Android and iOS, initially requested around `expo-escpos`, then refined to “the best package, with the best features, and can work in almost all the printers”.

### Interview Summary
- Target app: managed Expo SDK 54 app with existing printer UI and print-preview flow.
- Scope target: all **current** print-related outputs already implied by the repo, not invented future documents.
- Current in-scope printable outputs: card receipt from preview, printer test print, and auto-print from the existing card flow when enabled.
- iOS target: BLE-compatible printers only.
- Android target: broader practical support for generic Bluetooth ESC/POS printers.
- UX target: in-app discovery + saved preferred printer.
- Reliability target: persistent offline queue that survives app restarts and retries on relaunch/resume/foreground.
- Package decision: use the strongest practical package rather than staying locked to `expo-escpos`.

### Metis Review (gaps addressed)
- Scope creep controlled by freezing v1 to **existing print entrypoints** in this repo instead of inventing new business documents.
- Expo prebuild/custom dev client is treated as a **hard prerequisite**, not an implementation detail.
- Queue semantics are explicitly defined: foreground/relaunch processing only, persistent jobs, bounded automatic retries, no blind auto-retry after uncertain partial writes.
- Acceptance criteria rely on automated tests plus a deterministic fake-printer adapter for zero-human QA.

## Work Objectives
### Core Objective
Ship a production-usable thermal-printing subsystem for this Expo app that supports saved Bluetooth printers, reliable queued printing, and real receipt output for the existing card-print flows on Android and BLE-capable printers on iOS.

### Deliverables
- Native printer package integration via `react-native-thermal-pos-printer`
- Expo prebuild/dev-client configuration for printer permissions and native builds
- `PrintDocument`, `PrinterRegistry`, `PrintQueue`, and `TransportAdapter` layers
- SQLite-backed printer registry + print job storage
- Real printer setup screen behavior replacing mock discovery/connect/test flows
- Real print-preview queue submission replacing placeholder alerts
- Auto-print support for the existing card flow when `autoPrint` is enabled
- Jest + React Native Testing Library setup with deterministic printer fakes

### Definition of Done (verifiable conditions with commands)
- `cd expo && bun run lint` exits 0.
- `cd expo && bunx tsc --noEmit` exits 0.
- `cd expo && bun run test -- --runInBand` exits 0.
- `cd expo && bunx expo prebuild --platform ios --no-install` succeeds with Bluetooth permission entries present in generated config.
- `cd expo && bunx expo prebuild --platform android --no-install` succeeds with required Bluetooth permissions present in generated config.
- Fake-printer integration tests cover discovery, connect, enqueue, retry, and completed-job flows.

### Must Have
- Use `react-native-thermal-pos-printer` as the primary printer transport package.
- Use `expo-sqlite` for print queue and printer registry persistence.
- Preserve the existing SettingsProvider-driven user preferences pattern, but migrate saved printer identity from mutable name/address blobs to stable registry IDs.
- Keep preview rendering and print rendering derived from the same document model.
- Support iOS as BLE-only; never advertise Classic Bluetooth on iOS.
- Provide deterministic fake-printer behavior for web/tests/dev-mode QA.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Do **not** use `@vu1511/expo-escpos` as the actual discovery/connection/print transport layer.
- Do **not** couple screen components directly to native printer APIs.
- Do **not** keep queue persistence in AsyncStorage.
- Do **not** promise universal compatibility for every unnamed generic printer model.
- Do **not** invent new printable business artifacts beyond: card receipt, test print, and auto-print of the same card receipt flow.
- Do **not** auto-retry jobs after uncertain partial writes; mark them for manual retry instead.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: **tests-after** using Jest + React Native Testing Library + deterministic fake-printer adapter.
- QA policy: Every task includes at least one happy-path and one failure/edge-path scenario.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.
- Native hardware note: real-printer smoke validation is optional extra confidence, but plan acceptance is based on deterministic fake-adapter and build verification, not human-operated hardware.

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: foundation — native build prerequisites, tests, domain contracts, persistence

Wave 2: printer engine — adapter, registry, document renderer, diagnostics document

Wave 3: app integration — settings screen wiring, preview wiring, auto-print, queue UX/lifecycle

### Dependency Matrix (full, all tasks)
| Task | Depends On |
|---|---|
| 1 | none |
| 2 | none |
| 3 | 2 |
| 4 | 1, 2, 3 |
| 5 | 1, 2, 3, 4 |
| 6 | 3, 4, 5 |
| 7 | 3, 4, 6 |
| 8 | 3, 5, 6 |
| 9 | 5, 6, 8 |
| 10 | 6, 7, 8, 9 |
| 11 | 6, 7, 10 |
| 12 | 4, 6, 9, 10, 11 |

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 4 tasks → `unspecified-high`, `quick`
- Wave 2 → 4 tasks → `unspecified-high`, `deep`
- Wave 3 → 4 tasks → `unspecified-high`, `visual-engineering`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Add printer test infrastructure

  **What to do**: Add `jest-expo`, `@testing-library/react-native`, and required test scripts/config so printer/domain/queue code can be verified in-process. Create deterministic mocks for `react-native-thermal-pos-printer`, `expo-sqlite`, and haptics/media APIs touched by print screens. Put printer-focused tests under `expo/__tests__/printer/`.
  **Must NOT do**: Do not add Detox or native-device E2E in v1. Do not rely on Expo Go for printer verification.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: repo-wide test bootstrap with multiple mocks
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4, 5, 6, 7, 8, 9, 10, 11, 12 | Blocked By: none

  **References**:
  - Pattern: `expo/package.json:5-10` — current scripts lack any test command
  - Pattern: `expo/package.json:11-55` — current dependency baseline for adding test packages
  - Pattern: `expo/README.md` — repo currently documents manual testing only

  **Acceptance Criteria**:
  - [ ] `cd expo && bun run test -- --runInBand` executes successfully after config is added.
  - [ ] Test helpers can simulate printer discovery, connect success/failure, queue retries, and completed jobs without native hardware.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Test runner boots with printer mocks
    Tool: Bash
    Steps: cd expo && bun run test -- --runInBand --listTests
    Expected: Jest lists printer test files and exits 0.
    Evidence: .sisyphus/evidence/task-1-test-infra.txt

  Scenario: Native module unavailable path is mocked
    Tool: Bash
    Steps: cd expo && bun run test -- --runInBand printer-native-module
    Expected: Tests assert fake adapter fallback path without importing real native bindings.
    Evidence: .sisyphus/evidence/task-1-test-infra-error.txt
  ```

  **Commit**: YES | Message: `test(printer): add printer test infrastructure` | Files: `expo/package.json`, `expo/jest.config.*`, `expo/__tests__/printer/**`, `expo/test/**`

- [x] 2. Add native printer prerequisites and Expo build config

  **What to do**: Install `react-native-thermal-pos-printer`, `expo-sqlite`, and `expo-dev-client`. Update Expo config for Bluetooth permissions and prebuild requirements. Add `expo/eas.json` with a `development` profile and document that printer work runs only in dev client / native builds, never Expo Go.
  **Must NOT do**: Do not keep the implementation in managed-Expo/Expo-Go-only mode. Do not add `@vu1511/expo-escpos` to the runtime transport path.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: mostly package/config work with tight scope
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 3, 4, 5, 6, 9, 10, 11, 12 | Blocked By: none

  **References**:
  - Pattern: `expo/app.json:16-39` — current iOS/Android config and plugin structure
  - Pattern: `expo/package.json:11-55` — dependency insertion point
  - External: `https://www.npmjs.com/package/react-native-thermal-pos-printer` — selected transport package
  - External: `https://docs.expo.dev/develop/development-builds/introduction/` — custom dev build requirement
  - External: `https://docs.expo.dev/versions/latest/sdk/sqlite/` — SQLite persistence module

  **Acceptance Criteria**:
  - [ ] Package manifest and Expo config include all dependencies and Bluetooth permission entries for iOS and Android.
  - [ ] `bunx expo prebuild --platform ios --no-install` and `bunx expo prebuild --platform android --no-install` succeed.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: iOS prebuild validates Bluetooth config
    Tool: Bash
    Steps: cd expo && bunx expo prebuild --platform ios --no-install
    Expected: Prebuild completes without config errors and generated iOS project includes Bluetooth usage descriptions.
    Evidence: .sisyphus/evidence/task-2-prebuild-ios.txt

  Scenario: Android prebuild validates permissions
    Tool: Bash
    Steps: cd expo && bunx expo prebuild --platform android --no-install
    Expected: Prebuild completes without config errors and generated Android manifest includes required Bluetooth permissions.
    Evidence: .sisyphus/evidence/task-2-prebuild-android.txt
  ```

  **Commit**: YES | Message: `chore(printer): add native printer prerequisites` | Files: `expo/package.json`, `expo/app.json`, `expo/eas.json`

- [x] 3. Expand printer domain types and migrate settings shape

  **What to do**: Replace the minimal `PrinterDevice` / `PrinterConfig` model with explicit domain contracts: `PrinterTransport`, `PrinterRecord`, `PrinterCapabilities`, `PrinterPreferences`, `PrintDocument`, `PrintJob`, and `PrintJobState`. Keep user preferences in SettingsProvider, but migrate saved printer identity from `{name,address,type}` to `preferredPrinterId` plus paper/art/autoPrint preferences. Add migration logic that reads old AsyncStorage settings and produces the new structure safely.
  **Must NOT do**: Do not store printer identity by display name. Do not break existing non-printer settings.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: cross-cutting type and persistence contract work
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 4, 5, 6, 7, 8, 9, 10, 11, 12 | Blocked By: 2

  **References**:
  - API/Type: `expo/types/index.ts:64-88` — current printer types are too narrow for queue/registry work
  - Pattern: `expo/providers/SettingsProvider.tsx:7-25` — current defaults and persisted settings key
  - Pattern: `expo/providers/SettingsProvider.tsx:55-69` — current update pattern to preserve

  **Acceptance Criteria**:
  - [ ] New printer/queue/document types exist and are used instead of the old address-only printer config contract.
  - [ ] Old stored settings load without crashing and preserve paper width / print-art / auto-print preferences.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Legacy settings migrate cleanly
    Tool: Bash
    Steps: cd expo && bun run test -- --runInBand printer-settings-migration
    Expected: Tests prove old AsyncStorage payloads map to the new preferredPrinterId-based settings shape.
    Evidence: .sisyphus/evidence/task-3-settings-migration.txt

  Scenario: Invalid saved printer identity is discarded
    Tool: Bash
    Steps: cd expo && bun run test -- --runInBand printer-settings-invalid
    Expected: Tests show unknown/malformed printer IDs fall back to no preferred printer without corrupting other settings.
    Evidence: .sisyphus/evidence/task-3-settings-migration-error.txt
  ```

  **Commit**: YES | Message: `refactor(printer): expand printer domain contracts` | Files: `expo/types/**`, `expo/providers/SettingsProvider.tsx`

- [x] 4. Add SQLite-backed printer registry and print-job storage

  **What to do**: Create a printer database layer using `expo-sqlite` with two tables: `printers` and `print_jobs`. Store stable printer records, capability snapshots, last-seen metadata, and queued jobs with immutable payloads, attempt counts, retry timing, last error, and renderer version. Add repository functions for create/update/get/list operations and startup migrations.
  **Must NOT do**: Do not keep jobs in AsyncStorage. Do not mutate queued payloads after insertion.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: persistence schema plus migration logic
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 6, 9, 10, 11, 12 | Blocked By: 1, 2, 3

  **References**:
  - Pattern: `expo/providers/SettingsProvider.tsx:31-53` — existing persisted-state fetch/save lifecycle to mirror at service level
  - External: `https://docs.expo.dev/versions/latest/sdk/sqlite/` — SQLite API and migration support

  **Acceptance Criteria**:
  - [ ] Database bootstraps idempotently and exposes repository APIs for printers and jobs.
  - [ ] Print jobs persist across app restarts with states `queued`, `ready`, `dispatching`, `completed`, `retry_wait`, and `failed_manual`.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Queue survives restart semantics
    Tool: Bash
    Steps: cd expo && bun run test -- --runInBand printer-queue-storage
    Expected: Tests prove queued and retry_wait jobs reload from SQLite with the same payload and retry metadata.
    Evidence: .sisyphus/evidence/task-4-queue-storage.txt

  Scenario: Duplicate schema bootstrap is safe
    Tool: Bash
    Steps: cd expo && bun run test -- --runInBand printer-db-migrations
    Expected: Tests confirm repeated initialization does not duplicate tables or destroy existing rows.
    Evidence: .sisyphus/evidence/task-4-queue-storage-error.txt
  ```

  **Commit**: YES | Message: `feat(printer): persist printer registry and queue` | Files: `expo/services/printer/storage/**`, `expo/db/**`

- [x] 5. Implement the print queue engine and retry policy

  **What to do**: Build a queue service that claims one job at a time, renders it, dispatches it, records terminal state, and applies retry policy. Retry only connection/discovery/timeouts before confirmed write start; use backoff `15s`, `60s`, `300s`, then move to `failed_manual`. If a write result is uncertain after bytes start flowing, stop auto-retrying and mark the job `failed_manual` with a “printer state unknown” error.
  **Must NOT do**: Do not process jobs concurrently to the same printer. Do not auto-duplicate jobs on retry.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: queue semantics and failure-state correctness matter
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8, 10, 11, 12 | Blocked By: 1, 2, 3, 4

  **References**:
  - Pattern: `PLAN.md:12-14` — product intent already expects real printer support and ESC/POS output
  - API/Type: `.sisyphus/plans/thermal-printer-implementation.md` — use the queue state machine defined in this plan

  **Acceptance Criteria**:
  - [ ] Queue executes one job per printer at a time and persists state transitions.
  - [ ] Automatic retries happen only for safe pre-write failures and stop after three attempts.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Safe failure retries automatically
    Tool: Bash
    Steps: cd expo && bun run test -- --runInBand printer-queue-retry
    Expected: Tests show a connect timeout moves queued -> retry_wait and eventually retries with the configured backoff schedule.
    Evidence: .sisyphus/evidence/task-5-queue-engine.txt

  Scenario: Uncertain partial write requires manual retry
    Tool: Bash
    Steps: cd expo && bun run test -- --runInBand printer-queue-uncertain-write
    Expected: Tests show partial-write failures land in failed_manual with no automatic requeue.
    Evidence: .sisyphus/evidence/task-5-queue-engine-error.txt
  ```

  **Commit**: YES | Message: `feat(printer): add persistent queue engine` | Files: `expo/services/printer/queue/**`

- [x] 6. Implement transport adapters and deterministic fake printers

  **What to do**: Create a `PrinterPort` interface and two implementations: `NativeThermalPrinterAdapter` backed by `react-native-thermal-pos-printer`, and `FakePrinterAdapter` for web/tests/dev-mode. The adapter surface must cover discovery, connect, disconnect, send text/image/QR/cut operations, and capability probing. iOS adapter path must expose BLE devices only; Android may expose the package’s broader Bluetooth support.
  **Must NOT do**: Do not import the native package directly inside screens. Do not make web builds touch native modules.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: native abstraction boundary plus fake implementation
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7, 8, 9, 10, 11, 12 | Blocked By: 1, 2, 3

  **References**:
  - Pattern: `expo/app/(tabs)/settings/printer.tsx:82-140` — current scan/connect/test-print placeholder behavior to replace
  - Pattern: `expo/app/(tabs)/settings/printer.tsx:325-331` — iOS Classic Bluetooth warning to preserve in BLE-only form
  - External: `https://www.npmjs.com/package/react-native-thermal-pos-printer` — adapter API target

  **Acceptance Criteria**:
  - [ ] Screens/services depend only on `PrinterPort`, never on native package symbols.
  - [ ] Fake adapter returns deterministic printer fixtures and controllable failure modes for tests and web preview.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Fake adapter exposes deterministic printers
    Tool: Bash
    Steps: cd expo && bun run test -- --runInBand fake-printer-adapter
    Expected: Tests receive the same fake devices, capabilities, and success responses on every run.
    Evidence: .sisyphus/evidence/task-6-adapter.txt

  Scenario: Web/test path never imports native module
    Tool: Bash
    Steps: cd expo && bun run test -- --runInBand fake-printer-web-fallback
    Expected: Tests confirm the fake adapter is selected and no native-module import error is thrown.
    Evidence: .sisyphus/evidence/task-6-adapter-error.txt
  ```

  **Commit**: YES | Message: `feat(printer): add transport adapters` | Files: `expo/services/printer/adapters/**`

- [x] 7. Implement printer registry and saved-printer use cases

  **What to do**: Add a registry service that merges discovered devices with stored records, writes capability snapshots, tracks `lastSeenAt`, sets/clears the preferred printer, and exposes UI-safe actions: `discoverPrinters`, `connectPrinter`, `disconnectPrinter`, `savePreferredPrinter`, `forgetPrinter`. Keep `printerConnected` derived from live adapter state + preferred printer selection, not a blind persisted boolean.
  **Must NOT do**: Do not store connection truthiness as a long-lived source of truth in AsyncStorage.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: state-model correctness across persistence and runtime connection state
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9, 10, 11, 12 | Blocked By: 3, 4, 6

  **References**:
  - API/Type: `expo/types/index.ts:64-88` — current printer config source to replace
  - Pattern: `expo/providers/SettingsProvider.tsx:63-69` — updatePrinter flow to refactor toward preferred printer ID
  - Pattern: `expo/app/(tabs)/settings/printer.tsx:170-227` — device row behavior and testIDs to preserve

  **Acceptance Criteria**:
  - [ ] Preferred printer is saved by stable registry ID and rehydrated on startup.
  - [ ] Discovery merges existing records instead of duplicating the same physical printer across scans.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Preferred printer is restored from registry
    Tool: Bash
    Steps: cd expo && bun run test -- --runInBand printer-registry-preferred
    Expected: Tests prove a saved preferred printer ID rehydrates correctly and surfaces as the active target.
    Evidence: .sisyphus/evidence/task-7-registry.txt

  Scenario: Renamed printer does not create duplicate saved device
    Tool: Bash
    Steps: cd expo && bun run test -- --runInBand printer-registry-merge
    Expected: Tests show the same hardware address/identifier updates one record instead of creating a duplicate.
    Evidence: .sisyphus/evidence/task-7-registry-error.txt
  ```

  **Commit**: YES | Message: `feat(printer): add printer registry use cases` | Files: `expo/services/printer/registry/**`, `expo/providers/SettingsProvider.tsx`

- [x] 8. Implement shared PrintDocument rendering for card receipts and test prints

  **What to do**: Create a canonical `PrintDocument` model and ESC/POS renderer. Do **not** print the preview screenshot bitmap as the primary path. Render the card receipt as structured commands: title, mana cost as plain-text token string (e.g. `{2}{G}`), type line, oracle text, optional flavor text, optional stats line, optional dithered art bitmap when `printArt=true`, QR code to Scryfall, footer metadata, and optional cut. Add a separate diagnostics/test-print document that prints app name, platform, printer transport, paper width, timestamp, and capability flags.
  **Must NOT do**: Do not require custom mana glyph images in v1. Do not make preview UI the transport source of truth.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: renderer correctness plus compatibility tradeoffs
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9, 10, 11 | Blocked By: 3, 5, 6

  **References**:
  - Pattern: `expo/app/print-preview.tsx:188-243` — existing receipt content structure to preserve semantically
  - Pattern: `expo/app/print-preview.tsx:155-157` — Scryfall QR URL logic to preserve
  - Pattern: `expo/components/PrintManaCost.tsx` — on-screen preview inspiration only; printed output should use tokenized text for reliability
  - Pattern: `expo/components/PrintOracleText.tsx` — on-screen preview inspiration only

  **Acceptance Criteria**:
  - [ ] Card receipts and diagnostics prints are generated from `PrintDocument`, not directly from UI components.
  - [ ] Renderer supports paper widths `58` and `80`, optional art, QR, and cut behavior with graceful capability fallback.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Card receipt renders to ESC/POS operations
    Tool: Bash
    Steps: cd expo && bun run test -- --runInBand print-document-card
    Expected: Tests verify the card document yields ordered text/image/QR operations for both 58mm and 80mm widths.
    Evidence: .sisyphus/evidence/task-8-renderer.txt

  Scenario: Image-disabled printer falls back cleanly
    Tool: Bash
    Steps: cd expo && bun run test -- --runInBand print-document-capability-fallback
    Expected: Tests confirm unsupported art/image capability removes image output without breaking the rest of the receipt.
    Evidence: .sisyphus/evidence/task-8-renderer-error.txt
  ```

  **Commit**: YES | Message: `feat(print): add shared receipt renderer` | Files: `expo/services/printer/render/**`, `expo/services/printer/documents/**`

- [ ] 9. Replace the printer settings screen’s mock behavior with real registry + adapter actions

  **What to do**: Refactor `expo/app/(tabs)/settings/printer.tsx` to use the real registry service. Remove hard-coded mock device arrays/timers, wire `scan-printers`, device rows, connect/disconnect, save preferred printer, and test print. On iOS, hide/disable Classic Bluetooth scanning entirely and present BLE-only guidance. On web/test/dev fake-adapter paths, keep the same UI but feed deterministic fake devices. Preserve current `testID`s and add new ones for queue status and preferred-printer labels.
  **Must NOT do**: Do not keep `console.log`-driven fake scan timers. Do not show Classic Bluetooth as supported on iOS.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: existing complex screen plus behavior/state rewrite
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 10, 11, 12 | Blocked By: 5, 6, 7, 8

  **References**:
  - Pattern: `expo/app/(tabs)/settings/printer.tsx:33-40` — remove mock devices
  - Pattern: `expo/app/(tabs)/settings/printer.tsx:82-140` — replace scan/connect/test placeholder logic
  - Pattern: `expo/app/(tabs)/settings/printer.tsx:241-277` — connected card and test/disconnect actions
  - Pattern: `expo/app/(tabs)/settings/printer.tsx:281-367` — protocol section, scan CTA, and web notice behavior

  **Acceptance Criteria**:
  - [ ] Scanning, connecting, disconnecting, saving preferred printer, and test print use the real printer services.
  - [ ] iOS UI only exposes BLE support; Android/fake paths expose the transport list returned by the adapter.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Fake printer setup flow succeeds end-to-end
    Tool: Playwright
    Steps: Open the web preview, navigate to Settings > Printer, click [data-testid="scan-printers"], click [data-testid="device-fake-ble-1"], then trigger the Test button.
    Expected: The connected state appears, preferred printer label updates, and a successful test-print job is enqueued/completed through the fake adapter.
    Evidence: .sisyphus/evidence/task-9-printer-screen.png

  Scenario: iOS BLE-only warning and no classic toggle behavior
    Tool: Bash
    Steps: cd expo && bun run test -- --runInBand printer-screen-ios-ble-only
    Expected: Component tests confirm Classic Bluetooth controls are hidden/disabled on iOS while BLE guidance remains visible.
    Evidence: .sisyphus/evidence/task-9-printer-screen-error.txt
  ```

  **Commit**: YES | Message: `feat(settings): wire real printer setup flow` | Files: `expo/app/(tabs)/settings/printer.tsx`, `expo/services/printer/**`

- [x] 10. Replace print-preview placeholder alerts with queue-backed printing

  **What to do**: Refactor `expo/app/print-preview.tsx` so `handlePrint` builds a card `PrintDocument`, enqueues a print job to the preferred printer, and surfaces queue status instead of placeholder success alerts. Preserve the existing dev-mode save-to-gallery path as a non-printer diagnostic fallback. Add testIDs for enqueue success/error banners and pending-job state.
  **Must NOT do**: Do not call the native adapter directly from the screen. Do not discard the existing preview UI.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: screen-level state rewrite with queue feedback
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 11, 12 | Blocked By: 6, 7, 8, 9

  **References**:
  - Pattern: `expo/app/print-preview.tsx:74-114` — preserve current dev-mode save-to-gallery fallback
  - Pattern: `expo/app/print-preview.tsx:116-140` — replace placeholder print alert logic
  - Pattern: `expo/app/print-preview.tsx:270-305` — existing footer print CTA and `confirm-print` testID

  **Acceptance Criteria**:
  - [ ] Print preview enqueues a real print job when a preferred printer exists.
  - [ ] When no printer is selected, the screen shows a deterministic actionable error and does not enqueue a job.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Preview print enqueues job successfully
    Tool: Playwright
    Steps: Open a card, navigate to /print-preview, ensure a fake preferred printer is already connected, click [data-testid="confirm-print"].
    Expected: A success/pending indicator appears, one job is added to the queue, and the fake adapter marks it completed.
    Evidence: .sisyphus/evidence/task-10-print-preview.png

  Scenario: No-printer path blocks enqueue
    Tool: Playwright
    Steps: Open /print-preview without a preferred printer, click [data-testid="confirm-print"].
    Expected: An error banner/modal explains that no printer is connected and the queue count stays unchanged.
    Evidence: .sisyphus/evidence/task-10-print-preview-error.png
  ```

  **Commit**: YES | Message: `feat(print): enqueue preview print jobs` | Files: `expo/app/print-preview.tsx`, `expo/services/printer/**`

-[x] 11. Wire auto-print and all current print entrypoints through the same queue path

  **What to do**: Standardize all current print-related entrypoints in the repo on the same document + queue pipeline. Keep the existing card-detail → print-preview navigation, and when `autoPrint` is enabled, enqueue the same card receipt automatically after a successful card fetch/reroll event. Ensure repeated manual taps create intentional new jobs, while automatic retries reuse the same job record. Explicitly keep scope to the repo’s current entrypoints only: printer test print, preview print, and auto-print of the card receipt flow.
  **Must NOT do**: Do not invent history/session printouts in v1. Do not bypass preview logic with a separate ad-hoc renderer.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: entrypoint coordination across screens and queue semantics
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 12 | Blocked By: 6, 7, 10

  **References**:
  - Pattern: `expo/app/card.tsx:120-127` — current manual print entrypoint into preview
  - API/Type: `expo/types/index.ts:72-88` — current autoPrint setting location to preserve semantically
  - Pattern: `expo/providers/SettingsProvider.tsx:63-69` — printer preference update path

  **Acceptance Criteria**:
  - [ ] `autoPrint=true` automatically enqueues one card receipt after a successful card generation event.
  - [ ] Manual print actions and automatic retries do not create duplicate queue rows for the same retry cycle.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Auto-print enqueues one job after card generation
    Tool: Bash
    Steps: cd expo && bun run test -- --runInBand card-auto-print
    Expected: Tests show one job is created when autoPrint is enabled and none are created when it is disabled.
    Evidence: .sisyphus/evidence/task-11-auto-print.txt

  Scenario: Retry path does not duplicate queue entries
    Tool: Bash
    Steps: cd expo && bun run test -- --runInBand auto-print-dedup
    Expected: Tests prove the same queued job is retried in place rather than inserting a second job row.
    Evidence: .sisyphus/evidence/task-11-auto-print-error.txt
  ```

  **Commit**: YES | Message: `feat(print): wire auto-print entrypoints` | Files: `expo/app/card.tsx`, `expo/services/printer/**`, `expo/providers/SettingsProvider.tsx`

-[x] 12. Add queue lifecycle processing, retry controls, and operator-visible status UX

  **What to do**: Start queue processing on app launch, foreground resume, preferred-printer connect, and explicit retry actions. Add minimal operator-facing status surfaces: pending/completed/failed badges, last error, retry button for `failed_manual`, and current preferred printer status. Put queue summaries where they naturally fit without inventing a new feature area: printer settings screen and print preview feedback. Add selector/testIDs for `queue-status-badge`, `retry-print-job`, and `preferred-printer-status`.
  **Must NOT do**: Do not add background execution promises the app cannot guarantee. Do not create a brand-new standalone print-center screen in v1.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: lifecycle hooks plus targeted UX feedback in existing screens
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None available

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: none | Blocked By: 4, 7, 9, 10, 11

  **References**:
  - Pattern: `expo/providers/SettingsProvider.tsx:27-77` — existing provider composition approach to extend
  - Pattern: `expo/app/(tabs)/settings/printer.tsx:241-277` — natural location for preferred printer and test-print status
  - Pattern: `expo/app/print-preview.tsx:270-305` — natural location for enqueue/pending/completed feedback

  **Acceptance Criteria**:
  - [ ] Queue worker starts on app mount/resume and on explicit retry requests.
  - [ ] Failed manual jobs expose retry controls and visible last-error messaging in the existing UI surfaces.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Manual retry clears failed_manual job
    Tool: Playwright
    Steps: Seed a fake failed_manual job, open Settings > Printer, click [data-testid="retry-print-job"].
    Expected: The job transitions back to queued/dispatching and then completed through the fake adapter.
    Evidence: .sisyphus/evidence/task-12-queue-ux.png

  Scenario: App resume restarts queue processing
    Tool: Bash
    Steps: cd expo && bun run test -- --runInBand queue-resume-processing
    Expected: Tests confirm pending jobs are picked up when the lifecycle resume hook fires.
    Evidence: .sisyphus/evidence/task-12-queue-ux-error.txt
  ```

  **Commit**: YES | Message: `feat(printer): finalize queue lifecycle and status ux` | Files: `expo/app/(tabs)/settings/printer.tsx`, `expo/app/print-preview.tsx`, `expo/providers/**`, `expo/services/printer/**`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit 1: native prerequisites + testing scaffold
- Commit 2: printer domain + persistence + adapter engine
- Commit 3: renderer + settings screen integration
- Commit 4: preview/auto-print/queue UX + final tests

## Success Criteria
- Printer setup screen performs real discovery/connect/save/test/disconnect behavior instead of mock timers.
- Print-preview screen enqueues real jobs instead of showing placeholder alerts.
- Auto-print works from the existing card flow without creating duplicate jobs on retries.
- Saved printer selection survives restarts using stable registry IDs.
- Queue survives restarts, retries bounded failures automatically, and exposes manual retry for uncertain writes.
- Web/test environments use deterministic fake printers so CI-style automation remains possible.

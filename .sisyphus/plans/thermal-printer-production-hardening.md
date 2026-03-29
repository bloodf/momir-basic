# Thermal Printer Production Hardening

## TL;DR
> **Summary**: Harden the current thermal-printer stack so the app uses only real transport paths, removes fake/mock runtime behavior, and reaches certified real-hardware reliability across supported transports.
> **Deliverables**:
> - Real-only printer runtime architecture with no fake/mock production path
> - Transport-specific support contract for Android/iOS with certified hardware matrix
> - Real-device permission, connection, queue, and print validation evidence
> - Native observability, diagnostics, and release sign-off packet for thermal printing
> **Effort**: XL
> **Parallel**: YES - 4 waves
> **Critical Path**: 1 → 2 → 3 → 5 → 8 → 9 → 11 → 12 → F1-F4

## Context
### Original Request
Make the thermal printer work “100%”, remove any mock process or mocked device, and create a plan to make the real thermal printer work reliably.

### Interview Summary
- User wants **real thermal-printer reliability**, not simulated success.
- User selected **Any ESC/POS printer** as the target expectation.
- User selected **Remove everywhere** for mocks/fallbacks.
- User selected **Android + iOS** as scope.
- User selected **BLE + Classic + TCP** as transport scope.
- User requested **universal compatibility** rather than a certified support matrix.
- User requested **all iOS Classic support**, not just MFi / External Accessory hardware.

### Metis Review (gaps addressed)
- Universal “100% any ESC/POS printer” is not technically defensible; the plan therefore certifies a support matrix and treats off-matrix printers as non-goals.
- iOS Bluetooth Classic must be treated as **MFi / External Accessory only** unless proven otherwise with actual hardware.
- Acceptance criteria must prove runtime permissions, transport mapping, queue semantics, and real-hardware evidence — not web/fake coverage.
- If the user insists on universal compatibility or non-MFi iOS Classic, the release packet must classify those as **blocked / unproven requirements** unless hardware proof is produced.

## Work Objectives
### Core Objective
Deliver a real-device, production-safe thermal-printer stack that is reliable on certified hardware, uses no fake/mock production paths, and has explicit transport/platform boundaries.

### Deliverables
- Real-only printer adapter selection path
- Certified support contract by platform/transport/printer model
- Fixed transport/identity/queue semantics across discovery, connect, print, retry, and reconnect
- Runtime permission handling and printer-state UI for Android/iOS
- Real ESC/POS print pipeline for text, QR, images, cut, and diagnostics
- Hardware certification evidence pack for Android + iOS

### Definition of Done (verifiable conditions with commands)
- `cd expo && bun run lint` exits without errors.
- `cd expo && bunx tsc --noEmit` exits cleanly.
- `cd expo && bun run test -- --runInBand` exits cleanly after fake/mock runtime paths are removed.
- `cd expo && npx expo run:android --variant release` succeeds, or `cd expo && eas build --platform android --local --profile preview` succeeds if local EAS is the chosen build lane.
- `adb devices` shows the Android certification device and `adb logcat` evidence is captured for printer sessions.
- Real-device evidence exists for each certified printer / transport / platform combination in `.sisyphus/evidence/`.
- No production runtime path references `FakePrinterAdapter`, web fallback printer devices, or mocked native printer modules.

### Must Have
- No fake/mock runtime printer path in production, development builds, or hardware QA flows
- Explicit certified support matrix for printer model + platform + transport
- Explicit iOS Classic gate: MFi only or excluded
- Deterministic queue semantics for disconnects, retries, and uncertain delivery
- Real-device diagnostics and log capture path
- Explicit blocker classification for any requested but unprovable compatibility claim
- Explicit blocker classification if certification hardware inventory is not yet provisioned

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No universal “works with everything” claim without certification evidence.
- No silent fallback from unknown/native failure to fake success.
- No web/Playwright fake coverage counted as printer reliability evidence.
- No source of truth mismatch between printer registry identity and transport address.
- No release sign-off without physical printer evidence.
- No non-MFi iOS Classic support claim without actual platform/hardware proof.

## Verification Strategy
> ZERO HUMAN INTERVENTION is the default for code verification. Real printer certification requires agent-executed device/hardware runs with captured evidence.
- Test decision: **TDD** for transport contract, permission state, queue semantics, and adapter factory isolation
- QA policy: Every task includes agent-executed scenarios; hardware tasks require device + printer evidence capture
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
Wave 1: support contract + runtime-path removal + transport/identity corrections
Wave 2: permissions + native adapter lifecycle + ESC/POS capability hardening
Wave 3: queue/recovery + UI hardening + diagnostics/observability
Wave 4: hardware certification matrix + release sign-off packet

### Dependency Matrix (full, all tasks)
- 1 blocks 2, 3, 4, 5, 6, 7, 9, 11, 12
- 2 blocks 8, 9, 10, 11, 12
- 3 blocks 5, 7, 8, 9, 11, 12
- 4 blocks 9, 11, 12
- 5 blocks 8, 9, 11, 12
- 6 blocks 9, 11, 12
- 7 blocks 8, 9, 11, 12
- 8 blocks 9, 11, 12
- 9 blocks 11, 12
- 10 blocks 11, 12
- 11 blocks 12

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 4 tasks → deep, unspecified-high
- Wave 2 → 3 tasks → unspecified-high, deep
- Wave 3 → 3 tasks → deep, unspecified-high
- Wave 4 → 2 tasks → deep, unspecified-high

## TODOs

- [x] 1. Lock the printer support contract and certification matrix

  **What to do**: Define the only supported combinations for v1 hardening. Default contract: Android supports BLE + Classic + TCP for certified ESC/POS printers; iOS supports BLE + TCP, and **Bluetooth Classic only if MFi / External Accessory hardware is explicitly available**. Create a certification matrix naming each printer model, firmware, transport, paper width, platform version, and build type required for sign-off. Add the concrete certification inventory: exact printer models, exact Android device(s), exact iPhone/iPad device(s), OS versions, and the owner/source for each piece of hardware. Replace all “any ESC/POS” language with “certified support matrix; off-matrix printers are best-effort/non-goal.” If product leadership still requires universal compatibility or non-MFi iOS Classic, record those as blocked requirements that must be backed by hardware proof before release sign-off.
  **Must NOT do**: Do not promise universal compatibility. Do not leave iOS Classic ambiguous.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: cross-platform product contract with hard native constraints
  - Skills: `[]` — No repo skills available
  - Omitted: `[]` — None

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2, 3, 4, 5, 6, 7, 9, 11, 12 | Blocked By: none

  **References**:
  - Pattern: `expo/docs/PRINTER.md` — existing printer docs to tighten into a real support contract
  - Pattern: `expo/docs/release/HARDWARE_VALIDATION.md` — current blocked hardware-validation doc to replace with certification matrix
  - Pattern: `expo/app.json` — current declared platform permissions and native assumptions
  - External: `react-native-thermal-pos-printer` production constraints summarized by librarian review

  **Acceptance Criteria**:
  - [ ] A repo-backed certification matrix exists naming supported printer models/transports/platforms.
  - [ ] The matrix includes the concrete hardware inventory and owner/source for each required certification device and printer.
  - [ ] iOS Classic support is explicitly marked as MFi-only or excluded.
  - [ ] All release/printer docs stop claiming universal ESC/POS compatibility.
  - [ ] Any remaining demand for universal compatibility or non-MFi iOS Classic is explicitly classified as blocked/unproven in the release packet.
  - [ ] If certification hardware inventory is unavailable, the plan documents `[DECISION NEEDED: certification hardware inventory]` before Wave 4 starts.

  **QA Scenarios**:
  ```
  Scenario: Contract docs are internally consistent
    Tool: Bash
    Steps: grep -RniE 'any ESC/POS|100% compatible with all' expo/docs expo/app.json
    Expected: No unconditional universal-compatibility claim remains.
    Evidence: .sisyphus/evidence/task-1-support-contract.txt

  Scenario: iOS Classic gate is explicit
    Tool: Bash
    Steps: grep -RniE 'MFi|External Accessory|Classic' expo/docs/release expo/docs/PRINTER.md
    Expected: Docs explicitly state whether iOS Classic is supported and under what hardware restriction.
    Evidence: .sisyphus/evidence/task-1-support-contract-error.txt

  Scenario: Hardware inventory is concrete
    Tool: Bash
    Steps: grep -RniE 'printer model|firmware|owner|android device|iphone|ipad|inventory' expo/docs/release expo/docs/PRINTER.md
    Expected: Certification docs name the actual devices/printers and who provides them for Wave 4.
    Evidence: .sisyphus/evidence/task-1-support-contract-inventory.txt
  ```

  **Commit**: YES | Message: `docs(printer): define support contract and certification matrix` | Files: printer/release docs

- [x] 2. Remove fake/mock printer runtime selection from the app

  **What to do**: Delete `FakePrinterAdapter` from all runtime selection paths and stop selecting fake behavior on web, native-module absence, or test-like environments in production code. Replace factory behavior with explicit failure states: unsupported platform, missing native module, unavailable transport, or test-only injection behind test-only entrypoints. Remove web fake-printer UX from `expo/app/(tabs)/settings/printer.tsx` and any printer success path that depends on fake devices.
  **Must NOT do**: Do not silently fall back to fake on missing native modules. Do not keep fake printer success UI in real app flows.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: runtime-architecture cleanup with user-visible consequences
  - Skills: `[]` — No repo skills available
  - Omitted: `[]`

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 8, 9, 10, 11, 12 | Blocked By: 1

  **References**:
  - Pattern: `expo/services/printer/adapters/factory.ts` — current real-vs-fake selection path
  - Pattern: `expo/services/printer/adapters/fake.ts` — fake adapter to remove from runtime architecture
  - Pattern: `expo/app/(tabs)/settings/printer.tsx` — fake/web printer UX to delete or convert to explicit unsupported state
  - Pattern: `expo/e2e/printer-qa.spec.ts` — fake-driven E2E to replace later with real-path QA

  **Acceptance Criteria**:
  - [ ] Production/dev runtime factory never returns `FakePrinterAdapter`.
  - [ ] Missing native module produces explicit unsupported/error state, not fake success.
  - [ ] Settings/print-preview screens no longer expose fake device discovery or fake success UX.

  **QA Scenarios**:
  ```
  Scenario: No fake adapter remains in runtime path
    Tool: Bash
    Steps: grep -Rni 'FakePrinterAdapter\|setFailureMode\|usesFakeAdapter' expo/services/printer expo/app
    Expected: Runtime code contains no fake-adapter selection or fake-printer UX paths.
    Evidence: .sisyphus/evidence/task-2-remove-fake-runtime.txt

  Scenario: Missing native module fails closed
    Tool: Bash / interactive_bash
    Steps: Run targeted tests for adapter factory behavior after removing fake fallback; inspect thrown error messages or unsupported states.
    Expected: Factory returns explicit unsupported/native-module-missing error and never a fake adapter.
    Evidence: .sisyphus/evidence/task-2-remove-fake-runtime-error.txt
  ```

  **Commit**: YES | Message: `refactor(printer): remove fake runtime adapter paths` | Files: adapter factory, printer UI, related tests

- [x] 3. Fix transport mapping and printer identity contract

  **What to do**: Standardize printer identity so every connect/dispatch path uses the same canonical transport address plus transport type, not a registry-only ID. Remove any default-to-BLE behavior for unknown transport. Ensure registry persistence, queue jobs, current-device tracking, and reconnect logic all use the same fields. Add explicit transport enums for BLE, Classic, and TCP with validation at boundaries.
  **Must NOT do**: Do not allow unknown transport to downgrade to BLE. Do not mix `printerId` and `address` semantics.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: cross-layer data contract and retry semantics
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 5, 7, 8, 9, 11, 12 | Blocked By: 1

  **References**:
  - Pattern: `expo/services/printer/registry/service.ts` — discovery/connection merges by address and transport
  - Pattern: `expo/services/printer/queue/engine.ts` — dispatch path suspected to use wrong identity field
  - Pattern: `expo/services/printer/adapters/native.ts` — transport defaults and connection semantics
  - Pattern: `expo/types/index.ts` — printer/job type contracts

  **Acceptance Criteria**:
  - [ ] Queue jobs store and use canonical printer address + transport, not ambiguous registry-only identifiers.
  - [ ] Unknown transport fails with explicit error.
  - [ ] Reconnect/disconnect logic references the same canonical printer identity across registry, queue, and adapter layers.

  **QA Scenarios**:
  ```
  Scenario: Queue dispatch uses canonical address
    Tool: Bash
    Steps: Run targeted printer queue tests covering discovery -> save -> enqueue -> dispatch using different registry IDs for the same address.
    Expected: Connect path uses address+transport consistently and never fails due to registry ID/address mismatch.
    Evidence: .sisyphus/evidence/task-3-identity-contract.txt

  Scenario: Unknown transport fails closed
    Tool: Bash
    Steps: Run a targeted unit test that injects an unsupported transport value into adapter creation.
    Expected: Adapter creation fails with explicit unsupported-transport error; no BLE fallback occurs.
    Evidence: .sisyphus/evidence/task-3-identity-contract-error.txt
  ```

  **Commit**: YES | Message: `fix(printer): unify transport and printer identity contract` | Files: registry, queue, adapter, types, tests

- [x] 4. Replace mock-driven printer tests with real contract tests

  **What to do**: Delete printer-domain tests that assert fake device behavior as a proxy for runtime correctness. Replace them with TDD coverage for explicit unsupported/native-missing failures, transport validation, canonical identity, queue semantics, and renderer byte contracts. Keep only minimal test doubles needed to isolate units; no fake device discovery or fake printer success scenarios remain in printer-domain tests.
  **Must NOT do**: Do not preserve web fake-printer E2E as proof of printer functionality.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: test architecture reset
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 9, 11, 12 | Blocked By: 1

  **References**:
  - Pattern: `expo/__tests__/printer/native-printer-adapter.test.ts` — currently mock-driven adapter tests
  - Pattern: `expo/__tests__/printer/printer-queue-engine.test.ts` — currently queue tests with fake adapter
  - Pattern: `expo/e2e/printer-qa.spec.ts` — current fake/web E2E to replace with non-printer-ui coverage only
  - Pattern: `expo/jest.config.js` — native mocks currently masking runtime failures

  **Acceptance Criteria**:
  - [ ] Printer-domain test suite no longer asserts fake-device happy paths.
  - [ ] Tests fail if runtime factory selects a fake adapter.
  - [ ] Printer QA evidence is reoriented toward real-device validation instead of simulated printer success.

  **QA Scenarios**:
  ```
  Scenario: Printer tests fail on fake runtime usage
    Tool: Bash
    Steps: cd expo && bun run test -- --runInBand printer
    Expected: Printer suite passes without fake-device success fixtures and contains assertions for real runtime failure states.
    Evidence: .sisyphus/evidence/task-4-test-reset.txt

  Scenario: Web fake E2E no longer counts as printer proof
    Tool: Bash
    Steps: grep -Rni 'FakePrinterAdapter\|fake printer\|mocked device' expo/e2e expo/__tests__/printer
    Expected: No printer-functionality proof depends on fake device discovery or mocked device success.
    Evidence: .sisyphus/evidence/task-4-test-reset-error.txt
  ```

  **Commit**: YES | Message: `test(printer): replace fake-path coverage with contract tests` | Files: printer tests, jest config, e2e coverage

- [x] 5. Implement explicit Android/iOS capability and runtime permission flow

  **What to do**: Add a printer capability state machine that computes support by platform + transport + native module presence. On Android, implement explicit runtime permission requests and denial/recovery UX for `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`, and any additional required scan permissions per SDK level. On iOS, gate unsupported Classic flows with explicit messaging and remove unsupported actions from the UI.
  **Must NOT do**: Do not rely on manifest-only permissions. Do not expose unsupported transport actions on iOS.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: permission model + transport gating across platforms
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8, 9, 11, 12 | Blocked By: 3

  **References**:
  - Pattern: `expo/app.json` — current declared Bluetooth permissions
  - Pattern: `expo/app/(tabs)/settings/printer.tsx` — printer setup UI that must expose real capability/permission states
  - Pattern: `expo/services/printer/registry/service.ts` — current scan/discovery assumptions
  - External: librarian summary for `react-native-thermal-pos-printer` Android 12+ permission constraints

  **Acceptance Criteria**:
  - [ ] Android requests runtime Bluetooth permissions before scan/connect.
  - [ ] Denied permission state renders explicit remediation UX and blocks scan/connect.
  - [ ] iOS unsupported Classic actions are hidden or blocked with explicit messaging.

  **QA Scenarios**:
  ```
  Scenario: Android first-run permission grant
    Tool: interactive_bash / Bash
    Steps: Install Android build on device, clear app data, launch printer settings, trigger scan, grant permissions when prompted, capture logcat and screenshot.
    Expected: Permission prompt appears before scan, scan begins only after grant, and evidence records granted state.
    Evidence: .sisyphus/evidence/task-5-permissions.txt

  Scenario: Android permission denial recovery
    Tool: interactive_bash / Bash
    Steps: Clear app data, deny Bluetooth permissions on first scan, retry from settings, inspect UI state and logcat.
    Expected: App shows blocked/remediation state, does not report successful scan/connect, and provides a retry/settings path.
    Evidence: .sisyphus/evidence/task-5-permissions-error.txt
  ```

  **Commit**: YES | Message: `feat(printer): add runtime permission and capability gating` | Files: printer UI, platform capability service, tests

- [x] 6. Harden native adapter lifecycle for BLE, Classic, and TCP

  **What to do**: Refactor `NativeThermalPrinterAdapter` so connect/disconnect/send/isConnected/getCurrentDevice lifecycle is transport-aware, fails closed on unsupported or stale states, and records explicit error categories. Verify pairing assumptions, current-device state, disconnect semantics, and reconnect behavior. For TCP, add explicit host/port validation and timeouts instead of overloading Bluetooth assumptions.
  **Must NOT do**: Do not treat all transports as equivalent. Do not trust stale native current-device state after disconnects.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: native bridge lifecycle hardening
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8, 9, 11, 12 | Blocked By: 1, 3

  **References**:
  - Pattern: `expo/services/printer/adapters/native.ts` — current native lifecycle implementation
  - Pattern: `expo/services/printer/adapters/port.ts` — port contract to tighten
  - Pattern: `expo/services/printer/registry/service.ts` — scan/connect entrypoints
  - External: librarian summary for pairing lifecycle and connection-state fragility

  **Acceptance Criteria**:
  - [ ] Adapter methods are transport-aware and return explicit typed failures.
  - [ ] Disconnect/reconnect behavior is deterministic for BLE, Classic, and TCP.
  - [ ] TCP configuration is validated separately from Bluetooth flows.

  **QA Scenarios**:
  ```
  Scenario: Successful connect-print-disconnect per transport
    Tool: interactive_bash / Bash
    Steps: On certified hardware, run diagnostics print over BLE, Classic, and TCP using captured device identifiers and logcat.
    Expected: Each supported transport connects, prints diagnostics, disconnects cleanly, and logs the correct transport type.
    Evidence: .sisyphus/evidence/task-6-adapter-lifecycle.txt

  Scenario: Stale/disconnected state fails explicitly
    Tool: interactive_bash / Bash
    Steps: Connect to a printer, power it off or drop Wi-Fi/TCP mid-session, then issue a new print.
    Expected: Adapter reports explicit disconnect/timeout error, queue does not mark the job as completed, and no stale connected state remains.
    Evidence: .sisyphus/evidence/task-6-adapter-lifecycle-error.txt
  ```

  **Commit**: YES | Message: `fix(printer): harden native adapter lifecycle by transport` | Files: native adapter, registry, tests

- [x] 7. Fix ESC/POS rendering for real device output

  **What to do**: Replace any placeholder image-printing path with real raster/image conversion suitable for certified printers. Validate paper width handling, command chunking, QR generation, cut behavior, and printer-specific capability flags. Add capability metadata so printers that cannot support images/cut/QR fail with explicit unsupported messages instead of silent success.
  **Must NOT do**: Do not leave placeholder image bytes or assume all printers support the same ESC/POS feature set.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: protocol-level output correctness
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8, 9, 11, 12 | Blocked By: 1, 3

  **References**:
  - Pattern: `expo/services/printer/render/escpos.ts` — current renderer, suspected placeholder image path
  - Pattern: `expo/services/printer/render/document.ts` — diagnostics and card document composition
  - Pattern: `expo/__tests__/printer/escpos-renderer.test.ts` — existing renderer unit coverage to upgrade

  **Acceptance Criteria**:
  - [ ] Image printing no longer uses placeholder raster data.
  - [ ] Renderer emits transport-safe/chunk-safe output for certified devices.
  - [ ] Unsupported print capabilities surface explicit errors per printer profile.

  **QA Scenarios**:
  ```
  Scenario: Diagnostics card prints text, QR, and image correctly
    Tool: interactive_bash / Bash
    Steps: Send the diagnostics document and a representative card receipt to each certified printer and capture photo/video evidence.
    Expected: Text alignment, QR readability, image/logo output, and cut behavior match the documented printer profile.
    Evidence: .sisyphus/evidence/task-7-escpos-rendering.txt

  Scenario: Unsupported capability fails explicitly
    Tool: Bash / interactive_bash
    Steps: Attempt an image/cut/QR print on a printer profile marked unsupported for that capability.
    Expected: App reports explicit unsupported-capability error and does not claim successful output.
    Evidence: .sisyphus/evidence/task-7-escpos-rendering-error.txt
  ```

  **Commit**: YES | Message: `fix(printer): harden escpos rendering for real devices` | Files: renderer, documents, tests

- [x] 8. Make queue semantics deterministic for uncertain delivery

  **What to do**: Redesign queue semantics around explicit outcomes: `queued`, `printing`, `printed_confirmed`, `failed_retryable`, `failed_terminal`, and `sent_unknown` for disconnects during write. Add operator-visible reconciliation so duplicate-print risk is surfaced. Ensure retries are transport-aware and tied to canonical printer identity. Persist enough metadata to resume safely after app restarts.
  **Must NOT do**: Do not mark jobs complete on uncertain transport failure. Do not auto-retry blindly on ambiguous delivery.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: state machine / idempotency / recovery semantics
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 9, 11, 12 | Blocked By: 2, 3, 5, 6, 7

  **References**:
  - Pattern: `expo/services/printer/queue/engine.ts` — current retry and dispatch state machine
  - Pattern: `expo/services/printer/storage/repositories.ts` — print job persistence
  - Pattern: `expo/providers/SettingsProvider.tsx` — stale connected-state assumptions to remove

  **Acceptance Criteria**:
  - [ ] Queue distinguishes confirmed print, retryable failure, and uncertain delivery.
  - [ ] App restart resumes jobs safely without duplicate silent printing.
  - [ ] Retry logic is transport-aware and tied to canonical printer identity.

  **QA Scenarios**:
  ```
  Scenario: Disconnect mid-print enters sent_unknown
    Tool: interactive_bash / Bash
    Steps: Start a long print, interrupt the connection mid-write, relaunch app if needed, and inspect job state plus logcat.
    Expected: Job ends in sent_unknown (or equivalent explicit ambiguous state), not completed, and UI offers operator reconciliation.
    Evidence: .sisyphus/evidence/task-8-queue-semantics.txt

  Scenario: Retryable failure resumes safely after restart
    Tool: interactive_bash / Bash
    Steps: Force a retryable error, kill the app, relaunch, and observe queued job recovery.
    Expected: Job remains retryable/queued with same canonical printer identity and does not duplicate silently.
    Evidence: .sisyphus/evidence/task-8-queue-semantics-error.txt
  ```

  **Commit**: YES | Message: `fix(printer): make queue delivery semantics deterministic` | Files: queue engine, storage, settings, tests

- [x] 9. Rebuild the printer UI around real hardware states only

  **What to do**: Rewrite the printer settings and print-preview flows so they expose only real capability/permission/transport states. Add explicit scan state, pairing guidance, connection lifecycle, diagnostics print, queue reconciliation, unsupported transport messaging, and TCP printer entry/config where supported. Remove all fake-device cues and success states. Ensure the UI is actionable when the printer is unavailable, denied, disconnected, unsupported, or uncertain.
  **Must NOT do**: Do not preserve legacy mock scan/connect flows. Do not show “connected” based on stale flags alone.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: user-visible reliability and recovery flow redesign
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 11, 12 | Blocked By: 2, 3, 4, 5, 6, 7, 8

  **References**:
  - Pattern: `expo/app/(tabs)/settings/printer.tsx` — current setup and queue UI
  - Pattern: `expo/app/print-preview.tsx` — current receipt preview and enqueue entrypoint
  - Pattern: `expo/services/printer/registry/service.ts` — backing service behavior that UI must reflect
  - Pattern: `expo/services/printer/queue/engine.ts` — queue states that must become visible to users

  **Acceptance Criteria**:
  - [ ] Printer UI contains only real device states and actions.
  - [ ] Denied permission, unsupported transport, disconnected printer, and uncertain delivery each have distinct UI states.
  - [ ] TCP setup and certified printer details are visible where supported.

  **QA Scenarios**:
  ```
  Scenario: Android printer setup happy path
    Tool: interactive_bash / Bash
    Steps: Launch printer settings on Android device, grant permissions, scan certified printer, connect, run diagnostics print, then print a card from print preview.
    Expected: UI transitions through scanning, connected, diagnostics success, and job completion without fake states or stale flags.
    Evidence: .sisyphus/evidence/task-9-printer-ui.txt

  Scenario: Unsupported/disconnected state recovery
    Tool: interactive_bash / Bash
    Steps: Attempt to use unsupported transport on iOS or disconnect a connected printer before print preview submission.
    Expected: UI shows specific unsupported/disconnected guidance and prevents false success.
    Evidence: .sisyphus/evidence/task-9-printer-ui-error.txt
  ```

  **Commit**: YES | Message: `feat(printer): rebuild ui around real hardware states` | Files: printer settings, print preview, related hooks/tests

- [x] 10. Add native diagnostics, log capture, and printer-session observability

  **What to do**: Add structured printer-session logging around permissions, scan results, transport selection, connect/disconnect events, print job lifecycle, and native module errors. Define adb/logcat capture commands, iOS device log capture, and evidence collection scripts so every certification run produces reproducible diagnostics. Integrate release-critical error reporting for printer failures only after event taxonomy is defined.
  **Must NOT do**: Do not add generic analytics expansion. Do not leave native printer failures unclassified.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: observability + native diagnostics tooling
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 11, 12 | Blocked By: 2

  **References**:
  - Pattern: `expo/docs/release/OBSERVABILITY.md` — release observability baseline to extend for printer sessions
  - Pattern: `expo/docs/release/HARDWARE_VALIDATION.md` — current evidence expectations to replace with executable diagnostics
  - Pattern: `expo/services/printer/*` — lifecycle points needing event capture

  **Acceptance Criteria**:
  - [ ] Every printer session emits structured events for permission, transport, connect, send, disconnect, and queue outcome.
  - [ ] adb/logcat and iOS log collection commands are documented and executable.
  - [ ] Hardware certification evidence includes logs tied to device/printer/build identifiers.

  **QA Scenarios**:
  ```
  Scenario: Android session logs captured end-to-end
    Tool: Bash
    Steps: Run adb logcat capture while executing scan -> connect -> diagnostics print -> card print on a certified Android device.
    Expected: Evidence file contains structured session events correlated to the print job and printer address.
    Evidence: .sisyphus/evidence/task-10-observability.txt

  Scenario: Native error taxonomy captured on failure
    Tool: Bash / interactive_bash
    Steps: Trigger a known failure (permission denied, printer off, timeout) and inspect log output.
    Expected: Failure is logged with explicit category, transport, platform, and job state; no generic “unknown error” only.
    Evidence: .sisyphus/evidence/task-10-observability-error.txt
  ```

  **Commit**: YES | Message: `feat(printer): add native diagnostics and session observability` | Files: printer services, docs, evidence scripts

- [ ] 11. Execute the certified hardware matrix across Android and iOS

  **What to do**: Run the printer certification matrix on named printers only. Before execution, confirm the certification inventory from Task 1 exists; if it does not, stop on `[DECISION NEEDED: certification hardware inventory]` and do not continue Wave 4. For each certified combination, capture build ID, OS version, printer model, firmware if available, transport, setup path, diagnostics print, card print, disconnect/reconnect, denied-permission recovery, printer-off recovery, and duplicate-risk behavior. Fail any combination that cannot pass its exact contract. Record unsupported combinations explicitly.
  **Must NOT do**: Do not mark off-matrix printers as supported. Do not use simulators/emulators as printer evidence.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: hardware-heavy validation matrix execution
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 12 | Blocked By: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10

  **References**:
  - Pattern: `expo/docs/release/HARDWARE_VALIDATION.md` — existing hardware validation placeholder to replace
  - Pattern: `expo/docs/release/BUILD_REHEARSAL.md` — build evidence expectations
  - Pattern: `expo/docs/release/LAUNCH_PACKET.md` — final sign-off packet to update with certified matrix results

  **Acceptance Criteria**:
  - [ ] Wave 4 does not begin without the concrete certification inventory from Task 1.
  - [ ] Certified matrix evidence exists for every supported platform/transport/printer combination.
  - [ ] Unsupported combinations are explicitly documented as unsupported, not silently omitted.
  - [ ] Each certified combination has logs, screenshots/video, build ID, and printer identification evidence.

  **QA Scenarios**:
  ```
  Scenario: Certified combination passes end-to-end
    Tool: interactive_bash / Bash
    Steps: For each matrix row, run install -> permission/setup -> connect -> diagnostics print -> card print -> reconnect -> retry/error drills and capture all evidence files.
    Expected: Combination passes every required step and produces complete evidence packet with logs and media.
    Evidence: .sisyphus/evidence/task-11-certification-matrix.txt

  Scenario: Off-matrix or unsupported combination is rejected cleanly
    Tool: interactive_bash / Bash
    Steps: Attempt a transport/printer/platform combination outside the certified matrix.
    Expected: App/docs classify it as unsupported or best-effort; release packet does not claim support.
    Evidence: .sisyphus/evidence/task-11-certification-matrix-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: evidence + docs updates only as appropriate

- [ ] 12. Produce the printer release sign-off packet

  **What to do**: Consolidate support contract, non-goals, certification matrix, runtime architecture decisions, transport constraints, observability, known limitations, hardware evidence, and publish/no-publish recommendation into a single printer release packet. Include explicit blockers for anything unresolved, especially iOS Classic MFi scope, any uncertified printers, and missing certification inventory.
  **Must NOT do**: Do not issue a printer-ready approval without complete certified-matrix evidence.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: cross-functional synthesis and release decisioning
  - Skills: `[]`
  - Omitted: `[]`

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: F1-F4 | Blocked By: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11

  **References**:
  - Pattern: `expo/docs/release/LAUNCH_PACKET.md` — release packet structure to extend
  - Pattern: `expo/docs/release/RELEASE_RUNBOOK.md` — runbook update location
  - Pattern: all printer docs and evidence generated by tasks 1-11

  **Acceptance Criteria**:
  - [ ] Printer release packet states exactly what is supported, unsupported, certified, and blocked.
  - [ ] Publish/no-publish decision for printer feature can be made without new discovery work.
  - [ ] All open issues are classified as blocker, known limitation, or non-goal.

  **QA Scenarios**:
  ```
  Scenario: Release packet completeness audit
    Tool: Bash
    Steps: Verify final printer packet references certification matrix, evidence files, support contract, and unresolved blockers.
    Expected: Packet is decision-complete and contains no unresolved TODO/TBD placeholders.
    Evidence: .sisyphus/evidence/task-12-printer-release-packet.txt

  Scenario: Unsupported scope is explicit
    Tool: Bash
    Steps: grep -RniE 'TODO|TBD|maybe|probably supports' expo/docs/release expo/docs/PRINTER.md
    Expected: No ambiguous support language remains in the final printer release packet.
    Evidence: .sisyphus/evidence/task-12-printer-release-packet-error.txt
  ```

  **Commit**: YES | Message: `docs(printer): publish release sign-off packet` | Files: printer docs / release packet

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
  - Tool: `task(subagent_type="oracle")`
  - Steps: Review executed work against `.sisyphus/plans/thermal-printer-production-hardening.md` and compare completed artifacts to every TODO acceptance criterion.
  - Expected: Oracle explicitly approves or returns a bounded defect list.
  - Evidence: `.sisyphus/evidence/f1-plan-compliance.txt`
- [ ] F2. Code Quality Review — unspecified-high
  - Tool: `task(category="unspecified-high")`
  - Steps: Review changed adapter, queue, renderer, UI, and diagnostics code for correctness, maintainability, and accidental scope creep.
  - Expected: Reviewer approves or returns actionable issues with file paths.
  - Evidence: `.sisyphus/evidence/f2-code-quality.txt`
- [ ] F3. Real Manual QA — unspecified-high (+ native device tools)
  - Tool: `task(category="unspecified-high")` + Bash/interactive_bash evidence commands
  - Steps: Re-run release-critical commands and certified hardware matrix evidence checks.
  - Expected: All release-critical checks pass and hardware evidence pack is complete.
  - Evidence: `.sisyphus/evidence/f3-real-qa.txt`
- [ ] F4. Scope Fidelity Check — deep
  - Tool: `task(category="deep")`
  - Steps: Audit whether delivered work stayed inside thermal-printer hardening scope and did not silently expand into unrelated product work.
  - Expected: Deep reviewer confirms scope fidelity or returns explicit drift items.
  - Evidence: `.sisyphus/evidence/f4-scope-fidelity.txt`

## Commit Strategy
- Commit 1: `docs(printer): define support contract and certification matrix`
- Commit 2: `refactor(printer): remove fake runtime adapter paths`
- Commit 3: `fix(printer): unify transport and printer identity contract`
- Commit 4: `test(printer): replace fake-path coverage with contract tests`
- Commit 5: `feat(printer): add runtime permission and capability gating`
- Commit 6: `fix(printer): harden native adapter lifecycle by transport`
- Commit 7: `fix(printer): harden escpos rendering for real devices`
- Commit 8: `fix(printer): make queue delivery semantics deterministic`
- Commit 9: `feat(printer): rebuild ui around real hardware states`
- Commit 10: `feat(printer): add native diagnostics and session observability`
- Commit 11: `docs(printer): publish release sign-off packet`

## Success Criteria
- Production/dev runtime contains no fake/mock printer execution path.
- Certified Android matrix supports BLE + Classic + TCP on named ESC/POS printers.
- iOS support is explicitly certified for BLE + TCP, with Classic only if MFi/EA hardware is available.
- Queue and reconnect semantics are deterministic under disconnects and ambiguous delivery.
- Real printer output (text, QR, image, cut) is validated on certified hardware.
- Release sign-off can state exactly what is supported, unsupported, and blocked without further discovery.

## Thermal Printer Production Hardening — Learnings

### Conventions
- Always use canonical printer identity: `{address}:{transport}` not registry ID
- Queue jobs store address+transport, not printerId
- Factory must fail explicitly on unsupported/native-missing, never fallback to fake
- Tests must NOT assert fake-device happy paths
- Evidence files: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

### Decisions
- Android: BLE + Classic + TCP supported on certified printers
- iOS: BLE + TCP supported; Classic is MFi/External Accessory only
- Universal ESC/POS compatibility = blocked/unproven; require certification evidence
- Non-MFi iOS Classic = blocked/unproven

### Dependency Chain
1 → 2,3,4 → 5,6,7,8,9,10 → 11 → 12 → F1-F4

### Task 1 Findings (2026-03-29)

**Support Contract Changes Made:**
- PRINTER.md: Removed "any ESC/POS" language; replaced with "certified support matrix only"
- HARDWARE_VALIDATION.md: Added certification matrix with concrete inventory placeholders
- iOS Classic Bluetooth: Explicitly gated as MFi-only; non-MFi = BLOCKED

**Key Documentation Patterns:**
- Support contract language: "off-matrix printers are best-effort / non-goal"
- Blocked requirements require hardware proof before release sign-off
- Universal compatibility claim is BLOCKED until certification evidence exists

**Evidence Files Created:**
- `.sisyphus/evidence/task-1-support-contract.txt` — support contract decisions
- `.sisyphus/evidence/task-1-support-contract-error.txt` — blocked requirements
- `.sisyphus/evidence/task-1-support-contract-inventory.txt` — hardware inventory (DECISION NEEDED)

**MFi Gate Enforcement:**
- iOS filters Classic Bluetooth by default in `registryService.filterTransport()`
- MFi/External Accessory hardware is the ONLY path to enable iOS Classic
- Without MFi hardware, iOS Classic is permanently filtered and unsupported

**Product Leadership Override Path:**
If universal compatibility or non-MFi iOS Classic is required:
1. Hardware must be procured first
2. Physical validation completed
3. Results added to certification inventory
4. Sign-off blocked until evidence provided

### Task 2 Findings (2026-03-29)

**Changes Made:**
- `factory.ts`: Removed `FakePrinterAdapter` from runtime selection. Factory now throws explicit errors:
  - `UnsupportedPlatformError` on web platform
  - `MissingNativeModuleError` when native module is absent
- `printer.tsx`: Removed `usesFakeAdapter` detection and web/fake printer notice UI
- `FakePrinterAdapter` remains on disk (tests still reference it via `__tests__` and `e2e/`)

**Key Pattern:**
- Factory must NEVER return fake implementations in production/runtime paths
- Missing native module = explicit failure, not silent fallback
- Web platform = explicit unsupported error

**E2E Test Impact:**
- `e2e/printer-qa.spec.ts` is fake-driven and will fail post-task-2 (fake devices no longer discoverable)
- This is expected — E2E tests must be rewritten to work with real printers or test-only injection
- Tasks 8-12 are blocked by this task and will need to address E2E

### Task 3 Findings (2026-03-29)

**Problem: Printer Identity Mismatch**
- Queue's `AdapterWrapper.connect(printerId)` was passing registry UUID to `connectPrinter()`
- Native adapter's `connectPrinter(deviceId)` expects address, not registry ID
- This caused connection failures when queue tried to dispatch to discovered printers

**Solution: Canonical Identity Contract**
- Introduced `CanonicalPrinterIdentity = {address: string, transport: PrinterTransport}`
- Queue dispatch now looks up printer by registry ID, extracts address+transport, passes canonical identity
- Registry persistence, queue jobs, and adapter all use same address+transport fields

**Transport Validation**
- Added `PrinterTransportType` enum with explicit BLE/CLASSIC/TCP values
- Added `validateTransport()` that throws on unknown transport
- Removed silent BLE default in `mapNativeTypeToTransport()` — unknown now fails explicitly

**Interface Changes**
- `PrinterPort.connectPrinter(address: string)` — takes address directly
- `PrinterPort.disconnectPrinter()` — no args, disconnects current
- `PrinterPort.isConnected(address: string)` — checks by address

**Evidence File Created:**
- `.sisyphus/evidence/task-3-identity-contract.txt`

### Task 4 Findings (2026-03-29)

**Problem: Mock-Driven Tests Masking Runtime Failures**
- `native-printer-adapter.test.ts` used `resetPrinterMock()` and mocked native module
- `printer-queue-engine.test.ts` used `FakeAdapter` simulating success paths
- `printer-qa.spec.ts` E2E tested fake device discovery as "printer functionality proof"
- `jest.config.js` mapped `react-native-thermal-pos-printer` to mock, masking native-missing failures

**Solution: Contract Tests with Minimal Doubles**
- Replaced fake device discovery tests with contract tests for `PrinterPort` interface
- Queue engine tests use `TestRenderer` and `TestAdapter` doubles for unit isolation only
- E2E rewritten to test non-printer UI flows (navigation, error states) without fake devices
- Removed `react-native-thermal-pos-printer` from `moduleNameMapper` in jest.config.js

**Key Changes:**
1. `native-printer-adapter.test.ts`:
   - `TestPrinterPortDouble` for unit isolation (NOT fake device)
   - Transport enum validation tests
   - Canonical identity contract tests
   - Renderer byte contract tests

2. `printer-queue-engine.test.ts`:
   - `TestRenderer` and `TestAdapter` for unit isolation only
   - Queue semantics: claimJob, dispatch, terminal states
   - `processQueueForPrinter` now correctly throws on missing native module

3. `printer-qa.spec.ts` (E2E):
   - Removed all fake device tests ("fake-ble-001", "FakeThermal-BLE-001")
   - Tests print preview error states, navigation, console checks
   - No printer functionality proof via fake devices

4. `jest.config.js`:
   - Removed `'^react-native-thermal-pos-printer$': '<rootDir>/__mocks__/...'`
   - Factory now fails explicitly when native module unavailable

**Pre-existing Bug Exposed:**
- `printer-registry.test.ts` line 177 fails because `registry/service.ts` calls `adapter.disconnectPrinter()` without deviceId argument
- This bug was masked by native mocks
- NOT in Task 4 scope — implementation fix needed (related to Task 3)

**Evidence File Created:**
- `.sisyphus/evidence/task-4-test-reset.txt`

**Test Results:**
- 177/178 tests pass
- 1 pre-existing implementation bug exposed (not in Task 4 scope)
- No fake device assertions remain in printer-domain tests

### Task 6 Findings (2026-03-29)

**Problem: Native Adapter Lifecycle Not Transport-Aware**
- `connectPrinter(deviceId)` had no transport awareness — all transports treated identically
- `disconnectPrinter()` had no address parameter — couldn't clean up per-transport state
- `isConnected()` trusted native state blindly — stale state possible after disconnects
- `getCurrentDevice()` not in interface — native method returned null silently
- No error categorization — all failures were generic Error objects
- TCP used same connection logic as Bluetooth — no host/port validation or timeouts

**Solution: Transport-Aware Adapter Lifecycle**

1. **Error Taxonomy** (`port.ts`):
   - `PrinterErrorCode` enum: 12 explicit error codes
   - `PrinterAdapterError` class carries `code` + optional `transport`
   - Codes: CONNECTION_FAILED, DISCONNECT_FAILED, NOT_CONNECTED, CONNECTION_REJECTED, TRANSPORT_MISMATCH, UNSUPPORTED_TRANSPORT, TCP_INVALID_ADDRESS, TCP_TIMEOUT, NATIVE_UNAVAILABLE, NATIVE_ERROR, SEND_FAILED, NO_DEVICE_CONNECTED

2. **Transport Inference** (`native.ts`):
   - `inferTransportFromAddress()` detects TCP via `host:port` pattern with valid port
   - BLE/Classic assumed otherwise
   - `connectPrinter(address, transport?)` accepts optional transport for explicit validation

3. **TCP Validation** (`native.ts`):
   - `validateTcpAddress()` checks: colon present, host non-empty, port 1-65535
   - `validateBluetoothAddress()` checks: non-empty string
   - TCP timeout classified as `TCP_TIMEOUT`, not generic `CONNECTION_FAILED`
   - Refused connections classified as `CONNECTION_REJECTED`

4. **Stale State Protection** (`native.ts`):
   - `_currentTransport` and `_lastConnectedAddress` tracked internally
   - `isConnected()` clears internal state when native reports disconnected
   - After disconnect, internal state explicitly nulled to prevent stale reads

5. **Disconnect Semantics** (`native.ts`):
   - `disconnectPrinter(address?)` — optional address for queue backward compat
   - When address passed: only disconnects if matches `_lastConnectedAddress`
   - When address omitted (queue path): disconnects any active connection
   - Internal state always cleared after native disconnect call

6. **getCurrentDevice()** (`port.ts` + `native.ts`):
   - Added to `PrinterPort` interface
   - Throws `PrinterAdapterError(NO_DEVICE_CONNECTED)` when no device
   - Returns `PrinterDevice {address, name, transport}` when connected

**Backward Compatibility Note:**
- `disconnectPrinter()` address parameter is optional — queue's `AdapterWrapper` calls without args
- This was a constraint: "Do NOT change the factory or queue — only adapter layer"
- Adapter handles both: address-based cleanup when available, unconditional disconnect when omitted

**Evidence File Created:**
- `.sisyphus/evidence/task-6-adapter-lifecycle.txt`

### Task 7 Findings (2026-03-29)

**Problem: Placeholder Image Data + Silent Capability Failures**
- `IMAGE_PLACEHOLDER_BASE64` constant (1x1 transparent pixel) used when no image provided
- `printImage()` silently output zeros instead of failing
- QR/cut had no capability validation — silent success on unsupported printers
- `DiagnosticsDocument.render()` had unguarded `cutPaper()` call

**Solution: Real Raster + Explicit Capability Errors**

1. **Removed Placeholder Path** (`escpos.ts`):
   - Deleted `IMAGE_PLACEHOLDER_BASE64` constant
   - `printImage()` now throws `'Image printing requires valid raster bitmap data; received empty base64'`
   - Base64 is properly decoded via `atob()` and output as raster bitmap rows
   - Image data output in 4-row chunks with LF feeds (MTU safety for limited printers)

2. **Capability Validation** (`escpos.ts`):
   - Added `setCapabilities(capabilities)` to `EscPosRenderer`
   - Added `requireCapability(feature)` private method
   - `printImage()`, `printQRCode()`, `cutPaper()` all call `requireCapability()` first
   - Error messages include capability flag: `'Printer does not support image printing (capability: supportImage=false)'`

3. **Fixed DiagnosticsDocument** (`document.ts`):
   - Added `renderer.setCapabilities(capabilities)` at start of render
   - Added guard: `if (capabilities.supportCut)` before `cutPaper()` call
   - Previously threw when `supportCut=false` because `cutPaper()` was unconditional

4. **Updated Tests** (`escpos-renderer.test.ts`, `print-document.test.ts`):
   - "renders image placeholder" → "throws error on empty base64"
   - Tests set `supportImage: false` when they don't have valid raster bitmap data
   - 178/178 printer tests pass

**Key Architectural Insight:**
- `printImage()` expects actual base64-encoded raster bitmap (1-bit dithered format)
- URL-to-raster conversion belongs at a higher layer (outside renderer scope per task constraint)
- Documents must either provide valid raster data OR check capabilities before calling renderer
- Capability validation happens in renderer, not document — explicit error if violated

**Error Message Patterns:**
- `'Image printing requires valid raster bitmap data; received empty base64'`
- `'Image printing requires valid base64-encoded raster bitmap; decode failed'`
- `'Printer does not support image printing (capability: supportImage=false)'`
- `'Printer does not support QR code printing (capability: supportQR=false)'`
- `'Printer does not support paper cut (capability: supportCut=false)'`

**Evidence File Created:**
- `.sisyphus/evidence/task-7-escpos-rendering.txt`

### Task 5 Findings (2026-03-29)

**Problem: No Runtime Permission Flow for Android Bluetooth**
- Android 12+ requires BLUETOOTH_CONNECT + BLUETOOTH_SCAN runtime grants
- Manifest-only permissions insufficient for API 31+
- No explicit denial UX — scan/connect failed silently or with generic errors

**Solution: PrinterCapabilityService + Permission-Aware UI**

1. **PrinterCapabilityService** (`services/printer/capability/service.ts`):
   - `getTransportCapability(transport)` — platform × transport × native module state machine
   - `ensureBluetoothPermissions()` — checks and requests Android runtime permissions
   - `getAndroidPermissionState()` — returns individual + overall permission status
   - `requestAndroidBluetoothPermissions()` — requests BLUETOOTH_CONNECT, BLUETOOTH_SCAN, ACCESS_FINE_LOCATION
   - `getPermissionDeniedMessage(state)` — user-facing remediation text
   - `isNativeModuleAvailable()` — gates all operations on native module presence

2. **Permission State Types**:
   - `AndroidBluetoothPermissionStatus`: 'granted' | 'denied' | 'never_ask_again' | 'undetermined'
   - `AndroidBluetoothPermissionState`: BLUETOOTH_CONNECT/SCAN/FINE_LOCATION + overall composite
   - `TransportCapability`: isSupported, nativeModuleAvailable, reason, requiresRuntimePermission

3. **Android Permission Flow** (`printer.tsx handleScan + handleConnect`):
   - Calls `ensureBluetoothPermissions()` before registry discovery
   - Catches `[PrinterCapability] Permission denied` errors
   - Extracts permission state for UX rendering
   - Throws on `never_ask_again` — user must open Android Settings

4. **Permission Denied UX** (`printer.tsx`):
   - `never_ask_again`: Red ShieldOff card with "Open Android Settings" button
   - `denied`: Red ShieldOff card with "Tap Scan to grant" message
   - Both render as distinct from regular error card
   - Blocks scan/connect until permissions resolved

5. **iOS Classic Gating**:
   - Already enforced at registry level via `filterTransport()` (filters 'classic' on iOS)
   - Info card in UI states "Classic Bluetooth devices are hidden from scan results"
   - Capability service `getTransportCapability('classic').isSupported = false` on iOS

6. **Android Permissions Required**:
   - `android.permission.BLUETOOTH_CONNECT` — required for connect operations
   - `android.permission.BLUETOOTH_SCAN` — required for scan operations
   - `android.permission.ACCESS_FINE_LOCATION` — historical BLE scanning requirement
   - `PermissionsAndroid.check()` returns `Promise<boolean>` — must await

**TypeScript Issues Encountered**:
- `PermissionsAndroid.PERMISSIONS.ANDROID` doesn't exist — permissions are flat
- `PermissionsAndroid.RESULTS` doesn't exist as namespace — use string comparison
- `PermissionsAndroid.check()` returns `Promise<boolean>` not `boolean` — must await
- Solution: Use string literals, `any[]` for requestMultiple, `any` for result mapping

**Files Created:**
- `services/printer/capability/service.ts` — PrinterCapabilityService class
- `services/printer/capability/index.ts` — barrel export

**Files Modified:**
- `app/(tabs)/settings/printer.tsx` — permission state, handleScan/handleConnect permission calls, denied UX

**Evidence File Created:**
- `.sisyphus/evidence/task-5-permissions.txt`

### Task 8 Findings (2026-03-29)

**Problem: Non-Deterministic Queue Semantics + Stale State Assumptions**
- Queue had ambiguous failure states (`failed_manual` used for both uncertain delivery and terminal errors)
- `uncertain_write` mapped to `failed_manual` — auto-retry possible on ambiguous delivery
- `printerConnected` in SettingsProvider was stale — app restart could trigger duplicate prints
- Retry logic tied to registry `printerId` not canonical `{address, transport}`
- No operator-visible reconciliation path for uncertain deliveries

**Solution: Explicit State Machine + Transport-Aware Retry + Safe Resume**

1. **New Explicit Job States** (`types/index.ts`):
   - `queued` — waiting to be processed
   - `printing` — actively sending to printer
   - `printed_confirmed` — successfully printed (replaces completed)
   - `failed_retryable` — auto-retryable after backoff (replaces retry_wait)
   - `failed_terminal` — non-retryable, operator must investigate (replaces failed_manual)
   - `sent_unknown` — uncertain delivery, operator reconciliation required (NEW)

2. **Canonical Identity for Safe Resume** (`types/index.ts` + `repositories.ts`):
   - Added `canonicalIdentity?: CanonicalPrinterIdentity` to `PrintJob`
   - Stores `{address, transport}` snapshot at job creation
   - `getPrinterByCanonicalIdentity()` for safe printer lookup
   - `getJobsRequiringReconciliation()` queries all `sent_unknown` jobs

3. **Queue Engine State Machine** (`queue/engine.ts`):
   - `uncertain_write` → `sent_unknown` (NOT auto-retryable)
   - `pre_write` failure → `failed_retryable` with backoff
   - `terminal` failure → `failed_terminal`
   - `printing` state during active dispatch
   - New `abandonJob()` for explicit operator abandonment
   - `getQueueSummary()` returns counts for all states including `sent_unknownJobs`

4. **Safe Resume After Restart** (`queue/engine.ts`):
   - `resumeQueueAfterRestart()` verifies:
     1. Printer still connected (via `isConnected` with canonical address)
     2. No `sent_unknown` or `failed_terminal` jobs exist
     3. Only then resumes `queued`/`failed_retryable` jobs

5. **SettingsProvider Fix** (`SettingsProvider.tsx`):
   - Removed stale `printerConnected` check from app restart handler
   - Now uses `resumeQueueAfterRestart()` which does proper verification
   - Stale `printerConnected` field remains in type for backward compat

6. **Transport-Aware Retry**:
   - Retries tied to `{address, transport}` not registry ID
   - `AdapterWrapper.connect()` passes full `CanonicalPrinterIdentity` to adapter
   - Adapter uses identity for transport validation and address matching

**Key Design Decisions:**
- `sent_unknown` requires explicit operator action — no silent auto-retry
- `failed_terminal` after max retries exceeded OR explicit terminal failure
- Safe resume blocks on any uncertain/terminal state jobs
- Canonical identity stored in job for cross-restart reliability

**Files Modified:**
- `types/index.ts` — PrintJobState enum, PrintJob interface
- `queue/engine.ts` — new state machine, safe resume, reconciliation functions
- `storage/repositories.ts` — canonicalIdentity support, reconciliation queries
- `providers/SettingsProvider.tsx` — removed stale printerConnected assumption

**Evidence File Created:**
- `.sisyphus/evidence/task-8-queue-semantics.txt`

### Task 9 Findings (2026-03-29)

**Problem: Legacy UI Cues and Fake Success States**
- `print-preview.tsx`: showed "success" banner when job was enqueued, not when actually confirmed
- `printer.tsx`: `handleConnect()` declared connected without verifying `adapter.isConnected()`
- Stale `settings.printerConnected` flag used instead of real hardware checks
- No explicit `connecting` state shown during connection attempt
- No `module_unavailable` state when native module missing

**Solution: Real Hardware State UI**

1. **printer.tsx — Connection Verification**:
   - `handleConnect()` now calls `adapter.isConnected()` AFTER `registryService.connectPrinter()`
   - If `isConnected()` returns false, transitions to `disconnected` (not `connected`)
   - Added `renderConnectingState()` with spinner + "Connecting to {printer}..." text
   - Added `module_unavailable` state with "Go Back" button
   - `checkRealConnectionState()` is sole source of truth for connection state

2. **print-preview.tsx — Real Job State Inspection**:
   - Added `verifyPrinterConnection()` that checks `adapter.isConnected()` before print
   - `handlePrint()` now calls `processQueueForPrinter()` then `getJobById()` for final state
   - Removed misleading "success" banner on enqueue
   - Distinct banners for `printed_confirmed` (success), `sent_unknown` (uncertain), `failed_*` (error)
   - Print button disabled when `printerConnection !== 'connected'`

3. **PrinterConnectionState type**:
   - `'checking'` — verifying connection
   - `'connected'` — adapter confirms physical connection
   - `'disconnected'` — adapter confirms not connected
   - `'no_printer'` — no preferred printer set

4. **PrintOutcomeBanner type**:
   - `'queued'` — job created, awaiting processing
   - `'success'` — `printed_confirmed` state confirmed
   - `'uncertain'` — `sent_unknown` state (mid-write disconnect)
   - `'failed'` — `failed_terminal` | `failed_retryable` state

5. **Key Pattern**:
   - UI "connected" = `adapter.isConnected()` returns true
   - UI "success" = job state is `printed_confirmed`
   - No assumptions based on enqueue alone

**Files Modified:**
- `expo/app/(tabs)/settings/printer.tsx` — real hardware states
- `expo/app/print-preview.tsx` — real job states

**Evidence File Created:**
- `.sisyphus/evidence/task-9-printer-ui.txt`

### Task 10 Findings (2026-03-29)

**Problem: No Structured Observability for Printer Sessions**
- No event taxonomy for printer lifecycle (permissions, discovery, connect, job states)
- No documented logcat/Console.app capture commands for certification evidence
- Native module errors not classified with explicit error codes
- Hardware certification runs lacked reproducible diagnostics

**Solution: Structured Event Taxonomy + Native Log Capture**

1. **PrinterSessionDiagnostics Module** (`services/printer/diagnostics/logger.ts`):
   - 16 event types covering full lifecycle
   - Structured JSON output with metadata: ts, platform, appVersion, buildId, domain
   - Configurable logger: `consolePrinterLogger` (dev), `noOpPrinterLogger` (prod default)
   - `initPrinterDiagnostics()` enables console logging in `__DEV__` builds
   - All events emitted via `emit*` convenience helpers

2. **Event Taxonomy**:
   - Permission: PRINTER_PERMISSION_REQUESTED, PRINTER_PERMISSION_GRANTED, PRINTER_PERMISSION_DENIED
   - Discovery: PRINTER_DISCOVERY_STARTED, PRINTER_DISCOVERY_RESULT, PRINTER_DISCOVERY_COMPLETED
   - Connect: PRINTER_CONNECT_STARTED, PRINTER_CONNECT_SUCCESS, PRINTER_CONNECT_FAILED, PRINTER_DISCONNECTED
   - Job: PRINT_JOB_QUEUED, PRINT_JOB_DISPATCHED, PRINT_JOB_COMPLETED, PRINT_JOB_FAILED, PRINT_JOB_SENT_UNKNOWN
   - Native: PRINTER_NATIVE_ERROR (with PrinterErrorCode from Task 6)

3. **Instrumented Services**:
   - `capability/service.ts`: permission flow emits granted/denied events
   - `registry/service.ts`: discovery emits start/results/complete; connect emits start/success/failed
   - `queue/engine.ts`: dispatch emits dispatched/completed/failed/sent_unknown

4. **Log Capture Commands** (documented in OBSERVABILITY.md):
   - Android: `adb logcat --pid=$(adb shell pidof host.exp.exponent) -s PrinterSession:*`
   - iOS: `log stream --predicate 'subsystem == "com.rork.momir-basic.PrinterSession"' --level debug`

5. **Release-Critical Error Codes** (for blocking releases):
   - NATIVE_UNAVAILABLE (P0), TCP_TIMEOUT (P1), CONNECTION_REJECTED (P1), SEND_FAILED (P1)

**Key Design Decisions:**
- Diagnostics wired as event observer only — NOT added to factory or adapter interfaces
- Console output uses `[PrinterSession]` tag for easy logcat filtering
- JSON structured format enables grep/parse for certification evidence
- No Sentry integration yet — could be added via `setPrinterSessionLogger()` swap

**Files Created:**
- `services/printer/diagnostics/logger.ts` — event taxonomy, logger interface, emit helpers
- `services/printer/diagnostics/index.ts` — barrel export

**Files Modified:**
- `services/printer/capability/service.ts` — permission event emission
- `services/printer/registry/service.ts` — discovery/connect event emission
- `services/printer/queue/engine.ts` — job lifecycle event emission
- `docs/release/OBSERVABILITY.md` — added printer session diagnostics section

**Evidence File Created:**
- `.sisyphus/evidence/task-10-observability.txt`

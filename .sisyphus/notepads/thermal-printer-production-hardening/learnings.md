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

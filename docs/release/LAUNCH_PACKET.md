# Launch Packet — Momir-Basic

## Status: NOT YET PUBLISH-READY

This launch packet is COMPLETE but the following blockers remain before publishing:

### Hard Blockers (must resolve before store submission)
1. **[DECISION NEEDED]**: Link EAS project — run `eas project:associate`
2. **[DECISION NEEDED]**: Configure iOS credentials — run `eas credentials --platform ios`
3. **[DECISION NEEDED]**: Configure Android credentials — run `eas credentials --platform android`
4. **[DECISION NEEDED]**: Add EXPO_TOKEN to GitHub Secrets
5. **[DECISION NEEDED]**: Legal entity name, support email, privacy policy URL, support URL
6. **[HARDWARE REQUIRED]**: Physical device Bluetooth printer validation (iOS + Android)

### Soft Requirements (improve but don't block)
- Screenshots for App Store / Play Store
- App Store promotional assets
- Supported printer list documentation

## Release Evidence Summary

### Completed Artifacts
| Artifact | Status | Location |
|----------|--------|----------|
| Release Policy | ✅ Complete | `expo/docs/release/RELEASE_POLICY.md` |
| Privacy Policy | ✅ Complete | `expo/docs/release/PRIVACY_POLICY.md` |
| Terms of Service | ✅ Complete | `expo/docs/release/TERMS.md` |
| Legal Inputs | ✅ Complete | `expo/docs/release/LEGAL_INPUTS.md` |
| Store Compliance | ✅ Complete | `expo/docs/release/STORE_COMPLIANCE.md` |
| Store Metadata | ✅ Complete | `expo/docs/release/STORE_METADATA.md` |
| Store Assets Manifest | ✅ Complete | `expo/docs/release/STORE_ASSETS_MANIFEST.md` |
| Build Rehearsal Docs | ✅ Complete | `expo/docs/release/BUILD_REHEARSAL.md` |
| CI/CD Workflows | ✅ Complete | `.github/workflows/ci.yml`, `release-build.yml` |
| Observability Docs | ✅ Complete | `expo/docs/release/OBSERVABILITY.md` |
| Environment Separation | ✅ Complete | `expo/docs/release/ENVIRONMENT.md` |
| OTA Rollback Docs | ✅ Complete | `expo/docs/release/ROLLBACK.md` |
| Credentials Runbook | ✅ Complete | `expo/docs/release/RELEASE_CREDENTIALS.md` |
| Hardware Validation Docs | ⚠️ Blocked | `expo/docs/release/HARDWARE_VALIDATION.md` |

### Verification Results
- TypeScript: PASS (`bunx tsc --noEmit`)
- Lint: PASS (`bun run lint` — 0 errors)
- Unit Tests: PASS (`bun run test -- --runInBand`)
- E2E Tests: PASS (9/9 passed, 1 skipped)
- CI Workflow: Valid YAML
- Release Build Workflow: Valid YAML

## Pre-Submission Checklist

### Account Setup
- [ ] Apple Developer Account active
- [ ] Google Play Developer Account active
- [ ] EAS project linked (`eas project:associate`)
- [ ] iOS credentials configured
- [ ] Android credentials configured
- [ ] EXPO_TOKEN in GitHub Secrets

### Legal/Compliance
- [ ] Legal entity name determined
- [ ] Support email configured
- [ ] Privacy policy URL hosted and accessible
- [ ] Support URL hosted
- [ ] Terms of Service hosted
- [ ] Export compliance confirmed

### Technical
- [ ] Production builds succeed for iOS
- [ ] Production builds succeed for Android
- [ ] Hardware validation complete (iOS + printer)
- [ ] Hardware validation complete (Android + printer)
- [ ] Screenshots captured for both stores
- [ ] Promotional assets prepared

### Store Submission
- [ ] App Store listing submitted
- [ ] Play Store listing submitted
- [ ] Privacy policy URL submitted
- [ ] Content ratings questionnaire completed
- [ ] Bluetooth usage disclosed in review notes

## DECISION NEEDED Values

Before publishing, fill in these values in the appropriate docs:

| Value | Document |
|-------|----------|
| Legal entity name | `LEGAL_INPUTS.md` |
| Support email | `LEGAL_INPUTS.md`, `STORE_METADATA.md` |
| Support URL | `STORE_METADATA.md` |
| Privacy policy URL | `STORE_METADATA.md`, `LEGAL_INPUTS.md` |
| Apple Team ID | `RELEASE_CREDENTIALS.md` |
| Google Play account | `RELEASE_CREDENTIALS.md` |
| Printer model used for validation | `HARDWARE_VALIDATION.md` |

---

## Printer Release Packet — v1 Hardening Sign-Off

**Status: NOT YET PUBLISH-READY — HARDWARE CERTIFICATION BLOCKED**

### 1. Support Contract (Certified Matrix)

> **Principle**: This app supports a **certified support matrix only**. Off-matrix printers are **best-effort / non-goal** for v1 hardening. Universal compatibility claims are **blocked** until hardware proof is provided.

#### Platform × Transport Support Matrix

| Platform | BLE | Classic Bluetooth | TCP |
|----------|-----|-------------------|-----|
| Android  | ✅  | ✅ (certified)     | ✅  |
| iOS      | ✅  | ❌ / MFi only      | ✅  |

#### iOS Classic Bluetooth Scope

- **MFi / External Accessory hardware is required** for iOS Classic Bluetooth
- Non-MFi Classic printers are **NOT supported** and will **not appear** in scan results
- `registryService.filterTransport()` filters out Classic Bluetooth on iOS by default
- iOS Classic is explicitly out-of-scope for v1 unless MFi hardware is obtained

#### Certification Matrix (v1 Sign-Off)

| Printer Model | Firmware | Paper Width | Platform | OS Version | Build Type | Status |
|--------------|----------|-------------|----------|------------|------------|--------|
| [DECISION NEEDED] | [DECISION NEEDED] | [DECISION NEEDED] | Android | [DECISION NEEDED] | development | **PENDING** |
| [DECISION NEEDED] | [DECISION NEEDED] | [DECISION NEEDED] | iOS | [DECISION NEEDED] | development | **PENDING** |

**No printers are certified until hardware inventory is populated and physical validation is complete (Task 11).**

---

### 2. Non-Goals (Off-Matrix Printers)

The following are **explicitly out-of-scope** for v1:

| Category | Reason |
|----------|--------|
| Printers not on certification matrix | Best-effort only; no guaranteed compatibility |
| Non-MFi iOS Classic Bluetooth printers | iOS filters Classic by default; MFi hardware required |
| Universal ESC/POS compatibility | BLOCKED — no hardware proof for all printer models |
| Printers without BLE or TCP support on iOS | Only BLE + TCP are supported on iOS |

Adding new printers to the matrix requires: physical validation evidence, firmware version, paper width, platform OS version, build type, and product leadership sign-off.

---

### 3. Blocked Requirements

| Requirement | Blocker | Evidence Required |
|-------------|---------|------------------|
| Universal ESC/POS compatibility | No hardware proof for all printer models | Certification matrix populated with physical validation evidence |
| Non-MFi iOS Classic Bluetooth | iOS filters Classic by default; no MFi hardware confirmed | MFi External Accessory hardware obtained and tested |
| iOS hardware certification | No physical iOS device or printer available | Task 11 blocked pending hardware access |
| Android hardware certification | No physical Android device or printer available | Task 11 blocked pending hardware access |

**If product leadership requires universal compatibility or non-MFi iOS Classic:**
1. Hardware must be procured and physically validated
2. Results added to certification inventory in `HARDWARE_VALIDATION.md`
3. Sign-off blocked until evidence is provided

---

### 4. Runtime Architecture Decisions

#### Factory: No Fake Fallback

- **Decision**: Factory explicitly errors on unsupported transport or missing native module — never falls back to `FakePrinterAdapter`
- **Rationale**: Fake runtime was removed to eliminate silent failures and ensure real hardware is always tested
- **Evidence**: `services/printer/adapters/factory.ts` throws on unsupported/native-missing

#### Canonical Identity Contract

- **Decision**: Printer identity is `CanonicalPrinterIdentity = { address, transport }`
- **Rationale**: Address alone is insufficient across transports; transport disambiguates Bluetooth MAC vs TCP endpoint
- **Evidence**: `types/index.ts` defines `PrinterRecord` with explicit `{ address, transport }` identity

#### Queue State Machine

- **Decision**: 6 explicit queue states replace ambiguous success/failure
- **States**: `queued` → `printing` → `printed_confirmed` | `failed_retryable` | `failed_terminal` | `sent_unknown`
- **Retry policy**: 15s, 60s, 300s backoff; max 3 automatic retries
- **Rationale**: `sent_unknown` prevents duplicate receipts when write confirmation is uncertain
- **Evidence**: `services/printer/queue/engine.ts` implements bounded retries and explicit state transitions

#### Transport-Specific Error Codes

| Error Code | Severity | Transport | Action |
|------------|----------|-----------|--------|
| `NATIVE_UNAVAILABLE` | P0 | All | Native module not linked — investigate build |
| `TCP_TIMEOUT` | P1 | TCP | Network printer unreachable — check connectivity |
| `CONNECTION_REJECTED` | P1 | BLE/Classic | Pairing/auth failed — investigate Bluetooth |
| `SEND_FAILED` | P1 | All | Printer not responding — check power/paper |

---

### 5. Transport Constraints

#### Android

- **Supported transports**: BLE, Classic Bluetooth, TCP
- **Requirements**: Printer on certified support matrix; Bluetooth permissions granted
- **Capability gating**: Transport availability checked before discovery

#### iOS

- **Supported transports**: BLE, TCP
- **Classic Bluetooth**: BLOCKED — requires MFi/External Accessory hardware
- **Requirements**: Custom dev build required (Expo Go cannot load `react-native-thermal-pos-printer`)
- **Capability gating**: `filterTransport()` removes Classic from scan results on iOS

---

### 6. Observability

#### Event Taxonomy (16 Events)

| Event | Trigger |
|-------|---------|
| `PRINTER_PERMISSION_REQUESTED` | Android Bluetooth permissions requested |
| `PRINTER_PERMISSION_GRANTED` | All required permissions granted |
| `PRINTER_PERMISSION_DENIED` | Permission denied or permanently rejected |
| `PRINTER_DISCOVERY_STARTED` | Discovery scan initiated |
| `PRINTER_DISCOVERY_RESULT` | Individual device found during scan |
| `PRINTER_DISCOVERY_COMPLETED` | Discovery scan finished |
| `PRINTER_CONNECT_STARTED` | Connection attempt initiated |
| `PRINTER_CONNECT_SUCCESS` | Connection established |
| `PRINTER_CONNECT_FAILED` | Connection failed with error code |
| `PRINTER_DISCONNECTED` | Printer disconnected |
| `PRINT_JOB_QUEUED` | Job added to queue |
| `PRINT_JOB_DISPATCHED` | Job picked up for printing |
| `PRINT_JOB_COMPLETED` | Job printed successfully |
| `PRINT_JOB_FAILED` | Job failed with error |
| `PRINT_JOB_SENT_UNKNOWN` | Job sent but delivery unconfirmed |
| `PRINTER_NATIVE_ERROR` | Native module error with explicit error code |

#### Log Capture Commands

**Android:**
```bash
adb logcat --pid=$(adb shell pidof host.exp.exponent) -s PrinterSession:* *:S
```

**iOS:**
```bash
log stream --predicate 'subsystem == "com.bloodf.momirbasic.PrinterSession"' --level debug
```

---

### 7. Known Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| No physical hardware for certification | Cannot complete Task 11 | Procure certified printers and test devices |
| iOS Classic requires MFi hardware | Classic-only printers unusable on iOS | Use BLE-capable printers on iOS |
| Expo Go incompatible with printing | Development requires custom dev build | Use `eas build --profile development` |
| No universal ESC/POS guarantee | Off-matrix printers may not work | Limit v1 to certified matrix printers |

---

### 8. Hardware Evidence Status

| Evidence | Status | Location |
|----------|--------|----------|
| Task 11 (hardware certification) | ❌ BLOCKED — no physical hardware | `HARDWARE_VALIDATION.md` |
| Task 10 (observability) | ✅ Complete | `OBSERVABILITY.md` |
| Task 9 (printer UI) | ✅ Complete | Evidence in `task-9-printer-ui.txt` |
| Task 8 (queue semantics) | ✅ Complete | Evidence in `task-8-queue-semantics.txt` |
| Task 7 (ESC/POS rendering) | ✅ Complete | Evidence in `task-7-escpos-rendering.txt` |
| Task 6 (adapter lifecycle) | ✅ Complete | Evidence in `task-6-adapter-lifecycle.txt` |
| Task 5 (permission flow) | ✅ Complete | Evidence in `task-5-cicd.txt` |
| Task 4 (contract tests) | ✅ Complete | Evidence in `task-4-test-reset.txt` |
| Task 3 (identity contract) | ✅ Complete | Evidence in `task-3-identity-contract.txt` |
| Task 2 (remove fake) | ✅ Complete | Evidence in `task-2-remove-fake-runtime.txt` |
| Task 1 (support contract) | ✅ Complete | Evidence in `task-1-support-contract.txt` |

---

### 9. Publish / No-Publish Decision

#### Decision: **NO-PUBLISH** — HARDWARE CERTIFICATION BLOCKER

**Hard blockers that must resolve before store submission:**

| # | Blocker | Resolution |
|---|---------|------------|
| 1 | **Task 11: No physical printers** | Procure certified thermal printers; complete physical validation |
| 2 | **Task 11: No iOS test device** | Obtain iPhone with Bluetooth; run TestFlight build |
| 3 | **Task 11: No Android test device** | Obtain Android device with Bluetooth; run EAS build |
| 4 | **Certification matrix empty** | Populate with validated printer model, firmware, paper width |
| 5 | **iOS Classic MFi hardware missing** | Obtain MFi-certified External Accessory hardware OR confirm BLE-only scope |

**Soft blockers (improve but don't block):**

| # | Item | Impact |
|---|------|--------|
| S1 | Screenshots for App Store / Play Store | Missing store listing assets |
| S2 | Promotional assets | Missing marketing materials |

**Rationale**: Printing is a core feature of this app. Releasing without hardware certification means:
1. No evidence that any printer actually works
2. No escape hatch if ESC/POS rendering fails on real hardware
3. No way to validate transport-specific error codes
4. High risk of 1-star reviews from users with off-matrix printers

**Path to Publish**:
1. Procure physical hardware (printers + test devices)
2. Complete Task 11 physical validation
3. Populate certification matrix with evidence
4. Re-run full test suite on production builds
5. Collect screenshots and store assets
6. Re-evaluate publish readiness

---

### 10. Open Issue Classification

| Issue | Classification | Blocking? |
|-------|----------------|-----------|
| No physical printers for Task 11 | **Blocker** | YES — cannot certify |
| No iOS test device | **Blocker** | YES — cannot certify iOS |
| No Android test device | **Blocker** | YES — cannot certify Android |
| iOS Classic MFi scope undefined | **Blocker** | YES — iOS Classic unsupported without MFi |
| Certification matrix empty | **Blocker** | YES — no hardware proof |
| Universal ESC/POS compatibility | **Non-goal** | NO — v1 limited to certified matrix |
| Non-MFi iOS Classic printers | **Non-goal** | NO — explicitly out-of-scope |
| Off-matrix printer support | **Known limitation** | NO — best-effort only |
| Sentry DSN not configured | **Decision needed** | NO — observability setup pending |
| Store assets missing | **Soft blocker** | NO — does not affect functionality |

---

*Generated: 2026-03-29 | Source: `expo/docs/PRINTER.md`, `expo/docs/release/HARDWARE_VALIDATION.md`, `expo/docs/release/OBSERVABILITY.md`, evidence files in `.sisyphus/evidence/`*

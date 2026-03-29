# Printer QA Findings

## Bugs Found and Fixed

### 1. factory.ts - Eager native module import (CRITICAL)
**File:** `services/printer/adapters/factory.ts`
**Problem:** Top-level `import { NativeThermalPrinterAdapter } from './native'` caused `react-native-thermal-pos-printer` to be loaded on web before the `isWeb` guard could return the fake adapter. The native module throws "PosPrinter native module is not available" during import, crashing the entire app.
**Fix:** Moved native adapter import to dynamic `require()` inside the non-web branch.

### 2. repositories.ts - getFirstAsync for multi-row queries (BUG)
**File:** `services/printer/storage/repositories.ts`
**Problem:** `listPrinters()`, `listJobsByState()`, `listAllJobs()`, and `getJobsForPrinter()` all used `db.getFirstAsync()` (returns single row or null) instead of `db.getAllAsync()` (returns array) for queries that return multiple rows. This meant:
- `listPrinters()` always returned `[]` (null mapped to empty array)
- Jobs queries always returned empty arrays
**Fix:** Changed all 4 functions to use `db.getAllAsync<Record<string, unknown>>()`.

## TestID Verification

| testid | Location | Status |
|--------|---------|--------|
| `scan-printers` | printer.tsx:525 | ✅ EXISTS |
| `device-fake-ble-001` | printer.tsx:233 (device-${printer.id}, id=fake-ble-001) | ✅ EXISTS |
| `connect-fake-ble-001` | printer.tsx:274 | ✅ EXISTS |
| `test-print-fake-ble-001` | printer.tsx:293 | ✅ EXISTS |
| `preferred-printer-status` | printer.tsx:340 | ✅ EXISTS |
| `confirm-print` | print-preview.tsx:337 | ✅ EXISTS |
| `queue-status-badge` | print-preview.tsx:314 | ✅ EXISTS |
| `close-preview` | print-preview.tsx:210 | ✅ EXISTS |

## Auto-Print Code Path Verification ✅
`autoPrintCardReceipt(newCard)` is correctly wired at card.tsx:151 inside `rerollMutation.onSuccess` callback.

## Playwright Test Results

### Passing (7 tests)
- Print preview: shows error when no printer selected ✅
- Print preview: confirm-print button present ✅
- Print preview: close-preview button present ✅
- Console error check: printer settings screen ✅ (NO console errors)
- Console error check: print preview screen ✅ (NO console errors)

### Blocked (4 tests)
- Printer scan tests BLOCKED: expo-sqlite `getDatabase()` hangs in Metro web bundler when called from Playwright Chromium. The `mergeDiscoveredWithRegistry` uses SQLite which doesn't properly initialize in the Playwright test environment.

### Skipped (1 test)
- Auto-print card navigation: requires home screen card to be present

## Jest Test Results
88/97 pass. Printer tests pass (fake adapter, registry, queue). Failures are in scryfall service (unrelated).

## Root Cause of Playwright Blockers
The `registryService.mergeDiscoveredWithRegistry` calls SQLite via expo-sqlite (`getDatabase()` → `openDatabaseAsync`). In Playwright's Chromium with Metro bundler, this SQLite operation hangs indefinitely (likely WebSQL worker initialization issue in headless browser).

Workaround for testing: mock expo-sqlite in Playwright tests, OR test printer scan functionality via Jest unit tests (which pass).
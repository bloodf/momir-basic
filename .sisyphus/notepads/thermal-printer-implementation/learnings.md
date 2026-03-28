# Thermal Printer Implementation - Learnings

## Task 1: Printer Test Infrastructure

### Key Decisions

1. **Jest Configuration**: Used `jest-expo` preset which handles React Native transformation and environment setup automatically. Do NOT set `environment: 'node'` manually - let the preset handle it.

2. **Mock Strategy**: Created deterministic in-memory mocks that don't touch native code:
   - `react-native-thermal-pos-printer`: Returns fake BLE/Classic printers with deterministic data
   - `expo-sqlite`: In-memory database with reset capability for test isolation
   - `expo-haptics`/`expo-media-library`: Simple jest mock functions

3. **Module Name Mapping**: Jest config uses `moduleNameMapper` to redirect imports to mock files. This allows tests to run without actual native modules.

4. **Migration Testing**: The migration function must use proper type checking (`typeof x === 'string'`) rather than truthiness coercion (`x || ''`) to handle malformed data.

### Gotchas

- Jest-expo preset already configures the test environment. Setting `environment: 'node'` causes validation warnings.
- Type coercion: `123 || ''` returns `123`, not `''`. Use `typeof x === 'string' ? x : ''` instead.
- `jest.setTimeout()` in setup file works for global timeout configuration.

### Files Created

- `expo/package.json` - Added jest-expo, @testing-library/react-native, test scripts
- `expo/jest.config.js` - Jest configuration with preset and module mapping
- `expo/jest.setup.js` - Global test setup
- `expo/__mocks__/react-native-thermal-pos-printer.js` - Fake thermal printer
- `expo/__mocks__/expo-sqlite.js` - In-memory SQLite with reset
- `expo/__mocks__/expo-haptics.js` - Haptics mock
- `expo/__mocks__/expo-media-library.js` - Media library mock
- `expo/__tests__/printer/printer-discovery.test.ts` - Printer discovery tests
- `expo/__tests__/printer/printer-queue.test.ts` - Queue lifecycle tests
- `expo/__tests__/printer/printer-settings-migration.test.ts` - Settings migration tests

### Verification

```bash
cd expo && bun run test -- --runInBand --listTests  # Exits 0
cd expo && bun run test -- --runInBand             # All 30 tests pass
```

## Task 2: Printer Domain Types Expansion

### Key Decisions

1. **Domain Model Separation**: Split printer concerns into distinct types:
   - `PrinterTransport`: 'ble' | 'classic' | 'tcp' (physical transport)
   - `PrinterRecord`: SQLite registry entry with stable ID
   - `PrinterCapabilities`: Discovery-time snapshot of printer features
   - `PrinterPreferences`: User preferences stored in AsyncStorage (references printer by ID)
   - `PrintJob`/`PrintJobState`: Queue management types
   - `CardReceiptData`/`DiagnosticsData`: Document payload types

2. **Migration Strategy**: Old `PrinterConfig` had name/address/type directly. New `PrinterPreferences` uses `preferredPrinterId: string | null` to reference the SQLite registry. Migration sets `preferredPrinterId: null` since legacy configs don't have registry IDs.

3. **Graceful Type Coercion**: Migration uses `typeof x === 'string' ? x : default` pattern (not `||`) to handle malformed data.

### Gotchas

- Migration runs in `queryFn` of settings query, before returning - this ensures old data is migrated on first load and stored in new format thereafter
- Detection of old format: `('address' in printer && !('preferredPrinterId' in printer))`
- `PrinterPreferences` doesn't store name/address/type - only a reference ID to the registry

### Files Modified

- `expo/types/index.ts` - Added new domain types, migratePrinterPreferences function
- `expo/providers/SettingsProvider.tsx` - Updated to use PrinterPreferences with migration
- `expo/__tests__/printer/printer-settings-migration.test.ts` - Updated with new migration tests (11 tests)

### Verification

```bash
cd expo && bun run test -- --runInBand printer-settings-migration  # 11 tests pass
cd expo && bun run test -- --runInBand printer                       # 39 tests pass
```

## Task: Documentation for expo/docs

### Key Decisions

1. Added a focused docs set under `expo/docs/` instead of replacing the generic `expo/README.md`. This keeps the scaffolded README intact while giving contributors project-specific onboarding.

2. Documented the printer stack by mapping conceptual layers to real files:
   - `PrintDocument` -> `services/printer/render/document.ts`
   - `PrintQueue` -> `services/printer/queue/engine.ts`
   - `PrinterRegistry` -> `services/printer/registry/service.ts`
   - `TransportAdapters` -> `services/printer/adapters/*`

3. Called out current integration status explicitly. The printer service layer is real, but `app/(tabs)/settings/printer.tsx` and `app/print-preview.tsx` still show older UI-era behavior and are not fully wired into the queue yet.

### Files Created

- `expo/docs/README.md` - Project overview, stack, architecture summary, run commands
- `expo/docs/PRINTER.md` - Thermal printer subsystem, transport support, queue semantics, troubleshooting
- `expo/docs/ARCHITECTURE.md` - App structure, provider pattern, service layer, design decisions
- `expo/docs/CONTRIBUTING.md` - Dev setup, code style, testing workflow, linting notes

### Verification Notes

```bash
git diff --check -- expo/docs/README.md expo/docs/PRINTER.md expo/docs/ARCHITECTURE.md expo/docs/CONTRIBUTING.md  # clean
cd expo && bun run lint  # fails on pre-existing app errors unrelated to docs
```

## Task 10: Print Preview Queue Submission

### Key Decisions

1. `print-preview.tsx` now enqueues real print jobs through `createJob(...)` and uses `settings.printer.preferredPrinterId` as the source of truth instead of the legacy `printerConnected` placeholder flow.
2. Dev-mode gallery save behavior stays intact; queue submission only runs for non-dev printing.
3. Queue feedback is surfaced both via `Alert.alert(...)` and inline status banners with `testID="enqueue-success"` / `testID="enqueue-error"` so UI tests can assert enqueue outcomes.

### Files Modified

- `expo/app/print-preview.tsx` - Replaced placeholder print alert with queue-backed submission and enqueue status banners

## Task: Scryfall Service Unit Tests

## Task 9: Printer Settings Real Registry Wiring

### Key Decisions

1. The printer settings screen now treats `settings.printer.preferredPrinterId` as the source of truth and derives visible printer details from registry records instead of the removed legacy `{ name, address, type }` settings shape.
2. Device rows now expose explicit `connect-${id}` and `test-print-${id}` actions while preserving the existing `scan-printers` and `device-${id}` test IDs.
3. The fake adapter now accepts either registry IDs or device addresses for connect/disconnect checks so the real registry service works unchanged in fake/web/test environments.

### Files Modified

- `expo/app/(tabs)/settings/printer.tsx` - Replaced mock scan/connect/test behavior with registry + job creation flow, added preferred-printer status UI, surfaced iOS BLE-only messaging
- `expo/services/printer/adapters/fake.ts` - Normalized fake adapter connection lookups for registry-driven address usage
- `expo/__tests__/printer/fake-printer-adapter.test.ts` - Added address-based fake adapter coverage
- `expo/app/(tabs)/settings/index.tsx` - Removed legacy `settings.printer.name` usage from settings summary row

### Verification

```bash
cd expo && bunx tsc --noEmit           # passes
cd expo && bun run test -- --runInBand # 209 tests pass
```

### Key Decisions

1. Created comprehensive test file at `expo/__tests__/services/scryfall.test.ts` with 41 tests covering all 8 exported functions:
   - `fetchRandomCard`: happy path, localization, retries, 404/429 handling, card_faces mapping, rarity defaults
   - `fetchMultipleCards`: sequential fetching, excludeFunny flag
   - `searchCards`: pagination, 404/429 handling, language filtering
   - `autocompleteCardName`: query validation, API errors
   - `fetchCardPrintings`: response parsing, card_faces image fallback, API errors
   - `fetchSets`: filtering by set_type, sorting by released_at desc, missing date handling
   - `parseAdvancedSyntax`: R/T/F/A/S shortcuts, mana cost parsing, case insensitivity
   - `fetchRandomBgCardForType`: type queries, split cards, error handling

2. Mock Strategy: Used `jest.fn()` for global `fetch` mock. Set `global.fetch = mockFetch` before importing the service module.

3. Test Helper: Created `createFakeScryfallCard()` factory to generate consistent test fixtures with partial overrides.

### Gotchas

- URL encoding in assertions: When checking URLs for query params, use URL-encoded strings (e.g., `game%3Apaper` instead of `game:paper`) since `toContain` does literal matching.

- card_faces fallback behavior: `mapScryfallCard` uses `data.xxx ?? face?.xxx ?? ''` pattern. If top-level `data.mana_cost` is set (even to a string), the face value is NOT used. To test face fallback, must explicitly set `mana_cost: undefined` in test fixture.

- parseAdvancedSyntax splits input by whitespace first: `A:John Avon` becomes `['A:John', 'Avon']`, so only `A:John` is processed as a shortcut.

- Mana cost with only C (colorless): `parseAdvancedSyntax('3C')` produces `mv=4` but does NOT add `c:c` filter (C is stripped, resulting in empty color string).

- Sets sorting: Uses `localeCompare` on ISO date strings, so `'2020-06-01'.localeCompare('2020-02-01')` correctly returns positive (descending sort).

### Files Created

- `expo/__tests__/services/scryfall.test.ts` - 41 tests for scryfall service

### Verification

```bash
cd expo && bun run test -- --runInBand scryfall  # 41 tests pass
cd expo && bun run test -- --runInBand           # 209 tests pass (13 suites)
```

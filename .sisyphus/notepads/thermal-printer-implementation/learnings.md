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

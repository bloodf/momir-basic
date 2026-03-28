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

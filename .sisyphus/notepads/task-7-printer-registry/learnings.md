# Task 7: Printer Registry Service - Learnings

## Key Findings

### 1. Jest Module Mocking with TypeScript
- Jest's `jest.mock()` doesn't work well with relative imports in TypeScript when using jest-expo preset
- Solution: Use dependency injection (factory pattern) instead of mocking at module level
- The `createRegistryService(deps)` factory accepts mock dependencies, making tests simple and reliable

### 2. Mock Files in __mocks__ Directories
- Created manual mocks in `expo/__mocks__/` for modules that couldn't be mocked via jest.mock()
- Mock files: expo-sqlite, react-native-thermal-pos-printer, expo-haptics, expo-media-library, AsyncStorage, @nkzw/create-context-hook
- Use .js extension for mock files even when the original is TypeScript

### 3. moduleNameMapper for Jest
- Use moduleNameMapper in jest.config.js to map module names to mock files
- Format: `'^module-name$': '<rootDir>/path/to/mock.js'`
- The registry service required special mapping to point to actual TypeScript file

### 4. SettingsProvider Integration
- Added `savePreferredPrinter()` and `getPreferredPrinter()` helper methods
- Used dynamic imports inside callbacks to avoid circular dependencies
- Pattern: `const { registryService } = await import('...')` inside async callbacks

### 5. Registry Service Design
- `upsertDiscovered()` must be inside `createRegistryService()` to access injected repo
- `filterTransport()` filters out classic Bluetooth printers on iOS (BLE-only platform)
- Merge by address: if address exists, update; otherwise insert with new UUID

## Files Created/Modified
- `expo/services/printer/registry/service.ts` - Registry service with factory pattern
- `expo/services/printer/registry/index.ts` - Public exports  
- `expo/__tests__/printer/printer-registry.test.ts` - 16 tests, all passing
- `expo/providers/SettingsProvider.tsx` - Added savePreferredPrinter/getPreferredPrinter helpers
- `expo/__mocks__/` - Various mock files for Jest

## Test Results
- 16 tests, 16 passing

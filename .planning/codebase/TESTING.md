# Testing

**Analysis Date:** 2026-04-13

## Test Infrastructure

**Runner:**
- Jest 29.7 with `jest-expo` preset (v54.0.0)
- Config: `jest.config.js` at project root
- TypeScript support via `@types/jest`

**Assertion Library:**
- Jest built-in `expect` with `@jest/globals` imports in some files
- `@testing-library/react-native` v13.3.3 for component testing

**Run Commands:**
```bash
npm test             # Run all tests (Jest)
npm run test:ci      # Run all tests in CI mode (--runInBand)
npx jest --coverage  # Run with coverage
npx playwright test  # Run E2E tests
```

**E2E:**
- Playwright v1.58 with Chromium only
- Config: `playwright.config.ts` at project root
- Starts Expo web server on `http://localhost:8081`

## Test Organization

**Location:** Tests are in a separate `__tests__/` directory at the project root (NOT co-located with source files).

**Directory structure:**
```
__tests__/
├── app/
│   ├── card-face-toggle.test.ts
│   ├── home-hero-cache.test.ts
│   ├── home-hero-prefetch.test.tsx
│   └── home-hero-rotation.test.ts
├── printer/
│   ├── escpos-renderer.test.ts
│   ├── fake-printer-adapter.test.ts
│   ├── native-printer-adapter.test.ts
│   ├── print-document.test.ts
│   ├── printer-db-migrations.test.ts
│   ├── printer-discovery.test.ts
│   ├── printer-registry.test.ts
│   ├── printer-settings-migration.test.ts
│   └── printer-settings.test.ts
├── services/
│   └── scryfall.test.ts
└── utils/
    ├── dither.test.ts
    ├── printerImageErrors.test.ts
    └── searchTokenizer.test.ts
```

**E2E test directory:**
```
e2e/
├── home-hero.spec.ts
├── printer-qa.spec.ts
└── search-filters.spec.ts
```

**File naming conventions:**
- Unit/integration tests: `<feature-name>.test.ts` or `<feature-name>.test.tsx`
- E2E tests: `<feature-name>.spec.ts`
- Test directories mirror source structure: `__tests__/app/`, `__tests__/services/`, `__tests__/utils/`, `__tests__/printer/`

## Test Configuration

**Jest configuration** (`jest.config.js`):
```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^expo-sqlite$': '<rootDir>/__mocks__/expo-sqlite.js',
    '^expo-haptics$': '<rootDir>/__mocks__/expo-haptics.js',
    '^expo-media-library$': '<rootDir>/__mocks__/expo-media-library.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/@react-native-async-storage/async-storage.js',
    '^@nkzw/create-context-hook$': '<rootDir>/__mocks__/@nkzw/create-context-hook.js',
    '^react-native-thermal-printer-driver$': '<rootDir>/__mocks__/react-native-thermal-printer-driver.js',
    '^services/printer/registry/service$': '<rootDir>/services/printer/registry/service.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|...)',
  ],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    'providers/**/*.{ts,tsx}',
    'types/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/e2e/', '/expo/'],
};
```

**Jest setup** (`jest.setup.js`):
```javascript
import '@testing-library/react-native';
jest.setTimeout(10000);
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
```

**Playwright configuration** (`playwright.config.ts`):
```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  baseURL: 'http://localhost:8081',
  webServer: {
    command: 'CI=1 npx expo start --web --localhost',
    url: 'http://localhost:8081',
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

## Test Structure

**Suite organization** -- standard Jest `describe`/`it` pattern:
```typescript
describe('Scryfall Service', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockClear();
    jest.clearAllMocks();
  });

  describe('fetchRandomCard', () => {
    it('fetches a random card successfully', async () => {
      const fakeCard = createFakeScryfallCard();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => fakeCard,
      });

      const result = await fetchRandomCard('creature', 3);

      expect(result.id).toBe('card-id-123');
      expect(result.name).toBe('Test Card');
    });
  });
});
```

**Nested describe pattern:**
- Top-level `describe` for the module/feature
- Nested `describe` for each function or sub-feature
- `it` blocks with descriptive names: `'fetches a random card successfully'`, `'retries on 429 rate limit'`

**Setup/Teardown patterns:**
- `beforeEach` for mock resets and shared state initialization
- `afterEach` for timer cleanup: `jest.runOnlyPendingTimers(); jest.useRealTimers();`
- `jest.useFakeTimers()` in `beforeEach` for timer-dependent tests, restored in `afterEach`

**Assertion patterns:**
- Direct property checks: `expect(result.id).toBe('card-id-123')`
- Object shape checks: `expect(result).toEqual([fakeBLEPrinter])`
- Error matching: `await expect(fn()).rejects.toThrow('message')`, `await expect(fn()).rejects.toMatchObject({ name: 'ScryfallApiError', status: 500 })`
- Type guard testing: `expect(isScryfallApiError(error)).toBe(true)`
- Call count verification: `expect(mockFetch).toHaveBeenCalledTimes(2)`
- Call argument inspection: `expect(mockFetch.mock.calls[0][0]).toContain('/cards/search')`

## Mocking

**Framework:** Jest built-in mocking (`jest.fn()`, `jest.mock()`, `jest.spyOn()`)

**Module mocking pattern** -- mock at the top of the test file, BEFORE importing the module under test:
```typescript
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { fetchRandomCard } from '../../services/scryfall';
```

**Native module mocks** -- defined in `__mocks__/` directory:
- `__mocks__/expo-sqlite.js` -- Full in-memory SQLite database with `FakeSQLite` class
- `__mocks__/expo-haptics.js` -- Stubbed haptics
- `__mocks__/expo-media-library.js` -- Stubbed media library
- `__mocks__/@react-native-async-storage/async-storage.js` -- AsyncStorage mock
- `__mocks__/@nkzw/create-context-hook.js` -- Context hook mock
- `__mocks__/react-native-thermal-printer-driver.js` -- Native printer module mock

**Provider mock pattern** -- mock via `jest.mock()` in component tests:
```typescript
jest.mock('../../providers/HistoryProvider', () => ({
  useHistory: () => ({ cards: [], addCard: jest.fn(), addCards: jest.fn() }),
}));

jest.mock('../../providers/SettingsProvider', () => ({
  useSettings: () => ({ settings: { excludeFunnySets: true } }),
}));

jest.mock('../../providers/NetworkProvider', () => ({
  useNetwork: () => ({ isOnline: true }),
}));
```

**Component mock pattern** -- return null or simplified component:
```typescript
jest.mock('../../components/HistorySheet', () => ({
  HistorySheet: () => null,
}));

jest.mock('../../components/TypePicker', () => ({
  TypePicker: ({ visible, onSelect }: { visible: boolean; onSelect: (type: CardType) => void }) => {
    const { View, Pressable, Text } = require('react-native');
    if (!visible) return null;
    return (
      <View>
        <Pressable testID="select-artifact" onPress={() => onSelect('artifact')}>
          <Text>artifact</Text>
        </Pressable>
      </View>
    );
  },
}));
```

**Expo module mock pattern** -- mock native components:
```typescript
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({ push: mockPush }),
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(() => callback(), [callback]);
    },
  };
});

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: ReactNode }) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));
```

**Icon library mock** -- proxy pattern for lucide-react-native:
```typescript
jest.mock('lucide-react-native', () => {
  const React = require('react');
  return new Proxy({}, {
    get: () => (props: Record<string, unknown>) => React.createElement('Icon', props),
  });
});
```

**What to mock:**
- All native modules (expo-sqlite, expo-haptics, react-native-thermal-printer-driver, etc.)
- All providers (HistoryProvider, SettingsProvider, NetworkProvider)
- External API calls (global.fetch for Scryfall)
- Navigation/routing (expo-router)
- Icon libraries (lucide-react-native)

**What NOT to mock:**
- Pure utility functions under test (searchTokenizer, dither, cardFaces)
- Type definitions
- Constants
- The service module under test itself (scryfall, printer-registry)

**Dependency injection for services:**
- Use factory pattern with optional dependency overrides:
```typescript
export function createRegistryService(deps: RegistryDependencies = {}) {
  const repoUpsertPrinter = deps.repoUpsertPrinter ?? upsertPrinter;
  ...
}

// In test:
const service = createRegistryService({
  repoListPrinters: jest.fn().mockResolvedValue([fakeBLEPrinter]),
  getPreferences: jest.fn().mockResolvedValue({ preferredPrinterId: null }),
});
```

## Fixtures and Factories

**Test data factory pattern:**
- Factory functions that create typed test data with sensible defaults and overridable fields:
```typescript
function createFakeScryfallCard(overrides: Partial<ScryfallCard> = {}): ScryfallCard {
  return {
    id: 'card-id-123',
    name: 'Test Card',
    mana_cost: '{2}{G}',
    type_line: 'Creature - Elf',
    oracle_text: 'When Test Card enters, draw a card.',
    flavor_text: 'Flavor text here.',
    power: '2',
    toughness: '2',
    scryfall_uri: 'https://scryfall.com/card/set/123',
    image_uris: { art_crop: '...', normal: '...', small: '...' },
    set_name: 'Mock Set',
    set: 'MST',
    collector_number: '1',
    artist: 'Test Artist',
    rarity: 'rare',
    colors: ['G'],
    cmc: 3,
    lang: 'en',
    ...overrides,
  };
}
```

**Pre-built test data objects:**
```typescript
const fakeBLEPrinter: PrinterRecord = {
  id: 'reg-001',
  name: 'FakeThermal-BLE-001',
  address: 'fake-ble-001',
  transport: 'ble',
  capabilities: { supportImage: true, supportQR: true, supportCut: true, supportText: true, paperWidth: 58 },
  lastSeenAt: '2025-01-01T00:00:00.000Z',
  createdAt: '2025-01-01T00:00:00.000Z',
};

const card: Card = {
  id: 'delver',
  name: 'Delver of Secrets',
  // ...full card object with faces for face-toggle tests
};
```

**Location:**
- Factories are defined inline in the test file that uses them
- No shared fixture files or separate fixture directory

## Component Testing Pattern

**Full component render with providers:**
```typescript
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderHomeScreen() {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <HomeScreen />
    </QueryClientProvider>
  );
}
```

**Key principles for component tests:**
- Always wrap in `QueryClientProvider` with `retry: false` (to avoid flaky retries)
- Use `@testing-library/react-native` `render`, `fireEvent`, `waitFor`, `act`
- Use `testID` props for element selection: `screen.getByTestId('cast-button')`, `screen.getByTestId('cmc-increment')`
- Use `findByTestId` for async element resolution
- Use `jest.useFakeTimers()` + `jest.advanceTimersByTime()` for timer-based behavior
- Use `act(async () => { ... })` for state updates

**testID convention:**
- kebab-case: `testID="hero-art"`, `testID="cast-button"`, `testID="cmc-decrement"`, `testID="type-label-tap"`, `testID="open-history"`
- Filter elements: `testID="filter-color-W"`, `testID="filter-rarity-rare"`, `testID="filter-toggle"`
- Search: `testID="search-submit"`, `testID="search-results"`
- Cards: `testID="card-list-item-{id}"`

## Coverage

**Current coverage:** Not enforced -- no coverage thresholds configured.

**Coverage configuration:**
- Collects from: `app/**/*.{ts,tsx}`, `services/**/*.{ts,tsx}`, `providers/**/*.{ts,tsx}`, `types/**/*.{ts,tsx}`
- Excludes: `**/*.d.ts`
- No minimum threshold set in `jest.config.js`

**View coverage:**
```bash
npx jest --coverage
```

## E2E Testing

**Framework:** Playwright with Expo web server

**Setup:**
- Playwright starts Expo web server automatically (`webServer` config)
- Uses Chromium only (not multi-browser)
- Single worker (`workers: 1`) to avoid race conditions
- `fullyParallel: false`

**API mocking pattern in E2E:**
```typescript
await page.route('https://api.scryfall.com/cards/random**', async route => {
  const requestUrl = new URL(route.request().url());
  const query = decodeURIComponent(requestUrl.searchParams.get('q') ?? '');
  const type = inferCardType(query);
  // ...return mock response
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ... }),
  });
});
```

**Test scenarios covered:**
- Hero art rotation after 15 seconds (`e2e/home-hero.spec.ts`)
- Search filter panel scrolling and filter-only searches (`e2e/search-filters.spec.ts`)
- Printer QA testing (`e2e/printer-qa.spec.ts`)

**Element selection in E2E:**
- Use `data-testid` attribute: `page.locator('[data-testid="hero-art"]')`
- Use `getByTestId`: `page.getByTestId('filter-toggle')`
- Use `aria-label` for assertion: `heroArt.getAttribute('aria-label')`
- Use `waitForRequest` for API call verification

**Timeout pattern:**
- Extended test timeouts for slow operations: `test.setTimeout(90_000)`
- Use `waitUntil: 'domcontentloaded'` for faster page loads

## Test Types

**Unit Tests:**
- Pure function testing: `searchTokenizer.test.ts`, `dither.test.ts`, `card-face-toggle.test.ts`
- Service testing with mocked fetch: `scryfall.test.ts`
- Utility testing: `printerImageErrors.test.ts`
- Timer-based logic: `home-hero-rotation.test.ts`, `home-hero-cache.test.ts`

**Integration Tests:**
- Service with dependency injection: `printer-registry.test.ts`, `printer-settings.test.ts`, `printer-discovery.test.ts`
- Database integration with in-memory SQLite mock: `printer-db-migrations.test.ts`
- Adapter integration: `fake-printer-adapter.test.ts`, `native-printer-adapter.test.ts`
- ESC/POS rendering: `escpos-renderer.test.ts`, `print-document.test.ts`
- Component with providers: `home-hero-prefetch.test.tsx`

**E2E Tests:**
- Playwright against Expo web: `home-hero.spec.ts`, `search-filters.spec.ts`, `printer-qa.spec.ts`

## Common Patterns

**Async Testing:**
```typescript
it('fetches a random card successfully', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => fakeCard,
  });
  const result = await fetchRandomCard('creature', 3);
  expect(result.id).toBe('card-id-123');
});
```

**Error Testing:**
```typescript
it('throws on non-retryable API errors', async () => {
  mockFetch.mockResolvedValue({
    ok: false,
    status: 500,
    json: async () => ({ details: 'Service unavailable' }),
  });
  await expect(fetchRandomCard('creature', 3)).rejects.toMatchObject({
    name: 'ScryfallApiError',
    status: 500,
    isTransient: true,
    reason: 'server',
  });
});
```

**Timer Testing:**
```typescript
describe('timer-based feature', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); });

  it('fires callback after interval', () => {
    const onRotate = jest.fn();
    const stopRotation = startHeroArtRotationInterval(onRotate);
    jest.advanceTimersByTime(HERO_ROTATION_INTERVAL_MS);
    expect(onRotate).toHaveBeenCalledTimes(1);
    stopRotation();
  });
});
```

**Retry Logic Testing:**
```typescript
it('retries on 429 rate limit', async () => {
  mockFetch
    .mockResolvedValueOnce({ ok: false, status: 429 })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => fakeCard });
  const result = await fetchRandomCard('creature', 3);
  expect(result.id).toBe('card-id-123');
  expect(mockFetch).toHaveBeenCalledTimes(2);
});
```

**Regression Testing:**
- Mark critical regression tests with comments: `// CRITICAL REGRESSION TEST: dark images must NOT produce solid output`
- Test edge cases that previously broke: dark image dithering, double-faced cards, rate limiting

## Testing Gaps

**Areas with little or no test coverage:**
- **Components:** Most UI components have no dedicated tests (ManaCost, ManaSymbol, SetSymbol, CardGridItem, CardListItem, SearchFilters, etc.)
- **Providers:** No direct provider unit tests (SettingsProvider, HistoryProvider, NetworkProvider logic untested in isolation)
- **i18n:** No tests for locale detection, locale switching, or translation completeness
- **App routes:** Only the home screen has a component test. Game, Search, Settings, History, Life Counter, Card, Print Preview screens have no component tests
- **Animation logic:** Extensive animation code in home screen and toast is untested
- **Navigation flow:** No tests for route transitions or deep linking

**Critical paths that need tests:**
- **Settings migration:** Legacy printer config migration is tested (`printer-settings-migration.test.ts`) but the full `SettingsProvider` load/save cycle is not
- **Error boundaries:** No React error boundary tests
- **Network resilience:** Only basic Scryfall retry logic is tested; the `NetworkProvider` polling and reconnect behavior is not tested
- **AsyncStorage integration:** No tests for the actual AsyncStorage read/write/merge behavior in providers

**Testing improvements needed:**
- Add coverage thresholds to `jest.config.js` (recommend 80% per project standards)
- Add component tests for reusable components (ManaCost, TypePicker, SearchFilters)
- Add provider isolation tests using real AsyncStorage mock
- Add integration tests for card fetching and display flow
- Consider adding snapshot tests for component rendering
- E2E tests should cover the full "cast a card" flow and settings changes
- Add test for i18n locale switching and translation key completeness across all 11 locales

---

*Testing analysis: 2026-04-13*
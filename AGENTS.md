# AGENTS.md — Momir Basic Development Guide

**Project:** Momir Basic (React Native MTG Randomizer)
**Generated:** 2026-03-31
**Root:** No parent — this is the root AGENTS.md

This guide routes AI agents and developers through the Momir Basic codebase. It describes the project architecture, tooling, conventions, and common workflows.

---

## Quick Start

### Prerequisites
- Node.js 18+ (recommend Bun for faster installs)
- Xcode 15+ (macOS) for iOS development
- Android Studio (for Android development)
- EAS CLI for builds: `npm install -g eas-cli`

### Setup
```bash
# Install dependencies
bun install

# Start dev server (uses Expo tunnel for remote testing)
bun start

# Build for iOS simulator
bun ios

# Build for Android emulator
bun android
```

### After package.json changes
```bash
bun install
npx expo prebuild --clean   # Required before native builds
```

### Run tests
```bash
bun test                    # Jest unit/integration tests
bun test:ci                 # CI-safe (single-threaded)
bunx playwright test        # E2E tests
```

---

## Architecture Overview

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Runtime** | React Native | 0.81.5 |
| **Framework** | Expo | ~54.0.27 |
| **Router** | Expo Router | ~6.0.17 |
| **Language** | TypeScript | ~5.9.2 |
| **State** | Zustand | ^5.0.2 |
| **Data Fetching** | TanStack React Query | ^5.83.0 |
| **Validation** | Zod | ^4.3.6 |
| **API** | Scryfall (Magic cards) | REST |
| **Hardware** | Thermal Printer | react-native-thermal-printer-driver ^0.1.0 |
| **UI Icons** | Lucide React Native | ^0.475.0 |
| **Internationalization** | Custom i18n | 11 languages |
| **Database** | Expo SQLite + LanceDB | ^15.2.0 |
| **Testing** | Jest + Playwright | ^29.7.0 / ^1.58.2 |
| **CI/CD** | GitHub Actions + EAS | - |

### Directory Structure

```
momir-basic/
├── app/                        # Expo Router screens (navigation structure)
│   ├── (tabs)/                 # Tabbed layout
│   │   ├── home/
│   │   ├── history/
│   │   ├── settings/
│   │   └── printer/
│   ├── print-preview.tsx       # Print screen before thermal output
│   └── _layout.tsx             # Root layout with providers
│
├── components/                 # Reusable React Native UI components
│   ├── CardGridItem.tsx        # Card in grid view
│   ├── CardListItem.tsx        # Card in list view
│   ├── SearchFilters.tsx       # Filter modal (28KB — complex)
│   ├── ManaCost.tsx            # Mana symbol rendering
│   ├── OracleText.tsx          # Card rules text
│   ├── Toast.tsx               # Toast notifications
│   ├── Skeleton.tsx            # Loading skeletons
│   ├── HistorySheet.tsx        # Bottom sheet for history
│   ├── SetSymbol.tsx           # Magic set symbols
│   ├── DitheredImage.tsx       # Dithering for monochrome print
│   ├── PrintManaCost.tsx       # Mana for printer rendering
│   └── PrintOracleText.tsx     # Rules text for printer
│
├── services/                   # Business logic & API clients
│   ├── scryfall.ts             # Scryfall API wrapper (15KB)
│   └── printer/                # Thermal printer service (complex)
│       ├── adapters/           # Hardware abstraction
│       │   ├── port.ts         # Bluetooth/serial interface
│       │   ├── native.ts       # React Native native module
│       │   ├── fake.ts         # Mock for testing
│       │   └── factory.ts      # Adapter factory
│       ├── registry/           # Device registry & discovery
│       │   ├── service.ts      # Registry business logic
│       │   └── index.ts        # Exports
│       ├── storage/            # Persistent printer state
│       │   ├── database.ts     # SQLite wrapper
│       │   ├── schema.ts       # Table definitions
│       │   └── repositories.ts # Data access objects
│       ├── render/             # Print rendering engine
│       │   ├── document.ts     # Document layout
│       │   ├── escpos.ts       # ESC/POS command generation
│       │   └── index.ts        # Exports
│       ├── capability/         # Device capabilities
│       │   ├── service.ts      # Capability detection
│       │   └── index.ts        # Exports
│       └── diagnostics/        # Debugging tools
│           ├── logger.ts       # Structured logging
│           └── index.ts        # Exports
│
├── providers/                  # React context providers
│   ├── SettingsProvider.tsx    # User preferences (theme, filters)
│   ├── NetworkProvider.tsx     # Network connectivity detection
│   └── HistoryProvider.tsx     # Card draw history
│
├── types/                      # TypeScript type definitions
│   └── index.ts                # Scryfall types, printer types, app state
│
├── constants/                  # Theme, colors, card types
│   ├── colors.ts               # Color palette
│   ├── cardTypes.ts            # Magic card types
│   └── manaSymbols.ts          # Mana cost mappings
│
├── utils/                      # Utility functions
│   ├── format.ts               # String formatting
│   ├── validators.ts           # Input validation
│   └── card-search.ts          # Card filtering logic
│
├── i18n/                       # Internationalization (11 languages)
│   ├── locales/
│   │   ├── en.ts               # English
│   │   ├── pt.ts               # Portuguese
│   │   ├── es.ts               # Spanish
│   │   ├── fr.ts               # French
│   │   ├── de.ts               # German
│   │   ├── it.ts               # Italian
│   │   ├── ja.ts               # Japanese
│   │   ├── ko.ts               # Korean
│   │   ├── ru.ts               # Russian
│   │   ├── zhs.ts              # Simplified Chinese
│   │   └── zht.ts              # Traditional Chinese
│   ├── useTranslation.ts       # i18n hook
│   └── index.ts                # Locale loader
│
├── __tests__/                  # Unit & integration tests
│   ├── services/               # Service tests
│   ├── printer/                # Printer service tests
│   └── utils/                  # Utility tests
│
├── __mocks__/                  # Jest mocks
│   ├── services/               # Mock services
│   ├── providers/              # Mock providers
│   └── @react-native-*/        # RN module mocks
│
├── e2e/                        # Playwright E2E tests
│   ├── home.spec.ts            # Home screen flows
│   ├── search.spec.ts          # Search & filter flows
│   └── printer.spec.ts         # Printer integration tests
│
├── assets/                     # Static assets
│   ├── images/                 # Icons, splash, app icon
│   └── fonts/                  # Custom fonts
│
├── docs/                       # Documentation
│   ├── README.md               # User-facing guide
│   ├── ARCHITECTURE.md         # System design
│   └── release/                # Release notes & sign-offs
│
├── .github/workflows/          # CI/CD pipelines
│   ├── test.yml                # Run tests on push
│   ├── build.yml               # EAS builds on release
│   └── lint.yml                # ESLint checks
│
├── expo/                       # Monorepo second workspace (optional)
│   └── [same structure]        # Parallel Expo config
│
├── app.json                    # Expo app configuration
├── eas.json                    # EAS Build profiles (preview/production)
├── package.json                # Dependencies & scripts
├── tsconfig.json               # TypeScript config
├── babel.config.js             # Babel transpilation rules
├── metro.config.js             # Metro bundler (RN) config
├── jest.config.js              # Jest test configuration
├── jest.setup.js               # Jest mocks & setup
├── eslint.config.js            # Flat ESLint config (v9)
├── playwright.config.ts        # Playwright config
└── PLAN.md                     # Development planning notes
```

---

## State Management

### Zustand Stores

**Location:** `types/index.ts` and individual provider contexts.

Each store is a Zustand module defining reactive state:
- `SettingsStore` — user preferences (theme, language, filter defaults)
- `HistoryStore` — card draw history (persisted to AsyncStorage)
- `PrinterStore` — printer discovery & queue state (persisted to SQLite)

**Pattern:**
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set) => ({
      theme: 'auto',
      language: 'en',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'settings-storage' }
  )
)
```

**Rules:**
- Use immutable patterns (spread operator, never mutate state)
- Persist user preferences to AsyncStorage
- Derive computed state in selectors, not in store
- Keep stores under 200 lines

### React Query

**Location:** `services/scryfall.ts` and printer service hooks.

Manages server state (card data, printer discovery):
```typescript
const { data: cards, isLoading, error } = useQuery({
  queryKey: ['cards', filters],
  queryFn: () => scryfallApi.searchCards(filters),
  staleTime: 5 * 60 * 1000, // 5 min
})
```

**Rules:**
- Use stable query keys (arrays with dependencies)
- Set `staleTime` appropriately (API data doesn't change often)
- Handle errors with user-friendly messages
- Use `useQueries` for batch requests

---

## Internationalization (i18n)

### Structure

**11 supported languages:**
English, Portuguese, Spanish, French, German, Italian, Japanese, Korean, Russian, Simplified Chinese, Traditional Chinese

**Locale files:** `i18n/locales/{locale}.ts`
Each file exports a flat object: `{ "key": "translated string" }`

### Adding New Strings

**MANDATORY:** When adding UI text, add keys to ALL 11 locale files:

```typescript
// i18n/locales/en.ts
export const en = {
  'printer.connected': 'Printer Connected',
  'printer.error': 'Connection failed',
  // ...
}
```

Then in ALL other locales:
```typescript
// i18n/locales/pt.ts (repeat for de, es, fr, it, ja, ko, ru, zhs, zht)
export const pt = {
  'printer.connected': 'Impressora Conectada',
  'printer.error': 'Falha na conexão',
  // ...
}
```

### Usage

```typescript
import { useTranslation } from '@/i18n'

export function Component() {
  const { t } = useTranslation()
  return <Text>{t('printer.connected')}</Text>
}
```

---

## Thermal Printer Integration

### Architecture

The printer service is a layered system:

1. **Port** (`adapters/port.ts`) — Low-level hardware interface (Bluetooth/serial)
2. **Adapter** (`adapters/{native|fake}.ts`) — Platform-specific implementation
3. **Render** (`render/`) — ESC/POS command generation & document layout
4. **Registry** (`registry/`) — Device discovery & pairing
5. **Storage** (`storage/`) — Persist printer state to SQLite
6. **Diagnostics** (`diagnostics/`) — Debug logging & error collection

### Key Files

| File | Purpose | Size |
|------|---------|------|
| `adapters/port.ts` | Abstract port interface | ~150 lines |
| `adapters/native.ts` | react-native-thermal-printer-driver wrapper | ~200 lines |
| `render/escpos.ts` | ESC/POS command generation | ~300 lines |
| `registry/service.ts` | Device discovery & state | ~250 lines |
| `storage/database.ts` | SQLite persistence layer | ~180 lines |

### Usage Flow

```
User taps "Print" button
  ↓
App loads saved printer from SQLite registry
  ↓
Calls Port.connect() → triggers native Bluetooth pairing
  ↓
Port.print(document) → Render generates ESC/POS bytes
  ↓
Native module sends to device
  ↓
Native adapter sends rendered bytes directly and reports success or failure
  ↓
Toast notification to user
```

### Testing Strategy

- **Unit:** Mock the Port interface with `adapters/fake.ts`
- **Integration:** Use `jest.mock()` to spy on native module calls
- **E2E:** Physical printer + Playwright (manual testing before release)

### Debugging

Enable diagnostics logging:
```typescript
import { logger } from '@/services/printer/diagnostics'
logger.debug('tag', { deviceId, state })
```

Logs written to `__tests__/printer/*.log` for post-mortem analysis.

---

## Component Guidelines

### File Organization

**Rules:**
- One component per file (except compound components)
- Max 400 lines per file
- Keep component files under 200 lines when possible
- Extract sub-components into separate files if growing

### Naming

```
// Component files: PascalCase
CardGridItem.tsx
SearchFilters.tsx

// Internal helpers: camelCase
const formatCardName = (name: string) => { ... }

// Types/interfaces: PascalCase
interface CardItemProps { ... }
type CardSortOrder = 'name' | 'mana' | 'type'
```

### Structure Template

```typescript
import { View, Text } from 'react-native'
import { useTranslation } from '@/i18n'

interface MyComponentProps {
  title: string
  onPress?: () => void
}

/**
 * Renders a card grid item with image, name, and mana cost.
 */
export function CardGridItem({ title, onPress }: MyComponentProps) {
  const { t } = useTranslation()

  return (
    <View>
      <Text>{title}</Text>
    </View>
  )
}
```

### Props Validation

Use Zod for runtime validation:
```typescript
import { z } from 'zod'

const CardPropsSchema = z.object({
  card: z.object({
    id: z.string(),
    name: z.string(),
    manaValue: z.number().optional(),
  }),
})

type CardProps = z.infer<typeof CardPropsSchema>
```

---

## Testing

### Test Structure

**Location:** `__tests__/` mirrors src structure

```
__tests__/
├── services/
│   ├── scryfall.test.ts        # Scryfall API client tests
│   └── printer/                # Printer service tests
│       ├── adapters.test.ts
│       ├── registry.test.ts
│       ├── render.test.ts
│       └── queue.test.ts
└── utils/
    └── format.test.ts
```

### TDD Workflow (Required)

For any new feature:

1. **RED** — Write test first (should fail)
   ```typescript
   describe('searchCards', () => {
     it('filters by mana value', async () => {
       const result = await searchCards({ manaMax: 3 })
       expect(result).toEqual(expect.arrayContaining([...]))
     })
   })
   ```

2. **GREEN** — Write minimal code to pass
   ```typescript
   export const searchCards = async (filters) => {
     return cards.filter(c => !filters.manaMax || c.mana <= filters.manaMax)
   }
   ```

3. **REFACTOR** — Improve without breaking tests
   ```typescript
   const isWithinManaLimit = (card, max) => !max || card.mana <= max
   export const searchCards = async (filters) => {
     return cards.filter(c => isWithinManaLimit(c, filters.manaMax))
   }
   ```

### Coverage Requirements

- **Minimum:** 80% across the project
- **Critical paths:** 100% (printer queue, search, history)
- **UI components:** 60% (render snapshots + user interactions)

### Mocking

**Jest mocks** in `__mocks__/`:
- `services/` — Mock Scryfall API and printer service
- `providers/` — Mock React context providers
- `@react-native-*` — Mock native modules

**Example mock:**
```typescript
// __mocks__/services/scryfall.ts
export const mockSearchCards = jest.fn().mockResolvedValue([
  {
    id: 'test-1',
    name: 'Lightning Bolt',
    manaValue: 1,
  }
])
```

### Running Tests

```bash
# Run all tests
bun test

# Watch mode
bun test --watch

# Coverage report
bun test --coverage

# Specific suite
bun test printer.test.ts
```

---

## Git Workflow

### Commit Format

Follow Conventional Commits:
```
<type>(<scope>): <description>

[optional body]

[optional footer: Closes #123]
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `refactor` — Code restructuring (no behavior change)
- `docs` — Documentation updates
- `test` — Test additions/updates
- `style` — Formatting (no logic change)
- `perf` — Performance optimization
- `chore` — Dependency updates, config changes

**Scopes:**
- `printer` — Thermal printer service
- `search` — Card search & filters
- `i18n` — Internationalization
- `ui` — UI components
- `types` — Type definitions

**Examples:**
```
feat(printer): add device capability detection
fix(search): handle empty mana cost filter
docs(i18n): add translation guide
test(printer): add queue state machine tests
refactor(ui): extract card image component
```

### Before Committing

- [ ] Tests passing: `bun test`
- [ ] Linting clean: `bun run lint`
- [ ] TypeScript no errors: `npx tsc --noEmit`
- [ ] No console.log() in production code
- [ ] All i18n strings added to all 11 locales
- [ ] No hardcoded values (use constants)

### Branch Naming

```
feature/printer-capability-detection
fix/search-filter-empty-crash
docs/add-printer-guide
```

### Pull Requests

Include:
1. **Summary** — What changed and why
2. **Test Plan** — How to verify the change
3. **Checklist:**
   - [ ] Tests added/updated
   - [ ] Linting passes
   - [ ] TypeScript clean
   - [ ] i18n complete (if UI text added)
   - [ ] No breaking changes

---

## Build & Deployment

### Local Builds

```bash
# iOS simulator
bun ios

# Android emulator
bun android

# Web (Expo web)
bun start-web
```

### Native Build (Custom Dev Client)

The app requires a custom dev build (not Expo Go) for printer support:

```bash
# Prebuild native code
npx expo prebuild --clean

# Then run iOS/Android
bun ios
bun android
```

### EAS Build (Production)

Configured in `eas.json`:
- `preview` — Beta testing build
- `production` — App store release

```bash
# Build for preview (iOS + Android)
eas build --platform all --profile preview

# Build for production
eas build --platform all --profile production
```

**EAS Build credentials:** Stored in Expo CI/CD (requires EAS account linked to GitHub)

### CI/CD Pipelines

**`.github/workflows/`:**
- `test.yml` — Runs Jest on every push
- `lint.yml` — ESLint checks
- `build.yml` — EAS build on git tag (release)

Triggers:
- `push` → test + lint
- Tag `v*` → EAS build to production

---

## Code Style & Quality

### TypeScript

**Rules:**
- No `any` type (use `unknown` with narrowing)
- Strict mode enabled
- Explicit return types on functions

```typescript
// ✓ Good
function formatCard(card: Card): string {
  return `${card.name} (${card.manaValue})`
}

// ✗ Bad
const formatCard = (card) => card.name
```

### Naming Conventions

```
// Variables: camelCase
const maxManaValue = 10
const isConnected = true

// Constants: SCREAMING_SNAKE_CASE
const MAX_PRINT_ATTEMPTS = 3
const DEFAULT_TIMEOUT_MS = 5000

// Files: PascalCase (components), camelCase (utilities)
CardGrid.tsx          ✓
formatCardName.ts     ✓
card-grid.tsx         ✗ (should be CardGrid.tsx)
```

### Immutability

**CRITICAL:** Never mutate objects. Always create new objects.

```typescript
// ✗ Bad — mutates state
cards[0].printed = true

// ✓ Good — creates new array
const updated = cards.map((c, i) =>
  i === 0 ? { ...c, printed: true } : c
)
```

**Spread operator:**
```typescript
// Objects
const updated = { ...original, field: newValue }

// Arrays
const updated = [...original, newItem]

// Nested
const updated = {
  ...state,
  nested: { ...state.nested, field: value }
}
```

### File Size Limits

- **Components:** Max 400 lines (aim for <200)
- **Services:** Max 500 lines (break into modules)
- **Hooks:** Max 100 lines
- **Utils:** Max 300 lines

If file exceeds limit, extract functions/components into separate files.

---

## Error Handling

### User-Facing Errors

Always provide clear, actionable messages:

```typescript
// ✗ Bad
throw new Error('NETWORK_ERROR')

// ✓ Good
throw new Error('Unable to reach Scryfall. Check your internet and try again.')
```

### Service Layer

Validate inputs at system boundaries (APIs, native modules):

```typescript
import { z } from 'zod'

const PrintJobSchema = z.object({
  deviceId: z.string().min(1),
  document: z.object({ /* ... */ }),
})

export const printDocument = (job: unknown) => {
  const validated = PrintJobSchema.parse(job) // Throws if invalid
  // ... proceed with validated job
}
```

### Logging

Use structured logging for server-side debugging:

```typescript
import { logger } from '@/services/printer/diagnostics'

logger.info('print_started', {
  deviceId,
  documentSize: doc.pages.length,
})

logger.error('print_failed', {
  deviceId,
  error: err.message,
  stack: err.stack,
})
```

---

## Performance Optimization

### Image Rendering

Use `expo-image` for optimized loading:

```typescript
import { Image } from 'expo-image'

<Image
  source={{ uri: card.imageUri }}
  style={{ width: 200, height: 280 }}
  cachePolicy="memory-disk"
/>
```

### Query Performance

Debounce search filters to reduce API calls:

```typescript
const debouncedSearch = useMemo(
  () => debounce((term) => searchCards(term), 300),
  []
)
```

### List Rendering

Use `FlatList` with `getItemLayout` for large lists:

```typescript
<FlatList
  data={cards}
  keyExtractor={(card) => card.id}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  maxToRenderPerBatch={10}
/>
```

---

## Common Workflows

### Adding a New Card Filter

1. **Define type** in `types/index.ts`:
   ```typescript
   interface CardFilter {
     name?: string
     manaMax?: number
     type?: string
     rarity?: 'common' | 'uncommon' | 'rare' | 'mythic'
   }
   ```

2. **Update Scryfall service** (`services/scryfall.ts`):
   ```typescript
   export const searchCards = async (filters: CardFilter) => {
     const query = buildScryfallQuery(filters)
     return fetchCards(query)
   }
   ```

3. **Add UI component** (`components/SearchFilters.tsx`):
   ```typescript
   <Picker>
     <Picker.Item label="All Rarities" value={undefined} />
     <Picker.Item label="Common" value="common" />
     {/* ... */}
   </Picker>
   ```

4. **Write tests** (`__tests__/services/scryfall.test.ts`):
   ```typescript
   it('filters by rarity', async () => {
     const cards = await searchCards({ rarity: 'rare' })
     expect(cards).toEqual(expect.arrayContaining([...]))
   })
   ```

5. **Add i18n strings** (all 11 locales):
   ```typescript
   // i18n/locales/en.ts
   'filter.rarity': 'Card Rarity',
   'filter.rarity.rare': 'Rare',
   ```

6. **Test & commit:**
   ```bash
   bun test
   bun run lint
   git add .
   git commit -m "feat(search): add rarity filter"
   ```

### Debugging Printer Issues

1. **Enable diagnostics:**
   ```typescript
   const diagnostic = await printerRegistry.diagnose(deviceId)
   console.log(diagnostic)
   ```

2. **Check SQLite state:**
   ```bash
   sqlite3 /path/to/printer.db "SELECT * FROM devices;"
   ```

3. **Review native logs:**
   - iOS: Xcode Console
   - Android: `adb logcat | grep "ThermalPrinter"`

4. **Test with fake adapter:**
   ```typescript
   const adapter = new FakeAdapter() // Mock for testing
   await adapter.print(document)
   ```

### Adding a New Language

1. **Create locale file** (`i18n/locales/{locale}.ts`):
   ```typescript
   export const newLocale = {
     'app.title': 'Translated Title',
     'app.description': 'Translated Description',
     // ... copy all keys from en.ts
   }
   ```

2. **Register in loader** (`i18n/index.ts`):
   ```typescript
   const locales = {
     en, pt, es, fr, de, it, ja, ko, ru, zhs, zht, newLocale
   }
   ```

3. **Test:**
   ```bash
   bun test
   # Manually change device language to verify
   ```

---

## Agent Guidance

### When to Delegate Work

Use subagents for:
- **Multi-file refactoring** → `executor`
- **Test implementation** → `test-engineer`
- **Bug investigation** → `debugger`
- **Code review** → `code-reviewer`
- **Documentation** → `writer`

### What Agents Should Know

- Run `bun install` after modifying `package.json`
- Use `npx expo prebuild --clean` before native builds
- Test with `bun test` before committing
- Always update all 11 i18n locale files for UI text
- Keep components under 400 lines
- Follow immutable patterns (spread, never mutate)
- ESLint uses flat config (eslint.config.js)

### Local Development

- Dev server: `bun start` (Expo tunnel for remote testing)
- Custom dev client required (printer needs native code)
- TypeScript: `npx tsc --noEmit` before commits
- Linting: `bun run lint` (eslint.config.js v9)

---

## References

- **Scryfall API Docs:** https://scryfall.com/docs/api
- **React Native Docs:** https://reactnative.dev
- **Expo Router Docs:** https://docs.expo.dev/router/introduction
- **Zustand Docs:** https://github.com/pmndrs/zustand
- **React Query Docs:** https://tanstack.com/query/latest
- **Zod Docs:** https://zod.dev
- **Playwright Docs:** https://playwright.dev
- **Jest Docs:** https://jestjs.io

---

## Support & Questions

For issues or questions:
1. Check the relevant section in this AGENTS.md
2. Review the `/docs` directory for architecture docs
3. Check recent commits for patterns: `git log --oneline -20`
4. Ask in project discussions or open an issue

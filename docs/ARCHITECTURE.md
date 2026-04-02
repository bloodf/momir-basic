# Architecture

## Top level structure

```text
expo/
├── app/             Expo Router screens and layouts
├── components/      Shared UI building blocks
├── constants/       Theme colors, mana symbols, card type config
├── i18n/            Locale provider and translation tables
├── providers/       React Query backed persisted app state
├── services/        Scryfall client and printer subsystem
├── types/           Core app and printer domain models
├── __tests__/       Jest tests, currently strongest around printer services
└── __mocks__/       Native and storage mocks for tests
```

There is no `hooks/` directory today. Shared state is handled through providers and local screen hooks.

## Screen architecture

### Root layout

`app/_layout.tsx` creates the global shell:

- `QueryClientProvider`
- `GestureHandlerRootView`
- `I18nProvider`
- `SettingsProvider`
- `HistoryProvider`

It also registers modal routes for:

- `card`
- `print-preview`
- `life-counter`

### Tabs

`app/(tabs)/_layout.tsx` defines five main tabs:

- Cast
- Search
- History
- Game
- Settings

### Main user flows

- **Cast flow**: `app/(tabs)/(home)/index.tsx`
  - fetches background art with `useQuery`
  - casts cards with `useMutation`
  - pushes to `/card`
- **Card detail flow**: `app/card.tsx`
  - rerolls cards
  - fetches printings
  - opens `/print-preview`
- **Search flow**: `app/(tabs)/search/index.tsx`
  - builds advanced Scryfall queries
  - supports autocomplete and paginated search
- **Settings flow**: `app/(tabs)/settings/index.tsx`
  - manages printer, language, fetch filters, and dev mode
- **Printer flow**: `app/(tabs)/settings/printer.tsx`
  - current UI shell for discovery and pairing
  - still being aligned with the newer registry and queue services

## Provider pattern

### `SettingsProvider`

`providers/SettingsProvider.tsx` is the app's persisted settings boundary.

Responsibilities:

- load and save `AppSettings` from AsyncStorage key `momir_settings`
- migrate legacy printer blobs through `migratePrinterPreferences()`
- expose `updateSettings()` and `updatePrinter()`
- hand off preferred printer persistence to `registryService`

Design choice: settings store preferences, not device identity. Stable printer identity lives in SQLite as `PrinterRecord`.

### `HistoryProvider`

`providers/HistoryProvider.tsx` persists card history in AsyncStorage key `momir_card_history` and exposes `addCard`, `addCards`, `removeCard`, `clearHistory`, and `useFilteredHistory()`.

## Data fetching

The app uses React Query heavily, but in a lightweight style.

- `useQuery` handles reads like settings, history, and background art
- `useMutation` handles actions like card casting, rerolls, search requests, and persistence writes
- Query invalidation keeps AsyncStorage-backed providers consistent after writes

The main remote data source is Scryfall.

### `services/scryfall.ts`

Key functions:

- `fetchRandomCard()`
- `fetchMultipleCards()`
- `searchCards()`
- `autocompleteCardName()`
- `fetchCardPrintings()`
- `fetchSets()`
- `parseAdvancedSyntax()`
- `fetchRandomBgCardForType()`

Important implementation details:

- rate limiting through `RATE_LIMIT_MS = 100`
- locale-aware card lookup with `fetchLocalizedCard()`
- search syntax shortcuts such as rarity, type, format, set, artist, and mana shortcuts like `2WU`

## Printer service layer

The printer subsystem is intentionally layered.

### Registry

`services/printer/registry/service.ts`

- discovers printers through an adapter factory
- filters unsupported classic Bluetooth on iOS
- upserts discovered printers into SQLite
- stores preferred printer ID back into settings

### Direct printing

Printing runs directly through the selected adapter after registry lookup and document rendering.

- connects to the preferred printer
- dispatches rendered bytes
- reports success or failure immediately

### Rendering

`services/printer/render/document.ts`

- `CardReceiptDocument` builds card receipts
- `DiagnosticsDocument` builds test output

### Transport

`services/printer/adapters/`

- `native.ts`, real `react-native-thermal-pos-printer` bridge
- `fake.ts`, deterministic fallback for web and tests
- `factory.ts`, chooses the adapter based on platform, test mode, and native module presence

### Persistence

`services/printer/storage/`

- `database.ts`, SQLite access and initialization
- `schema.ts`, migrations
- `repositories.ts`, CRUD for printers and jobs

## Key design decisions

1. **Expo Router for structure**
   - navigation follows the file tree, which keeps route ownership obvious

2. **React Query wraps both remote and local async state**
   - the same pattern is used for Scryfall, AsyncStorage-backed settings, and history

3. **Printer identity moved out of settings**
   - preferences stay in AsyncStorage, printer records live in SQLite

4. **Fake adapters are first class**
   - web, tests, and native-module-missing environments can still exercise printer flows

5. **Preview and print should share a document model**
   - `print-preview.tsx` is the visual receipt today, while `services/printer/render/document.ts` defines the thermal-printable version

## Current rough edges

- `app/(tabs)/settings/printer.tsx` still references the older `PrinterDevice` flow and mock data
- `print-preview.tsx` still ends with alerts and dev save behavior instead of queue submission
- Later printer integration tasks are still wiring UI screens to the registry and queue layers

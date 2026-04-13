# Architecture

**Analysis Date:** 2026-04-13

## High-Level Architecture

**Overall Pattern:** Feature-oriented React Native app with Expo Router file-based navigation, context-based state management, and a layered printer subsystem.

**Key Characteristics:**
- Expo Router file-based routing drives all navigation and screen structure
- React Context (via `@nkzw/create-context-hook`) replaces Zustand for global state -- providers wrap the root layout
- TanStack React Query handles async data fetching, caching, and revalidation
- Scryfall REST API is the sole external data source (card data)
- Printer subsystem uses a layered architecture: adapters -> registry -> render, with SQLite persistence
- AsyncStorage persists user preferences and card history (key-value)
- i18n system with 11 locales, device-locale auto-detection, and Scryfall language mapping

## Provider Tree (Composition Root)

The app's global state lives in React Context providers, nested in `app/_layout.tsx`:

```
QueryClientProvider
  GestureHandlerRootView
    SafeAreaProvider
      I18nProvider          -- locale, translations, scryfallLang
        SettingsProvider     -- AppSettings (printer prefs, feature flags)
          HistoryProvider    -- Card[] history list
            NetworkProvider   -- isOnline, connectivity checking
              ToastProvider   -- showToast() global toasts
                PrinterAutoConnect (runs once on mount)
                RootLayoutNav  (Stack navigator)
```

All providers use `@nkzw/create-context-hook` which generates a `[Provider, useHook]` pair. There is no Zustand store despite the dependency being listed in `package.json`.

## Routing & Navigation

**Expo Router file-based routing** in the `app/` directory:

- **Root Stack** (`app/_layout.tsx`): `Stack` navigator wrapping tabs and modal screens
  - `(tabs)` -- Bottom tab navigator
  - `card` -- Modal presenting card details
  - `print-preview` -- Modal for print preview
  - `life-counter` -- Full-screen modal (slide from bottom)

- **Tab Navigator** (`app/(tabs)/_layout.tsx`): 4 visible tabs + 1 hidden
  - `(home)` -- Cast screen (Momir random card fetching)
  - `search` -- Scryfall search with filters
  - `game` -- Game mode selector (life counter entry)
  - `settings` -- App settings + printer setup
  - `history` -- Hidden tab (no `href`, accessed via sheet)

- **Sub-routes within tabs**: Each tab has its own `Stack` navigator via `_layout.tsx`
  - Settings has two stack screens: `index` and `printer`

**Navigation patterns:**
- `router.push()` for forward navigation
- `router.back()` for dismissal
- `useLocalSearchParams<{ cardJson: string }>()` passes card data between screens as JSON string
- `useFocusEffect()` for re-fetching on screen focus

## State Management Architecture

### React Context Providers (no Zustand in use)

**SettingsProvider** (`providers/SettingsProvider.tsx`):
- State shape: `AppSettings` (printer prefs, excludeDigitalOnly, excludeFunnySets, uniqueCardsOnly, devMode)
- Persistence: AsyncStorage key `momir_settings`
- Mutation: `updateSettings()`, `updatePrinter()`, `savePreferredPrinter()`
- Legacy migration: detects old `LegacyPrinterConfig` format and migrates to `PrinterPreferences`

**HistoryProvider** (`providers/HistoryProvider.tsx`):
- State shape: `Card[]` (ordered by most recent first)
- Persistence: AsyncStorage key `momir_card_history`
- Mutation: `addCard()`, `addCards()`, `removeCard()`, `clearHistory()`
- Derived hook: `useFilteredHistory(search, typeFilter, cmcFilter)` returns memoized filtered list

**NetworkProvider** (`providers/NetworkProvider.tsx`):
- State shape: `{ isOnline, isChecking, checkNow }`
- Connectivity: pings `https://api.scryfall.com/health` every 15s
- Cold-start suppression: ignores first 4 offline results to avoid false offline toasts
- Toast side-effects: shows warning when going offline, success when back online

**I18nProvider** (`i18n/index.ts`):
- State shape: `{ locale, setLocale, t, loaded, scryfallLang }`
- 11 locales: en, pt, es, fr, de, it, ja, ko, ru, zhs, zht
- Auto-detects device locale on first load; persists choice in AsyncStorage key `momir_locale`
- `scryfallLang` maps locale to Scryfall API language code for localized card fetches

### React Query Cache

**QueryClient** created at module scope in `app/_layout.tsx` (no persistence plugin).

| Query Key | Purpose | Refetch Strategy |
|-----------|---------|------------------|
| `['appSettings']` | Load/save app settings | Invalidation on mutation |
| `['cardHistory']` | Card history list | Invalidation on mutation |
| `['networkConnectivity']` | Online status | 15s interval, 10s stale |
| `['randomCard']` (home screen) | Random card fetch | Manual (mutation) |
| `['searchCards']` | Search results | Manual (on search) |

## Data Layer

### API Client: Scryfall

**File:** `services/scryfall.ts`

- Base URL: `https://api.scryfall.com`
- Rate limiting: 100ms minimum between requests (module-level `lastRequestTime`)
- Retry: 3 attempts with exponential backoff (300ms base, 1500ms cap) for transient errors (429, 5xx)
- Custom error class: `ScryfallApiError` with `status`, `isTransient`, `reason` fields
- CMC fallback: `fetchRandomCard()` tries requested CMC, then decrements until a card is found

**Key API functions:**
- `fetchRandomCard(cardType, cmc, excludeFunny, retries, lang)` -- Random card by type/CMC
- `fetchMultipleCards(cardType, count, excludeFunny, lang)` -- Multiple random cards
- `searchCards(query, page, lang)` -- Paginated search with localized collection fetch
- `fetchCardPrintings(cardName)` -- All printings of a named card
- `fetchRandomBgCardForType(cardType)` -- Background art for type selection
- `autocompleteCardName(query)` -- Card name autocomplete
- `fetchSets()` -- Set list for filter dropdowns
- `parseAdvancedSyntax(input)` -- Converts shorthand (R:C, T:I, etc.) to Scryfall syntax

**Data transformation:** `mapScryfallCard(ScryfallCard)` converts snake_case API response to camelCase `Card` type, handling double-faced cards, localized fields, and face preferences.

### Database: SQLite (Printer Subsystem)

**Schema file:** `services/printer/storage/schema.ts`

Two tables:
1. **printers** -- `id (PK), name, address, transport, capabilities (JSON), last_seen_at, created_at`
2. **print_jobs** -- `id (PK), printer_id (FK), canonical_identity, document_type, payload (JSON), state, attempts, last_error, created_at, updated_at, next_retry_at`

**Schema versioning:** `SCHEMA_VERSION = 2` with `MIGRATIONS` array. Database abstraction in `services/printer/storage/database.ts` uses `expo-sqlite` on native, in-memory fallback on web.

**Repository pattern:** `services/printer/storage/repositories.ts` provides CRUD operations:
- `upsertPrinter()`, `getPrinterByAddress()`, `getPrinterById()`, `listPrinters()`, `deletePrinter()`
- Print job CRUD for the queue system

## Printer Subsystem Architecture

The printer subsystem is a deep, layered architecture spanning 6 sub-modules:

```
services/printer/
  adapters/       -- Hardware abstraction layer
    port.ts       -- PrinterPort interface (discover, connect, send, cut)
    native.ts     -- NativeThermalPrinterAdapter (react-native-thermal-printer-driver)
    fake.ts       -- FakePrinterAdapter (web/testing)
    factory.ts    -- createAdapter() platform-aware factory
  registry/       -- Printer identity & discovery coordination
    service.ts    -- registryService (discover, connect, disconnect, savePreferred, forget)
  storage/        -- SQLite persistence
    database.ts   -- PrinterDatabase abstraction (native + in-memory fallback)
    schema.ts     -- Schema versioning & migrations
    repositories.ts -- CRUD repositories
  render/         -- ESC/POS document generation
    escpos.ts     -- EscPosRenderer, mana cost parsing, QR/URL builders
    document.ts   -- CardReceiptDocument, DiagnosticsDocument
  capability/     -- Platform capability & permission checking
    service.ts    -- PrinterCapabilityService (Android BT permissions, transport detection)
  diagnostics/    -- Structured event logging
    logger.ts     -- PrinterSessionLogger, event emission for discovery/connect/print lifecycle
```

**Data flow for printing:**
1. User taps "Print" on card screen
2. `print-preview.tsx` calls `createAdapter()` to get printer connection
3. `EscPosRenderer` builds ESC/POS byte document from `CardReceiptDocument`
4. `utils/printerImage.ts` rasterizes card art (dithering via `utils/dither.ts`)
5. Raw bytes sent via `PrinterPort.sendRaw()`
6. Diagnostics emitted at each lifecycle step

**Adapter pattern:** `PrinterPort` interface abstracts BLE, Classic Bluetooth, and TCP transports. Factory creates platform-appropriate adapter. iOS filters out Classic Bluetooth.

## Feature Architecture

### Cast (Home) Feature

- **Route:** `app/(tabs)/(home)/index.tsx` (~800 lines)
- **Logic:** CMC stepper + card type picker -> fetch random card from Scryfall -> display card -> add to history
- **Sub-modules:** `heroArtCache.ts` (LRU warm cache for background art), `heroRotation.ts` (15s rotation timer)
- **Key pattern:** `useMutation` for card fetch, `useFocusEffect` for hero art refresh

### Card Detail Feature

- **Route:** `app/card.tsx` (~900 lines, modal)
- **Params:** `cardJson` (stringified Card), `cardType`
- **Features:** Face switching (double-faced cards), printings list, reroll, share, download, print navigation

### Print Preview Feature

- **Route:** `app/print-preview.tsx` (~900 lines, modal)
- **Params:** `cardJson` (stringified Card)
- **Features:** Receipt preview, dithered image preview, print/send, save to gallery

### Search Feature

- **Route:** `app/(tabs)/search/index.tsx` (~450 lines)
- **Components:** `SearchFilters.tsx`, `SearchFiltersDialog.tsx`, `ChipSearchInput.tsx`
- **Key pattern:** `searchTokenizer.ts` parses advanced Scryfall syntax; `SearchFilters.shared.ts` builds query strings

### Life Counter / Game Feature

- **Route:** `app/(tabs)/game/index.tsx` (mode selector) -> `app/life-counter.tsx` (full-screen modal)
- **State:** Local component state (no global store for life totals)
- **Game modes:** Standard (20 life), Commander (40), Brawl (30), 2HG (30), Pauper (20), Momir (random creature per CMC), Custom

### History Feature

- **Route:** `app/(tabs)/history/index.tsx` (hidden tab, also accessible via `HistorySheet` bottom sheet)
- **Data source:** `HistoryProvider` (AsyncStorage-backed Card[])

### Settings / Printer Setup

- **Route:** `app/(tabs)/settings/index.tsx` (settings), `app/(tabs)/settings/printer.tsx` (~1800 lines, printer management)
- **Printer setup:** Discovery, pairing, capability checking, test print, connection management

## Key Architectural Decisions

1. **No Zustand store in use:** Despite `zustand` being a dependency, all global state uses React Context via `@nkzw/create-context-hook`. This keeps provider co-location with consumer hooks and avoids separate store files.

2. **Card data passed as JSON string in route params:** `useLocalSearchParams<{ cardJson: string }>()` passes full Card objects between screens. This avoids a shared card detail store but limits deep linking and creates serialization overhead.

3. **Dual persistence strategy:** AsyncStorage for user data (settings, history, locale); SQLite for printer subsystem (registry, print jobs). The printer subsystem needed relational queries and transactions.

4. **Rate-limited Scryfall client:** Module-level `lastRequestTime` enforces 100ms between requests. Transient errors use exponential backoff. CMC fallback decrements until a card is found.

5. **Layered printer architecture with dependency injection:** `createRegistryService(deps?)` accepts optional dependency overrides for testing. Adapter is cached per session.

6. **Localized card fetching via collection API:** Non-English locales fetch the English card first, then batch-localize via Scryfall's `/cards/collection` endpoint to avoid N+1 requests.

7. **Immutable state updates:** All provider `setSettings`/`setCards` calls use spread patterns (`{ ...prev, ...partial }`). No direct mutation.

## Diagram

```
                         +-------------------+
                         |   Scryfall API    |
                         |  api.scryfall.com |
                         +--------+----------+
                                  |
                    rate-limited fetch + retry
                                  |
                         +--------v----------+
                         |   services/        |
                         |   scryfall.ts      |
                         |  (API client)      |
                         +--------+-----------+
                                  |
                        mapScryfallCard()
                                  |
         +------------------------+------------------------+
         |                        |                        |
  +------v------+        +-------v-------+       +--------v--------+
  | Home Screen |        | Search Screen |       |  Card Detail    |
  | (cast flow) |        | (search flow) |       |  (modal)        |
  +------+------+        +-------+-------+       +--------+--------+
         |                        |                        |
         | addCard/addCards       | (no history)           | addCard
         v                        |                        v
  +------+------+                 |               +--------+--------+
  | History-    |                 |               | History-        |
  | Provider   |                 |               | Provider        |
  | (AsyncSt.)  |                |               | (AsyncStorage)  |
  +-------------+                |               +-----------------+
                                  |
                         +--------v----------+
                         | Print Preview     |
                         | (modal)           |
                         +---+----------+---+
                             |          |
              createAdapter()|          |rasterizeCardArt
                             v          v
                  +----------+--+  +----+-----------+
                  | Printer     |  | utils/         |
                  | Adapters    |  | printerImage   |
                  | (BLE/TCP)   |  | dither.ts      |
                  +------+------+  +----------------+
                         |
               +---------+----------+
               |  Printer Registry  |
               |  (SQLite)          |
               |  services/printer/ |
               +--------------------+

  Provider Tree (root -> leaf):
  QueryClient > GestureHandler > SafeArea > I18n > Settings > History > Network > Toast > App
```

---

*Architecture analysis: 2026-04-13*
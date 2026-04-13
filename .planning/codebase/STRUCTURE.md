# Codebase Structure

**Analysis Date:** 2026-04-13

## Directory Tree

```
rork-momir-basic/
├── app/                        # Expo Router routes (file-based routing)
│   ├── _layout.tsx             # Root layout: provider tree + Stack navigator
│   ├── (tabs)/                 # Tab navigator group
│   │   ├── _layout.tsx         # Tab bar config (Cast, Search, Game, Settings)
│   │   ├── (home)/             # Cast tab (grouped for route isolation)
│   │   │   ├── _layout.tsx     # Home stack layout
│   │   │   ├── index.tsx       # Main cast screen (CMC picker, type selector, card fetch)
│   │   │   ├── heroArtCache.ts # LRU warm cache for background art
│   │   │   └── heroRotation.ts # 15s hero art rotation timer
│   │   ├── search/             # Search tab
│   │   │   ├── _layout.tsx     # Search stack layout
│   │   │   └── index.tsx       # Scryfall search with filters + pagination
│   │   ├── history/            # History tab (hidden from tab bar)
│   │   │   ├── _layout.tsx     # History stack layout
│   │   │   └── index.tsx       # Card history list with search/filter
│   │   ├── game/               # Game tab
│   │   │   ├── _layout.tsx     # Game stack layout
│   │   │   └── index.tsx       # Game mode selector (Standard, Commander, Momir, etc.)
│   │   └── settings/           # Settings tab
│   │       ├── _layout.tsx     # Settings stack (index + printer)
│   │       ├── index.tsx       # App settings (language, feature flags, dev mode)
│   │       └── printer.tsx     # Printer setup (scan, pair, test print)
│   ├── card.tsx                # Card detail modal (face switching, printings, share)
│   ├── print-preview.tsx       # Print preview modal (receipt rendering, print/send)
│   ├── life-counter.tsx        # Life counter full-screen modal (multi-player)
│   ├── modal.tsx               # Template modal (unused placeholder)
│   ├── +not-found.tsx          # 404 route
│   └── +native-intent.tsx      # Deep link redirect to /
├── components/                 # Shared UI components
│   ├── CardGridItem.tsx        # Card grid cell (image + name + mana cost)
│   ├── CardListItem.tsx        # Card list row (compact card info)
│   ├── ChipSearchInput.tsx     # Chip-based search input with autocomplete
│   ├── DitheredImage.tsx       # Dithered bitmap preview for print receipts
│   ├── HistorySheet.tsx        # Bottom sheet for quick history access
│   ├── ManaCost.tsx            # Mana cost symbol renderer
│   ├── ManaSymbol.tsx          # Single mana symbol SVG renderer
│   ├── OracleText.tsx          # Card oracle text with symbol parsing
│   ├── PrintManaCost.tsx       # Text-based mana cost for print receipts
│   ├── PrintOracleText.tsx     # Text-based oracle text for print receipts
│   ├── SearchFilters.tsx       # Full search filter panel
│   ├── SearchFiltersDialog.tsx # Search filter dialog (mobile-friendly)
│   ├── SearchFilters.shared.ts # Shared filter state types + query builder
│   ├── SetSymbol.tsx           # Set symbol SVG from Scryfall CDN
│   ├── Skeleton.tsx            # Loading skeleton placeholders
│   ├── Toast.tsx               # Global toast notification system
│   └── TypePicker.tsx          # Card type selector (creature, instant, etc.)
├── constants/                  # App-wide constants
│   ├── cardTypes.ts            # CARD_TYPES config array (id, label, useCmc, multiCard)
│   ├── colors.ts               # Colors theme (dark theme palette, mana colors, rarity)
│   └── manaSymbols.ts         # Scryfall SVG URL builder for mana symbols
├── i18n/                       # Internationalization
│   ├── index.ts                # I18nProvider, useI18n, locale detection, mapping
│   ├── types.ts                # Translations interface (full type safety)
│   └── locales/                # Translation files (11 languages)
│       ├── en.ts               # English (source of truth)
│       ├── pt.ts               # Portuguese
│       ├── es.ts               # Spanish
│       ├── fr.ts               # French
│       ├── de.ts               # German
│       ├── it.ts               # Italian
│       ├── ja.ts               # Japanese
│       ├── ko.ts               # Korean
│       ├── ru.ts               # Russian
│       ├── zhs.ts              # Simplified Chinese
│       └── zht.ts              # Traditional Chinese
├── providers/                  # React Context providers
│   ├── HistoryProvider.tsx     # Card history (AsyncStorage-backed)
│   ├── NetworkProvider.tsx     # Connectivity monitoring (Scryfall health ping)
│   └── SettingsProvider.tsx    # App settings (printer prefs, feature flags)
├── services/                   # Service layer
│   ├── scryfall.ts             # Scryfall API client (random, search, printings, sets)
│   └── printer/                # Printer subsystem (layered architecture)
│       ├── adapters/           # Hardware abstraction
│       │   ├── port.ts         # PrinterPort interface + PrinterAdapterError
│       │   ├── native.ts       # NativeThermalPrinterAdapter (BLE/Classic/TCP)
│       │   ├── fake.ts         # FakePrinterAdapter (web/testing)
│       │   ├── factory.ts      # createAdapter() platform factory
│       │   └── index.ts        # Barrel export
│       ├── registry/           # Discovery & identity coordination
│       │   ├── service.ts       # createRegistryService() with DI
│       │   └── index.ts        # Barrel export
│       ├── storage/            # SQLite persistence
│       │   ├── database.ts     # PrinterDatabase (native + in-memory fallback)
│       │   ├── schema.ts       # Schema versioning & migrations (v2)
│       │   └── repositories.ts # CRUD operations for printers + print_jobs
│       ├── render/             # ESC/POS document generation
│       │   ├── escpos.ts       # EscPosRenderer, mana cost parser, QR/URL builders
│       │   ├── document.ts     # CardReceiptDocument, DiagnosticsDocument
│       │   └── index.ts        # Barrel export
│       ├── capability/         # Platform capability & permission checking
│       │   ├── service.ts      # PrinterCapabilityService (Android BT, transport detection)
│       │   └── index.ts        # Barrel export
│       └── diagnostics/        # Structured event logging
│           ├── logger.ts       # PrinterSessionLogger + event emission
│           └── index.ts        # Barrel export
├── types/                      # TypeScript type definitions
│   └── index.ts                # All app types (Card, CardFace, Printer*, Settings, etc.)
├── utils/                      # Utility functions
│   ├── cardFaces.ts            # Double-faced card display logic
│   ├── dither.ts               # Image dithering algorithms (Floyd-Steinberg, Bayer, threshold)
│   ├── printerImage.ts         # Card art rasterization for printing (resize, dither, cache)
│   ├── printerImageErrors.ts   # Printer image error classification
│   └── searchTokenizer.ts      # Advanced Scryfall syntax tokenizer/parser
├── assets/                     # Static assets
│   ├── fonts/                  # Custom fonts (mana.ttf)
│   └── images/                 # App images & feature graphics
├── __mocks__/                  # Jest mocks
│   ├── expo-haptics.js
│   ├── expo-media-library.js
│   ├── expo-sqlite.js
│   ├── react-native-thermal-printer-driver.js
│   ├── @nkzw/
│   ├── @react-native-async-storage/
│   ├── providers/
│   └── services/
├── __tests__/                  # Test files
│   ├── app/                    # Route/screen tests
│   ├── printer/                # Printer subsystem tests
│   ├── services/               # Service tests
│   └── utils/                  # Utility tests
├── e2e/                        # Playwright E2E tests
│   ├── home-hero.spec.ts
│   ├── printer-qa.spec.ts
│   └── search-filters.spec.ts
├── dist/                       # Build output
├── docs/                       # Documentation
├── .github/                    # CI/CD workflows
├── android/                    # Native Android project
├── ios/                        # Native iOS project
├── expo/                       # Expo config & prebuild
├── package.json                # Dependencies & scripts
├── tsconfig.json               # TypeScript config (strict, @/* path alias)
├── app.json                    # Expo app config
├── eas.json                    # EAS Build/Submit config
├── jest.config.js              # Jest config
├── playwright.config.ts        # Playwright E2E config
├── babel.config.js             # Babel config (Expo preset)
├── metro.config.js             # Metro bundler config
└── eslint.config.js            # ESLint config (Expo)
```

## Key Files

| Path | Purpose |
|------|---------|
| `app/_layout.tsx` | Root layout: provider tree composition, splash screen, Stack nav |
| `app/(tabs)/(home)/index.tsx` | Main cast screen: CMC stepper, type picker, card fetch |
| `app/card.tsx` | Card detail modal: face switching, printings, share, download |
| `app/print-preview.tsx` | Print preview modal: receipt rendering, print dispatch |
| `app/life-counter.tsx` | Life counter: multi-player, game modes, Momir cast |
| `app/(tabs)/search/index.tsx` | Scryfall search with filters, pagination, grid/list views |
| `app/(tabs)/settings/printer.tsx` | Printer setup: scan, pair, test print, preferences |
| `services/scryfall.ts` | Scryfall API client: all card/set/search operations |
| `services/printer/registry/service.ts` | Printer registry: discovery, connect, preferred printer |
| `services/printer/adapters/port.ts` | PrinterPort interface definition |
| `services/printer/render/escpos.ts` | ESC/POS renderer: receipt document generation |
| `services/printer/storage/schema.ts` | SQLite schema: printers + print_jobs tables |
| `types/index.ts` | All TypeScript types: Card, CardFace, Printer*, Settings |
| `i18n/index.ts` | I18n provider: locale detection, Scryfall lang mapping |
| `providers/SettingsProvider.tsx` | Settings context: printer prefs, feature flags |
| `providers/HistoryProvider.tsx` | History context: card list CRUD |
| `providers/NetworkProvider.tsx` | Network context: connectivity monitoring |
| `constants/colors.ts` | Dark theme color palette |
| `constants/cardTypes.ts` | Card type configuration array |
| `utils/cardFaces.ts` | Double-faced card display data extraction |
| `utils/dither.ts` | Image dithering algorithms for thermal printing |
| `utils/printerImage.ts` | Card art rasterization pipeline |
| `utils/searchTokenizer.ts` | Scryfall search syntax tokenizer |

## Route Map

| Route | File Path | Presentation | Purpose |
|-------|-----------|-------------|---------|
| `/` | `app/(tabs)/(home)/index.tsx` | Tab | Cast screen -- fetch random MTG cards |
| `/search` | `app/(tabs)/search/index.tsx` | Tab | Scryfall search with filters |
| `/game` | `app/(tabs)/game/index.tsx` | Tab | Game mode selector |
| `/settings` | `app/(tabs)/settings/index.tsx` | Tab | App settings & language |
| `/settings/printer` | `app/(tabs)/settings/printer.tsx` | Stack push | Printer setup & pairing |
| `/history` | `app/(tabs)/history/index.tsx` | Hidden tab | Card history (also via HistorySheet) |
| `/card` | `app/card.tsx` | Modal | Card detail with face switching |
| `/print-preview` | `app/print-preview.tsx` | Modal | Print receipt preview |
| `/life-counter` | `app/life-counter.tsx` | Full-screen modal | Multi-player life counter |
| Not found | `app/+not-found.tsx` | -- | 404 fallback |

## Component Inventory

| Component | File | Used By | Purpose |
|-----------|------|---------|---------|
| `CardGridItem` | `components/CardGridItem.tsx` | Search, History | Card image + name in grid layout |
| `CardListItem` | `components/CardListItem.tsx` | Search, History | Compact card row |
| `ChipSearchInput` | `components/ChipSearchInput.tsx` | Search | Autocomplete search with chip tokens |
| `DitheredImage` | `components/DitheredImage.tsx` | Print Preview | 1-bit dithered bitmap preview |
| `HistorySheet` | `components/HistorySheet.tsx` | Home | Bottom sheet for recent card history |
| `ManaCost` | `components/ManaCost.tsx` | Card Detail | SVG mana symbol rendering |
| `ManaSymbol` | `components/ManaSymbol.tsx` | ManaCost | Single mana symbol |
| `OracleText` | `components/OracleText.tsx` | Card Detail | Oracle text with symbol parsing |
| `PrintManaCost` | `components/PrintManaCost.tsx` | Print Preview | Text mana cost for receipts |
| `PrintOracleText` | `components/PrintOracleText.tsx` | Print Preview | Text oracle text for receipts |
| `SearchFilters` | `components/SearchFilters.tsx` | Search | Full filter panel (color, type, CMC, rarity, format) |
| `SearchFiltersDialog` | `components/SearchFiltersDialog.tsx` | Search | Mobile-friendly filter dialog |
| `SetSymbol` | `components/SetSymbol.tsx` | Card Detail, CardGridItem | Set symbol from Scryfall CDN |
| `Skeleton` | `components/Skeleton.tsx` | Search, History | Loading placeholder |
| `Toast` | `components/Toast.tsx` | Global (via `showToast()`) | Toast notification system |
| `TypePicker` | `components/TypePicker.tsx` | Home | Card type selector modal |

## Store Inventory

The app uses React Context providers (not Zustand stores) for global state:

| Provider | File | State Shape | Persistence |
|----------|------|-------------|-------------|
| `SettingsProvider` | `providers/SettingsProvider.tsx` | `AppSettings` (printer prefs, excludeDigitalOnly, excludeFunnySets, uniqueCardsOnly, devMode) | AsyncStorage `momir_settings` |
| `HistoryProvider` | `providers/HistoryProvider.tsx` | `Card[]` (most recent first) | AsyncStorage `momir_card_history` |
| `NetworkProvider` | `providers/NetworkProvider.tsx` | `{ isOnline, isChecking }` | None (ephemeral) |
| `I18nProvider` | `i18n/index.ts` | `{ locale, t, loaded, scryfallLang }` | AsyncStorage `momir_locale` |
| `ToastProvider` | `components/Toast.tsx` | Toast queue + render | None (ephemeral) |

**Access pattern:** All providers export a `use[Name]` hook via `@nkzw/create-context-hook`:
```typescript
const { settings, updateSettings } = useSettings();
const { cards, addCard } = useHistory();
const { isOnline } = useNetwork();
const { t, locale, setLocale } = useI18n();
```

## Hook Inventory

| Hook | File | Purpose |
|------|------|---------|
| `useSettings` | `providers/SettingsProvider.tsx` | Access/modify app settings + printer preferences |
| `useHistory` | `providers/HistoryProvider.tsx` | Access/modify card history |
| `useFilteredHistory` | `providers/HistoryProvider.tsx` | Memoized filtered card history (search, type, CMC) |
| `useNetwork` | `providers/NetworkProvider.tsx` | Online status + manual check |
| `useI18n` | `i18n/index.ts` | Current locale, translations object, Scryfall language code |
| `useGameModes` | `app/(tabs)/game/index.tsx` | Local memoized game mode list |

## Utility Modules

| Module | File | Purpose |
|--------|------|---------|
| Card face display | `utils/cardFaces.ts` | `getCardFaceDisplayData()`, `getDisplayFace()` -- extracts display data for single/double-faced cards |
| Dithering | `utils/dither.ts` | `ditherImage()`, `thresholdDither()`, `calculateAverageLuminance()`, `preprocessDarkImage()` -- image-to-1-bit conversion for thermal printing |
| Printer image | `utils/printerImage.ts` | `rasterizeCardArtForPrint()` -- full pipeline: download, resize, dither, cache. LRU cache (16 entries) |
| Printer image errors | `utils/printerImageErrors.ts` | `isPrinterImageNativeCompatibilityError()`, `isPrinterImageLoadError()`, `formatPrinterImageProcessingError()` -- error classification for user-facing messages |
| Search tokenizer | `utils/searchTokenizer.ts` | `tokenize()` -- parses Scryfall advanced syntax into typed tokens (color, type, CMC, etc.) |
| Hero art cache | `app/(tabs)/(home)/heroArtCache.ts` | `markHeroArtAsWarm()` -- LRU warm cache (15 entries) for preloaded hero background art |
| Hero rotation | `app/(tabs)/(home)/heroRotation.ts` | `startHeroArtRotationInterval()` -- 15s interval timer for background art rotation |
| Search filter query | `components/SearchFilters.shared.ts` | `buildFilterQuery()`, `buildFullQuery()`, `getActiveFilterCount()` -- filter state to Scryfall query string |

## Where to Add New Code

**New Route/Screen:**
- Create `app/<route-name>.tsx` for top-level routes (modals, full-screen)
- Create `app/(tabs)/<tab-name>/index.tsx` for new tabs
- Add `Stack.Screen` entry in the appropriate `_layout.tsx`

**New Component:**
- Shared: `components/<ComponentName>.tsx`
- Route-specific: co-locate in the route directory (like `heroArtCache.ts` in `(home)/`)

**New Provider/Context:**
- Create `providers/<Name>Provider.tsx`
- Use `@nkzw/create-context-hook` pattern: `export const [Provider, useHook] = createContextHook(() => { ... })`
- Wrap in `app/_layout.tsx` at the appropriate nesting level

**New Service:**
- API clients: `services/<name>.ts`
- Printer subsystem: `services/printer/<sub-module>/`

**New Type:**
- Add to `types/index.ts` (single canonical type file)

**New Constant:**
- Add to `constants/` directory

**New i18n Locale:**
- Create `i18n/locales/<locale>.ts` implementing the `Translations` interface from `i18n/types.ts`
- Register in `i18n/index.ts` (locales map, LOCALE_LABELS, LOCALE_FLAGS, ALL_LOCALES, LOCALE_TO_SCRYFALL_LANG)

**New Utility:**
- Add to `utils/` directory

**New Test:**
- Unit/integration: `__tests__/<category>/<name>.test.ts`
- E2E: `e2e/<name>.spec.ts`
- Mocks: `__mocks__/<module-name>.js`

## Special Directories

| Directory | Purpose | Generated | Committed |
|-----------|---------|-----------|-----------|
| `.expo/` | Expo CLI cache & prebuild output | Yes | No (gitignored) |
| `android/` | Native Android project (Expo prebuild) | Yes | Partial |
| `ios/` | Native iOS project (Expo prebuild) | Yes | Partial |
| `dist/` | Build output | Yes | No |
| `node_modules/` | Dependencies | Yes | No |
| `__mocks__/` | Jest module mocks | No | Yes |
| `assets/` | Static assets (fonts, images) | No | Yes |
| `docs/` | Documentation | No | Yes |
| `play/` | Play Store submission artifacts | No | Yes |
| `lancedb/` | Vector DB (unused/placeholder) | No | Yes |
| `plugins/` | Expo config plugins (empty) | No | Yes |
| `.github/` | CI/CD workflows | No | Yes |
| `.sisyphus/` | Sisyphus task runner config | No | Yes |

---

*Structure analysis: 2026-04-13*
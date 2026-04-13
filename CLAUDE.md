<!-- GSD:project-start source:PROJECT.md -->
## Project

**Momir Basic**

Momir Basic is a React Native / Expo mobile app for Magic: The Gathering players that serves as a random card generator and game utility. It fetches random MTG cards from the Scryfall API based on converted mana cost (Momir-style), supports thermal printer output for physical card slips, and provides game tools like a life counter. Available on Android, iOS, and web.

**Core Value:** The fastest, most delightful MTG random card experience — from tap to card in under a second, with zero friction.

### Constraints

- **Tech Stack**: Must remain React Native / Expo — no framework migration
- **API**: Scryfall is the sole data source (public, no auth, rate-limited)
- **Hardware**: Thermal printer integration must continue working on Android
- **Platforms**: Android (primary), iOS (secondary), Web (limited)
- **Performance**: Card display must feel instant (< 1s from tap to card)
- **Offline**: App must work with degraded network (cards cached, search limited)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.9.2 - All application source code (app, components, services, providers, utils, types)
- JavaScript - ESLint config (`eslint.config.js`), E2E test helpers
## Runtime & Framework
- React 19.1.0 - UI library
- React Native 0.81.5 - Native mobile framework (New Architecture enabled)
- Expo SDK 54.0.33 - Managed workflow with dev client (`expo-dev-client`)
- Expo Router 6.0.23 - File-based routing (typed routes enabled, origin: `https://momir-basic.app/`)
- React DOM 19.1.0 - Web support
- React Native Web 0.21.0 - Web compatibility layer
## State Management
- `@tanstack/react-query` 5.83.0 - Server/async state management
- Used in providers: `SettingsProvider`, `HistoryProvider`, `NetworkProvider`
- Single `QueryClient` instance created in `app/_layout.tsx`
- Query keys: `['appSettings']`, `['cardHistory']`, `['networkConnectivity']`
- Refetch intervals: network connectivity every 15s, stale time 10s
- `@nkzw/create-context-hook` 1.1.0 - Typed context hook factory
- Creates: `useSettings`, `useHistory`, `useNetwork`, `useI18n`
- All providers wrap the app in `app/_layout.tsx`
- `@react-native-async-storage/async-storage` 2.2.0 - Key-value persistence
- Stores: settings (`momir_settings`), history (`momir_card_history`), locale (`momir_locale`)
- `zustand` 5.0.2 - Listed in `package.json` but no imports found in source code
## Data Layer
- `expo-sqlite` 16.0.10 - Printer and print job persistence
- Database: `printer.db`
- Tables: `printers`, `print_jobs`, `schema_version`
- Migration system in `services/printer/storage/schema.ts` (2 migrations)
- Abstraction: `PrinterDatabase` interface with `NativePrinterDatabase` (native) and `MemoryPrinterDatabase` (web fallback) in `services/printer/storage/database.ts`
- Direct `fetch` calls in `services/scryfall.ts`
- Rate-limited: 100ms between requests, 3 retries with exponential backoff
- Custom error class `ScryfallApiError` with transient/retry logic
## UI & Styling
- None (custom components only)
- `@expo/vector-icons` 15.0.3 - Expo icon set (Ionicons, etc.)
- `lucide-react-native` 0.475.0 - Lucide icon set
- `expo-image` 3.0.11 - Optimized image component with caching
- `react-native-svg` 15.12.1 - SVG rendering (mana symbols, set symbols)
- `expo-linear-gradient` 15.0.8 - Gradient backgrounds
- `expo-blur` 15.0.8 - Blur effects
- `expo-haptics` 15.0.8 - Tactile feedback on interactions (card taps, button presses, game actions)
- `expo-font` 14.0.11 - Font loading
- `assets/fonts/mana.ttf` - Magic: The Gathering mana symbols font
- Custom i18n system in `i18n/` (no library)
- 11 locales: en, pt, es, fr, de, it, ja, ko, ru, zhs, zht
- Locale stored in AsyncStorage, device locale auto-detected
- Scryfall language parameter mapped from app locale
- `expo-system-ui` 6.0.9 - System UI integration
- `expo-symbols` 1.0.8 - SF Symbols on iOS
- User interface style: automatic (light/dark)
## Hardware & Native
- `react-native-thermal-printer-driver` 0.1.0 - Bluetooth thermal POS printer driver
- Registered as plugin in `app.json` under `"plugins"`
- Native module: `ThermalPrinterDriver` in `NativeModules`
- Transports: BLE, Classic Bluetooth, TCP (Classic filtered on iOS)
- Android permissions: `BLUETOOTH`, `BLUETOOTH_ADMIN`, `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`
- iOS permissions: `NSBluetoothAlwaysUsageDescription`, `NSBluetoothPeripheralUsageDescription`
- Custom ESC/POS renderer in `services/printer/render/escpos.ts`
- Card receipt documents in `services/printer/render/document.ts`
- Image processing pipeline: `expo-image-manipulator` -> `pngjs` decode -> dither -> pack bitmap -> ESC/POS raster
- Dithering algorithms: Floyd-Steinberg, Ordered (Bayer 4x4), Threshold
- QR code generation via ESC/POS commands
- `expo-image-manipulator` 14.0.8 - Resize/scale card art
- `pngjs` (browser build) - PNG decode/encode
- `buffer` 6.0.3 - Node Buffer polyfill for binary operations
- `@stardazed/streams-text-encoding` 1.0.2 - TextEncoder/TextDecoder polyfill
- `@ungap/structured-clone` 1.3.0 - Structured clone polyfill
- `expo-image-picker` 17.0.10 - Image selection (declared, usage TBD)
- `expo-media-library` 18.2.1 - Save images to photo library
- iOS permission: `NSPhotoLibraryAddUsageDescription`
- `expo-haptics` 15.0.8 - Haptic feedback
- `react-native-view-shot` 4.0.3 - Screen capture for print preview
- `react-native-gesture-handler` 2.28.0 - Gesture system
- `react-native-worklets` 0.5.1 - Worklet runtime
## Build & Tooling
- Bun - Lockfile: `bun.lock` (present)
- All CI workflows use `oven-sh/setup-bun@v2` and `bun install`
- Metro (React Native default via Expo)
- EAS Build (Expo Application Services)
- Config: `eas.json` with `preview` and `production` profiles
- CLI version: >= 13.0.0
- App version source: remote
- ESLint 9.31.0 with flat config (`eslint.config.js`)
- `eslint-config-expo` 10.0.0
- Run: `bun run lint` (via `expo lint`)
- TypeScript 5.9.2 with strict mode
- Path alias: `@/*` -> `./*`
- Run: `bunx tsc --noEmit`
- Jest 29.7.0 with `jest-expo` 54.0.0
- `@testing-library/react-native` 13.3.3
- Playwright 1.58.2 for E2E
- Run: `bun run test` or `bun run test:ci`
- Coverage: `--coverage` flag in CI
- No Prettier config detected (not enforced)
- `zod` 4.3.6 - Schema validation (declared, for input validation)
## Platform Targets
- Target SDK: 35, Compile SDK: 36, Build Tools: 36.0.0
- Package: `com.bloodf.momirbasicapp`
- Build types: APK (preview), AAB (production)
- Bundle: `com.bloodf.momirbasic`
- No tablet support (`supportsTablet: false`)
- Privacy manifests for file timestamps and UserDefaults
- Favicon configured
- Limited functionality (no printer, in-memory database fallback)
- Router origin: `https://momir-basic.app/`
## Dependencies Summary
| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.1.0 | UI library |
| react-native | 0.81.5 | Mobile framework |
| expo | ~54.0.33 | Managed workflow SDK |
| expo-router | ~6.0.23 | File-based routing |
| expo-sqlite | ~16.0.10 | Printer registry database |
| expo-image | ~3.0.11 | Optimized image component |
| expo-image-manipulator | ~14.0.8 | Image resize for printing |
| expo-haptics | ~15.0.8 | Haptic feedback |
| expo-media-library | ~18.2.1 | Save to photo library |
| @tanstack/react-query | ^5.83.0 | Async/server state management |
| @react-native-async-storage/async-storage | 2.2.0 | Key-value persistence |
| @nkzw/create-context-hook | ^1.1.0 | Typed React context hooks |
| zustand | ^5.0.2 | Declared but unused in source |
| zod | ^4.3.6 | Schema validation |
| react-native-thermal-printer-driver | ^0.1.0 | Bluetooth thermal printer |
| react-native-gesture-handler | ~2.28.0 | Gesture handling |
| react-native-svg | 15.12.1 | SVG rendering |
| react-native-view-shot | 4.0.3 | Screen capture |
| buffer | ^6.0.3 | Node Buffer polyfill |
| pngjs | (via browser) | PNG decode/encode for printing |
| lucide-react-native | ^0.475.0 | Icon library |
| @expo/vector-icons | ^15.0.3 | Expo icon set |
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Conventions
- React components: PascalCase (e.g., `CardGridItem.tsx`, `ManaCost.tsx`, `HistorySheet.tsx`)
- Non-component modules: camelCase (e.g., `heroRotation.ts`, `heroArtCache.ts`, `searchTokenizer.ts`, `cardFaces.ts`)
- Test files: kebab-case or camelCase matching source (e.g., `scryfall.test.ts`, `home-hero-rotation.test.ts`, `printer-registry.test.ts`)
- Constants: camelCase (e.g., `cardTypes.ts`, `colors.ts`, `manaSymbols.ts`)
- Services: camelCase (e.g., `scryfall.ts`, `service.ts`)
- i18n locales: lowercase abbreviation (e.g., `en.ts`, `pt.ts`, `zhs.ts`)
- Shared helper modules: `.shared.ts` suffix (e.g., `SearchFilters.shared.ts`)
- PascalCase for all React components (e.g., `ManaCost`, `CardGridItem`, `HistorySheet`, `TypePicker`)
- Named exports for reusable components: `export const ManaCost = memo(function ManaCost(...))`
- Default exports for screen/route components: `export default function HomeScreen()`
- camelCase for all functions (e.g., `fetchRandomCard`, `buildQuery`, `getCardFaceDisplayData`, `parseManaCost`)
- Factory functions use `create` prefix (e.g., `createRegistryService`, `createAdapter`, `createQueryClient`)
- Predicate functions use `is`/`has` prefix (e.g., `isScryfallApiError`, `isDarkImage`, `isCardFace`, `isTransientStatus`)
- Validation functions use `validate` prefix (e.g., `validateTransport`)
- camelCase for all variables (e.g., `queryClient`, `settingsQuery`, `dominantColor`)
- Constants at module level use SCREAMING_SNAKE_CASE (e.g., `MIN_CMC`, `MAX_CMC`, `RATE_LIMIT_MS`, `DEFAULT_RETRY_COUNT`, `HERO_ROTATION_INTERVAL_MS`)
- Refs use `Ref` suffix (e.g., `attemptedRef`, `warmedArtUrlsRef`, `rotationCleanupRef`)
- PascalCase for all types and interfaces (e.g., `Card`, `CardType`, `PrinterRecord`, `AppSettings`, `ToastMessage`)
- Use `interface` for object shapes that describe data contracts
- Use `type` for unions, intersections, and utility types (e.g., `type CardType = 'creature' | 'commander' | ...`, `type PrintMode = 'full' | 'image_only'`)
- Use `enum` for explicitly-valued enumerations (e.g., `PrinterTransportType`, `PrinterErrorCode`)
- Use `Record<K, V>` for dictionary types (e.g., `Record<string, string>`, `Record<Locale, Translations>`)
- Error classes extend `Error` with custom properties (e.g., `ScryfallApiError`, `PrinterAdapterError`, `UnsupportedPlatformError`)
## File Organization Conventions
- Each component in its own file: `components/CardGridItem.tsx`, `components/ManaCost.tsx`
- Shared non-React logic extracted to `.shared.ts`: `components/SearchFilters.shared.ts`
- Styling is inline via `StyleSheet.create({})` at the bottom of the same file
- Context providers wrapping the app: `providers/SettingsProvider.tsx`, `providers/HistoryProvider.tsx`, `providers/NetworkProvider.tsx`
- All providers use `@nkzw/create-context-hook` pattern (see State Management)
- External API services: `services/scryfall.ts`
- Complex subsystems organized in subdirectories: `services/printer/adapters/`, `services/printer/storage/`, `services/printer/registry/`, `services/printer/render/`, `services/printer/capability/`, `services/printer/diagnostics/`
- Each subdirectory has an `index.ts` barrel file
- Service files are named by domain: `service.ts`, `repositories.ts`, `schema.ts`, `database.ts`
- Expo Router file-based routing with route groups: `app/(tabs)/(home)/index.tsx`, `app/(tabs)/game/index.tsx`
- Layout files: `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/game/_layout.tsx`
- Modal routes: `app/card.tsx`, `app/modal.tsx`, `app/print-preview.tsx`, `app/life-counter.tsx`
- Helper modules colocated with route: `app/(tabs)/(home)/heroRotation.ts`, `app/(tabs)/(home)/heroArtCache.ts`
- Single barrel file: `types/index.ts` contains all shared type definitions, interfaces, and type helpers
- Domain-specific types exported from same file (Card types, Printer types, Settings types)
- Named by domain: `constants/cardTypes.ts`, `constants/colors.ts`, `constants/manaSymbols.ts`
- Default export for primary constant object: `export default Colors`
- Pure functions organized by domain: `utils/cardFaces.ts`, `utils/dither.ts`, `utils/printerImage.ts`, `utils/searchTokenizer.ts`
- Provider and hook: `i18n/index.ts`
- Type definitions: `i18n/types.ts`
- Locale files: `i18n/locales/en.ts`, `i18n/locales/pt.ts`, etc.
## Import Conventions
- `@/*` maps to project root (configured in `tsconfig.json`)
- Use `@/` for cross-directory imports
- Use `./` or `../` for colocated files within the same feature directory
- Use `import type` when importing only types: `import type { Card, CardType } from '@/types'`
- Use `import { Card }` when using the value at runtime
## Component Patterns
- Always define an interface for props: `interface ManaCostProps { manaCost: string; size?: number; gap?: number }`
- Inline interface when used in a single component
- Use default values in destructuring: `{ size = 20, gap = 3 }`
- Optional props marked with `?`
- `{ children }: { children: React.ReactNode }` for wrapper components
- `{ children?: ReactNode }` for optional children
- All styles use `StyleSheet.create({})` at the bottom of the same file
- No separate style files, no styled-components
- Inline dynamic styles via array syntax: `style={[styles.container, { backgroundColor: dominantColor }]}`
- Use `Colors` constant object from `@/constants/colors` for all theme colors
- Color tokens reference: `Colors.gold`, `Colors.background`, `Colors.textPrimary`, `Colors.textSecondary`, `Colors.textMuted`, `Colors.error`, `Colors.success`, etc.
- Use `Animated.Value` from `react-native` with `useRef` for animation values
- Use `Animated.timing` and `Animated.spring` with `useNativeDriver: true` wherever possible
- Some animations intentionally use `useNativeDriver: false` when animating non-transform properties (e.g., width percentages)
- Use `React.memo` for components receiving stable props (e.g., `ModeCard`, `ManaCost`)
- Use `useMemo` for computed values
- Use `useCallback` for event handlers passed as props
- Wrap provider return values in `useMemo`: `return useMemo(() => ({...}), [deps])`
## TypeScript Usage
- Use `as const` for readonly object literals: `export const Colors = { ... } as const`
- Use type assertions for narrowing: `as CardType`, `as ScryfallCard`
- Use `typeof` for capturing types: `typeof Heart` for icon types
- Use non-null assertion sparingly: `faces![0]` only when the null case is logically impossible
- Use `Partial<T>` for update functions: `Partial<AppSettings>`, `Partial<PrinterPreferences>`
- Use `Record<K, V>` for dictionary types
- Use `enum` for explicitly-valued enumerations with runtime behavior (e.g., `PrinterTransportType`, `PrinterErrorCode`)
- Use `type` unions for closed string sets (e.g., `type CardType = 'creature' | 'commander' | ...`, `type PrintMode = 'full' | 'image_only'`)
- Use `type` for discriminated unions (e.g., `type PrintJobState = 'queued' | 'printing' | 'printed_confirmed' | ...`)
- `interface` for data objects and contracts: `Card`, `PrinterRecord`, `AppSettings`, `ToastMessage`
- `type` for unions, intersections, aliases: `CardType`, `PrintMode`, `DitherAlgorithm`
- `interface` for props: `ManaCostProps`, `ModeCardProps`, `ToastItemProps`
- Mix of both is acceptable; follow existing patterns in `types/index.ts`
- Use `??` for nullish coalescing: `data.image_uris ?? face?.image_uris`
- Use `?.` for optional chaining: `card.faces?.[0]?.image_uris?.art_crop`
- Use `!` non-null assertion only in tests or when logically guaranteed
## State Management Patterns
- Provider exports: `[ProviderComponent, useContextHook]` pair
- Consumer usage: `const { settings, updateSettings } = useSettings()`
- All providers follow this pattern: `SettingsProvider/useSettings`, `HistoryProvider/useHistory`, `NetworkProvider/useNetwork`, `I18nProvider/useI18n`
- Use `useQuery` for data fetching with `queryKey` arrays: `['appSettings']`, `['cardHistory']`, `['bgArt', cardType]`
- Use `useMutation` for state mutations with `onSuccess` invalidation
- Use `staleTime: Infinity` for data that doesn't change: `bgQuery`
- Use `gcTime: Infinity` for data that should never be garbage collected
- Use `refetchInterval` for polling: `connectivityQuery` with 15s interval
- Used for persistent settings and history
- Key naming: `momir_settings`, `momir_card_history`, `momir_locale`
- Read via `useQuery`, write via `useMutation` + invalidation
- Deep-merge defaults on read: `{ ...DEFAULT_SETTINGS, ...parsed, printer: { ...DEFAULT_PRINTER_PREFERENCES, ...(parsed.printer ?? {}) } }`
- Always use spread operator: `setSettings(prev => ({ ...prev, ...partial }))`
- Nested updates use nested spread: `setSettings(prev => ({ ...prev, printer: { ...prev.printer, ...partial } }))`
- Array prepend: `setCards(prev => [card, ...prev])`
- Array filter: `setCards(prev => prev.filter(c => c.id !== cardId))`
## Error Handling Patterns
- Extend `Error` with typed properties for domain-specific errors:
- Use `isTransient` flag to determine retry eligibility
- Exponential backoff with cap: `Math.min(BASE * (2 ** attempt), MAX_MS)`
- Scryfall-specific: 100ms rate limiting between requests, 429/5xx retry with 1s delay
- Use toast notifications: `showToast({ type: 'error', title: t.errors.fetchFailed, message: ... })`
- Localize error messages: `getLocalizedScryfallErrorMessage(error, t.errors)`
- Never expose raw error details to users
- Non-critical errors use `catch {}` or `catch { /* comment explaining why */ }`
- Network connectivity check errors silently return false
- Background operations (e.g., disconnect during forget) are intentionally swallowed
- Use `void` prefix for intentionally un-awaited async operations: `void SplashScreen.preventAutoHideAsync()`, `void Haptics.selectionAsync()`, `void queryClient.invalidateQueries(...)`
## Internationalization
- Nested object structure in `Translations` interface: `t.common.cast`, `t.cardTypes.creature`, `t.errors.fetchFailed`, `t.toast.printerConnected`
- Categories: `common`, `home`, `cardTypes`, `cardTypeDescriptions`, `card`, `printPreview`, `tabs`, `search`, `history`, `game`, `lifeCounter`, `printer`, `settings`, `errors`, `toast`
- Type definition: `i18n/types.ts` defines the `Translations` interface
- Locale files: `i18n/locales/en.ts`, `i18n/locales/pt.ts`, etc. (11 locales: en, pt, es, fr, de, it, ja, ko, ru, zhs, zht)
- Access via hook: `const { t, locale, setLocale } = useI18n()`
- Static strings: `t.common.cast`, `t.errors.fetchFailed`
- Parameterized strings: `t.search.cardsFound(count)`, `t.history.deleteAll(count)`, `t.printPreview.thermalReceipt(width)`
- Parameterized strings are implemented as functions returning strings in the locale objects
- Device locale detection on first launch via `getDeviceLocale()`
- Stored in AsyncStorage under `momir_locale`
- Maps to Scryfall API language codes via `LOCALE_TO_SCRYFALL_LANG`
## Logging
- Use `console.log` for debug/trace logging (suppressed in test via `jest.setup.js`)
- Use `console.error` for errors
- Module label in brackets: `[Scryfall]`, `[Network]`, `[Toast]`
- No structured logging library used
## Comments
- JSDoc on exported functions and classes in service/utility modules
- Inline comments for non-obvious business logic
- `// CRITICAL` or `// CRITICAL REGRESSION TEST` for important test assertions
- Used for public API surface: exported functions, interfaces, classes
- Example from `services/printer/adapters/port.ts`:
- Explain "why", not "what": `// Deep-merge printer prefs so new fields added in later versions pick up their defaults`
- Mark intentional behaviors: `// Intentionally swallow -- forget printer regardless of disconnect outcome`
- Mark legacy patterns: `/** Legacy type alias for backward compatibility -- prefer PrinterTransportType */`
## Function Design
## Module Design
- Default export for screen components and root layout
- Named exports for reusable components, hooks, services, utilities
- Barrel exports via `index.ts` in service subdirectories: `services/printer/adapters/index.ts`, `services/printer/render/index.ts`
- Used in service subdirectories to re-export the public API
- Not used at the root level (no root `index.ts`)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## High-Level Architecture
- Expo Router file-based routing drives all navigation and screen structure
- React Context (via `@nkzw/create-context-hook`) replaces Zustand for global state -- providers wrap the root layout
- TanStack React Query handles async data fetching, caching, and revalidation
- Scryfall REST API is the sole external data source (card data)
- Printer subsystem uses a layered architecture: adapters -> registry -> render, with SQLite persistence
- AsyncStorage persists user preferences and card history (key-value)
- i18n system with 11 locales, device-locale auto-detection, and Scryfall language mapping
## Provider Tree (Composition Root)
```
```
## Routing & Navigation
- **Root Stack** (`app/_layout.tsx`): `Stack` navigator wrapping tabs and modal screens
- **Tab Navigator** (`app/(tabs)/_layout.tsx`): 4 visible tabs + 1 hidden
- **Sub-routes within tabs**: Each tab has its own `Stack` navigator via `_layout.tsx`
- `router.push()` for forward navigation
- `router.back()` for dismissal
- `useLocalSearchParams<{ cardJson: string }>()` passes card data between screens as JSON string
- `useFocusEffect()` for re-fetching on screen focus
## State Management Architecture
### React Context Providers (no Zustand in use)
- State shape: `AppSettings` (printer prefs, excludeDigitalOnly, excludeFunnySets, uniqueCardsOnly, devMode)
- Persistence: AsyncStorage key `momir_settings`
- Mutation: `updateSettings()`, `updatePrinter()`, `savePreferredPrinter()`
- Legacy migration: detects old `LegacyPrinterConfig` format and migrates to `PrinterPreferences`
- State shape: `Card[]` (ordered by most recent first)
- Persistence: AsyncStorage key `momir_card_history`
- Mutation: `addCard()`, `addCards()`, `removeCard()`, `clearHistory()`
- Derived hook: `useFilteredHistory(search, typeFilter, cmcFilter)` returns memoized filtered list
- State shape: `{ isOnline, isChecking, checkNow }`
- Connectivity: pings `https://api.scryfall.com/health` every 15s
- Cold-start suppression: ignores first 4 offline results to avoid false offline toasts
- Toast side-effects: shows warning when going offline, success when back online
- State shape: `{ locale, setLocale, t, loaded, scryfallLang }`
- 11 locales: en, pt, es, fr, de, it, ja, ko, ru, zhs, zht
- Auto-detects device locale on first load; persists choice in AsyncStorage key `momir_locale`
- `scryfallLang` maps locale to Scryfall API language code for localized card fetches
### React Query Cache
| Query Key | Purpose | Refetch Strategy |
|-----------|---------|------------------|
| `['appSettings']` | Load/save app settings | Invalidation on mutation |
| `['cardHistory']` | Card history list | Invalidation on mutation |
| `['networkConnectivity']` | Online status | 15s interval, 10s stale |
| `['randomCard']` (home screen) | Random card fetch | Manual (mutation) |
| `['searchCards']` | Search results | Manual (on search) |
## Data Layer
### API Client: Scryfall
- Base URL: `https://api.scryfall.com`
- Rate limiting: 100ms minimum between requests (module-level `lastRequestTime`)
- Retry: 3 attempts with exponential backoff (300ms base, 1500ms cap) for transient errors (429, 5xx)
- Custom error class: `ScryfallApiError` with `status`, `isTransient`, `reason` fields
- CMC fallback: `fetchRandomCard()` tries requested CMC, then decrements until a card is found
- `fetchRandomCard(cardType, cmc, excludeFunny, retries, lang)` -- Random card by type/CMC
- `fetchMultipleCards(cardType, count, excludeFunny, lang)` -- Multiple random cards
- `searchCards(query, page, lang)` -- Paginated search with localized collection fetch
- `fetchCardPrintings(cardName)` -- All printings of a named card
- `fetchRandomBgCardForType(cardType)` -- Background art for type selection
- `autocompleteCardName(query)` -- Card name autocomplete
- `fetchSets()` -- Set list for filter dropdowns
- `parseAdvancedSyntax(input)` -- Converts shorthand (R:C, T:I, etc.) to Scryfall syntax
### Database: SQLite (Printer Subsystem)
- `upsertPrinter()`, `getPrinterByAddress()`, `getPrinterById()`, `listPrinters()`, `deletePrinter()`
- Print job CRUD for the queue system
## Printer Subsystem Architecture
```
```
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
## Diagram
```
```
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

# Technology Stack

**Analysis Date:** 2026-04-13

## Languages

**Primary:**
- TypeScript 5.9.2 - All application source code (app, components, services, providers, utils, types)

**Secondary:**
- JavaScript - ESLint config (`eslint.config.js`), E2E test helpers

## Runtime & Framework

**Core:**
- React 19.1.0 - UI library
- React Native 0.81.5 - Native mobile framework (New Architecture enabled)
- Expo SDK 54.0.33 - Managed workflow with dev client (`expo-dev-client`)
- Expo Router 6.0.23 - File-based routing (typed routes enabled, origin: `https://momir-basic.app/`)

**Rendering:**
- React DOM 19.1.0 - Web support
- React Native Web 0.21.0 - Web compatibility layer

## State Management

**React Query (primary async state):**
- `@tanstack/react-query` 5.83.0 - Server/async state management
- Used in providers: `SettingsProvider`, `HistoryProvider`, `NetworkProvider`
- Single `QueryClient` instance created in `app/_layout.tsx`
- Query keys: `['appSettings']`, `['cardHistory']`, `['networkConnectivity']`
- Refetch intervals: network connectivity every 15s, stale time 10s

**React Context (app state):**
- `@nkzw/create-context-hook` 1.1.0 - Typed context hook factory
- Creates: `useSettings`, `useHistory`, `useNetwork`, `useI18n`
- All providers wrap the app in `app/_layout.tsx`

**AsyncStorage (persistence):**
- `@react-native-async-storage/async-storage` 2.2.0 - Key-value persistence
- Stores: settings (`momir_settings`), history (`momir_card_history`), locale (`momir_locale`)

**Zustand (declared but unused):**
- `zustand` 5.0.2 - Listed in `package.json` but no imports found in source code

## Data Layer

**SQLite (printer registry):**
- `expo-sqlite` 16.0.10 - Printer and print job persistence
- Database: `printer.db`
- Tables: `printers`, `print_jobs`, `schema_version`
- Migration system in `services/printer/storage/schema.ts` (2 migrations)
- Abstraction: `PrinterDatabase` interface with `NativePrinterDatabase` (native) and `MemoryPrinterDatabase` (web fallback) in `services/printer/storage/database.ts`

**Scryfall API (no ORM):**
- Direct `fetch` calls in `services/scryfall.ts`
- Rate-limited: 100ms between requests, 3 retries with exponential backoff
- Custom error class `ScryfallApiError` with transient/retry logic

## UI & Styling

**Component Libraries:**
- None (custom components only)

**Icons:**
- `@expo/vector-icons` 15.0.3 - Expo icon set (Ionicons, etc.)
- `lucide-react-native` 0.475.0 - Lucide icon set

**Imagery:**
- `expo-image` 3.0.11 - Optimized image component with caching
- `react-native-svg` 15.12.1 - SVG rendering (mana symbols, set symbols)
- `expo-linear-gradient` 15.0.8 - Gradient backgrounds
- `expo-blur` 15.0.8 - Blur effects

**Haptics:**
- `expo-haptics` 15.0.8 - Tactile feedback on interactions (card taps, button presses, game actions)

**Custom Fonts:**
- `expo-font` 14.0.11 - Font loading
- `assets/fonts/mana.ttf` - Magic: The Gathering mana symbols font

**Internationalization:**
- Custom i18n system in `i18n/` (no library)
- 11 locales: en, pt, es, fr, de, it, ja, ko, ru, zhs, zht
- Locale stored in AsyncStorage, device locale auto-detected
- Scryfall language parameter mapped from app locale

**Theming:**
- `expo-system-ui` 6.0.9 - System UI integration
- `expo-symbols` 1.0.8 - SF Symbols on iOS
- User interface style: automatic (light/dark)

## Hardware & Native

**Thermal Printer:**
- `react-native-thermal-printer-driver` 0.1.0 - Bluetooth thermal POS printer driver
- Registered as plugin in `app.json` under `"plugins"`
- Native module: `ThermalPrinterDriver` in `NativeModules`
- Transports: BLE, Classic Bluetooth, TCP (Classic filtered on iOS)
- Android permissions: `BLUETOOTH`, `BLUETOOTH_ADMIN`, `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`
- iOS permissions: `NSBluetoothAlwaysUsageDescription`, `NSBluetoothPeripheralUsageDescription`

**ESC/POS Printing:**
- Custom ESC/POS renderer in `services/printer/render/escpos.ts`
- Card receipt documents in `services/printer/render/document.ts`
- Image processing pipeline: `expo-image-manipulator` -> `pngjs` decode -> dither -> pack bitmap -> ESC/POS raster
- Dithering algorithms: Floyd-Steinberg, Ordered (Bayer 4x4), Threshold
- QR code generation via ESC/POS commands

**Image Processing:**
- `expo-image-manipulator` 14.0.8 - Resize/scale card art
- `pngjs` (browser build) - PNG decode/encode
- `buffer` 6.0.3 - Node Buffer polyfill for binary operations
- `@stardazed/streams-text-encoding` 1.0.2 - TextEncoder/TextDecoder polyfill
- `@ungap/structured-clone` 1.3.0 - Structured clone polyfill

**Camera/Media:**
- `expo-image-picker` 17.0.10 - Image selection (declared, usage TBD)
- `expo-media-library` 18.2.1 - Save images to photo library
- iOS permission: `NSPhotoLibraryAddUsageDescription`

**Other Native:**
- `expo-haptics` 15.0.8 - Haptic feedback
- `react-native-view-shot` 4.0.3 - Screen capture for print preview
- `react-native-gesture-handler` 2.28.0 - Gesture system
- `react-native-worklets` 0.5.1 - Worklet runtime

## Build & Tooling

**Package Manager:**
- Bun - Lockfile: `bun.lock` (present)
- All CI workflows use `oven-sh/setup-bun@v2` and `bun install`

**Bundler:**
- Metro (React Native default via Expo)

**Build System:**
- EAS Build (Expo Application Services)
- Config: `eas.json` with `preview` and `production` profiles
- CLI version: >= 13.0.0
- App version source: remote

**Linting:**
- ESLint 9.31.0 with flat config (`eslint.config.js`)
- `eslint-config-expo` 10.0.0
- Run: `bun run lint` (via `expo lint`)

**Type Checking:**
- TypeScript 5.9.2 with strict mode
- Path alias: `@/*` -> `./*`
- Run: `bunx tsc --noEmit`

**Testing:**
- Jest 29.7.0 with `jest-expo` 54.0.0
- `@testing-library/react-native` 13.3.3
- Playwright 1.58.2 for E2E
- Run: `bun run test` or `bun run test:ci`
- Coverage: `--coverage` flag in CI

**Formatting:**
- No Prettier config detected (not enforced)

**Validation:**
- `zod` 4.3.6 - Schema validation (declared, for input validation)

## Platform Targets

**Android:**
- Target SDK: 35, Compile SDK: 36, Build Tools: 36.0.0
- Package: `com.bloodf.momirbasicapp`
- Build types: APK (preview), AAB (production)

**iOS:**
- Bundle: `com.bloodf.momirbasic`
- No tablet support (`supportsTablet: false`)
- Privacy manifests for file timestamps and UserDefaults

**Web:**
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

---

*Stack analysis: 2026-04-13*
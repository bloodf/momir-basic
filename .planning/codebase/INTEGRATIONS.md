# External Integrations

**Analysis Date:** 2026-04-13

## APIs & External Services

**Scryfall API (Magic: The Gathering card data):**
- Base URL: `https://api.scryfall.com`
- Client: Custom fetch wrapper in `services/scryfall.ts` (no SDK)
- Auth: None required (public API)
- Rate limit: Self-enforced 100ms between requests (`RATE_LIMIT_MS = 100`)
- User-Agent header: `Momir-Basic-App/1.0`
- Retry: 3 attempts with exponential backoff (base 300ms, max 1500ms)
- Transient status codes: 429, 500, 502, 503, 504

**Endpoints used:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/cards/random?q=` | GET | Fetch random card by type/CMC for Momir mode |
| `/cards/search?q=` | GET | Search cards with advanced syntax, pagination |
| `/cards/autocomplete?q=` | GET | Autocomplete card names (min 2 chars) |
| `/cards/collection` | POST | Batch fetch localized cards (max 75 per batch) |
| `/cards/{set}/{number}/{lang}` | GET | Fetch single localized card |
| `/sets` | GET | Fetch all MTG sets (filtered by set_type) |
| `/health` | HEAD | Connectivity check (5s timeout) |

**Localization flow:**
- App locale mapped to Scryfall language via `LOCALE_TO_SCRYFALL_LANG` in `services/scryfall.ts`
- For random cards: fetch English first, then fetch localized version by set/collector_number/lang
- For search: fetch results, then batch-localize via `/cards/collection` endpoint (batches of 75)
- Fallback: if localized fetch fails, English card is used with English art URLs preserved

**Advanced search syntax:**
- Shortcut syntax parsed in `parseAdvancedSyntax()`: `R:C/U/R/M` (rarity), `T:C/I/S/A/E/P/L` (type), `F:S/M/L/V/C/P/PA` (format), `A:"name"` (artist), `S:code` (set)
- Mana cost shorthand: `2UUG` -> `mv=4 c:ug`

**QR Code API (external):**
- Service: `api.qrserver.com`
- Endpoint: `https://api.qrserver.com/v1/create-qr-code/?size=144x144&data={encoded}&bgcolor=FFFFFF&color=000000&margin=0`
- Used in `services/printer/render/escpos.ts` `buildQrUrl()`
- Purpose: Generate QR code image URLs linking to Scryfall card pages
- Auth: None (free public API)

## Native Modules

**Thermal Printer Driver (`react-native-thermal-printer-driver`):**
- Native module name: `ThermalPrinterDriver` (registered in `NativeModules`)
- Plugin declared in `app.json` under `"plugins"`
- Implemented in `services/printer/adapters/native.ts` (`NativeThermalPrinterAdapter`)
- Factory: `services/printer/adapters/factory.ts` - creates adapter, throws `UnsupportedPlatformError` on web, `MissingNativeModuleError` if native module absent
- Fake adapter: `services/printer/adapters/fake.ts` - `FakePrinterAdapter` with fixture devices and failure mode simulation for testing

**Native methods called:**

| Method | Purpose |
|--------|---------|
| `ThermalPrinterDriver.scanDevices()` | Discover paired and nearby Bluetooth printers |
| `ThermalPrinterDriver.connect(btAddress, timeout)` | Connect to printer by Bluetooth address |
| `ThermalPrinterDriver.disconnect(btAddress)` | Disconnect from printer |
| `ThermalPrinterDriver.testConnection(btAddress)` | Check if connection is alive |
| `ThermalPrinterDriver.printRaw(btAddress, data, withConnect, timeout)` | Send raw ESC/POS bytes |
| `ThermalPrinterDriver.printImage(btAddress, base64, format, width, height, withConnect, timeout)` | Send image data |

**Bluetooth permissions (Android):**
- `ACCESS_FINE_LOCATION` - Required for BLE scanning
- `BLUETOOTH_SCAN` - Required for Android 12+ scanning
- `BLUETOOTH_CONNECT` - Required for Android 12+ connection
- Permission service: `services/printer/capability/service.ts` (`PrinterCapabilityService`)
- Transport filtering: Classic Bluetooth filtered out on iOS (only BLE/TCP supported)

**Address format:**
- Prefix convention: `bt:` for Classic, `ble:` for BLE, `lan:` for TCP
- Unprefixed addresses default to `bt:` prefix
- iOS filters out Classic Bluetooth devices during discovery

**Printer Registry (SQLite):**
- Database: `printer.db` via `expo-sqlite`
- Tables: `printers` (id, name, address, transport, capabilities, last_seen_at, created_at), `print_jobs` (id, printer_id, canonical_identity, document_type, payload, state, attempts, last_error, created_at, updated_at, next_retry_at)
- Repository layer: `services/printer/storage/repositories.ts`
- Schema migrations: `services/printer/storage/schema.ts` (version 1 and 2)
- Web fallback: `MemoryPrinterDatabase` (in-memory, no persistence)

**Print Job State Machine:**
- States: `queued` -> `printing` -> `printed_confirmed` / `failed_retryable` / `failed_terminal` / `sent_unknown`
- Job documents: `card_receipt` or `diagnostics`

**Printer Diagnostics:**
- Event taxonomy: `services/printer/diagnostics/logger.ts`
- Event types: Permission, Discovery, Connection, Print Job, Native Error
- Logger interface: `PrinterSessionLogger` with `consolePrinterLogger` (dev) and `noOpPrinterLogger` (production)
- Structured JSON log format with timestamp, platform, app version, build ID

**Image Processing Pipeline (for thermal printing):**
- Pipeline: Download image -> `expo-image-manipulator` resize -> `pngjs` decode RGBA -> brightness/contrast adjust -> dither (Floyd-Steinberg/Bayer/threshold) -> pack 1-bit bitmap -> base64 encode
- LRU cache: 16 entries, keyed by URL + width + algorithm + brightness + contrast + threshold + maxHeight
- `expo-file-system` `File` API for caching downloaded art images
- Implementation: `utils/printerImage.ts` (`rasterizeCardArtForPrint`)

**Haptics (`expo-haptics`):**
- Used on: card taps, button presses, game actions, search filter changes
- Pattern: `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light/Medium)`

**Media Library (`expo-media-library`):**
- Used in: `app/print-preview.tsx` for saving print preview images to photo library
- iOS permission: `NSPhotoLibraryAddUsageDescription` in `app.json`

## CI/CD Services

**GitHub Actions (6 workflows):**

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push to main, PR to main | Lint, typecheck, unit tests with coverage |
| `eas-build.yml` | Manual dispatch | EAS Build for ios/android/all (preview/production) |
| `eas-update.yml` | Push to main (path-filtered) | OTA update + Android Play Store auto-submit |
| `release.yml` | Tag push `v*` | Generate changelog (git-cliff), build APK, EAS iOS build, GitHub Release |
| `release-build.yml` | Manual dispatch | Production build with dry-run option |
| `pr-preview.yml` | PR to main (path-filtered) | EAS Update preview + PR comment with instructions |
| `eas-ios-deploy.yml` | Manual dispatch | Build iOS production + submit to TestFlight |

**EAS Configuration (`eas.json`):**
- CLI: >= 13.0.0, app version source: remote
- Build profiles: `preview` (internal distribution, APK for Android, m-medium for iOS), `production` (store distribution, AAB for Android, autoIncrement for both)
- Submit profiles: `production` (Android internal track, iOS default), `playstoreProduction` (Android production track, completed status)
- Service account key: `./google-play-service-account.json`

**Secrets used:**
- `EXPO_TOKEN` - Expo authentication for EAS
- `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` - Google Play publishing credentials

**Package manager in CI:** Bun (`oven-sh/setup-bun@v2`)

**Release tooling:**
- `git-cliff` (orhun/git-cliff-action@v4) - Changelog generation from conventional commits
- Config: `.github/cliff.toml`

## Third-Party Services

**Expo Application Services (EAS):**
- EAS Build - Cloud builds for iOS and Android
- EAS Update - OTA updates on push to main
- EAS Submit - App store submission (iOS TestFlight, Android Play Store)
- Project ID: `8518e773-8656-4479-92ae-ef47db80efa4`

**Google Play Console:**
- Android app: `com.bloodf.momirbasicapp`
- Submission via EAS Submit with service account key
- Tracks: internal (production profile), production (playstoreProduction profile)

**App Store Connect:**
- iOS app: `com.bloodf.momirbasic`
- Submission via EAS Submit (auto-submit on deploy workflow)
- TestFlight distribution

**GitHub:**
- Repository: `bloodf/momir-basic`
- Releases: Auto-created on version tags with changelog + APK + IPA
- Issue templates configured (`.github/ISSUE_TEMPLATE/`)

## Internal Services

**None** - The app has no backend. All data comes from Scryfall API (public, no auth) and is stored locally in AsyncStorage or SQLite.

## Integration Patterns

**Scryfall API Client (custom, no SDK):**
- File: `services/scryfall.ts`
- Pattern: Rate-limited fetch with retry and error classification
- Error hierarchy: `ScryfallApiError` with `status`, `isTransient`, `reason` ('network' | 'server' | 'request')
- Localization: dual-fetch pattern (English first, then localized) with fallback to English

**Printer Adapter (Strategy Pattern):**
- Interface: `PrinterPort` in `services/printer/adapters/port.ts`
- Implementations: `NativeThermalPrinterAdapter` (production), `FakePrinterAdapter` (testing)
- Factory: `services/printer/adapters/factory.ts` - platform-aware creation
- Error model: `PrinterAdapterError` with `PrinterErrorCode` enum for deterministic error handling

**Printer Registry (Repository Pattern):**
- Service: `services/printer/registry/service.ts` - `createRegistryService()` with dependency injection
- Repositories: `services/printer/storage/repositories.ts` - CRUD operations on SQLite
- Database: `services/printer/storage/database.ts` - abstraction over `expo-sqlite` with web fallback

**ESC/POS Rendering (Document Pattern):**
- Interface: `PrintDocument` with `render(renderer, capabilities)` method
- Implementations: `CardReceiptDocument`, `DiagnosticsDocument` in `services/printer/render/document.ts`
- Renderer: `EscPosRenderer` in `services/printer/render/escpos.ts` - accumulates byte commands

**Context Providers (Provider Pattern):**
- `@nkzw/create-context-hook` creates typed provider + hook pairs
- Each provider: `I18nProvider`, `SettingsProvider`, `HistoryProvider`, `NetworkProvider`
- Async data via `@tanstack/react-query` (useQuery + useMutation)
- Persistence via `AsyncStorage`

**Image Processing (Pipeline Pattern):**
- `utils/printerImage.ts`: `rasterizeCardArtForPrint()` orchestrates the pipeline
- `utils/dither.ts`: dithering algorithms (Floyd-Steinberg, Ordered, Threshold)
- LRU cache for rasterized results to avoid reprocessing

## Environment Configuration

**Required env vars (CI/CD):**
- `EXPO_TOKEN` - Expo authentication
- `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` - Play Store publishing

**Runtime configuration:**
- AsyncStorage keys: `momir_settings`, `momir_card_history`, `momir_locale`
- SQLite database: `printer.db`
- File cache: `expo-file-system` Paths.cache for downloaded art images

**Secrets location:**
- GitHub Actions secrets (EXPO_TOKEN, GOOGLE_PLAY_SERVICE_ACCOUNT_KEY)
- No `.env` file detected in project root (existence only noted)

## Webhooks & Callbacks

**Incoming:** None

**Outgoing:**
- Scryfall API requests (standard REST, no webhooks)
- QR code API requests (stateless image generation)

---

*Integration audit: 2026-04-13*
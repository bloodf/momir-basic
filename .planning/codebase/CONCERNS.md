# Codebase Concerns & Risks

**Analysis Date:** 2026-04-13

## Technical Debt

### Oversized Screen Components (HIGH)

Multiple screen files far exceed the 800-line limit and the 200-400 line ideal, combining UI rendering, business logic, animation, and styling into single files.

- **`app/(tabs)/settings/printer.tsx`** (2438 lines) -- The largest file in the codebase. Contains printer discovery, connection lifecycle, permission handling, TCP setup modal, test print flow, UI state machine (13 states), and inline styles. No extraction of sub-components or hooks.
- **`app/card.tsx`** (1238 lines) -- Card detail screen with printing, face toggling, art rotation, sharing, and download. Business logic for print dispatch and image handling mixed with rendering.
- **`app/life-counter.tsx`** (1113 lines) -- Life counter with Momir mode, multi-player, counter types, and game state. All game logic inline with rendering.
- **`app/print-preview.tsx`** (1066 lines) -- Print preview with dithering, connection management, save-to-gallery, and print dispatch.
- **`app/(tabs)/(home)/index.tsx`** (1055 lines) -- Home screen with hero art rotation, prefetching, CMC picker, and cast mutation. Background art warming logic alone is ~200 lines.
- **`components/SearchFilters.tsx`** (870 lines) -- Filter panel with color, type, format, CMC, rarity, and set pickers. All filter UI inline.

**Impact:** High cognitive load to modify any of these files. Changes to printer logic require scrolling through 2400+ lines. Bug risk from intertwined state and UI. Difficult to write targeted tests.

**Fix approach:** Extract custom hooks (e.g., `usePrinterConnection`, `useHeroArtRotation`, `useLifeCounterGame`) and sub-components (e.g., `PrinterDiscoveryList`, `CmcStepper`, `FilterColorPicker`) from each file. Target under 400 lines per file.

### Duplicated Card Type Query Logic (MEDIUM)

Two functions in `services/scryfall.ts` map `CardType` to Scryfall query fragments with near-identical switch statements:

- `buildQuery()` at line 124 -- full query builder with CMC
- `getTypeQueryFragment()` at line 151 -- fragment-only version

Adding a new card type requires updating both switches. The `CardType` union in `types/index.ts` (line 50-59) is the source of truth but neither function validates exhaustiveness against it.

**Files:** `services/scryfall.ts` lines 124-164, `types/index.ts` lines 50-59

**Impact:** New card types can be added to the type but missed in one query builder, producing incorrect Scryfall queries at runtime with no compile-time safety.

**Fix approach:** Create a single `CARD_TYPE_QUERIES` map (Record<CardType, { fragment: string; query: (cmc: number) => string }>) and derive both functions from it. Add a TypeScript exhaustiveness check.

### Module-Level Mutable Rate Limiter State (LOW)

The Scryfall rate limiter uses a module-level `let` variable:

```typescript
// services/scryfall.ts line 12
let lastRequestTime = 0;
```

This shared mutable state persists across the module lifetime and cannot be reset in tests without reloading the module. Multiple concurrent callers share the same timer.

**Files:** `services/scryfall.ts` lines 12, 110-117

**Impact:** Test isolation difficulty. If two features call Scryfall concurrently, they share a single rate-limit window, which is correct for API compliance but makes the timing behavior implicit and untestable in isolation.

**Fix approach:** Encapsulate rate-limit state in a class or closure that can be injected/reset for testing.

## Security Concerns

### Service Account Key File in Repository Root (CRITICAL)

A Google Play service account JSON file exists at `google-play-service-account.json` (2391 bytes, 13 lines). While it is listed in `.gitignore` (line 10), the `eas.json` configuration references it directly:

```json
"serviceAccountKeyPath": "./google-play-service-account.json"
```

**Files:** `google-play-service-account.json`, `eas.json` lines 33, 44

**Current mitigation:** Listed in `.gitignore` so it should not be committed. However, the file sits in the repository root alongside source code.

**Risk:** If `.gitignore` is bypassed (e.g., `git add -f`, accidental force-add), the service account key with Play Store publish permissions would be committed. The EAS build pipeline requires this file at the referenced path, creating an operational dependency on a file that must never be committed.

**Recommendations:**
1. Move the file to a secure location outside the repo (e.g., CI secret store, environment variable).
2. Update `eas.json` to reference the key via environment variable or CI secret injection.
3. Add a pre-commit hook that blocks `.json` files matching `*service-account*` patterns.

### Second Service Account Key in `play/` Directory (CRITICAL)

Another Play Store service account JSON exists at `play/momir-basic-play-store-28cdc1226840.json` (2402 bytes). This directory is also in `.gitignore` (line 12), but the same risks apply.

**Files:** `play/momir-basic-play-store-28cdc1226840.json`

**Risk:** Same as above. Two separate service account keys represent an expanded attack surface.

### Build Artifact in Repository Root (HIGH)

A 117MB APK file exists at `build-1775777303862.apk`. While `*.apk` is in `.gitignore`, this file occupies significant disk space and signals that build artifacts are being generated in the repo root.

**Files:** `build-1775777303862.apk`

**Current mitigation:** Listed in `.gitignore` (line 18).

**Risk:** Cloning the repo pulls this file if it was ever committed. If `.gitignore` is misconfigured or bypassed, a 117MB binary would enter version history permanently.

**Recommendations:** Delete the file from disk. Ensure build output goes to a dedicated `dist/` or `build/` directory already gitignored.

### Unsafe JSON.parse on External Data (MEDIUM)

Nine instances of `JSON.parse()` operate on data that could be malformed, with only some wrapped in try-catch:

- `providers/SettingsProvider.tsx` lines 43, 125, 131 -- `AsyncStorage` data parsed without try-catch. A corrupted storage value crashes the app on settings load.
- `providers/HistoryProvider.tsx` line 17 -- Same pattern: history data parsed without error handling.
- `app/card.tsx` lines 70-71 -- Route params parsed with try-catch (safe).
- `app/print-preview.tsx` line 70 -- Route params parsed with try-catch (safe).
- `services/printer/storage/repositories.ts` lines 69, 200 -- SQLite row data parsed with partial error handling.

**Impact:** Corrupted AsyncStorage data (disk corruption, app crash mid-write, OS update) would crash the app on startup because SettingsProvider and HistoryProvider run during app initialization (`app/_layout.tsx` lines 97-113). No fallback or recovery mechanism exists.

**Fix approach:** Wrap all `JSON.parse()` calls on persisted data in try-catch blocks. On parse failure, return defaults (like `DEFAULT_SETTINGS` or `[]`) and log the corruption. Consider adding Zod validation for critical data shapes.

### Unvalidated Scryfall API Responses (MEDIUM)

All Scryfall API responses are cast with `as` type assertions rather than validated:

```typescript
const data: ScryfallCard = await response.json();
const result = await collectionResponse.json() as { data: ScryfallCard[] };
```

**Files:** `services/scryfall.ts` lines 246, 310, 384, 391, 452, 493, 524, 567

**Impact:** If Scryfall changes their API schema (they have deprecated fields before), the app would receive unexpected data shapes with no runtime validation. Fields could be `undefined` where code expects them to exist, causing crashes in `mapScryfallCard()`.

**Fix approach:** Use Zod (already a dependency at `^4.3.6`) to validate Scryfall API responses at the boundary. Define a `ScryfallCardSchema` and parse responses through it.

## Performance Concerns

### Dimensions.get('window') at Module Scope (MEDIUM)

Five files call `Dimensions.get('window')` at module scope to set constants:

- `app/card.tsx` line 57
- `app/life-counter.tsx` line 38
- `app/print-preview.tsx` line 32
- `components/HistorySheet.tsx` line 25
- `components/CardGridItem.tsx` line 12

These values are captured once at module load time and never update on orientation change or screen resize. On iPad or foldable devices, the layout will use stale dimensions.

**Impact:** Broken layout on orientation change. Components use hardcoded ratios of stale screen dimensions.

**Fix approach:** Replace with `useWindowDimensions()` hook (already imported in `SearchFilters.tsx` line 11) which updates reactively on dimension changes.

### Network Connectivity Polling (LOW)

The NetworkProvider polls Scryfall health endpoint every 15 seconds:

```typescript
refetchInterval: 15000,
```

**Files:** `providers/NetworkProvider.tsx` line 34

**Impact:** 4 network requests per minute to an external API just for connectivity checking. On cellular data, this consumes bandwidth and battery. Scryfall may rate-limit or block persistent polling.

**Fix approach:** Use React Native's `NetInfo` library for offline detection (checks network stack, not specific API). Fall back to Scryfall health check only when NetInfo reports online but API calls fail.

### Hero Art Warming Complexity (LOW)

The home screen implements a sophisticated hero art prewarming system with 5 refs tracking cache state, prefetch order, and active promises:

**Files:** `app/(tabs)/(home)/index.tsx` lines 88-103, 160-233

**Impact:** The warming logic is hard to reason about and debug. The cache is unbounded (`warmedArtUrlsRef` grows without limit). If the user switches types rapidly, multiple concurrent prefetch chains can overlap.

**Fix approach:** Extract to a dedicated `useHeroArtCache` hook with clear cache eviction policy. Cap the warmed URLs map at a reasonable size (e.g., 20 entries).

### Inline StyleSheet.create in Every Screen (LOW)

All 11 screen files define their styles inline at the bottom of the file using `StyleSheet.create()`. For the largest files (printer.tsx, card.tsx, life-counter.tsx), the style block alone is 200-400 lines.

**Impact:** Style definitions cannot be shared or reused. Modifying a style requires finding it in a 1000+ line file. No style reuse across screens for common patterns (buttons, cards, etc.).

**Fix approach:** Extract shared style constants (colors, spacing, border radii) to `constants/` and create reusable style compositions for common patterns.

## Maintainability Concerns

### Silent Error Swallowing (HIGH)

26 instances of empty `catch {}` blocks across the codebase silently swallow errors:

- `services/scryfall.ts` line 87 -- Localized card fetch failure returns null with no logging
- `app/_layout.tsx` line 44 -- Printer auto-connect failure shows toast but swallows error details
- `app/print-preview.tsx` lines 71, 122, 171, 221, 316, 341 -- Six empty catch blocks
- `app/card.tsx` lines 74, 158, 333, 348, 372 -- Five empty catch blocks
- `app/(tabs)/settings/printer.tsx` lines 204, 240, 275, 280 -- Four empty catch blocks
- `providers/NetworkProvider.tsx` line 20 -- Network check failure silently returns false
- `services/printer/storage/database.ts` line 268 -- Database migration error swallowed
- `services/printer/registry/service.ts` line 170 -- Registry error swallowed
- `services/printer/storage/repositories.ts` line 201 -- Repository error swallowed

**Impact:** Bugs become invisible. Printer connection failures, database errors, and API failures produce no diagnostic output. Users report "it doesn't work" with no logs to investigate.

**Fix approach:** Replace empty catches with error logging (even `console.warn`). For expected failures, add a comment explaining why the error is intentionally ignored. Use the existing `PrinterAdapterError` pattern for typed error handling.

### 29 console.log Calls in Production Code (MEDIUM)

20 `console.log` calls in `services/scryfall.ts` alone, plus 9 across other files:

- `services/scryfall.ts` -- 20 instances, used for API request/response tracing
- `providers/NetworkProvider.tsx` line 73 -- Online status change
- `services/printer/adapters/native.ts` line 94 -- Diagnostic device count
- `services/printer/adapters/fake.ts` line 88 -- Fake adapter activity
- `app/(tabs)/settings/printer.tsx` lines 343, 347 -- Diagnostic logs

**Impact:** Console output in production affects performance on some platforms. No log levels or filtering. Cannot disable debug output in release builds.

**Fix approach:** Replace with the existing `logger` service (`services/printer/diagnostics/logger.ts`) or a simple environment-gated log utility. Strip console calls in production builds via Babel plugin.

### ESLint Suppressions (LOW)

11 `eslint-disable` comments across the codebase:

- `@typescript-eslint/no-explicit-any` -- 2 instances in `services/printer/capability/service.ts` lines 93, 102
- `@typescript-eslint/no-var-requires` -- 2 instances in `services/printer/adapters/native.ts` line 53, `services/printer/adapters/factory.ts` line 62
- `react-hooks/exhaustive-deps` -- 2 instances in `app/(tabs)/settings/printer.tsx` line 289, `app/(tabs)/search/index.tsx` line 144
- `no-console` -- 4 instances

**Impact:** The `any` types bypass TypeScript safety in the capability service. The `var-requires` suppressions indicate dynamic module loading that bypasses bundler analysis. The `exhaustive-deps` suppressions risk stale closures.

**Fix approach:** For `any`: define proper types for Android permission results. For `var-requires`: use conditional imports with typed fallbacks. For `exhaustive-deps`: either add the missing dependencies or restructure the effect to avoid the dependency.

### Unshared i18n Locale Content (LOW)

11 locale files are each exactly 326 lines, suggesting copy-paste with translation edits. The `i18n/types.ts` file (322 lines) defines the full translation schema.

**Files:** `i18n/locales/*.ts` (11 files, 326 lines each)

**Impact:** Adding a new i18n key requires editing 11 files identically (adding the key structure). If one locale misses a key, TypeScript may not catch it if the type is permissive.

**Fix approach:** Use a tool like `i18n-checker` or a CI script that verifies all locales have identical key sets. Consider extracting shared keys or using a code-generation approach from a single source of truth.

## Dependency Risks

### zustand Listed But Unused (LOW)

`zustand` (`^5.0.2`) is listed in `package.json` dependencies but no source file imports it. Grep for `from 'zustand'` returns zero matches.

**Files:** `package.json` line 57

**Impact:** Unnecessary dependency increases bundle size and install time. Could confuse new developers about which state management approach to use.

**Fix approach:** Remove from `package.json`. The app uses React Context + `@nkzw/create-context-hook` + TanStack Query for state management.

### react-native-web Version Mismatch (MEDIUM)

`react-native-web` is at `^0.21.0` while `react-native` is at `0.81.5`. The `0.21.x` series is from 2022 and designed for React Native 0.64-0.71 era. No source file imports `react-native-web` directly (it is likely a transitive dependency for Expo web support).

**Files:** `package.json` line 54

**Impact:** Web builds may have rendering bugs or missing features. The version mismatch with React 19.1.0 (used here) is severe -- `react-native-web` 0.21 targets React 17.

**Fix approach:** Upgrade to `react-native-web` 0.40+ which supports React 19. Verify web build functionality after upgrade. If web is not a target platform, remove the dependency.

### react-native-thermal-printer-driver Risk (HIGH)

`react-native-thermal-printer-driver` (`^0.1.0`) is a v0.1 package used for the core printer functionality. The native adapter accesses `NativeModules.ThermalPrinterDriver` directly, and dynamic `require()` calls bypass bundler analysis:

```typescript
// services/printer/adapters/native.ts line 53-54
// eslint-disable-next-line @typescript-eslint/no-var-requires
return require('react-native-thermal-printer-driver').default;
```

**Files:** `services/printer/adapters/native.ts`, `services/printer/adapters/factory.ts`, `package.json` line 52

**Impact:** A v0.1 package may have breaking changes or be abandoned. The native module integration is tightly coupled. No type definitions are published -- the app relies on `NativeModules.ThermalPrinterDriver` which is untyped. A breaking change to the native module would silently fail or crash.

**Fix approach:** Pin the exact version (remove `^`). Create TypeScript type declarations for the native module interface. Consider forking the library if it becomes unmaintained.

### Polyfill Dependencies (LOW)

Two polyfill packages are included:

- `@stardazed/streams-text-encoding` (`^1.0.2`) -- Not imported by any source file
- `@ungap/structured-clone` (`^1.3.0`) -- Not imported by any source file
- `buffer` (`^6.0.3`) -- Used only by `services/printer/render/escpos.ts` and `utils/printerImage.ts`

**Files:** `package.json` lines 19, 22, 23

**Impact:** Unused polyfills increase bundle size. The `buffer` polyfill is needed for printer ESC/POS byte construction but adds ~50KB to the bundle.

**Fix approach:** Remove unused polyfills (`@stardazed/streams-text-encoding`, `@ungap/structured-clone`). For `buffer`, evaluate whether `Uint8Array` can replace it for the printer use case.

### Empty Directories (LOW)

Two directories exist but contain no files:

- `plugins/` -- Empty, no Expo config plugins
- `lancedb/` -- Empty, no vector database code

**Files:** `plugins/`, `lancedb/`

**Impact:** Confusing for developers. `lancedb/` suggests an abandoned vector search feature. Both are in `.gitignore` but the directories exist on disk.

**Fix approach:** Remove empty directories or add `.gitkeep` with a comment if they are intentional placeholders.

## Scalability Concerns

### Provider Nesting Depth (MEDIUM)

The app layout nests 7 provider layers:

```tsx
<QueryClientProvider>
  <GestureHandlerRootView>
    <SafeAreaProvider>
      <I18nProvider>
        <SettingsProvider>
          <HistoryProvider>
            <NetworkProvider>
              <ToastProvider>
```

**Files:** `app/_layout.tsx` lines 96-114

**Impact:** Adding new global state requires another provider layer. Deep nesting makes the component tree harder to debug. Re-render cascades from top-level providers can affect all children.

**Fix approach:** Flatten providers where possible. Consider combining Settings + History into a single provider since they both wrap AsyncStorage + TanStack Query. Move NetworkProvider to only wrap components that need it.

### AsyncStorage as Sole Persistence Layer (MEDIUM)

All app state (settings, history) is persisted exclusively through `AsyncStorage` with `JSON.stringify()`/`JSON.parse()`. History has no size limit:

```typescript
const updated = [card, ...prev];  // Unbounded growth
saveMutation.mutate(updated);
```

**Files:** `providers/HistoryProvider.tsx` line 39, `providers/SettingsProvider.tsx` lines 80-81

**Impact:** AsyncStorage has practical size limits (6MB on Android by default). A power user with thousands of card history entries could hit the limit. No pagination or eviction policy exists for history.

**Fix approach:** Add a maximum history size (e.g., 500 cards) with FIFO eviction. Consider migrating history to `expo-sqlite` (already a dependency) for structured queries and larger capacity. The printer subsystem already uses SQLite; extending it to history would be consistent.

### TanStack Query Used for Local State (LOW)

`SettingsProvider` and `HistoryProvider` use TanStack Query (`useQuery` + `useMutation`) to read/write AsyncStorage. This pattern uses a remote-data-fetching library for local synchronous storage. The query invalidation cycle (save -> invalidate -> refetch from storage) introduces an unnecessary async round-trip for what is effectively a local write.

**Files:** `providers/SettingsProvider.tsx` lines 39-86, `providers/HistoryProvider.tsx` lines 13-35

**Impact:** Settings updates trigger a query invalidation, then a re-read from AsyncStorage, then a state update -- a 3-step async dance for what should be a local state update. This adds latency to every settings change.

**Fix approach:** Use a simpler state management approach for local-only data (e.g., direct `useState` + `AsyncStorage.setItem` with optimistic updates, or Zustand which is already a dependency). Reserve TanStack Query for actual remote data fetching (Scryfall API calls).

## Documentation Gaps

### No Onboarding Documentation (MEDIUM)

No `CONTRIBUTING.md` contains developer setup instructions. The existing `CONTRIBUTING.md` at the root is present but may be stale. There is no documentation about:

- How to set up the printer native module for development
- Required environment variables or secrets for EAS builds
- The i18n workflow (adding new locales or keys)
- The printer state machine and its transitions

**Impact:** New contributors cannot set up the project without reading source code. The printer integration is particularly opaque without documentation.

### Missing Architecture Documentation (MEDIUM)

No `ARCHITECTURE.md` or `STRUCTURE.md` exists. The printer subsystem alone has 10+ files across adapters, storage, registry, capability, render, and diagnostics layers, but there is no overview of how they connect.

**Files:** `services/printer/` (18 files across 6 subdirectories)

### Undocumented Printer State Machine (LOW)

The `PrinterUiState` type in `app/(tabs)/settings/printer.tsx` defines 13 states with implicit transitions. No state diagram or transition table exists.

**Files:** `app/(tabs)/settings/printer.tsx` lines 60-72

**Impact:** Understanding valid state transitions requires reading 2400+ lines of code. Adding a new state requires tracing all existing transition points.

## Test Coverage Gaps

### No Screen-Level Integration Tests (HIGH)

The `__tests__/app/` directory contains only 4 test files (402 lines total), all testing isolated hooks or cache behavior. None test screen-level integration:

- Missing: Home screen cast flow (select type -> set CMC -> cast -> navigate to card)
- Missing: Search flow (type query -> apply filters -> view results -> navigate to card detail)
- Missing: Life counter gameplay (add/remove life -> change players -> Momir mode)
- Missing: Printer connection flow (scan -> select -> connect -> print)
- Missing: Settings migration from legacy format

**Files:** `__tests__/app/` (4 files, 402 lines vs. ~9000 lines of screen code)

**Risk:** UI regressions in critical user flows go undetected. The cast flow (primary app function) has no integration test.

**Priority:** HIGH

### Printer Subsystem Has Good Unit Coverage but No Integration Tests (MEDIUM)

The printer subsystem has 8 test files (270 lines total) with good unit coverage of adapters, registry, database, and ESC/POS rendering. However, no end-to-end test validates the full flow: discover -> connect -> render document -> print.

**Files:** `__tests__/printer/` (8 files)

### E2E Tests Exist But Limited (LOW)

3 Playwright E2E tests exist (`e2e/printer-qa.spec.ts`, `e2e/search-filters.spec.ts`, `e2e/home-hero.spec.ts`). These test web builds only and do not cover native mobile functionality (printer, haptics, Bluetooth).

**Files:** `e2e/` (3 files)

### Test Setup Silences All Console Output (LOW)

`jest.setup.js` replaces `console.warn` and `console.error` with `jest.fn()`, which means warnings and errors during tests are silently discarded. This can hide real issues:

```javascript
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
```

**Files:** `jest.setup.js` lines 7-10

**Impact:** Deprecation warnings, React prop-type warnings, and error logging are invisible during test runs. A component that logs errors on every render would pass tests silently.

**Fix approach:** Only silence expected warnings. Use `jest.spyOn(console, 'error').mockImplementation()` for specific expected errors instead of blanket suppression.

## Positive Patterns

### Well-Structured Printer Service Architecture

The printer subsystem (`services/printer/`) is well-decomposed into distinct layers: adapters (native/fake/port), storage (database/repositories/schema), registry, capability, render (ESC/POS/document), and diagnostics (logger). The `PrinterPort` interface and `PrinterAdapterError` typed error system provide clean abstraction boundaries.

**Files:** `services/printer/adapters/port.ts`, `services/printer/adapters/native.ts`, `services/printer/adapters/fake.ts`

### Proper Error Types for Scryfall API

`ScryfallApiError` in `services/scryfall.ts` provides structured error information with status codes, transient/retryable flags, and categorized reasons (network/server/request). This enables intelligent retry logic and user-facing error messages.

**Files:** `services/scryfall.ts` lines 22-58

### Immutable State Update Patterns

Providers consistently use spread operators for state updates rather than mutation:

```typescript
const updated = { ...prev, ...partial };
const updated = [card, ...prev];
```

**Files:** `providers/SettingsProvider.tsx` lines 89-100, `providers/HistoryProvider.tsx` lines 37-51

### Zod Available for Validation

`zod` (`^4.3.6`) is already a dependency, though underutilized (only used implicitly). It is available for adding runtime validation to API responses and AsyncStorage data.

**Files:** `package.json` line 56

### TypeScript Strict Mode Enabled

`tsconfig.json` has `"strict": true`, providing compile-time safety for null checks, implicit any, and other common issues.

**Files:** `tsconfig.json` line 4

### Comprehensive Scryfall API Error Handling with Retry

The Scryfall service implements exponential backoff, rate limiting (100ms between requests), transient error detection (429, 5xx), and CMC fallback logic. This is production-quality API integration.

**Files:** `services/scryfall.ts` lines 76-117, 253-270

### Printer State Machine is Explicit

The `PrinterUiState` union type enumerates 13 explicit hardware-grounded states rather than using boolean flags. This prevents impossible state combinations and makes the UI logic deterministic.

**Files:** `app/(tabs)/settings/printer.tsx` lines 60-72

### Legacy Migration Path for Printer Config

A dedicated `migratePrinterPreferences()` function in `types/index.ts` and a `LegacyPrinterConfig` type handle backward compatibility for users upgrading from older printer configurations.

**Files:** `types/index.ts` lines 146-245

---

*Concerns audit: 2026-04-13*
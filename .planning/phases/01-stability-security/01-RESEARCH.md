# Phase 1: Stability & Security - Research

**Researched:** 2026-04-13
**Domain:** React Native / Expo crash safety, secret management, structured logging, performance baselines
**Confidence:** HIGH

## Summary

Phase 1 addresses four distinct but interrelated concerns: (1) preventing startup crashes from corrupted AsyncStorage data by wrapping all JSON.parse calls on persisted data with try-catch and fallback defaults, (2) removing Google Play service account keys from the project directory and transitioning EAS submit to credential-store-based authentication, (3) classifying every empty catch block with typed error categories and replacing console.log calls with a lightweight structured logger, and (4) establishing Reassure performance baselines for the home screen cast flow before any subsequent refactoring begins.

The codebase currently has 5 unprotected JSON.parse calls on AsyncStorage data across SettingsProvider.tsx and HistoryProvider.tsx, 4 empty `.catch(() => {})` patterns plus approximately 20+ empty `catch {}` blocks in app/ screens, service account key files on disk (already gitignored but still present and referenced by eas.json), and zero performance regression tests. The printer subsystem already has a well-architected error model (`PrinterAdapterError` + `PrinterErrorCode` enum) that serves as the gold standard pattern for the new app-wide structured logger.

**Primary recommendation:** Create a minimal `utils/logger.ts` following the PrinterErrorCode enum pattern, wrap all 5 JSON.parse calls with try-catch returning defaults and clearing corrupted keys, remove service account files from disk and update eas.json to use EAS Dashboard credentials, and install Reassure 1.4.1 with a single home-cast `.perf-test.tsx` baseline.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use a lightweight structured logger (`utils/logger.ts`) with severity levels (error, warn, info, debug) that wraps `console.error`/`console.warn` in development and is a no-op in production. Replace all 29 `console.log` calls and all empty `catch(() => {})` blocks with classified logger calls.
- **D-02:** Error classification follows the pattern from the printer subsystem: each catch block must either handle the error (recovery action) or log it with a typed error category (e.g., `storage`, `network`, `navigation`, `printer`). No silent swallowing.
- **D-03:** For the 8 identified empty catch blocks: classify each by intent. `Linking.openURL` catches = `navigation` (log warn), `AsyncStorage.setItem` catches = `storage` (log error), `mergeDiscoveredWithRegistry` catches = `printer` (log warn).
- **D-04:** Wrap all `JSON.parse` calls on persisted data with try-catch that falls back to defaults. Specifically: `SettingsProvider` (line ~30 of providers/SettingsProvider.tsx) and `HistoryProvider` (providers/HistoryProvider.tsx), and `i18n` locale load (i18n/index.ts line ~126). On parse failure: log the error as `storage` category with the key name, return default value, and clear the corrupted key.
- **D-05:** The fallback-on-corruption pattern should return defaults AND clear the corrupted key from AsyncStorage to prevent repeated crash-on-startup loops.
- **D-06:** Move `google-play-service-account.json` and `play/momir-basic-play-store-28cdc1226840.json` out of the repo. Use EAS environment variables (`GOOGLE_PLAY_SERVICE_ACCOUNT_KEY`) instead of file paths. Update `eas.json` to reference the env var. Add a pre-commit hook that blocks files matching `*service-account*` patterns.
- **D-07:** Remove any `.aab` build artifacts from repo root. Add `*.aab` to `.gitignore` if not already present.
- **D-08:** Set up Reassure for the home screen "cast" flow only (the core value interaction). This is the baseline that must not regress during Phases 2-3. Additional flows can be added in Phase 5.
- **D-09:** Run Reassure in CI as a non-blocking check initially (Phase 1). Block on regressions starting Phase 2.

### Claude's Discretion
- Logger implementation details (API design, transport, formatter)
- Exact Reassure test scenarios and threshold configuration
- Pre-commit hook implementation (Husky vs native git hooks — decide in Phase 4 when Husky is added)
- `.aab` file detection and removal verification

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STAB-01 | App does not crash on startup when AsyncStorage contains corrupted JSON | 5 unprotected JSON.parse calls identified in SettingsProvider, HistoryProvider, and standalone functions; fallback pattern with key clearing documented below |
| STAB-02 | Service account keys removed from repo and loaded from CI secrets or environment variables | Files on disk but NOT in git; EAS Dashboard upload is the recommended approach; eas.json must remove serviceAccountKeyPath |
| STAB-03 | Build artifact (.aab) removed from repository root | Already gitignored; no .aab files found on disk or in git history; verification step needed |
| STAB-04 | All empty catch blocks classified — either handle explicitly or log with structured error type | 4 `.catch(() => {})` patterns + ~20 empty `catch {}` blocks in app/; classification taxonomy follows PrinterErrorCode pattern |
| DX-05 | Add Reassure for React Native performance regression testing (baseline before refactoring) | Reassure 1.4.1 verified; works with Expo + Jest 29; .perf-test.tsx extension; home cast flow baseline test |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-native-async-storage/async-storage | 2.2.0 (already installed) | Key-value persistence | Already in use; wrapping JSON.parse with try-catch requires no new dependencies [VERIFIED: package.json] |
| reassure | 1.4.1 | Performance regression testing | Official Callstack library; Expo-compatible; works with existing Jest 29 setup [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jest | 29.7.0 (already installed) | Test runner | Already configured with jest-expo; Reassure runs on top of it [VERIFIED: package.json] |
| @testing-library/react-native | 13.3.3 (already installed) | Component testing | Reassure uses RNTL's render/mount under the hood [VERIFIED: package.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom utils/logger.ts | winston / react-native-logs | Overkill for this app — we need a ~50-line utility, not a full logging framework. Custom logger follows PrinterErrorCode pattern already established in codebase. |
| EAS Dashboard credential upload | Base64 env var + decode to file | Dashboard is simpler; env var approach is fallback for CI pipelines that need programmatic access. CONTEXT.md specifies EAS env vars approach. |
| Reassure | Flashlight | Flashlight is for profiling, not regression testing. Reassure measures render counts/durations and compares branches. Complementary, not interchangeable. |

**Installation:**
```bash
# Reassure (only new dependency for this phase)
bun add -D reassure@1.4.1

# Reassure CLI initialization (generates reassure-tests.sh, dangerfile, .reassure/ in .gitignore)
npx reassure init
```

**Version verification:**
- `reassure`: 1.4.1 (verified via `npm view reassure version`, published 2025-03-12) [VERIFIED: npm registry]

## Architecture Patterns

### Recommended Project Structure
```
utils/
  logger.ts          # NEW: Structured logger with ErrorCategory enum
providers/
  SettingsProvider.tsx  # MODIFY: Add try-catch around JSON.parse, clear corrupted keys
  HistoryProvider.tsx   # MODIFY: Add try-catch around JSON.parse, clear corrupted keys
i18n/
  index.ts              # MODIFY: Replace empty catch with logger, add try-catch if needed
app/(tabs)/(home)/
  index.tsx             # MODIFY: Replace .catch(() => {}) with logger
app/(tabs)/settings/
  index.tsx             # MODIFY: Replace .catch(() => {}) with logger
  printer.tsx           # MODIFY: Replace .catch(() => {}) with logger
__reassure__/
  home-cast.perf-test.tsx  # NEW: Reassure baseline for cast flow
eas.json                # MODIFY: Remove serviceAccountKeyPath, add env var reference
```

### Pattern 1: Structured Logger with Error Categories
**What:** A lightweight logger that wraps console methods with severity levels and typed error categories, following the PrinterErrorCode/PrinterAdapterError pattern already established in the printer subsystem.
**When to use:** Every catch block and console.log replacement in the app.
**Example:**
```typescript
// Source: Based on services/printer/adapters/port.ts PrinterErrorCode pattern
// utils/logger.ts

export enum ErrorCategory {
  Storage = 'storage',
  Network = 'network',
  Navigation = 'navigation',
  Printer = 'printer',
  Render = 'render',
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const IS_DEV = __DEV__;

function log(level: LogLevel, category: ErrorCategory, message: string, error?: unknown): void {
  if (!IS_DEV && (level === 'debug' || level === 'info')) return;

  const prefix = `[${category.toUpperCase()}]`;
  const payload = error ? { message, error: String(error) } : message;

  switch (level) {
    case 'error': console.error(prefix, payload); break;
    case 'warn': console.warn(prefix, payload); break;
    case 'info': IS_DEV && console.log(prefix, payload); break;
    case 'debug': IS_DEV && console.log(prefix, payload); break;
  }
}

export const logger = {
  error: (category: ErrorCategory, message: string, error?: unknown) =>
    log('error', category, message, error),
  warn: (category: ErrorCategory, message: string, error?: unknown) =>
    log('warn', category, message, error),
  info: (category: ErrorCategory, message: string, error?: unknown) =>
    log('info', category, message, error),
  debug: (category: ErrorCategory, message: string, error?: unknown) =>
    log('debug', category, message, error),
};
```

### Pattern 2: Safe JSON.parse with Fallback and Key Clearing
**What:** Wraps JSON.parse on persisted data with try-catch that returns defaults, logs the corruption, and clears the corrupted key to prevent crash loops.
**When to use:** Every JSON.parse call on AsyncStorage data (providers, standalone functions).
**Example:**
```typescript
// Source: CONTEXT.md D-04, D-05
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger, ErrorCategory } from '@/utils/logger';

function safeJsonParse<T>(json: string | null, fallback: T, storageKey: string): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    logger.error(ErrorCategory.Storage, `Corrupted data in AsyncStorage key "${storageKey}"`, error);
    void AsyncStorage.removeItem(storageKey); // Clear corrupted key to prevent crash loop
    return fallback;
  }
}

// Usage in SettingsProvider:
const parsed = safeJsonParse(stored, {}, SETTINGS_KEY);
// Usage in HistoryProvider:
return safeJsonParse<Card[]>(stored, [], HISTORY_KEY);
```

### Pattern 3: Empty Catch Classification
**What:** Each empty catch block is classified by intent: expected failure (add comment), missing recovery (log + user action), missing diagnostic (log warn/error).
**When to use:** Replacing every `.catch(() => {})` and empty `catch {}` block.
**Example:**
```typescript
// Navigation: Linking.openURL failure (expected in some environments)
Linking.openURL('https://github.com/bloodf/momir-basic').catch((error) => {
  logger.warn(ErrorCategory.Navigation, 'Failed to open external URL', error);
});

// Storage: AsyncStorage write failure (should be logged)
AsyncStorage.setItem(LOCALE_KEY, newLocale).catch((error) => {
  logger.error(ErrorCategory.Storage, `Failed to persist locale to "${LOCALE_KEY}"`, error);
});

// Printer: Background registry merge failure (non-blocking but should be tracked)
registryService.mergeDiscoveredWithRegistry([printer]).catch((error) => {
  logger.warn(ErrorCategory.Printer, 'Background registry merge failed', error);
});

// Prefetch: Hero art prefetch failure (expected, no user impact)
}).catch((error) => {
  logger.debug(ErrorCategory.Network, 'Hero art prefetch failed', error);
});
```

### Pattern 4: Reassure Performance Baseline
**What:** A `.perf-test.tsx` file measuring render count and duration for the home screen cast flow.
**When to use:** Establishing the baseline before any refactoring begins (Phases 2-3).
**Example:**
```typescript
// Source: Reassure docs (callstack.github.io/reassure/docs/installation)
// __reassure__/home-cast.perf-test.tsx
import { measureRenders } from 'reassure';
import { screen, fireEvent } from '@testing-library/react-native';
import HomeScreen from '@/app/(tabs)/(home)/index';

// Wrap with required providers for the component tree
const Wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <SettingsProvider>
      <HistoryProvider>
        <NetworkProvider>
          <I18nProvider>
            {children}
          </I18nProvider>
        </NetworkProvider>
      </HistoryProvider>
    </SettingsProvider>
  </QueryClientProvider>
);

test('Home screen initial render', async () => {
  await measureRenders(<HomeScreen />, { wrapper: Wrapper });
});

test('Cast button press flow', async () => {
  const scenario = async () => {
    fireEvent.press(screen.getByTestId('cast-button'));
    // Wait for card display or loading state
    await screen.findByTestId('hero-art');
  };
  await measureRenders(<HomeScreen />, { wrapper: Wrapper, scenario });
});
```

### Anti-Patterns to Avoid
- **Silent catch with no classification:** Every catch block must either handle the error (recovery) or log with category. No new `catch {}` blocks. [CITED: CONTEXT.md D-02]
- **Logger that crashes on logger error:** The logger itself must never throw. Wrap its internals in try-catch or use only safe operations. [ASSUMED]
- **Clearing AsyncStorage keys without logging:** Always log before clearing so corruption is diagnosable in production. [CITED: CONTEXT.md D-05]
- **Running Reassure via `jest` directly:** Always run via `npx reassure` CLI command, which sets required Node.js flags for measurement stability. [VERIFIED: Reassure docs]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Performance regression testing | Custom render timing harness | Reassure 1.4.1 | Statistical analysis, outlier removal, branch comparison, CI integration, Danger.js PR comments — all provided out of the box |
| JSON safe parsing | Separate try-catch at every call site | `safeJsonParse<T>()` utility function | DRY; ensures consistent logging and key clearing behavior; single place to update if strategy changes |
| Structured logging | Full logging framework (winston, pino) | Custom `utils/logger.ts` (~50 lines) | Overkill for mobile app; no network transport needed; just wraps console with categories and severity |

**Key insight:** The printer subsystem already has a battle-tested error classification model. Replicating its approach for app-wide logging is not "hand-rolling" — it's following an established codebase convention.

## Runtime State Inventory

> Phase involves code-level error handling and secret removal, not rename/migration.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | AsyncStorage keys: `momir_settings`, `momir_card_history`, `momir_locale` | Code edit only — add try-catch with fallback defaults and key clearing |
| Live service config | EAS Dashboard: service account key credential (not in git) | Upload via EAS Dashboard; update eas.json to remove serviceAccountKeyPath |
| OS-registered state | None — verified | No action needed |
| Secrets/env vars | `google-play-service-account.json` (on disk, gitignored), `play/momir-basic-play-store-28cdc1226840.json` (on disk, gitignored) | Delete from disk; upload content to EAS Dashboard credentials; update eas.json |
| Build artifacts | No .aab files found on disk or in git history — verified by `find` and `git log` | Already gitignored; verification step only |

## Common Pitfalls

### Pitfall 1: AsyncStorage Clearing Creates Race Condition
**What goes wrong:** Calling `AsyncStorage.removeItem()` inside the catch of a `useQuery` queryFn can race with the `useMutation` that writes the same key. If the mutation fires after the corrupted key is cleared but before the defaults are returned, the new write might be lost.
**Why it happens:** TanStack Query's `queryFn` and `mutationFn` both access the same AsyncStorage keys. A clear during queryFn catch could be immediately overwritten by a pending mutation.
**How to avoid:** The `removeItem` call is intentionally fire-and-forget (`void AsyncStorage.removeItem(key)`). It runs asynchronously and does not block the return of defaults. Since the corrupted data is already invalid, any concurrent mutation would write fresh valid data — this is the desired outcome. No race condition exists because removing corrupted data is always safe, and a concurrent write replaces it with valid data.
**Warning signs:** Test that simulates corruption while a mutation is in flight fails intermittently.

### Pitfall 2: Logger Swallows Its Own Errors
**What goes wrong:** If the logger's `console.error` or `console.warn` calls themselves throw (unlikely but possible in edge cases with Hermes), the catch block that called the logger could itself crash, defeating the purpose of the safety net.
**Why it happens:** Circular error propagation — catch calls logger, logger throws, unhandled error.
**How to avoid:** The logger implementation must be defensive: wrap its internal console calls in try-catch, and never throw. If logging itself fails, silently continue. The logger's job is best-effort diagnostic output, not critical path logic.
**Warning signs:** App crashes inside a catch block that was supposed to handle the error gracefully.

### Pitfall 3: Jest Setup Suppresses Logger Output in Tests
**What goes wrong:** `jest.setup.js` globally replaces `console.warn` and `console.error` with `jest.fn()`, which means any logger calls in tests produce no visible output. This hides real issues during development and makes it impossible to verify that logger calls are actually happening.
**Why it happens:** The blanket suppression was added to reduce noise, but it silences all warnings/errors including the structured ones that should be visible.
**How to avoid:** Instead of globally suppressing `console.warn` and `console.error`, suppress only specific known noisy warnings. Or use `jest.spyOn(console, 'error').mockImplementation(() => {})` per-test for specific cases. For the logger itself, tests should use `jest.spyOn(logger, 'error')` or `jest.spyOn(logger, 'warn')` to verify calls, not rely on console output.
**Warning signs:** A test passes but you cannot verify that error logging actually occurred.

### Pitfall 4: EAS serviceAccountKeyPath Removal Breaks Submit
**What goes wrong:** Removing `serviceAccountKeyPath` from eas.json without first uploading the key to EAS Dashboard causes `eas submit` to fail with "No Google Service Account Key found" because the CLI has no credential to use.
**Why it happens:** The CLI checks for the key in three places: (1) interactive prompt, (2) `serviceAccountKeyPath` in eas.json, (3) EAS Dashboard credential store. Removing option 2 before populating option 3 leaves only option 1, which doesn't work in CI.
**How to avoid:** **Upload the key to EAS Dashboard FIRST** (Project -> Credentials -> Android -> Add a Google Service Account Key), then verify `eas submit` works without the local file, then remove `serviceAccountKeyPath` from eas.json, then delete local files. There is an open EAS CLI bug (#2910) where `serviceAccountKeyPath` file resolution fails even with correct paths — using Dashboard credentials avoids this bug entirely.
**Warning signs:** `eas submit` fails with "cannot find Google Cloud Service Account Key" after updating eas.json.

### Pitfall 5: Reassure Baseline Is Too Noisy
**What goes wrong:** The home screen cast flow involves network requests (Scryfall API), animations, and multiple re-renders. Without proper mocking, Reassure measurements have high variance (>10% random changes), making the baseline unreliable for regression detection.
**Why it happens:** Reassure measures real render times. Network latency, animation timing, and async state updates introduce non-determinism. The default 10 runs may not be enough for statistically significant results.
**How to avoid:** Mock the Scryfall API calls in the perf test (use `saveMutation` or mock `fetchRandomCard`). Increase `runs` to 20-30 for the cast flow. Use Reassure's `check-stability` command to verify CI machine stability before trusting results. Phase 1 starts non-blocking per D-09, so noisy results are acceptable initially — the baseline improves as mocks stabilize.
**Warning signs:** `reassure check-stability` reports >10% variance; same code produces different results on consecutive runs.

### Pitfall 6: JSON.parse on Route Params Already Protected
**What goes wrong:** D-04 says "wrap all JSON.parse calls on persisted data" — but card.tsx and print-preview.tsx already wrap their `JSON.parse(params.cardJson)` in try-catch. Double-wrapping is unnecessary.
**Why it happens:** Misreading the scope — route params are not "persisted data" (they come from navigation state, not AsyncStorage). The existing try-catch on route params is correct and sufficient.
**How to avoid:** Only wrap JSON.parse calls that read from AsyncStorage. Leave route param parsing as-is. The 5 unprotected calls are: SettingsProvider.tsx line 43 (queryFn), SettingsProvider.tsx line 125 (`getPrinterPreferencesFromSettings`), SettingsProvider.tsx line 131 (`savePrinterPreferencesToSettings`), HistoryProvider.tsx line 17 (queryFn), i18n/index.ts (the `getItem` call that doesn't parse but the `setItem` catch is empty).
**Warning signs:** Adding try-catch around route param JSON.parse that already has try-catch.

## Code Examples

Verified patterns from official sources and codebase:

### Safe JSON.parse Utility (New)
```typescript
// utils/safe-json-parse.ts
// Source: CONTEXT.md D-04, D-05
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger, ErrorCategory } from '@/utils/logger';

export function safeJsonParse<T>(
  json: string | null,
  fallback: T,
  storageKey: string,
): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    logger.error(
      ErrorCategory.Storage,
      `Corrupted data in AsyncStorage key "${storageKey}", clearing and using defaults`,
      error,
    );
    void AsyncStorage.removeItem(storageKey);
    return fallback;
  }
}
```

### SettingsProvider Integration (Modification)
```typescript
// providers/SettingsProvider.tsx (modified queryFn)
// Source: Current code at line 41-43, modified per D-04
import { safeJsonParse } from '@/utils/safe-json-parse';

const settingsQuery = useQuery({
  queryKey: ['appSettings'],
  queryFn: async () => {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    const parsed = safeJsonParse(stored, {}, SETTINGS_KEY);  // was: JSON.parse(stored)
    const merged: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      printer: { ...DEFAULT_PRINTER_PREFERENCES, ...(parsed.printer ?? {}) },
    };
    // ... legacy migration logic unchanged ...
    return merged;
  },
});
```

### EAS Submit Configuration (Modified)
```typescript
// eas.json — remove serviceAccountKeyPath, rely on EAS Dashboard credentials
// Source: [CITED: docs.expo.dev/submit/android] + [CITED: docs.expo.dev/submit/eas-json]
{
  "submit": {
    "production": {
      "android": {
        "track": "internal",
        "releaseStatus": "draft"
        // REMOVED: "serviceAccountKeyPath": "./google-play-service-account.json"
      },
      "ios": {}
    },
    "playstoreProduction": {
      "android": {
        "track": "production",
        "releaseStatus": "completed"
        // REMOVED: "serviceAccountKeyPath": "./google-play-service-account.json"
      }
    }
  }
}
```

### Reassure Baseline Test (New)
```typescript
// __reassure__/home-cast.perf-test.tsx
// Source: [CITED: callstack.github.io/reassure/docs/installation]
import { measureRenders } from 'reassure';
import { screen, fireEvent } from '@testing-library/react-native';
import HomeScreen from '@/app/(tabs)/(home)/index';

test('Home screen initial render', async () => {
  await measureRenders(<HomeScreen />, {
    wrapper: ProvidersWrapper,
  });
});

test('Cast button press renders loading state', async () => {
  const scenario = async () => {
    fireEvent.press(screen.getByTestId('cast-button'));
  };
  await measureRenders(<HomeScreen />, {
    wrapper: ProvidersWrapper,
    scenario,
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `serviceAccountKeyPath` in eas.json pointing to local file | EAS Dashboard credential upload | 2023+ (EAS CLI best practice) | No need for key file in repo or CI; avoids open EAS CLI bug #2910 |
| `console.log` with bracket prefixes (`[Scryfall]`) | Structured logger with severity + ErrorCategory | This phase | Filterable by category; no-op in production; replaces 25+ console.log calls |
| Empty catch blocks with no handling | Classified catch blocks with typed logging | Best practice | Diagnosable errors; no silent swallowing; existing PrinterAdapterError pattern |
| Manual performance testing | Reassure automated regression testing | 2022+ (Callstack) | Statistical measurement; CI comparison; branch diff; Danger.js PR comments |

**Deprecated/outdated:**
- `serviceAccountKeyPath` in eas.json: Official Expo docs recommend uploading via Dashboard instead. The path-based approach has a known bug (EAS CLI #2910) where the CLI cannot find the file even with correct paths. [CITED: docs.expo.dev/submit/android]
- `jest.setup.js` global `console.warn/error` suppression: Prevents observing real errors during tests. Should be replaced with per-test or per-module targeted suppression. [VERIFIED: codebase jest.setup.js]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | EAS Dashboard credential upload eliminates need for `serviceAccountKeyPath` entirely — the CLI retrieves stored credentials via `EXPO_TOKEN` | Secret Removal | Medium: If EAS Submit requires the key file for first-time setup, the workflow changes |
| A2 | The logger should be a no-op in production for `debug` and `info` levels, but still log `warn` and `error` | Logger Pattern | Low: If production logging is needed for diagnostics, the logger needs a transport (e.g., Sentry) |
| A3 | `__DEV__` global is available in React Native/Expo for the logger's environment detection | Logger Pattern | Low: `__DEV__` is a standard React Native global, always available |
| A4 | Reassure 1.4.1 is compatible with Jest 29.7.0 and jest-expo 54.0.0 | Reassure Setup | Medium: Reassure docs mention Jest compatibility but don't list specific version bounds |
| A5 | The printer.tsx empty catch blocks (lines 204, 240, 275, 280, 303) should be classified as `printer` category | Empty Catches | Low: These are in the printer settings screen; classification is contextually obvious |

## Open Questions

1. **EAS Submit without serviceAccountKeyPath — first-time setup**
   - What we know: EAS CLI can auto-detect a local service account JSON file on first run. After uploading to Dashboard, the file is no longer needed. But there's an open bug (#2910) with `serviceAccountKeyPath`.
   - What's unclear: Whether removing `serviceAccountKeyPath` from eas.json requires the key to already be uploaded to Dashboard, or if the CLI will prompt interactively.
   - Recommendation: Upload to Dashboard FIRST, then remove from eas.json, then test with `eas submit -p android --latest`.

2. **Reassure wrapper for provider tree**
   - What we know: The HomeScreen component requires SettingsProvider, HistoryProvider, NetworkProvider, I18nProvider, and QueryClientProvider to render properly.
   - What's unclear: Whether all providers need to be in the Reassure test wrapper or if a minimal mock wrapper is sufficient for stable measurements.
   - Recommendation: Start with full provider wrapper (matching _layout.tsx tree) for accuracy. If noise is too high, selectively mock heavy providers (NetworkProvider polling, I18nProvider async load).

3. **Console.log in scryfall.ts — 20 instances**
   - What we know: The scryfall service has 20 `console.log` calls with `[Scryfall]` prefixes. CONTEXT.md D-01 says replace all 29 `console.log` calls.
   - What's unclear: Whether some of these serve as intentional debug traces that should become `logger.debug` (off in production) vs `logger.info` (on in dev only).
   - Recommendation: Classify all scryfall console.log calls as `logger.debug` (off in production) since they are request/response traces, not user-facing information.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Package management | Yes | Latest | — |
| Jest | Test runner | Yes | 29.7.0 | — |
| jest-expo | Jest preset | Yes | 54.0.0 | — |
| @testing-library/react-native | Component testing | Yes | 13.3.3 | — |
| Reassure | Performance regression | No (not installed) | — | `bun add -D reassure@1.4.1` |
| EAS CLI | Submit configuration | Yes | >= 13.0.0 | — |
| Expo CLI | Build/submit | Yes | ~54.0.33 | — |

**Missing dependencies with no fallback:**
- Reassure: Must install before performance baseline can be established.

**Missing dependencies with fallback:**
- None — all other dependencies are already available.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 + jest-expo 54.0.0 |
| Config file | `jest.config.js` (root) |
| Quick run command | `bun run test -- --testPathPattern="utils/safe-json-parse" -u` |
| Full suite command | `bun run test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STAB-01 | JSON.parse with corrupted data returns defaults and clears key | unit | `bun run test -- --testPathPattern="safe-json-parse" -u` | No — Wave 0 |
| STAB-01 | SettingsProvider survives corrupted AsyncStorage | unit | `bun run test -- --testPathPattern="settings-provider" -u` | No — Wave 0 |
| STAB-01 | HistoryProvider survives corrupted AsyncStorage | unit | `bun run test -- --testPathPattern="history-provider" -u` | No — Wave 0 |
| STAB-02 | No service account key files in project directory | manual | `find . -name "*service-account*" -not -path "./node_modules/*"` | N/A |
| STAB-03 | No .aab files in git history | manual | `git log --all --diff-filter=A -- '*.aab'` | N/A |
| STAB-04 | Logger calls replace empty catches | unit | `bun run test -- --testPathPattern="logger" -u` | No — Wave 0 |
| DX-05 | Reassure baseline test passes | perf | `npx reassure --baseline` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `bun run test -- --testPathPattern="<affected-module>" -u`
- **Per wave merge:** `bun run test`
- **Phase gate:** Full suite green + `npx reassure check-stability`

### Wave 0 Gaps
- [ ] `__tests__/utils/safe-json-parse.test.ts` — covers STAB-01 (corrupted parse returns defaults, clears key)
- [ ] `__tests__/utils/logger.test.ts` — covers STAB-04 (logger calls with categories, no-op in production)
- [ ] `__tests__/providers/settings-provider.test.ts` — covers STAB-01 (provider survives corrupted data)
- [ ] `__tests__/providers/history-provider.test.ts` — covers STAB-01 (provider survives corrupted data)
- [ ] `__reassure__/home-cast.perf-test.tsx` — covers DX-05 (baseline render measurements)
- [ ] Reassure install: `bun add -D reassure@1.4.1` — dependency not yet installed
- [ ] `jest.setup.js` update: Remove global console.warn/error suppression, add targeted suppression only

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | App is serverless, no user accounts |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | No user roles |
| V5 Input Validation | Yes | Zod (already installed, for future Scryfall validation); safeJsonParse for storage boundary |
| V6 Cryptography | No | No custom crypto; AsyncStorage is platform-managed |
| V10 Malicious Code | Yes | Service account key removal prevents credential exposure |

### Known Threat Patterns for React Native / Expo

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Service account key in project directory | Information Disclosure | Delete from disk; upload to EAS Dashboard; remove serviceAccountKeyPath from eas.json |
| Corrupted AsyncStorage crash loop | Denial of Service | Try-catch with fallback defaults and key clearing (D-04, D-05) |
| Silent error swallowing | Repudiation | Structured logger with ErrorCategory replaces empty catches (D-02, D-03) |
| Build artifacts in git history | Information Disclosure | Already gitignored; verify no historical commits contain .aab files |

## Sources

### Primary (HIGH confidence)
- Codebase: `providers/SettingsProvider.tsx` — JSON.parse at lines 43, 125, 131 without try-catch [VERIFIED: Read tool]
- Codebase: `providers/HistoryProvider.tsx` — JSON.parse at line 17 without try-catch [VERIFIED: Read tool]
- Codebase: `i18n/index.ts` — Empty `.catch(() => {})` at line 126 [VERIFIED: Read tool]
- Codebase: `services/printer/adapters/port.ts` — PrinterErrorCode enum and PrinterAdapterError class (gold standard pattern) [VERIFIED: Read tool]
- Codebase: `services/printer/diagnostics/logger.ts` — PrinterSessionLogger with structured event taxonomy [VERIFIED: Read tool]
- Codebase: `eas.json` — `serviceAccountKeyPath` at lines 33, 44 [VERIFIED: Read tool]
- Codebase: `.gitignore` — Service account keys and `*.aab` already gitignored [VERIFIED: Read tool]
- npm registry: `reassure@1.4.1` — latest stable version [VERIFIED: npm view]
- [Expo Docs: Submit to Google Play Store](https://docs.expo.dev/submit/android/) — Dashboard credential upload approach [CITED: official docs]
- [Reassure Installation Docs](https://callstack.github.io/reassure/docs/installation) — Setup, .perf-test.tsx convention, CI integration [CITED: official docs]

### Secondary (MEDIUM confidence)
- [EAS CLI Issue #2910](https://github.com/expo/eas-cli/issues/2910) — `serviceAccountKeyPath` file resolution bug [CITED: GitHub issue]
- [EAS CLI Issue #428](https://github.com/expo/eas-cli/issues/428) — Base64 env var approach for CI [CITED: GitHub issue, closed by maintainer]
- [StackOverflow: Where to Store Service Account Key](https://stackoverflow.com/questions/72165336/expo-eas-submit-where-to-store-service-account-key) — Dashboard upload recommendation [CITED: community consensus]

### Tertiary (LOW confidence)
- [EAS CLI autodetection PR #520](https://github.com/expo/eas-cli/pull/520) — Auto-detect service account JSON (merged 2021, but may be broken per #2910) [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against npm registry and codebase package.json
- Architecture: HIGH — patterns derived from existing codebase (PrinterErrorCode) and verified Reassure docs
- Pitfalls: HIGH — based on codebase analysis and official issue tracker
- Security: MEDIUM — EAS Dashboard approach is well-documented but first-time setup behavior unclear

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (30 days — stable stack, no fast-moving dependencies)
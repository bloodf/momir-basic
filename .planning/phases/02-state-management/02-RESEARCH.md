# Phase 2: State Management - Research

**Researched:** 2026-04-13
**Domain:** Zustand stores, MMKV persistence, NetInfo connectivity, React Native state architecture
**Confidence:** HIGH

## Summary

Phase 2 migrates the app's global state from four React Context providers (SettingsProvider, HistoryProvider, NetworkProvider, I18nProvider) to four domain-aligned Zustand stores with MMKV persistence, replaces Scryfall health-polling with OS-level network detection via @react-native-community/netinfo, flattens the provider tree from 7 levels to 4 or fewer, consolidates duplicated card type query logic into a single CARD_TYPE_QUERIES map, and replaces 5 module-scope Dimensions.get calls with the useWindowDimensions hook.

The migration surface is well-bounded: 12 consumer files import from the current providers/i18n. Each provider maps 1:1 to a Zustand store, preserving the same state shape and API. MMKV v4 uses the new `createMMKV()` factory (not `new MMKV()`) and requires `react-native-nitro-modules` as a peer dependency. Zustand's `persist` middleware with `createJSONStorage` integrates directly with a custom MMKV StateStorage adapter. Because MMKV is synchronous, there is no flash-of-empty-state problem -- stores hydrate instantly on creation. @react-native-community/netinfo v12 provides OS-level connectivity events plus configurable reachability checks, replacing the 15-second Scryfall health poll entirely.

**Primary recommendation:** Use Zustand persist middleware with a manual MMKV StateStorage adapter (not the `zustand-mmkv-storage` npm package). This gives full control over the adapter, avoids an extra dependency with low adoption, and keeps the implementation aligned with the existing codebase convention of minimal dependencies.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use domain-aligned Zustand stores -- one store per current provider: `useSettingsStore`, `useHistoryStore`, `useNetworkStore`, `useI18nStore`. Each store has its own MMKV persistence slice.
- **D-02:** Migrate I18nProvider to a full Zustand store (`useI18nStore`). Locale and scryfallLang are simple state. The `t` translations object is a derived getter from the current locale.
- **D-03:** Use @react-native-community/netinfo for OS-level connectivity detection combined with a lightweight reachability check. NetInfo handles instant connectivity transitions; Scryfall health check confirms actual API reachability.
- **D-04:** Reachability check runs on a periodic interval with a long cadence (e.g., every 5 minutes) rather than on-transition only.
- **D-05:** Keep the online/offline toast notifications from the current NetworkProvider.
- **D-06:** Flatten to 3 mandatory providers + composeProviders utility: `QueryClientProvider`, `GestureHandlerRootView`, `SafeAreaProvider`. Zustand stores are imported directly at module level. Toast stays as a context since it's UI behavior, not data state.
- **D-07:** Create a `composeProviders` utility that wraps the remaining providers in a single component for clean layout code.
- **D-08:** Fresh start with MMKV -- no migration from AsyncStorage. Users will lose existing settings/history on upgrade.
- **D-09:** Keep the same key names as AsyncStorage (`momir_settings`, `momir_card_history`, `momir_locale`).
- **D-10:** The safeJsonParse pattern from Phase 1 should be adapted for MMKV reads. Parse with try-catch, return defaults and clear key on failure.

### Claude's Discretion
- Exact Zustand store API design (create vs createWithEqualityFn, persist middleware configuration)
- MMKV instance creation and initialization details
- composeProviders utility implementation approach
- CARD_TYPE_QUERIES map structure and exhaustiveness check mechanism
- NetInfo event subscription details and reachability check interval
- Which `Dimensions.get` call sites get `useWindowDimensions` vs inline replacement

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ARCH-01 | Replace SettingsProvider and HistoryProvider with Zustand stores | Zustand `create()` + `persist` middleware pattern documented; MMKV StateStorage adapter pattern verified; 1:1 state shape mapping from current providers |
| ARCH-02 | Replace AsyncStorage with react-native-mmkv for persistence | MMKV v4.3.1 verified with `createMMKV()` API; synchronous reads eliminate flash-of-empty-state; requires react-native-nitro-modules peer dep |
| ARCH-03 | Migrate NetworkProvider from Scryfall health polling to @react-native-community/netinfo | NetInfo v12.0.1 provides OS-level events + configurable reachability; reachabilityUrl can point to Scryfall health endpoint; 5-minute interval per D-04 |
| ARCH-04 | Replace I18nProvider context with Zustand store | useI18nStore pattern documented; `t` derived via `useMemo`-like getter inside store; locale persistence via MMKV |
| ARCH-05 | Flatten provider tree from 7 levels to 4 or fewer | composeProviders utility reduces to 3 providers (QueryClient, GestureHandler, SafeArea) + Toast context; Zustand stores need no providers |
| ARCH-06 | Consolidate card type query logic into single CARD_TYPE_QUERIES map | Two switch statements in scryfall.ts (buildQuery + getTypeQueryFragment) map to same CardType union; CARD_TYPE_QUERIES map with exhaustiveness check eliminates duplication |
| ARCH-07 | Replace module-scope Dimensions.get('window') with useWindowDimensions hook | 5 call sites identified; all use dimensions for layout constants; useWindowDimensions provides reactive updates on rotation/resize |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.12 | Global state management | Already installed in package.json; industry standard for RN; minimal boilerplate; middleware ecosystem [VERIFIED: npm registry] |
| react-native-mmkv | 4.3.1 | Synchronous key-value persistence | 30-100x faster than AsyncStorage; sync reads; JSI-native; encryption support; Expo-compatible with dev client [VERIFIED: npm registry, published 2026-04-07] |
| @react-native-community/netinfo | 12.0.1 | OS-level network connectivity detection | Official community library; New Architecture support (v11.5.0+); configurable reachability; Expo installable [VERIFIED: npm registry, published 2026-02-14] |
| react-native-nitro-modules | 0.35.4 | Required peer dep for MMKV v4 | MMKV v4 uses NitroModules instead of custom JSI bindings [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | 5.83.0 (installed) | Server/async state management | Stays for Scryfall API calls; not replaced by Zustand -- Zustand handles local state only |
| react-native-safe-area-context | (installed) | Safe area insets provider | Stays as mandatory provider in flattened tree |
| react-native-gesture-handler | 2.28.0 (installed) | Gesture system provider | Stays as mandatory provider in flattened tree |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual MMKV StateStorage adapter | zustand-mmkv-storage (1.0.0) | Adapter package is new (Dec 2025), ~120 weekly downloads, adds dependency for ~20 lines of code we can write ourselves. Manual adapter gives full control and follows codebase convention of minimal dependencies. |
| zustand create() | createWithEqualityFn | createWithEqualityFn requires use-sync-external-store shim. Standard `create()` with `useShallow` from `zustand/react/shallow` handles re-render optimization without the shim. |
| NetInfo only (no reachability) | NetInfo + periodic Scryfall health check | D-03 locks both: NetInfo for instant OS detection, reachability for API-specific verification (catches captive portals). Must implement both. |

**Installation:**
```bash
# Install new dependencies
npx expo install @react-native-community/netinfo
npx expo install react-native-mmkv react-native-nitro-modules

# Add MMKV plugin to app.json (required for Expo)
# See Architecture Patterns for app.json changes

# Rebuild dev client (MMKV requires native code, not in Expo Go)
npx expo prebuild --clean
npx expo run:android   # or npx expo run:ios
```

**Version verification:**
- `zustand`: 5.0.12 (verified via `npm view zustand version`, published 2026) [VERIFIED: npm registry]
- `react-native-mmkv`: 4.3.1 (verified via `npm view react-native-mmkv version`, published 2026-04-07) [VERIFIED: npm registry]
- `@react-native-community/netinfo`: 12.0.1 (verified via `npm view @react-native-community/netinfo version`, published 2026-02-14) [VERIFIED: npm registry]
- `react-native-nitro-modules`: 0.35.4 (verified via `npm view react-native-nitro-modules version`) [VERIFIED: npm registry]

## Architecture Patterns

### Recommended Project Structure
```
stores/
  settingsStore.ts       # NEW: useSettingsStore (replaces SettingsProvider)
  historyStore.ts        # NEW: useHistoryStore (replaces HistoryProvider)
  networkStore.ts        # NEW: useNetworkStore (replaces NetworkProvider)
  i18nStore.ts           # NEW: useI18nStore (replaces I18nProvider)
  mmkv-storage.ts        # NEW: MMKV StateStorage adapter for Zustand persist
utils/
  composeProviders.tsx   # NEW: Provider composition utility
  safe-json-parse.ts     # EXISTING: Adapt for MMKV reads
constants/
  cardTypes.ts           # MODIFY: Add CARD_TYPE_QUERIES map
app/
  _layout.tsx            # MODIFY: Flatten provider tree
i18n/
  index.ts               # MODIFY: Remove provider, keep exports
providers/
  SettingsProvider.tsx   # DELETE: Replaced by stores/settingsStore.ts
  HistoryProvider.tsx     # DELETE: Replaced by stores/historyStore.ts
  NetworkProvider.tsx     # DELETE: Replaced by stores/networkStore.ts
```

### Pattern 1: MMKV StateStorage Adapter for Zustand Persist
**What:** A manual adapter that wraps MMKV's synchronous API into Zustand's `StateStorage` interface.
**When to use:** Every Zustand store that needs persistence (all four stores in this phase).
**Example:**
```typescript
// Source: [CITED: github.com/pmndrs/zustand/blob/main/docs/reference/integrations/persisting-store-data.md]
// stores/mmkv-storage.ts
import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

const storage = createMMKV({
  id: 'momir-storage',
});

export const MMKVStorage: StateStorage = {
  getItem: (name: string): string | null => {
    const value = storage.getString(name);
    return value ?? null; // Zustand expects null, not undefined
  },
  setItem: (name: string, value: string): void => {
    storage.set(name, value);
  },
  removeItem: (name: string): void => {
    storage.remove(name); // v4 uses .remove() not .delete()
  },
};

export { storage };
```

### Pattern 2: Domain-Aligned Zustand Store with Persist
**What:** Each current provider becomes a Zustand store using `create()()` with `persist` middleware.
**When to use:** All four stores (settings, history, network, i18n).
**Example:**
```typescript
// Source: [CITED: zustand docs pmnd.rs] + [VERIFIED: npm registry zustand 5.0.12 API]
// stores/settingsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKVStorage } from './mmkv-storage';
import { AppSettings, DEFAULT_PRINTER_PREFERENCES } from '@/types';

const SETTINGS_KEY = 'momir_settings';
const DEFAULT_SETTINGS: AppSettings = {
  printer: DEFAULT_PRINTER_PREFERENCES,
  excludeDigitalOnly: true,
  excludeFunnySets: true,
  uniqueCardsOnly: false,
  printerConnected: false,
  devMode: false,
};

interface SettingsState {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  updatePrinter: (partial: Partial<PrinterPreferences>) => void;
  isLoading: boolean;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      isLoading: false,
      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),
      updatePrinter: (partial) =>
        set((state) => ({
          settings: {
            ...state.settings,
            printer: { ...state.settings.printer, ...partial },
          },
        })),
    }),
    {
      name: SETTINGS_KEY,
      storage: createJSONStorage(() => MMKVStorage),
      // MMKV is synchronous -- no flash of empty state, no skipHydration needed
    },
  ),
);
```

### Pattern 3: NetInfo + Periodic Reachability Store
**What:** Replaces Scryfall health polling with OS-level NetInfo events plus a lightweight periodic reachability check.
**When to use:** Network connectivity detection (useNetworkStore).
**Example:**
```typescript
// Source: [CITED: docs.expo.dev/versions/v54.0.0/sdk/netinfo] + [CITED: github.com/react-native-netinfo/react-native-netinfo]
// stores/networkStore.ts
import { create } from 'zustand';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { showToast } from '@/components/Toast';

interface NetworkState {
  isOnline: boolean;
  isReachable: boolean; // API-specific reachability
  checkNow: () => void;
}

let unsubscribe: (() => void) | null = null;
let reachabilityInterval: ReturnType<typeof setInterval> | null = null;

// Cold-start suppression: ignore first N offline events
let offlineEventCount = 0;
let hasShownOfflineToast = false;
let wasOffline = false;
const COLD_START_SUPPRESSION_COUNT = 4;

export const useNetworkStore = create<NetworkState>(() => ({
  isOnline: true,
  isReachable: true,
  checkNow: () => {
    void NetInfo.fetch();
  },
}));

// Subscribe to OS-level connectivity changes
unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
  const online = state.isConnected === true && state.isInternetReachable !== false;
  const currentOnline = useNetworkStore.getState().isOnline;

  if (online !== currentOnline) {
    offlineEventCount += 1;

    // Suppress cold-start false offline
    if (!online && offlineEventCount <= COLD_START_SUPPRESSION_COUNT) {
      useNetworkStore.setState({ isOnline: true });
      return;
    }

    useNetworkStore.setState({ isOnline: online });

    // Toast side-effects (D-05)
    if (!online && !hasShownOfflineToast) {
      hasShownOfflineToast = true;
      wasOffline = true;
      showToast({ type: 'warning', title: 'You are offline', message: 'Some features may not be available', duration: 6000 });
    }
    if (online && wasOffline) {
      wasOffline = false;
      hasShownOfflineToast = false;
      showToast({ type: 'success', title: 'Back online', message: 'Connection restored', duration: 3000 });
    }
  }
});

// Periodic reachability check (D-04: every 5 minutes)
reachabilityInterval = setInterval(async () => {
  try {
    const response = await fetch('https://api.scryfall.com/health', { method: 'HEAD' });
    const reachable = response.status > 0;
    useNetworkStore.setState({ isReachable: reachable });
  } catch {
    useNetworkStore.setState({ isReachable: false });
  }
}, 5 * 60 * 1000);
```

### Pattern 4: composeProviders Utility
**What:** A reduce-based utility that wraps multiple providers into a single component.
**When to use:** Root layout composition (D-07).
**Example:**
```typescript
// Source: Standard React pattern
// utils/composeProviders.tsx
import React from 'react';

export function composeProviders(
  providers: React.ComponentType<{ children: React.ReactNode }>[],
): React.ComponentType<{ children: React.ReactNode }> {
  return function ComposedProviders({ children }) {
    return providers.reduceRight(
      (acc, Provider) => <Provider>{acc}</Provider>,
      children,
    );
  };
}
```

### Pattern 5: CARD_TYPE_QUERIES Map with Exhaustiveness Check
**What:** A single Record<CardType, CardTypeQuery> map that replaces both `buildQuery` and `getTypeQueryFragment` switch statements.
**When to use:** Scryfall query construction for random card fetch and background art.
**Example:**
```typescript
// Source: Replaces services/scryfall.ts lines 125-165
// constants/cardTypes.ts (addition)
import { CardType } from '@/types';

interface CardTypeQuery {
  /** Scryfall type: query fragment (e.g., "t:creature") */
  typeFragment: string;
  /** Full query builder: (cmc, excludeFunny) => Scryfall query string */
  buildQuery: (cmc: number, excludeFunny: boolean) => string;
  /** Whether this card type uses CMC filtering */
  useCmc: boolean;
}

export const CARD_TYPE_QUERIES: Record<CardType, CardTypeQuery> = {
  creature: {
    typeFragment: 't:creature',
    buildQuery: (cmc, ef) => `t:creature mv=${cmc} ${ef ? 'game:paper -st:funny -st:memorabilia -st:alchemy' : 'game:paper'}`,
    useCmc: true,
  },
  commander: {
    typeFragment: 't:creature t:legendary',
    buildQuery: (cmc, ef) => `t:creature t:legendary is:commander mv=${cmc} ${ef ? 'game:paper -st:funny -st:memorabilia -st:alchemy' : 'game:paper'}`,
    useCmc: true,
  },
  // ... all CardType entries
  lands: {
    typeFragment: 't:land -t:basic',
    buildQuery: (_cmc, ef) => `t:land -t:basic ${ef ? 'game:paper -st:funny -st:memorabilia -st:alchemy' : 'game:paper'}`,
    useCmc: false,
  },
};

// Exhaustiveness check: TypeScript errors if any CardType is missing
function _exhaustiveCheck(queries: Record<CardType, CardTypeQuery>): void {}
_exhaustiveCheck(CARD_TYPE_QUERIES);
```

### Pattern 6: useWindowDimensions Replacement
**What:** Replace module-scope `Dimensions.get('window')` with the `useWindowDimensions` hook inside component bodies.
**When to use:** All 5 call sites that use Dimensions at module scope for layout calculations.
**Example:**
```typescript
// Before (stale on rotation, wrong on foldables):
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.48;

// After (reactive to rotation and resize):
import { useWindowDimensions } from 'react-native';

function CardScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const heroHeight = screenHeight * 0.48;
  // ...
}
```

### Anti-Patterns to Avoid
- **Using `new MMKV()` for MMKV v4:** V4 uses `createMMKV()` factory function. `new MMKV()` is the v3 API and will fail. [VERIFIED: react-native-mmkv v4 migration guide]
- **Returning `undefined` from StateStorage.getItem:** Zustand expects `null` for missing values, not `undefined`. MMKV's `getString()` returns `undefined` for missing keys -- must map to `null`. [CITED: github.com/pmndrs/zustand discussions #2196]
- **Using `.delete()` on MMKV v4:** The method is now `.remove()`. `.delete()` is a C++ reserved keyword and was renamed. [VERIFIED: react-native-mmkv v4 migration guide]
- **Wrapping Zustand stores in React Context providers:** Zustand stores are module-level singletons. They do not need providers. Wrapping them in context defeats the purpose of the migration. [CITED: zustand docs]
- **Keeping AsyncStorage as a zombie dependency:** After migration, remove `@react-native-async-storage/async-storage` from dependencies. Keeping it creates confusion about which storage is active. [ASSUMED]
- **Forgetting to add react-native-mmkv to app.json plugins:** Expo requires the plugin declaration for native module auto-linking. [VERIFIED: react-native-mmkv Expo installation docs]
- **Using NetInfo.fetch() as the primary detection method:** `fetch()` is one-shot; `NetInfo.addEventListener()` provides real-time OS-level events. Use addEventListener as primary, fetch for manual check. [CITED: github.com/react-native-netinfo]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MMKV-Zustand persistence adapter | Custom persistence layer | Zustand `persist` middleware + `createJSONStorage` | persist handles serialization, hydration, versioning, partialize, migration -- all out of the box |
| Network connectivity detection | Manual fetch polling | @react-native-community/netinfo | OS-level events are instant; no network overhead for detection; handles captive portals with reachability config |
| Provider composition | Nested JSX providers | composeProviders utility | Standard React reduceRight pattern; eliminates nesting; one-liner in _layout.tsx |
| Scryfall query building per card type | Switch statements | CARD_TYPE_QUERIES Record<CardType, CardTypeQuery> | Single source of truth; TypeScript exhaustiveness check prevents missing types; eliminates 2 switch statements |
| State re-render optimization | Manual useMemo/useCallback wrappers | Zustand selectors + useShallow | Zustand's selector model prevents re-renders by default; useShallow for object/array selectors |

**Key insight:** The current codebase already uses the immutable update pattern (spread operators) that Zustand's `set()` function natively supports. No conceptual shift needed -- just move from `useState` + Context to `create()` + `set()`.

## Runtime State Inventory

> This is a migration phase (Context -> Zustand, AsyncStorage -> MMKV), so runtime state inventory is required.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | AsyncStorage keys: `momir_settings`, `momir_card_history`, `momir_locale` (3 keys) | Code edit: MMKV reads replace AsyncStorage reads. D-08: fresh start, no data migration. Users lose existing data on upgrade. |
| Live service config | None -- all config is in code (eas.json, app.json) | No action needed |
| OS-registered state | None -- verified | No action needed |
| Secrets/env vars | None -- AsyncStorage/MMKV holds user preferences, not secrets | No action needed |
| Build artifacts | `node_modules/@react-native-async-storage` will be removed after migration | Remove from package.json after MMKV migration is verified |

**Nothing found in category:** Live service config, OS-registered state, secrets -- verified. All provider state is in-memory + AsyncStorage, no external service config or OS registrations.

## Common Pitfalls

### Pitfall 1: MMKV v4 API vs v3 Confusion
**What goes wrong:** Using `new MMKV()` (v3 API) instead of `createMMKV()` (v4 API), or using `.delete()` instead of `.remove()`.
**Why it happens:** Most existing blog posts and Stack Overflow answers reference the v3 API. The v4 migration is recent (Oct 2025).
**How to avoid:** Always import from `react-native-mmkv` using the v4 API: `import { createMMKV } from 'react-native-mmkv'`. Use `.remove()` for key deletion. [VERIFIED: react-native-mmkv v4 migration guide]
**Warning signs:** TypeScript errors on `new MMKV()`, or runtime crash "MMKV is not a constructor".

### Pitfall 2: Zustand getItem Returning undefined Instead of null
**What goes wrong:** MMKV's `getString()` returns `undefined` for missing keys, but Zustand's `StateStorage` interface expects `null`. If you return `undefined`, the persist middleware treats it as an existing value and tries to parse it, causing hydration failures.
**Why it happens:** JavaScript convention differs between the two libraries: MMKV uses `undefined` for "not found", Zustand uses `null`.
**How to avoid:** Always map `undefined` to `null` in the adapter: `return value ?? null`. [CITED: github.com/pmndrs/zustand discussions #2196]
**Warning signs:** Store shows default state instead of persisted state on app restart.

### Pitfall 3: NetInfo Cold-Start False Offline Events
**What goes wrong:** On app launch, NetInfo may report offline briefly before the OS connectivity state is determined. This triggers the offline toast immediately on every app start.
**Why it happens:** NetInfo's initial state may not be available synchronously. The first event fires before connectivity is fully determined.
**How to avoid:** Carry forward the cold-start suppression pattern from the current NetworkProvider (D-05, ignore first N offline events). Also configure NetInfo's `reachabilityShortTimeout` to avoid rapid false-offline bursts. [VERIFIED: Current NetworkProvider code uses checkCountRef with threshold of 4]
**Warning signs:** Users see "You are offline" toast on every app start despite being connected.

### Pitfall 4: Missing react-native-nitro-modules Peer Dependency
**What goes wrong:** MMKV v4 fails to install or crashes at runtime with "NitroModules not found" because `react-native-nitro-modules` is a required peer dependency that is not auto-installed.
**Why it happens:** MMKV v4 was rewritten on NitroModules (replacing custom JSI bindings). The peer dependency must be explicitly installed.
**How to avoid:** Install both together: `npx expo install react-native-mmkv react-native-nitro-modules`. Verify both are in package.json. [VERIFIED: react-native-mmkv v4 installation docs]
**Warning signs:** Build fails with "NitroModules" error, or runtime crash on MMKV access.

### Pitfall 5: Toast Provider Still Needs Context
**What goes wrong:** Trying to move toast state into a Zustand store, but `showToast` is called from inside NetInfo event listeners and store subscriptions that run outside React component tree.
**Why it happens:** Toast involves React Native's Animated API and UI rendering -- it needs a mounted component to function. D-06 explicitly keeps Toast as a context provider.
**How to avoid:** Keep `ToastProvider` as a context in the provider tree. `showToast` can be called from anywhere (inside or outside components) because it uses a module-level queue that the context consumer drains. [VERIFIED: Current Toast component code]
**Warning signs:** `showToast` calls in NetInfo listener throw "Cannot read property of null" or produce no visible toast.

### Pitfall 6: Dimensions.get Constants Used in StyleSheet.create
**What goes wrong:** Moving Dimensions values inside the component means they can no longer be used in `StyleSheet.create()` at module scope, because `useWindowDimensions` is a hook that only works inside component bodies.
**Why it happens:** The current code sets constants like `const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 8) / 2` at module scope and uses them in `StyleSheet.create()`. `useWindowDimensions` can't be called at module scope.
**How to avoid:** Move dimension-dependent styles from `StyleSheet.create()` to inline style objects within the component body, or compute them as `useMemo` values. The trade-off is slightly more computation per render, but layout correctness on rotation/foldables is worth it. [VERIFIED: React Native docs on useWindowDimensions]
**Warning signs:** Layout breaks when rotating the device, or on foldables when the screen size changes.

### Pitfall 7: Zustand persist with MMKV Does Not Need skipHydration
**What goes wrong:** Adding `skipHydration: true` to a store that uses synchronous MMKV storage, then adding a hydration gate in the UI. This adds unnecessary complexity because MMKV reads are instant.
**Why it happens:** Carrying patterns from AsyncStorage (async) where `skipHydration` is needed to prevent flash of empty state. With MMKV, hydration is synchronous -- the store has the correct state on first render.
**How to avoid:** Do NOT use `skipHydration` with MMKV-backed stores. The store is hydrated synchronously during `create()`. [VERIFIED: Zustand persist docs -- skipHydration is for async storage]
**Warning signs:** Unnecessary loading screens or hydration logic in the app.

### Pitfall 8: Legacy Printer Config Migration Must Survive
**What goes wrong:** The current SettingsProvider detects and migrates `LegacyPrinterConfig` format. If the Zustand store's persist middleware overwrites the persisted data on first load without running the migration, users with the old format lose their printer configuration.
**Why it happens:** Zustand persist's `merge` function defaults to shallow merge. The migration logic must be preserved in the store's initialization or in a persist `migrate` callback.
**How to avoid:** Use Zustand persist's `version` + `migrate` options, or run the legacy migration in a `onRehydrateStorage` callback before the state is committed. Alternatively, since D-08 says "fresh start," legacy migration is moot -- but document this decision clearly so users understand printer prefs reset on upgrade. [CITED: CONTEXT.md D-08]
**Warning signs:** Users report printer settings lost after upgrade.

## Code Examples

Verified patterns from official sources:

### MMKV StateStorage Adapter
```typescript
// Source: [CITED: zustand persist docs + react-native-mmkv v4 API]
import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

export const mmkvInstance = createMMKV({ id: 'momir-storage' });

export const MMKVStorage: StateStorage = {
  getItem: (name: string): string | null => {
    return mmkvInstance.getString(name) ?? null;
  },
  setItem: (name: string, value: string): void => {
    mmkvInstance.set(name, value);
  },
  removeItem: (name: string): void => {
    mmkvInstance.remove(name);
  },
};
```

### Zustand Store with Persist and MMKV
```typescript
// Source: [CITED: pmndrs/zustand persist docs]
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKVStorage } from './mmkv-storage';

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      cards: [] as Card[],
      addCard: (card: Card) => set((s) => ({ cards: [card, ...s.cards] })),
      addCards: (newCards: Card[]) => set((s) => ({ cards: [...newCards, ...s.cards] })),
      removeCard: (id: string) => set((s) => ({ cards: s.cards.filter((c) => c.id !== id) })),
      clearHistory: () => set({ cards: [] }),
    }),
    {
      name: 'momir_card_history',
      storage: createJSONStorage(() => MMKVStorage),
      // MMKV is sync -- no skipHydration needed
    },
  ),
);
```

### NetInfo Subscription with Cold-Start Suppression
```typescript
// Source: [CITED: github.com/react-native-netinfo + current NetworkProvider.tsx]
import NetInfo from '@react-native-community/netinfo';

let unsubscribe: (() => void) | null = null;

export function initNetworkListener() {
  let offlineCount = 0;
  let hasShownOfflineToast = false;
  let wasOffline = false;
  const SUPPRESSION_THRESHOLD = 4;

  unsubscribe = NetInfo.addEventListener((state) => {
    const online = state.isConnected === true && state.isInternetReachable !== false;
    const prevOnline = useNetworkStore.getState().isOnline;

    if (!online && !prevOnline) {
      offlineCount++;
    }

    if (online !== prevOnline) {
      if (!online && offlineCount <= SUPPRESSION_THRESHOLD) {
        // Suppress cold-start false offline
        return;
      }
      useNetworkStore.setState({ isOnline: online });

      // Toast side-effects per D-05
      if (!online && !hasShownOfflineToast) {
        hasShownOfflineToast = true;
        wasOffline = true;
        showToast({ type: 'warning', title: 'You are offline', message: 'Some features may not be available', duration: 6000 });
      }
      if (online && wasOffline) {
        wasOffline = false;
        hasShownOfflineToast = false;
        showToast({ type: 'success', title: 'Back online', message: 'Connection restored', duration: 3000 });
      }
    }
  });
}
```

### composeProviders Utility
```typescript
// Source: Standard React pattern
import React from 'react';

export function composeProviders(
  providers: React.ComponentType<{ children: React.ReactNode }>[],
): React.ComponentType<{ children: React.ReactNode }> {
  return function ComposedProviders({ children }) {
    return providers.reduceRight(
      (acc, Provider) => React.createElement(Provider, null, acc),
      children,
    );
  };
}
```

### Flattened _layout.tsx
```typescript
// Source: Current _layout.tsx (118 lines) modified per D-06, D-07
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '@/components/Toast';
import { composeProviders } from '@/utils/composeProviders';

// Zustand stores are imported at module level -- no providers needed
import '@/stores/networkStore'; // Initialize NetInfo listener

const queryClient = new QueryClient();

const AppProviders = composeProviders([
  QueryClientProvider,  // needs `client` prop -- see note below
  GestureHandlerRootView,
  SafeAreaProvider,
  ToastProvider,
]);

// Note: QueryClientProvider needs `client={queryClient}` prop.
// composeProviders needs a small adaptation for providers with required props,
// or wrap it: const QP = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
```

### useWindowDimensions Migration
```typescript
// Before (components/CardGridItem.tsx line 12):
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 8) / 2;

// After:
import { useWindowDimensions } from 'react-native';

function CardGridItem({ card }: CardGridItemProps) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = (screenWidth - 16 * 2 - 8) / 2;
  // Use cardWidth in inline styles instead of StyleSheet constant
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React Context for global state | Zustand stores | Zustand v5 (2024+) | No provider nesting needed; module-level stores; selectors prevent unnecessary re-renders |
| AsyncStorage for persistence | react-native-mmkv | MMKV v4 (2025+) | 30-100x faster; synchronous reads; JSI-native; built-in encryption |
| Scryfall health polling (4 req/min) | @react-native-community/netinfo OS events | NetInfo v12 (2026) | Zero network overhead for detection; instant events; configurable reachability for API-specific checks |
| `@nkzw/create-context-hook` provider pairs | Zustand `create()` stores | Zustand v5 (2024+) | Single import per store; no [Provider, useHook] pair; no JSX wrapper needed |
| `Dimensions.get('window')` at module scope | `useWindowDimensions` hook | React Native 0.63+ | Reactive to orientation changes, foldables, multi-window; no stale values |
| Nested provider tree (7 levels) | composeProviders + 3 providers | Standard React pattern | Flat tree; cleaner root layout; easier testing |

**Deprecated/outdated:**
- `new MMKV()`: Replaced by `createMMKV()` in react-native-mmkv v4 (Oct 2025). [VERIFIED: react-native-mmkv v4 migration guide]
- `.delete()` on MMKV: Replaced by `.remove()` in v4. [VERIFIED: react-native-mmkv v4 migration guide]
- `@react-native-async-storage/async-storage`: Officially deprecated by React Native team. MMKV is the recommended replacement. [CITED: React Native docs]
- `Dimensions.get('window')`: React Native docs recommend `useWindowDimensions` for responsive layouts. `Dimensions.get` values are stale on rotation. [CITED: React Native docs]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `zustand-mmkv-storage` npm package is not worth adopting -- manual adapter is ~20 lines of code, the package has low adoption (~120 weekly downloads) | Standard Stack | Low: If the package gains traction or adds critical features, we could adopt it later with minimal migration |
| A2 | MMKV synchronous reads mean `skipHydration` is unnecessary -- stores are hydrated during `create()` | Architecture Patterns | Low: If there is any initialization delay in MMKV on some platforms, skipHydration may be needed as a safety net |
| A3 | `@nkzw/create-context-hook` can be removed from dependencies after migration -- no other code uses it | Standard Stack | Medium: Need to verify no other library or generated code depends on it |
| A4 | NetInfo's `useNativeReachability` default (true) works with Scryfall's health endpoint as reachabilityUrl | Architecture Patterns | Low: Scryfall returns 200 on /health, not 204; need to configure `reachabilityTest: (response) => response.status === 200` |
| A5 | The PrinterAutoConnect component can stay in _layout.tsx using `useSettingsStore` directly instead of `useSettings` | Architecture Patterns | Low: Straightforward rename; no functional change |
| A6 | Removing `@react-native-async-storage/async-storage` after migration won't break expo-sqlite or other transitive dependencies | Runtime State Inventory | Medium: Need to check if any installed package depends on AsyncStorage transitively |

## Open Questions

1. **NetInfo reachability configuration for Scryfall**
   - What we know: NetInfo defaults to `https://clients3.google.com/generate_204` for reachability with `reachabilityTest: response.status === 204`. Scryfall's `/health` endpoint returns 200.
   - What's unclear: Whether we should override the default reachability URL to Scryfall's health endpoint, or use the default Google endpoint and add a separate Scryfall-specific periodic check.
   - Recommendation: Use NetInfo defaults for OS reachability (Google's 204 endpoint) and add a separate periodic Scryfall health check. This keeps NetInfo's reachability fast (Google 204 is optimized for this) and adds Scryfall-specific verification per D-03/D-04.

2. **composeProviders with QueryClientProvider's required `client` prop**
   - What we know: `QueryClientProvider` requires `client={queryClient}` as a prop. The composeProviders utility wraps providers that only accept `children`.
   - What's unclear: Whether to adapt composeProviders to handle providers with extra props, or simply wrap QueryClientProvider in a thin component.
   - Recommendation: Create a thin wrapper component: `const AppQueryClientProvider = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>`. This is simpler than making composeProviders more complex.

3. **useFilteredHistory derived hook after Zustand migration**
   - What we know: `useFilteredHistory(search, typeFilter, cmcFilter)` is currently exported from HistoryProvider and used by HistorySheet and history screen. It reads `cards` from the provider and returns a memoized filtered list.
   - What's unclear: Whether to keep it as a standalone hook (reading from `useHistoryStore`) or move the filtering logic into the store as a derived getter.
   - Recommendation: Keep it as a standalone hook that uses `useHistoryStore` internally. Zustand's selector model already memoizes correctly. The hook signature stays the same for consumers.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Package management | Yes | 1.3.12 | -- |
| Node.js | Runtime | Yes | 24.7.0 | -- |
| Jest | Test runner | Yes | 29.7.0 | -- |
| jest-expo | Jest preset | Yes | 54.0.0 | -- |
| Expo SDK | Framework | Yes | ~54.0.33 | -- |
| New Architecture | Required for MMKV v4 | Yes | enabled in app.json | -- |
| expo-dev-client | Required for MMKV (not in Expo Go) | Yes | Installed | -- |
| zustand | State management | Yes (installed) | 5.0.2 (needs update to 5.0.12) | -- |
| react-native-mmkv | Persistence | No (not installed) | -- | `npx expo install react-native-mmkv react-native-nitro-modules` |
| @react-native-community/netinfo | Network detection | No (not installed) | -- | `npx expo install @react-native-community/netinfo` |
| react-native-nitro-modules | MMKV peer dep | No (not installed) | -- | Installed with MMKV |

**Missing dependencies with no fallback:**
- react-native-mmkv + react-native-nitro-modules: Must install before MMKV stores can be created
- @react-native-community/netinfo: Must install before network store can be implemented

**Missing dependencies with fallback:**
- None -- all other required tools are available

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 + jest-expo 54.0.0 |
| Config file | `jest.config.js` (root) |
| Quick run command | `bun run test -- --testPathPattern="<store-name>" -u` |
| Full suite command | `bun run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARCH-01 | SettingsStore persists and loads settings | unit | `bun run test -- --testPathPattern="settingsStore" -u` | No -- Wave 0 |
| ARCH-01 | HistoryStore CRUD operations work | unit | `bun run test -- --testPathPattern="historyStore" -u` | No -- Wave 0 |
| ARCH-02 | MMKV adapter reads/writes/clears correctly | unit | `bun run test -- --testPathPattern="mmkv-storage" -u` | No -- Wave 0 |
| ARCH-02 | Corrupted MMKV data returns defaults and clears key | unit | `bun run test -- --testPathPattern="mmkv-storage" -u` | No -- Wave 0 |
| ARCH-03 | NetInfo events update store state | unit | `bun run test -- --testPathPattern="networkStore" -u` | No -- Wave 0 |
| ARCH-03 | Cold-start suppression works | unit | `bun run test -- --testPathPattern="networkStore" -u` | No -- Wave 0 |
| ARCH-04 | I18nStore locale switch updates t and scryfallLang | unit | `bun run test -- --testPathPattern="i18nStore" -u` | No -- Wave 0 |
| ARCH-05 | Provider tree depth is 4 or fewer | integration | Manual inspection of _layout.tsx | N/A |
| ARCH-06 | CARD_TYPE_QUERIES covers all CardType values | unit | `bun run test -- --testPathPattern="cardTypes" -u` | No -- Wave 0 |
| ARCH-07 | useWindowDimensions replaces Dimensions.get | manual | `grep -r "Dimensions.get" app/ components/` | N/A |

### Sampling Rate
- **Per task commit:** `bun run test -- --testPathPattern="<affected-store>" -u`
- **Per wave merge:** `bun run test`
- **Phase gate:** Full suite green + no Dimensions.get in source + provider count verification

### Wave 0 Gaps
- [ ] `__tests__/stores/mmkv-storage.test.ts` -- covers ARCH-02 (adapter: getItem, setItem, removeItem, null mapping, corrupted data)
- [ ] `__tests__/stores/settingsStore.test.ts` -- covers ARCH-01 (settings load/save/update/printer prefs)
- [ ] `__tests__/stores/historyStore.test.ts` -- covers ARCH-01 (addCard, addCards, removeCard, clearHistory, persistence)
- [ ] `__tests__/stores/networkStore.test.ts` -- covers ARCH-03 (isOnline updates, cold-start suppression, toast side-effects)
- [ ] `__tests__/stores/i18nStore.test.ts` -- covers ARCH-04 (locale switch, t derivation, scryfallLang mapping)
- [ ] `__tests__/constants/cardTypes.test.ts` -- covers ARCH-06 (CARD_TYPE_QUERIES exhaustiveness, query generation)
- [ ] MMKV mock: `__mocks__/react-native-mmkv.js` -- needed for Jest tests
- [ ] NetInfo mock: `__mocks__/@react-native-community/netinfo.js` -- needed for Jest tests
- [ ] Update `jest.config.js` moduleNameMapper: Add entries for react-native-mmkv and @react-native-community/netinfo mocks
- [ ] Update `jest.config.js` transformIgnorePatterns: Add `react-native-mmkv` and `@react-native-community/netinfo`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | App is serverless, no user accounts |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | No user roles |
| V5 Input Validation | Yes | safeJsonParse pattern from Phase 1 adapted for MMKV; CARD_TYPE_QUERIES exhaustiveness check validates all CardType values |
| V6 Cryptography | No | No custom crypto; MMKV encryption available but not required for this app's data |
| V10 Malicious Code | No | No new untrusted code execution paths |

### Known Threat Patterns for React Native / Zustand / MMKV

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Corrupted MMKV data crash loop | Denial of Service | safeJsonParse pattern: try-catch on read, return defaults, clear corrupted key (D-10) |
| MMKV data accessible by other apps (Android) | Information Disclosure | MMKV uses app-private storage by default; no additional mitigation needed |
| Zustand store state leaked via React DevTools | Information Disclosure | Only in development builds; production builds do not expose store state to DevTools by default |

## Sources

### Primary (HIGH confidence)
- npm registry: `zustand@5.0.12`, `react-native-mmkv@4.3.1`, `@react-native-community/netinfo@12.0.1`, `react-native-nitro-modules@0.35.4` [VERIFIED: npm view]
- [Zustand Persist Docs](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data) -- createJSONStorage API, StateStorage interface, skipHydration [CITED: official docs]
- [Zustand subscribeWithSelector Docs](https://zustand.docs.pmnd.rs/reference/middlewares/subscribe-with-selector) -- selector-based subscriptions [CITED: official docs]
- [react-native-mmkv v4 Migration Guide](https://deepwiki.com/mrousavy/react-native-mmkv/8-v4-migration-guide) -- createMMKV, .remove(), NitroModules peer dep [CITED: official migration guide]
- [react-native-mmkv GitHub](https://github.com/mrousavy/react-native-mmkv/) -- installation, Expo plugin, v4 API [CITED: official repo]
- [NetInfo GitHub](https://github.com/react-native-netinfo/react-native-netinfo/) -- addEventListener, configure, reachability options [CITED: official repo]
- [Expo NetInfo Docs](https://docs.expo.dev/versions/v54.0.0/sdk/netinfo) -- Expo installation, supported platforms [CITED: official docs]
- Codebase: Current providers (SettingsProvider, HistoryProvider, NetworkProvider, I18nProvider) [VERIFIED: Read tool]

### Secondary (MEDIUM confidence)
- [Zustand Discussion #2196](https://github.com/pmndrs/zustand/discussions/2196) -- custom storage for React Native, null vs undefined [CITED: GitHub discussion]
- [Zustand Discussion #1795](https://github.com/pmndrs/zustand/discussions/1795) -- persist undefined in React Native, skipHydration pattern [CITED: GitHub discussion]
- [zustand-mmkv-storage on DEV Community](https://dev.to/mehdifaraji/zustand-mmkv-storage-blazing-fast-persistence-for-zustand-in-react-native-3ef1) -- adapter library overview, manual adapter pattern [CITED: community article]

### Tertiary (LOW confidence)
- [zustand-mmkv-storage npm](https://registry.npmjs.org/zustand-mmkv-storage) -- v1.0.0, ~120 weekly downloads [CITED: npm registry, flagged for low adoption]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all package versions verified against npm registry; official docs consulted for all 3 core libraries
- Architecture: HIGH -- patterns derived from official Zustand/MMKV/NetInfo docs; 1:1 mapping from current providers
- Pitfalls: HIGH -- based on official migration guides, GitHub issues, and current codebase analysis
- NetInfo integration: MEDIUM -- reachability configuration with Scryfall endpoint needs testing; cold-start suppression pattern carried from current code

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (30 days -- stable stack, no fast-moving dependencies)
# Phase 2: State Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 02-state-management
**Areas discussed:** Zustand store design, Network detection approach, Provider tree flattening, MMKV migration strategy

---

## Zustand Store Design

| Option | Description | Selected |
|--------|-------------|----------|
| Domain-aligned stores | One store per current provider (settings, history, network, i18n). Each with its own MMKV persistence slice. | ✓ |
| Combined stores with slices | 1-2 stores with slices. Fewer imports but larger state bundle. | |
| Hybrid: stores + React Query | Minimal stores for cross-component state. History stays as React Query cache. | |

**User's choice:** Domain-aligned stores
**Notes:** Clean separation, easy to test independently, matches current mental model.

### I18n handling

| Option | Description | Selected |
|--------|-------------|----------|
| Full Zustand store | Migrate I18nProvider to useI18nStore. Locale/scryfallLang are state; `t` is derived getter. | ✓ |
| Keep as Context | Keep i18n as React Context since it provides computed translations. | |
| Split: locale in settings store | Move locale/scryfallLang to settings store, keep translation provider as context. | |

**User's choice:** Full Zustand store
**Notes:** All state goes to Zustand for consistency across the app.

---

## Network Detection Approach

| Option | Description | Selected |
|--------|-------------|----------|
| NetInfo with toasts | OS-level detection via @react-native-community/netinfo. Show toasts on transitions. | |
| NetInfo without toasts | Same but remove toast notifications entirely. Simpler, less noise. | |
| NetInfo + reachability | OS-level detection + lightweight reachability check. Catches captive portals. | ✓ |

**User's choice:** NetInfo + reachability
**Notes:** Handles captive portal case where wifi is connected but internet is blocked.

### Reachability trigger

| Option | Description | Selected |
|--------|-------------|----------|
| On-transition check | Ping Scryfall health only when NetInfo reports connectivity change. | |
| Periodic with long interval | NetInfo for instant detection; periodic Scryfall health (e.g., every 5 min) for API reachability. | ✓ |

**User's choice:** Periodic with long interval
**Notes:** Confirms API-specific reachability while avoiding the current 4 req/min polling.

---

## Provider Tree Flattening

| Option | Description | Selected |
|--------|-------------|----------|
| 3 providers + composeProviders | QueryClientProvider, GestureHandlerRootView, SafeAreaProvider. Zustand stores imported directly. Toast stays as context. | ✓ |
| Single AppProvider shell | One thin wrapper for all providers. Maximum flattening. | |
| Keep Zustand providers for init | Zustand stores have providers for MMKV sync initialization. 3 providers + ZustandInitializer. | |

**User's choice:** 3 providers + composeProviders
**Notes:** Zustand stores are imported at module level, no provider wrappers needed. Toast context is UI behavior, not data state.

---

## MMKV Migration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| One-time migration on launch | Read from AsyncStorage, write to MMKV, delete old keys. | |
| Fresh start (no migration) | Start with MMKV fresh. Users lose existing data on upgrade. | ✓ |
| Migrate with fallback to defaults | Try to migrate; fall back to defaults on failure. | |

**User's choice:** Fresh start (no migration)
**Notes:** Simplest implementation, no split-brain state risk, no backward compatibility shims.

### Key names

| Option | Description | Selected |
|--------|-------------|----------|
| Keep same key names | momir_settings, momir_card_history, momir_locale. Familiar for debugging. | ✓ |
| New key names with mmkv_ prefix | mmkv_settings, mmkv_card_history, mmkv_locale. Explicit about backend. | |

**User's choice:** Keep same key names
**Notes:** Consistent with existing patterns, familiar for debugging.

---

## Claude's Discretion

- Exact Zustand store API design (create vs createWithEqualityFn, persist middleware config)
- MMKV instance creation and initialization details
- composeProviders utility implementation approach
- CARD_TYPE_QUERIES map structure and exhaustiveness check mechanism
- NetInfo event subscription details and reachability check interval
- Which Dimensions.get call sites get useWindowDimensions vs inline replacement

## Deferred Ideas

None — discussion stayed within phase scope
# Phase 2: State Management - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate all global state from React Context providers to Zustand stores with MMKV persistence, replace Scryfall health polling with OS-level network detection, flatten the provider tree to ≤4 levels, consolidate card type query logic into a single map, and replace module-scope `Dimensions.get` with `useWindowDimensions`.

**Scope:**
- ARCH-01: Replace SettingsProvider and HistoryProvider with Zustand stores
- ARCH-02: Replace AsyncStorage with react-native-mmkv for persistence
- ARCH-03: Migrate NetworkProvider from Scryfall health polling to @react-native-community/netinfo
- ARCH-04: Replace I18nProvider context with Zustand store for locale state
- ARCH-05: Flatten provider tree from 7+ levels to 4 or fewer
- ARCH-06: Consolidate card type query logic into single CARD_TYPE_QUERIES map
- ARCH-07: Replace module-scope Dimensions.get('window') with useWindowDimensions hook

**NOT in scope:** Screen decomposition (Phase 3), Zod validation (Phase 4), testing infrastructure (Phase 5)

</domain>

<decisions>
## Implementation Decisions

### Zustand Store Design
- **D-01:** Use domain-aligned Zustand stores — one store per current provider: `useSettingsStore`, `useHistoryStore`, `useNetworkStore`, `useI18nStore`. Each store has its own MMKV persistence slice. Clean separation, easy to test independently, matches the current mental model.
- **D-02:** Migrate I18nProvider to a full Zustand store (`useI18nStore`). Locale and scryfallLang are simple state. The `t` translations object is a derived getter from the current locale. All state goes to Zustand for consistency.

### Network Detection Approach
- **D-03:** Use @react-native-community/netinfo for OS-level connectivity detection combined with a lightweight reachability check. NetInfo handles instant connectivity transitions; Scryfall health check confirms actual API reachability (catches captive portals where wifi is connected but internet is blocked).
- **D-04:** Reachability check runs on a periodic interval with a long cadence (e.g., every 5 minutes) rather than on-transition only. NetInfo handles instant detection; the periodic Scryfall health check confirms API-specific reachability.
- **D-05:** Keep the online/offline toast notifications from the current NetworkProvider. Users should see feedback when connectivity state changes.

### Provider Tree Flattening
- **D-06:** Flatten to 3 mandatory providers + composeProviders utility: `QueryClientProvider`, `GestureHandlerRootView`, `SafeAreaProvider`. Zustand stores are imported directly at module level (no provider wrappers needed). Toast stays as a context since it's UI behavior, not data state.
- **D-07:** Create a `composeProviders` utility that wraps the remaining providers in a single component for clean layout code.

### MMKV Migration Strategy
- **D-08:** Fresh start with MMKV — no migration from AsyncStorage. Users will lose existing settings/history on upgrade. Simplest implementation with no split-brain state risk.
- **D-09:** Keep the same key names as AsyncStorage (`momir_settings`, `momir_card_history`, `momir_locale`). Familiar for debugging, consistent with existing patterns.
- **D-10:** The safeJsonParse pattern from Phase 1 (auto-remove corrupted keys) should be adapted for MMKV reads. MMKV's synchronous API makes this simpler — parse with try-catch, return defaults and clear key on failure.

### Claude's Discretion
- Exact Zustand store API design (create vs createWithEqualityFn, persist middleware configuration)
- MMKV instance creation and initialization details
- composeProviders utility implementation approach
- CARD_TYPE_QUERIES map structure and exhaustiveness check mechanism
- NetInfo event subscription details and reachability check interval
- Which `Dimensions.get` call sites get `useWindowDimensions` vs inline replacement

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Codebase Map (current state)
- `.planning/codebase/ARCHITECTURE.md` — Provider tree structure, state management architecture, key architectural decisions
- `.planning/codebase/CONVENTIONS.md` — State management patterns, naming conventions, immutable update patterns
- `.planning/codebase/INTEGRATIONS.md` — AsyncStorage patterns, Scryfall API client, integration patterns

### Research (best practices)
- `.planning/phases/01-stability-security/01-RESEARCH.md` — Phase 1 research includes safety patterns for persistence

### Project Context
- `.planning/PROJECT.md` — Vision, constraints, key decisions (Zustand + MMKV already decided)
- `.planning/REQUIREMENTS.md` — ARCH-01 through ARCH-07 acceptance criteria
- `.planning/STATE.md` — Current progress and accumulated decisions

### Key Source Files (to be modified)
- `providers/SettingsProvider.tsx` (138 lines) — Current settings context, to become useSettingsStore
- `providers/HistoryProvider.tsx` (93 lines) — Current history context, to become useHistoryStore
- `providers/NetworkProvider.tsx` (113 lines) — Current network context with Scryfall polling, to become useNetworkStore
- `i18n/index.ts` (145 lines) — Current i18n provider, to become useI18nStore
- `app/_layout.tsx` (118 lines) — Provider tree composition root, to be flattened
- `constants/cardTypes.ts` — CARD_TYPES constant, to add CARD_TYPE_QUERIES map
- `app/card.tsx:58` — Module-scope Dimensions.get('window')
- `app/life-counter.tsx:38` — Module-scope Dimensions.get('window')
- `app/print-preview.tsx:33` — Module-scope Dimensions.get('window')
- `components/CardGridItem.tsx:12` — Module-scope Dimensions.get('window')
- `components/HistorySheet.tsx:25` — Module-scope Dimensions.get('window')

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `utils/safeJsonParse.ts` (from Phase 1): JSON parse with try-catch and corrupted key removal — pattern adapts to MMKV
- `constants/cardTypes.ts`: Already has `CARD_TYPES` array with `CardTypeConfig` — add `CARD_TYPE_QUERIES` map alongside it
- `@nkzw/create-context-hook` pattern: `[Provider, useHook]` pair — replaced by Zustand's `useStore` hook
- TanStack React Query: Already integrated in `app/_layout.tsx` with `QueryClient` — stays, not affected by Zustand migration

### Established Patterns
- Provider exports `[ProviderComponent, useContextHook]` pairs — Zustand replaces with `const useStore = create(...)`
- Immutable state updates via spread operators — same pattern applies in Zustand `set()` calls
- Deep-merge defaults on read for settings: `{ ...DEFAULT_SETTINGS, ...parsed, printer: { ...DEFAULT_PRINTER_PREFERENCES, ...(parsed.printer ?? {}) } }` — adapts to MMKV initial read
- Cold-start suppression in NetworkProvider (ignores first 4 offline results) — may need to adapt for NetInfo

### Integration Points
- `app/_layout.tsx`: Root composition — all providers must be removed/flattened here
- Every screen and component that imports `useSettings`, `useHistory`, `useNetwork`, `useI18n` — import paths change from providers to stores
- `providers/NetworkProvider.tsx` toast side-effects — must be preserved in the network store or moved to a subscription
- Scryfall API client (`services/scryfall.ts`) — not affected, but network store may expose reachability status for the API layer

</code_context>

<specifics>
## Specific Ideas

- Domain-aligned stores keep the same mental model as the current provider structure — each store maps 1:1 to a current provider
- NetInfo + periodic reachability gives the best of both worlds: instant OS-level detection plus API-specific verification
- Fresh MMKV start keeps the implementation simple — no migration code, no split-brain state, no backward compatibility shims
- composeProviders utility should be a simple reduce over provider components — standard React pattern

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-state-management*
*Context gathered: 2026-04-13*
# Pitfalls Research

**Domain:** React Native / Expo app improvement and refactoring (Momir Basic MTG Randomizer)
**Researched:** 2026-04-13
**Confidence:** HIGH (verified against Context7, official docs, multiple independent sources, and actual codebase patterns)

## Critical Pitfalls

### Pitfall 1: Refactoring Oversized Components Breaks Shared Mutable Refs

**What goes wrong:**
Extracting hooks or sub-components from the oversized screen files (printer.tsx at 2438 lines, card.tsx at 1238 lines, life-counter.tsx at 1113 lines) can create circular dependencies and subtle timing bugs. When extracted logic needs access to the same mutable refs (e.g., animation refs, connection state refs, camera refs), splitting creates tight coupling between the extracted pieces. Bidirectional state bridging between declarative React and imperative native modules (BLE printer, thermal driver) resists decomposition.

**Why it happens:**
Developers see a 2400-line file and instinctively reach for component splitting. But the EF-Map post-mortem on refactoring a 9000-line component showed that forced splitting of ref-sharing, imperative-bridging code produces "orphaned code fragments, broken brace matching, and ref timing bugs that only appeared in production." The code inside printer.tsx bridges 13 UI states, native module lifecycle (init -> connect -> print), and Bluetooth permission flows -- these are interconnected by nature, not by accident.

**How to avoid:**
- Extract **self-contained hooks first** -- hooks that manage their own `useState`/`useRef` and communicate via callbacks, not by reaching into parent internals.
- A hook is a safe extraction candidate when: (1) it does not need shared scene refs, (2) its state is self-contained, (3) communication is via returned callbacks.
- **Keep ref-heavy coordination logic in the parent component.** The 13-state `PrinterUiState` machine and its transitions should stay in one place -- extract the *behaviors* (discovery, connection, printing) into hooks that receive refs as parameters, not the *orchestration*.
- Document *failed* extraction attempts so other developers do not repeat them.
- Use section maps (comments marking logical regions) before forced splits.

**Warning signs:**
- An extracted hook needs more than 2 props that are refs from the parent.
- Extracted hook has `useEffect` that depends on parent state changes.
- After extraction, the parent still has 500+ lines of coordination glue.
- Tests for extracted hooks require mocking parent-internal state.

**Phase to address:**
Phase 1 (Security & Stability) for the safe extractions; Phase 2 (Refactoring) for the complex extractions after tests exist.

---

### Pitfall 2: Performance Regression During Refactoring Goes Undetected

**What goes wrong:**
The app's core value proposition is "tap to card in under a second." Refactoring can introduce unnecessary re-renders, unmemoized context values, or heavier component trees that degrade this below the 1-second threshold. Without automated performance testing, regressions slip through code review and only appear in production builds (which are 2-5x slower than dev builds).

**Why it happens:**
~80% of React Native performance issues come from unnecessary re-renders (Callstack research). When extracting hooks and splitting components, new parent-child boundaries create new re-render surfaces. A provider value object created without `useMemo` causes all consumers to re-render on every parent state change. `Dimensions.get('window')` values captured at module scope become stale on orientation change. Inline styles and functions in render create new references every frame. None of these are caught by existing tests because there are zero screen-level integration tests and zero performance benchmarks.

**How to avoid:**
- Set up [Reassure](https://github.com/callstack/reassure) for automated render performance regression testing before starting refactoring. It measures render count and duration with statistical analysis, compares branches, and can post results as PR comments via Danger.js.
- Write `.perf-test.tsx` files for the critical path: home screen cast flow (tap -> CMC -> card display), card detail rendering, and printer connection flow.
- Always measure on **production builds on real devices** -- dev builds are 2-5x slower and hide real bottlenecks.
- When extracting hooks, verify that provider values are memoized with `useMemo` to prevent cascade re-renders.
- Replace all 5 module-scope `Dimensions.get('window')` calls with `useWindowDimensions()` hook during refactoring, not as a separate task -- doing it separately risks partial migration and inconsistent patterns.

**Warning signs:**
- A component that previously rendered in <16ms now takes >32ms after extraction.
- Home screen hero art rotation stutters after extracting warming logic.
- Card detail modal animation drops frames after splitting.
- No `.perf-test.tsx` files exist for the critical user paths.

**Phase to address:**
Phase 1 (set up Reassure baseline before any refactoring begins). Every subsequent phase must include perf test verification.

---

### Pitfall 3: Context Refactoring Creates Re-render Cascades or Over-Consolidation

**What goes wrong:**
The current 7-level provider nesting (`QueryClientProvider > GestureHandlerRootView > SafeAreaProvider > I18nProvider > SettingsProvider > HistoryProvider > NetworkProvider > ToastProvider`) is painful. Two opposite mistakes are equally likely: (1) Over-consolidating all contexts into one big provider, which causes every consumer to re-render on any state change (the exact problem that caused teams to split contexts in the first place), or (2) Over-splitting value/action contexts, which solves re-render issues but recreates the nesting pyramid.

**Why it happens:**
The "Context Nesting Hell" is a well-documented trap. Real-world case studies (Fattutto ended up with 8 nested providers, Tetra Pak hit similar issues) show that teams split contexts for performance, then the nesting becomes unmaintainable, then they consolidate, then re-renders degrade, then they split again -- a cycle. The Momir codebase uses Context for both local persistence (Settings, History via AsyncStorage) and global state (Network, I18n, Toast), mixing concerns that have different update frequencies.

**How to avoid:**
- Use a `composeProviders` utility to flatten the nesting pyramid syntactically without changing the runtime behavior. This is a cosmetic fix that reduces indentation without changing re-render characteristics.
- **Split value and action contexts** for providers that update frequently: `SettingsValueContext` (re-renders on settings change) and `SettingsActionsContext` (stable, rarely changes). Components that only call `updateSettings()` never re-render on value changes.
- **Place providers as close as possible to their consumers.** `NetworkProvider` and `ToastProvider` may not need to wrap the entire app tree -- they could wrap only the screens that use them.
- **Do not merge Settings + History into one provider** despite the temptation. They have different update frequencies and different consumers. Merging would cause history updates to re-render settings consumers and vice versa.
- Consider migrating Settings and History from TanStack Query + AsyncStorage to a simpler local state approach (direct `useState` + `AsyncStorage.setItem` with optimistic updates). Using TanStack Query for local synchronous storage adds unnecessary async round-trips.

**Warning signs:**
- After flattening providers, a settings toggle causes the card history list to re-render.
- A `console.log` in a consumer fires on every parent state change.
- Provider nesting is reduced from 7 to 3, but `React DevTools Profiler` shows more re-renders than before.

**Phase to address:**
Phase 2 (Refactoring) -- but only after Phase 1 establishes performance baselines. Do not flatten providers without perf measurement.

---

### Pitfall 4: Native Module Bridge Refactoring Breaks Printer Lifecycle

**What goes wrong:**
The thermal printer integration uses `react-native-thermal-printer-driver` (v0.1.0) with dynamic `require()` calls and `NativeModules.ThermalPrinterDriver` access. Refactoring the adapter layer, updating the native module, or enabling the New Architecture can break the JS-to-native call sequence. The most common failure is a null pointer exception when calling print methods before `init()` + `connectPrinter()` complete -- a bug that persisted in the ecosystem for over a year (GitHub Issue #163 on `react-native-thermal-receipt-printer`).

**Why it happens:**
Old bridge native modules do not validate JS-side call ordering. The native module trusts that JS will call `init()` before `print()`, but nothing enforces this at the native level. When refactoring the JS adapter code, the implicit lifecycle ordering (discover -> connect -> render -> print) can be disrupted. Additionally, `react-native-thermal-printer-driver` at v0.1.0 uses the **old React Native bridge architecture** (not Fabric/TurboModules), making it vulnerable to breaking changes under the New Architecture that Expo SDK 54 enables by default.

**How to avoid:**
- Pin `react-native-thermal-printer-driver` to an exact version (remove `^` from package.json) to prevent accidental breaking updates.
- Create TypeScript type declarations for the native module interface (`NativeModules.ThermalPrinterDriver`) -- currently untyped.
- Add integration tests that validate the full JS -> native call sequence: `init() -> connectPrinter() -> printRawData()`. The existing `FakePrinterAdapter` is perfect for this.
- When enabling the New Architecture, test printer functionality first on a separate branch. Old bridge modules may need shim adapters or migration to TurboModules.
- **Do not refactor the printer adapter layer and enable the New Architecture in the same phase.** These are independent changes that must be tested separately.

**Warning signs:**
- `Attempt to invoke interface method on a null object reference` in Android logs.
- Printer UI shows "connected" but print calls silently fail.
- `NativeModules.ThermalPrinterDriver` is `undefined` after a dependency update.
- Dynamic `require()` calls return `undefined` after bundler configuration changes.

**Phase to address:**
Phase 1 (pin version, add types, add integration tests). Phase 3 (New Architecture migration) tested separately on a branch.

---

### Pitfall 5: JSON.parse on Persisted Data Crashes App on Startup

**What goes wrong:**
`SettingsProvider` and `HistoryProvider` both call `JSON.parse()` on AsyncStorage data during app initialization (`app/_layout.tsx` lines 97-113) without try-catch. If stored data becomes corrupted (disk corruption, OS update, app crash mid-write, AsyncStorage 6MB limit exceeded on Android), the app crashes on startup with no recovery mechanism. The user cannot clear the corrupted data because the app never loads.

**Why it happens:**
AsyncStorage corruption is more common than developers assume. The `react-native-async-storage` issue tracker shows multiple reports of data being cleared or corrupted after app restarts, force closes, and OS updates. On Android, the 6MB default limit means a power user with thousands of card history entries (unbounded FIFO growth in `HistoryProvider`) can exceed storage capacity, causing `setItem` to fail silently and `getItem` to return corrupted partial writes.

**How to avoid:**
- Wrap **all** `JSON.parse()` calls on persisted data in try-catch blocks. On parse failure, return defaults (`DEFAULT_SETTINGS` or `[]`) and log the corruption event. This is the single most impactful crash-prevention fix.
- Add Zod validation (already installed at `^4.3.6`) for critical data shapes at the storage boundary. Use `safeParse()` (not `parse()`) to gracefully degrade instead of crashing.
- Cap history size at 500 entries with FIFO eviction. The unbounded `[card, ...prev]` pattern in `HistoryProvider` will eventually hit AsyncStorage limits.
- Consider migrating history to `expo-sqlite` (already a dependency for printer storage) for structured queries and larger capacity.
- Test corruption recovery: intentionally corrupt AsyncStorage in a test and verify the app starts with defaults instead of crashing.

**Warning signs:**
- App crashes immediately on launch with no error boundary catching it (providers load before the UI renders).
- `JSON.parse` of `null` or partial strings throws `SyntaxError`.
- History size grows unbounded with no eviction policy.
- Android 6MB AsyncStorage limit approaching (check via `AsyncStorage.getSize()`).

**Phase to address:**
Phase 1 (Security & Stability) -- this is a startup crash risk and must be fixed before any refactoring.

---

### Pitfall 6: Replacing Empty Catches Introduces Unhandled Error Paths

**What goes wrong:**
The codebase has 28 empty `catch {}` blocks. Replacing all of them with proper error handling is correct in principle, but careless replacement can introduce new bugs: some empty catches exist because the error is genuinely expected (e.g., a network check returning false when offline is not an error condition). Adding `console.error()` or `throw` to expected-failure catches would flood logs with noise or crash the app.

**Why it happens:**
Not all empty catches are mistakes. `NetworkProvider` returning `false` on network check failure is a valid "I'm offline" signal, not an error. But `print-preview.tsx` swallowing six print failures silently is a genuine diagnostic black hole. Without careful classification, a blanket "fix all empty catches" pass mixes the two categories.

**How to avoid:**
- Classify each empty catch into one of three categories:
  1. **Expected failure** (offline check, optional feature fallback) -- Add a comment explaining *why* the error is intentionally ignored. Keep the empty catch.
  2. **Missing recovery** (printer connection failure, storage write failure) -- Add error logging and a user-facing action (toast, retry button). Use the existing `PrinterAdapterError` pattern for typed errors.
  3. **Missing diagnostic** (API call failure, database migration error) -- Add `console.warn()` at minimum. Route to the existing logger service (`services/printer/diagnostics/logger.ts`).
- Do not add `throw` to catches that previously swallowed errors -- this changes the control flow and can break callers that do not expect exceptions.
- Remove `jest.setup.js` blanket console suppression (`console.warn: jest.fn()`, `console.error: jest.fn()`) -- it hides real issues during testing. Only silence specific expected warnings.

**Warning signs:**
- After fixing empty catches, production logs flood with "expected" network-offline warnings.
- A catch that previously swallowed now throws, and the calling code has no try-catch.
- Test suite fails because it was relying on swallowed errors.

**Phase to address:**
Phase 1 (classify all catches and fix categories 2 and 3). Category 1 can be addressed incrementally.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `as` type assertions on API responses (`response.json() as ScryfallCard`) | Avoids writing Zod schemas; compiles immediately | Silent runtime crashes when Scryfall changes their API schema; fields become `undefined` where code expects them | Never for external API data. Only for internal trusted data |
| `console.log` in production (20 in scryfall.ts alone) | Quick debugging | Performance impact in Hermes; no log levels; no filtering; no disable in release builds | Only in development. Strip via Babel plugin in production |
| Module-scope `Dimensions.get('window')` | One-liner for screen dimensions; no hook needed | Stale on orientation change, foldables, iPad; layout breaks silently | Never. Use `useWindowDimensions()` hook |
| Unbounded history array (`[card, ...prev]`) | Simple implementation; no eviction logic | AsyncStorage 6MB limit on Android; startup crash on parse failure; no pagination | Only with a cap (max 500 entries) |
| TanStack Query for local AsyncStorage | Reuse existing patterns; cache invalidation built-in | 3-step async dance for what is a local write; extra latency on every settings change | Only for remote data (Scryfall). Use direct `useState` + `AsyncStorage.setItem` for local-only data |
| Dynamic `require()` for native modules | Works around bundler limitations | Bypasses tree-shaking; breaks with Metro config changes; no TypeScript types | Only when static import fails. Add type declarations and pin version |
| `zustand` in dependencies but unused | No immediate cost (tree-shaken) | Confuses developers about state management approach; 5KB unnecessary install | Remove immediately. Dead dependency |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Scryfall API | Using `as` cast instead of Zod validation; no schema evolution handling | Define `ScryfallCardSchema` with Zod; use `safeParse()` at the API boundary; handle `success: false` with graceful degradation |
| Scryfall rate limiting | Module-level `let lastRequestTime = 0` cannot be reset in tests | Encapsulate rate-limit state in a class or closure that can be injected/reset for testing |
| Thermal printer native module | Calling `printRawData()` before `init()` + `connectPrinter()` complete | Enforce lifecycle invariants at the native level; add state guards in the JS adapter; write integration tests for the full sequence |
| AsyncStorage persistence | `JSON.parse()` without try-catch on data that can be corrupted | Always wrap in try-catch; return defaults on failure; validate with Zod `safeParse()` |
| BLE printer on Android 12+ | Missing new Bluetooth permission model (`BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`) | Permission gates must be version-specific; test on Android 12+ devices explicitly |
| Expo Router navigation | Route params parsed with `JSON.parse()` in screen components | Already handled with try-catch in `card.tsx` and `print-preview.tsx` -- preserve this pattern |
| `expo-image` vs `Image` | Using built-in `Image` component without caching or blurhash | Use `expo-image` with `placeholder.blurhash` for card art; cache policy for offline use |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Provider value not memoized | All consumers re-render on any parent state change; home screen stutters | `useMemo` on provider `value` prop; split value/action contexts | Immediately on any provider with >2 consumers |
| `Dimensions.get('window')` at module scope | Layout breaks on rotation; wrong dimensions on iPad/foldables | Replace with `useWindowDimensions()` hook; never cache outside render | On any device that rotates or folds |
| Inline styles in render on list items | New style objects each frame; `CardGridItem` re-renders cascade | `StyleSheet.create()` outside component; `React.memo` on list items | At 50+ items in a list |
| Hero art cache unbounded | Memory grows without limit; rapid type switching causes overlapping prefetch chains | Cap `warmedArtUrlsRef` at 20 entries; extract to `useHeroArtCache` hook with eviction | After ~100 card views in a session |
| Network connectivity polling every 15s | 4 requests/minute to Scryfall just for health checks; battery drain on cellular | Use `@react-native-community/netinfo` for network stack detection; fall back to Scryfall health check only on API failure | Immediately -- this is wasteful even at current scale |
| `console.log` in production Hermes | Synchronous I/O on JS thread; blocks rendering | Strip via Babel plugin `transform-remove-console` in production; use environment-gated logger | Noticeable on low-end Android devices |
| FlatList without `getItemLayout` | FlatList measures each item individually; slow scroll for card grids | Use `getItemLayout` for fixed-height items; consider FlashList for 50+ items | At 100+ items in a grid |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Service account key in repo root (`google-play-service-account.json`) | If `.gitignore` is bypassed (`git add -f`), Play Store publish credentials are exposed | Move to CI secret store (EAS secrets); update `eas.json` to reference via environment variable; add pre-commit hook blocking `*service-account*` patterns |
| Second service account key in `play/` directory | Same risk as above; expanded attack surface with two keys | Same fix; consolidate to one key managed in CI |
| 117MB build artifact (`.apk`) in repo root | If committed, bloats git history permanently; potential information leakage | Delete from disk; ensure build output goes to gitignored `dist/` or `build/` |
| Unvalidated Scryfall API responses | Malicious or changed API responses could inject unexpected data shapes; `undefined` fields crash `mapScryfallCard()` | Use Zod `safeParse()` at API boundary; reject unknown fields with `.strict()` |
| `JSON.parse` on external data without try-catch | Corrupted storage data crashes app on startup with no recovery | Wrap in try-catch; validate with Zod; return defaults on failure |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| App crashes on startup from corrupted AsyncStorage | User cannot open the app at all; must reinstall (losing all data) | Wrap all startup `JSON.parse` in try-catch; return defaults; log corruption |
| Silent printer failures (6 empty catches in print-preview) | User taps "print", nothing happens, no error message, no retry option | Show toast with error category; offer retry button; log error for diagnostics |
| Stale screen dimensions on rotation | Card detail or life counter layout breaks when device is rotated | Use `useWindowDimensions()` hook; test on iPad and foldable emulators |
| No offline degradation messaging | User sees loading spinner forever when offline; no indication that network is required | Show offline banner via `NetworkProvider`; cache cards for offline viewing; explain what features are unavailable |
| Card display takes >1 second after refactoring | Core value proposition ("fastest MTG random card experience") is violated | Set up Reassure benchmarks for the cast flow; test on production builds; optimize before merging |

## "Looks Done But Isn't" Checklist

- [ ] **Component extraction:** Extracted hook compiles but shares parent refs -- verify extracted hooks are self-contained (no parent ref dependencies)
- [ ] **Provider flattening:** Nesting reduced but re-renders increased -- verify with `React DevTools Profiler` that consumer re-render count did not increase
- [ ] **Empty catch fixes:** All catches now log but some were expected failures -- verify no log flooding on normal offline scenarios
- [ ] **Zod validation:** Schema parses Scryfall response but strips unknown fields by default -- use `.passthrough()` initially, then `.strict()` after confirming field coverage
- [ ] **`useWindowDimensions` migration:** All 5 module-scope calls replaced but `StyleSheet.create()` still uses stale values -- verify that dimension-dependent styles use inline styles that re-evaluate on render
- [ ] **Performance testing:** Reassure installed but only measures happy paths -- verify that error states, loading states, and empty states also have perf tests
- [ ] **Printer integration tests:** Tests pass with `FakePrinterAdapter` but real hardware not tested -- verify on physical printer after adapter refactoring
- [ ] **History size cap:** 500-entry limit added but no migration for existing users over 500 -- verify that initial load trims oversized history gracefully
- [ ] **Console.log removal:** Logs replaced with logger but logger not initialized in production -- verify logger service works in release builds

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Refactored component breaks shared refs | MEDIUM | Revert extraction; keep coordination in parent; add section map comments instead |
| Performance regression missed in review | HIGH | Revert refactoring commit; establish Reassure baseline first; then re-apply changes with perf verification |
| Provider consolidation causes re-render cascade | LOW | Revert to separate providers; add `composeProviders` utility for syntax only; split value/action contexts |
| Zod schema too strict, rejects valid API responses | LOW | Switch from `.strict()` to `.passthrough()`; add missing fields to schema; deploy update |
| Native module breaks under New Architecture | HIGH | Revert to Old Architecture on a branch; add TurboModule shim; test on separate branch first |
| AsyncStorage corruption crashes app on startup | MEDIUM | Add try-catch with defaults (should have been there from the start); publish hotfix; users auto-recover |
| History exceeds AsyncStorage 6MB limit | MEDIUM | Add 500-entry cap with FIFO eviction; migrate excess to SQLite; trim on next app launch |
| Empty catch replacement floods logs | LOW | Classify catches (expected vs missing recovery); add conditional logging; filter noise |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| JSON.parse crash on startup | Phase 1: Security & Stability | All `JSON.parse` on persisted data wrapped in try-catch; test with corrupted storage |
| Service account keys in repo | Phase 1: Security & Stability | Keys removed from repo; CI secrets configured; pre-commit hook blocks patterns |
| Empty catch classification | Phase 1: Security & Stability | All 28 catches classified; categories 2+3 fixed; category 1 documented |
| Performance regression undetected | Phase 1: Set up Reassure | Baseline perf tests for cast flow, card detail, printer connection |
| Native module lifecycle enforcement | Phase 1: Pin + type + test | Version pinned; types declared; integration test for full call sequence |
| Component extraction breaks refs | Phase 2: Refactoring | Extracted hooks verified self-contained; no parent ref dependencies |
| Provider nesting / re-render cascade | Phase 2: Refactoring | `composeProviders` utility; value/action split; Profiler shows no increase in re-renders |
| Dimensions.get stale values | Phase 2: Refactoring | All 5 module-scope calls replaced; dimension-dependent styles use inline |
| Zod validation for Scryfall responses | Phase 2: Refactoring | `ScryfallCardSchema` with `safeParse()`; graceful degradation on schema mismatch |
| Console.log removal from production | Phase 2: Refactoring | Babel plugin strips console in release; environment-gated logger in place |
| History size cap | Phase 2: Refactoring | 500-entry limit; FIFO eviction; migration trims existing oversized history |
| New Architecture native module testing | Phase 3: Modernization | Printer works on New Architecture branch; no null-adapter crashes |

## Sources

- [Elaris Software -- React Native Performance: Complete Guide for Expo (2025)](https://elaris.software/blog/react-native-performance-expo-2025/) -- HIGH confidence, verified against official docs
- [Yunsoft -- React Native's 7 Deadliest Mistakes in 2026](https://yunsoft.com/blog/react-native-7-deadliest-mistakes-2026) -- MEDIUM confidence, corroborated by multiple sources
- [DEV Community -- Common React Native Performance Gotchas I Fixed in 2025](https://dev.to/mrsolomon/common-react-native-performance-gotchas-i-fixed-in-2025-and-how-to-avoid-them-4cmb) -- MEDIUM confidence, practical experience report
- [React Native Relay -- Ultimate Guide to React Native Performance Optimization 2026](https://reactnativerelay.com/article/ultimate-guide-react-native-performance-optimization-2026) -- MEDIUM confidence
- [CodeScene -- Refactoring Components in React with Custom Hooks](https://codescene.com/blog/refactoring-components-in-react-with-custom-hooks) -- HIGH confidence, authoritative source on hook extraction
- [EF-Map Blog -- Refactoring a 9,000-Line React Component: When NOT to Split](https://ef-map.com/blog/app-tsx-refactoring-custom-hooks) -- HIGH confidence, direct post-mortem of failed component splitting
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54) -- HIGH confidence, official source
- [Medium -- Upgrading to Expo 54 and React Native 0.81](https://medium.com/@shanavascruise/upgrading-to-expo-54-and-react-native-0-81-a-developers-survival-story-2f58abf0e326) -- MEDIUM confidence, community migration report
- [Medium -- What Breaks After an Expo 54 / React Native 0.81 Upgrade](https://medium.com/elobyte-software/what-breaks-after-an-expo-54-reactnative-0-81-15cb83cdb248) -- MEDIUM confidence, community report
- [React Native -- Dimensions API (official docs)](https://reactnative.dev/docs/next/dimensions) -- HIGH confidence, official
- [GitHub -- useWindowDimensions iOS orientation bugs (#51086, #49511)](https://github.com/facebook/react-native/issues/51086) -- HIGH confidence, verified bug reports
- [Callstack -- Reassure Performance Testing](https://github.com/callstack/reassure) -- HIGH confidence, official tool documentation
- [RNTL -- Common Mistakes Guide](https://oss.callstack.com/react-native-testing-library/docs/guides/common-mistakes) -- HIGH confidence, official testing library docs
- [React Native Relay -- Complete Testing Guide 2026](https://reactnativerelay.com/article/complete-guide-testing-react-native-apps-2026-unit-tests-e2e-maestro) -- MEDIUM confidence
- [React Native Relay -- Error Handling Guide (2026)](https://reactnativerelay.com/article/react-native-error-handling-error-boundaries-global-handlers-sentry-crash-reporting-expo) -- MEDIUM confidence
- [Medium -- BLE Thermal Printer Journey on Android (2026)](https://medium.com/@khanrajesh7128/my-end-to-end-ble-thermal-printer-journey-on-android-part-1-9782453e436a) -- MEDIUM confidence, practical experience
- [GitHub -- react-native-thermal-receipt-printer null adapter bug (#163)](https://github.com/HeligPfleigh/react-native-thermal-receipt-printer/issues/163) -- HIGH confidence, verified bug
- [Zod v4 React Native compatibility issue (#4690)](https://github.com/colinhacks/zod/issues/4690) -- HIGH confidence, verified issue with fix
- [Codebase analysis: CONCERNS.md](file:///Users/heitor/Developer/github.com/bloodf/rork-momir-basic/.planning/codebase/CONCERNS.md) -- HIGH confidence, direct codebase audit

---
*Pitfalls research for: React Native / Expo app improvement (Momir Basic)*
*Researched: 2026-04-13*
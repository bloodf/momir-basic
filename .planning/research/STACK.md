# Stack Research

**Domain:** React Native / Expo MTG utility app (Momir Basic)
**Researched:** 2026-04-13
**Confidence:** HIGH

## Recommended Stack

### Core Technologies (Upgrades from Current)

| Technology | Current Version | Recommended Version | Purpose | Why Recommended |
|------------|----------------|---------------------|---------|-----------------|
| Expo SDK | 54.0.33 | **55.0.0+** | Managed workflow | Mandatory New Architecture, Hermes v1 opt-in, bytecode diffing (~75% smaller updates), new package versioning. SDK 54 is last to support Old Architecture -- upgrading future-proofs the app. HIGH confidence. |
| React Native | 0.81.5 | **0.83.2+** (via SDK 55) | Native framework | Ships with SDK 55. New Architecture only. Improved Fabric renderer performance (~30% smoother UI). HIGH confidence. |
| React | 19.1.0 | **19.2.0** (via SDK 55) | UI library | Ships with SDK 55. No migration effort -- minor version bump. HIGH confidence. |
| Expo Router | 6.0.23 | **7.x (v55)** | File-based routing | New Stack API with composable header components, Native Tabs with MD3 dynamic colors, Apple Zoom transitions, synchronous layout updates, experimental SSR for web. Significant DX improvement for native-feeling navigation. HIGH confidence. |
| Reanimated | ~4.1.x | **~4.2.x** (via SDK 55) | Animations | Ships with SDK 55. New Architecture performance flags (enableIosSynchronousUpdates, enableCommitHookOnlyForReactCommits). Fix for flickering while scrolling on Fabric. HIGH confidence. |
| react-native-worklets | 0.5.1 | **0.7.3+** (via SDK 55) | Worklet runtime | Ships with SDK 55. Required by Reanimated 4.2. HIGH confidence. |

### State Management (Major Change)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Zustand | 5.0.2 (already installed) | **Client/UI state** (settings, history, i18n, network status) | Already a dependency but unused. Replaces 4 React Context providers with 2-3 Zustand stores. Eliminates provider nesting depth (currently 7 layers). Selector-based subscriptions prevent re-render cascades. `getState()` enables non-React access (e.g., from Scryfall service). This is the 2026 consensus pattern: Zustand for client state, TanStack Query for server state. HIGH confidence. |
| TanStack React Query | ^5.83.0 (keep) | **Server/async state** (Scryfall API data) | Keep for remote data only. Stop using for local AsyncStorage reads/writes -- that was an architectural misuse. Reserve exclusively for Scryfall API calls where caching, refetching, and retry logic are valuable. HIGH confidence. |
| zustand-mmkv-storage | ^1.0.0 | Zustand persist adapter for MMKV | Lightweight (<1KB), zero-dependency adapter. Handles hydration detection (prevents flash of empty state), encryption, and multiple instances. Replaces manual AsyncStorage read/write cycles. MEDIUM confidence (relatively new package but simple adapter pattern -- could also be wired manually). |

### Persistence (Major Change)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| react-native-mmkv | **4.1.0+** | Key-value persistence (settings, history, locale) | ~30x faster reads, ~25x faster writes vs AsyncStorage. Synchronous API eliminates the async read-invalidate-refetch dance currently used by SettingsProvider/HistoryProvider. Built-in AES-256 encryption. No 6MB Android limit. Requires `react-native-nitro-modules >= 0.33.0`. HIGH confidence. |
| expo-sqlite | **55.0.0+** (via SDK 55) | Structured persistence (printer registry, card history if migrated) | Keep for printer database. SDK 55 version adds SQLite Inspector DevTools plugin, tagged template literals, math functions. Consider extending to card history for structured queries and unbounded storage. HIGH confidence. |
| @react-native-async-storage/async-storage | 2.2.0 | **DEPRECATE** -- keep temporarily for migration | Legacy data migration path. Read old keys during MMKV hydration, then stop writing. Remove after migration period. HIGH confidence. |

### Network & Connectivity

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @react-native-community/netinfo | **12.0.1+** | Network connectivity detection | Replaces custom Scryfall health endpoint polling (currently 4 requests/min). NetInfo uses OS-level reachability APIs for instant detection. Configure `reachabilityUrl` to Scryfall health endpoint for API-specific checks. Reduces unnecessary network traffic and battery drain. New Architecture support since v11.5. Includes Jest mock. HIGH confidence. |

### Validation (Existing -- Expand Usage)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Zod | ^4.3.6 (keep, expand usage) | Runtime validation at system boundaries | Already installed but underutilized. Use for: (1) Scryfall API response validation (replace `as` type casts), (2) AsyncStorage/MMKV data validation on read, (3) route param validation. Zod 4 is 14x faster string parsing, 6.5x faster object parsing vs Zod 3. Works with React Native out of the box. HIGH confidence. |

### Performance

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @shopify/flash-list | **1.7.x+** | Virtualized lists (card grid, history) | Recycler pattern gives 5-10x better performance than FlatList for large datasets. Essential for card grid and history list. Requires `estimatedItemSize`. Reset Reanimated shared values on item recycling. HIGH confidence. |
| expo-image | **55.0.0+** (via SDK 55) | Optimized image component | Keep. Already used for hero art. SDK 55 version continues improvements. HIGH confidence. |

### Testing (Major Change)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Jest | **30.x** | Test runner | 15-30% faster execution vs Jest 29. Native TypeScript config support. Works with `jest-expo@55`. HIGH confidence. |
| jest-expo | **55.0.0+** (via SDK 55) | Jest preset for Expo | Ships with SDK 55. Updated for React 19.2, RN 0.83. HIGH confidence. |
| @testing-library/react-native | **13.3.3** (upgrade to **14.x when stable**) | Component/integration testing | Current version is stable. v14 beta drops React 18, introduces async `userEvent` by default. Stay on v13 for now, upgrade when v14 is stable. Add screen-level integration tests for: home cast flow, search flow, life counter, printer connection. HIGH confidence. |
| Maestro | **latest** | E2E testing (native) | Replace Playwright (web-only) with Maestro for native E2E. Declarative YAML syntax, no npm dependency in app, automatic wait/synchronization, cross-platform iOS+Android. Works with EAS Workflows for CI. `testID` selectors for stability. HIGH confidence. |
| eslint-plugin-testing-library | **6.x+** | Test quality linting | Enforces RNTL best practices: prefer `getByRole` over `getByTestId`, no direct `act()` calls, proper async patterns. Prevents common testing anti-patterns. MEDIUM confidence. |

### Developer Experience

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Prettier | **3.x** | Code formatting | Currently missing from the project (CONCERNS.md notes this). Consistent formatting reduces review friction. Use `eslint-config-prettier` to disable ESLint formatting rules. HIGH confidence. |
| eslint-config-prettier | **10.x** | Disable ESLint formatting conflicts | Required when using both Prettier and ESLint. Prevents conflicting rules. HIGH confidence. |
| Husky | **9.x** | Git hooks | Run lint-staged on pre-commit to enforce formatting and linting before code enters the repo. Prevents console.log and other issues from reaching main. HIGH confidence. |
| lint-staged | **15.x** | Run linters on staged files only | Avoids full-project lint on every commit. Fast and targeted. HIGH confidence. |

### Supporting Libraries (Keep As-Is)

| Library | Version | Purpose | Why Keep |
|---------|---------|---------|----------|
| react-native-thermal-printer-driver | ^0.1.0 (PIN to **0.1.0** exactly) | BLE/Classic/TCP printer | Core app feature. No alternatives exist. Pin exact version to prevent breaking changes. Add TypeScript declarations for `NativeModules.ThermalPrinterDriver`. HIGH confidence. |
| expo-haptics | **55.0.0+** (via SDK 55) | Tactile feedback | Works well, no changes needed. HIGH confidence. |
| expo-image-manipulator | **55.0.0+** (via SDK 55) | Image resize for printing | Required for ESC/POS pipeline. HIGH confidence. |
| react-native-svg | **15.12.1+** | SVG rendering (mana symbols) | Required for card details. HIGH confidence. |
| lucide-react-native | ^0.475.0 | Icon library | Keep. Sufficient for current icon needs. HIGH confidence. |
| @expo/vector-icons | **55.0.0+** (via SDK 55) | Expo icon set | Keep. Ships with SDK 55. HIGH confidence. |
| react-native-view-shot | 4.0.3 | Screen capture for print preview | Keep. Required for print preview. HIGH confidence. |
| react-native-gesture-handler | **55.0.0+** (via SDK 55) | Gesture system | Keep. Ships with SDK 55. HIGH confidence. |
| buffer | ^6.0.3 | Node Buffer polyfill for ESC/POS | Keep. Required for printer byte construction. Evaluate Uint8Array replacement later. HIGH confidence. |

## Installation

```bash
# Upgrade to Expo SDK 55 (handles most version bumps)
npx expo install expo@^55.0.0 --fix
npx expo-doctor@latest

# State management (Zustand already installed, add MMKV adapter)
npx expo install react-native-mmkv react-native-nitro-modules
bun add zustand-mmkv-storage

# Network connectivity
npx expo install @react-native-community/netinfo

# Performance (list rendering)
bun add @shopify/flash-list

# Testing (upgrade Jest, add Maestro is standalone)
bun add -D jest@30 eslint-plugin-testing-library@6

# Formatting and git hooks
bun add -D prettier eslint-config-prettier husky lint-staged

# Clean rebuild after SDK upgrade
rm -rf android ios node_modules
bun install
npx expo prebuild --clean

# Install Maestro CLI (separate from app dependencies)
curl -Ls "https://get.maestro.mobile.dev" | bash
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Zustand 5 for client state | Jotai | If you prefer atomic state model over store model. Jotai is better for fine-grained reactivity with independent atoms, but Zustand's store pattern maps better to the existing Context-based providers (settings, history, network). |
| Zustand 5 for client state | Keep React Context | If the team is small and Context is "good enough." Context works but causes re-render cascades (all consumers re-render on any state change) and deep nesting (7 providers). Zustand's selector model is strictly better for this app's scale. |
| react-native-mmkv | expo-secure-store | Only for auth tokens/API keys requiring hardware-backed encryption (Keychain/Keystore). Not suitable for settings/history -- 2KB per key limit, async-only API. |
| react-native-mmkv | Keep AsyncStorage | If Expo Go compatibility is required. MMKV requires a development build (not Expo Go). This app already uses `expo-dev-client` and custom native modules, so Expo Go is not a constraint. |
| Maestro for E2E | Detox | If you need programmatic JS-level test control. Detox is declining in adoption, has complex setup, and doesn't match Maestro's YAML simplicity. Only choose Detox if you need to mock specific JS modules from E2E. |
| Maestro for E2E | Keep Playwright | Only if web E2E is the sole target. Playwright cannot test native mobile features (Bluetooth, haptics, native navigation). Keep Playwright for web-specific tests, add Maestro for native. |
| FlashList | LegendList | LegendList eliminates blank flashes entirely and runs on Fabric, but is very new and requires the New Architecture (which this app has). FlashList is more battle-tested with 4.4k stars. Consider LegendList in a future iteration if blank flashes become an issue. |
| Zustand persist with MMKV | Manual MMKV + Zustand | If you prefer not to add another dependency. The `zustand-mmkv-storage` adapter is <1KB and handles hydration edge cases. Manual wiring is ~20 lines per store but you own the edge cases. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| AsyncStorage for new features | Deprecated by React Native core team. 6MB limit on Android. Async-only API blocks UI thread. ~30x slower than MMKV. No change listeners. No encryption. | react-native-mmkv |
| React Context for global state | Re-render cascades (all consumers re-render on any value change). Deep nesting (7 providers). No selector-based subscriptions. No non-React access. Unnecessary async round-trips when combined with TanStack Query for local data. | Zustand 5 with selectors |
| TanStack Query for local storage | Using `useQuery`/`useMutation` for AsyncStorage reads/writes is an architectural misuse. It introduces a 3-step async dance (save -> invalidate -> refetch) for what should be a synchronous local write. | Zustand with MMKV persist for local state; TanStack Query only for Scryfall API |
| `as` type casts on API responses | Unsafe. If Scryfall changes their schema, fields become `undefined` at runtime with no warning. 8+ instances in scryfall.ts. | Zod 4 schema validation at API boundary |
| Module-scope `Dimensions.get('window')` | Values captured once at module load, never update on orientation change or resize. Broken on foldables/tablets. 5 instances in codebase. | `useWindowDimensions()` hook (already imported in SearchFilters.tsx) |
| Playwright for native E2E | Only tests web builds. Cannot test Bluetooth, haptics, native navigation, or any platform-specific behavior. 3 test files cover web only. | Maestro for native E2E; keep Playwright for web-only if needed |
| `react-native-dotenv` with MMKV | Leaks `JEST_WORKER_ID` from Metro's jest-worker into build environment, causing MMKV to run in test/mock mode where data is not persisted. Known issue (MMKV GitHub #1011, #1030). | `react-native-config` or Expo environment variables |
| Empty `catch {}` blocks | 26 instances silently swallow errors. Printer failures, database errors, and API failures produce no diagnostic output. | Log errors with `console.warn` at minimum; use typed error handling (existing `PrinterAdapterError` pattern) |
| react-native-web 0.21.x | Designed for React Native 0.64-0.71 era / React 17. Severe version mismatch with React 19.1. Web builds will have rendering bugs. | Upgrade to 0.40+ which supports React 19, or remove if web is not a target |
| Unused polyfills (`@stardazed/streams-text-encoding`, `@ungap/structured-clone`) | Not imported by any source file. Increase bundle size for no benefit. | Remove from package.json |

## Stack Patterns by Variant

**If Expo SDK 55 upgrade is deferred (stay on SDK 54):**
- Use Reanimated ~4.1.x, worklets 0.5.1
- Use MMKV 4.1.0+ with nitro-modules >= 0.33.0
- Zustand 5 works unchanged on SDK 54
- Jest 30 works with jest-expo@54
- NetInfo 12.x works on SDK 54 (New Architecture support added in v11.5)
- This is safe but means missing Router v7 native navigation features

**If web platform is deprioritized:**
- Remove react-native-web entirely
- Remove Playwright E2E tests
- Focus Maestro flows on Android (primary) + iOS (secondary)
- This removes the 0.21.x version mismatch problem and reduces bundle complexity

**If thermal printer feature is extracted to a plugin:**
- The printer subsystem is already well-architected (adapters, registry, render)
- Could become an Expo config plugin or separate package
- Would simplify the main app and enable independent versioning

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Expo SDK 55 | React Native 0.83.2, React 19.2 | Mandatory New Architecture. Old Architecture config removed. |
| react-native-mmkv 4.1.0+ | nitro-modules >= 0.33.0 | Using nitro 0.31 causes Android build failures. Pin >= 0.33. |
| react-native-mmkv 4.2.0+ | nitro-modules >= 0.35.0 | Required for SDK 55. |
| Zustand 5.x | react-native-mmkv 4.x via zustand-mmkv-storage | Adapter requires zustand ^5.0.9, react-native-mmkv ^4.1.0. |
| Reanimated ~4.2.x | react-native-worklets ^0.7.3 | Worklets plugin is bundled in Reanimated plugin -- do NOT add both to babel.config.js. |
| Zod 4.x | Metro bundler (RN 0.79+) | Works out of the box. For older RN, enable `unstable_enablePackageExports` in Metro config. |
| @react-native-community/netinfo 12.x | React Native 0.76+ (New Architecture) | v11.5+ adds New Architecture support. v12 requires iOS 14+. |
| Jest 30 | jest-expo@55 | Works together. jest-expo@54 may also work but test. |
| Maestro | Any Expo build (dev client or standalone) | No npm dependency in app. CLI installed separately. Works with EAS Workflows for CI. |

## Migration Priority Order

Based on CONCERNS.md severity and this research:

1. **Zustand adoption + MMKV persistence** -- Addresses HIGH: provider nesting, MEDIUM: TanStack Query misuse for local state, MEDIUM: AsyncStorage 6MB limit, LOW: unused zustand dependency
2. **Zod validation for Scryfall API** -- Addresses MEDIUM: unvalidated API responses, MEDIUM: unsafe JSON.parse
3. **NetInfo for connectivity** -- Addresses MEDIUM: network polling waste, provides better UX
4. **Prettier + Husky + lint-staged** -- Addresses missing formatting, prevents console.log and catch{} issues
5. **Jest 30 + screen-level integration tests** -- Addresses HIGH: zero screen-level tests
6. **Maestro E2E** -- Addresses LOW: web-only E2E, adds native coverage
7. **Expo SDK 55 upgrade** -- Unlocks Router v7, performance improvements, future-proofs
8. **FlashList for card lists** -- Performance improvement for growing history
9. **react-native-web upgrade or removal** -- Addresses MEDIUM: version mismatch
10. **Remove unused dependencies** -- Cleanup: zustand (once adopted), polyfills, empty dirs

## Sources

- [Expo SDK 55 Changelog](https://expo.dev/changelog/sdk-55) -- SDK 55 features, breaking changes, version matrix. HIGH confidence.
- [How to Upgrade to SDK 55](https://expo.dev/blog/upgrading-to-sdk-55) -- Migration steps, one-SDK-at-a-time recommendation. HIGH confidence.
- [Expo Router v55 Blog](https://expo.dev/blog/expo-router-v55-more-native-navigation-more-powerful-web) -- Native Tabs, Stack API, Zoom transitions, SSR. HIGH confidence.
- [Expo ESLint + Prettier Guide](https://docs.expo.dev/guides/using-eslint) -- Official Prettier setup for Expo. HIGH confidence.
- [React Native Relay: Zustand + TanStack Query Guide](https://reactnativerelay.com/article/modern-state-management-react-native-zustand-tanstack-query) -- 2026 consensus pattern for state separation. HIGH confidence.
- [Zustand v5 Selector Best Practices (GitHub #2867)](https://github.com/pmndrs/zustand/discussions/2867) -- Maintainer recommendations on useShallow, selector patterns. HIGH confidence.
- [PkgPulse: MMKV vs AsyncStorage vs expo-secure-store 2026](https://www.pkgpulse.com/blog/react-native-mmkv-vs-async-storage-vs-expo-secure-store-2026) -- Performance benchmarks, feature comparison. HIGH confidence.
- [react-native-mmkv GitHub Issues #985, #1011](https://github.com/mrousavy/react-native-mmkv/issues/985) -- Nitro modules version requirements, dotenv leak issue. HIGH confidence.
- [Zod 4 Release Notes](https://v4.zod.dev/v4) -- Performance improvements, React Native compatibility. HIGH confidence.
- [Zod React Native Issue #4470](https://github.com/colinhacks/zod/issues/4470) -- Metro bundler sub-path exports fix. HIGH confidence.
- [@react-native-community/netinfo NPM](https://www.npmjs.com/package/@react-native-community/netinfo) -- v12.0.1, New Architecture support. HIGH confidence.
- [React Native Relay: Testing Guide 2026](https://reactnativerelay.com/article/complete-guide-testing-react-native-apps-2026-unit-tests-e2e-maestro) -- Jest 30 + RNTL + Maestro pyramid. HIGH confidence.
- [Maestro Official Docs](https://docs.maestro.dev/get-started/supported-platforms/react-native) -- Setup, YAML flows, testID selectors. HIGH confidence.
- [Expo E2E with Maestro + EAS Workflows](https://docs.expo.dev/eas/workflows/examples/e2e-tests) -- Official Expo integration for Maestro CI. HIGH confidence.
- [PkgPulse: FlashList vs FlatList vs LegendList 2026](https://www.pkgpulse.com/blog/flashlist-vs-flatlist-vs-legendlist-react-native-lists-2026) -- List performance comparison. HIGH confidence.
- [Reanimated Performance Docs](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/) -- v4.2 New Architecture flags, shared value best practices. HIGH confidence.
- [FlashList + Reanimated Guide](https://shopify.github.io/flash-list/docs/guides/reanimated/) -- Shared value reset on recycling. HIGH confidence.
- [zustand-mmkv-storage NPM](https://registry.npmjs.org/zustand-mmkv-storage) -- Adapter for Zustand persist + MMKV. MEDIUM confidence (new package, ~120 weekly downloads, but simple adapter pattern).

---
*Stack research for: Momir Basic (React Native / Expo MTG utility app)*
*Researched: 2026-04-13*
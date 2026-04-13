# Project Research Summary

**Project:** Momir Basic (MTG Randomizer / Casual Companion)
**Domain:** React Native / Expo utility app for Magic: The Gathering casual play
**Researched:** 2026-04-13
**Confidence:** HIGH

## Executive Summary

Momir Basic is a React Native / Expo utility app serving the MTG casual play niche -- specifically the Momir Basic format where players pay mana to get a random creature card. The app already has a solid foundation with core features built (card generation, search, life counter, thermal printer, 11-language i18n), but it suffers from severe technical debt: oversized screen components (up to 2438 lines), a 7-level-deep provider tree causing re-render cascades, unvalidated API responses, and 28 empty catch blocks that swallow errors silently. The competitive landscape reveals three table-stakes gaps (dice roller, coin flip, commander damage tracking) that every rival app already ships, plus an opportunity to differentiate on speed -- no competitor prioritizes sub-second card generation.

The recommended approach is a two-track strategy: first, fix the structural problems that threaten stability and developer velocity (startup crash risk from unvalidated JSON.parse, provider re-render cascades, oversized components); second, close the competitive feature gaps and lean into speed differentiators. The stack research strongly supports migrating from React Context + AsyncStorage to Zustand + MMKV for client state, keeping TanStack Query exclusively for Scryfall API calls, adding Zod 4 validation at all system boundaries, and upgrading to Expo SDK 55 for New Architecture performance gains. Screen decomposition -- extracting feature hooks from 1000-2400-line files into focused, testable units -- is the single highest-leverage architectural change because it unblocks testability, parallel development, and feature velocity.

The key risks are: (1) Component extraction can break shared mutable refs between imperative native bridges (especially the printer subsystem) -- extract only self-contained hooks first, keep orchestration in the parent. (2) Performance regressions during refactoring can go undetected without automated benchmarks -- set up Reassure baselines before any structural changes. (3) The JSON.parse-on-startup crash is a live vulnerability that should be fixed before any refactoring begins.

## Key Findings

### Recommended Stack

The stack research identifies a clear migration path: upgrade to Expo SDK 55 for New Architecture performance and Router v7 navigation, adopt Zustand 5 + MMKV for client state (replacing 4 React Context providers), reserve TanStack Query for Scryfall API calls only, and add Zod 4 for runtime validation at system boundaries. The existing Zustand dependency is installed but unused; MMKV replaces AsyncStorage for settings/history persistence with ~30x faster synchronous reads. Jest 30 and Maestro replace the current fragmented testing setup. See [STACK.md](./STACK.md) for version matrices, compatibility notes, and installation commands.

**Core technologies:**
- **Expo SDK 55 (0.83.2 RN):** Mandatory New Architecture, Router v7 native navigation, Hermes bytecode diffing -- future-proofs the app
- **Zustand 5 + react-native-mmkv:** Client/UI state with synchronous persistence -- eliminates provider nesting and re-render cascades
- **TanStack Query 5:** Server state only (Scryfall API) -- stop misusing for local AsyncStorage reads
- **Zod 4:** Runtime validation at API and storage boundaries -- replaces unsafe `as` type casts and prevents startup crashes from corrupted data
- **@react-native-community/netinfo:** OS-level connectivity detection -- replaces 4-requests/minute Scryfall health polling
- **@shopify/flash-list:** Recycler-pattern list rendering -- 5-10x better than FlatList for card grids and history
- **Maestro:** Native E2E testing -- replaces Playwright (web-only) for actual device testing
- **Jest 30 + @testing-library/react-native 13:** Faster test runner with proper component integration tests

### Expected Features

The feature landscape reveals three missing table-stakes that every competitor ships, plus clear differentiators around speed and unique printer integration. See [FEATURES.md](./FEATURES.md) for competitive gap analysis and feature dependency graph.

**Must have (table stakes):**
- Dice roller (D4-D20) -- every MTG utility app has one; low effort, high impact gap
- Coin flip -- ubiquitous in competitors; trivial to implement
- Commander damage tracking -- Commander is the most popular format; current life counter lacks per-commander tracking
- Multi-player support (2-6 players) -- casual MTG is often multiplayer
- Offline/degraded mode -- players at tables with bad WiFi need cached cards

**Should have (competitive):**
- Sub-second card generation with pre-warming -- THE speed differentiator, no competitor prioritizes this
- One-handed swipe-to-reroll -- gesture-driven randomization, unique in the category
- Tiered haptic feedback -- "pack-cracking" emotional feedback loop, low effort
- Expanded Momir variants -- artifacts, enchantments, instants by CMC; Scryfall API already supports this
- Share card image -- social sharing drives word-of-mouth growth

**Defer (v2+):**
- Home screen widget -- requires native modules; research expo-widgets support first
- Planechase mode -- high effort; fills a gap but separate app territory
- Offline card pre-cache -- high effort; enables true instant display but needs SQLite migration
- Quick Actions / App Shortcuts -- medium effort, nice-to-have convenience

### Architecture Approach

The target architecture follows five core patterns: thin route files with fat screen components, feature hooks for business logic extraction, Zustand for client state with MMKV persistence, Zod validation at all system boundaries, and a single source of truth for domain concepts. The printer subsystem is the gold standard in this codebase -- its interface-based adapters, dependency injection, typed errors, and explicit state machine should be the template for all other subsystems. The most impactful structural change is decomposing oversized screen files (2438, 1238, 1113, 1055, 1066 lines) into screen components (<400 lines) plus focused feature hooks (<100 lines each). See [ARCHITECTURE.md](./ARCHITECTURE.md) for full decomposition plans and data flow diagrams.

**Major components:**
1. **Feature hooks** (`features/`) -- Extracted business logic: useCastFlow, useLifeCounter, usePrinterConnection; testable without rendering library
2. **Zustand stores** (`stores/`) -- Client state with MMKV persistence: settingsStore, historyStore; replace 2 Context providers, reduce tree from 7 to 4 levels
3. **Scryfall service with Zod** (`services/scryfall.ts`) -- API client with rate limiting, retry, and runtime schema validation at the boundary

### Critical Pitfalls

1. **JSON.parse crash on startup** -- AsyncStorage data corruption (disk errors, 6MB limit exceeded) crashes the app before error boundaries render. Wrap all persisted JSON.parse in try-catch with Zod safeParse; return defaults on failure. Fix before any refactoring.
2. **Component extraction breaks shared mutable refs** -- The 2438-line printer.tsx bridges 13 UI states and native module lifecycle; forced splitting creates orphaned code and ref timing bugs. Extract only self-contained hooks; keep ref-heavy orchestration in the parent component.
3. **Performance regression goes undetected during refactoring** -- No automated performance benchmarks exist. Set up Reassure baselines for the cast flow before any structural changes; measure on production builds on real devices.
4. **Context refactoring creates re-render cascades** -- Over-consolidating providers causes all consumers to re-render on any state change. Use Zustand with selector-based subscriptions; split value/action contexts for frequently-updating providers; never merge Settings + History.
5. **Native module bridge breaks under refactoring** -- Pin react-native-thermal-printer-driver to exact version; add TypeScript declarations; do not refactor printer adapter and enable New Architecture in the same phase. See [PITFALLS.md](./PITFALLS.md) for full recovery strategies and the "looks done but isn't" checklist.

## Implications for Roadmap

Based on combined research, suggested phase structure:

### Phase 1: Stability and Safety
**Rationale:** Startup crash risk from unvalidated JSON.parse and 28 empty catch blocks must be fixed before any structural refactoring. Performance baselines must exist before we change component structure. Security issues (service account keys in repo) need immediate remediation.
**Delivers:** Crash-safe startup, error classification, performance baselines, secured secrets
**Addresses:** Pitfall 1 (JSON.parse crash), Pitfall 5 (empty catches), Pitfall 6 (native module lifecycle), security mistakes
**Avoids:** Starting refactoring on an unstable foundation where regressions are invisible

### Phase 2: State Management and Provider Simplification
**Rationale:** Zustand + MMKV migration unblocks provider tree simplification, eliminates re-render cascades, and enables synchronous persistence. This must come before screen decomposition because extracted feature hooks will consume Zustand stores.
**Delivers:** settingsStore and historyStore with MMKV persistence, provider tree reduced from 7 to 4 levels, 500-entry history cap with FIFO eviction
**Uses:** Zustand 5, react-native-mmkv, zustand-mmkv-storage
**Implements:** Architecture Pattern 3 (Zustand for client state)
**Avoids:** Pitfall 3 (re-render cascades from provider consolidation), Pitfall 5 (unbounded history exceeding AsyncStorage 6MB limit)

### Phase 3: Screen Decomposition and Feature Hook Extraction
**Rationale:** Oversized files (2438, 1238, 1113, 1055, 1066 lines) are the primary bottleneck on developer velocity. Decomposing them unblocks testability and parallel feature development. Must follow Phase 2 so hooks have Zustand stores to consume.
**Delivers:** All screen files under 400 lines, feature hooks in features/, thin route files in app/, sub-components co-located in screens/
**Implements:** Architecture Pattern 1 (thin route, fat screen), Pattern 2 (feature hooks)
**Avoids:** Pitfall 1 (extracting hooks that depend on parent refs), Pitfall 2 (performance regression -- verify with Reassure after each extraction)

### Phase 4: Validation and Developer Experience
**Rationale:** Zod schemas for Scryfall API responses prevent undefined-field crashes when the API changes. Prettier + Husky + lint-staged enforce code quality at commit time. Removing unused dependencies reduces bundle size and confusion.
**Delivers:** ScryfallCardSchema with safeParse, eslint + Prettier + lint-staged config, unused dependency cleanup
**Uses:** Zod 4, Prettier 3, Husky 9, lint-staged 15
**Implements:** Architecture Pattern 4 (typed error boundaries)
**Avoids:** Pitfall from STACK.md (unsafe `as` type casts on API responses), console.log in production

### Phase 5: Testing Infrastructure
**Rationale:** Feature hooks extracted in Phase 3 are testable without a rendering library. Screen integration tests cover critical user flows. Maestro provides native E2E. This phase depends on Phase 3 because we need extracted hooks to test.
**Delivers:** Unit tests for feature hooks, screen integration tests for cast/search/life-counter flows, Maestro E2E flows, fixed jest.setup.js (no blanket console suppression)
**Uses:** Jest 30, @testing-library/react-native 13, Maestro
**Avoids:** Anti-pattern of zero screen-level tests, web-only E2E with Playwright

### Phase 6: Platform Upgrade and Performance
**Rationale:** Expo SDK 55 upgrade unlocks New Architecture, Router v7 native navigation, and Hermes bytecode diffing. FlashList improves list rendering. NetInfo replaces wasteful health polling. These are performance optimizations that should come after the codebase is stable, decomposed, and tested.
**Delivers:** Expo SDK 55, React Native 0.83.2, Router v7, FlashList integration, NetInfo connectivity, react-native-web upgrade or removal
**Avoids:** Pitfall 4 (native module breaks under New Architecture -- test printer separately on a branch)

### Phase 7: Feature Gaps -- Table Stakes
**Rationale:** Close the three competitive gaps that every rival app already ships. These are low-effort, high-impact additions that make the app feel complete.
**Delivers:** Dice roller (D4-D20), coin flip with animation, commander damage tracking in life counter, tiered haptic feedback
**Addresses:** Features from FEATURES.md Priority 1 (table stakes)
**Avoids:** Shipping a "Momir randomizer" that feels incomplete next to Lifetap or Lotus

### Phase 8: Feature Gaps -- Differentiators
**Rationale:** Double down on what makes this app special. Speed differentiators and unique features that no competitor offers.
**Delivers:** One-handed swipe-to-reroll, expanded Momir variants (artifacts/enchantments/instants), share card image, game timer
**Addresses:** Features from FEATURES.md Priority 2 (speed core) and Priority 3 (OS integration)
**Avoids:** Feature creep into anti-feature territory (no deck builder, no collection tracker)

### Phase Ordering Rationale

- **Stability first (Phase 1):** Cannot safely refactor code that crashes on startup or silently swallows errors. Performance baselines must exist before changing component structure.
- **State before decomposition (Phase 2 before 3):** Extracted feature hooks consume Zustand stores. Creating stores first means hooks can reference them immediately instead of a two-pass migration.
- **Decomposition before testing (Phase 3 before 5):** Feature hooks are the testable units. Without extraction, testing means rendering 2400-line screen components.
- **Platform upgrade late (Phase 6):** SDK 55 and New Architecture are high-value but risky. Do this on a stable, well-tested codebase where regressions are caught by the testing infrastructure from Phase 5.
- **Features after foundations (Phase 7-8):** Adding features to an unstable codebase increases maintenance burden. Stabilize first, then add features confidently.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 6 (Platform Upgrade):** Expo SDK 55 migration may surface breaking changes not documented in changelogs; printer native module compatibility with New Architecture needs testing on a branch
- **Phase 8 (Differentiators):** Home screen widget feasibility on Android (no Expo native support); swipe-to-reroll gesture conflicts with existing PanResponder on home screen need prototyping

Phases with standard patterns (skip research-phase):
- **Phase 1 (Stability):** Try-catch wrapping and error classification are mechanical; Zod safeParse for startup data is well-documented
- **Phase 2 (State Management):** Zustand + MMKV + persist is the 2026 consensus pattern; migration from Context is well-documented
- **Phase 3 (Decomposition):** Feature hook extraction follows established React patterns; printer subsystem provides the in-codebase template
- **Phase 5 (Testing):** Jest 30 + RNTL + Maestro have official guides; test patterns are standard
- **Phase 7 (Table Stakes):** Dice roller and coin flip are trivial; commander damage tracking is a known UX pattern

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified against official docs (Expo SDK 55 changelog, Zustand docs, MMKV benchmarks). Version compatibility matrix confirmed. |
| Features | MEDIUM | Competitive analysis based on app store listings and editorial reviews, not direct user research. Feature priority assumes Commander is the most popular format (well-supported by WotC data). |
| Architecture | HIGH | Patterns verified against official Expo guidance and multiple independent community sources. Decomposition plan is grounded in actual codebase line counts. Printer subsystem provides in-repo validation of patterns. |
| Pitfalls | HIGH | Critical pitfalls verified against official React Native docs, GitHub issues, and real post-mortems (EF-Map). Startup crash risk is a codebase-verified vulnerability. |

**Overall confidence:** HIGH

### Gaps to Address

- **Home screen widget feasibility:** Expo does not natively support Android widgets. Research whether expo-widgets (SDK 54+) or a custom native module is viable before committing to Phase 8 widget work.
- **Swipe-to-reroll gesture conflicts:** The home screen already uses PanResponder for hero art interaction. Adding a vertical swipe gesture for reroll may conflict. Needs prototyping before planning.
- **Planechase card database scope:** 103 planes + 11 phenomena from Scryfall -- the data volume and offline caching requirements need research before committing to this feature.
- **react-native-thermal-printer-driver + New Architecture:** The native module uses the old bridge architecture. Whether it works under Fabric/TurboModules (SDK 55 default) is unknown until tested on a branch. This is the single biggest unknown for the SDK 55 upgrade.
- **Zod 4 + Metro bundler:** Zod 4 sub-path exports may need `unstable_enablePackageExports` in Metro config for RN < 0.79. Verify this is resolved with SDK 55 (RN 0.83.2) before Phase 4.
- **zustand-mmkv-storage maturity:** Only ~120 weekly downloads. The adapter is simple (<1KB, zero dependencies), but fallback plan (manual wiring ~20 lines per store) should be documented.

## Sources

### Primary (HIGH confidence)
- [Expo SDK 55 Changelog](https://expo.dev/changelog/sdk-55) -- SDK 55 features, breaking changes, version matrix
- [How to Upgrade to SDK 55](https://expo.dev/blog/upgrading-to-sdk-55) -- Migration steps
- [Expo Router v55 Blog](https://expo.dev/blog/expo-router-v55-more-native-navigation-more-powerful-web) -- Native Tabs, Stack API, Zoom transitions
- [Expo App Folder Structure Best Practices](https://expo.dev/blog/expo-app-folder-structure-best-practices) -- Official thin route guidance
- [React Native Relay: Zustand + TanStack Query Guide](https://reactnativerelay.com/article/modern-state-management-react-native-zustand-tanstack-query) -- 2026 consensus pattern
- [PkgPulse: MMKV vs AsyncStorage vs expo-secure-store 2026](https://www.pkgpulse.com/blog/react-native-mmkv-vs-async-storage-vs-expo-secure-store-2026) -- Performance benchmarks
- [Zod 4 Release Notes](https://v4.zod.dev/v4) -- Performance improvements, RN compatibility
- [Callstack Reassure](https://github.com/callstack/reassure) -- Performance regression testing
- [CodeScene: Refactoring with Custom Hooks](https://codescene.com/blog/refactoring-components-in-react-with-custom-hooks) -- Hook extraction best practices
- [EF-Map: Refactoring a 9,000-Line Component](https://ef-map.com/blog/app-tsx-refactoring-custom-hooks) -- Post-mortem of failed forced splitting
- [WotC Official Momir Basic Format](https://magic.wizards.com/en/formats/momir-basic) -- Official format rules

### Secondary (MEDIUM confidence)
- [React Native App Architecture Patterns 2026](https://shahmeerrizwan.com/blog/react-native-app-architecture-patterns-2026) -- Feature-based folders, hook decomposition
- [React Native Relay: Testing Guide 2026](https://reactnativerelay.com/article/complete-guide-testing-react-native-apps-2026-unit-tests-e2e-maestro) -- Jest 30 + RNTL + Maestro pyramid
- [Maestro Official Docs](https://docs.maestro.dev/get-started/supported-platforms/react-native) -- Setup, YAML flows, testID selectors
- [PkgPulse: FlashList vs FlatList vs LegendList 2026](https://www.pkgpulse.com/blog/flashlist-vs-flatlist-vs-legendlist-react-native-lists-2026) -- List performance comparison
- [Draftsim Life Counter Rankings](https://draftsim.com/best-mtg-life-counter-app/) -- Competitive feature analysis
- [react-native-thermal-receipt-printer null adapter bug (#163)](https://github.com/HeligPfleigh/react-native-thermal-receipt-printer/issues/163) -- Native module lifecycle pitfalls

### Tertiary (LOW confidence)
- [zustand-mmkv-storage NPM](https://registry.npmjs.org/zustand-mmkv-storage) -- New package, ~120 weekly downloads
- [Lifetap, Lotus, AetherLife app store listings] -- Feature lists from store pages, not direct testing
- [Gauntlet MTG Tracker](https://apps.apple.com/us/app/gauntlet-mtg-tracker/id1466578932) -- Last updated 2023

---
*Research completed: 2026-04-13*
*Ready for roadmap: yes*

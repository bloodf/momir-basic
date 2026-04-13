# Requirements: Momir Basic

**Defined:** 2026-04-13
**Core Value:** The fastest, most delightful MTG random card experience — from tap to card in under a second, with zero friction.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Stability & Security

- [x] **STAB-01**: App does not crash on startup when AsyncStorage contains corrupted JSON (add try-catch around all JSON.parse in providers)
- [x] **STAB-02**: Service account keys removed from repo and loaded from CI secrets or environment variables
- [x] **STAB-03**: Build artifact (.aab) removed from repository root
- [x] **STAB-04**: All empty catch blocks classified — either handle explicitly or log with structured error type
- [ ] **STAB-05**: Unsafe JSON.parse on external Scryfall data replaced with Zod schema validation
- [ ] **STAB-06**: Scryfall API responses validated against Zod schemas before use

### Architecture & State Management

- [ ] **ARCH-01**: Replace SettingsProvider and HistoryProvider with Zustand stores (already installed but unused)
- [ ] **ARCH-02**: Replace AsyncStorage with react-native-mmkv for persistence (~30x faster, synchronous API)
- [ ] **ARCH-03**: Migrate NetworkProvider from Scryfall health polling (4 req/min) to @react-native-community/netinfo (zero network overhead)
- [ ] **ARCH-04**: Replace I18nProvider context with Zustand store for locale state
- [ ] **ARCH-05**: Flatten provider tree from 7 levels to 4 or fewer using composeProviders utility
- [ ] **ARCH-06**: Duplicated card type query logic consolidated into single CARD_TYPE_QUERIES map with exhaustiveness check
- [ ] **ARCH-07**: Module-scope Dimensions.get('window') replaced with useWindowDimensions hook for responsive updates

### Screen Decomposition

- [ ] **DECOMP-01**: Decompose printer.tsx (2438 lines) — extract hooks for printer discovery, connection, printing into screens/ or features/
- [ ] **DECOMP-02**: Decompose card.tsx (1238 lines) — extract face switching, printings, share/download into feature hooks
- [ ] **DECOMP-03**: Decompose life-counter.tsx (1113 lines) — extract life tracking, commander damage, game timer into feature hooks
- [ ] **DECOMP-04**: Decompose print-preview.tsx (1066 lines) — extract receipt preview, dithering pipeline into feature hooks
- [ ] **DECOMP-05**: Decompose home/index.tsx (1055 lines) — extract CMC stepper, hero art cache, animation into feature hooks
- [ ] **DECOMP-06**: Adopt thin route / fat screen pattern — app/ files become 3-line re-exports, screen logic in screens/
- [ ] **DECOMP-07**: All screen files under 400 lines after decomposition

### Developer Experience

- [ ] **DX-01**: Add Prettier for consistent formatting
- [ ] **DX-02**: Add Husky + lint-staged for pre-commit checks (lint, format, type-check)
- [ ] **DX-03**: Remove 29 console.log calls from production code, replace with structured logger
- [ ] **DX-04**: Add ESLint rule to prevent console.log in production code
- [x] **DX-05**: Add Reassure for React Native performance regression testing (baseline before refactoring)

### Testing

- [ ] **TEST-01**: Upgrade Jest to v30 for 15-30% faster execution
- [ ] **TEST-02**: Add screen-level integration tests with React Native Testing Library for all 5 tab screens
- [ ] **TEST-03**: Add Maestro for native E2E testing (declarative YAML flows)
- [ ] **TEST-04**: Add provider/store isolation tests (settings load/save, history CRUD, network state)
- [ ] **TEST-05**: Add coverage thresholds (80% target) to jest.config.js
- [ ] **TEST-06**: Pin react-native-thermal-printer-driver version and add integration test harness

### Platform & Performance

- [ ] **PERF-01**: Upgrade Expo SDK from 54 to 55 (unlocks Router v7 native navigation, Native Tabs, Apple Zoom transitions)
- [ ] **PERF-02**: Replace FlatList with FlashList for card history and search results (50%+ render improvement)
- [ ] **PERF-03**: Evaluate and resolve react-native-web version mismatch (0.21.x incompatible with React 19)
- [ ] **PERF-04**: Remove unused Zustand dependency declaration (or adopt it per ARCH-01)
- [ ] **PERF-05**: Eliminate inline StyleSheet.create in every screen render (move to module scope)

### Table Stakes Features

- [ ] **FEAT-01**: Add dice roller (d4, d6, d8, d10, d12, d20, d100) to game tools
- [ ] **FEAT-02**: Add coin flip to game tools
- [ ] **FEAT-03**: Add commander damage tracking to life counter (per-opponent damage tracker)
- [ ] **FEAT-04**: Add tiered haptic feedback on key interactions (card generation, life changes, dice rolls)

### Differentiator Features

- [ ] **DIFF-01**: Add swipe-to-reroll gesture on home screen (instant next card without tapping)
- [ ] **DIFF-02**: Add expanded Momir variants (artifacts, enchantments, instants, sorceries by CMC — only momir-vig.com offers this, no native app)
- [ ] **DIFF-03**: Add share card as image (screenshot + overlay for social sharing)
- [ ] **DIFF-04**: Add game timer / round timer to game tools
- [ ] **DIFF-05**: Add pre-caching of next card by CMC for sub-second perceived generation time

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Features

- **ADV-01**: Home screen Android widget for quick card generation
- **ADV-02**: Planechase integration (plane deck + planar die)
- **ADV-03**: Offline card cache for full app functionality without network
- **ADV-04**: Deep linking support (share card URL that opens in app)
- **ADV-05**: Card collection / favorites with sync

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend/server component | App is intentionally serverless, Scryfall-only |
| Real-time multiplayer | Not part of the Momir Basic concept |
| Deck builder | Different product category entirely |
| OAuth/authentication | No user accounts needed |
| Chat/social features | Not core to randomizer value |
| AI-powered card suggestions | Out of scope for randomizer use case |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| STAB-01 | Phase 1 | Complete |
| STAB-02 | Phase 1 | Complete |
| STAB-03 | Phase 1 | Complete |
| STAB-04 | Phase 1 | Complete |
| STAB-05 | Phase 4 | Pending |
| STAB-06 | Phase 4 | Pending |
| ARCH-01 | Phase 2 | Pending |
| ARCH-02 | Phase 2 | Pending |
| ARCH-03 | Phase 2 | Pending |
| ARCH-04 | Phase 2 | Pending |
| ARCH-05 | Phase 2 | Pending |
| ARCH-06 | Phase 2 | Pending |
| ARCH-07 | Phase 2 | Pending |
| DECOMP-01 | Phase 3 | Pending |
| DECOMP-02 | Phase 3 | Pending |
| DECOMP-03 | Phase 3 | Pending |
| DECOMP-04 | Phase 3 | Pending |
| DECOMP-05 | Phase 3 | Pending |
| DECOMP-06 | Phase 3 | Pending |
| DECOMP-07 | Phase 3 | Pending |
| DX-01 | Phase 4 | Pending |
| DX-02 | Phase 4 | Pending |
| DX-03 | Phase 4 | Pending |
| DX-04 | Phase 4 | Pending |
| DX-05 | Phase 1 | Complete |
| TEST-01 | Phase 5 | Pending |
| TEST-02 | Phase 5 | Pending |
| TEST-03 | Phase 5 | Pending |
| TEST-04 | Phase 5 | Pending |
| TEST-05 | Phase 5 | Pending |
| TEST-06 | Phase 5 | Pending |
| PERF-01 | Phase 6 | Pending |
| PERF-02 | Phase 6 | Pending |
| PERF-03 | Phase 6 | Pending |
| PERF-04 | Phase 6 | Pending |
| PERF-05 | Phase 6 | Pending |
| FEAT-01 | Phase 7 | Pending |
| FEAT-02 | Phase 7 | Pending |
| FEAT-03 | Phase 7 | Pending |
| FEAT-04 | Phase 7 | Pending |
| DIFF-01 | Phase 8 | Pending |
| DIFF-02 | Phase 8 | Pending |
| DIFF-03 | Phase 8 | Pending |
| DIFF-04 | Phase 8 | Pending |
| DIFF-05 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 45 total
- Mapped to phases: 45
- Unmapped: 0

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-13 after roadmap creation*
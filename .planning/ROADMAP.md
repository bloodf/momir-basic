# Roadmap: Momir Basic

## Overview

This roadmap transforms Momir Basic from a functional but debt-laden React Native app into a stable, fast, feature-complete MTG utility. The journey starts with eliminating crash risks and security vulnerabilities, then restructures state and screens for developer velocity, adds automated testing and validation, upgrades the platform, and finally ships the table-stakes and differentiator features that make this the fastest MTG randomizer available.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Stability & Security** - Crash-safe startup, error classification, performance baselines, secured secrets
- [ ] **Phase 2: State Management** - Zustand stores replace Context providers, MMKV replaces AsyncStorage, provider tree flattened
- [ ] **Phase 3: Screen Decomposition** - Oversized screen files decomposed into feature hooks, all under 400 lines
- [ ] **Phase 4: Validation & Developer Experience** - Zod schemas at API boundaries, Prettier/Husky/lint-staged enforced at commit time
- [ ] **Phase 5: Testing Infrastructure** - Jest 30, screen integration tests, Maestro E2E, coverage thresholds
- [ ] **Phase 6: Platform Upgrade & Performance** - Expo SDK 55, FlashList, NetInfo, inline StyleSheet elimination
- [ ] **Phase 7: Table Stakes Features** - Dice roller, coin flip, commander damage tracking, haptic feedback
- [ ] **Phase 8: Differentiator Features** - Swipe-to-reroll, expanded Momir variants, share card image, pre-caching

**Parallelization:**
- Phase 2 and Phase 4 can run in parallel (both depend only on Phase 1)
- Phase 6 and Phase 7 can run in parallel (both depend only on Phase 5)

## Phase Details

### Phase 1: Stability & Security
**Goal**: App starts reliably without crashes and does not expose secrets in the repository
**Depends on**: Nothing (first phase)
**Requirements**: STAB-01, STAB-02, STAB-03, STAB-04, DX-05
**Success Criteria** (what must be TRUE):
  1. App opens without crash even when AsyncStorage contains corrupted JSON data
  2. No service account keys or build artifacts exist in the repository
  3. Every catch block in the codebase either handles the error explicitly or logs it with a classified error type
  4. Reassure performance baselines exist for the home screen cast flow
**Plans**: 3 plans

Plans:
- [x] 01-01: Structured Logger & Error Classification (STAB-04)
- [x] 01-02: Crash Safety & Secret Removal (STAB-01, STAB-02, STAB-03)
- [x] 01-03: Reassure Performance Baselines (DX-05)

### Phase 2: State Management
**Goal**: App state flows through Zustand stores with fast, synchronous persistence and a shallow provider tree
**Depends on**: Phase 1
**Requirements**: ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05, ARCH-06, ARCH-07
**Success Criteria** (what must be TRUE):
  1. Settings and history data persists across app restarts using MMKV with synchronous reads
  2. Network connectivity state is detected by the OS without any Scryfall API health polling
  3. Provider tree is 4 levels or fewer
  4. Card type filter options come from a single CARD_TYPE_QUERIES map
  5. Screen layout updates immediately on device rotation or resize
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: Screen Decomposition
**Goal**: All screen files are under 400 lines with extracted, testable feature hooks
**Depends on**: Phase 2
**Requirements**: DECOMP-01, DECOMP-02, DECOMP-03, DECOMP-04, DECOMP-05, DECOMP-06, DECOMP-07
**Success Criteria** (what must be TRUE):
  1. All 5 decomposed screen files are under 400 lines
  2. Route files in app/ are thin re-exports with no business logic
  3. Feature hooks in features/ can be imported and called without rendering a component
  4. Reassure baselines show no performance regression after decomposition
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

### Phase 4: Validation & Developer Experience
**Goal**: All system boundaries validated with Zod schemas, development workflow enforced at commit time
**Depends on**: Phase 1
**Requirements**: STAB-05, STAB-06, DX-01, DX-02, DX-03, DX-04
**Success Criteria** (what must be TRUE):
  1. Scryfall API responses that do not match the expected schema are rejected gracefully rather than causing runtime errors
  2. Pre-commit hooks run lint, format, and type-check on every commit
  3. No console.log calls remain in production code; a structured logger is used instead
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD

### Phase 5: Testing Infrastructure
**Goal**: Critical user flows covered by automated tests at multiple levels
**Depends on**: Phase 3, Phase 4
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06
**Success Criteria** (what must be TRUE):
  1. Test suite runs on Jest 30 and completes in under 60 seconds
  2. Each of the 5 tab screens has at least one integration test covering its primary flow
  3. Maestro E2E flow can generate a random card on a physical device
  4. Test coverage meets or exceeds the 80% threshold
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

### Phase 6: Platform Upgrade & Performance
**Goal**: App runs on latest Expo SDK with measurably faster list rendering and OS-level connectivity
**Depends on**: Phase 5
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04, PERF-05
**Success Criteria** (what must be TRUE):
  1. App builds and runs on Expo SDK 55 with New Architecture enabled
  2. Card history and search result lists render measurably faster than baseline FlatList performance
  3. No inline StyleSheet.create calls remain in any screen render function
  4. react-native-web version mismatch is resolved or web support is explicitly scoped
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD
- [ ] 06-03: TBD

### Phase 7: Table Stakes Features
**Goal**: App matches or exceeds feature parity with competing MTG utilities
**Depends on**: Phase 5
**Requirements**: FEAT-01, FEAT-02, FEAT-03, FEAT-04
**Success Criteria** (what must be TRUE):
  1. Player can roll any standard die (d4 through d20 and d100) from the game tools screen
  2. Player can flip a coin with a result displayed
  3. Life counter tracks commander damage per opponent separately from life total
  4. Key interactions produce distinct haptic feedback patterns
**UI hint**: yes
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 8: Differentiator Features
**Goal**: App delivers unique, speed-focused experiences no competitor offers
**Depends on**: Phase 6
**Requirements**: DIFF-01, DIFF-02, DIFF-03, DIFF-04, DIFF-05
**Success Criteria** (what must be TRUE):
  1. Player can swipe on the home screen to instantly generate the next card without tapping
  2. Player can choose Momir variants beyond creatures (artifacts, enchantments, instants, sorceries by CMC)
  3. Player can share a card as a styled image suitable for social media
  4. Card generation appears sub-second by pre-caching the next card for the current CMC
**UI hint**: yes
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD

## Progress

**Execution Order:**
1 -> (2 || 4) -> 3 -> 5 -> (6 || 7) -> 8

Phases 2 and 4 can execute in parallel after Phase 1.
Phases 6 and 7 can execute in parallel after Phase 5.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Stability & Security | 0/3 | Planned | - |
| 2. State Management | 0/3 | Not started | - |
| 3. Screen Decomposition | 0/3 | Not started | - |
| 4. Validation & DX | 0/3 | Not started | - |
| 5. Testing Infrastructure | 0/3 | Not started | - |
| 6. Platform Upgrade & Performance | 0/3 | Not started | - |
| 7. Table Stakes Features | 0/2 | Not started | - |
| 8. Differentiator Features | 0/2 | Not started | - |
---
phase: 01-stability-security
plan: 03
subsystem: performance-baseline
tags: [reassure, perf-testing, home-screen, cast-flow]
dependency_graph:
  requires: []
  provides: [reassure-baseline, cast-perf-measurements]
  affects: [home-screen, ci]
tech_stack:
  added: [reassure@1.4.1]
  patterns: [measureRenders, perf-test.tsx, mocked-scryfall-api]
key_files:
  created:
    - path: __reassure__/home-cast.perf-test.tsx
      description: Reassure performance baseline for home screen cast flow
      lines: 252
  modified:
    - path: package.json
      description: Added reassure@1.4.1 dev dependency
    - path: .gitignore
      description: Added .reassure output directory
    - path: .github/workflows/ci.yml
      description: Added non-blocking Reassure CI job
    - path: reassure-tests.sh
      description: Updated to use bun instead of yarn
    - path: dangerfile.js
      description: Created by reassure init
decisions:
  - Reassure tests use .perf-test.tsx extension which is not matched by default Jest testMatch, so no testPathIgnorePatterns exclusion needed
  - Provider hooks (useSettings, useHistory, useNetwork, useI18n) mocked at hook level for measurement stability instead of using real providers with mocked AsyncStorage
  - Scryfall API fully mocked to eliminate network latency variance (Pitfall 5 from RESEARCH.md)
  - Animation system mocked (TimingAnimation, SpringAnimation) to avoid async timing flakiness in tests
  - CI integration uses continue-on-error: true per D-09 (non-blocking in Phase 1, transitions to blocking in Phase 2)
  - Cast button testID was already present (testID="cast-button") - no modification needed to HomeScreen
  - Hero art testID was already present (testID="hero-art") - no modification needed
metrics:
  duration: 34m
  completed: 2026-04-13
  tasks: 2
  files: 6
---

# Phase 1 Plan 3: Reassure Performance Baseline Summary

Reassure 1.4.1 installed and configured for Expo/Jest; home screen cast flow baseline established with 2 test cases measuring initial render (~4.9ms mean, 2 renders) and cast button press (~10.0ms mean, 5.5 renders).

## Tasks Completed

### Task 1: Install Reassure and configure for Expo/Jest

- Installed `reassure@1.4.1` as dev dependency via `bun add -D reassure@1.4.1`
- Ran `npx reassure init` which created `reassure-tests.sh` and `dangerfile.js`
- Updated `reassure-tests.sh` to use `bun` instead of `yarn`
- Added `.reassure/` to `.gitignore` (done by init, reformatted entry)
- Verified `.perf-test.tsx` files are NOT matched by Jest's default testMatch pattern, so no `testPathIgnorePatterns` change needed
- Ran `npx reassure --baseline` to verify installation (initial empty run confirmed setup)
- Main test suite continues to pass (248 tests, 18 suites)

**Commit:** `73830de` - `chore(01-03): install Reassure for performance regression testing`

### Task 2: Create home screen cast flow Reassure baseline test

- Created `__reassure__/home-cast.perf-test.tsx` with 2 test cases:
  1. `Home screen initial render` - measures baseline render of HomeScreen
  2. `Cast button press flow` - measures render after pressing cast button, waits for hero-art
- Built `ProvidersWrapper` with `QueryClientProvider` (retry: false for test stability)
- Mocked all external dependencies for deterministic measurements:
  - Scryfall API (`fetchRandomCard`, `fetchMultipleCards`, `fetchRandomBgCardForType`)
  - Provider hooks (`useSettings`, `useHistory`, `useNetwork`, `useI18n`)
  - Native modules (`expo-haptics`, `expo-linear-gradient`, `expo-image`, `expo-router`)
  - React Native Animated (`TimingAnimation`, `SpringAnimation`)
  - Component mocks (`Toast`, `HistorySheet`, `TypePicker`)
- Used `{ runs: 20 }` for statistical stability per RESEARCH.md Pitfall 5
- Cast button already had `testID="cast-button"`, hero art already had `testID="hero-art"`
- Established baseline measurements:
  - Initial render: mean 4.9ms, 2 renders per run, stdev 0.50ms
  - Cast button press: mean 10.0ms, 5.65 renders per run, stdev 0.38ms
- Added non-blocking Reassure CI job to `.github/workflows/ci.yml` per D-09

**Commit:** `50e1f41` - `feat(01-03): add Reassure baseline test for home screen cast flow`

## Deviations from Plan

No deviations - plan executed as written. The plan anticipated possibly needing to add a `testID="cast-button"` to the HomeScreen component, but it already existed (line 738).

## Verification Results

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `npx reassure --baseline` produces baseline.perf | PASS | `.reassure/baseline.perf` created with measurements |
| `npx reassure` comparison run succeeds | PASS | `.reassure/current.perf` created |
| `bun run test` passes (no interference) | PASS | 248 tests, 18 suites |
| `measureRenders` used in test file | PASS | 2 occurrences in home-cast.perf-test.tsx |
| `reassure@1.4.1` in devDependencies | PASS | package.json verified |
| Scryfall API mocked | PASS | All 3 fetch functions mocked with stable data |
| CI runs Reassure non-blocking (D-09) | PASS | continue-on-error: true in ci.yml |

## Known Stubs

No stubs found. All mock data returns realistic Card objects with all required fields.

## Threat Flags

No new threat surfaces introduced beyond what was in the plan's threat model. The test mocks network calls, eliminating the test-environment-to-production trust boundary concern.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `__reassure__/home-cast.perf-test.tsx` | FOUND |
| `.reassure/baseline.perf` | FOUND |
| `01-03-SUMMARY.md` | FOUND |
| Commit `73830de` | FOUND |
| Commit `50e1f41` | FOUND |
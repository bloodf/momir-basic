---
phase: 02
slug: state-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7.0 + jest-expo 54.0.0 |
| **Config file** | `jest.config.js` (root) |
| **Quick run command** | `bun run test -- --testPathPattern="<store-name>" -u` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test -- --testPathPattern="<affected-store>" -u`
- **After every plan wave:** Run `bun run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | ARCH-01 | — | N/A | unit | `bun run test -- --testPathPattern="settingsStore" -u` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | ARCH-01 | — | N/A | unit | `bun run test -- --testPathPattern="historyStore" -u` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | ARCH-02 | T-02-01 | Corrupted MMKV data returns defaults, clears key | unit | `bun run test -- --testPathPattern="mmkv-storage" -u` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | ARCH-02 | — | N/A | unit | `bun run test -- --testPathPattern="mmkv-storage" -u` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 1 | ARCH-03 | — | N/A | unit | `bun run test -- --testPathPattern="networkStore" -u` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 1 | ARCH-03 | — | N/A | unit | `bun run test -- --testPathPattern="networkStore" -u` | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 1 | ARCH-04 | — | N/A | unit | `bun run test -- --testPathPattern="i18nStore" -u` | ❌ W0 | ⬜ pending |
| 02-05-01 | 05 | 2 | ARCH-05 | — | N/A | integration | Manual inspection of `_layout.tsx` | N/A | ⬜ pending |
| 02-06-01 | 06 | 2 | ARCH-06 | — | N/A | unit | `bun run test -- --testPathPattern="cardTypes" -u` | ❌ W0 | ⬜ pending |
| 02-07-01 | 07 | 2 | ARCH-07 | — | N/A | manual | `grep -r "Dimensions.get" app/ components/` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/stores/mmkv-storage.test.ts` — covers ARCH-02 (adapter: getItem, setItem, removeItem, null mapping, corrupted data)
- [ ] `__tests__/stores/settingsStore.test.ts` — covers ARCH-01 (settings load/save/update/printer prefs)
- [ ] `__tests__/stores/historyStore.test.ts` — covers ARCH-01 (addCard, addCards, removeCard, clearHistory, persistence)
- [ ] `__tests__/stores/networkStore.test.ts` — covers ARCH-03 (isOnline updates, cold-start suppression, toast side-effects)
- [ ] `__tests__/stores/i18nStore.test.ts` — covers ARCH-04 (locale switch, t derivation, scryfallLang mapping)
- [ ] `__tests__/constants/cardTypes.test.ts` — covers ARCH-06 (CARD_TYPE_QUERIES exhaustiveness, query generation)
- [ ] `__mocks__/react-native-mmkv.js` — MMKV mock for Jest tests
- [ ] `__mocks__/@react-native-community/netinfo.js` — NetInfo mock for Jest tests
- [ ] Update `jest.config.js` moduleNameMapper: Add entries for react-native-mmkv and @react-native-community/netinfo

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Provider tree depth is 4 or fewer | ARCH-05 | Structural verification of component tree | Inspect `app/_layout.tsx` — count nested providers |
| No module-scope Dimensions.get calls remain | ARCH-07 | Grep-based source verification | `grep -r "Dimensions.get" app/ components/` returns no results |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
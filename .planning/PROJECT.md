# Momir Basic

## What This Is

Momir Basic is a React Native / Expo mobile app for Magic: The Gathering players that serves as a random card generator and game utility. It fetches random MTG cards from the Scryfall API based on converted mana cost (Momir-style), supports thermal printer output for physical card slips, and provides game tools like a life counter. Available on Android, iOS, and web.

## Core Value

The fastest, most delightful MTG random card experience — from tap to card in under a second, with zero friction.

## Requirements

### Validated

- ✓ Random card fetching by CMC (Momir mode) — existing
- ✓ Scryfall API integration with rate limiting and retry — existing
- ✓ Card detail modal with art, mana cost, type, oracle text — existing
- ✓ Scryfall search with type and CMC filters — existing
- ✓ Life counter game tool — existing
- ✓ Thermal printer integration (BLE, Classic BT, TCP) — existing
- ✓ Print preview with ESC/POS receipt generation — existing
- ✓ Card history with search/filter — existing
- ✓ Settings and printer setup screens — existing
- ✓ 11-language i18n support — existing
- ✓ CI/CD with GitHub Actions + EAS Build/Submit — existing
- ✓ Android Play Store auto-publish pipeline — existing

### Active

- [ ] Eliminate security vulnerabilities (service account keys in repo, unvalidated API responses)
- [ ] Refactor oversized screen components (home 377 lines, search 452 lines, game 275 lines)
- [ ] Replace duplicated card type query logic with single source of truth
- [ ] Remove 29 console.log calls from production code
- [ ] Fix silent error swallowing in providers
- [ ] Improve screen-level test coverage (currently zero)
- [ ] Optimize module-scope Dimensions.get('window') for responsive updates
- [ ] Modernize UI with consistent design language and faster interactions
- [ ] Reduce provider nesting depth (6+ levels)
- [ ] Improve offline experience and network resilience
- [ ] Add missing integration tests for printer subsystem

### Out of Scope

- Backend/server component — app is intentionally serverless, Scryfall-only
- Real-time multiplayer — not part of the Momir Basic concept
- Deck builder — different product category
- OAuth/authentication — no user accounts needed

## Context

**Technical environment:**
- React Native 0.81.5 with New Architecture enabled
- Expo SDK 54 with Expo Router 6 (file-based routing)
- TypeScript strict mode, React 19
- Context-based state (no Zustand despite it being listed as dependency)
- TanStack React Query for async data
- SQLite for printer persistence, AsyncStorage for app settings/history

**Known issues from codebase map:**
- CRITICAL: Service account keys committed to repo root and play/ directory
- HIGH: Oversized screen components (home, search, game need splitting)
- HIGH: Silent error swallowing in providers
- HIGH: No screen-level integration tests
- HIGH: Build artifact (.aab) in repo root
- MEDIUM: Duplicated card type query logic
- MEDIUM: Unvalidated Scryfall API responses
- MEDIUM: react-native-web version mismatch
- MEDIUM: Provider nesting depth (6+ levels)

**Positive patterns to preserve:**
- Well-structured printer service architecture (layered: adapters → registry → render)
- Proper error types for Scryfall API (ScryfallApiError with classification)
- Immutable state update patterns
- Zod available for validation (already installed)
- TypeScript strict mode enabled
- Printer state machine is explicit and well-documented

## Constraints

- **Tech Stack**: Must remain React Native / Expo — no framework migration
- **API**: Scryfall is the sole data source (public, no auth, rate-limited)
- **Hardware**: Thermal printer integration must continue working on Android
- **Platforms**: Android (primary), iOS (secondary), Web (limited)
- **Performance**: Card display must feel instant (< 1s from tap to card)
- **Offline**: App must work with degraded network (cards cached, search limited)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|----------|---------|
| Context over Zustand for state | Current codebase uses React Context consistently | — Pending (evaluate during refactor) |
| Keep Scryfall as sole API | No backend needed, public API is sufficient | ✓ Good |
| Expo Router file-based routing | Standard Expo pattern, typed routes | ✓ Good |
| Printer adapter pattern | Enables testing with FakePrinterAdapter | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-13 after initialization*
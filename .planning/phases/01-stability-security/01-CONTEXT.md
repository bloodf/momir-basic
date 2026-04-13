# Phase 1: Stability & Security - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the app start reliably without crashes, remove all secrets from the repository, classify every catch block, and establish Reassure performance baselines before any structural refactoring begins. This is a prerequisite phase — all subsequent phases depend on a stable, safe foundation.

**Scope:**
- STAB-01: JSON.parse crash safety in providers
- STAB-02: Service account key removal from repo
- STAB-03: Build artifact removal from repo
- STAB-04: Empty catch block classification and structured logging
- DX-05: Reassure performance baselines for home screen cast flow

**NOT in scope:** Zustand migration (Phase 2), Zod validation (Phase 4), screen decomposition (Phase 3), testing infrastructure (Phase 5)

</domain>

<decisions>
## Implementation Decisions

### Error Logging Strategy
- **D-01:** Use a lightweight structured logger (`utils/logger.ts`) with severity levels (error, warn, info, debug) that wraps `console.error`/`console.warn` in development and is a no-op in production. Replace all 29 `console.log` calls and all empty `catch(() => {})` blocks with classified logger calls.
- **D-02:** Error classification follows the pattern from the printer subsystem: each catch block must either handle the error (recovery action) or log it with a typed error category (e.g., `storage`, `network`, `navigation`, `printer`). No silent swallowing.
- **D-03:** For the 8 identified empty catch blocks: classify each by intent. `Linking.openURL` catches = `navigation` (log warn), `AsyncStorage.setItem` catches = `storage` (log error), `mergeDiscoveredWithRegistry` catches = `printer` (log warn).

### Crash Safety
- **D-04:** Wrap all `JSON.parse` calls on persisted data with try-catch that falls back to defaults. Specifically: `SettingsProvider` (line ~30 of providers/SettingsProvider.tsx) and `HistoryProvider` (providers/HistoryProvider.tsx), and `i18n` locale load (i18n/index.ts line ~126). On parse failure: log the error as `storage` category with the key name, return default value, and clear the corrupted key.
- **D-05:** The fallback-on-corruption pattern should return defaults AND clear the corrupted key from AsyncStorage to prevent repeated crash-on-startup loops.

### Secret Removal
- **D-06:** Move `google-play-service-account.json` and `play/momir-basic-play-store-28cdc1226840.json` out of the repo. Use EAS environment variables (`GOOGLE_PLAY_SERVICE_ACCOUNT_KEY`) instead of file paths. Update `eas.json` to reference the env var. Add a pre-commit hook that blocks files matching `*service-account*` patterns.
- **D-07:** Remove any `.aab` build artifacts from repo root. Add `*.aab` to `.gitignore` if not already present.

### Reassure Baselines
- **D-08:** Set up Reassure for the home screen "cast" flow only (the core value interaction). This is the baseline that must not regress during Phases 2-3. Additional flows can be added in Phase 5.
- **D-09:** Run Reassure in CI as a non-blocking check initially (Phase 1). Block on regressions starting Phase 2.

### Claude's Discretion
- Logger implementation details (API design, transport, formatter)
- Exact Reassure test scenarios and threshold configuration
- Pre-commit hook implementation (Husky vs native git hooks — decide in Phase 4 when Husky is added)
- `.aab` file detection and removal verification

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Codebase Map (current state)
- `.planning/codebase/CONCERNS.md` — Security concerns (service account keys, unvalidated JSON.parse, empty catches) and maintainability concerns (silent error swallowing, console.log calls)
- `.planning/codebase/CONVENTIONS.md` — Current error handling patterns, logging conventions, TypeScript usage
- `.planning/codebase/ARCHITECTURE.md` — Provider tree structure, SettingsProvider/HistoryProvider patterns, i18n locale persistence

### Research (best practices)
- `.planning/research/PITFALLS.md` — AsyncStorage corruption crash risk, native module lifecycle fragility, performance regression during refactoring
- `.planning/research/STACK.md` — Reassure setup recommendations, structured logging patterns

### Project Context
- `.planning/PROJECT.md` — Core value (sub-second card generation), constraints, known issues
- `.planning/REQUIREMENTS.md` — STAB-01 through STAB-04, DX-05 with full descriptions

### Key Source Files (to be modified)
- `providers/SettingsProvider.tsx` — JSON.parse without try-catch (line ~30), AsyncStorage.setItem with empty catch
- `providers/HistoryProvider.tsx` — JSON.parse without try-catch, AsyncStorage operations
- `i18n/index.ts` — AsyncStorage.setItem with empty catch (line 126), locale JSON.parse
- `app/(tabs)/settings/index.tsx` — Linking.openURL empty catch (line 47)
- `app/(tabs)/settings/printer.tsx` — mergeDiscoveredWithRegistry empty catch (line 401)
- `app/(tabs)/(home)/index.tsx` — empty catch (line 270)
- `eas.json` — Service account key file path references (lines 33, 44)
- `google-play-service-account.json` — To be removed
- `play/momir-basic-play-store-28cdc1226840.json` — To be removed

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Printer error model** (`services/printer/adapters/port.ts`): `PrinterAdapterError` with `PrinterErrorCode` enum — this is the pattern to follow for the structured logger's error classification
- **Zod** (already installed as `zod@^4.3.6`): Available for validation but not used yet. Phase 4 will expand usage to Scryfall API responses.
- **TypeScript strict mode**: Enabled — any new logger must have full type safety

### Established Patterns
- **Error hierarchy**: Printer subsystem uses typed error classes with codes. The structured logger should use a similar `ErrorCategory` enum.
- **AsyncStorage pattern**: Providers use `useQuery` + `useMutation` with TanStack Query for async persistence. JSON.parse happens inside `queryFn`. Try-catch must wrap these parse calls.
- **Console usage**: 29 `console.log` calls in production code, 8 empty catch blocks. Both need replacing with the structured logger.

### Integration Points
- **New logger** (`utils/logger.ts`): Must be importable from all providers and screens without creating circular dependencies. No React imports — pure utility.
- **EAS config** (`eas.json`): Must update `serviceAccountKeyPath` references to use environment variable pattern
- **Reassure**: Add as dev dependency. Baseline test file at `__reassure__/home-cast.test.tsx`

</code_context>

<specifics>
## Specific Ideas

- The printer subsystem's `PrinterAdapterError` + `PrinterErrorCode` pattern is the gold standard for error handling — replicate its approach for the app-wide logger
- Corrupted AsyncStorage must be cleared on failure, not just ignored — otherwise the app re-crashes on every startup
- Reassure baseline must measure the core "tap to card" flow — this is the metric that must never regress

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-stability-security*
*Context gathered: 2026-04-13*
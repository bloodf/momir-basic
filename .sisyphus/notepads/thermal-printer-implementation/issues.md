# Issues, Blockers, and Gotchas

## Testing + Documentation Scoping Report

### Codebase Map

**File Counts:**
- `expo/app/` — 19 files (~5,812 lines)
- `expo/components/` — 8 files (~1,543 lines)
- `expo/providers/` — 2 files (~184 lines)
- `expo/hooks/` — 0 files (no custom hooks exist)
- `expo/types/index.ts` — 222 lines
- `expo/services/scryfall.ts` — 422 lines (only non-printer service)
- `expo/utils/` — No utils directory (constants in `/expo/constants/`)
- `expo/jest.config.js` — 23 lines
- `expo/jest.setup.js` — 11 lines
- `expo/__mocks__/` — 4 mock files

---

#### `expo/app/` — Screens/Routes (Priority Order for Testing)

| File | Lines | Purpose | Test Priority |
|------|-------|---------|---------------|
| `services/scryfall.ts` | 422 | Scryfall API client - card fetching, search, autocomplete, advanced query parsing | **HIGH** |
| `app/(tabs)/(home)/index.tsx` | 687 | Main card casting screen with CMC selector, type picker, animated card fetching | **HIGH** |
| `app/card.tsx` | 1086 | Card detail modal - full card view, reroll, print, share, printings | **HIGH** |
| `app/(tabs)/settings/printer.tsx` | 819 | Printer setup/discovery with BLE scanning | **HIGH** |
| `app/life-counter.tsx` | 951 | Life counter for 2/4 player games with multiple counter types | **MEDIUM** |
| `app/(tabs)/search/index.tsx` | 462 | Card search with filters, autocomplete, pagination | **HIGH** |
| `components/SearchFilters.tsx` | 885 | Complex filter UI - colors, type, CMC, rarity, format, set, artist | **HIGH** |
| `app/(tabs)/settings/index.tsx` | 336 | Settings (printer config, card fetch options, language) | **MEDIUM** |
| `app/(tabs)/game/index.tsx` | 396 | Game mode selector (Standard, Commander, Brawl, etc.) | **LOW** |
| `components/TypePicker.tsx` | 155 | Modal type selector with descriptions | **MEDIUM** |
| `providers/SettingsProvider.tsx` | 92 | App settings state via AsyncStorage + React Query | **HIGH** |
| `providers/HistoryProvider.tsx` | 92 | Card history with useFilteredHistory hook | **MEDIUM** |
| `app/(tabs)/history/index.tsx` | 173 | Card history with search/filter | **LOW** |
| `app/print-preview.tsx` | 563 | Print preview screen for thermal receipt | **MEDIUM** |
| `components/CardListItem.tsx` | 164 | Card list row with thumbnail, mana cost, rarity | **LOW** |
| `types/index.ts` | 222 | Core domain types, migration functions | **MEDIUM** |
| `components/OracleText.tsx` | 116 | Card text rendering with mana symbol tokens | **LOW** |

---

#### Scryfall Service (`services/scryfall.ts`) — HIGHEST TEST PRIORITY

**Functions needing tests:**
- `fetchRandomCard()` - Random card by type/CMC with localization
- `fetchMultipleCards()` - Batch card fetching  
- `searchCards()` - Paginated search
- `autocompleteCardName()` - Name suggestions
- `fetchCardPrintings()` - All printings of a card
- `fetchSets()` - MTG set list
- `parseAdvancedSyntax()` - Advanced search query parsing (R:, T:, F:, S:, A:, mana shortcuts)
- `fetchRandomBgCardForType()` - Background art fetching

**Complexity:** MEDIUM - Rate limiting, retry logic, localization support, complex query building

---

### Current Test Coverage

**Status: ZERO coverage outside `expo/__tests__/printer/`**

| Area | Test Files | Lines Covered |
|------|------------|---------------|
| `services/scryfall.ts` | 0 | 0 |
| `app/*` screens | 0 | 0 |
| `components/*` | 0 | 0 |
| `providers/*` | 0 | 0 |
| `types/index.ts` | 0 | 0 |
| `printer/` services | 8 | Full coverage |

**Jest Infrastructure (already configured):**
- ✅ `jest-expo` preset in `jest.config.js`
- ✅ `@testing-library/react-native` installed
- ✅ Jest setup with 10s timeout, console mute
- ✅ Module mocks for: `react-native-thermal-pos-printer`, `expo-sqlite`, `expo-haptics`, `expo-media-library`
- ✅ Coverage collection configured for `app/**`, `services/**`, `providers/**`, `types/**`
- ✅ Full SQLite mock in `__mocks__/expo-sqlite.js` (236 lines)

**What's missing:**
- ❌ No tests for any non-printer code
- ❌ No mock for `@tanstack/react-query` (needs inline mocks or library mock)
- ❌ No mock for `AsyncStorage` (but could use `@react-native-async-storage/async-storage/jest`)
- ❌ No test utility exports (render with providers)

---

### Testing Strategy Proposal

#### Recommended Test Types by Area

| Area | Test Type | Rationale |
|------|-----------|------------|
| `services/scryfall.ts` | **Unit tests** | Pure functions, no UI, easy to mock fetch |
| `providers/*` | **Unit tests** | State logic, can test with act() |
| `components/SearchFilters.tsx` | **Component tests** | Complex UI logic, filter building |
| `components/TypePicker.tsx` | **Component tests** | Modal interaction |
| `components/OracleText.tsx` | **Component tests** | Text rendering |
| `components/ManaCost.tsx` | **Component tests** | Simple rendering |
| `app/*` screens | **Integration tests** | Heavy React Query, need provider wrapping |
| `types/index.ts` | **Unit tests** | Migration functions, type guards |

---

#### Recommended Directory Structure

```
expo/
├── __tests__/                      # Top-level tests
│   ├── services/
│   │   └── scryfall.test.ts
│   ├── providers/
│   │   ├── SettingsProvider.test.tsx
│   │   └── HistoryProvider.test.tsx
│   ├── components/
│   │   ├── SearchFilters.test.tsx
│   │   ├── TypePicker.test.tsx
│   │   ├── OracleText.test.tsx
│   │   ├── ManaCost.test.tsx
│   │   └── CardListItem.test.tsx
│   ├── screens/
│   │   └── (home)/index.test.tsx
│   ├── types/
│   │   └── index.test.ts
│   └── jest.setup.js
├── __mocks/                         # Existing - add more as needed
└── jest.config.js                   # Already exists
```

**Alternative:** Co-located `__tests__/` per module (like printer) — but **top-level is better** for:
- Shared test utilities and setup
- Easier CI configuration
- Avoids confusion with expo `__tests__` convention

---

#### Mock Strategy

| Dependency | Mock Strategy |
|------------|----------------|
| `@tanstack/react-query` | Create `__mocks__/@tanstack/react-query.js` with QueryClientProvider wrapper |
| `AsyncStorage` | Use `@react-native-async-storage/async-storage/jest` built-in |
| `expo-sqlite` | Already mocked in `__mocks__/expo-sqlite.js` |
| `expo-haptics` | Already mocked |
| `expo-media-library` | Already mocked |
| `react-native-thermal-pos-printer` | Already mocked |
| `i18n-js` | Mock `I18n.t` to return translation keys |

---

#### Priority Order for First Tests

1. **Phase 1: `services/scryfall.ts`** (Easiest to start)
   - `parseAdvancedSyntax()` — pure function, no mocks needed
   - `fetchRandomCard()` — mock fetch
   - `searchCards()` — mock fetch

2. **Phase 2: `providers/`** (State logic)
   - SettingsProvider — test AsyncStorage sync
   - HistoryProvider — test add/remove/search

3. **Phase 3: `components/SearchFilters.tsx`** (Complex UI)
   - Filter building logic
   - User interaction

4. **Phase 4: Screen integration tests** (Most effort)
   - Wrap screens with providers
   - Test React Query mutations

---

### Documentation Gaps + Proposed Structure

#### Current Documentation Status

| Item | Status | Location |
|------|--------|----------|
| App overview | ❌ None | README.md exists but minimal |
| Architecture | ❌ None | Code only |
| Screen descriptions | ❌ None | Code only |
| Provider state shape | ❌ None | Code only |
| Scryfall API usage | ❌ None | Code only |
| Card type system | ❌ None | Code only (`constants/cardTypes.ts`) |
| i18n structure | ❌ None | Code only |
| Printer integration | ❌ None | Code only |
| Settings persistence | ❌ None | Code only |
| Type definitions | ⚠️ Partial | `types/index.ts` with JSDoc |

---

#### Proposed `docs/` Structure

```
docs/
├── README.md                         # What is Rork Momir Basic
├── architecture/
│   ├── overview.md                   # High-level architecture
│   ├── providers.md                   # SettingsProvider, HistoryProvider
│   ├── services.md                    # Scryfall service
│   └── types.md                      # Core types reference
├── screens/
│   ├── home.md                       # Main casting screen
│   ├── search.md                     # Card search
│   ├── card-detail.md                # Card modal
│   ├── life-counter.md               # Life counter
│   └── printer-setup.md              # Printer configuration
├── components/
│   ├── search-filters.md             # Filter system
│   ├── mana-cost.md                  # Mana display
│   └── oracle-text.md                # Card text rendering
├── i18n/
│   ├── setup.md                      # How i18n works
│   └── contributing.md               # Adding translations
├── testing/
│   ├── setup.md                      # Jest, Testing Library
│   ├── mocking.md                    # Mock strategies
│   └── component-testing.md           # How to test components
 └── troubleshooting/

---

## Task 10 Verification Notes

- `cd expo && bun run test -- --runInBand` currently fails in pre-existing `__tests__/services/scryfall.test.ts` assertions unrelated to `print-preview.tsx`.
- `cd expo && bun run typecheck` currently fails because `expo/package.json` does not define a `typecheck` script.
- Fallback check `cd expo && bunx tsc --noEmit` also fails due to existing repository issues outside this task, including CommonJS-style `module` usage in `expo/__mocks__/**` and stale printer settings screen references to removed `PrinterPreferences` fields (`name`, `address`, `type`) plus missing `PrinterDevice` export.
    ├── common-issues.md
    └── printer-problems.md
```

---

#### Priority Documentation Gaps

1. **HIGH PRIORITY:**
   - Architecture overview (needed for onboarding)
   - Scryfall service API documentation (complex query building)
   - Provider state documentation (what persists, how)

2. **MEDIUM PRIORITY:**
   - Screen flow documentation
   - Card type system explanation
   - Search filter syntax (R:, T:, F:, etc.)

3. **LOW PRIORITY:**
   - Component library docs
   - i18n contributor guide
   - Testing guide

---

### Summary

- **~8,200 lines of untested code** across screens, components, providers, services, and types
- **Jest infrastructure is ready** — jest-expo configured, mocks exist for native modules
- **No custom hooks** — all logic embedded in providers/screens

---

## Documentation task follow-up issues

- `bun run lint` in `expo/` still fails because of pre-existing source issues unrelated to docs edits:
  - `app/card.tsx` has `react-hooks/rules-of-hooks` errors
  - several files have existing `import/no-named-as-default` warnings
  - `app/print-preview.tsx` and `components/SearchFilters.tsx` have existing warnings

- There is no configured Markdown LSP in this workspace, so `lsp_diagnostics` cannot validate `.md` files directly.
- **Scryfall service is the best first target** — pure functions, no UI dependencies
- **Documentation is entirely code-only** — significant onboarding risk
- **Heavy React Query usage** means integration tests need careful provider setup

## Task 9 verification blockers encountered

- `bunx tsc --noEmit` initially failed on pre-existing TypeScript issues outside the printer screen itself:
  - CommonJS `module.exports` in three `expo/__mocks__/*.ts` files without Node typings
  - `expo/app/(tabs)/settings/index.tsx` still referenced removed legacy `settings.printer.name`
- Full Jest initially failed on an existing Scryfall split-card mapping expectation; `mapScryfallCard(...)` needed to prefer first-face text/mana fields when `card_faces` is present.

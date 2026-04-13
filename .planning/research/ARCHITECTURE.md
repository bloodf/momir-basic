# Architecture Research

**Domain:** React Native / Expo MTG utility app (Momir Basic)
**Researched:** 2026-04-13
**Confidence:** HIGH (codebase analysis + verified community patterns + official Expo guidance)

## Standard Architecture

### System Overview (Target Architecture)

```
┌──────────────────────────────────────────────────────────────────┐
│                     Presentation Layer                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐│
│  │ Route Files  │ │ Screen Comp │ │ UI Components│ │  Bottom    ││
│  │ (app/) thin  │ │ (screens/)  │ │ (components/)│ │  Sheets    ││
│  └──────┬───────┘ └──────┬──────┘ └──────┬──────┘ └─────┬──────┘│
│         │                │               │               │       │
├─────────┴────────────────┴───────────────┴───────────────┴───────┤
│                     Feature Hooks Layer                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐│
│  │ useCastFlow  │ │useLifeGame  │ │useSearch    │ │usePrinter  ││
│  │ useHeroArt   │ │useLifeCounter│ │useFilters   │ │Connection  ││
│  └──────┬───────┘ └──────┬──────┘ └──────┬──────┘ └─────┬──────┘│
│         │                │               │               │       │
├─────────┴────────────────┴───────────────┴───────────────┴───────┤
│                     State Layer                                  │
│  ┌─────────────────┐ ┌──────────────────┐ ┌──────────────────┐  │
│  │ TanStack Query   │ │ Zustand Stores   │ │ Local useState  │  │
│  │ (server state)   │ │ (client state)   │ │ (transient UI)  │  │
│  └────────┬────────┘ └────────┬─────────┘ └────────┬─────────┘  │
│           │                    │                     │            │
├───────────┴────────────────────┴─────────────────────┴────────────┤
│                     Service Layer                                │
│  ┌─────────────┐ ┌──────────────────────────────────────────────┐│
│  │ Scryfall API │ │ Printer Subsystem (preserve as-is)           ││
│  │ Client       │ │ adapters → registry → storage → render      ││
│  └──────┬───────┘ └────────────────────┬─────────────────────────┘│
│         │                              │                          │
├─────────┴──────────────────────────────┴──────────────────────────┤
│                     Persistence Layer                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌────────────────────┐ │
│  │ AsyncStorage     │ │ SQLite           │ │ Query Cache       │ │
│  │ (settings, i18n) │ │ (printer, history│ │ (Scryfall cards)  │ │
│  └─────────────────┘ └─────────────────┘ └────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|---------------|----------------|
| **Route files** (`app/`) | Navigation wiring only -- import screen, export default | Thin re-exports from `screens/` |
| **Screen components** (`screens/`) | UI composition + screen-level hooks orchestration | <400 lines, delegates to feature hooks |
| **Feature hooks** (`features/`) | Business logic: data fetching, state transitions, domain logic | Pure logic, no JSX, testable in isolation |
| **UI components** (`components/`) | Reusable visual primitives and compositions | Presentational, accept props, no side effects |
| **Zustand stores** (`stores/`) | Persisted client state: settings, history, printer preferences | MMKV or AsyncStorage persistence |
| **TanStack Query** | Server state: Scryfall API cache, offline persistence | Query hooks wrapping service calls |
| **Scryfall service** | API client: rate limiting, retry, error classification | Preserve existing pattern, add Zod validation |
| **Printer subsystem** | Hardware abstraction, discovery, ESC/POS rendering | PRESERVE -- already well-structured |

## Recommended Project Structure

```
src/
├── app/                          # Expo Router routes (THIN files only)
│   ├── _layout.tsx               # Root layout: providers + navigation
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tab navigator
│   │   ├── (home)/
│   │   │   └── index.tsx         # import HomeScreen, export default
│   │   ├── search/
│   │   │   └── index.tsx
│   │   ├── game/
│   │   │   └── index.tsx
│   │   ├── history/
│   │   │   └── index.tsx
│   │   └── settings/
│   │       ├── index.tsx
│   │       └── printer.tsx
│   ├── card.tsx                  # Modal route
│   ├── print-preview.tsx         # Modal route
│   └── life-counter.tsx          # Full-screen modal
├── screens/                      # Screen components (UI + hook orchestration)
│   ├── home/
│   │   ├── HomeScreen.tsx        # Main screen component
│   │   ├── CmcStepper.tsx        # Sub-component
│   │   ├── CastButton.tsx        # Sub-component
│   │   └── HeroBackground.tsx    # Sub-component
│   ├── card/
│   │   ├── CardDetailScreen.tsx
│   │   ├── FaceToggle.tsx
│   │   ├── PrintingsList.tsx
│   │   └── CardActions.tsx
│   ├── search/
│   │   ├── SearchScreen.tsx
│   │   └── ResultsList.tsx
│   ├── game/
│   │   ├── GameModeScreen.tsx
│   │   └── LifeCounterScreen.tsx
│   ├── printer/
│   │   ├── PrinterSetupScreen.tsx
│   │   ├── DiscoveryList.tsx
│   │   ├── TcpSetupModal.tsx
│   │   ├── TestPrintFlow.tsx
│   │   └── PrinterConnectionPanel.tsx
│   └── settings/
│       └── SettingsScreen.tsx
├── features/                     # Feature hooks (business logic)
│   ├── cast/
│   │   ├── useCastFlow.ts        # Card fetch + history add
│   │   ├── useHeroArtRotation.ts  # Hero art cache + rotation
│   │   └── useCmcStepper.ts      # CMC increment/decrement
│   ├── card/
│   │   ├── useCardDetail.ts      # Face toggle, printings, share
│   │   └── useCardImage.ts       # Image download, art rotation
│   ├── search/
│   │   ├── useCardSearch.ts      # Search query + pagination
│   │   └── useSearchFilters.ts   # Filter state + query building
│   ├── game/
│   │   ├── useLifeCounter.ts     # Life totals, players, counters
│   │   └── useMomirMode.ts       # Momir random creature logic
│   └── printer/
│       ├── usePrinterConnection.ts # Discovery, connect, disconnect
│       ├── usePrinterUiState.ts    # 13-state machine management
│       └── usePrintDispatch.ts    # Render + send document flow
├── components/                   # Shared UI components (presentational)
│   ├── TypePicker.tsx
│   ├── HistorySheet.tsx
│   ├── Toast.tsx
│   ├── SearchFilters.tsx
│   ├── SearchFiltersDialog.tsx
│   ├── ChipSearchInput.tsx
│   ├── CardGridItem.tsx
│   ├── CardListItem.tsx
│   ├── ManaCost.tsx
│   ├── ManaSymbol.tsx
│   ├── OracleText.tsx
│   ├── SetSymbol.tsx
│   ├── Skeleton.tsx
│   └── DitheredImage.tsx
├── stores/                       # Zustand stores (client state)
│   ├── settingsStore.ts          # App settings + printer preferences
│   └── historyStore.ts           # Card history with FIFO eviction
├── services/                     # Service layer
│   ├── scryfall.ts               # API client (add Zod validation)
│   ├── logger.ts                 # Structured logging (replaces console.log)
│   └── printer/                  # PRESERVE as-is (well-structured)
│       ├── adapters/
│       ├── registry/
│       ├── storage/
│       ├── render/
│       ├── capability/
│       └── diagnostics/
├── i18n/                         # Internationalization
│   ├── index.ts
│   ├── types.ts
│   └── locales/
├── constants/                    # App-wide constants
│   ├── colors.ts
│   ├── cardTypes.ts
│   └── manaSymbols.ts
├── types/                        # TypeScript type definitions
│   └── index.ts
└── utils/                        # Pure utility functions
    ├── searchTokenizer.ts
    ├── cardFaces.ts
    ├── dither.ts
    └── printerImage.ts
```

### Structure Rationale

- **`app/` thin routes:** Expo Router convention. Route files handle navigation only. Screen logic moves to `screens/`. This makes screens testable without mocking the router and keeps navigation declarations declarative.
- **`screens/` by feature:** Each screen is a folder containing the main component plus co-located sub-components. This keeps related UI together (e.g., `home/CmcStepper.tsx` is only used by the home screen).
- **`features/` hooks:** Business logic extracted from screens. These hooks are pure logic -- no JSX, no React Native imports (except hooks). Testable with simple Jest unit tests, no rendering library needed.
- **`stores/` Zustand:** Replaces the provider-based Settings + History state. Zustand stores are simpler to test, avoid provider nesting, and support MMKV for faster persistence.
- **`services/` preserved:** The printer subsystem is already well-decomposed. The Scryfall service needs Zod validation but its structure is sound.
- **No global `hooks/` folder:** Hooks are co-located with their feature. A global hooks folder becomes a dumping ground. Feature hooks stay focused.

## Architectural Patterns

### Pattern 1: Thin Route, Fat Screen

**What:** Separate Expo Router route files from screen components. Route files are 3-5 lines that import and re-export screen components. Screen components own the UI and orchestrate feature hooks.

**When to use:** Every route in the app. This is the recommended Expo pattern for 2025+.

**Trade-offs:** Adds an extra import indirection per route, but makes screens testable outside the router and keeps `app/` as pure navigation configuration.

**Example:**
```typescript
// app/(tabs)/(home)/index.tsx -- THIN route file
import { HomeScreen } from '@/screens/home/HomeScreen';
export default HomeScreen;

// screens/home/HomeScreen.tsx -- FAT screen component
export function HomeScreen() {
  const { cmc, increment, decrement } = useCmcStepper();
  const { cast, isPending, card } = useCastFlow();
  const { heroArt, rotateHero } = useHeroArtRotation();
  // ... compose sub-components
  return (
    <View>
      <HeroBackground art={heroArt} />
      <CmcStepper value={cmc} onIncrement={increment} onDecrement={decrement} />
      <CastButton onPress={cast} loading={isPending} />
    </View>
  );
}
```

### Pattern 2: Feature Hooks for Business Logic Extraction

**What:** Extract screen-level business logic into focused custom hooks in `features/`. Each hook owns one concern: data fetching, state transitions, or domain logic. Hooks return stable references and are memoized.

**When to use:** When a screen file exceeds 200 lines. When logic is testable in isolation (no rendering needed). When the same logic is shared across screens.

**Trade-offs:** More files to manage. But each file is <100 lines, testable without React Testing Library, and has a single responsibility.

**Example:**
```typescript
// features/cast/useCastFlow.ts
export function useCastFlow() {
  const { addCard } = useHistory();
  const { settings } = useSettings();
  const { isOnline } = useNetwork();

  const mutation = useMutation({
    mutationFn: (params: { type: CardType; cmc: number }) =>
      fetchRandomCard(params.type, params.cmc, settings.excludeFunnySets),
    onSuccess: (card) => {
      addCard(card);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error) => {
      const message = getLocalizedScryfallErrorMessage(error);
      showToast({ type: 'error', title: message });
    },
  });

  return {
    cast: mutation.mutate,
    isPending: mutation.isPending,
    card: mutation.data ?? null,
    error: mutation.error,
  };
}
```

### Pattern 3: Zustand for Client State (Replace Providers)

**What:** Use Zustand stores for persisted client state (settings, history) instead of React Context providers. Zustand provides a flatter provider tree, simpler testing, and MMKV persistence.

**When to use:** For state that persists across screens (settings, history, preferences). NOT for server state (use TanStack Query). NOT for transient UI state (use local `useState`).

**Trade-offs:** Zustand is already an unused dependency in this project. Switching from Context providers requires migrating two providers. But the benefit is flatter provider tree, faster persistence, and no re-render cascade from top-level providers.

**Example:**
```typescript
// stores/settingsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  updatePrinter: (partial: Partial<PrinterPreferences>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),
      updatePrinter: (partial) =>
        set((state) => ({
          settings: {
            ...state.settings,
            printer: { ...state.settings.printer, ...partial },
          },
        })),
    }),
    {
      name: 'momir_settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ settings: state.settings }),
    },
  ),
);
```

### Pattern 4: Typed Error Boundaries at Service Layer

**What:** Replace empty `catch {}` blocks and `as` type assertions with typed error handling and Zod validation at system boundaries. The printer subsystem already models this with `PrinterAdapterError` and `PrinterErrorCode`.

**When to use:** At every API boundary (Scryfall responses) and every persistence boundary (AsyncStorage reads). Not needed for internal pure functions.

**Trade-offs:** Adds ~50 lines of Zod schemas. Runtime validation has a small performance cost. But catches API schema changes at the boundary instead of causing undefined-field crashes deep in rendering logic.

**Example:**
```typescript
// services/scryfall.ts -- add validation at API boundary
import { z } from 'zod';

const ScryfallCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  type_line: z.string(),
  oracle_text: z.string().optional(),
  image_uris: z.record(z.string()).optional(),
  card_faces: z.array(z.unknown()).optional(),
  // ... other fields with .optional() for stability
});

// Inside fetch functions:
const raw = await response.json();
const validated = ScryfallCardSchema.parse(raw); // throws ZodError on bad shape
return mapScryfallCard(validated);
```

### Pattern 5: Single Source of Truth for Card Type Queries

**What:** Replace the duplicated switch statements in `buildQuery()` and `getTypeQueryFragment()` with a single `CARD_TYPE_QUERIES` map that derives both functions. Add TypeScript exhaustiveness check.

**When to use:** When the same domain concept (CardType) is mapped to different representations in multiple places.

**Example:**
```typescript
// constants/cardTypes.ts
const CARD_TYPE_QUERIES: Record<CardType, { fragment: string; query: (cmc: number, excludeFunny: boolean) => string }> = {
  creature: {
    fragment: 't:creature',
    query: (cmc, excludeFunny) =>
      `t:creature ocmc=${cmc}${excludeFunny ? ' -funny' : ''}`,
  },
  // ... all types
};

// Compile-time exhaustiveness check
type _AssertExhaustive = keyof typeof CARD_TYPE_QUERIES extends CardType
  ? CardType extends keyof typeof CARD_TYPE_QUERIES
    ? true
    : never
  : never;

export function getTypeQueryFragment(type: CardType): string {
  return CARD_TYPE_QUERIES[type].fragment;
}

export function buildQuery(type: CardType, cmc: number, excludeFunny: boolean): string {
  return CARD_TYPE_QUERIES[type].query(cmc, excludeFunny);
}
```

## Data Flow

### Primary Flow: Cast (Home Screen)

```
User taps Cast
    ↓
useCastFlow.cast({ type, cmc })
    ↓
TanStack Query useMutation
    ↓
services/scryfall.ts → fetchRandomCard(type, cmc)
    ↓                                    ↓
Rate limiter (100ms)              Zod validation on response
    ↓                                    ↓
Scryfall API ← rate-limited GET   mapScryfallCard()
    ↓                                    ↓
Retry (3x, exponential backoff)   Card object returned
    ↓                                    ↓
onSuccess: addCard(card)          mutation.data = card
    ↓
historyStore.addCard(card) → AsyncStorage persist
    ↓
Haptic feedback + toast
    ↓
Screen navigates to card detail
```

### State Flow: Settings

```
User changes setting
    ↓
settingsStore.updateSettings({ excludeFunnySets: true })
    ↓
Zustand set() → new state object (immutable)
    ↓
persist middleware → AsyncStorage.setItem()
    ↓
Subscribed components re-render (only those using excludeFunnySets)
```

### Print Flow (Preserved)

```
User taps Print on card detail
    ↓
router.push('/print-preview', { cardJson })
    ↓
usePrintDispatch hook
    ↓
createAdapter() → PrinterPort (BLE/TCP/Classic)
    ↓
EscPosRenderer.build(CardReceiptDocument) → raw bytes
    ↓
printerImage.ts → rasterize + dither card art
    ↓
PrinterPort.sendRaw(bytes) → thermal printer
    ↓
PrinterSessionLogger emits diagnostics
```

### Key Data Flows

1. **Cast flow:** User action → feature hook → TanStack Query mutation → Scryfall service → Zod validation → card object → history store persist → screen navigation
2. **Search flow:** User query → useCardSearch hook → TanStack Query → Scryfall service → paginated results → screen list
3. **Settings flow:** User change → Zustand store → persist middleware → AsyncStorage → subscribed components re-render
4. **Print flow:** Card detail → usePrintDispatch → adapter factory → registry service → SQLite lookup → PrinterPort → raw ESC/POS bytes
5. **Offline resilience:** TanStack Query cache (persisted) → stale data shown → background refetch on reconnect

## Provider Tree Simplification

### Current (7 levels deep)

```
QueryClientProvider
  GestureHandlerRootView
    SafeAreaProvider
      I18nProvider
        SettingsProvider         ← replace with Zustand
          HistoryProvider        ← replace with Zustand
            NetworkProvider
              ToastProvider
                App
```

### Target (4 levels deep)

```
QueryClientProvider
  GestureHandlerRootView
    SafeAreaProvider
      I18nProvider
        NetworkProvider
          ToastProvider
            App
```

Settings and History move to Zustand stores (no provider needed -- Zustand works without a provider wrapper). This eliminates 2 provider levels, reduces re-render cascades, and removes the circular dependency between `SettingsProvider` and the printer registry (currently `SettingsProvider` dynamically imports `registryService`).

### Re-render Isolation Strategy

| Provider/Store | Update Frequency | Who Re-renders |
|----------------|------------------|----------------|
| I18nProvider | Rare (locale change) | All children (acceptable) |
| NetworkProvider | Moderate (every 15s) | Only components calling `useNetwork()` |
| ToastProvider | Rare | Only toast container |
| settingsStore | Rare (user action) | Only components using `useSettingsStore()` with specific selectors |
| historyStore | Moderate (each cast) | Only components using `useHistoryStore()` with specific selectors |
| TanStack Query | Per fetch | Only components subscribed to specific query keys |

Key improvement: Zustand's selector-based subscriptions prevent the "provider updates -> all children re-render" cascade that React Context causes.

## Screen Decomposition Plan

### Home Screen (1055 lines → target <400 lines)

| Extraction | Type | Estimated Lines | Destination |
|-----------|------|----------------|-------------|
| CMC stepper UI | Component | ~80 | `screens/home/CmcStepper.tsx` |
| Cast button + multi-card | Component | ~60 | `screens/home/CastButton.tsx` |
| Hero background art | Component | ~120 | `screens/home/HeroBackground.tsx` |
| Cast flow logic | Hook | ~60 | `features/cast/useCastFlow.ts` |
| Hero art rotation | Hook | ~80 | `features/cast/useHeroArtRotation.ts` |
| CMC stepper logic | Hook | ~30 | `features/cast/useCmcStepper.ts` |
| Background color mapping | Utility | ~15 | `constants/colors.ts` |

### Card Detail Screen (1238 lines → target <400 lines)

| Extraction | Type | Estimated Lines | Destination |
|-----------|------|----------------|-------------|
| Face toggle | Component | ~80 | `screens/card/FaceToggle.tsx` |
| Printings list | Component | ~100 | `screens/card/PrintingsList.tsx` |
| Action buttons (share, download, print, reroll) | Component | ~120 | `screens/card/CardActions.tsx` |
| Card detail logic | Hook | ~80 | `features/card/useCardDetail.ts` |
| Image handling | Hook | ~60 | `features/card/useCardImage.ts` |

### Printer Setup Screen (2438 lines → target <400 lines)

| Extraction | Type | Estimated Lines | Destination |
|-----------|------|----------------|-------------|
| Discovery list | Component | ~150 | `screens/printer/DiscoveryList.tsx` |
| TCP setup modal | Component | ~200 | `screens/printer/TcpSetupModal.tsx` |
| Test print flow | Component | ~100 | `screens/printer/TestPrintFlow.tsx` |
| Connection panel | Component | ~150 | `screens/printer/PrinterConnectionPanel.tsx` |
| Permission handling | Component | ~80 | `screens/printer/PermissionGate.tsx` |
| Connection logic | Hook | ~100 | `features/printer/usePrinterConnection.ts` |
| UI state machine | Hook | ~80 | `features/printer/usePrinterUiState.ts` |
| Print dispatch | Hook | ~60 | `features/printer/usePrintDispatch.ts` |

### Life Counter Screen (1113 lines → target <400 lines)

| Extraction | Type | Estimated Lines | Destination |
|-----------|------|----------------|-------------|
| Player slots | Component | ~120 | `screens/game/PlayerSlot.tsx` |
| Counter type picker | Component | ~80 | `screens/game/CounterPicker.tsx` |
| Game mode selector (split from game/index.tsx) | Component | ~100 | `screens/game/GameModeSelector.tsx` |
| Life counter logic | Hook | ~120 | `features/game/useLifeCounter.ts` |
| Momir mode logic | Hook | ~80 | `features/game/useMomirMode.ts` |

### Print Preview Screen (1066 lines → target <400 lines)

| Extraction | Type | Estimated Lines | Destination |
|-----------|------|----------------|-------------|
| Receipt preview | Component | ~100 | `screens/printer/ReceiptPreview.tsx` |
| Print actions | Component | ~80 | `screens/printer/PrintActions.tsx` |
| Dithered image preview | Component | ~60 | `screens/printer/DitheredPreview.tsx` |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (hundreds of users) | Current architecture is fine for user count. The bottleneck is developer velocity -- oversized files slow down feature development. |
| Thousands of users | Add TanStack Query cache persistence for offline. History migration to SQLite (same as printer) for unbounded storage. MMKV for settings persistence. |
| Tens of thousands | Consider Expo EAS Update for OTA updates. Add error reporting (Sentry). Rate limiter may need server-side proxy if Scryfall rate-limits more aggressively. |

### Scaling Priorities

1. **First bottleneck: developer velocity, not performance.** The 2438-line printer.tsx is the real scaling problem. Decomposition unlocks parallel development and testability.
2. **Second bottleneck: AsyncStorage limits.** History grows unbounded. At ~500 cards, AsyncStorage starts to strain on Android. Migrate history to SQLite (same pattern as printer storage) before users hit the 6MB limit.
3. **Third bottleneck: Scryfall rate limiting.** At high usage, the 100ms rate limiter means ~10 requests/second max. If multiple features call concurrently, they serialize. The existing backoff handles this well, but consider request deduplication via TanStack Query's `staleTime`.

## Anti-Patterns

### Anti-Pattern 1: Giant Screen Components (Current State)

**What people do:** Put all UI, logic, state, animations, and styles in one screen file (1000-2400 lines).
**Why it is wrong:** Cognitive overload. A single bug fix requires scrolling through 2000+ lines. Testing requires rendering the entire screen. Refactoring touches multiple concerns simultaneously.
**Do this instead:** Decompose into screen component (<400 lines) + feature hooks (<100 lines each) + sub-components (<200 lines each). Each piece is independently testable.

### Anti-Pattern 2: React Context for Persisted Local State

**What people do:** Use React Context + TanStack Query to read/write AsyncStorage for settings and history.
**Why it is wrong:** Context causes re-render cascades (all consumers re-render when any value changes). TanStack Query adds unnecessary async round-trips for what is a local synchronous write. Provider nesting makes the tree harder to debug.
**Do this instead:** Zustand with `persist` middleware. Zustand uses selector-based subscriptions (only re-renders components that read the changed value). Persistence is synchronous on the write path. No provider needed.

### Anti-Pattern 3: Card Data as JSON Route Params

**What people do:** `useLocalSearchParams<{ cardJson: string }>()` passes full Card objects between screens.
**Why it is wrong:** Serialization overhead, size limits on route params, no deep linking, data can become stale if the source changes.
**Do this instead:** Pass only `cardId` in route params. Store card data in TanStack Query cache (keyed by ID). Receiving screen reads from cache with `useQuery({ queryKey: ['card', cardId] })`. This enables deep linking, cache persistence, and avoids serialization.

### Anti-Pattern 4: Silent Error Swallowing

**What people do:** `catch {}` or `catch { /* nothing */ }` in 26 places across the codebase.
**Why it is wrong:** Bugs become invisible. Printer connection failures, database errors, and API failures produce no diagnostic output.
**Do this instead:** At minimum, log with `console.warn` in development. For expected failures, add a comment explaining why the error is intentionally ignored (the printer subsystem does this correctly in `registry/service.ts` line 170). Use the existing `PrinterAdapterError` pattern for typed error handling. Create a `services/logger.ts` that gates output by `__DEV__`.

### Anti-Pattern 5: Module-Scope Dimensions.get('window')

**What people do:** Call `Dimensions.get('window')` at module scope to set constants for layout calculations.
**Why it is wrong:** Captured once at module load time, never updates on orientation change or screen resize. Broken on iPad and foldable devices.
**Do this instead:** Use `useWindowDimensions()` hook which updates reactively. Already imported in `SearchFilters.tsx` -- extend this pattern to all 5 affected files.

## Build Order (Dependency-Aware Implementation Sequence)

The following sequence respects dependencies: each step builds on the previous, and earlier steps unblock later ones.

### Phase 1: Foundation (unblocks everything)

1. **Create `services/logger.ts`** -- Structured logging to replace `console.log` calls. Gates output by `__DEV__`. Unblocks all error handling improvements.
2. **Fix silent error swallowing** -- Replace 26 empty `catch {}` blocks with logger calls. Low risk, high diagnostic value.
3. **Replace `Dimensions.get('window')` with `useWindowDimensions()`** -- 5 files, mechanical change, no logic change.
4. **Create `CARD_TYPE_QUERIES` map** -- Single source of truth for card type queries. Eliminates duplication. Add exhaustiveness check.

### Phase 2: State Management (unblocks provider simplification)

5. **Create `stores/settingsStore.ts`** -- Zustand with persist middleware. Replaces `SettingsProvider`.
6. **Create `stores/historyStore.ts`** -- Zustand with persist middleware + FIFO eviction (max 500 cards). Replaces `HistoryProvider`.
7. **Migrate consumers** -- Update all `useSettings()` / `useHistory()` calls to use Zustand stores.
8. **Simplify `app/_layout.tsx`** -- Remove SettingsProvider and HistoryProvider from provider tree. 7 levels becomes 5.

### Phase 3: Screen Decomposition (unblocks testability)

9. **Create `screens/` and `features/` directories** -- Establish the new folder structure.
10. **Decompose printer.tsx first** (highest value: 2438 -> <400 lines) -- Extract `usePrinterConnection`, `usePrinterUiState`, `usePrintDispatch`. Extract `DiscoveryList`, `TcpSetupModal`, `TestPrintFlow`, `PrinterConnectionPanel`, `PermissionGate`.
11. **Decompose home screen** (1055 -> <400 lines) -- Extract `useCastFlow`, `useHeroArtRotation`, `useCmcStepper`. Extract `CmcStepper`, `CastButton`, `HeroBackground`.
12. **Decompose card detail** (1238 -> <400 lines) -- Extract `useCardDetail`, `useCardImage`. Extract `FaceToggle`, `PrintingsList`, `CardActions`.
13. **Decompose life counter** (1113 -> <400 lines) -- Extract `useLifeCounter`, `useMomirMode`. Extract `PlayerSlot`, `CounterPicker`.
14. **Decompose print preview** (1066 -> <400 lines) -- Extract `ReceiptPreview`, `PrintActions`, `DitheredPreview`.
15. **Thin out route files** -- Each `app/` route becomes a 3-line import + re-export.

### Phase 4: Validation & Safety (depends on Phase 1 logger)

16. **Add Zod schemas for Scryfall API** -- Validate all API responses at the service boundary. `ScryfallCardSchema.parse()` throws on unexpected shapes.
17. **Wrap AsyncStorage JSON.parse in try-catch** -- With Zod validation for critical shapes. On failure, return defaults and log corruption.
18. **Remove unused dependencies** -- `zustand` (now used), `@stardazed/streams-text-encoding`, `@ungap/structured-clone`, `react-native-web` (or upgrade to 0.40+).

### Phase 5: Testing (depends on Phase 3 decomposition)

19. **Unit test feature hooks** -- `useCastFlow`, `useLifeCounter`, `usePrinterConnection`, etc. Simple Jest tests, no rendering library needed.
20. **Screen integration tests** -- Test home cast flow, search flow, life counter flow using `@testing-library/react-native`.
21. **Printer E2E integration test** -- Test discover -> connect -> render -> print using `FakePrinterAdapter`.
22. **Fix `jest.setup.js`** -- Stop blanket-silencing console.warn/error. Only suppress expected warnings.

### Dependency Graph

```
Phase 1 (Foundation) ─── no prerequisites
    ↓
Phase 2 (State) ─── no prerequisites (can parallel with Phase 1)
    ↓
Phase 3 (Decomposition) ─── depends on Phase 2 for Zustand stores
    ↓
Phase 4 (Validation) ─── depends on Phase 1 for logger
    ↓
Phase 5 (Testing) ─── depends on Phase 3 for extracted hooks
```

Phases 1 and 2 can run in parallel. Phase 3 can begin as soon as Phase 2's stores exist. Phase 4 only needs Phase 1's logger. Phase 5 needs Phase 3's extracted hooks.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Scryfall API | `services/scryfall.ts` with rate limiting + retry + Zod validation | Add Zod schemas at boundary. Keep rate limiter encapsulated (make injectable for tests). |
| AsyncStorage | Zustand `persist` middleware with `createJSONStorage(() => AsyncStorage)` | Wrap reads in try-catch + Zod. Return defaults on corruption. |
| SQLite (expo-sqlite) | Repository pattern (existing in printer subsystem) | Extend to history storage in Phase 2 if needed. |
| Bluetooth / TCP printers | `PrinterPort` interface via adapter factory | PRESERVE. Already well-structured with dependency injection. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Screens → Feature Hooks | Function calls (hooks return values) | Screens are thin; hooks own logic. |
| Feature Hooks → Zustand Stores | Direct store access via `useStore(selector)` | Zustand is global; no provider needed. |
| Feature Hooks → TanStack Query | `useQuery` / `useMutation` inside hooks | Hooks wrap TanStack Query for screen consumers. |
| Feature Hooks → Services | Direct function calls | Services are singletons; hooks call them. |
| Services → External APIs | HTTP (fetch) with rate limiting | Validated at boundary with Zod. |
| Printer subsystem → Screens | `registryService` + `createAdapter()` | Screens use hooks that wrap registry; registry uses dependency injection. |

## What to Preserve

The printer subsystem is the gold standard in this codebase. Its architecture should be the template for all other subsystems:

| Printer Pattern | Why It Works | Apply To |
|-----------------|-------------|----------|
| **Interface-based adapters** (`PrinterPort`) | Enables `FakePrinterAdapter` for testing | Scryfall service: make rate limiter injectable |
| **Dependency injection** (`createRegistryService(deps)`) | Factory accepts test overrides | All new feature hooks should accept injectable deps |
| **Typed errors** (`PrinterAdapterError` + `PrinterErrorCode`) | Deterministic error handling at boundaries | Scryfall: expand `ScryfallApiError` with Zod validation |
| **Explicit state machine** (`PrinterUiState` 13 states) | Prevents impossible states | Life counter: model game states explicitly |
| **Layered architecture** (adapters -> registry -> storage -> render) | Each layer has single responsibility | Feature hooks should follow this decomposition |
| **Repository pattern** (SQLite CRUD) | Abstracts storage from business logic | History: same pattern for card history if migrated to SQLite |

## Sources

- [Expo App Folder Structure Best Practices](https://expo.dev/blog/expo-app-folder-structure-best-practices) -- Official Expo guidance on thin route files, screen separation
- [React Native App Architecture Patterns 2026](https://shahmeerrizwan.com/blog/react-native-app-architecture-patterns-2026) -- Feature-based folders, hook decomposition, Zustand + TanStack Query
- [Zustand & TanStack Query Guide](https://reactnativerelay.com/article/modern-state-management-react-native-zustand-tanstack-query) -- Hybrid state management pattern
- [Avoiding Deep Nested Context Providers](https://alexkorep.com/react/react-many-context-providers-tree/) -- Provider flattening strategies
- [React Native Offline Data with React Query and Zustand](https://addjam.com/blog/2026-03-20/react-native-offline-data-react-query-zustand/) -- Offline persistence + cache layering
- [Expo Router Core Concepts](https://docs.expo.dev/router/basics/core-concepts) -- Official route/screen separation guidance
- [TanStack Query AsyncStorage Persister](https://tanstack.com/query/latest/docs/framework/react/plugins/createAsyncStoragePersister) -- Cache persistence for offline support
- [Zustand vs TanStack Query: Maybe Both?](https://helloadel.com/blog/zustand-vs-tanstack-query-maybe-both/) -- State management separation of concerns

---
*Architecture research for: Momir Basic (React Native / Expo MTG utility app)*
*Researched: 2026-04-13*
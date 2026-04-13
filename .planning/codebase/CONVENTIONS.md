# Code Conventions

**Analysis Date:** 2026-04-13

## Naming Conventions

**Files:**
- React components: PascalCase (e.g., `CardGridItem.tsx`, `ManaCost.tsx`, `HistorySheet.tsx`)
- Non-component modules: camelCase (e.g., `heroRotation.ts`, `heroArtCache.ts`, `searchTokenizer.ts`, `cardFaces.ts`)
- Test files: kebab-case or camelCase matching source (e.g., `scryfall.test.ts`, `home-hero-rotation.test.ts`, `printer-registry.test.ts`)
- Constants: camelCase (e.g., `cardTypes.ts`, `colors.ts`, `manaSymbols.ts`)
- Services: camelCase (e.g., `scryfall.ts`, `service.ts`)
- i18n locales: lowercase abbreviation (e.g., `en.ts`, `pt.ts`, `zhs.ts`)
- Shared helper modules: `.shared.ts` suffix (e.g., `SearchFilters.shared.ts`)

**Components:**
- PascalCase for all React components (e.g., `ManaCost`, `CardGridItem`, `HistorySheet`, `TypePicker`)
- Named exports for reusable components: `export const ManaCost = memo(function ManaCost(...))`
- Default exports for screen/route components: `export default function HomeScreen()`

**Functions:**
- camelCase for all functions (e.g., `fetchRandomCard`, `buildQuery`, `getCardFaceDisplayData`, `parseManaCost`)
- Factory functions use `create` prefix (e.g., `createRegistryService`, `createAdapter`, `createQueryClient`)
- Predicate functions use `is`/`has` prefix (e.g., `isScryfallApiError`, `isDarkImage`, `isCardFace`, `isTransientStatus`)
- Validation functions use `validate` prefix (e.g., `validateTransport`)

**Variables:**
- camelCase for all variables (e.g., `queryClient`, `settingsQuery`, `dominantColor`)
- Constants at module level use SCREAMING_SNAKE_CASE (e.g., `MIN_CMC`, `MAX_CMC`, `RATE_LIMIT_MS`, `DEFAULT_RETRY_COUNT`, `HERO_ROTATION_INTERVAL_MS`)
- Refs use `Ref` suffix (e.g., `attemptedRef`, `warmedArtUrlsRef`, `rotationCleanupRef`)

**Types/Interfaces:**
- PascalCase for all types and interfaces (e.g., `Card`, `CardType`, `PrinterRecord`, `AppSettings`, `ToastMessage`)
- Use `interface` for object shapes that describe data contracts
- Use `type` for unions, intersections, and utility types (e.g., `type CardType = 'creature' | 'commander' | ...`, `type PrintMode = 'full' | 'image_only'`)
- Use `enum` for explicitly-valued enumerations (e.g., `PrinterTransportType`, `PrinterErrorCode`)
- Use `Record<K, V>` for dictionary types (e.g., `Record<string, string>`, `Record<Locale, Translations>`)
- Error classes extend `Error` with custom properties (e.g., `ScryfallApiError`, `PrinterAdapterError`, `UnsupportedPlatformError`)

## File Organization Conventions

**Components** live in `/components/`:
- Each component in its own file: `components/CardGridItem.tsx`, `components/ManaCost.tsx`
- Shared non-React logic extracted to `.shared.ts`: `components/SearchFilters.shared.ts`
- Styling is inline via `StyleSheet.create({})` at the bottom of the same file

**Providers** live in `/providers/`:
- Context providers wrapping the app: `providers/SettingsProvider.tsx`, `providers/HistoryProvider.tsx`, `providers/NetworkProvider.tsx`
- All providers use `@nkzw/create-context-hook` pattern (see State Management)

**Services** live in `/services/`:
- External API services: `services/scryfall.ts`
- Complex subsystems organized in subdirectories: `services/printer/adapters/`, `services/printer/storage/`, `services/printer/registry/`, `services/printer/render/`, `services/printer/capability/`, `services/printer/diagnostics/`
- Each subdirectory has an `index.ts` barrel file
- Service files are named by domain: `service.ts`, `repositories.ts`, `schema.ts`, `database.ts`

**Routes** live in `/app/`:
- Expo Router file-based routing with route groups: `app/(tabs)/(home)/index.tsx`, `app/(tabs)/game/index.tsx`
- Layout files: `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/game/_layout.tsx`
- Modal routes: `app/card.tsx`, `app/modal.tsx`, `app/print-preview.tsx`, `app/life-counter.tsx`
- Helper modules colocated with route: `app/(tabs)/(home)/heroRotation.ts`, `app/(tabs)/(home)/heroArtCache.ts`

**Types** live in `/types/`:
- Single barrel file: `types/index.ts` contains all shared type definitions, interfaces, and type helpers
- Domain-specific types exported from same file (Card types, Printer types, Settings types)

**Constants** live in `/constants/`:
- Named by domain: `constants/cardTypes.ts`, `constants/colors.ts`, `constants/manaSymbols.ts`
- Default export for primary constant object: `export default Colors`

**Utilities** live in `/utils/`:
- Pure functions organized by domain: `utils/cardFaces.ts`, `utils/dither.ts`, `utils/printerImage.ts`, `utils/searchTokenizer.ts`

**i18n** lives in `/i18n/`:
- Provider and hook: `i18n/index.ts`
- Type definitions: `i18n/types.ts`
- Locale files: `i18n/locales/en.ts`, `i18n/locales/pt.ts`, etc.

## Import Conventions

**Order:**
1. React and React hooks
2. React Native core and Expo packages
3. Third-party libraries (`@tanstack/react-query`, `lucide-react-native`, etc.)
4. Internal modules using `@/` alias (constants, types, services, providers, i18n)
5. Relative imports for colocated files

**Example** (from `app/(tabs)/(home)/index.tsx`):
```typescript
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ... } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Minus, Plus, ChevronDown, ScrollText } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { CARD_TYPES } from '@/constants/cardTypes';
import { Card, CardType } from '@/types';
import { fetchRandomCard, fetchMultipleCards, ... } from '@/services/scryfall';
import { useHistory } from '@/providers/HistoryProvider';
import { useSettings } from '@/providers/SettingsProvider';
import { useI18n } from '@/i18n';
import { TypePicker } from '@/components/TypePicker';
import { HistorySheet } from '@/components/HistorySheet';
import { showToast } from '@/components/Toast';
import { useNetwork } from '@/providers/NetworkProvider';
import { startHeroArtRotationInterval } from './heroRotation';
import { markHeroArtAsWarm } from './heroArtCache';
```

**Path Aliases:**
- `@/*` maps to project root (configured in `tsconfig.json`)
- Use `@/` for cross-directory imports
- Use `./` or `../` for colocated files within the same feature directory

**Type-only imports:**
- Use `import type` when importing only types: `import type { Card, CardType } from '@/types'`
- Use `import { Card }` when using the value at runtime

## Component Patterns

**Function components only** -- no class components anywhere in the codebase.

**Default exports** for screen/route components:
```typescript
export default function HomeScreen() { ... }
export default function GameScreen() { ... }
export default function RootLayout() { ... }
```

**Named exports** for reusable components:
```typescript
export const ManaCost = memo(function ManaCost({ manaCost, size = 20, gap = 3 }: ManaCostProps) { ... });
export const [SettingsProvider, useSettings] = createContextHook(() => { ... });
```

**Props typing:**
- Always define an interface for props: `interface ManaCostProps { manaCost: string; size?: number; gap?: number }`
- Inline interface when used in a single component
- Use default values in destructuring: `{ size = 20, gap = 3 }`
- Optional props marked with `?`

**Children pattern:**
- `{ children }: { children: React.ReactNode }` for wrapper components
- `{ children?: ReactNode }` for optional children

**Styling approach:**
- All styles use `StyleSheet.create({})` at the bottom of the same file
- No separate style files, no styled-components
- Inline dynamic styles via array syntax: `style={[styles.container, { backgroundColor: dominantColor }]}`
- Use `Colors` constant object from `@/constants/colors` for all theme colors
- Color tokens reference: `Colors.gold`, `Colors.background`, `Colors.textPrimary`, `Colors.textSecondary`, `Colors.textMuted`, `Colors.error`, `Colors.success`, etc.

**Animation pattern:**
- Use `Animated.Value` from `react-native` with `useRef` for animation values
- Use `Animated.timing` and `Animated.spring` with `useNativeDriver: true` wherever possible
- Some animations intentionally use `useNativeDriver: false` when animating non-transform properties (e.g., width percentages)

**Memoization pattern:**
- Use `React.memo` for components receiving stable props (e.g., `ModeCard`, `ManaCost`)
- Use `useMemo` for computed values
- Use `useCallback` for event handlers passed as props
- Wrap provider return values in `useMemo`: `return useMemo(() => ({...}), [deps])`

## TypeScript Usage

**Strict mode is enabled** (`"strict": true` in `tsconfig.json`).

**Common patterns:**
- Use `as const` for readonly object literals: `export const Colors = { ... } as const`
- Use type assertions for narrowing: `as CardType`, `as ScryfallCard`
- Use `typeof` for capturing types: `typeof Heart` for icon types
- Use non-null assertion sparingly: `faces![0]` only when the null case is logically impossible
- Use `Partial<T>` for update functions: `Partial<AppSettings>`, `Partial<PrinterPreferences>`
- Use `Record<K, V>` for dictionary types

**Enum vs union patterns:**
- Use `enum` for explicitly-valued enumerations with runtime behavior (e.g., `PrinterTransportType`, `PrinterErrorCode`)
- Use `type` unions for closed string sets (e.g., `type CardType = 'creature' | 'commander' | ...`, `type PrintMode = 'full' | 'image_only'`)
- Use `type` for discriminated unions (e.g., `type PrintJobState = 'queued' | 'printing' | 'printed_confirmed' | ...`)

**Type vs interface preference:**
- `interface` for data objects and contracts: `Card`, `PrinterRecord`, `AppSettings`, `ToastMessage`
- `type` for unions, intersections, aliases: `CardType`, `PrintMode`, `DitherAlgorithm`
- `interface` for props: `ManaCostProps`, `ModeCardProps`, `ToastItemProps`
- Mix of both is acceptable; follow existing patterns in `types/index.ts`

**Null handling:**
- Use `??` for nullish coalescing: `data.image_uris ?? face?.image_uris`
- Use `?.` for optional chaining: `card.faces?.[0]?.image_uris?.art_crop`
- Use `!` non-null assertion only in tests or when logically guaranteed

## State Management Patterns

**Context pattern** -- uses `@nkzw/create-context-hook`:
```typescript
export const [SettingsProvider, useSettings] = createContextHook(() => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  // ...logic...
  return useMemo(() => ({
    settings,
    updateSettings,
    updatePrinter,
    isLoading: settingsQuery.isLoading,
  }), [settings, updateSettings, updatePrinter, settingsQuery.isLoading]);
});
```

**Provider hook pattern:**
- Provider exports: `[ProviderComponent, useContextHook]` pair
- Consumer usage: `const { settings, updateSettings } = useSettings()`
- All providers follow this pattern: `SettingsProvider/useSettings`, `HistoryProvider/useHistory`, `NetworkProvider/useNetwork`, `I18nProvider/useI18n`

**TanStack Query integration:**
- Use `useQuery` for data fetching with `queryKey` arrays: `['appSettings']`, `['cardHistory']`, `['bgArt', cardType]`
- Use `useMutation` for state mutations with `onSuccess` invalidation
- Use `staleTime: Infinity` for data that doesn't change: `bgQuery`
- Use `gcTime: Infinity` for data that should never be garbage collected
- Use `refetchInterval` for polling: `connectivityQuery` with 15s interval

**AsyncStorage pattern:**
- Used for persistent settings and history
- Key naming: `momir_settings`, `momir_card_history`, `momir_locale`
- Read via `useQuery`, write via `useMutation` + invalidation
- Deep-merge defaults on read: `{ ...DEFAULT_SETTINGS, ...parsed, printer: { ...DEFAULT_PRINTER_PREFERENCES, ...(parsed.printer ?? {}) } }`

**Immutable state updates:**
- Always use spread operator: `setSettings(prev => ({ ...prev, ...partial }))`
- Nested updates use nested spread: `setSettings(prev => ({ ...prev, printer: { ...prev.printer, ...partial } }))`
- Array prepend: `setCards(prev => [card, ...prev])`
- Array filter: `setCards(prev => prev.filter(c => c.id !== cardId))`

## Error Handling Patterns

**Custom error classes:**
- Extend `Error` with typed properties for domain-specific errors:
```typescript
export class ScryfallApiError extends Error {
  status: number;
  isTransient: boolean;
  reason: ScryfallErrorReason;
  constructor(message: string, status: number, isTransient: boolean, reason: ScryfallErrorReason) { ... }
}

export class PrinterAdapterError extends Error {
  readonly code: PrinterErrorCode;
  readonly transport?: PrinterTransport;
  constructor(code: PrinterErrorCode, message: string, transport?: PrinterTransport) { ... }
}
```

**Type guards for error identification:**
```typescript
export function isScryfallApiError(error: unknown): error is ScryfallApiError {
  return error instanceof ScryfallApiError;
}
```

**Retry logic:**
- Use `isTransient` flag to determine retry eligibility
- Exponential backoff with cap: `Math.min(BASE * (2 ** attempt), MAX_MS)`
- Scryfall-specific: 100ms rate limiting between requests, 429/5xx retry with 1s delay

**User-facing error messages:**
- Use toast notifications: `showToast({ type: 'error', title: t.errors.fetchFailed, message: ... })`
- Localize error messages: `getLocalizedScryfallErrorMessage(error, t.errors)`
- Never expose raw error details to users

**Silent error handling:**
- Non-critical errors use `catch {}` or `catch { /* comment explaining why */ }`
- Network connectivity check errors silently return false
- Background operations (e.g., disconnect during forget) are intentionally swallowed

**Void prefix for floating promises:**
- Use `void` prefix for intentionally un-awaited async operations: `void SplashScreen.preventAutoHideAsync()`, `void Haptics.selectionAsync()`, `void queryClient.invalidateQueries(...)`

## Internationalization

**i18n key structure:**
- Nested object structure in `Translations` interface: `t.common.cast`, `t.cardTypes.creature`, `t.errors.fetchFailed`, `t.toast.printerConnected`
- Categories: `common`, `home`, `cardTypes`, `cardTypeDescriptions`, `card`, `printPreview`, `tabs`, `search`, `history`, `game`, `lifeCounter`, `printer`, `settings`, `errors`, `toast`

**Translation file organization:**
- Type definition: `i18n/types.ts` defines the `Translations` interface
- Locale files: `i18n/locales/en.ts`, `i18n/locales/pt.ts`, etc. (11 locales: en, pt, es, fr, de, it, ja, ko, ru, zhs, zht)
- Access via hook: `const { t, locale, setLocale } = useI18n()`

**Usage patterns:**
- Static strings: `t.common.cast`, `t.errors.fetchFailed`
- Parameterized strings: `t.search.cardsFound(count)`, `t.history.deleteAll(count)`, `t.printPreview.thermalReceipt(width)`
- Parameterized strings are implemented as functions returning strings in the locale objects

**Locale detection:**
- Device locale detection on first launch via `getDeviceLocale()`
- Stored in AsyncStorage under `momir_locale`
- Maps to Scryfall API language codes via `LOCALE_TO_SCRYFALL_LANG`

## Logging

**Pattern:** Console with bracket-prefixed module labels:
```typescript
console.log('[Scryfall] Fetching:', url);
console.log('[Network] Device back online');
console.log('[Toast] Provider not mounted, queuing toast:', toast.title);
```

**Convention:**
- Use `console.log` for debug/trace logging (suppressed in test via `jest.setup.js`)
- Use `console.error` for errors
- Module label in brackets: `[Scryfall]`, `[Network]`, `[Toast]`
- No structured logging library used

## Comments

**When to Comment:**
- JSDoc on exported functions and classes in service/utility modules
- Inline comments for non-obvious business logic
- `// CRITICAL` or `// CRITICAL REGRESSION TEST` for important test assertions

**JSDoc/TSDoc:**
- Used for public API surface: exported functions, interfaces, classes
- Example from `services/printer/adapters/port.ts`:
```typescript
/**
 * Error thrown when printer functionality is unavailable on the current platform.
 */
export class UnsupportedPlatformError extends Error { ... }

/**
 * Interface for low-level printer port operations.
 * All printer communication flows through this interface --
 * screens and services import from adapters/index.ts only.
 */
export interface PrinterPort { ... }
```

**Inline comments:**
- Explain "why", not "what": `// Deep-merge printer prefs so new fields added in later versions pick up their defaults`
- Mark intentional behaviors: `// Intentionally swallow -- forget printer regardless of disconnect outcome`
- Mark legacy patterns: `/** Legacy type alias for backward compatibility -- prefer PrinterTransportType */`

## Function Design

**Size:** Functions range from small (5-20 lines for utility functions) to medium (30-60 lines for complex logic). The home screen `HomeScreen` component is an exception at ~700 lines due to extensive animation/interaction logic.

**Parameters:** Use typed interfaces for multi-parameter functions. For service dependency injection, use a `Dependencies` interface pattern:
```typescript
export interface RegistryDependencies {
  repoUpsertPrinter?: typeof upsertPrinter;
  repoGetPrinterById?: typeof getPrinterById;
  ...
}

export function createRegistryService(deps: RegistryDependencies = {}) {
  const repoUpsertPrinter = deps.repoUpsertPrinter ?? upsertPrinter;
  ...
}
```

**Return Values:** Always typed. Use explicit return types for complex functions. Use `Promise<T>` for async functions.

## Module Design

**Exports:**
- Default export for screen components and root layout
- Named exports for reusable components, hooks, services, utilities
- Barrel exports via `index.ts` in service subdirectories: `services/printer/adapters/index.ts`, `services/printer/render/index.ts`

**Barrel Files:**
- Used in service subdirectories to re-export the public API
- Not used at the root level (no root `index.ts`)

---

*Convention analysis: 2026-04-13*
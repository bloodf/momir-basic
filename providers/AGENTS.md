<!-- Parent: ../AGENTS.md -->

# providers/ — React Context Providers

Generated: 2026-03-31

## Overview

The `providers/` directory contains React Context API providers that manage global application state. Three providers implement core functionality: settings persistence, card history tracking, and network connectivity monitoring.

## Architecture

**Provider pattern:**
- React Context API for state management
- useContext hooks for consumer components
- AsyncStorage for persistence (SettingsProvider, HistoryProvider)
- Automatic initialization on app startup
- Error boundaries for provider failures

**Provider composition:**
All three providers are combined in the app root layout (_layout.tsx) in order:
1. I18nProvider (i18n/)
2. SettingsProvider
3. HistoryProvider
4. NetworkProvider
5. ToastProvider (components/)

## Core Providers

### SettingsProvider.tsx

**Purpose:** Manage app settings with persistent storage via AsyncStorage.

**Context interface:**
```typescript
interface AppSettings {
  language: 'en' | 'pt' | 'es' | 'fr' | 'de' | 'it' | 'ja' | 'ko' | 'ru' | 'zhs' | 'zht'
  theme: 'dark' | 'light'
  printer?: {
    preferredPrinterId?: string      // "bt:MAC_ADDRESS" format
    printQuality: 'draft' | 'normal' | 'high'
    paperWidth: number               // 32-58 characters
    autoConnect: boolean             // Auto-reconnect on startup
  }
  cardDisplay: {
    gridColumns: number              // 2-3 based on device width
    showSetSymbol: boolean
    showPrintQuality: boolean
  }
  history: {
    maxItems: number                 // 500 default
    autoCleanup: boolean             // Remove items older than 30 days
  }
}
```

**Key functions:**

- `useSettings()` — Hook to access and update settings
- `updateSetting(key, value)` — Update single setting (persisted to AsyncStorage)
- `resetSettings()` — Reset to defaults

**Persistence:**
- AsyncStorage key: `@momir_settings`
- Auto-load on provider mount
- Async write debounced 300ms to minimize disk I/O

**Defaults:**
- Language: device locale (or 'en' fallback)
- Theme: 'dark'
- Printer: none (user configures in settings screen)
- Grid columns: 2 (portrait), 3 (landscape)

### HistoryProvider.tsx

**Purpose:** Track and manage card view/print history with persistence.

**Context interface:**
```typescript
interface CardHistoryItem {
  cardId: string                   // Scryfall UUID
  name: string
  imageUrl: string
  viewedAt: number                 // ISO timestamp
  printedAt?: number               // ISO timestamp if printed
  count: number                    // Number of times viewed
}

interface HistoryContext {
  history: CardHistoryItem[]
  addToHistory(card: Card): void
  removeFromHistory(cardId: string): void
  clearHistory(): void
  getRecent(limit: number): CardHistoryItem[]
  getByDate(date: Date): CardHistoryItem[]
}
```

**Key functions:**

- `useHistory()` — Hook to access and update history
- `addToHistory(card)` — Add or increment view count for card
- `removeFromHistory(cardId)` — Remove single card from history
- `clearHistory()` — Delete all history
- `getRecent(limit)` — Get most recent N cards
- `getByDate(date)` — Get all cards viewed on specific date

**Persistence:**
- AsyncStorage key: `@momir_history`
- JSON array of CardHistoryItem objects
- Auto-cleanup: remove items older than 30 days (configurable via SettingsProvider)
- Max items: 500 (configurable via SettingsProvider)

**Usage:**
- Add card on view: when user opens card detail screen (card.tsx)
- Track prints: HistoryProvider notified by printer service after successful print
- Home screen: displays recent cards using getRecent()
- History tab: uses getByDate() to show cards grouped by date

### NetworkProvider.tsx

**Purpose:** Monitor device network connectivity and show user-facing notifications.

**Context interface:**
```typescript
interface NetworkContext {
  isOnline: boolean
  connectionType: 'wifi' | 'cellular' | 'none'
  isSlowConnection: boolean
}
```

**Key functions:**

- `useNetwork()` — Hook to access network status
- Network state listener via react-native Network Info API
- Detects connection type: wifi, cellular, none
- Slow connection detection: ping latency > 500ms or bandwidth < 1Mbps

**Behavior:**

- On offline: show warning toast "No internet connection" (persistent)
- On slow connection: show info toast "Slow connection detected" (auto-dismiss)
- On reconnect: show success toast "Connection restored"
- Integrates with app error states: Scryfall API failures handled gracefully

**Usage:**
- Search screen: disable search button when offline
- Print screen: disable print button when offline (printer connection required)
- Card detail: show cached version when offline (requires prior load)

## Context Consumer Pattern

**In components:**
```typescript
// Access multiple providers
const { settings } = useSettings()
const { history, addToHistory } = useHistory()
const { isOnline } = useNetwork()

// Update settings
const updatePrinter = (id: string) => {
  settings.printer = { ...settings.printer, preferredPrinterId: id }
}

// Track history
const viewCard = (card: Card) => {
  addToHistory(card)
}
```

## Error Handling

**AsyncStorage errors:**
- Fallback to in-memory state if AsyncStorage unavailable
- Error toast: "Could not load settings"
- Persist in-memory changes when AsyncStorage recovers

**Network state errors:**
- Assume offline if network API fails
- Retry network state check every 5 seconds

## Testing

**Mock implementations:**
- `__mocks__/providers/SettingsProvider.ts` — Mock with default settings
- Settings can be overridden per test via useSettings mock

## Agent Responsibilities

- **executor:** Provider implementation, state management logic
- **test-engineer:** Context hook tests, AsyncStorage persistence tests, offline behavior tests
- **debugger:** AsyncStorage error investigation, state synchronization issues

## Related Modules

- `app/_layout.tsx` — Provider composition in root layout
- `components/Toast.tsx` — Toast notifications triggered by NetworkProvider
- `types/index.ts` — AppSettings and related type definitions
- React Native AsyncStorage — Persistent storage backend

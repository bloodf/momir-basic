<!-- Parent: ../AGENTS.md -->

# types/ — TypeScript Type Definitions

Generated: 2026-03-31

## Overview

The `types/` directory contains centralized TypeScript interfaces and type definitions used across the entire application. A single index.ts file defines all card, printer, settings, and workflow types ensuring consistency across services, providers, and components.

## Core File

### index.ts

**Purpose:** Centralized TypeScript type definitions for:
- Card data structures (internal and API)
- Printer configuration and capabilities
- App settings and preferences
- Print jobs and workflows
- Migration helpers

**Type organization:**

```typescript
// Card types
interface Card { ... }
interface ScryfallCard { ... }
type CardType = 'creature' | 'commander' | 'artifact' | 'equipment' | 'enchantment' | 'aura' | 'instants' | 'sorceries' | 'lands'

// Printer types
interface PrinterRecord { ... }
interface PrinterCapabilities { ... }
interface PrintJob { ... }
interface PrintData { ... }
interface Capabilities { ... }

// Settings types
interface AppSettings { ... }
interface PrinterPreferences { ... }

// Utility types
type Locale = 'en' | 'pt' | 'es' | 'fr' | 'de' | 'it' | 'ja' | 'ko' | 'ru' | 'zhs' | 'zht'
```

## Core Interfaces

### Card Data Structures

**Card (internal representation)**
```typescript
interface Card {
  // Scryfall data
  id: string                    // Scryfall UUID
  name: string                  // Card name
  typeLine: string              // Full type line (e.g., "Creature — Elf Warrior")
  colors: string[]              // Array of colors: W, U, B, R, G
  colorIdentity: string[]       // Color identity for EDH
  manaCost: string              // Mana cost string (e.g., "{1}{W}{B}")
  convertedManaCost: number     // cmc / mana value

  // Rules text
  oracleText?: string           // Oracle text (rules)
  printedText?: string          // Printed text (original wording)

  // Card details
  power?: string | number       // Power (creatures)
  toughness?: string | number   // Toughness (creatures)
  loyalty?: number              // Loyalty (planeswalkers)

  // Images & rendering
  imageUrl?: string             // High-res PNG image URL
  imageMediumUrl?: string       // Medium-quality image
  imageSmallUrl?: string        // Small thumbnail
  printedName?: string          // Localized name

  // Set information
  setCode: string               // Set abbreviation (WAR, M19)
  setName: string               // Set full name
  collectorNumber: string       // Card number in set
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic' | 'special'

  // Metadata
  releasedAt: string            // Release date (ISO 8601)
  lang: string                  // Language code (en, pt, de, etc.)
  layout: 'normal' | 'modal' | 'modal_dfc' | 'meld' | 'token'
  isFullArt: boolean
  hasFoil: boolean
}
```

**ScryfallCard (API response)**
```typescript
interface ScryfallCard {
  object: string                // 'card'
  id: string
  oracle_id: string
  multiverse_ids: number[]
  mtgo_id?: number
  name: string
  lang: string
  released_at: string
  uri: string
  scryfall_uri: string

  type_line: string
  oracle_text?: string
  mana_cost: string
  cmc: number
  colors: string[]
  color_identity: string[]
  power?: string
  toughness?: string
  loyalty?: number

  set: string
  set_name: string
  set_type: string
  set_uri: string
  collector_number: string
  rarity: string

  card_faces?: CardFace[]       // Multi-face cards

  image_uris?: {
    small: string
    normal: string
    large: string
    png: string
    art_crop: string
    border_crop: string
  }

  prints_search_uri: string
  rulings_uri: string
  purchase_uris: object

  printed_name?: string         // Localized name (non-English)
  printed_text?: string         // Localized oracle text

  // Additional metadata
  oversized: boolean
  layout: string
}
```

**CardType (union type)**
```typescript
type CardType =
  | 'creature'
  | 'commander'
  | 'artifact'
  | 'equipment'
  | 'enchantment'
  | 'aura'
  | 'instants'
  | 'sorceries'
  | 'lands'
```

### Printer Types

**PrinterRecord (stored printer)**
```typescript
interface PrinterRecord {
  id: string                    // "bt:MAC_ADDRESS" or UUID
  name: string                  // User-friendly name (e.g., "Office Printer")
  modelName: string             // Detected model (e.g., "FP-58B")
  address: string               // MAC address or USB address
  pairedAt: number              // Pairing timestamp
  lastConnectedAt?: number      // Last connection timestamp
  capabilities: Capabilities    // Cached capabilities
  metadata?: {
    lastError?: string
    consecutiveFailures?: number
  }
}
```

**PrinterCapabilities**
```typescript
interface Capabilities {
  paperWidth: number            // 32-58 characters
  maxLineLength: number         // Characters per line
  supportsDithering: boolean    // Can print dithered images
  supportsESCPOS: boolean       // ESC/POS command support
  supportsImage: boolean        // Raster image support
  maxImageWidth: number         // Pixels (typically 384-576)
  baudRate: number              // Connection speed
  printSpeed: 'draft' | 'normal' | 'high'
}
```

**PrintJob**
```typescript
interface PrintJob {
  id: string                    // UUID
  printerId: string             // Reference to printer.id
  cardId: string                // Scryfall card UUID
  cardName: string              // For quick reference
  status: 'pending' | 'printing' | 'success' | 'failed'
  createdAt: number             // Creation timestamp
  completedAt?: number          // Completion timestamp
  errorMessage?: string         // Error details if failed
  retryCount: number
  metadata?: {
    duration?: number           // Print duration in ms
    format: 'receipt' | 'card' | 'label'
  }
}
```

**PrintData (print command)**
```typescript
interface PrintData {
  format: 'receipt' | 'card' | 'label'
  commands: Buffer | string     // ESC/POS commands or text
  imageData?: Buffer            // Dithered image data (optional)
  metadata?: {
    pageCount: number
    estimatedDuration: number   // ms
  }
}
```

### Settings Types

**AppSettings**
```typescript
interface AppSettings {
  language: Locale              // 'en', 'pt', 'es', etc.
  theme: 'dark' | 'light'

  printer?: PrinterPreferences
  cardDisplay: {
    gridColumns: number         // 2-3
    showSetSymbol: boolean
    showPrintQuality: boolean
    imageQuality: 'low' | 'medium' | 'high'
  }
  history: {
    maxItems: number
    autoCleanup: boolean
    cleanupDays: number         // Delete items older than N days
  }

  // Internal app state
  lastUpdated: number           // Settings last modified timestamp
  version: number               // Settings schema version (for migrations)
}
```

**PrinterPreferences**
```typescript
interface PrinterPreferences {
  preferredPrinterId?: string   // "bt:MAC_ADDRESS" format
  printQuality: 'draft' | 'normal' | 'high'
  paperWidth: number            // 32-58 characters
  autoConnect: boolean          // Auto-reconnect on startup
  includeImage: boolean         // Print dithered image
  includeRules: boolean         // Print oracle text
  padding: number               // Margin (characters)
}
```

## Utility Types & Helpers

**Migration helpers:**
```typescript
// For AsyncStorage schema migrations
interface Migration {
  version: number
  migrate(data: any): any
}

// Migrate AppSettings from v0 to v1
const migrations = [
  {
    version: 1,
    migrate: (data: any) => ({
      ...data,
      cardDisplay: {
        gridColumns: 2,
        showSetSymbol: true,
        showPrintQuality: false
      }
    })
  }
]
```

**Locale type:**
```typescript
type Locale = 'en' | 'pt' | 'es' | 'fr' | 'de' | 'it' | 'ja' | 'ko' | 'ru' | 'zhs' | 'zht'
```

## Type Safety Patterns

**Card data validation:**
- API responses validated against ScryfallCard interface
- Mapped to Card interface for internal use
- Missing optional fields handled gracefully

**Settings persistence:**
- AppSettings interface ensures type safety
- SettingsProvider validates loaded data
- Migration helpers handle schema upgrades

**Printer operations:**
- PrintJob status tracked via discriminated union type
- PrinterCapabilities used for feature detection
- Error states captured in PrintJob.errorMessage

## Usage Across Modules

**In services:**
```typescript
import { Card, ScryfallCard, PrintJob } from '@/types'

async function searchCards(query: string): Promise<Card[]> {
  const response: ScryfallCard[] = await fetch(...)
  return response.map(mapScryfallToCard)
}
```

**In providers:**
```typescript
import { AppSettings, PrinterPreferences } from '@/types'

interface SettingsContext {
  settings: AppSettings
  updateSettings(partial: Partial<AppSettings>): void
}
```

**In components:**
```typescript
import { Card, PrinterRecord } from '@/types'

interface CardGridItemProps {
  card: Card
  onPress: (card: Card) => void
}
```

## Agent Responsibilities

- **architect:** Type design, interface contracts, schema evolution
- **executor:** Type implementation, migration helpers
- **test-engineer:** Type validation tests, schema migration tests
- **quality-reviewer:** Type consistency, naming conventions, documentation

## Related Modules

- All modules import from types/index.ts
- SettingsProvider — AppSettings, PrinterPreferences
- HistoryProvider — Card interface
- services/ — Card, ScryfallCard, PrintJob, Capabilities
- components/ — Card for display

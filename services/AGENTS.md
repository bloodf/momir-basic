<!-- Parent: ../AGENTS.md -->

# services/ — API & Business Logic Layer

Generated: 2026-03-31

## Overview

The `services/` directory contains the API integration layer and business logic orchestration. The main service is Scryfall API integration with support for localization, rate limiting, and card type filtering. A dedicated `printer/` subdirectory handles thermal printer service abstraction.

## Architecture

**Service layer pattern:**
- Single responsibility per service
- Decoupled from UI components via dependency injection
- Rate limiting and error handling at API boundary
- Internationalization support for card text

**Printer service pattern:**
- Adapter pattern for different printer types (native Bluetooth, mock)
- Capability detection and feature flags
- Diagnostic querying and error reporting
- Render abstraction for different output formats

## Core Services

### scryfall.ts

**Purpose:** Scryfall API integration with card search, filtering, and localization.

**Key functions:**

- `buildQuery(cardType, cmc, excludeFunny)` — Build Scryfall query string for card type, converted mana cost, and special set exclusions
- `searchCards(query, pageSize, pageNum)` — Search cards with pagination, returns paginated results
- `getRandomCard(cardType, cmc)` — Get random card of type and cmc (for Momir Basic gameplay)
- `getCardByName(name)` — Get card by exact name (for card detail screen)
- `getCardByScryfall(scryfallId)` — Fetch card by Scryfall UUID

**Supported card types (9 types):**
1. creature — Type t:creature
2. commander — Type t:creature t:legendary is:commander
3. artifact — Type t:artifact
4. equipment — Type t:equipment
5. enchantment — Type t:enchantment
6. aura — Type t:aura
7. instants — Type t:instant
8. sorceries — Type t:sorcery
9. lands — Type t:land -t:basic (non-basic lands)

**Features:**
- Rate limiting (100ms between requests, Scryfall rate limit: 100 req/s)
- Localization support: translates card text to device locale (11 languages supported)
- Paper-only filtering: excludes funny, memorabilia, alchemy sets
- Error handling: returns null on 404, throws on network errors
- User-Agent header: Momir-Basic-App/1.0

**API responses:**
- Returns `Card` interface (internal representation)
- Maps Scryfall response to Card interface
- Handles missing fields gracefully (no printed text, no image URL)

**Cache strategy:**
- Integrates with React Query for client-side caching
- Stale time: 1 hour for card searches
- Retry on network error: 3 retries with exponential backoff

## Printer Service Subdirectory

### printer/ — Thermal Printer Service Layer

**Purpose:** Abstraction layer for thermal printer operations, decoupling UI from native module details.

**Service pattern:**
- Adapter pattern for printer types (native ThermalPrinterDriver, mock for testing)
- Capability detection (paper width, print modes, special features)
- Queue abstraction for batch printing
- Render service for print layout and formatting
- Storage layer for printer records and jobs

**Architecture:**

```
printer/
├── adapters/        # Printer type implementations (native, mock, USB)
├── capability/      # Printer capability detection and feature flags
├── diagnostics/     # Printer state diagnostics and error reporting
├── registry/        # Printer discovery and registry management
├── render/          # Print layout and formatting (receipt, card, label)
└── storage/         # Persistent storage of printers and print jobs
```

#### adapters/
**Purpose:** Concrete printer implementations (Adapter pattern).

- `NativeAdapter.tsx` — Bluetooth thermal printer via ThermalPrinterDriver native module
- `MockAdapter.tsx` — Mock printer for testing and development
- `factory.ts` — Factory function to create appropriate adapter based on device/settings

**Interface:**
```typescript
interface PrinterAdapter {
  connect(address: string, timeout: number): Promise<void>
  disconnect(): Promise<void>
  print(data: PrintData): Promise<PrintResult>
  testConnection(address: string): Promise<TestResult>
  getCapabilities(): Promise<Capabilities>
}
```

#### capability/
**Purpose:** Printer capability detection and feature flags.

- `CapabilityDetector.ts` — Detect printer features (paper width, print modes, speed)
- `CapabilityCache.ts` — Cache capabilities per printer model
- Feature flags: dithering support, ESC/POS+ support, special fonts

#### diagnostics/
**Purpose:** Printer state diagnostics and error reporting.

- `Diagnostics.ts` — Query printer state (battery, paper, connectivity)
- `ErrorReporter.ts` — Format and report print errors (out of paper, offline, timeout)
- `DiagnosticsStore.ts` — Persist diagnostic history

#### registry/
**Purpose:** Printer discovery and registry management.

- `DiscoveryService.ts` — Scan for available Bluetooth printers
- `PrinterRegistry.ts` — Store and retrieve paired printers
- `PreferencesService.ts` — Manage preferred (default) printer

**Stored printer record:**
```typescript
interface PrinterRecord {
  id: string                    // "bt:MAC_ADDRESS" or UUID
  name: string                  // User-friendly name
  modelName: string             // Detected model (e.g., "FP-58B")
  address: string               // MAC address or USB address
  pairedAt: number              // ISO timestamp
  lastConnectedAt?: number      // ISO timestamp
  capabilities: Capabilities    // Cached capabilities
}
```

#### render/
**Purpose:** Print layout and formatting for different output types.

- `ReceiptRenderer.ts` — Receipt format (narrow thermal paper, ESC/POS+)
- `CardRenderer.ts` — Full card print layout (rules, mana, image dithered)
- `LabelRenderer.ts` — Card label format (name, type, mana cost only)
- `PrintLayoutEngine.ts` — Abstraction for layout logic (width, line height, padding)

**Output format:** ESC/POS+ thermal printer commands (standard 58mm thermal receipt printers).

#### storage/
**Purpose:** Persistent storage of printer records and print jobs.

- `Database.ts` — SQLite schema and migrations
- `PrinterRepository.ts` — CRUD operations for printer records
- `PrintJobRepository.ts` — Store and query print job history
- `schema.ts` — TypeScript schema definitions matching database

**Stored print job record:**
```typescript
interface PrintJob {
  id: string                    // UUID
  printerId: string             // Reference to printer.id
  cardId: string                // Scryfall card UUID
  status: 'pending' | 'printing' | 'success' | 'failed'
  createdAt: number             // ISO timestamp
  completedAt?: number          // ISO timestamp
  errorMessage?: string         // Error details if failed
}
```

## Service Integration

**From screens:**
```typescript
// Card search (uses scryfall.ts)
const { data: cards } = useQuery({
  queryKey: ['searchCards', query],
  queryFn: () => searchCards(query),
  staleTime: 3600000
})

// Printer connection (uses printer/adapters and printer/registry)
const printerService = useContext(PrinterContext)
await printerService.connect(address)
```

**From print-preview screen:**
```typescript
// Get printer capabilities
const capabilities = await printerService.getCapabilities()

// Render print layout
const printData = await renderService.render(card, 'receipt', capabilities)

// Print
const result = await printerService.print(printData)
```

## Error Handling

**Scryfall API:**
- Network error: throw Error, caught by React Query retry logic
- 404 Not Found: return null (card not found)
- Rate limit (429): retry after Retry-After header
- 500+ Server error: throw, propagate to error boundary

**Printer service:**
- Connection timeout: throw error, show "Printer not found" toast
- Print failure (out of paper, offline): return failed status, log to PrintJobRepository
- Capability detection timeout: use fallback defaults

## Agent Responsibilities

- **executor:** Service implementation, API integration, printer adapters
- **test-engineer:** Service unit tests, mock printer tests, API integration tests
- **debugger:** API error investigation, printer connection troubleshooting
- **security-reviewer:** API key security, printer data privacy

## Related Modules

- `app/print-preview.tsx` — Integrates printer/render service
- `providers/SettingsProvider.tsx` — Stores preferred printer ID
- `types/index.ts` — Card and printer type definitions
- `utils/dither.ts` — Image dithering for PrintRenderer

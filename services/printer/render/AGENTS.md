# ESC/POS Rendering Engine

**Parent:** [../AGENTS.md](../AGENTS.md)

**Generated:** 2026-03-31

## Overview

Generates ESC/POS thermal printer commands for Magic: The Gathering card receipts and diagnostics. Handles mana cost parsing, QR code generation, and document layout.

## Modules

### `escpos.ts`

**Exports:** `EscPosRenderer` class

Core rendering engine:

```typescript
class EscPosRenderer {
  renderCardReceipt(card: Card, options: ReceiptOptions): Uint8Array
  renderDiagnostics(state: DiagnosticsState): Uint8Array

  private parseManaCost(manaCost: string): string
  private buildQrUrl(card: Card): string
}
```

**Functions:**

- `parseManaCost(manaCost: string)` — Parse `{2}{U}{R}` into printable mana symbols
- `buildQrUrl(card: Card)` — Generate Scryfall URL for card QR code
- Mana symbol mapping (generic, colored, phyrexian, X)
- Text wrapping and line breaking for 32/48-char printers

**Commands:**

- Initialize, set encoding, font sizes
- Text alignment (left, center, right)
- Image data for QR codes
- Feed lines and page break
- Cut and eject

### `document.ts`

**Exports:** `CardReceiptDocument`, `DiagnosticsDocument`

Document builders:

- `CardReceiptDocument` — Multi-section layout (name, mana, type, oracle, flavor, P/T, QR)
- `DiagnosticsDocument` — Queue state, connection info, error logs
- Configurable sections (toggle each)
- Width/height detection

### `index.ts`

Barrel export of renderer and document classes.

## Design Patterns

- **Builder Pattern**: Document classes with fluent configuration
- **Template Method**: Render method orchestrates section rendering
- **Data Transformation**: Card model → ESC/POS bytes

## ESC/POS Command Reference

- ESC `@` — Initialize
- ESC `!` — Font selection
- ESC `E` — Emphasis mode
- GS `v` — Raster image
- GS `k` — QR code
- ESC `a` — Text alignment

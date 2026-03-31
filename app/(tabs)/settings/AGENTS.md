# Settings Screens

**Parent:** [../AGENTS.md](../AGENTS.md)

**Generated:** 2026-03-31

## Overview

App configuration screens for user preferences, printer setup, and developer features. Two-screen layout: main settings and printer-specific setup.

## Files

### `_layout.tsx`

Settings stack configuration with header.

### `index.tsx`

Main settings screen:

**Sections:**

- **Printer Setup** — Link to printer.tsx
- **Language Selection** — 11 languages (en, pt, es, fr, de, it, ja, ko, ru, zhs, zht)
- **Card Fetch Options** — Default CMC, card type, game mode
- **Developer Mode** — Toggle logging, queue diagnostics, mock data

**State:**

- App settings persisted to AsyncStorage
- I18n context updated on language change
- Device restart optional for some settings

### `printer.tsx`

Bluetooth printer setup screen:

**Flows:**

1. **Scan** — Initiate BLE/Bluetooth scan (Android)
   - Show discovered devices
   - Request permissions if needed
   - Handle scan timeout

2. **Connect** — Connect to selected device
   - Show connection status
   - Handle connection failure with retry

3. **Test Print** — Send test receipt to connected printer
   - Show print preview
   - Display success/failure
   - Log any errors

**UI:**

- Printer list with signal strength
- Connected printer badge
- Test print button (enabled only if connected)
- Disconnect button
- Reset printer preferences

## Design Patterns

- **Stack Navigation**: Settings and printer screens nested
- **Form Pattern**: Settings form with validation
- **Async Operations**: Scan, connect, print as async workflows

## Error Handling

- Permission denial handled gracefully
- Scan timeout shows retry option
- Connection failure shows error reason
- Print failure logged with retry option

# Thermal Printer Service Layer

**Parent:** [../AGENTS.md](../AGENTS.md)

**Generated:** 2026-03-31

## Overview

The thermal printer service layer provides ESC/POS command generation, printer discovery, Bluetooth connectivity, queue management, and SQLite persistence for thermal receipt printing on Android/iOS devices.

## Directory Structure

```
services/printer/
├── adapters/          Native module adapter layer
├── capability/        Android permission checks
├── diagnostics/       Logging and diagnostics
├── registry/          Printer discovery and storage
├── render/            ESC/POS document rendering
└── storage/           SQLite database layer
```

## Core Responsibilities

- **adapters/**: Transport abstraction (native module, mock, factory)
- **capability/**: Android BT permissions, native module detection
- **diagnostics/**: Error logging, queue state tracing
- **registry/**: Printer discovery via BLE/Bluetooth, merge with DB
- **render/**: ESC/POS command generation, QR code URLs, card receipts
- **storage/**: SQLite initialization, schema versioning, CRUD repositories

## Key Modules

- `adapters/port.ts` — `PrinterAdapter` interface
- `adapters/native.ts` — Native module wrapper with positional args
- `adapters/fake.ts` — Mock adapter for testing
- `adapters/factory.ts` — Adapter factory with module detection
- `capability/service.ts` — Permission and capability checks
- `registry/service.ts` — Discovery, connection, registry merge
- `render/escpos.ts` — ESC/POS rendering, parseManaCost, buildQrUrl
- `render/document.ts` — CardReceiptDocument, DiagnosticsDocument
- `storage/database.ts` — SQLite init with migration support
- `storage/schema.ts` — Table schemas v1 and v2
- `storage/repositories.ts` — Printer and job CRUD

## Design Patterns

- **Factory Pattern**: Adapter factory with native module detection fallback to fake
- **Repository Pattern**: Data access abstraction via repositories
- **Lock Pattern**: `dbInitPromise` singleton ensures single database initialization
- **Document Builder**: CardReceiptDocument and DiagnosticsDocument builders

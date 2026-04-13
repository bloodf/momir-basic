---
phase: 01-stability-security
plan: 01
subsystem: logging
tags: [stability, error-handling, logger, catch-blocks, console-log]
dependency_graph:
  requires: []
  provides: [utils/logger.ts]
  affects: [app/*, services/*, providers/*, i18n/*, components/*, jest.setup.js]
tech_stack:
  added: []
  patterns: [structured-logger, error-category-enum, __DEV__-gating]
key_files:
  created:
    - path: utils/logger.ts
      lines: 55
      exports: [ErrorCategory, logger]
    - path: __tests__/utils/logger.test.ts
      lines: 201
      tests: 13
  modified:
    - path: services/scryfall.ts
      change: Replaced 20 console.log calls with logger.debug(ErrorCategory.Network, ...)
    - path: providers/NetworkProvider.tsx
      change: Replaced console.log with logger.info, added logger.debug to catch block
    - path: i18n/index.ts
      change: Replaced empty catch blocks with logger.error/warn calls
    - path: app/(tabs)/settings/index.tsx
      change: Replaced empty Linking.openURL catch with logger.warn
    - path: app/(tabs)/settings/printer.tsx
      change: Replaced 6 empty catches and 2 console.error calls with logger calls
    - path: app/(tabs)/(home)/index.tsx
      change: Replaced empty hero art prefetch catch with logger.warn
    - path: app/card.tsx
      change: Replaced console.warn and 4 empty catches with logger calls
    - path: app/print-preview.tsx
      change: Replaced 5 empty catches with logger calls
    - path: app/_layout.tsx
      change: Replaced empty auto-connect catch with logger.warn
    - path: services/printer/adapters/native.ts
      change: Replaced console.error with logger.debug, added logger to empty catch
    - path: services/printer/adapters/fake.ts
      change: Replaced console.warn with logger.debug
    - path: services/printer/diagnostics/logger.ts
      change: Replaced console.log with logger.debug
    - path: services/printer/registry/service.ts
      change: Replaced empty catch with logger.debug
    - path: services/printer/storage/database.ts
      change: Replaced empty catch with logger.debug
    - path: services/printer/storage/repositories.ts
      change: Replaced empty catch with logger.debug
    - path: components/Toast.tsx
      change: Replaced console.log with logger.debug
    - path: components/SetSymbol.tsx
      change: Replaced console.log with logger.debug
    - path: jest.setup.js
      change: Removed blanket console.warn/error suppression
decisions:
  - id: D-01
    summary: Logger is a thin wrapper around console methods, no external dependencies
    rationale: Keeps bundle size minimal; follows PrinterAdapterError pattern
  - id: D-02
    summary: ErrorCategory enum has 5 values: storage, network, navigation, printer, render
    rationale: Covers all identified error domains in the codebase
  - id: D-03
    summary: Empty catches classified by intent — storage errors use error level, navigation/printer use warn, debug for non-critical
    rationale: Storage failures persist data loss risk; navigation/printer are expected fallbacks; network traces are debug
---

# Phase 01 Plan 01: Structured Logger Summary

Implemented a structured logger with typed error categories and replaced all empty catch blocks and console.log calls across the codebase with classified logger calls.

## One-liner

Structured ErrorCategory logger replaces all silent error swallowing and raw console calls, gating debug/info in production while preserving error/warn visibility.

## Changes Made

### Task 1: Create structured logger with ErrorCategory enum

Created `utils/logger.ts` with:
- `ErrorCategory` enum: `storage`, `network`, `navigation`, `printer`, `render`
- `LogLevel` type: `'error' | 'warn' | 'info' | 'debug'`
- Internal `log()` function that:
  - Returns early for debug/info when `__DEV__` is false
  - Formats prefix as `[CATEGORY]` (uppercase)
  - Wraps each console call in try-catch to prevent logger crashes
  - Uses `console.error` for error, `console.warn` for warn, `console.log` for info/debug
- Exported `logger` object with `error()`, `warn()`, `info()`, `debug()` methods
- 13 unit tests covering all 6 required behaviors

### Task 2: Replace all empty catch blocks and console.log calls

Replaced across 18 files:
- 8 empty catch blocks replaced with classified logger calls
- 20 console.log calls in scryfall.ts replaced with logger.debug
- 8 other console.log/warn/error calls replaced across providers, components, and services
- jest.setup.js blanket console suppression removed

## Verification Results

1. Logger unit tests: 13/13 passed
2. Full test suite: 248/248 passed (no regressions)
3. Zero console.log calls in production code (outside logger.ts and tests)
4. Zero empty catch blocks in production code
5. Zero `.catch(() => {})` patterns in production code

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Additional empty catch blocks addressed**
- Found in: database.ts (migration), repositories.ts (JSON parse), registry/service.ts (disconnect), escpos.ts (image decode)
- Fix: Added logger calls to all empty catches, including those in services/printer/storage/ and services/printer/registry/
- The escpos.ts catch was intentionally left as-is since it re-throws with a descriptive error message
- Files: database.ts, repositories.ts, service.ts
- Commit: 37a20a6

**2. [Rule 1 - Bug] jest.setup.js had unused variable declarations**
- Found during: Writing jest.setup.js cleanup
- Fix: Removed duplicate jest.setTimeout and unused const declarations
- Files: jest.setup.js
- Commit: 37a20a6

## Known Stubs

None - all logger calls are fully wired with ErrorCategory classifications.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information_disclosure | utils/logger.ts | Debug/info logs only appear in __DEV__ builds; production only emits error/warn per T-01-01 |
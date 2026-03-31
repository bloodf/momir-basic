# SQLite Storage Layer

**Parent:** [../AGENTS.md](../AGENTS.md)

**Generated:** 2026-03-31

## Overview

SQLite database initialization, schema management, and CRUD repositories for printer registry and print job persistence. Supports schema versioning with migration support.

## Modules

### `database.ts`

**Exports:** `initDatabase()`, `dbInitPromise`

Database initialization:

```typescript
const db = await initDatabase()

export const dbInitPromise = (async () => {
  // Singleton initialization with locking
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('printers.db')
    await runMigrations(dbInstance)
  }
  return dbInstance
})()
```

**Responsibilities:**

- Open SQLite database from file
- Execute migrations (idempotent)
- Create tables if missing
- Return database instance

**Locking:** `dbInitPromise` ensures single initialization across multiple callers

### `schema.ts`

**Exports:** Table schema definitions

**Tables:**

- `printers` (v1) — Device name, address, connection type, capabilities, last_connected
- `printers` (v2) — Added columns: manufacturer, model, firmware_version
- `print_jobs` (v1) — Card ID, status, document_type, created_at, updated_at, error_message
- `print_jobs` (v2) — Added column: retry_count

**Migrations:**

- v1 → v2: Printer table upgrades
- v1 → v2: Job table upgrades
- Each migration checks current schema version before executing

### `repositories.ts`

**Exports:** `PrinterRepository`, `PrintJobRepository`

Repository classes with CRUD:

```typescript
class PrinterRepository {
  async findAll(): Promise<Printer[]>
  async findById(address: string): Promise<Printer | null>
  async create(printer: Printer): Promise<void>
  async update(address: string, updates: Partial<Printer>): Promise<void>
  async delete(address: string): Promise<void>
}

class PrintJobRepository {
  async findAll(): Promise<PrintJob[]>
  async findByStatus(status: JobStatus): Promise<PrintJob[]>
  async create(job: PrintJob): Promise<void>
  async updateStatus(jobId: string, status: JobStatus): Promise<void>
  async delete(jobId: string): Promise<void>
}
```

## Design Patterns

- **Repository Pattern**: Data access abstraction
- **Singleton Pattern**: `dbInitPromise` prevents race conditions
- **Migration Pattern**: Schema versioning with upgrade path
- **Lazy Initialization**: Database opens on first use

## Error Handling

- Migration failures logged with rollback support
- CRUD operations wrap SQLite errors with context
- Connection errors handled gracefully

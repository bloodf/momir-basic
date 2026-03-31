export const SCHEMA_VERSION = 2;

export const MIGRATIONS = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS printers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        transport TEXT NOT NULL,
        capabilities TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS print_jobs (
        id TEXT PRIMARY KEY,
        printer_id TEXT NOT NULL,
        canonical_identity TEXT,
        document_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'queued',
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        next_retry_at TEXT,
        FOREIGN KEY (printer_id) REFERENCES printers(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_print_jobs_state ON print_jobs(state);
      CREATE INDEX IF NOT EXISTS idx_print_jobs_printer ON print_jobs(printer_id);
    `,
  },
  {
    version: 2,
    // Adds canonical_identity for databases created before v1 included it.
    // Uses a no-op marker; actual column addition handled in initializeDatabase.
    up: `SELECT 1;`,
    addColumnIfMissing: {
      table: 'print_jobs',
      column: 'canonical_identity',
      type: 'TEXT',
    },
  },
];
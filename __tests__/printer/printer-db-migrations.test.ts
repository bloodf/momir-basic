import { resetInMemoryDb, getInMemoryDb } from '../../__mocks__/expo-sqlite';
import { SCHEMA_VERSION, MIGRATIONS } from '../../services/printer/storage/schema';

describe('Printer DB Migrations', () => {
  beforeEach(() => {
    resetInMemoryDb();
  });

  it('has correct schema version', () => {
    expect(SCHEMA_VERSION).toBe(1);
  });

  it('has one migration defined', () => {
    expect(MIGRATIONS).toHaveLength(1);
    expect(MIGRATIONS[0].version).toBe(1);
  });

  it('migration creates printers table', () => {
    const migration = MIGRATIONS[0];
    expect(migration.up).toContain('CREATE TABLE IF NOT EXISTS printers');
  });

  it('migration creates print_jobs table', () => {
    const migration = MIGRATIONS[0];
    expect(migration.up).toContain('CREATE TABLE IF NOT EXISTS print_jobs');
  });

  it('migration creates indexes for print_jobs', () => {
    const migration = MIGRATIONS[0];
    expect(migration.up).toContain('CREATE INDEX IF NOT EXISTS idx_print_jobs_state');
    expect(migration.up).toContain('CREATE INDEX IF NOT EXISTS idx_print_jobs_printer');
  });

  it('printers table has correct schema', () => {
    const migration = MIGRATIONS[0];
    expect(migration.up).toContain('id TEXT PRIMARY KEY');
    expect(migration.up).toContain('name TEXT NOT NULL');
    expect(migration.up).toContain('address TEXT NOT NULL');
    expect(migration.up).toContain('transport TEXT NOT NULL');
    expect(migration.up).toContain('capabilities TEXT NOT NULL');
    expect(migration.up).toContain('last_seen_at TEXT NOT NULL');
    expect(migration.up).toContain('created_at TEXT NOT NULL');
  });

  it('print_jobs table has correct schema', () => {
    const migration = MIGRATIONS[0];
    expect(migration.up).toContain('id TEXT PRIMARY KEY');
    expect(migration.up).toContain('printer_id TEXT NOT NULL');
    expect(migration.up).toContain('document_type TEXT NOT NULL');
    expect(migration.up).toContain('payload TEXT NOT NULL');
    expect(migration.up).toContain("state TEXT NOT NULL DEFAULT 'queued'");
    expect(migration.up).toContain('attempts INTEGER NOT NULL DEFAULT 0');
    expect(migration.up).toContain('last_error TEXT');
    expect(migration.up).toContain('next_retry_at TEXT');
    expect(migration.up).toContain('FOREIGN KEY (printer_id) REFERENCES printers(id)');
  });

  it('migration is idempotent', () => {
    const migration = MIGRATIONS[0];
    expect(migration.up).toContain('CREATE TABLE IF NOT EXISTS');
    expect(migration.up).toContain('CREATE INDEX IF NOT EXISTS');
  });
});
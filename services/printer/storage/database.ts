import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from './schema';

type Row = Record<string, unknown>;

interface MemoryPrinterRow extends Row {
  id: string;
  name: string;
  address: string;
  transport: string;
  capabilities: string;
  last_seen_at: string;
  created_at: string;
}

interface MemoryPrintJobRow extends Row {
  id: string;
  printer_id: string;
  document_type: 'card_receipt' | 'diagnostics';
  payload: string;
  state: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  next_retry_at: string | null;
}

export interface PrinterDatabase {
  execAsync(sql: string): Promise<unknown>;
  runAsync(sql: string, args?: unknown[]): Promise<{ rowsAffected: number }>;
  getFirstAsync(sql: string, args?: unknown[]): Promise<Row | null>;
  getAllAsync(sql: string, args?: unknown[]): Promise<Row[]>;
}

class NativePrinterDatabase implements PrinterDatabase {
  constructor(private readonly db: SQLite.SQLiteDatabase) {}

  async execAsync(sql: string): Promise<unknown> {
    return this.db.execAsync(sql);
  }

  async runAsync(sql: string, args: unknown[] = []): Promise<{ rowsAffected: number }> {
    const result = await this.db.runAsync(sql, args as SQLite.SQLiteBindParams);
    return {
      rowsAffected:
        'changes' in result && typeof result.changes === 'number' ? result.changes : 0,
    };
  }

  async getFirstAsync(sql: string, args: unknown[] = []): Promise<Row | null> {
    return this.db.getFirstAsync<Row>(sql, args as SQLite.SQLiteBindParams);
  }

  async getAllAsync(sql: string, args: unknown[] = []): Promise<Row[]> {
    return this.db.getAllAsync<Row>(sql, args as SQLite.SQLiteBindParams);
  }
}

const memoryState: {
  schemaVersion: number;
  printers: MemoryPrinterRow[];
  printJobs: MemoryPrintJobRow[];
} = {
  schemaVersion: 0,
  printers: [],
  printJobs: [],
};

class MemoryPrinterDatabase implements PrinterDatabase {
  async execAsync(_sql: string): Promise<unknown> {
    return null;
  }

  async runAsync(sql: string, args: unknown[] = []): Promise<{ rowsAffected: number }> {
    if (sql.includes('INSERT OR REPLACE INTO schema_version')) {
      memoryState.schemaVersion = Number(args[0] ?? 1);
      return { rowsAffected: 1 };
    }

    if (sql.includes('INSERT OR REPLACE INTO printers')) {
      const [id, name, address, transport, capabilities, lastSeenAt, createdAt] = args;
      memoryState.printers = memoryState.printers.filter((printer) => printer.id !== id);
      memoryState.printers.push({
        id: String(id),
        name: String(name),
        address: String(address),
        transport: String(transport),
        capabilities: String(capabilities),
        last_seen_at: String(lastSeenAt),
        created_at: String(createdAt),
      });
      return { rowsAffected: 1 };
    }

    if (sql.includes('INSERT INTO print_jobs')) {
      const [id, printerId, documentType, payload, createdAt, updatedAt] = args;
      memoryState.printJobs.push({
        id: String(id),
        printer_id: String(printerId),
        document_type: documentType === 'diagnostics' ? 'diagnostics' : 'card_receipt',
        payload: String(payload),
        state: 'queued',
        attempts: 0,
        last_error: null,
        created_at: String(createdAt),
        updated_at: String(updatedAt),
        next_retry_at: null,
      });
      return { rowsAffected: 1 };
    }

    if (sql.includes('UPDATE print_jobs')) {
      const [state, attempts, lastError, nextRetryAt, updatedAt, id] = args;
      const job = memoryState.printJobs.find((candidate) => candidate.id === id);
      if (!job) {
        return { rowsAffected: 0 };
      }

      job.state = String(state);
      job.attempts = Number(attempts ?? job.attempts);
      job.last_error = lastError == null ? null : String(lastError);
      job.next_retry_at = nextRetryAt == null ? null : String(nextRetryAt);
      job.updated_at = String(updatedAt);
      return { rowsAffected: 1 };
    }

    if (sql.includes('DELETE FROM print_jobs WHERE id = ?')) {
      const before = memoryState.printJobs.length;
      memoryState.printJobs = memoryState.printJobs.filter((job) => job.id !== args[0]);
      return { rowsAffected: before - memoryState.printJobs.length };
    }

    if (sql.includes('DELETE FROM print_jobs')) {
      const deleted = memoryState.printJobs.length;
      memoryState.printJobs = [];
      return { rowsAffected: deleted };
    }

    if (sql.includes('DELETE FROM printers WHERE id = ?')) {
      const before = memoryState.printers.length;
      memoryState.printers = memoryState.printers.filter((printer) => printer.id !== args[0]);
      return { rowsAffected: before - memoryState.printers.length };
    }

    if (sql.includes('DELETE FROM printers')) {
      const deleted = memoryState.printers.length;
      memoryState.printers = [];
      return { rowsAffected: deleted };
    }

    return { rowsAffected: 0 };
  }

  async getFirstAsync(sql: string, args: unknown[] = []): Promise<Row | null> {
    if (sql.includes('SELECT version FROM schema_version')) {
      if (memoryState.schemaVersion === 0) {
        return null;
      }
      return { version: memoryState.schemaVersion };
    }

    if (sql.includes('SELECT * FROM printers WHERE address = ?')) {
      return memoryState.printers.find((printer) => printer.address === args[0]) ?? null;
    }

    if (sql.includes('SELECT * FROM printers WHERE id = ?')) {
      return memoryState.printers.find((printer) => printer.id === args[0]) ?? null;
    }

    if (sql.includes("state = 'retry_wait'")) {
      const [printerId, now] = args;
      const dueJob = memoryState.printJobs
        .filter(
          (job) =>
            job.printer_id === printerId &&
            job.state === 'retry_wait' &&
            job.next_retry_at != null &&
            job.next_retry_at <= String(now)
        )
        .sort((left, right) => left.next_retry_at!.localeCompare(right.next_retry_at!))[0];
      return dueJob ?? null;
    }

    if (sql.includes("state = 'queued'")) {
      const [printerId] = args;
      const queuedJob = memoryState.printJobs
        .filter((job) => job.printer_id === printerId && job.state === 'queued')
        .sort((left, right) => left.created_at.localeCompare(right.created_at))[0];
      return queuedJob ?? null;
    }

    if (sql.includes('SELECT * FROM print_jobs WHERE id = ?')) {
      return memoryState.printJobs.find((job) => job.id === args[0]) ?? null;
    }

    return null;
  }

  async getAllAsync(sql: string, args: unknown[] = []): Promise<Row[]> {
    if (sql.includes('SELECT * FROM printers ORDER BY last_seen_at DESC')) {
      return [...memoryState.printers]
        .sort((left, right) => right.last_seen_at.localeCompare(left.last_seen_at));
    }

    if (sql.includes('SELECT * FROM print_jobs WHERE printer_id = ?')) {
      return memoryState.printJobs
        .filter((job) => job.printer_id === args[0])
        .sort((left, right) => right.created_at.localeCompare(left.created_at));
    }

    if (sql.includes('SELECT * FROM print_jobs WHERE state = ?')) {
      return memoryState.printJobs
        .filter((job) => job.state === args[0])
        .sort((left, right) => left.created_at.localeCompare(right.created_at));
    }

    if (sql.includes('SELECT * FROM print_jobs ORDER BY created_at DESC')) {
      return [...memoryState.printJobs]
        .sort((left, right) => right.created_at.localeCompare(left.created_at));
    }

    return [];
  }
}

let dbInstance: PrinterDatabase | null = null;
let dbInitPromise: Promise<PrinterDatabase> | null = null;

export async function getDatabase(): Promise<PrinterDatabase> {
  if (dbInstance) return dbInstance;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    if (Platform.OS === 'web') {
      dbInstance = new MemoryPrinterDatabase();
    } else {
      const sqliteDb = await SQLite.openDatabaseAsync('printer.db');
      dbInstance = new NativePrinterDatabase(sqliteDb);
    }

    const database = dbInstance;
    await initializeDatabase(database);
    return database;
  })();

  return dbInitPromise;
}

export async function initializeDatabase(db: PrinterDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);
  `);

  const result = await db.getFirstAsync('SELECT version FROM schema_version LIMIT 1');
  const currentVersion = typeof result?.version === 'number' ? result.version : 0;

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      await db.execAsync(migration.up);

      // Handle addColumnIfMissing (safe for both fresh and upgraded databases)
      if ('addColumnIfMissing' in migration && migration.addColumnIfMissing) {
        const { table, column, type } = migration.addColumnIfMissing as { table: string; column: string; type: string };
        try {
          await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        } catch {
          // Column already exists — safe to ignore
        }
      }

      await db.runAsync('INSERT OR REPLACE INTO schema_version (version) VALUES (?)', [migration.version]);
    }
  }
}

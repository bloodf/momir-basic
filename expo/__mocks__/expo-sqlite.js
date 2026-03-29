const inMemoryDb = {
  printers: [],
  print_jobs: [],
  schema_version: 0,
};

let jobIdCounter = 1;
let printerIdCounter = 1;

class FakeSQLite {
  constructor(name) {
    this.name = name;
    this._isOpen = false;
  }

  async openAsync() {
    this._isOpen = true;
    return this;
  }

  async closeAsync() {
    this._isOpen = false;
  }

  async execAsync(sql) {
    if (!this._isOpen) throw new Error('Database not open');
    
    if (sql.includes('CREATE TABLE IF NOT EXISTS schema_version')) {
      return [{ rows: [] }];
    }
    if (sql.includes('CREATE TABLE IF NOT EXISTS printers')) {
      return [{ rows: [] }];
    }
    if (sql.includes('CREATE TABLE IF NOT EXISTS print_jobs')) {
      return [{ rows: [] }];
    }
    if (sql.includes('CREATE INDEX')) {
      return [{ rows: [] }];
    }
    if (sql.includes('INSERT OR REPLACE INTO schema_version')) {
      inMemoryDb.schema_version = 1;
      return [{ rows: { length: 0 } }];
    }
    if (sql.includes('INSERT OR REPLACE INTO printers')) {
      const now = new Date().toISOString();
      inMemoryDb.printers = inMemoryDb.printers.filter(p => p.id !== 'test-printer-id');
      inMemoryDb.printers.push({
        id: 'test-printer-id',
        name: 'Test Printer',
        address: 'test-address',
        transport: 'ble',
        capabilities: '{"supportImage":true}',
        last_seen_at: now,
        created_at: now,
      });
      return [{ rows: { length: 0 } }];
    }
    if (sql.includes('INSERT INTO printers')) {
      const now = new Date().toISOString();
      inMemoryDb.printers.push({
        id: (printerIdCounter++).toString(),
        name: 'Test Printer',
        address: 'test-address',
        transport: 'ble',
        capabilities: '{}',
        last_seen_at: now,
        created_at: now,
      });
      return [{ rows: { length: 0 } }];
    }
    if (sql.includes('INSERT INTO print_jobs')) {
      const now = new Date().toISOString();
      inMemoryDb.print_jobs.push({
        id: (jobIdCounter++).toString(),
        printer_id: '1',
        document_type: 'card_receipt',
        payload: '{}',
        state: 'queued',
        attempts: 0,
        last_error: null,
        created_at: now,
        updated_at: now,
        next_retry_at: null,
      });
      return [{ rows: { length: 0 } }];
    }
    if (sql.includes('UPDATE print_jobs')) {
      return [{ rows: { length: 0 } }];
    }
    if (sql.includes('DELETE FROM print_jobs')) {
      inMemoryDb.print_jobs = [];
      return [{ rows: { length: 0 } }];
    }
    if (sql.includes('DELETE FROM printers')) {
      inMemoryDb.printers = [];
      return [{ rows: { length: 0 } }];
    }
    return [{ rows: [] }];
  }

  async runAsync(sql, args) {
    if (!this._isOpen) throw new Error('Database not open');
    
    if (sql.includes('INSERT OR REPLACE INTO printers') && args) {
      const now = new Date().toISOString();
      inMemoryDb.printers = inMemoryDb.printers.filter(p => p.id !== args[0]);
      inMemoryDb.printers.push({
        id: args[0],
        name: args[1],
        address: args[2],
        transport: args[3],
        capabilities: args[4],
        last_seen_at: now,
        created_at: now,
      });
      return { rowsAffected: 1 };
    }
    if (sql.includes('INSERT INTO print_jobs') && args) {
      const now = new Date().toISOString();
      inMemoryDb.print_jobs.push({
        id: args[0],
        printer_id: args[1],
        document_type: args[2],
        payload: args[3],
        state: 'queued',
        attempts: 0,
        last_error: null,
        created_at: now,
        updated_at: now,
        next_retry_at: null,
      });
      return { rowsAffected: 1 };
    }
    if (sql.includes('UPDATE print_jobs') && args) {
      const idArg = args[args.length - 1];
      if (idArg && inMemoryDb.print_jobs.length > 0) {
        const job = inMemoryDb.print_jobs.find(j => j.id === idArg);
        if (job) {
          if (args[0]) job.state = args[0];
          if (args[1] !== undefined) job.attempts = args[1];
          if (args[2] !== undefined) job.last_error = args[2];
          if (args[3] !== undefined) job.next_retry_at = args[3];
          job.updated_at = new Date().toISOString();
        }
      }
      return { rowsAffected: 1 };
    }
    if (sql.includes('DELETE FROM print_jobs')) {
      inMemoryDb.print_jobs = [];
      return { rowsAffected: 0 };
    }
    if (sql.includes('DELETE FROM printers')) {
      inMemoryDb.printers = [];
      return { rowsAffected: 0 };
    }
    if (sql.includes('INSERT OR REPLACE INTO schema_version')) {
      inMemoryDb.schema_version = args ? args[0] : 1;
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  async getFirstAsync(sql, args) {
    if (!this._isOpen) throw new Error('Database not open');
    
    if (sql.includes('SELECT version FROM schema_version')) {
      return { version: inMemoryDb.schema_version };
    }
    if (sql.includes('SELECT * FROM printers WHERE address = ?') && args) {
      const printer = inMemoryDb.printers.find(p => p.address === args[0]);
      return printer ?? null;
    }
    if (sql.includes('SELECT * FROM printers WHERE id = ?') && args) {
      const printer = inMemoryDb.printers.find(p => p.id === args[0]);
      return printer ?? null;
    }
    if (sql.includes("state = 'retry_wait'") && args) {
      const printerId = args[0];
      const now = args[1];
      const job = inMemoryDb.print_jobs
        .filter(j => j.printer_id === printerId && j.state === 'retry_wait' && j.next_retry_at && j.next_retry_at <= now)
        .sort((a, b) => a.next_retry_at.localeCompare(b.next_retry_at))[0];
      return job ?? null;
    }
    if (sql.includes("state = 'queued'") && args) {
      const printerId = args[0];
      const job = inMemoryDb.print_jobs
        .filter(j => j.printer_id === printerId && j.state === 'queued')
        .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
      return job ?? null;
    }
    if (sql.includes('SELECT * FROM printers ORDER BY last_seen_at DESC')) {
      return inMemoryDb.printers[0] ?? null;
    }
    if (sql.includes('SELECT * FROM printers')) {
      return inMemoryDb.printers[0] ?? null;
    }
    if (sql.includes('SELECT * FROM print_jobs WHERE state = ?') && args) {
      return inMemoryDb.print_jobs.find(j => j.state === args[0]) ?? null;
    }
    if (sql.includes('SELECT * FROM print_jobs WHERE id = ?') && args) {
      const job = inMemoryDb.print_jobs.find(j => j.id === args[0]);
      return job ?? null;
    }
    if (sql.includes('SELECT * FROM print_jobs ORDER BY created_at DESC')) {
      return inMemoryDb.print_jobs[0] ?? null;
    }
    if (sql.includes('SELECT * FROM print_jobs')) {
      return inMemoryDb.print_jobs[0] ?? null;
    }
    return null;
  }

  async getAllAsync(sql, args) {
    if (!this._isOpen) throw new Error('Database not open');

    if (sql.includes('SELECT * FROM printers ORDER BY last_seen_at DESC')) {
      return [...inMemoryDb.printers].sort((a, b) => String(b.last_seen_at).localeCompare(String(a.last_seen_at)));
    }

    if (sql.includes('SELECT * FROM print_jobs WHERE printer_id = ?') && args) {
      return inMemoryDb.print_jobs
        .filter(j => j.printer_id === args[0])
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    }

    if (sql.includes('SELECT * FROM print_jobs WHERE state = ?') && args) {
      return inMemoryDb.print_jobs
        .filter(j => j.state === args[0])
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    }

    if (sql.includes('SELECT * FROM print_jobs ORDER BY created_at DESC')) {
      return [...inMemoryDb.print_jobs].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    }

    return [];
  }

  static async openDatabaseAsync(name) {
    const db = new FakeSQLite(name);
    await db.openAsync();
    return db;
  }

  static async withDatabaseAsync(name, callback) {
    const db = new FakeSQLite(name);
    await db.openAsync();
    try {
      return await callback(db);
    } finally {
      await db.closeAsync();
    }
  }
}

export async function openDatabaseAsync(name) {
  const db = new FakeSQLite(name);
  await db.openAsync();
  return db;
}

export function resetInMemoryDb() {
  inMemoryDb.printers = [];
  inMemoryDb.print_jobs = [];
  inMemoryDb.schema_version = 0;
  jobIdCounter = 1;
  printerIdCounter = 1;
}

export function getInMemoryDb() {
  return inMemoryDb;
}

export { FakeSQLite };
export default FakeSQLite;

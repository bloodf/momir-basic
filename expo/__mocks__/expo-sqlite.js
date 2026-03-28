const inMemoryDb = {
  printers: [],
  print_jobs: [],
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
    
    if (sql.includes('CREATE TABLE IF NOT EXISTS printers')) {
      return [{ rows: [] }];
    }
    if (sql.includes('CREATE TABLE IF NOT EXISTS print_jobs')) {
      return [{ rows: [] }];
    }
    if (sql.includes('INSERT INTO printers')) {
      const id = printerIdCounter++;
      const match = sql.match(/\('([^']+)', '([^']+)', '([^']+)'/);
      if (match) {
        inMemoryDb.printers.push({
          id: id.toString(),
          name: match[1],
          address: match[2],
          type: match[3],
          capabilities: '{}',
          last_seen_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      }
      return [{ rows: { length: 0 } }];
    }
    if (sql.includes('SELECT * FROM printers')) {
      return [{ rows: inMemoryDb.printers.map((p, i) => ({ ...p, _id: i })) }];
    }
    if (sql.includes('SELECT * FROM print_jobs')) {
      return [{ rows: inMemoryDb.print_jobs.map((j, i) => ({ ...j, _id: i })) }];
    }
    if (sql.includes('INSERT INTO print_jobs')) {
      const id = jobIdCounter++;
      const now = new Date().toISOString();
      inMemoryDb.print_jobs.push({
        id: id.toString(),
        printer_id: '1',
        payload: '{}',
        state: 'queued',
        attempts: 0,
        last_error: null,
        created_at: now,
        updated_at: now,
      });
      return [{ rows: { length: 0 } }];
    }
    if (sql.includes('UPDATE print_jobs')) {
      return [{ rows: { length: 0 } }];
    }
    if (sql.includes('DELETE FROM print_jobs')) {
      return [{ rows: { length: 0 } }];
    }
    return [{ rows: [] }];
  }

  async runAsync(sql, args) {
    return this.execAsync(sql);
  }

  async getFirstAsync(sql, args) {
    if (!this._isOpen) throw new Error('Database not open');
    
    if (sql.includes('SELECT * FROM printers')) {
      return inMemoryDb.printers[0] || null;
    }
    if (sql.includes('SELECT * FROM print_jobs')) {
      return inMemoryDb.print_jobs[0] || null;
    }
    return null;
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

export function resetInMemoryDb() {
  inMemoryDb.printers = [];
  inMemoryDb.print_jobs = [];
  jobIdCounter = 1;
  printerIdCounter = 1;
}

export function getInMemoryDb() {
  return inMemoryDb;
}

export default FakeSQLite;
import * as SQLite from 'expo-sqlite';
import { SCHEMA_VERSION, MIGRATIONS } from './schema';

// Singleton database instance
let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync('printer.db');
  await initializeDatabase(dbInstance);
  return dbInstance;
}

export async function initializeDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);
  `);
  
  const result = await db.getFirstAsync<{version: number}>('SELECT version FROM schema_version LIMIT 1');
  const currentVersion = result?.version ?? 0;
  
  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      await db.execAsync(migration.up);
      await db.runAsync('INSERT OR REPLACE INTO schema_version (version) VALUES (?)', [migration.version]);
    }
  }
}
import * as SQLite from 'expo-sqlite';
import {
  CREATE_GAMES_TABLE,
  CREATE_SELLERS_TABLE,
  CREATE_CLIENTS_TABLE,
  CREATE_CLIENT_ALLOCATIONS_TABLE,
  CREATE_SYNC_QUEUE_TABLE,
  CREATE_APP_METADATA_TABLE,
  CREATE_INDEXES,
} from './schema';

const DB_NAME = 'console_vault_v1.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Initializes and returns the SQLite database singleton on native mobile (iOS & Android).
 * Configures WAL mode for blazing fast concurrent reads and writes.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);

      // Enable WAL (Write-Ahead Logging) for high performance & crash resilience
      try {
        await db.execAsync('PRAGMA journal_mode = WAL;');
      } catch (e) {}

      // Create core tables
      await db.execAsync(CREATE_GAMES_TABLE);
      await db.execAsync(CREATE_SELLERS_TABLE);
      await db.execAsync(CREATE_CLIENTS_TABLE);
      await db.execAsync(CREATE_CLIENT_ALLOCATIONS_TABLE);
      await db.execAsync(CREATE_SYNC_QUEUE_TABLE);
      await db.execAsync(CREATE_APP_METADATA_TABLE);

      // Safe column migrations for existing SQLite databases
      const migrations = [
        `ALTER TABLE games ADD COLUMN platform TEXT NOT NULL DEFAULT 'PS5';`,
        `ALTER TABLE games ADD COLUMN cost_price REAL DEFAULT 0.0;`,
        `ALTER TABLE games ADD COLUMN currency TEXT DEFAULT 'USD';`,
        `ALTER TABLE games ADD COLUMN is_inventory INTEGER DEFAULT 0;`,
      ];
      for (const m of migrations) {
        try {
          await db.execAsync(m);
        } catch {}
      }

      // Create high-performance B-tree indexes
      for (const indexSql of CREATE_INDEXES) {
        try {
          await db.execAsync(indexSql);
        } catch {}
      }

      dbInstance = db;
      return db;
    } catch (err) {
      initPromise = null;
      console.error('[SQLite Native] Failed to initialize database:', err);
      throw err;
    }
  })();

  return initPromise;
}

/**
 * Clears all tables in the SQLite database (e.g. for "Clear Cache / Start Fresh").
 */
export async function wipeDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM games;
    DELETE FROM sellers;
    DELETE FROM clients;
    DELETE FROM client_allocations;
    DELETE FROM sync_queue;
    DELETE FROM app_metadata;
  `);
}

let txLock: Promise<any> = Promise.resolve();

/**
 * Serializes transactions so concurrent calls to SQLite do not conflict
 * with "cannot start a transaction within a transaction" on native mobile.
 */
export async function runSerializedTransaction<T>(
  fn: (db: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> {
  const db = await getDatabase();
  const execute = async () => {
    let result!: T;
    await db.withTransactionAsync(async () => {
      result = await fn(db);
    });
    return result;
  };
  const current = txLock.then(execute, execute);
  txLock = current.then(() => {}, () => {});
  return current;
}


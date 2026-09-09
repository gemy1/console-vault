import { Platform } from 'react-native';
import { SQLiteDatabaseInterface } from './types';

export async function getDatabase(): Promise<SQLiteDatabaseInterface> {
  if (Platform.OS === 'web') {
    const webDb = await import('./db.web');
    return webDb.getDatabase();
  } else {
    const nativeDb = await import('./db.native');
    return nativeDb.getDatabase();
  }
}

export async function wipeDatabase(): Promise<void> {
  if (Platform.OS === 'web') {
    const webDb = await import('./db.web');
    return webDb.wipeDatabase();
  } else {
    const nativeDb = await import('./db.native');
    return nativeDb.wipeDatabase();
  }
}

let txLock: Promise<any> = Promise.resolve();

/**
 * Serializes transactions so concurrent calls to SQLite do not conflict
 * with "cannot start a transaction within a transaction".
 */
export async function runSerializedTransaction<T>(
  fn: (db: SQLiteDatabaseInterface) => Promise<T>
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


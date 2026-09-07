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

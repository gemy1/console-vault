export interface SQLiteDatabaseInterface {
  execAsync: (sql: string) => Promise<void>;
  getAllAsync: <T = any>(sql: string, ...params: any[]) => Promise<T[]>;
  getFirstAsync: <T = any>(sql: string, ...params: any[]) => Promise<T | null>;
  runAsync: (sql: string, ...params: any[]) => Promise<{ changes: number; lastInsertRowId: number }>;
  withTransactionAsync: (task: () => Promise<void>) => Promise<void>;
}

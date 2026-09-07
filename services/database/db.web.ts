/**
 * Web Database Driver for Console Vault
 * Emulates the SQLiteDatabase query interface in the browser environment,
 * preventing Metro static bundler Web Worker chunk errors while persisting cleanly to localStorage.
 */

export interface SQLiteRunResult {
  changes: number;
  lastInsertRowId: number;
}

class WebDatabaseEngine {
  private games = new Map<string, any>();
  private sellers = new Map<string, any>();
  private syncQueue = new Map<string, any>();

  constructor() {
    this.hydrate();
  }

  private hydrate() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const g = window.localStorage.getItem('sqlite_web_games_v1');
      if (g) {
        const arr = JSON.parse(g);
        arr.forEach((item: any) => this.games.set(item.id, item));
      }
      const s = window.localStorage.getItem('sqlite_web_sellers_v1');
      if (s) {
        const arr = JSON.parse(s);
        arr.forEach((item: any) => this.sellers.set(item.id, item));
      }
      const q = window.localStorage.getItem('sqlite_web_sync_queue_v1');
      if (q) {
        const arr = JSON.parse(q);
        arr.forEach((item: any) => this.syncQueue.set(item.id, item));
      }
    } catch {}
  }

  private persist(table: 'games' | 'sellers' | 'sync_queue') {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      if (table === 'games') {
        window.localStorage.setItem(
          'sqlite_web_games_v1',
          JSON.stringify(Array.from(this.games.values()))
        );
      } else if (table === 'sellers') {
        window.localStorage.setItem(
          'sqlite_web_sellers_v1',
          JSON.stringify(Array.from(this.sellers.values()))
        );
      } else if (table === 'sync_queue') {
        window.localStorage.setItem(
          'sqlite_web_sync_queue_v1',
          JSON.stringify(Array.from(this.syncQueue.values()))
        );
      }
    } catch {}
  }

  async execAsync(sql: string): Promise<void> {
    if (sql.includes('DELETE FROM games')) {
      this.games.clear();
      this.persist('games');
    }
    if (sql.includes('DELETE FROM sellers')) {
      this.sellers.clear();
      this.persist('sellers');
    }
    if (sql.includes('DELETE FROM sync_queue')) {
      this.syncQueue.clear();
      this.persist('sync_queue');
    }
  }

  async getAllAsync<T = any>(sql: string, ...params: any[]): Promise<T[]> {
    const bindParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    if (sql.includes('FROM games')) {
      let items = Array.from(this.games.values());
      if (sql.includes('WHERE status = ?') && bindParams && bindParams[0]) {
        items = items.filter((i) => i.status === bindParams[0]);
      }
      items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      return items as T[];
    }
    if (sql.includes('FROM sellers')) {
      let items = Array.from(this.sellers.values());
      items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      return items as T[];
    }
    if (sql.includes('FROM sync_queue')) {
      let items = Array.from(this.syncQueue.values());
      items.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      return items as T[];
    }
    return [];
  }

  async getFirstAsync<T = any>(sql: string, ...params: any[]): Promise<T | null> {
    const all = await this.getAllAsync<T>(sql, ...params);
    const bindParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    if (bindParams && bindParams[0] && sql.includes('WHERE id = ?')) {
      const match = all.find((x: any) => x.id === bindParams[0]);
      return (match as T) || null;
    }
    return all.length > 0 ? all[0] : null;
  }

  async runAsync(sql: string, ...params: any[]): Promise<SQLiteRunResult> {
    const bindParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    if (sql.startsWith('INSERT INTO games')) {
      if (params) {
        const [
          id,
          user_id,
          seller_id,
          title,
          cover_image_url,
          account_type,
          status,
          purchase_date,
          warranty_months,
          psn_email,
          psn_password,
          backup_codes,
          notes,
          created_at,
          updated_at,
        ] = params;
        this.games.set(id, {
          id,
          user_id,
          seller_id,
          title,
          cover_image_url,
          account_type,
          status,
          purchase_date,
          warranty_months,
          psn_email,
          psn_password,
          backup_codes,
          notes,
          created_at,
          updated_at,
        });
        this.persist('games');
        return { changes: 1, lastInsertRowId: 1 };
      }
    }
    if (sql.startsWith('INSERT INTO sellers')) {
      if (params) {
        const [
          id,
          user_id,
          name,
          contact_platform,
          contact_link,
          contact_methods,
          reputation_score,
          notes,
          created_at,
          updated_at,
        ] = params;
        this.sellers.set(id, {
          id,
          user_id,
          name,
          contact_platform,
          contact_link,
          contact_methods,
          reputation_score,
          notes,
          created_at,
          updated_at,
        });
        this.persist('sellers');
        return { changes: 1, lastInsertRowId: 1 };
      }
    }
    if (sql.startsWith('INSERT INTO sync_queue')) {
      if (params) {
        const [id, entity, action, payload, timestamp] = params;
        this.syncQueue.set(id, { id, entity, action, payload, timestamp });
        this.persist('sync_queue');
        return { changes: 1, lastInsertRowId: 1 };
      }
    }
    if (sql.startsWith('DELETE FROM games WHERE id = ?')) {
      if (params && params[0]) {
        const deleted = this.games.delete(params[0]);
        this.persist('games');
        return { changes: deleted ? 1 : 0, lastInsertRowId: 0 };
      }
    }
    if (sql.startsWith('DELETE FROM sellers WHERE id = ?')) {
      if (params && params[0]) {
        const deleted = this.sellers.delete(params[0]);
        this.persist('sellers');
        return { changes: deleted ? 1 : 0, lastInsertRowId: 0 };
      }
    }
    if (sql.startsWith('DELETE FROM sync_queue WHERE id = ?')) {
      if (params && params[0]) {
        const deleted = this.syncQueue.delete(params[0]);
        this.persist('sync_queue');
        return { changes: deleted ? 1 : 0, lastInsertRowId: 0 };
      }
    }
    if (sql.includes('DELETE FROM sync_queue WHERE entity = ?')) {
      if (params && params[0] && params[1]) {
        for (const [k, v] of this.syncQueue.entries()) {
          try {
            const p = JSON.parse(v.payload);
            if (v.entity === params[0] && p.id === params[1]) {
              this.syncQueue.delete(k);
            }
          } catch {}
        }
        this.persist('sync_queue');
        return { changes: 1, lastInsertRowId: 0 };
      }
    }
    return { changes: 0, lastInsertRowId: 0 };
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    await task();
  }
}

const webDbInstance = new WebDatabaseEngine();

export async function getDatabase(): Promise<any> {
  return webDbInstance;
}

export async function wipeDatabase(): Promise<void> {
  await webDbInstance.execAsync('DELETE FROM games;');
  await webDbInstance.execAsync('DELETE FROM sellers;');
  await webDbInstance.execAsync('DELETE FROM sync_queue;');
}

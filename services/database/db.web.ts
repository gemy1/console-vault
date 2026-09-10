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
  private clients = new Map<string, any>();
  private allocations = new Map<string, any>();
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
      const c = window.localStorage.getItem('sqlite_web_clients_v1');
      if (c) {
        const arr = JSON.parse(c);
        arr.forEach((item: any) => this.clients.set(item.id, item));
      }
      const a = window.localStorage.getItem('sqlite_web_allocations_v1');
      if (a) {
        const arr = JSON.parse(a);
        arr.forEach((item: any) => this.allocations.set(item.id, item));
      }
      const q = window.localStorage.getItem('sqlite_web_sync_queue_v1');
      if (q) {
        const arr = JSON.parse(q);
        arr.forEach((item: any) => this.syncQueue.set(item.id, item));
      }
    } catch {}
  }

  private persist(table: 'games' | 'sellers' | 'clients' | 'allocations' | 'sync_queue') {
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
      } else if (table === 'clients') {
        window.localStorage.setItem(
          'sqlite_web_clients_v1',
          JSON.stringify(Array.from(this.clients.values()))
        );
      } else if (table === 'allocations') {
        window.localStorage.setItem(
          'sqlite_web_allocations_v1',
          JSON.stringify(Array.from(this.allocations.values()))
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
    if (sql.includes('DELETE FROM clients')) {
      this.clients.clear();
      this.persist('clients');
    }
    if (sql.includes('DELETE FROM client_allocations')) {
      this.allocations.clear();
      this.persist('allocations');
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
      if (sql.includes('WHERE is_inventory = 1')) {
        items = items.filter((i) => i.is_inventory === 1 || i.is_inventory === true);
      } else if (sql.includes('WHERE is_inventory = 0')) {
        items = items.filter((i) => !i.is_inventory || i.is_inventory === 0 || i.is_inventory === false);
      }
      items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      return items as T[];
    }
    if (sql.includes('FROM sellers')) {
      let items = Array.from(this.sellers.values());
      items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      return items as T[];
    }
    if (sql.includes('FROM clients')) {
      let items = Array.from(this.clients.values());
      items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      return items as T[];
    }
    if (sql.includes('FROM client_allocations')) {
      let items = Array.from(this.allocations.values());
      if (sql.includes('WHERE game_id = ?') && bindParams && bindParams[0]) {
        items = items.filter((i) => i.game_id === bindParams[0]);
      }
      if (sql.includes('WHERE client_id = ?') && bindParams && bindParams[0]) {
        items = items.filter((i) => i.client_id === bindParams[0]);
      }
      items.sort((a, b) => (b.sale_date || '').localeCompare(a.sale_date || ''));
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
      if (bindParams) {
        const [
          id,
          user_id,
          seller_id,
          title,
          cover_image_url,
          account_type,
          platform,
          status,
          purchase_date,
          warranty_months,
          psn_email,
          psn_password,
          backup_codes,
          notes,
          cost_price,
          currency,
          is_inventory,
          created_at,
          updated_at,
        ] = bindParams;
        this.games.set(id, {
          id,
          user_id,
          seller_id,
          title,
          cover_image_url,
          account_type,
          platform: platform || 'PS5',
          status,
          purchase_date,
          warranty_months,
          psn_email,
          psn_password,
          backup_codes,
          notes,
          cost_price: Number(cost_price || 0),
          currency: currency || 'USD',
          is_inventory: is_inventory ? 1 : 0,
          created_at,
          updated_at,
        });
        this.persist('games');
        return { changes: 1, lastInsertRowId: 1 };
      }
    }
    if (sql.startsWith('INSERT INTO sellers')) {
      if (bindParams) {
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
        ] = bindParams;
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
    if (sql.startsWith('INSERT INTO clients')) {
      if (bindParams) {
        const [id, user_id, name, contact_platform, contact_link, notes, created_at, updated_at] = bindParams;
        this.clients.set(id, { id, user_id, name, contact_platform, contact_link, notes, created_at, updated_at });
        this.persist('clients');
        return { changes: 1, lastInsertRowId: 1 };
      }
    }
    if (sql.startsWith('INSERT INTO client_allocations')) {
      if (bindParams) {
        const [
          id,
          user_id,
          game_id,
          client_id,
          slot_type,
          sale_price,
          currency,
          sale_date,
          warranty_months,
          status,
          notes,
          created_at,
          updated_at,
        ] = bindParams;
        this.allocations.set(id, {
          id,
          user_id,
          game_id,
          client_id,
          slot_type,
          sale_price: Number(sale_price || 0),
          currency: currency || 'USD',
          sale_date,
          warranty_months,
          status,
          notes,
          created_at,
          updated_at,
        });
        this.persist('allocations');
        return { changes: 1, lastInsertRowId: 1 };
      }
    }
    if (sql.startsWith('INSERT INTO sync_queue')) {
      if (bindParams) {
        const [id, entity, action, payload, timestamp] = bindParams;
        this.syncQueue.set(id, { id, entity, action, payload, timestamp });
        this.persist('sync_queue');
        return { changes: 1, lastInsertRowId: 1 };
      }
    }
    if (sql.startsWith('DELETE FROM games WHERE id = ?')) {
      if (bindParams && bindParams[0]) {
        const deleted = this.games.delete(bindParams[0]);
        this.persist('games');
        return { changes: deleted ? 1 : 0, lastInsertRowId: 0 };
      }
    }
    if (sql.startsWith('DELETE FROM sellers WHERE id = ?')) {
      if (bindParams && bindParams[0]) {
        const deleted = this.sellers.delete(bindParams[0]);
        this.persist('sellers');
        return { changes: deleted ? 1 : 0, lastInsertRowId: 0 };
      }
    }
    if (sql.startsWith('DELETE FROM clients WHERE id = ?')) {
      if (bindParams && bindParams[0]) {
        const deleted = this.clients.delete(bindParams[0]);
        this.persist('clients');
        return { changes: deleted ? 1 : 0, lastInsertRowId: 0 };
      }
    }
    if (sql.startsWith('DELETE FROM client_allocations WHERE id = ?')) {
      if (bindParams && bindParams[0]) {
        const deleted = this.allocations.delete(bindParams[0]);
        this.persist('allocations');
        return { changes: deleted ? 1 : 0, lastInsertRowId: 0 };
      }
    }
    if (sql.startsWith('DELETE FROM client_allocations WHERE game_id = ?')) {
      if (bindParams && bindParams[0]) {
        let count = 0;
        for (const [key, val] of this.allocations.entries()) {
          if (val.game_id === bindParams[0]) {
            this.allocations.delete(key);
            count++;
          }
        }
        if (count > 0) this.persist('allocations');
        return { changes: count, lastInsertRowId: 0 };
      }
    }
    if (sql.startsWith('DELETE FROM sync_queue WHERE id = ?')) {
      if (bindParams && bindParams[0]) {
        const deleted = this.syncQueue.delete(bindParams[0]);
        this.persist('sync_queue');
        return { changes: deleted ? 1 : 0, lastInsertRowId: 0 };
      }
    }
    if (sql.includes('DELETE FROM sync_queue WHERE entity = ?')) {
      if (bindParams && bindParams[0] && bindParams[1]) {
        for (const [k, v] of this.syncQueue.entries()) {
          try {
            const p = JSON.parse(v.payload);
            if (v.entity === bindParams[0] && p.id === bindParams[1]) {
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
  await webDbInstance.execAsync('DELETE FROM clients;');
  await webDbInstance.execAsync('DELETE FROM client_allocations;');
  await webDbInstance.execAsync('DELETE FROM sync_queue;');
}

export async function runSerializedTransaction<T>(
  fn: (db: any) => Promise<T>
): Promise<T> {
  const db = await getDatabase();
  return fn(db);
}


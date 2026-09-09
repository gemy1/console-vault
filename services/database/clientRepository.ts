import { getDatabase, runSerializedTransaction } from './db';
import { Client } from '../../types/vault';

interface SQLiteClientRow {
  id: string;
  user_id: string;
  name: string;
  contact_platform: string;
  contact_link: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToClient(row: SQLiteClientRow): Client {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    contact_platform: (row.contact_platform as Client['contact_platform']) || 'WhatsApp',
    contact_link: row.contact_link || '',
    notes: row.notes || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const ClientRepository = {
  /**
   * Fetches all clients ordered by created_at DESC with index acceleration.
   */
  getAll: async (): Promise<Client[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SQLiteClientRow>(
      `SELECT * FROM clients ORDER BY created_at DESC;`
    );
    return rows.map(mapRowToClient);
  },

  /**
   * Fast O(1) primary key lookup.
   */
  getById: async (id: string): Promise<Client | null> => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<SQLiteClientRow>(
      `SELECT * FROM clients WHERE id = ? LIMIT 1;`,
      [id]
    );
    return row ? mapRowToClient(row) : null;
  },

  /**
   * Inserts or updates a single client with parameter binding.
   */
  upsert: async (client: Client): Promise<Client> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const createdAt = client.created_at || now;
    const updatedAt = client.updated_at || now;

    await db.runAsync(
      `INSERT INTO clients (
        id, user_id, name, contact_platform, contact_link, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        contact_platform = excluded.contact_platform,
        contact_link = excluded.contact_link,
        notes = excluded.notes,
        updated_at = excluded.updated_at;`,
      [
        client.id,
        client.user_id || 'user-demo',
        client.name,
        client.contact_platform || 'WhatsApp',
        client.contact_link || '',
        client.notes || null,
        createdAt,
        updatedAt,
      ]
    );

    return {
      ...client,
      created_at: createdAt,
      updated_at: updatedAt,
    };
  },

  /**
   * Updates specific fields of an existing client.
   */
  update: async (id: string, partial: Partial<Client>): Promise<Client | null> => {
    const current = await ClientRepository.getById(id);
    if (!current) return null;

    const merged: Client = {
      ...current,
      ...partial,
      updated_at: new Date().toISOString(),
    };

    return ClientRepository.upsert(merged);
  },

  /**
   * Deletes a client by ID.
   */
  delete: async (id: string): Promise<boolean> => {
    const db = await getDatabase();
    const result = await db.runAsync(`DELETE FROM clients WHERE id = ?;`, [id]);
    return result.changes > 0;
  },

  /**
   * High-speed bulk transaction for cloud sync.
   */
  bulkUpsert: async (clients: Client[]): Promise<void> => {
    if (clients.length === 0) return;
    await runSerializedTransaction(async () => {
      for (const client of clients) {
        await ClientRepository.upsert(client);
      }
    });
  },

  /**
   * Empties the clients table.
   */
  clear: async (): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM clients;`);
  },
};

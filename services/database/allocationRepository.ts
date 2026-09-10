import { getDatabase, runSerializedTransaction } from './db';
import { ClientAllocation, SlotType, AllocationStatus } from '../../types/vault';

interface SQLiteAllocationRow {
  id: string;
  user_id: string;
  game_id: string;
  client_id: string;
  slot_type: string;
  sale_price: number;
  currency: string;
  sale_date: string;
  warranty_months: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToAllocation(row: SQLiteAllocationRow): ClientAllocation {
  return {
    id: row.id,
    user_id: row.user_id,
    game_id: row.game_id,
    client_id: row.client_id,
    slot_type: row.slot_type as SlotType,
    sale_price: Number(row.sale_price || 0),
    currency: row.currency || 'USD',
    sale_date: row.sale_date,
    warranty_months: row.warranty_months,
    status: (row.status as AllocationStatus) || 'Active',
    notes: row.notes || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const AllocationRepository = {
  /**
   * Fetches all allocations ordered by sale_date DESC.
   */
  getAll: async (): Promise<ClientAllocation[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SQLiteAllocationRow>(
      `SELECT * FROM client_allocations ORDER BY sale_date DESC;`
    );
    return rows.map(mapRowToAllocation);
  },

  /**
   * Fast primary key lookup.
   */
  getById: async (id: string): Promise<ClientAllocation | null> => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<SQLiteAllocationRow>(
      `SELECT * FROM client_allocations WHERE id = ? LIMIT 1;`,
      [id]
    );
    return row ? mapRowToAllocation(row) : null;
  },

  /**
   * Gets all slot allocations for a specific game.
   */
  getByGameId: async (gameId: string): Promise<ClientAllocation[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SQLiteAllocationRow>(
      `SELECT * FROM client_allocations WHERE game_id = ? ORDER BY sale_date DESC;`,
      [gameId]
    );
    return rows.map(mapRowToAllocation);
  },

  /**
   * Gets all slot allocations for a specific client.
   */
  getByClientId: async (clientId: string): Promise<ClientAllocation[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SQLiteAllocationRow>(
      `SELECT * FROM client_allocations WHERE client_id = ? ORDER BY sale_date DESC;`,
      [clientId]
    );
    return rows.map(mapRowToAllocation);
  },

  /**
   * Inserts or updates an allocation.
   */
  upsert: async (allocation: ClientAllocation): Promise<ClientAllocation> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const createdAt = allocation.created_at || now;
    const updatedAt = allocation.updated_at || now;

    await db.runAsync(
      `INSERT INTO client_allocations (
        id, user_id, game_id, client_id, slot_type, sale_price, currency,
        sale_date, warranty_months, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        game_id = excluded.game_id,
        client_id = excluded.client_id,
        slot_type = excluded.slot_type,
        sale_price = excluded.sale_price,
        currency = excluded.currency,
        sale_date = excluded.sale_date,
        warranty_months = excluded.warranty_months,
        status = excluded.status,
        notes = excluded.notes,
        updated_at = excluded.updated_at;`,
      [
        allocation.id,
        allocation.user_id || 'user-demo',
        allocation.game_id,
        allocation.client_id,
        allocation.slot_type,
        allocation.sale_price || 0,
        allocation.currency || 'USD',
        allocation.sale_date,
        allocation.warranty_months,
        allocation.status || 'Active',
        allocation.notes || null,
        createdAt,
        updatedAt,
      ]
    );

    return {
      ...allocation,
      created_at: createdAt,
      updated_at: updatedAt,
    };
  },

  /**
   * Updates specific fields of an existing allocation.
   */
  update: async (id: string, partial: Partial<ClientAllocation>): Promise<ClientAllocation | null> => {
    const current = await AllocationRepository.getById(id);
    if (!current) return null;

    const merged: ClientAllocation = {
      ...current,
      ...partial,
      updated_at: new Date().toISOString(),
    };

    return AllocationRepository.upsert(merged);
  },

  /**
   * Deletes an allocation by ID.
   */
  delete: async (id: string): Promise<boolean> => {
    const db = await getDatabase();
    const result = await db.runAsync(`DELETE FROM client_allocations WHERE id = ?;`, [id]);
    return result.changes > 0;
  },

  /**
   * Cascade deletes all allocations belonging to a specific game.
   */
  deleteByGameId: async (gameId: string): Promise<boolean> => {
    const db = await getDatabase();
    const result = await db.runAsync(`DELETE FROM client_allocations WHERE game_id = ?;`, [gameId]);
    return result.changes > 0;
  },

  /**
   * High-speed bulk transaction for cloud sync.
   */
  bulkUpsert: async (allocations: ClientAllocation[]): Promise<void> => {
    if (allocations.length === 0) return;
    await runSerializedTransaction(async () => {
      for (const allocation of allocations) {
        await AllocationRepository.upsert(allocation);
      }
    });
  },

  /**
   * Empties the client_allocations table.
   */
  clear: async (): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM client_allocations;`);
  },
};

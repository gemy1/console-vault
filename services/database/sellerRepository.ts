import { getDatabase } from './db';
import { Seller } from '../../types/vault';

interface SQLiteSellerRow {
  id: string;
  user_id: string;
  name: string;
  contact_platform: string;
  contact_link: string;
  contact_methods: string | null;
  reputation_score: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToSeller(row: SQLiteSellerRow): Seller {
  let contactMethods: any;
  if (row.contact_methods) {
    try {
      contactMethods = JSON.parse(row.contact_methods);
    } catch {}
  }

  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    contact_platform: row.contact_platform as Seller['contact_platform'],
    contact_link: row.contact_link,
    contact_methods: contactMethods,
    reputation_score: row.reputation_score,
    notes: row.notes || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const SellerRepository = {
  /**
   * Fetches all sellers ordered by created_at DESC.
   */
  getAll: async (): Promise<Seller[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SQLiteSellerRow>(
      `SELECT * FROM sellers ORDER BY created_at DESC;`
    );
    return rows.map(mapRowToSeller);
  },

  /**
   * Fast O(1) lookup by primary key.
   */
  getById: async (id: string): Promise<Seller | null> => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<SQLiteSellerRow>(
      `SELECT * FROM sellers WHERE id = ? LIMIT 1;`,
      [id]
    );
    return row ? mapRowToSeller(row) : null;
  },

  /**
   * Inserts or updates a seller record.
   */
  upsert: async (seller: Seller): Promise<Seller> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const createdAt = seller.created_at || now;
    const updatedAt = seller.updated_at || now;
    const contactMethodsStr = seller.contact_methods
      ? JSON.stringify(seller.contact_methods)
      : null;

    await db.runAsync(
      `INSERT INTO sellers (
        id, user_id, name, contact_platform, contact_link,
        contact_methods, reputation_score, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        contact_platform = excluded.contact_platform,
        contact_link = excluded.contact_link,
        contact_methods = excluded.contact_methods,
        reputation_score = excluded.reputation_score,
        notes = excluded.notes,
        updated_at = excluded.updated_at;`,
      [
        seller.id,
        seller.user_id || 'user-demo',
        seller.name,
        seller.contact_platform || 'WhatsApp',
        seller.contact_link || '',
        contactMethodsStr,
        seller.reputation_score ?? 5.0,
        seller.notes || null,
        createdAt,
        updatedAt,
      ]
    );

    return {
      ...seller,
      created_at: createdAt,
      updated_at: updatedAt,
    };
  },

  /**
   * Updates specific fields of a seller.
   */
  update: async (id: string, partial: Partial<Seller>): Promise<Seller | null> => {
    const current = await SellerRepository.getById(id);
    if (!current) return null;

    const merged: Seller = {
      ...current,
      ...partial,
      updated_at: new Date().toISOString(),
    };

    return SellerRepository.upsert(merged);
  },

  /**
   * Deletes a seller by ID.
   */
  delete: async (id: string): Promise<boolean> => {
    const db = await getDatabase();
    const result = await db.runAsync(`DELETE FROM sellers WHERE id = ?;`, [id]);
    return result.changes > 0;
  },

  /**
   * High-speed bulk transaction for cloud sync.
   */
  bulkUpsert: async (sellers: Seller[]): Promise<void> => {
    if (sellers.length === 0) return;
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      for (const seller of sellers) {
        await SellerRepository.upsert(seller);
      }
    });
  },

  /**
   * Empties the sellers table.
   */
  clear: async (): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM sellers;`);
  },
};

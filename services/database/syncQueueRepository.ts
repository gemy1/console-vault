import { getDatabase, runSerializedTransaction } from './db';
import { PendingSyncItem } from '../../types/vault';

interface SQLiteSyncRow {
  id: string;
  entity: string;
  action: string;
  payload: string;
  timestamp: number;
}

export const SyncQueueRepository = {
  /**
   * Retrieves all pending queue items in FIFO order.
   */
  getQueue: async (): Promise<PendingSyncItem[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SQLiteSyncRow>(
      `SELECT * FROM sync_queue ORDER BY timestamp ASC;`
    );
    return rows.map((r) => {
      let payload: any = null;
      try {
        payload = JSON.parse(r.payload);
      } catch {}
      return {
        id: r.id,
        entity: r.entity as PendingSyncItem['entity'],
        action: r.action as PendingSyncItem['action'],
        payload,
        timestamp: r.timestamp,
      };
    });
  },

  /**
   * Enqueues an item or updates existing item in queue if action is UPSERT.
   */
  enqueue: async (item: Omit<PendingSyncItem, 'id' | 'timestamp'>): Promise<void> => {
    const payloadStr = JSON.stringify(item.payload);
    const now = Date.now();
    const id = `sync-${now}-${Math.random().toString(36).substring(2, 7)}`;

    await runSerializedTransaction(async (db) => {
      // If updating the same entity & ID already pending in queue, remove older version
      if (item.payload?.id && item.action === 'UPSERT') {
        await db.runAsync(
          `DELETE FROM sync_queue WHERE entity = ? AND json_extract(payload, '$.id') = ?;`,
          [item.entity, item.payload.id]
        );
      }

      await db.runAsync(
        `INSERT INTO sync_queue (id, entity, action, payload, timestamp) VALUES (?, ?, ?, ?, ?);`,
        [id, item.entity, item.action, payloadStr, now]
      );
    });
  },

  /**
   * Removes a processed item from the queue.
   */
  remove: async (id: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM sync_queue WHERE id = ?;`, [id]);
  },

  /**
   * Empties the sync queue.
   */
  clear: async (): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM sync_queue;`);
  },
};

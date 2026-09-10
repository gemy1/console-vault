import { VaultStorage, OfflineVault } from './storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { PendingSyncItem, SyncStatus } from '../types/vault';
import { Platform } from 'react-native';
import { toSafeUUID } from '../utils/uuid';

const SYNC_QUEUE_KEY = 'vault_pending_sync_queue_v1';
const LAST_SYNCED_KEY = 'vault_last_synced_timestamp_v1';

type SyncListener = (status: SyncStatus, pendingCount: number) => void;
const listeners = new Set<SyncListener>();

let currentStatus: SyncStatus = isSupabaseConfigured ? 'synced' : 'local_only';
let isSyncing = false;

function notifyListeners() {
  const pending = SyncQueue.getQueue().length;
  listeners.forEach((listener) => {
    try {
      listener(currentStatus, pending);
    } catch {}
  });
}

export const SyncQueue = {
  getQueue: (): PendingSyncItem[] => {
    try {
      const raw = VaultStorage.getItem(SYNC_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveQueue: (queue: PendingSyncItem[]): void => {
    VaultStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  },

  enqueue: (item: Omit<PendingSyncItem, 'id' | 'timestamp'>): void => {
    const queue = SyncQueue.getQueue();
    // If updating same item already in queue, coalesce to latest payload
    const existingIndex = queue.findIndex(
      (q) => q.entity === item.entity && q.payload?.id === item.payload?.id
    );

    const newItem: PendingSyncItem = {
      ...item,
      id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };

    if (existingIndex >= 0 && item.action === 'UPSERT') {
      queue[existingIndex] = newItem;
    } else {
      queue.push(newItem);
    }

    SyncQueue.saveQueue(queue);
    if (!isSupabaseConfigured) {
      currentStatus = 'local_only';
    } else {
      currentStatus = SyncQueue.isOnline() ? 'syncing' : 'offline';
    }
    notifyListeners();
  },

  clearQueue: (): void => {
    VaultStorage.removeItem(SYNC_QUEUE_KEY);
    currentStatus = isSupabaseConfigured ? 'synced' : 'local_only';
    notifyListeners();
  },

  enqueueLocalVaultIfEmpty: (authUserId: string): void => {
    const queue = SyncQueue.getQueue();
    if (queue.length > 0) return;

    const games = OfflineVault.getGames();
    const sellers = OfflineVault.getSellers();
    const clients = OfflineVault.getClients();
    const allocations = OfflineVault.getAllocations();

    if (games.length === 0 && sellers.length === 0 && clients.length === 0 && allocations.length === 0) {
      return;
    }

    const newQueue: PendingSyncItem[] = [];
    const now = Date.now();

    sellers.forEach((s, idx) => {
      newQueue.push({
        id: `sync-${now}-s-${idx}`,
        entity: 'seller',
        action: 'UPSERT',
        payload: { ...s, user_id: authUserId },
        timestamp: now,
      });
    });

    clients.forEach((c, idx) => {
      newQueue.push({
        id: `sync-${now}-c-${idx}`,
        entity: 'client',
        action: 'UPSERT',
        payload: { ...c, user_id: authUserId },
        timestamp: now,
      });
    });

    games.forEach((g, idx) => {
      newQueue.push({
        id: `sync-${now}-g-${idx}`,
        entity: 'game',
        action: 'UPSERT',
        payload: { ...g, user_id: authUserId },
        timestamp: now,
      });
    });

    allocations.forEach((a, idx) => {
      newQueue.push({
        id: `sync-${now}-a-${idx}`,
        entity: 'client_allocation',
        action: 'UPSERT',
        payload: { ...a, user_id: authUserId },
        timestamp: now,
      });
    });

    SyncQueue.saveQueue(newQueue);
    notifyListeners();
  },

  getLastSyncedAt: (): string | null => {
    return VaultStorage.getItem(LAST_SYNCED_KEY);
  },

  setLastSyncedAt: (timestamp: string): void => {
    VaultStorage.setItem(LAST_SYNCED_KEY, timestamp);
  },

  getStatus: (userId?: string): SyncStatus => {
    if (!isSupabaseConfigured || !userId) return 'local_only';
    return currentStatus;
  },

  subscribe: (listener: SyncListener): (() => void) => {
    listeners.add(listener);
    listener(currentStatus, SyncQueue.getQueue().length);
    return () => {
      listeners.delete(listener);
    };
  },

  isOnline: (): boolean => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      return navigator.onLine !== false;
    }
    return true; // Native assumes online unless fetch fails
  },

  flush: async (userId?: string): Promise<{ success: boolean; syncedCount: number }> => {
    if (isSyncing) {
      return { success: true, syncedCount: 0 };
    }

    if (!isSupabaseConfigured) {
      currentStatus = 'local_only';
      notifyListeners();
      return { success: true, syncedCount: 0 };
    }

    // Verify active authenticated session in Supabase before sending data
    let authUserId = userId;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        currentStatus = 'offline';
        notifyListeners();
        return { success: false, syncedCount: 0 };
      }
      authUserId = session.user.id;
    } catch {
      currentStatus = 'offline';
      notifyListeners();
      return { success: false, syncedCount: 0 };
    }

    if (!authUserId) {
      currentStatus = 'local_only';
      notifyListeners();
      return { success: true, syncedCount: 0 };
    }

    const queue = SyncQueue.getQueue();
    if (queue.length === 0) {
      currentStatus = 'synced';
      notifyListeners();
      return { success: true, syncedCount: 0 };
    }

    if (!SyncQueue.isOnline()) {
      currentStatus = 'offline';
      notifyListeners();
      return { success: false, syncedCount: 0 };
    }

    isSyncing = true;
    currentStatus = 'syncing';
    notifyListeners();

    let processedCount = 0;
    const remainingQueue: PendingSyncItem[] = [];

    // CRITICAL: Sort queue so foreign key dependencies are satisfied in PostgreSQL:
    // 1. sellers -> 2. clients -> 3. games -> 4. client_allocations
    const entityPriority: Record<string, number> = {
      seller: 1,
      client: 2,
      game: 3,
      client_allocation: 4,
    };
    const sortedQueue = [...queue].sort((a, b) => {
      return (entityPriority[a.entity] || 99) - (entityPriority[b.entity] || 99);
    });

    const BATCH_SIZE = 50;
    const chunkArray = <T>(arr: T[], size: number): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    const entityTypes: Array<'seller' | 'client' | 'game' | 'client_allocation'> = [
      'seller',
      'client',
      'game',
      'client_allocation',
    ];

    // Pre-cache known sellers from Supabase in 1 fast query to avoid N extra network calls
    const knownSellerIds = new Set<string>();
    try {
      const { data: remoteSellers } = await supabase.from('sellers').select('id');
      if (remoteSellers) {
        remoteSellers.forEach((s) => knownSellerIds.add(s.id));
      }
    } catch {}

    for (const entityType of entityTypes) {
      const entityItems = sortedQueue.filter((item) => item.entity === entityType);
      if (entityItems.length === 0) continue;

      const deleteItems = entityItems.filter((item) => item.action === 'DELETE');
      const upsertItems = entityItems.filter((item) => item.action === 'UPSERT');
      const table =
        entityType === 'game'
          ? 'games'
          : entityType === 'seller'
          ? 'sellers'
          : entityType === 'client'
          ? 'clients'
          : 'client_allocations';

      // ── BATCH DELETES ──
      if (deleteItems.length > 0) {
        const deleteChunks = chunkArray(deleteItems, BATCH_SIZE);
        for (const chunk of deleteChunks) {
          const rawIds = chunk.map((i) => i.payload.id);
          const safeIds = rawIds.map((id) => toSafeUUID(id));
          const allTargetIds = Array.from(new Set([...rawIds, ...safeIds]));

          try {
            if (entityType === 'game') {
              // Cascade delete allocations & credentials in Supabase before deleting games
              await supabase.from('client_allocations').delete().in('game_id', allTargetIds);
              try {
                await supabase.from('credential_history').delete().in('game_id', allTargetIds);
              } catch {}
            }

            const { error } = await supabase.from(table).delete().in('id', allTargetIds);
            if (error) {
              console.warn(`[SyncQueue] Batch delete error on '${table}', falling back to single:`, error.message);
              for (const item of chunk) {
                const singleSafeId = toSafeUUID(item.payload.id);
                const { error: singleErr } = await supabase.from(table).delete().eq('id', singleSafeId);
                if (singleErr) {
                  remainingQueue.push(item);
                } else {
                  processedCount++;
                }
              }
            } else {
              processedCount += chunk.length;
            }
          } catch (err) {
            console.error(`[SyncQueue] Delete exception on '${table}':`, err);
            remainingQueue.push(...chunk);
          }
        }
      }

      // ── BATCH UPSERTS ──
      if (upsertItems.length > 0) {
        // Auto-resolve missing sellers for games before batching
        if (entityType === 'game') {
          const missingSellerPayloads: any[] = [];
          for (const item of upsertItems) {
            if (item.payload.seller_id) {
              const safeSellerId = toSafeUUID(item.payload.seller_id);
              if (!knownSellerIds.has(safeSellerId)) {
                const localSeller = OfflineVault.getSellers().find(
                  (s) => s.id === item.payload.seller_id || toSafeUUID(s.id) === safeSellerId
                );
                if (localSeller) {
                  missingSellerPayloads.push({
                    ...localSeller,
                    id: safeSellerId,
                    user_id: authUserId,
                    updated_at: new Date().toISOString(),
                  });
                  knownSellerIds.add(safeSellerId);
                }
              }
            }
          }
          if (missingSellerPayloads.length > 0) {
            try {
              await supabase.from('sellers').upsert(missingSellerPayloads);
            } catch {}
          }
        }

        // Format payloads for the entity
        const preparedList = upsertItems.map((item) => {
          const safeId = toSafeUUID(item.payload.id);
          const payload: any = {
            ...item.payload,
            id: safeId,
            user_id: authUserId,
            updated_at: new Date().toISOString(),
          };

          if (entityType === 'game') {
            delete payload.seller;
            delete payload.allocations;
            if (payload.seller_id) {
              const safeSellerId = toSafeUUID(payload.seller_id);
              payload.seller_id = knownSellerIds.has(safeSellerId) ? safeSellerId : null;
            } else {
              payload.seller_id = null;
            }
            if (payload.psn_password === undefined || payload.psn_password === null) {
              payload.psn_password = '';
            }
            if (!payload.notes) payload.notes = '';
            if (!payload.backup_codes) payload.backup_codes = [];
          } else if (entityType === 'client_allocation') {
            delete payload.client;
            delete payload.game;
            payload.game_id = toSafeUUID(payload.game_id);
            payload.client_id = toSafeUUID(payload.client_id);
          }

          return { item, payload };
        });

        // Split into chunks of 50 and upsert in bulk
        const upsertChunks = chunkArray(preparedList, BATCH_SIZE);
        for (const chunk of upsertChunks) {
          const payloads = chunk.map((c) => c.payload);
          try {
            const { error } = await supabase.from(table).upsert(payloads);
            if (error) {
              console.warn(`[SyncQueue] Batch upsert on '${table}' error:`, error.message, 'Falling back to individual items...');
              for (const { item, payload } of chunk) {
                const { error: singleErr } = await supabase.from(table).upsert(payload);
                if (singleErr) {
                  console.error(`[SyncQueue] Single upsert error on '${table}':`, singleErr.message);
                  remainingQueue.push(item);
                } else {
                  processedCount++;
                  if (entityType === 'seller') knownSellerIds.add(payload.id);
                }
              }
            } else {
              processedCount += chunk.length;
              if (entityType === 'seller') {
                payloads.forEach((p) => knownSellerIds.add(p.id));
              }
            }
          } catch (err) {
            console.error(`[SyncQueue] Exception on bulk upsert '${table}':`, err);
            remainingQueue.push(...chunk.map((c) => c.item));
          }
        }
      }
    }

    SyncQueue.saveQueue(remainingQueue);
    isSyncing = false;

    if (remainingQueue.length === 0) {
      currentStatus = isSupabaseConfigured && authUserId ? 'synced' : 'local_only';
      SyncQueue.setLastSyncedAt(new Date().toISOString());
    } else {
      currentStatus = SyncQueue.isOnline() ? 'error' : 'offline';
    }

    notifyListeners();
    return { success: remainingQueue.length === 0, syncedCount: processedCount };
  },
};

// Listen to browser network reconnection
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    SyncQueue.flush();
  });
  window.addEventListener('offline', () => {
    currentStatus = 'offline';
    notifyListeners();
  });
}

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

    if (!isSupabaseConfigured || !userId) {
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

    for (const item of queue) {
      try {
        const table = item.entity === 'game' ? 'games' : 'sellers';

        if (item.action === 'UPSERT') {
          const safeId = toSafeUUID(item.payload.id);
          const payloadWithUser = {
            ...item.payload,
            id: safeId,
            user_id: userId || item.payload.user_id,
            updated_at: new Date().toISOString(),
          };

          // Remove client-only joined fields before upserting
          if (item.entity === 'game') {
            delete payloadWithUser.seller;
            // Clean up seller_id: empty string is invalid in PostgreSQL, ensure valid UUID
            if (payloadWithUser.seller_id) {
              payloadWithUser.seller_id = toSafeUUID(payloadWithUser.seller_id);
            } else {
              delete payloadWithUser.seller_id;
            }
            // Ensure psn_password is never null for Postgres not-null constraint
            if (payloadWithUser.psn_password === undefined || payloadWithUser.psn_password === null) {
              payloadWithUser.psn_password = '';
            }
            if (!payloadWithUser.notes) {
              payloadWithUser.notes = '';
            }
            if (!payloadWithUser.backup_codes) {
              payloadWithUser.backup_codes = [];
            }
          }

          const { error } = await supabase.from(table).upsert(payloadWithUser);
          if (error) {
            console.error(`[SyncQueue] Upsert error on table '${table}':`, error.message, error.details || '', error.hint || '');
            remainingQueue.push(item);
          } else {
            processedCount++;
            if (item.payload.id !== safeId) {
              if (item.entity === 'game') {
                OfflineVault.deleteGame(item.payload.id);
                OfflineVault.addGame({ ...item.payload, id: safeId });
              } else if (item.entity === 'seller') {
                OfflineVault.deleteSeller(item.payload.id);
                OfflineVault.addSeller({ ...item.payload, id: safeId });
              }
            }
          }
        } else if (item.action === 'DELETE') {
          const safeId = toSafeUUID(item.payload.id);
          const { error } = await supabase.from(table).delete().eq('id', safeId);
          if (error) {
            console.error(`[SyncQueue] Delete error on table '${table}':`, error.message);
            remainingQueue.push(item);
          } else {
            processedCount++;
          }
        }
      } catch (err) {
        console.error('[SyncQueue] Exception during sync:', err);
        remainingQueue.push(item);
      }
    }

    SyncQueue.saveQueue(remainingQueue);
    isSyncing = false;

    if (remainingQueue.length === 0) {
      currentStatus = isSupabaseConfigured && userId ? 'synced' : 'local_only';
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

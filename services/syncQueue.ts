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
        // No active JWT session. User is either logged out or hasn't confirmed email yet.
        // Keep pending items safely stored in local queue.
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

    for (const item of sortedQueue) {
      try {
        let table = 'games';
        if (item.entity === 'game') table = 'games';
        else if (item.entity === 'seller') table = 'sellers';
        else if (item.entity === 'client') table = 'clients';
        else if (item.entity === 'client_allocation') table = 'client_allocations';

        if (item.action === 'UPSERT') {
          const safeId = toSafeUUID(item.payload.id);
          const payloadWithUser = {
            ...item.payload,
            id: safeId,
            user_id: authUserId,
            updated_at: new Date().toISOString(),
          };

          // Remove client-only joined fields before upserting
          if (item.entity === 'game') {
            delete payloadWithUser.seller;
            delete payloadWithUser.allocations;
            
            // Clean up seller_id and ensure parent seller exists in Supabase
            if (payloadWithUser.seller_id) {
              const safeSellerId = toSafeUUID(payloadWithUser.seller_id);
              payloadWithUser.seller_id = safeSellerId;

              // Verify if the referenced seller already exists in Supabase
              const { data: existingSeller } = await supabase
                .from('sellers')
                .select('id')
                .eq('id', safeSellerId)
                .maybeSingle();

              if (!existingSeller) {
                // Find seller locally in OfflineVault and auto-upsert it first
                const localSeller = OfflineVault.getSellers().find(
                  (s) => s.id === item.payload.seller_id || toSafeUUID(s.id) === safeSellerId
                );
                if (localSeller) {
                  const sellerPayload = {
                    ...localSeller,
                    id: safeSellerId,
                    user_id: authUserId,
                    updated_at: new Date().toISOString(),
                  };
                  const { error: sErr } = await supabase.from('sellers').upsert(sellerPayload);
                  if (sErr) {
                    console.warn('[SyncQueue] Auto-upsert parent seller failed, setting seller_id to null:', sErr.message);
                    payloadWithUser.seller_id = null;
                  }
                } else {
                  // Referenced seller does not exist in local database either, set null to satisfy FK
                  payloadWithUser.seller_id = null;
                }
              }
            } else {
              payloadWithUser.seller_id = null;
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
          } else if (item.entity === 'client_allocation') {
            delete payloadWithUser.client;
            delete payloadWithUser.game;
            payloadWithUser.game_id = toSafeUUID(payloadWithUser.game_id);
            payloadWithUser.client_id = toSafeUUID(payloadWithUser.client_id);
          }

          const { error } = await supabase.from(table).upsert(payloadWithUser);
          if (error) {
            console.error(`[SyncQueue] Upsert error on table '${table}':`, error.message, error.details || '', error.hint || '');
            remainingQueue.push(item);
          } else {
            processedCount++;
            // Update local records if ID or user_id changed so they belong to auth user
            if (item.entity === 'game') {
              if (item.payload.id !== safeId || item.payload.user_id !== authUserId) {
                OfflineVault.deleteGame(item.payload.id);
                OfflineVault.addGame({ ...item.payload, id: safeId, user_id: authUserId });
              }
            } else if (item.entity === 'seller') {
              if (item.payload.id !== safeId || item.payload.user_id !== authUserId) {
                OfflineVault.deleteSeller(item.payload.id);
                OfflineVault.addSeller({ ...item.payload, id: safeId, user_id: authUserId });
              }
            } else if (item.entity === 'client') {
              if (item.payload.id !== safeId || item.payload.user_id !== authUserId) {
                OfflineVault.deleteClient(item.payload.id);
                OfflineVault.addClient({ ...item.payload, id: safeId, user_id: authUserId });
              }
            } else if (item.entity === 'client_allocation') {
              if (item.payload.id !== safeId || item.payload.user_id !== authUserId) {
                OfflineVault.deleteAllocation(item.payload.id);
                OfflineVault.addAllocation({ ...item.payload, id: safeId, user_id: authUserId });
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

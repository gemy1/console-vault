import { VaultStorage, OfflineVault } from './storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { PendingSyncItem, SyncStatus } from '../types/vault';
import { Platform } from 'react-native';
import { toSafeUUID } from '../utils/uuid';
import { VaultKeyManager } from './crypto/vaultKeyManager';
import { encryptString, encryptBackupCodes } from './crypto/encryptionService';

const SYNC_QUEUE_KEY = 'vault_pending_sync_queue_v1';
const LAST_SYNCED_KEY = 'vault_last_synced_timestamp_v1';

// ---------------------------------------------------------------------------
// ENUM GUARD — prevents invalid enum values from reaching Supabase
// Any value not in the allowed set is replaced with the safe default.
// This protects against corrupted local data, old backup restores, or typos.
// ---------------------------------------------------------------------------
const VALID_CONTACT_PLATFORMS = new Set(['WhatsApp', 'Telegram', 'Discord', 'Facebook', 'Other']);
const VALID_GAME_STATUSES = new Set(['Active', 'Locked', 'In Resolution', 'Archived', 'Dead Loss']);
const VALID_ACCOUNT_TYPES = new Set(['Primary', 'Secondary', 'Full']);
const VALID_SLOT_TYPES = new Set([
  'Primary_PS5', 'Primary_PS4',
  'Secondary_PS5', 'Secondary_PS4',
  'Secondary', 'Full',
]);
const VALID_ALLOCATION_STATUSES = new Set(['Active', 'Revoked', 'Replaced', 'Expired']);

function sanitizePayload(entityType: string, payload: any): any {
  const p = { ...payload };

  if (entityType === 'seller' || entityType === 'client') {
    // Validate contact_platform enum
    if (!VALID_CONTACT_PLATFORMS.has(p.contact_platform)) {
      console.warn(
        `[SyncQueue] Invalid contact_platform "${p.contact_platform}" on ${entityType} ${p.id} — defaulting to 'WhatsApp'`
      );
      p.contact_platform = 'WhatsApp';
    }
  }

  if (entityType === 'seller' && Array.isArray(p.contact_methods)) {
    // Validate each entry inside the contact_methods JSONB array
    p.contact_methods = p.contact_methods.map((m: any) => {
      if (!VALID_CONTACT_PLATFORMS.has(m?.platform)) {
        return { ...m, platform: 'Other' };
      }
      return m;
    });
  }

  if (entityType === 'game') {
    if (!VALID_GAME_STATUSES.has(p.status)) {
      console.warn(
        `[SyncQueue] Invalid game_status "${p.status}" on game ${p.id} — defaulting to 'Active'`
      );
      p.status = 'Active';
    }
    if (!VALID_ACCOUNT_TYPES.has(p.account_type)) {
      console.warn(
        `[SyncQueue] Invalid account_type "${p.account_type}" on game ${p.id} — defaulting to 'Primary'`
      );
      p.account_type = 'Primary';
    }
  }

  if (entityType === 'client_allocation') {
    if (!VALID_SLOT_TYPES.has(p.slot_type)) {
      console.warn(
        `[SyncQueue] Invalid slot_type "${p.slot_type}" on allocation ${p.id} — defaulting to 'Secondary'`
      );
      p.slot_type = 'Secondary';
    }
    if (!VALID_ALLOCATION_STATUSES.has(p.status)) {
      console.warn(
        `[SyncQueue] Invalid allocation_status "${p.status}" on allocation ${p.id} — defaulting to 'Active'`
      );
      p.status = 'Active';
    }
  }

  return p;
}

/**
 * Returns true for Postgres errors that will NEVER succeed on retry.
 * Items with these errors should be dropped from the queue, not re-queued.
 *
 * Common non-recoverable codes:
 *   22P02 — invalid_text_representation (enum value not in the type)
 *   22001 — string_data_right_truncation
 *   23502 — not_null_violation
 *   23514 — check_violation (e.g. reputation_score out of range)
 *   42703 — undefined_column (schema mismatch)
 */
function isNonRecoverableError(err: any): boolean {
  const code: string = err?.code ?? '';
  return (
    code === '22P02' || // invalid enum value
    code === '22001' || // value too long
    code === '23502' || // not null violation
    code === '23514' || // check constraint violation
    code === '42703'    // undefined column
  );
}
// ---------------------------------------------------------------------------


type SyncListener = (status: SyncStatus, pendingCount: number) => void;
const listeners = new Set<SyncListener>();

let currentStatus: SyncStatus = isSupabaseConfigured ? 'synced' : 'local_only';
let isSyncing = false;
let isSyncPaused = false;
let lastSyncError: string | null = null;

function notifyListeners() {
  const pending = SyncQueue.getQueue().length;
  listeners.forEach((listener) => {
    try {
      listener(currentStatus, pending);
    } catch {}
  });
}

export const SyncQueue = {
  pauseSync: (): void => {
    isSyncPaused = true;
  },

  resumeSync: (): void => {
    isSyncPaused = false;
  },

  isPaused: (): boolean => {
    return isSyncPaused;
  },

  getLastError: (): string | null => {
    return lastSyncError;
  },

  clearLastError: (): void => {
    lastSyncError = null;
  },

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

    const newItem: PendingSyncItem = {
      ...item,
      id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };

    if (item.action === 'DELETE') {
      // DELETE wins over everything: remove ALL existing entries for this entity+id
      // (clears any stuck UPSERT so deleted items don't stay pending forever)
      const filtered = queue.filter(
        (q) => !(q.entity === item.entity && q.payload?.id === item.payload?.id)
      );
      filtered.push(newItem);
      SyncQueue.saveQueue(filtered);
    } else {
      // UPSERT: coalesce with existing UPSERT for same entity+id
      const existingIndex = queue.findIndex(
        (q) => q.entity === item.entity && q.payload?.id === item.payload?.id
      );
      if (existingIndex >= 0) {
        queue[existingIndex] = newItem;
      } else {
        queue.push(newItem);
      }
      SyncQueue.saveQueue(queue);
    }

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

  flush: async (userId?: string): Promise<{ success: boolean; syncedCount: number; error?: string | null }> => {
    if (isSyncing) {
      return { success: true, syncedCount: 0, error: null };
    }

    if (!isSupabaseConfigured) {
      currentStatus = 'local_only';
      notifyListeners();
      return { success: true, syncedCount: 0, error: null };
    }

    // Verify active authenticated session in Supabase before sending data
    let authUserId = userId;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        currentStatus = 'offline';
        lastSyncError = 'No active cloud session. Please confirm your email or sign in to sync with the cloud.';
        notifyListeners();
        return { success: false, syncedCount: 0, error: lastSyncError };
      }
      authUserId = session.user.id;
    } catch (err: any) {
      currentStatus = 'offline';
      lastSyncError = err?.message || 'Network error connecting to cloud server.';
      notifyListeners();
      return { success: false, syncedCount: 0, error: lastSyncError };
    }

    if (!authUserId) {
      currentStatus = 'local_only';
      notifyListeners();
      return { success: true, syncedCount: 0, error: null };
    }

    const queue = SyncQueue.getQueue();
    if (queue.length === 0) {
      currentStatus = 'synced';
      notifyListeners();
      return { success: true, syncedCount: 0 };
    }

    if (isSyncPaused) {
      console.log('[SyncQueue] Sync is paused during cryptographic migration. Skipping flush.');
      return { success: false, syncedCount: 0 };
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
                  const rawSellerPayload = {
                    ...localSeller,
                    id: safeSellerId,
                    user_id: authUserId,
                    updated_at: new Date().toISOString(),
                  };
                  missingSellerPayloads.push(sanitizePayload('seller', rawSellerPayload));
                }
              }
            }
          }
          if (missingSellerPayloads.length > 0) {
            let sellerUpsertSuccess = false;
            const { error: sErr } = await supabase.from('sellers').upsert(missingSellerPayloads);
            if (sErr) {
              // Retry without contact_methods in case the remote Supabase table lacks that column
              const cleanPayloads = missingSellerPayloads.map((p) => {
                const copy = { ...p };
                delete copy.contact_methods;
                return copy;
              });
              const { error: sRetryErr } = await supabase.from('sellers').upsert(cleanPayloads);
              if (!sRetryErr) {
                sellerUpsertSuccess = true;
              } else {
                console.warn('[SyncQueue] Missing seller upsert failed:', sRetryErr.message);
              }
            } else {
              sellerUpsertSuccess = true;
            }

            if (sellerUpsertSuccess) {
              missingSellerPayloads.forEach((p) => knownSellerIds.add(p.id));
            }
          }
        }

        // Format payloads for the entity
        const preparedList: Array<{ item: PendingSyncItem; payload: any }> = [];
        const activeKey = VaultKeyManager.getActiveKey();

        for (const item of upsertItems) {
          const safeId = toSafeUUID(item.payload.id);
          let payload: any = {
            ...item.payload,
            id: safeId,
            user_id: authUserId,
            updated_at: new Date().toISOString(),
          };

          // ── ENUM SANITIZATION — must run before any column-specific logic ──
          payload = sanitizePayload(entityType, payload);

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

            // Zero-Knowledge Encryption on the fly or safe deferral:
            if (payload.psn_password && !payload.psn_password.startsWith('enc:v1:')) {
              let keyToUse = activeKey;
              if (!keyToUse && authUserId) {
                try {
                  keyToUse = await VaultKeyManager.loadKeyFromSecureStore(authUserId);
                } catch {}
              }
              if (keyToUse) {
                payload.psn_password = encryptString(payload.psn_password, keyToUse);
                OfflineVault.updateGame(item.payload.id, { psn_password: payload.psn_password });
              } else {
                console.warn(`[SyncQueue] Deferred cloud upload for "${payload.title}": Password is unencrypted and vault key is locked.`);
                lastSyncError = `Vault key is locked. Unlock your vault to encrypt credentials for "${payload.title}".`;
                remainingQueue.push(item);
                continue;
              }
            }

            if (payload.backup_codes && payload.backup_codes.length > 0) {
              let keyToUse = activeKey;
              if (!keyToUse && authUserId) {
                try {
                  keyToUse = await VaultKeyManager.loadKeyFromSecureStore(authUserId);
                } catch {}
              }
              if (keyToUse) {
                payload.backup_codes = encryptBackupCodes(payload.backup_codes, keyToUse);
              }
            }

            if (!payload.notes) payload.notes = '';
            if (!payload.backup_codes) payload.backup_codes = [];
          } else if (entityType === 'client_allocation') {
            delete payload.client;
            delete payload.game;
            payload.game_id = toSafeUUID(payload.game_id);
            payload.client_id = toSafeUUID(payload.client_id);
          }

          preparedList.push({ item, payload });
        }

        // Split into chunks of 50 and upsert in bulk
        const upsertChunks = chunkArray(preparedList, BATCH_SIZE);
        for (const chunk of upsertChunks) {
          const payloads = chunk.map((c) => c.payload);
          try {
            const { error } = await supabase.from(table).upsert(payloads);
            if (error) {
              console.warn(`[SyncQueue] Batch upsert on '${table}' error:`, error.message, 'Falling back to individual items...');
              lastSyncError = error.message;
              for (const { item, payload } of chunk) {
                let currentPayload = { ...payload };
                let { error: singleErr } = await supabase.from(table).upsert(currentPayload);

                // Schema resilience: If user hasn't executed migration_patch.sql, retry without optional columns
                if (singleErr && singleErr.message && singleErr.message.includes('column') && singleErr.message.includes('does not exist')) {
                  delete currentPayload.is_inventory;
                  delete currentPayload.cost_price;
                  delete currentPayload.currency;
                  delete currentPayload.platform;
                  delete currentPayload.contact_methods;
                  const retry = await supabase.from(table).upsert(currentPayload);
                  singleErr = retry.error;
                }

                if (singleErr) {
                  // Non-recoverable Postgres errors: drop the item permanently
                  // (invalid enum 22P02, not-null 23502, check violation 23514)
                  // Retrying these forever will only keep them stuck in the queue.
                  if (isNonRecoverableError(singleErr)) {
                    console.warn(
                      `[SyncQueue] Dropping non-recoverable item on '${table}' (${singleErr.code}): ${singleErr.message}`
                    );
                    // Do NOT push to remainingQueue — item is permanently dropped
                  } else {
                    console.error(`[SyncQueue] Single upsert error on '${table}':`, singleErr.message);
                    lastSyncError = singleErr.message;
                    remainingQueue.push(item);
                  }
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
          } catch (err: any) {
            console.error(`[SyncQueue] Exception on bulk upsert '${table}':`, err);
            lastSyncError = err?.message || 'Database connection error';
            remainingQueue.push(...chunk.map((c) => c.item));
          }
        }
      }
    }

    SyncQueue.saveQueue(remainingQueue);
    isSyncing = false;

    if (remainingQueue.length === 0) {
      lastSyncError = null;
      currentStatus = isSupabaseConfigured && authUserId ? 'synced' : 'local_only';
      SyncQueue.setLastSyncedAt(new Date().toISOString());
    } else {
      currentStatus = SyncQueue.isOnline() ? 'error' : 'offline';
    }

    notifyListeners();
    return { success: remainingQueue.length === 0, syncedCount: processedCount, error: lastSyncError };
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

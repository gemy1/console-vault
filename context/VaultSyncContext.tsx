import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { Game, Seller, Client, ClientAllocation, SyncStatus } from '../types/vault';
import { OfflineVault, VaultStorage } from '../services/storage';
import { SyncQueue } from '../services/syncQueue';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface VaultSyncContextType {
  games: Game[];
  sellers: Seller[];
  clients: Client[];
  allocations: ClientAllocation[];
  syncStatus: SyncStatus;
  pendingCount: number;
  lastSyncedAt: string | null;
  syncNow: () => Promise<boolean>;
  addGame: (game: Game) => Game;
  updateGame: (id: string, partial: Partial<Game>) => Game | null;
  deleteGame: (id: string) => boolean;
  addSeller: (seller: Seller) => Seller;
  updateSeller: (id: string, partial: Partial<Seller>) => Seller | null;
  deleteSeller: (id: string) => boolean;
  addClient: (client: Client) => Client;
  updateClient: (id: string, partial: Partial<Client>) => Client | null;
  deleteClient: (id: string) => boolean;
  addAllocation: (allocation: ClientAllocation) => ClientAllocation;
  updateAllocation: (id: string, partial: Partial<ClientAllocation>) => ClientAllocation | null;
  deleteAllocation: (id: string) => boolean;
  refreshData: () => void;
  pullFromCloud: () => Promise<boolean>;
  clearLocalVault: () => void;
  clearCloudAndLocalVault: () => Promise<boolean>;
}

const VaultSyncContext = createContext<VaultSyncContextType | undefined>(undefined);

export function VaultSyncProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const [games, setGames] = useState<Game[]>(() => OfflineVault.getGames());
  const [sellers, setSellers] = useState<Seller[]>(() => OfflineVault.getSellers());
  const [clients, setClients] = useState<Client[]>(() => OfflineVault.getClients());
  const [allocations, setAllocations] = useState<ClientAllocation[]>(() => OfflineVault.getAllocations());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => {
    return isSupabaseConfigured && userId ? 'synced' : 'local_only';
  });
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => SyncQueue.getLastSyncedAt());

  // Subscribe to SyncQueue status updates
  useEffect(() => {
    const unsubscribe = SyncQueue.subscribe((status, count) => {
      if (!isSupabaseConfigured || !userId) {
        setSyncStatus('local_only');
      } else {
        setSyncStatus(status);
      }
      setPendingCount(count);
      setLastSyncedAt(SyncQueue.getLastSyncedAt());
    });
    return unsubscribe;
  }, [userId]);

  const refreshData = useCallback(() => {
    setGames([...OfflineVault.getGames()]);
    setSellers([...OfflineVault.getSellers()]);
    setClients([...OfflineVault.getClients()]);
    setAllocations([...OfflineVault.getAllocations()]);
  }, []);

  // Hydration listener: when AsyncStorage finishes reading from disk, update state
  useEffect(() => {
    const unsubscribe = VaultStorage.onHydrated(() => {
      refreshData();
    });
    if (VaultStorage.isHydrated()) {
      refreshData();
    }
    return unsubscribe;
  }, [refreshData]);

  // Fetch from Supabase if configured and merge
  const pullFromCloud = useCallback(async (): Promise<boolean> => {
    if (!isSupabaseConfigured || !userId) return false;

    try {
      const [gamesRes, sellersRes, clientsRes, allocationsRes] = await Promise.all([
        supabase.from('games').select('*').order('created_at', { ascending: false }),
        supabase.from('sellers').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('client_allocations').select('*').order('created_at', { ascending: false }),
      ]);

      if (gamesRes.data && sellersRes.data) {
        const cloudClients = (clientsRes.data || []) as Client[];
        const cloudAllocations = (allocationsRes.data || []) as ClientAllocation[];

        if (
          gamesRes.data.length > 0 ||
          sellersRes.data.length > 0 ||
          cloudClients.length > 0 ||
          cloudAllocations.length > 0
        ) {
          OfflineVault.hydrateVault(
            gamesRes.data as Game[],
            sellersRes.data as Seller[],
            cloudClients,
            cloudAllocations
          );
          refreshData();
          SyncQueue.setLastSyncedAt(new Date().toISOString());
          setLastSyncedAt(new Date().toISOString());
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }, [userId, refreshData]);

  // Flush pending changes and pull latest
  const syncNow = useCallback(async (): Promise<boolean> => {
    if (!isSupabaseConfigured || !userId) {
      setSyncStatus('local_only');
      return false;
    }
    const result = await SyncQueue.flush(userId);
    if (result.success && isSupabaseConfigured && userId) {
      await pullFromCloud();
    }
    return result.success;
  }, [userId, pullFromCloud]);

  // When user logs in with a valid userId, automatically flush pending items and pull latest
  useEffect(() => {
    if (isSupabaseConfigured && userId) {
      syncNow();
    }
  }, [userId, syncNow]);

  // OPTIMISTIC CRUD OPERATIONS: Write local in 0ms, enqueue sync in background
  const addGame = useCallback(
    (game: Game): Game => {
      const gameWithUser: Game = {
        ...game,
        user_id: userId || game.user_id || 'user-demo',
      };
      const saved = OfflineVault.addGame(gameWithUser);
      setGames([...OfflineVault.getGames()]);
      SyncQueue.enqueue({
        entity: 'game',
        action: 'UPSERT',
        payload: saved,
      });
      // Fire-and-forget background flush
      SyncQueue.flush(userId).catch(() => {});
      return saved;
    },
    [userId]
  );

  const updateGame = useCallback(
    (id: string, partial: Partial<Game>): Game | null => {
      const updated = OfflineVault.updateGame(id, partial);
      if (updated) {
        setGames([...OfflineVault.getGames()]);
        SyncQueue.enqueue({
          entity: 'game',
          action: 'UPSERT',
          payload: updated,
        });
        SyncQueue.flush(userId).catch(() => {});
      }
      return updated;
    },
    [userId]
  );

  const deleteGame = useCallback(
    (id: string): boolean => {
      const success = OfflineVault.deleteGame(id);
      if (success) {
        setGames([...OfflineVault.getGames()]);
        setAllocations([...OfflineVault.getAllocations()]);
        SyncQueue.enqueue({
          entity: 'game',
          action: 'DELETE',
          payload: { id },
        });
        SyncQueue.flush(userId).catch(() => {});
      }
      return success;
    },
    [userId]
  );

  const addSeller = useCallback(
    (seller: Seller): Seller => {
      const sellerWithUser: Seller = {
        ...seller,
        user_id: userId || seller.user_id || 'user-demo',
      };
      const saved = OfflineVault.addSeller(sellerWithUser);
      setSellers([...OfflineVault.getSellers()]);
      SyncQueue.enqueue({
        entity: 'seller',
        action: 'UPSERT',
        payload: saved,
      });
      SyncQueue.flush(userId).catch(() => {});
      return saved;
    },
    [userId]
  );

  const updateSeller = useCallback(
    (id: string, partial: Partial<Seller>): Seller | null => {
      const updated = OfflineVault.updateSeller(id, partial);
      if (updated) {
        setSellers([...OfflineVault.getSellers()]);
        SyncQueue.enqueue({
          entity: 'seller',
          action: 'UPSERT',
          payload: updated,
        });
        SyncQueue.flush(userId).catch(() => {});
      }
      return updated;
    },
    [userId]
  );

  const deleteSeller = useCallback(
    (id: string): boolean => {
      const success = OfflineVault.deleteSeller(id);
      if (success) {
        setSellers([...OfflineVault.getSellers()]);
        SyncQueue.enqueue({
          entity: 'seller',
          action: 'DELETE',
          payload: { id },
        });
        SyncQueue.flush(userId).catch(() => {});
      }
      return success;
    },
    [userId]
  );

  const addClient = useCallback(
    (client: Client): Client => {
      const clientWithUser: Client = {
        ...client,
        user_id: userId || client.user_id || 'user-demo',
      };
      const saved = OfflineVault.addClient(clientWithUser);
      setClients([...OfflineVault.getClients()]);
      SyncQueue.enqueue({
        entity: 'client',
        action: 'UPSERT',
        payload: saved,
      });
      SyncQueue.flush(userId).catch(() => {});
      return saved;
    },
    [userId]
  );

  const updateClient = useCallback(
    (id: string, partial: Partial<Client>): Client | null => {
      const updated = OfflineVault.updateClient(id, partial);
      if (updated) {
        setClients([...OfflineVault.getClients()]);
        SyncQueue.enqueue({
          entity: 'client',
          action: 'UPSERT',
          payload: updated,
        });
        SyncQueue.flush(userId).catch(() => {});
      }
      return updated;
    },
    [userId]
  );

  const deleteClient = useCallback(
    (id: string): boolean => {
      const success = OfflineVault.deleteClient(id);
      if (success) {
        setClients([...OfflineVault.getClients()]);
        setAllocations([...OfflineVault.getAllocations()]);
        SyncQueue.enqueue({
          entity: 'client',
          action: 'DELETE',
          payload: { id },
        });
        SyncQueue.flush(userId).catch(() => {});
      }
      return success;
    },
    [userId]
  );

  const addAllocation = useCallback(
    (allocation: ClientAllocation): ClientAllocation => {
      const allocationWithUser: ClientAllocation = {
        ...allocation,
        user_id: userId || allocation.user_id || 'user-demo',
      };
      const saved = OfflineVault.addAllocation(allocationWithUser);
      setAllocations([...OfflineVault.getAllocations()]);
      SyncQueue.enqueue({
        entity: 'client_allocation',
        action: 'UPSERT',
        payload: saved,
      });
      SyncQueue.flush(userId).catch(() => {});
      return saved;
    },
    [userId]
  );

  const updateAllocation = useCallback(
    (id: string, partial: Partial<ClientAllocation>): ClientAllocation | null => {
      const updated = OfflineVault.updateAllocation(id, partial);
      if (updated) {
        setAllocations([...OfflineVault.getAllocations()]);
        SyncQueue.enqueue({
          entity: 'client_allocation',
          action: 'UPSERT',
          payload: updated,
        });
        SyncQueue.flush(userId).catch(() => {});
      }
      return updated;
    },
    [userId]
  );

  const deleteAllocation = useCallback(
    (id: string): boolean => {
      const success = OfflineVault.deleteAllocation(id);
      if (success) {
        setAllocations([...OfflineVault.getAllocations()]);
        SyncQueue.enqueue({
          entity: 'client_allocation',
          action: 'DELETE',
          payload: { id },
        });
        SyncQueue.flush(userId).catch(() => {});
      }
      return success;
    },
    [userId]
  );

  const clearLocalVault = useCallback(() => {
    OfflineVault.clearVault();
    SyncQueue.clearQueue();
    refreshData();
  }, [refreshData]);

  const clearCloudAndLocalVault = useCallback(async (): Promise<boolean> => {
    try {
      if (isSupabaseConfigured && userId) {
        // Delete all data belonging to this user in Supabase
        await Promise.all([
          supabase.from('games').delete().eq('user_id', userId),
          supabase.from('sellers').delete().eq('user_id', userId),
          supabase.from('clients').delete().eq('user_id', userId),
          supabase.from('client_allocations').delete().eq('user_id', userId),
        ]);
      }
    } catch (err) {
      console.warn('[VaultSync] Error deleting cloud data:', err);
    } finally {
      OfflineVault.clearVault();
      SyncQueue.clearQueue();
      refreshData();
    }
    return true;
  }, [userId, refreshData]);

  const value = useMemo(
    () => ({
      games,
      sellers,
      clients,
      allocations,
      syncStatus,
      pendingCount,
      lastSyncedAt,
      syncNow,
      addGame,
      updateGame,
      deleteGame,
      addSeller,
      updateSeller,
      deleteSeller,
      addClient,
      updateClient,
      deleteClient,
      addAllocation,
      updateAllocation,
      deleteAllocation,
      refreshData,
      pullFromCloud,
      clearLocalVault,
      clearCloudAndLocalVault,
    }),
    [
      games,
      sellers,
      clients,
      allocations,
      syncStatus,
      pendingCount,
      lastSyncedAt,
      syncNow,
      addGame,
      updateGame,
      deleteGame,
      addSeller,
      updateSeller,
      deleteSeller,
      addClient,
      updateClient,
      deleteClient,
      addAllocation,
      updateAllocation,
      deleteAllocation,
      refreshData,
      pullFromCloud,
      clearLocalVault,
      clearCloudAndLocalVault,
    ]
  );

  return <VaultSyncContext.Provider value={value}>{children}</VaultSyncContext.Provider>;
}

const DEFAULT_SYNC_FALLBACK: VaultSyncContextType = {
  games: [],
  sellers: [],
  clients: [],
  allocations: [],
  syncStatus: 'local_only',
  pendingCount: 0,
  lastSyncedAt: null,
  syncNow: async () => false,
  addGame: (g) => g,
  updateGame: () => null,
  deleteGame: () => false,
  addSeller: (s) => s,
  updateSeller: () => null,
  deleteSeller: () => false,
  addClient: (c) => c,
  updateClient: () => null,
  deleteClient: () => false,
  addAllocation: (a) => a,
  updateAllocation: () => null,
  deleteAllocation: () => false,
  refreshData: () => {},
  pullFromCloud: async () => false,
  clearLocalVault: () => {},
  clearCloudAndLocalVault: async () => false,
};

export function useVaultSync() {
  const context = useContext(VaultSyncContext);
  return context ?? DEFAULT_SYNC_FALLBACK;
}

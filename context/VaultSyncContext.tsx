import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { Game, Seller, SyncStatus } from '../types/vault';
import { OfflineVault, VaultStorage } from '../services/storage';
import { SyncQueue } from '../services/syncQueue';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface VaultSyncContextType {
  games: Game[];
  sellers: Seller[];
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
  refreshData: () => void;
  pullFromCloud: () => Promise<boolean>;
  clearLocalVault: () => void;
}

const VaultSyncContext = createContext<VaultSyncContextType | undefined>(undefined);

export function VaultSyncProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const [games, setGames] = useState<Game[]>(() => OfflineVault.getGames());
  const [sellers, setSellers] = useState<Seller[]>(() => OfflineVault.getSellers());
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
      const [gamesRes, sellersRes] = await Promise.all([
        supabase.from('games').select('*').order('created_at', { ascending: false }),
        supabase.from('sellers').select('*').order('created_at', { ascending: false }),
      ]);

      if (gamesRes.data && sellersRes.data) {
        if (gamesRes.data.length > 0 || sellersRes.data.length > 0) {
          OfflineVault.hydrateVault(gamesRes.data as Game[], sellersRes.data as Seller[]);
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

  // OPTIMISTIC CRUD OPERATIONS: Write local in 0ms, enqueue sync in background
  const addGame = useCallback(
    (game: Game): Game => {
      const saved = OfflineVault.addGame(game);
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
      const saved = OfflineVault.addSeller(seller);
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

  const clearLocalVault = useCallback(() => {
    OfflineVault.clearVault();
    SyncQueue.clearQueue();
    refreshData();
  }, [refreshData]);

  const value = useMemo(
    () => ({
      games,
      sellers,
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
      refreshData,
      pullFromCloud,
      clearLocalVault,
    }),
    [
      games,
      sellers,
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
      refreshData,
      pullFromCloud,
      clearLocalVault,
    ]
  );

  return <VaultSyncContext.Provider value={value}>{children}</VaultSyncContext.Provider>;
}

const DEFAULT_SYNC_FALLBACK: VaultSyncContextType = {
  games: [],
  sellers: [],
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
  refreshData: () => {},
  pullFromCloud: async () => false,
  clearLocalVault: () => {},
};

export function useVaultSync() {
  const context = useContext(VaultSyncContext);
  return context ?? DEFAULT_SYNC_FALLBACK;
}

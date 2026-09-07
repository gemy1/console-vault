import AsyncStorage from '@react-native-async-storage/async-storage';
import { Game, Seller } from '../types/vault';
import { getDatabase, wipeDatabase } from './database/db';
import { GameRepository } from './database/gameRepository';
import { SellerRepository } from './database/sellerRepository';

export * from './database';

// In-memory cache that provides instant, synchronous availability
const memoryCache = new Map<string, string>();
let isHydrated = false;
const hydrationCallbacks = new Set<() => void>();

// Keys
const GAMES_STORAGE_KEY = 'vault_cached_games_v1';
const SELLERS_STORAGE_KEY = 'vault_cached_sellers_v1';

// In-memory indexing layer for high scale (10,000+ items with O(1) lookups)
let memoryGames: Game[] | null = null;
let memorySellers: Seller[] | null = null;
const gamesMap = new Map<string, Game>();
const sellersMap = new Map<string, Seller>();

function rebuildGamesIndex(games: Game[]) {
  memoryGames = games;
  gamesMap.clear();
  for (let i = 0; i < games.length; i++) {
    gamesMap.set(games[i].id, games[i]);
  }
}

function rebuildSellersIndex(sellers: Seller[]) {
  memorySellers = sellers;
  sellersMap.clear();
  for (let i = 0; i < sellers.length; i++) {
    sellersMap.set(sellers[i].id, sellers[i]);
  }
}

// Immediately hydrate from SQLite database, with automatic migration from AsyncStorage
const hydrationPromise = (async () => {
  try {
    // 1. Initialize SQLite Database & Tables
    try {
      await getDatabase();
      const [sqliteGames, sqliteSellers] = await Promise.all([
        GameRepository.getAll(),
        SellerRepository.getAll(),
      ]);

      if (sqliteGames.length > 0) {
        rebuildGamesIndex(sqliteGames);
        memoryCache.set(GAMES_STORAGE_KEY, JSON.stringify(sqliteGames));
      }
      if (sqliteSellers.length > 0) {
        rebuildSellersIndex(sqliteSellers);
        memoryCache.set(SELLERS_STORAGE_KEY, JSON.stringify(sqliteSellers));
      }
    } catch (e) {
      console.warn('[VaultStorage] SQLite init note:', e);
    }

    // 2. Hydrate from AsyncStorage / LocalStorage (for app settings like theme & language)
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          const val = window.localStorage.getItem(key);
          if (val !== null && !memoryCache.has(key)) {
            memoryCache.set(key, val);
          }
        }
      }
    } else {
      const keys = await AsyncStorage.getAllKeys();
      if (keys && keys.length > 0) {
        const pairs = await AsyncStorage.multiGet(keys);
        pairs.forEach(([k, v]) => {
          if (v !== null && !memoryCache.has(k)) {
            memoryCache.set(k, v);
          }
        });
      }
    }

    // 3. Data Migration: If SQLite was empty but AsyncStorage had existing items, migrate to SQLite!
    const currentGames = memoryGames as Game[] | null;
    if ((currentGames === null || currentGames.length === 0) && memoryCache.has(GAMES_STORAGE_KEY)) {
      try {
        const legacyGames: Game[] = JSON.parse(memoryCache.get(GAMES_STORAGE_KEY)!);
        if (legacyGames && legacyGames.length > 0) {
          rebuildGamesIndex(legacyGames);
          GameRepository.bulkUpsert(legacyGames).catch(() => {});
        }
      } catch {}
    }

    const currentSellers = memorySellers as Seller[] | null;
    if ((currentSellers === null || currentSellers.length === 0) && memoryCache.has(SELLERS_STORAGE_KEY)) {
      try {
        const legacySellers: Seller[] = JSON.parse(memoryCache.get(SELLERS_STORAGE_KEY)!);
        if (legacySellers && legacySellers.length > 0) {
          rebuildSellersIndex(legacySellers);
          SellerRepository.bulkUpsert(legacySellers).catch(() => {});
        }
      } catch {}
    }
  } catch (err) {
    console.warn('[VaultStorage] Hydration error:', err);
  } finally {
    isHydrated = true;
    hydrationCallbacks.forEach((cb) => {
      try { cb(); } catch {}
    });
    hydrationCallbacks.clear();
  }
})();

export const VaultStorage = {
  isHydrated: (): boolean => isHydrated,

  waitForHydration: async (): Promise<void> => {
    if (isHydrated) return;
    await Promise.race([
      hydrationPromise,
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);
  },

  onHydrated: (callback: () => void): (() => void) => {
    if (isHydrated) {
      callback();
      return () => {};
    }
    hydrationCallbacks.add(callback);
    return () => {
      hydrationCallbacks.delete(callback);
    };
  },

  getItem: (key: string): string | null => {
    if (memoryCache.has(key)) {
      return memoryCache.get(key) || null;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const val = window.localStorage.getItem(key);
        if (val !== null) {
          memoryCache.set(key, val);
          return val;
        }
      } catch {}
    }
    return null;
  },

  setItem: (key: string, value: string): void => {
    memoryCache.set(key, value);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
      } catch {}
    }
    AsyncStorage.setItem(key, value).catch((err) => {
      console.warn('[VaultStorage] AsyncStorage.setItem failed for ' + key, err);
    });
  },

  setItemAsync: async (key: string, value: string): Promise<void> => {
    memoryCache.set(key, value);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
      } catch {}
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch (err) {
      console.warn('[VaultStorage] AsyncStorage.setItemAsync failed for ' + key, err);
    }
  },

  removeItem: (key: string): void => {
    memoryCache.delete(key);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    }
    AsyncStorage.removeItem(key).catch(() => {});
  },

  removeItemAsync: async (key: string): Promise<void> => {
    memoryCache.delete(key);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

export const OfflineVault = {
  getGames: (): Game[] => {
    if (memoryGames !== null) return memoryGames;
    try {
      const raw = VaultStorage.getItem(GAMES_STORAGE_KEY);
      if (raw) {
        const parsed: Game[] = JSON.parse(raw);
        rebuildGamesIndex(parsed);
        return parsed;
      }
    } catch {}
    if (isHydrated) {
      rebuildGamesIndex([]);
      return [];
    }
    return [];
  },

  getGameById: (id: string): Game | undefined => {
    if (memoryGames === null) OfflineVault.getGames();
    return gamesMap.get(id);
  },

  saveGames: (games: Game[]): void => {
    rebuildGamesIndex(games);
    VaultStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(games));
    // Persist to SQLite
    GameRepository.bulkUpsert(games).catch((err) => {
      console.warn('[SQLite] bulkUpsert games failed:', err);
    });
  },

  saveGamesAsync: async (games: Game[]): Promise<void> => {
    rebuildGamesIndex(games);
    await VaultStorage.setItemAsync(GAMES_STORAGE_KEY, JSON.stringify(games));
    await GameRepository.bulkUpsert(games);
  },

  addGame: (game: Game): Game => {
    const games = OfflineVault.getGames();
    const updated = [game, ...games.filter((g) => g.id !== game.id)];
    OfflineVault.saveGames(updated);
    // Fast O(1) row insert in SQLite
    GameRepository.upsert(game).catch((err) => {
      console.warn('[SQLite] addGame error:', err);
    });
    return game;
  },

  addGameAsync: async (game: Game): Promise<Game> => {
    const games = OfflineVault.getGames();
    const updated = [game, ...games.filter((g) => g.id !== game.id)];
    await OfflineVault.saveGamesAsync(updated);
    await GameRepository.upsert(game);
    return game;
  },

  updateGame: (id: string, partial: Partial<Game>): Game | null => {
    const games = OfflineVault.getGames();
    const index = games.findIndex((g) => g.id === id);
    if (index === -1) return null;
    const updatedGame = { ...games[index], ...partial, updated_at: new Date().toISOString() };
    games[index] = updatedGame;
    OfflineVault.saveGames(games);
    // Surgical SQLite row update
    GameRepository.update(id, partial).catch((err) => {
      console.warn('[SQLite] updateGame error:', err);
    });
    return updatedGame;
  },

  deleteGame: (id: string): boolean => {
    const games = OfflineVault.getGames();
    const filtered = games.filter((g) => g.id !== id);
    OfflineVault.saveGames(filtered);
    // Native SQLite row delete
    GameRepository.delete(id).catch((err) => {
      console.warn('[SQLite] deleteGame error:', err);
    });
    return true;
  },

  getSellers: (): Seller[] => {
    if (memorySellers !== null) return memorySellers;
    try {
      const raw = VaultStorage.getItem(SELLERS_STORAGE_KEY);
      if (raw) {
        const parsed: Seller[] = JSON.parse(raw);
        rebuildSellersIndex(parsed);
        return parsed;
      }
    } catch {}
    if (isHydrated) {
      rebuildSellersIndex([]);
      return [];
    }
    return [];
  },

  getSellerById: (id: string): Seller | undefined => {
    if (memorySellers === null) OfflineVault.getSellers();
    return sellersMap.get(id);
  },

  saveSellers: (sellers: Seller[]): void => {
    rebuildSellersIndex(sellers);
    VaultStorage.setItem(SELLERS_STORAGE_KEY, JSON.stringify(sellers));
    SellerRepository.bulkUpsert(sellers).catch((err) => {
      console.warn('[SQLite] bulkUpsert sellers failed:', err);
    });
  },

  addSeller: (seller: Seller): Seller => {
    const sellers = OfflineVault.getSellers();
    const updated = [seller, ...sellers.filter((s) => s.id !== seller.id)];
    OfflineVault.saveSellers(updated);
    SellerRepository.upsert(seller).catch((err) => {
      console.warn('[SQLite] addSeller error:', err);
    });
    return seller;
  },

  updateSeller: (id: string, partial: Partial<Seller>): Seller | null => {
    const sellers = OfflineVault.getSellers();
    const index = sellers.findIndex((s) => s.id === id);
    if (index === -1) return null;
    const updatedSeller = { ...sellers[index], ...partial, updated_at: new Date().toISOString() };
    sellers[index] = updatedSeller;
    OfflineVault.saveSellers(sellers);
    SellerRepository.update(id, partial).catch((err) => {
      console.warn('[SQLite] updateSeller error:', err);
    });
    return updatedSeller;
  },

  deleteSeller: (id: string): boolean => {
    const sellers = OfflineVault.getSellers();
    const filtered = sellers.filter((s) => s.id !== id);
    OfflineVault.saveSellers(filtered);

    // Unlink deleted seller from any games that referenced it
    const games = OfflineVault.getGames();
    let hasLinkedGames = false;
    const updatedGames = games.map((g) => {
      if (g.seller_id === id) {
        hasLinkedGames = true;
        return { ...g, seller_id: undefined };
      }
      return g;
    });
    if (hasLinkedGames) {
      OfflineVault.saveGames(updatedGames);
      getDatabase()
        .then(async (db) => {
          await db.runAsync(`UPDATE games SET seller_id = NULL WHERE seller_id = ?;`, [id]);
        })
        .catch(() => {});
    }

    SellerRepository.delete(id).catch((err) => {
      console.warn('[SQLite] deleteSeller error:', err);
    });
    return true;
  },

  hydrateVault: (games: Game[], sellers: Seller[]): void => {
    OfflineVault.saveGames(games);
    OfflineVault.saveSellers(sellers);
    GameRepository.bulkUpsert(games).catch(() => {});
    SellerRepository.bulkUpsert(sellers).catch(() => {});
  },

  clearVault: (): void => {
    memoryGames = [];
    memorySellers = [];
    gamesMap.clear();
    sellersMap.clear();
    VaultStorage.removeItem(GAMES_STORAGE_KEY);
    VaultStorage.removeItem(SELLERS_STORAGE_KEY);
    wipeDatabase().catch(() => {});
  },

  resetToInitial: (): void => {
    OfflineVault.clearVault();
  },
};

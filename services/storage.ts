import AsyncStorage from '@react-native-async-storage/async-storage';
import { Game, Seller } from '../types/vault';

// In-memory cache that provides instant, synchronous availability
const memoryCache = new Map<string, string>();

// Immediately hydrate memoryCache from window.localStorage on web
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        const val = window.localStorage.getItem(key);
        if (val !== null) {
          memoryCache.set(key, val);
        }
      }
    }
  } catch {}
} else {
  // Asynchronous hydration fallback for React Native environments
  try {
    AsyncStorage.getAllKeys().then((keys) => {
      return AsyncStorage.multiGet(keys).then((pairs) => {
        pairs.forEach(([k, v]) => {
          if (v !== null && !memoryCache.has(k)) {
            memoryCache.set(k, v);
          }
        });
      });
    }).catch(() => {});
  } catch {}
}

export const VaultStorage = {
  getItem: (key: string): string | null => {
    // 1. Check in-memory cache
    if (memoryCache.has(key)) {
      return memoryCache.get(key) || null;
    }
    // 2. Check window.localStorage
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
    try {
      AsyncStorage.setItem(key, value).catch(() => {});
    } catch {}
  },
  removeItem: (key: string): void => {
    memoryCache.delete(key);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    }
    try {
      AsyncStorage.removeItem(key).catch(() => {});
    } catch {}
  },
};

// Keys
const GAMES_STORAGE_KEY = 'vault_cached_games_v1';
const SELLERS_STORAGE_KEY = 'vault_cached_sellers_v1';

// Initial Mock Data (Guarantees app looks premium and works immediately)
const INITIAL_SELLERS: Seller[] = [
  {
    id: 's-1',
    user_id: 'user-demo',
    name: 'PlayStation Elite Deals',
    contact_platform: 'WhatsApp',
    contact_link: '+12025550192',
    contact_methods: [
      { id: 'cm-1-1', platform: 'WhatsApp', value: '+12025550192', label: 'VIP Hotline' },
      { id: 'cm-1-2', platform: 'Facebook', value: 'm.me/ps5elitedeals', label: 'FB Messenger Page' },
    ],
    reputation_score: 4.9,
    notes: 'Warranty response time < 15 mins. Accepts PayPal and Crypto. Replaces revoked accounts within 2 hours.',
  },
  {
    id: 's-2',
    user_id: 'user-demo',
    name: 'DigitalVault PSN Keys',
    contact_platform: 'Telegram',
    contact_link: 'digitalvault_support',
    contact_methods: [
      { id: 'cm-2-1', platform: 'Telegram', value: 'digitalvault_support', label: 'Direct Telegram' },
      { id: 'cm-2-2', platform: 'WhatsApp', value: '+14155552671', label: 'Support WhatsApp' },
    ],
    reputation_score: 4.3,
    notes: 'Fast replacements, sends screenshot proof. Working hours: 10:00 AM - 11:00 PM UTC.',
  },
  {
    id: 's-3',
    user_id: 'user-demo',
    name: 'GameKey Galaxy',
    contact_platform: 'WhatsApp',
    contact_link: '+447911123456',
    contact_methods: [
      { id: 'cm-3-1', platform: 'WhatsApp', value: '+447911123456', label: 'UK WhatsApp' },
      { id: 'cm-3-2', platform: 'Facebook', value: 'facebook.com/gamekeygalaxy', label: 'Official Facebook' },
      { id: 'cm-3-3', platform: 'Discord', value: 'GameKeyGalaxy#9901', label: 'Discord Server' },
    ],
    reputation_score: 4.7,
    notes: '12-month full primary warranties. Offers discount codes on 3rd purchase.',
  }
];

const INITIAL_GAMES: Game[] = [
  {
    id: 'g-1',
    user_id: 'user-demo',
    seller_id: 's-1',
    title: "Marvel's Spider-Man 2",
    cover_image_url: 'https://image.api.playstation.com/vulcan/ap/rnd/202306/1219/1c7b75d8ed9271516546560d219ad0b22ee0a263b4537bd8.png',
    account_type: 'Primary',
    status: 'Active',
    purchase_date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    warranty_months: 12,
    psn_email: 'spidey.vault.buyer@gmail.com',
    psn_password: 'WebSlinger#2024!',
    backup_codes: ['12345678', '87654321', '11223344'],
    notes: 'Activated as primary on PS5 console in living room.',
  },
  {
    id: 'g-2',
    user_id: 'user-demo',
    seller_id: 's-1',
    title: 'God of War Ragnarök',
    cover_image_url: 'https://image.api.playstation.com/vulcan/ap/rnd/202207/1210/4xJ8XB3bi888QTLZYdl7Oi0s.png',
    account_type: 'Secondary',
    status: 'Locked', // LOCKED TRIGGER FOR PADLOCK PROTOCOL
    purchase_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    warranty_months: 6,
    psn_email: 'kratos.norse.games@gmail.com',
    psn_password: 'LeviathanAxe#99',
    backup_codes: ['44556677'],
    notes: 'License revoked yesterday. Padlock icon showing on dashboard.',
  },
  {
    id: 'g-3',
    user_id: 'user-demo',
    seller_id: 's-2',
    title: 'Elden Ring: Shadow of the Erdtree',
    cover_image_url: 'https://image.api.playstation.com/vulcan/ap/rnd/202402/1911/c90e66bc28c9b357608ce0eaecadbeae9e29f8f41399ea5c.png',
    account_type: 'Primary',
    status: 'Active',
    purchase_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    warranty_months: 6,
    psn_email: 'tarnished.erdtree@outlook.com',
    psn_password: 'GraceFound#777',
    backup_codes: ['99887766', '33221100'],
    notes: 'DLC Edition included.',
  },
  {
    id: 'g-4',
    user_id: 'user-demo',
    seller_id: 's-3',
    title: 'Grand Theft Auto V: Enhanced',
    cover_image_url: 'https://image.api.playstation.com/vulcan/ap/rnd/202202/2816/mYnWe5Fi1Y2Q65n9G2p1qf9n.png',
    account_type: 'Secondary',
    status: 'In Resolution',
    purchase_date: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    warranty_months: 3,
    psn_email: 'los.santos.heist@yahoo.com',
    psn_password: 'TrevorPhilips#42',
    backup_codes: ['66554433'],
    notes: 'Seller provided ticket #9821.',
  },
];

// Seed cache initially
if (!VaultStorage.getItem(GAMES_STORAGE_KEY)) {
  VaultStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(INITIAL_GAMES));
}
if (!VaultStorage.getItem(SELLERS_STORAGE_KEY)) {
  VaultStorage.setItem(SELLERS_STORAGE_KEY, JSON.stringify(INITIAL_SELLERS));
}

export const OfflineVault = {
  getGames: (): Game[] => {
    try {
      const raw = VaultStorage.getItem(GAMES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : INITIAL_GAMES;
    } catch {
      return INITIAL_GAMES;
    }
  },
  saveGames: (games: Game[]): void => {
    VaultStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(games));
  },
  addGame: (game: Game): Game => {
    const games = OfflineVault.getGames();
    const updated = [game, ...games];
    OfflineVault.saveGames(updated);
    return game;
  },
  updateGame: (id: string, partial: Partial<Game>): Game | null => {
    const games = OfflineVault.getGames();
    const index = games.findIndex((g) => g.id === id);
    if (index === -1) return null;
    const updatedGame = { ...games[index], ...partial, updated_at: new Date().toISOString() };
    games[index] = updatedGame;
    OfflineVault.saveGames(games);
    return updatedGame;
  },
  getSellers: (): Seller[] => {
    try {
      const raw = VaultStorage.getItem(SELLERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : INITIAL_SELLERS;
    } catch {
      return INITIAL_SELLERS;
    }
  },
  addSeller: (seller: Seller): Seller => {
    const sellers = OfflineVault.getSellers();
    const updated = [seller, ...sellers];
    VaultStorage.setItem(SELLERS_STORAGE_KEY, JSON.stringify(updated));
    return seller;
  },
  updateSeller: (id: string, partial: Partial<Seller>): Seller | null => {
    const sellers = OfflineVault.getSellers();
    const index = sellers.findIndex((s) => s.id === id);
    if (index === -1) return null;
    const updatedSeller = { ...sellers[index], ...partial, updated_at: new Date().toISOString() };
    sellers[index] = updatedSeller;
    VaultStorage.setItem(SELLERS_STORAGE_KEY, JSON.stringify(sellers));
    return updatedSeller;
  },
  deleteSeller: (id: string): boolean => {
    const sellers = OfflineVault.getSellers();
    const filtered = sellers.filter((s) => s.id !== id);
    VaultStorage.setItem(SELLERS_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },
};

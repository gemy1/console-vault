/**
 * SQLite Database Schema & DDL Definitions for Console Vault
 * High-performance indexing for O(1) & O(log N) operations at 10,000+ items scale.
 */

export const CREATE_GAMES_TABLE = `
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  seller_id TEXT,
  title TEXT NOT NULL,
  cover_image_url TEXT,
  account_type TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'PS5',
  status TEXT NOT NULL DEFAULT 'Active',
  purchase_date TEXT NOT NULL,
  warranty_months INTEGER NOT NULL DEFAULT 6,
  psn_email TEXT NOT NULL,
  psn_password TEXT,
  backup_codes TEXT,
  notes TEXT,
  cost_price REAL DEFAULT 0.0,
  currency TEXT DEFAULT 'USD',
  is_inventory INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export const CREATE_SELLERS_TABLE = `
CREATE TABLE IF NOT EXISTS sellers (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_platform TEXT NOT NULL DEFAULT 'WhatsApp',
  contact_link TEXT NOT NULL DEFAULT '',
  contact_methods TEXT,
  reputation_score REAL NOT NULL DEFAULT 5.0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export const CREATE_CLIENTS_TABLE = `
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_platform TEXT NOT NULL DEFAULT 'WhatsApp',
  contact_link TEXT NOT NULL DEFAULT '',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export const CREATE_CLIENT_ALLOCATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS client_allocations (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  slot_type TEXT NOT NULL,
  sale_price REAL DEFAULT 0.0,
  currency TEXT NOT NULL DEFAULT 'USD',
  sale_date TEXT NOT NULL,
  warranty_months INTEGER NOT NULL DEFAULT 6,
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export const CREATE_SYNC_QUEUE_TABLE = `
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  entity TEXT NOT NULL,
  action TEXT NOT NULL,
  payload TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);
`;

export const CREATE_APP_METADATA_TABLE = `
CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

// Performance Indexes
export const CREATE_INDEXES = [
  // Fast status filtering (Active vs Locked vs In Resolution)
  `CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);`,
  // Fast seller relationship lookups
  `CREATE INDEX IF NOT EXISTS idx_games_seller_id ON games(seller_id);`,
  // Fast reverse chronology ordering for Dashboard
  `CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);`,
  // Fast title searching
  `CREATE INDEX IF NOT EXISTS idx_games_title ON games(title COLLATE NOCASE);`,
  // Fast seller inventory query
  `CREATE INDEX IF NOT EXISTS idx_games_is_inventory ON games(is_inventory);`,
  // Fast seller ordering and search
  `CREATE INDEX IF NOT EXISTS idx_sellers_name ON sellers(name COLLATE NOCASE);`,
  `CREATE INDEX IF NOT EXISTS idx_sellers_created_at ON sellers(created_at DESC);`,
  // Fast client queries
  `CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name COLLATE NOCASE);`,
  // Fast allocation lookups
  `CREATE INDEX IF NOT EXISTS idx_allocations_game_id ON client_allocations(game_id);`,
  `CREATE INDEX IF NOT EXISTS idx_allocations_client_id ON client_allocations(client_id);`,
  `CREATE INDEX IF NOT EXISTS idx_allocations_user_id ON client_allocations(user_id);`,
  // FIFO sync queue
  `CREATE INDEX IF NOT EXISTS idx_sync_queue_timestamp ON sync_queue(timestamp ASC);`,
];

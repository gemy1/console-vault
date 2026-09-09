export type GameStatus = 'Active' | 'Locked' | 'In Resolution' | 'Archived' | 'Dead Loss';
export type AccountType = 'Primary' | 'Secondary' | 'Full';
export type ContactPlatform = 'WhatsApp' | 'Telegram' | 'Discord' | 'Facebook' | 'Other';
export type ConsolePlatform = 'PS5' | 'PS4' | 'BOTH';
export type SupportedCurrency = 'USD' | 'EGP' | 'SAR' | 'AED' | 'EUR' | 'GBP';

export type SlotType =
  | 'Primary_PS5'
  | 'Primary_PS4'
  | 'Secondary_PS5'
  | 'Secondary_PS4'
  | 'Secondary'
  | 'Full';

export type AllocationStatus = 'Active' | 'Revoked' | 'Replaced' | 'Expired';

export interface Client {
  id: string;
  user_id: string;
  name: string;
  contact_platform: ContactPlatform;
  contact_link: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ClientAllocation {
  id: string;
  user_id: string;
  game_id: string;
  client_id: string;
  slot_type: SlotType;
  sale_price: number;
  currency: string;
  sale_date: string; // YYYY-MM-DD
  warranty_months: number;
  status: AllocationStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;

  // Joined relations (optional)
  client?: Client;
  game?: Game;
}

export interface SellerContactMethod {
  id: string;
  platform: ContactPlatform;
  value: string; // Phone number, username, URL, or handle
  label?: string; // e.g. 'Main Support', 'Sales', 'Backup'
}

export interface Seller {
  id: string;
  user_id: string;
  name: string;
  contact_platform: ContactPlatform; // Primary platform for backward compatibility
  contact_link: string; // Primary link for backward compatibility
  contact_methods?: SellerContactMethod[]; // Multiple connection methods
  reputation_score: number; // 1.0 - 5.0
  notes?: string; // Free text notes
  created_at?: string;
  updated_at?: string;
}

export interface Game {
  id: string;
  user_id: string;
  seller_id?: string;
  title: string;
  cover_image_url?: string;
  account_type: AccountType;
  platform?: ConsolePlatform; // PS5, PS4, or BOTH
  status: GameStatus;
  purchase_date: string; // YYYY-MM-DD
  warranty_months: number;
  psn_email: string;
  psn_password?: string;
  backup_codes?: string[];
  notes?: string;
  created_at?: string;
  updated_at?: string;

  // Seller Inventory specific fields
  cost_price?: number; // Investment/Purchase price paid by seller
  currency?: string; // USD, EGP, SAR, etc.
  is_inventory?: boolean; // True if this game is part of Seller Inventory, false if personal gamer vault

  // Joined relations (optional)
  seller?: Seller;
  allocations?: ClientAllocation[];
}

export interface WarrantyCalculation {
  isWarrantyActive: boolean;
  isExpiringSoon: boolean; // <= 14 days left
  daysRemaining: number;
  expiryDate: string;
  isLifetime?: boolean;
}

// -----------------------------------------------------------------------------
// SYNC & BACKUP TYPES
// -----------------------------------------------------------------------------
export type SyncStatus = 'local_only' | 'synced' | 'syncing' | 'offline' | 'error';

export interface PendingSyncItem {
  id: string;
  entity: 'game' | 'seller' | 'client' | 'client_allocation';
  action: 'UPSERT' | 'DELETE';
  payload: any;
  timestamp: number;
}


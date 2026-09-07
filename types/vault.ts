export type GameStatus = 'Active' | 'Locked' | 'In Resolution' | 'Archived' | 'Dead Loss';
export type AccountType = 'Primary' | 'Secondary';
export type ContactPlatform = 'WhatsApp' | 'Telegram' | 'Discord' | 'Facebook' | 'Other';

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
  status: GameStatus;
  purchase_date: string; // YYYY-MM-DD
  warranty_months: number;
  psn_email: string;
  psn_password?: string;
  backup_codes?: string[];
  notes?: string;
  created_at?: string;
  updated_at?: string;
  
  // Joined seller relations (optional)
  seller?: Seller;
}

export interface CredentialHistory {
  id: string;
  game_id: string;
  user_id: string;
  previous_email: string;
  previous_password: string;
  previous_backup_codes?: string[];
  replaced_at: string;
  reason: string;
}

export interface WarrantyCalculation {
  isWarrantyActive: boolean;
  isExpiringSoon: boolean; // <= 14 days left
  daysRemaining: number;
  expiryDate: string;
}

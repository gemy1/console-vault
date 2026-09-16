/**
 * Master Vault Backup & Restore Service
 *
 * Implements an all-in-one, zero-knowledge encrypted backup (.vault) and
 * accounting CSV export. Completely offline-capable, requiring zero cloud/Supabase.
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { gcm } from '@noble/ciphers/aes.js';
import {
  deriveMasterKey,
  bytesToBase64,
  base64ToBytes,
  utf8ToBytes,
  bytesToUtf8,
  generateSecureRandomBytes,
} from '../crypto/encryptionService';
import { OfflineVault, VaultStorage } from '../storage';
import { AuditLogService, AuditLogEntry } from '../security/auditLogService';
import { Game, Seller, Client, ClientAllocation, SupportedCurrency } from '../../types/vault';

export const MASTER_BACKUP_PREFIX = 'cvault:v1:';
const BACKUP_PBKDF2_ROUNDS = 5000; // Fast mobile derivation (~200ms)
const BACKUP_SALT_PREFIX = 'console-vault-master-backup-salt:';

export interface MasterBackupPayload {
  format: 'console-vault-master';
  version: 1;
  exported_at: string;
  app_version: string;
  games: Game[];
  sellers: Seller[];
  clients: Client[];
  allocations: ClientAllocation[];
  preferences: {
    persona?: 'gamer' | 'seller';
    currency?: SupportedCurrency;
    theme?: 'dark' | 'light';
    language?: 'en' | 'ar';
  };
  audit_logs: AuditLogEntry[];
}

export const MasterBackupService = {
  /**
   * Generates the encrypted backup payload and envelope.
   */
  generateEncryptedEnvelope: (password: string) => {
    if (!password || password.trim().length === 0) {
      throw new Error('A backup password is required to secure your data.');
    }

    // 1. Gather all local data
    const games = OfflineVault.getGames();
    const sellers = OfflineVault.getSellers();
    const clients = OfflineVault.getClients();
    const allocations = OfflineVault.getAllocations();
    const auditLogs = AuditLogService.getLogs();

    const storedPersona = (VaultStorage.getItem('vault_user_persona_v1') || 'gamer') as 'gamer' | 'seller';
    const storedCurrency = (VaultStorage.getItem('vault_user_currency_v1') || 'USD') as SupportedCurrency;
    const storedTheme = (VaultStorage.getItem('vault_user_theme_v1') || 'dark') as 'dark' | 'light';
    const storedLang = (VaultStorage.getItem('vault_user_language_v1') || 'en') as 'en' | 'ar';

    const payload: MasterBackupPayload = {
      format: 'console-vault-master',
      version: 1,
      exported_at: new Date().toISOString(),
      app_version: '1.0.0',
      games,
      sellers,
      clients,
      allocations,
      preferences: {
        persona: storedPersona,
        currency: storedCurrency,
        theme: storedTheme,
        language: storedLang,
      },
      audit_logs: auditLogs,
    };

    // 2. Derive key from password and fixed application salt
    const salt = `${BACKUP_SALT_PREFIX}universal-v1`;
    const key = deriveMasterKey(password, salt, BACKUP_PBKDF2_ROUNDS);

    // 3. Encrypt payload with AES-256-GCM
    const jsonString = JSON.stringify(payload);
    const nonce = generateSecureRandomBytes(12);
    const cipher = gcm(key, nonce);
    const plainBytes = utf8ToBytes(jsonString);
    const ciphertextWithTag = cipher.encrypt(plainBytes);

    const envelope = `${MASTER_BACKUP_PREFIX}${bytesToBase64(nonce)}:${bytesToBase64(ciphertextWithTag)}`;
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `console-vault-backup-${dateStr}.vault`;

    return { envelope, fileName, gamesCount: games.length, clientsCount: clients.length, allocationsCount: allocations.length };
  },

  /**
   * Saves the encrypted backup directly to Android device storage (Downloads, Documents, etc.)
   * using Android's native Storage Access Framework (SAF).
   */
  saveMasterBackupToDevice: async (password: string): Promise<{ success: boolean; cancelled?: boolean; uri?: string }> => {
    const { envelope, fileName, gamesCount, clientsCount, allocationsCount } =
      MasterBackupService.generateEncryptedEnvelope(password);

    AuditLogService.logEvent(
      'MASTER_BACKUP_EXPORTED',
      `Saved to device: ${gamesCount} games, ${clientsCount} clients, ${allocationsCount} allocations.`
    );

    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([envelope], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
        return { success: true };
      } catch (e) {
        console.warn('Web export download error:', e);
        return { success: false };
      }
    }

    if (Platform.OS === 'android') {
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permissions.granted) {
        return { success: false, cancelled: true };
      }

      const createdUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        fileName,
        'application/octet-stream'
      );

      await FileSystem.writeAsStringAsync(createdUri, envelope, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      return { success: true, uri: createdUri };
    }

    // iOS or other native platforms: write to cache and open native Save to Files share dialog
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, envelope, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/octet-stream',
        dialogTitle: 'Save Console Vault Backup',
        UTI: 'public.data',
      });
    }

    return { success: true, uri: fileUri };
  },

  /**
   * Bundles all data, encrypts it with AES-256-GCM using the provided password,
   * and opens the native OS Share Sheet (Google Drive, WhatsApp, Bluetooth, etc.).
   */
  exportMasterBackupShare: async (password: string): Promise<string> => {
    const { envelope, fileName, gamesCount, clientsCount, allocationsCount } =
      MasterBackupService.generateEncryptedEnvelope(password);

    AuditLogService.logEvent(
      'MASTER_BACKUP_EXPORTED',
      `Shared backup: ${gamesCount} games, ${clientsCount} clients, ${allocationsCount} allocations.`
    );

    if (Platform.OS === 'web') {
      const blob = new Blob([envelope], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      return fileName;
    }

    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, envelope, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/octet-stream',
        dialogTitle: 'Save Console Vault Backup (Google Drive, Files, etc.)',
        UTI: 'public.data',
      });
    }

    return fileUri;
  },

  /**
   * Default export handler (opens native share sheet for Google Drive, etc.)
   */
  exportMasterBackup: async (password: string): Promise<string> => {
    return MasterBackupService.exportMasterBackupShare(password);
  },

  /**
   * Prompts user to pick a backup file from Google Drive / Files app.
   */
  pickBackupFile: async (): Promise<{ uri: string; name: string } | null> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: asset.name || 'backup.vault',
    };
  },

  /**
   * Reads raw file text from any URI (file://, content://, cache, or picked document).
   * Note: In Expo Go on Android, FileSystem.readAsStringAsync rejects DocumentPicker cache files
   * (e.g. 'file:///data/user/0/.../cache/DocumentPicker/...') with "Location isn't readable"
   * because it is outside Expo Go's scoped experience directory.
   * Using React Native's native fetch() and XMLHttpRequest directly accesses the file stream,
   * completely bypassing this sandbox limitation.
   */
  readBackupFileContent: async (fileUri: string): Promise<string> => {
    // Strategy 1: React Native native fetch() (handles file:// and content:// on Android)
    try {
      const response = await fetch(fileUri);
      const text = await response.text();
      if (text && text.trim().length > 0) {
        return text;
      }
    } catch (fetchErr) {
      console.warn('[Restore] fetch failed for fileUri, trying XHR:', fetchErr);
    }

    // Strategy 2: XMLHttpRequest
    try {
      const text = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(xhr.responseText);
        xhr.onerror = (e) => reject(new Error('XHR error'));
        xhr.open('GET', fileUri);
        xhr.send();
      });
      if (text && text.trim().length > 0) {
        return text;
      }
    } catch (xhrErr) {
      console.warn('[Restore] XHR failed for fileUri, trying FileSystem fallback:', xhrErr);
    }

    // Strategy 3: If content:// URI, copy to local cache first
    if (fileUri.startsWith('content://')) {
      const tempCacheFile = `${FileSystem.cacheDirectory}restore-temp-${Date.now()}.vault`;
      try {
        await FileSystem.copyAsync({
          from: fileUri,
          to: tempCacheFile,
        });
        const content = await FileSystem.readAsStringAsync(tempCacheFile, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        try {
          await FileSystem.deleteAsync(tempCacheFile, { idempotent: true });
        } catch {}
        return content;
      } catch (copyErr) {
        console.warn('[Restore] copyAsync failed on content URI:', copyErr);
      }
    }

    // Strategy 4: Direct FileSystem.readAsStringAsync
    return await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  },

  /**
   * Decrypts, validates with 3-layer protection, and restores the backup.
   * Guaranteed fail-safe: existing database is never altered if file or password is invalid.
   */
  restoreMasterBackup: async (
    fileUri: string,
    password: string,
    mode: 'replace' | 'merge' = 'replace'
  ): Promise<{ gamesCount: number; clientsCount: number; allocationsCount: number }> => {
    if (!password || password.trim().length === 0) {
      throw new Error('Please enter the backup password.');
    }

    // 1. Read file content safely across Android content:// and file:// providers
    let rawContent: string;
    try {
      rawContent = await MasterBackupService.readBackupFileContent(fileUri);
    } catch (readErr: any) {
      console.warn('[Restore] Could not read backup file:', readErr);
      throw new Error('COULD_NOT_READ_FILE');
    }

    // Layer 1: Magic Header Check
    const trimmed = rawContent.trim();
    if (!trimmed.startsWith(MASTER_BACKUP_PREFIX)) {
      console.warn('[Restore] Header mismatch. Starts with:', trimmed.slice(0, 30));
      throw new Error('INVALID_FORMAT');
    }

    const payloadString = trimmed.slice(MASTER_BACKUP_PREFIX.length);
    const colonIndex = payloadString.indexOf(':');
    if (colonIndex === -1) {
      console.warn('[Restore] Envelope missing colon separator');
      throw new Error('INVALID_FORMAT');
    }

    const base64Nonce = payloadString.slice(0, colonIndex);
    const base64Cipher = payloadString.slice(colonIndex + 1);

    // Layer 2: AES-256-GCM Cryptographic Decryption & Authentication Tag Check
    const salt = `${BACKUP_SALT_PREFIX}universal-v1`;
    const cleanPassword = password.trim();

    let decryptedText: string | null = null;

    // Try with trimmed password first
    const passwordsToTry = [cleanPassword];
    if (password !== cleanPassword) {
      passwordsToTry.push(password);
    }

    for (const pwd of passwordsToTry) {
      try {
        const key = deriveMasterKey(pwd, salt, BACKUP_PBKDF2_ROUNDS);
        const nonce = base64ToBytes(base64Nonce);
        const ciphertextWithTag = base64ToBytes(base64Cipher);
        const decipher = gcm(key, nonce);
        const decryptedBytes = decipher.decrypt(ciphertextWithTag);
        decryptedText = bytesToUtf8(decryptedBytes);
        if (decryptedText) break;
      } catch (decryptErr) {
        // Continue to try alternative if available
      }
    }

    if (!decryptedText) {
      console.warn('[Restore] AES-GCM MAC validation failed. Password mismatch or corrupted file.');
      throw new Error('INVALID_PASSWORD_OR_CORRUPT');
    }

    // Layer 3: JSON Schema Integrity Check
    let backup: MasterBackupPayload;
    try {
      backup = JSON.parse(decryptedText);
    } catch {
      throw new Error('CORRUPT_JSON');
    }

    if (
      backup.format !== 'console-vault-master' ||
      !Array.isArray(backup.games) ||
      !Array.isArray(backup.sellers) ||
      !Array.isArray(backup.clients) ||
      !Array.isArray(backup.allocations)
    ) {
      throw new Error('INVALID_SCHEMA');
    }

    // 4. Apply data atomically
    if (mode === 'replace') {
      OfflineVault.hydrateVault(
        backup.games,
        backup.sellers,
        backup.clients,
        backup.allocations
      );
    } else {
      // Merge mode: append unique records
      const existingGames = OfflineVault.getGames();
      const existingGameIds = new Set(existingGames.map((g) => g.id));
      const newGames = backup.games.filter((g: Game) => !existingGameIds.has(g.id));

      const existingSellers = OfflineVault.getSellers();
      const existingSellerIds = new Set(existingSellers.map((s) => s.id));
      const newSellers = backup.sellers.filter((s: Seller) => !existingSellerIds.has(s.id));

      const existingClients = OfflineVault.getClients();
      const existingClientIds = new Set(existingClients.map((c) => c.id));
      const newClients = backup.clients.filter((c: Client) => !existingClientIds.has(c.id));

      const existingAllocs = OfflineVault.getAllocations();
      const existingAllocIds = new Set(existingAllocs.map((a) => a.id));
      const newAllocs = backup.allocations.filter((a: ClientAllocation) => !existingAllocIds.has(a.id));

      OfflineVault.hydrateVault(
        [...existingGames, ...newGames],
        [...existingSellers, ...newSellers],
        [...existingClients, ...newClients],
        [...existingAllocs, ...newAllocs]
      );
    }

    // 5. Restore preferences if available
    if (backup.preferences) {
      if (backup.preferences.persona) {
        VaultStorage.setItem('vault_user_persona_v1', backup.preferences.persona);
      }
      if (backup.preferences.currency) {
        VaultStorage.setItem('vault_user_currency_v1', backup.preferences.currency);
      }
    }

    // 6. Log audit event
    AuditLogService.logEvent(
      'MASTER_BACKUP_IMPORTED',
      `Restored backup (${mode}): ${backup.games.length} games, ${backup.clients.length} clients.`
    );

    return {
      gamesCount: backup.games.length,
      clientsCount: backup.clients.length,
      allocationsCount: backup.allocations.length,
    };
  },

  /**
   * Generates a single Excel-ready CSV spreadsheet of all sales and clients.
   * Prepended with UTF-8 BOM (\uFEFF) for perfect Arabic and English rendering in Excel.
   */
  exportBookkeepingCSV: async (): Promise<string> => {
    const allocations = OfflineVault.getAllocations();
    const games = OfflineVault.getGames();
    const clients = OfflineVault.getClients();

    const gamesMap = new Map(games.map((g) => [g.id, g]));
    const clientsMap = new Map(clients.map((c) => [c.id, c]));

    // Header with UTF-8 Byte Order Mark
    const BOM = '\uFEFF';
    const headers = [
      'Sale Date',
      'Client Name',
      'Client Contact',
      'Game Title',
      'Platform',
      'Slot Type',
      'Sale Price',
      'Currency',
      'Status',
      'Warranty Months',
      'Notes',
    ];

    const rows: string[] = [headers.join(',')];

    for (const alloc of allocations) {
      const game = gamesMap.get(alloc.game_id);
      const client = clientsMap.get(alloc.client_id);

      const escapeCSV = (val: any) => {
        if (val === undefined || val === null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const row = [
        escapeCSV(alloc.sale_date || ''),
        escapeCSV(client?.name || alloc.client_id),
        escapeCSV(client?.contact_link || ''),
        escapeCSV(game?.title || alloc.game_id),
        escapeCSV(game?.platform || 'PS5'),
        escapeCSV(alloc.slot_type),
        escapeCSV(alloc.sale_price || 0),
        escapeCSV(alloc.currency || 'USD'),
        escapeCSV(alloc.status || 'Active'),
        escapeCSV(alloc.warranty_months || 0),
        escapeCSV(alloc.notes || ''),
      ];

      rows.push(row.join(','));
    }

    const csvContent = BOM + rows.join('\r\n');
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `console-vault-sales-${dateStr}.csv`;

    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.warn('Web CSV download error:', e);
      }
      return fileName;
    }

    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Sales Spreadsheet (Excel / Google Sheets)',
        UTI: 'public.comma-separated-values-text',
      });
    }

    return fileUri;
  },

  /**
   * Saves the bookkeeping CSV file directly to local device storage via Android SAF.
   */
  saveBookkeepingCSVToDevice: async (): Promise<{ success: boolean; cancelled?: boolean; uri?: string }> => {
    const clients = OfflineVault.getClients();
    const games = OfflineVault.getGames();
    const allocations = OfflineVault.getAllocations();

    const gamesMap = new Map(games.map((g) => [g.id, g]));
    const clientsMap = new Map(clients.map((c) => [c.id, c]));

    const BOM = '\uFEFF';
    const headers = [
      'Sale Date',
      'Client Name',
      'Client Contact',
      'Game Title',
      'Platform',
      'Slot Type',
      'Price',
      'Currency',
      'Status',
      'Warranty Months',
      'Notes',
    ];

    const rows: string[] = [headers.join(',')];

    for (const alloc of allocations) {
      const game = gamesMap.get(alloc.game_id);
      const client = clientsMap.get(alloc.client_id);

      const escapeCSV = (val: any) => {
        if (val === undefined || val === null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const row = [
        escapeCSV(alloc.sale_date || ''),
        escapeCSV(client?.name || alloc.client_id),
        escapeCSV(client?.contact_link || ''),
        escapeCSV(game?.title || alloc.game_id),
        escapeCSV(game?.platform || 'PS5'),
        escapeCSV(alloc.slot_type),
        escapeCSV(alloc.sale_price || 0),
        escapeCSV(alloc.currency || 'USD'),
        escapeCSV(alloc.status || 'Active'),
        escapeCSV(alloc.warranty_months || 0),
        escapeCSV(alloc.notes || ''),
      ];

      rows.push(row.join(','));
    }

    const csvContent = BOM + rows.join('\r\n');
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `console-vault-sales-${dateStr}.csv`;

    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
        return { success: true };
      } catch (e) {
        console.warn('Web CSV download error:', e);
        return { success: false };
      }
    }

    if (Platform.OS === 'android') {
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permissions.granted) {
        return { success: false, cancelled: true };
      }

      const createdUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        fileName,
        'text/csv'
      );

      await FileSystem.writeAsStringAsync(createdUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      return { success: true, uri: createdUri };
    }

    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Save Sales Spreadsheet (Excel / Google Sheets)',
        UTI: 'public.comma-separated-values-text',
      });
    }

    return { success: true, uri: fileUri };
  },

  exportBookkeepingCSVShare: async (): Promise<string> => {
    return MasterBackupService.exportBookkeepingCSV();
  },
};

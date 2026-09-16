/**
 * Vault Key Manager
 *
 * Manages the in-memory active Master Encryption Key (MEK) and its persistence
 * in hardware-backed SecureStore (iOS Keychain / Android Keystore) or sessionStorage on web.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { bytesToBase64, base64ToBytes } from './encryptionService';

const SECURE_KEY_PREFIX = 'vault_sec_mek_v1_';

// In-memory active key (lives only in RAM while app is open)
let activeKey: Uint8Array | null = null;
let activeUserId: string | null = null;

export const VaultKeyManager = {
  /**
   * Sets the active key in RAM memory for instant encryption/decryption.
   */
  setActiveKey: (key: Uint8Array | null, userId?: string | null): void => {
    activeKey = key;
    if (userId !== undefined) {
      activeUserId = userId;
    }
  },

  /**
   * Returns the active key currently held in RAM memory.
   */
  getActiveKey: (): Uint8Array | null => {
    return activeKey;
  },

  /**
   * Checks if an active encryption key is currently available in memory.
   */
  hasActiveKey: (): boolean => {
    return activeKey !== null && activeKey.length === 32;
  },

  /**
   * Returns the user ID associated with the active key.
   */
  getActiveUserId: (): string | null => {
    return activeUserId;
  },

  /**
   * Persists the 256-bit MEK into the device's hardware-backed SecureStore.
   */
  saveKeyToSecureStore: async (userId: string, key: Uint8Array): Promise<void> => {
    activeKey = key;
    activeUserId = userId;
    const keyBase64 = bytesToBase64(key);
    const storeKey = `${SECURE_KEY_PREFIX}${userId}`;

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(storeKey, keyBase64);
        }
      } catch (err) {
        console.warn('[VaultKeyManager] Web sessionStorage write failed:', err);
      }
      return;
    }

    try {
      await SecureStore.setItemAsync(storeKey, keyBase64, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } catch (err) {
      console.warn('[VaultKeyManager] SecureStore setItemAsync error:', err);
    }
  },

  /**
   * Loads the 256-bit MEK from the device's hardware-backed SecureStore.
   */
  loadKeyFromSecureStore: async (userId: string): Promise<Uint8Array | null> => {
    const storeKey = `${SECURE_KEY_PREFIX}${userId}`;

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const raw = window.sessionStorage.getItem(storeKey);
          if (raw) {
            const bytes = base64ToBytes(raw);
            activeKey = bytes;
            activeUserId = userId;
            return bytes;
          }
        }
      } catch {}
      return null;
    }

    try {
      const raw = await SecureStore.getItemAsync(storeKey);
      if (raw) {
        const bytes = base64ToBytes(raw);
        activeKey = bytes;
        activeUserId = userId;
        return bytes;
      }
    } catch (err) {
      console.warn('[VaultKeyManager] SecureStore getItemAsync error:', err);
    }
    return null;
  },

  /**
   * Removes the MEK from memory and hardware-backed SecureStore (e.g. on logout).
   */
  clearKey: async (userId?: string | null): Promise<void> => {
    activeKey = null;
    activeUserId = null;

    const targetUserId = userId || activeUserId;
    if (!targetUserId) return;

    const storeKey = `${SECURE_KEY_PREFIX}${targetUserId}`;

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.removeItem(storeKey);
        }
      } catch {}
      return;
    }

    try {
      await SecureStore.deleteItemAsync(storeKey);
    } catch (err) {
      console.warn('[VaultKeyManager] SecureStore deleteItemAsync error:', err);
    }
  },
};

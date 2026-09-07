---
name: mobile-credential-security
description: >-
  Security implementation for Console Vault: encrypted offline MMKV storage, biometric authentication (FaceID/TouchID), credential concealment guards, and Padlock Protocol seller deep-link generators. Use when dealing with sensitive PSN credentials, local caching, biometrics, or warranty claim generation.
---

# Skill: Mobile Credential Security & Offline Storage

This skill provides implementations for protecting sensitive PSN credentials, offline-first encrypted storage via MMKV, and the automated "Padlock Protocol" warranty claim generator.

---

## 1. Encrypted MMKV Storage + SecureStore Key

To ensure offline availability while safeguarding credentials against extraction:

```typescript
// services/storage.ts
import { MMKV } from 'react-native-mmkv';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';

const ENCRYPTION_KEY_ALIAS = 'console_vault_mmkv_key';

function getOrGenerateKey(): string {
  let key = SecureStore.getItem(ENCRYPTION_KEY_ALIAS);
  if (!key) {
    key = Array.from({ length: 32 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
    SecureStore.setItem(ENCRYPTION_KEY_ALIAS, key);
  }
  return key;
}

export const vaultStorage = new MMKV({
  id: 'console-vault-data',
  encryptionKey: getOrGenerateKey(),
});

// Helper for typed JSON caching
export const Storage = {
  get: <T>(key: string): T | null => {
    const raw = vaultStorage.getString(key);
    return raw ? JSON.parse(raw) : null;
  },
  set: <T>(key: string, value: T): void => {
    vaultStorage.set(key, JSON.stringify(value));
  },
  delete: (key: string): void => {
    vaultStorage.delete(key);
  },
};
```

---

## 2. Biometric Credential Guard

Use `expo-local-authentication` to guard tap-to-reveal for `psn_email`, `psn_password`, and `backup_codes`:

```typescript
// hooks/useBiometricGuard.ts
import { useState, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';

export function useBiometricGuard() {
  const [isUnlocked, setIsUnlocked] = useState(false);

  const requestUnlock = useCallback(async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        // Fallback or grant access if device has no security configured
        setIsUnlocked(true);
        return true;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to view PSN credentials',
        fallbackLabel: 'Use Device Passcode',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsUnlocked(true);
        // Auto-lock credentials after 45 seconds for security
        setTimeout(() => setIsUnlocked(false), 45000);
        return true;
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return false;
      }
    } catch {
      return false;
    }
  }, []);

  const lock = useCallback(() => setIsUnlocked(false), []);

  return { isUnlocked, requestUnlock, lock };
}
```

---

## 3. The "Padlock Protocol" (WhatsApp/Telegram Deep Link)

When a game is locked, calculate warranty expiration and generate the WhatsApp/Telegram message link:

```typescript
// utils/padlockProtocol.ts
import * as Linking from 'expo-linking';

interface GameWarrantyInfo {
  title: string;
  purchaseDate: string; // YYYY-MM-DD
  warrantyMonths: number;
  accountType: 'Primary' | 'Secondary';
  psnEmail: string;
  sellerContact: string; // e.g., '+1234567890' or 'seller_user'
  platform: 'WhatsApp' | 'Telegram';
}

export function calculateWarrantyStatus(purchaseDate: string, warrantyMonths: number) {
  const purchase = new Date(purchaseDate);
  const expiry = new Date(purchase);
  expiry.setMonth(expiry.getMonth() + warrantyMonths);

  const now = new Date();
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    isWarrantyActive: diffDays > 0,
    daysRemaining: Math.max(0, diffDays),
    expiryDate: expiry.toISOString().split('T')[0],
  };
}

export function generatePadlockClaimLink(info: GameWarrantyInfo): string {
  const warranty = calculateWarrantyStatus(info.purchaseDate, info.warrantyMonths);
  const warrantyText = warranty.isWarrantyActive
    ? `✅ ACTIVE (${warranty.daysRemaining} days left, expires ${warranty.expiryDate})`
    : `❌ EXPIRED on ${warranty.expiryDate}`;

  const message = [
    `🚨 *CONSOLE VAULT — WARRANTY CLAIM* 🚨`,
    ``,
    `Hello, the following PS5 account has been revoked/locked:`,
    `• *Game*: ${info.title}`,
    `• *Account Type*: ${info.accountType}`,
    `• *PSN Account*: ${info.psnEmail}`,
    `• *Purchase Date*: ${info.purchaseDate}`,
    `• *Warranty Status*: ${warrantyText}`,
    ``,
    `Please assist with replacement credentials or account restoration. Thank you!`,
  ].join('\n');

  if (info.platform === 'WhatsApp') {
    const cleanPhone = info.sellerContact.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  } else {
    // Telegram
    return `https://t.me/${info.sellerContact}?text=${encodeURIComponent(message)}`;
  }
}
```

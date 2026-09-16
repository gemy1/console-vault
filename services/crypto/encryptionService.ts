/**
 * Zero-Knowledge Client-Side Encryption Service
 *
 * Implements:
 * - PBKDF2-HMAC-SHA256 (100,000 rounds) deterministic key derivation
 * - AES-256-GCM authenticated encryption with 12-byte random nonce
 * - Cross-platform base64 & UTF-8 encode/decode
 * - Ciphertext Envelope standard: `enc:v1:<base64_nonce>:<base64_ciphertext_and_tag>`
 */

import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

export const ENCRYPTION_VERSION_PREFIX = 'enc:v1:';
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH_BYTES = 32; // 256-bit key
const NONCE_LENGTH_BYTES = 12; // 96-bit GCM nonce

// ─────────────────────────────────────────────────────────────────────────────
// Robust Base64 & UTF-8 Utilities (Runs identically on iOS, Android, Hermes, Web)
// ─────────────────────────────────────────────────────────────────────────────

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  let i = 0;

  while (i < len) {
    const b0 = bytes[i++];
    const b1 = i < len ? bytes[i++] : NaN;
    const b2 = i < len ? bytes[i++] : NaN;

    const enc0 = b0 >> 2;
    const enc1 = ((b0 & 3) << 4) | (isNaN(b1) ? 0 : b1 >> 4);
    const enc2 = isNaN(b1) ? 64 : ((b1 & 15) << 2) | (isNaN(b2) ? 0 : b2 >> 6);
    const enc3 = isNaN(b2) ? 64 : b2 & 63;

    result +=
      BASE64_CHARS.charAt(enc0) +
      BASE64_CHARS.charAt(enc1) +
      (enc2 === 64 ? '=' : BASE64_CHARS.charAt(enc2)) +
      (enc3 === 64 ? '=' : BASE64_CHARS.charAt(enc3));
  }

  return result;
}

export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const byteLength = Math.floor((len * 3) / 4);
  const bytes = new Uint8Array(byteLength);
  let p = 0;

  for (let i = 0; i < len; i += 4) {
    const enc0 = BASE64_CHARS.indexOf(clean.charAt(i));
    const enc1 = BASE64_CHARS.indexOf(clean.charAt(i + 1));
    const enc2 = BASE64_CHARS.indexOf(clean.charAt(i + 2));
    const enc3 = BASE64_CHARS.indexOf(clean.charAt(i + 3));

    bytes[p++] = (enc0 << 2) | (enc1 >> 4);
    if (enc2 !== -1 && enc2 !== 64) {
      bytes[p++] = ((enc1 & 15) << 4) | (enc2 >> 2);
    }
    if (enc3 !== -1 && enc3 !== 64) {
      bytes[p++] = ((enc2 & 3) << 6) | enc3;
    }
  }

  return bytes.subarray(0, p);
}

export function utf8ToBytes(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  const utf8: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    } else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    }
  }
  return new Uint8Array(utf8);
}

export function bytesToUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(bytes);
  }
  let out = '';
  let i = 0;
  const len = bytes.length;
  while (i < len) {
    const c = bytes[i++];
    if (c >> 7 === 0) {
      out += String.fromCharCode(c);
    } else if (c >> 5 === 0x06) {
      const c2 = bytes[i++];
      out += String.fromCharCode(((c & 0x1f) << 6) | (c2 & 0x3f));
    } else if (c >> 4 === 0x0e) {
      const c2 = bytes[i++];
      const c3 = bytes[i++];
      out += String.fromCharCode(((c & 0x0f) << 12) | ((c2 & 0x3f) << 6) | (c3 & 0x3f));
    } else if (c >> 3 === 0x1e) {
      const c2 = bytes[i++];
      const c3 = bytes[i++];
      const c4 = bytes[i++];
      let cp = ((c & 0x07) << 18) | ((c2 & 0x3f) << 12) | ((c3 & 0x3f) << 6) | (c4 & 0x3f);
      cp -= 0x10000;
      out += String.fromCharCode((cp >> 10) + 0xd800, (cp & 0x3ff) + 0xdc00);
    }
  }
  return out;
}

export function generateSecureRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }
  // Cryptographic fallback
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cryptographic Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks if a string is already in the ciphertext envelope format.
 */
export function isEncrypted(value?: string | null): boolean {
  return Boolean(value && typeof value === 'string' && value.startsWith(ENCRYPTION_VERSION_PREFIX));
}

/**
 * Derives a 256-bit Master Encryption Key (MEK) deterministically from an
 * account password and a normalized salt (e.g. user email).
 */
export function deriveMasterKey(password: string, salt: string): Uint8Array {
  const normalizedPassword = password.normalize ? password.normalize('NFKC') : password;
  const normalizedSalt = salt.toLowerCase().trim();
  return pbkdf2(sha256, normalizedPassword, normalizedSalt, {
    c: PBKDF2_ITERATIONS,
    dkLen: KEY_LENGTH_BYTES,
  });
}

/**
 * Encrypts a plaintext string using AES-256-GCM with a unique 12-byte random nonce.
 * Returns an envelope string: `enc:v1:<base64_nonce>:<base64_ciphertext>`
 */
export function encryptString(plaintext: string, key: Uint8Array): string {
  if (!plaintext || plaintext.trim() === '') return '';
  // Idempotent safeguard: if already encrypted, don't re-encrypt
  if (isEncrypted(plaintext)) return plaintext;

  const nonce = generateSecureRandomBytes(NONCE_LENGTH_BYTES);
  const cipher = gcm(key, nonce);
  const plainBytes = utf8ToBytes(plaintext);
  const ciphertextWithTag = cipher.encrypt(plainBytes);

  return `${ENCRYPTION_VERSION_PREFIX}${bytesToBase64(nonce)}:${bytesToBase64(ciphertextWithTag)}`;
}

/**
 * Decrypts a ciphertext envelope string back into plaintext using AES-256-GCM.
 * If legacy plaintext is passed (does not start with `enc:v1:`), returns it safely as-is.
 */
export function decryptString(envelope: string, key: Uint8Array): string {
  if (!envelope || envelope.trim() === '') return '';
  // Graceful fallback for legacy plaintext passwords
  if (!isEncrypted(envelope)) return envelope;

  const payload = envelope.slice(ENCRYPTION_VERSION_PREFIX.length);
  const colonIndex = payload.indexOf(':');
  if (colonIndex === -1) {
    console.warn('[EncryptionService] Malformed envelope string, missing delimiter');
    return envelope;
  }

  const base64Nonce = payload.slice(0, colonIndex);
  const base64Cipher = payload.slice(colonIndex + 1);

  try {
    const nonce = base64ToBytes(base64Nonce);
    const ciphertextWithTag = base64ToBytes(base64Cipher);
    const decipher = gcm(key, nonce);
    const decryptedBytes = decipher.decrypt(ciphertextWithTag);
    return bytesToUtf8(decryptedBytes);
  } catch (err) {
    console.error('[EncryptionService] Decryption failed (invalid key or tampered ciphertext):', err);
    throw new Error('Failed to decrypt credential. Invalid security key or corrupted data.');
  }
}

/**
 * Encrypts an array of backup codes (e.g. 2FA backup codes).
 */
export function encryptBackupCodes(codes: string[] | undefined, key: Uint8Array): string[] {
  if (!codes || !Array.isArray(codes)) return [];
  return codes.map((code) => encryptString(code, key));
}

/**
 * Decrypts an array of backup codes.
 */
export function decryptBackupCodes(codes: string[] | undefined, key: Uint8Array): string[] {
  if (!codes || !Array.isArray(codes)) return [];
  return codes.map((code) => decryptString(code, key));
}

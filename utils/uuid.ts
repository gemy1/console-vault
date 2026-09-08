/**
 * Zero-dependency RFC 4122 Compliant UUID v4 Generator & Converter
 * Safe for React Native (Hermes/JSC), Web, and Node.js.
 */

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {}
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isValidUUID(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Converts any string (e.g. "game-1788907669942") into a deterministic,
 * valid RFC 4122 UUID v4 so Supabase PostgreSQL strictly accepts it.
 */
export function toSafeUUID(id: string): string {
  if (isValidUUID(id)) {
    return id;
  }

  // Generate deterministic 32-character hex from input string
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < id.length; i++) {
    const ch = id.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const part3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
  const part4 = ((h1 + h2) >>> 0).toString(16).padStart(8, '0');

  const hex32 = `${part1}${part2}${part3}${part4}`.slice(0, 32);

  return `${hex32.slice(0, 8)}-${hex32.slice(8, 12)}-4${hex32.slice(13, 16)}-8${hex32.slice(17, 20)}-${hex32.slice(20, 32)}`;
}

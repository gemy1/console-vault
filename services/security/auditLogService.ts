/**
 * Security Audit Log Service
 *
 * Persists and manages an append-only local log of sensitive security actions
 * (credential views, clipboard copies, backups, and restores) for accountability.
 */

import { VaultStorage } from '../storage';

const AUDIT_LOG_STORAGE_KEY = 'vault_security_audit_logs_v1';
const MAX_LOG_ENTRIES = 200;

export type AuditAction =
  | 'CREDENTIAL_VIEWED'
  | 'CREDENTIAL_COPIED'
  | 'MASTER_BACKUP_EXPORTED'
  | 'MASTER_BACKUP_IMPORTED'
  | 'SECURITY_LOCK_TRIGGERED'
  | 'VAULT_PURGED';

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  details: string;
  timestamp: string;
}

let inMemoryLogs: AuditLogEntry[] | null = null;

function loadLogs(): AuditLogEntry[] {
  if (inMemoryLogs !== null) {
    return inMemoryLogs;
  }
  try {
    const raw = VaultStorage.getItem(AUDIT_LOG_STORAGE_KEY);
    if (raw) {
      inMemoryLogs = JSON.parse(raw);
      return inMemoryLogs || [];
    }
  } catch (err) {
    console.warn('[AuditLogService] Failed to load logs:', err);
  }
  inMemoryLogs = [];
  return inMemoryLogs;
}

function saveLogs(logs: AuditLogEntry[]): void {
  inMemoryLogs = logs;
  try {
    VaultStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.warn('[AuditLogService] Failed to save logs:', err);
  }
}

export const AuditLogService = {
  /**
   * Records a security event with details and timestamp.
   */
  logEvent: (action: AuditAction, details: string): void => {
    const logs = loadLogs();
    const entry: AuditLogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      action,
      details,
      timestamp: new Date().toISOString(),
    };

    // Prepend (newest first) and truncate to MAX_LOG_ENTRIES
    const updated = [entry, ...logs].slice(0, MAX_LOG_ENTRIES);
    saveLogs(updated);
  },

  /**
   * Returns all recorded audit logs (newest first).
   */
  getLogs: (): AuditLogEntry[] => {
    return [...loadLogs()];
  },

  /**
   * Clears the audit history.
   */
  clearLogs: (): void => {
    saveLogs([]);
  },
};

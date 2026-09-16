/**
 * Vault Crypto Migration Service
 *
 * Scans and migrates local SQLite and in-memory game credentials to AES-256-GCM
 * ciphertext envelopes. Designed to be idempotent, crash-resilient, and non-blocking.
 */

import { OfflineVault, VaultStorage } from '../storage';
import { Game } from '../../types/vault';
import { isEncrypted, encryptString, encryptBackupCodes } from './encryptionService';

export const MIGRATION_FLAG_KEY = 'vault_encryption_migrated_v1';
const BATCH_CHUNK_SIZE = 100;

export const VaultMigration = {
  /**
   * Fast O(1) check to see if local vault encryption migration has already been recorded.
   */
  isMigrationCompleted: (): boolean => {
    return VaultStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
  },

  /**
   * Sets the migration flag in persistent storage.
   */
  setMigrationCompleted: (completed: boolean = true): void => {
    VaultStorage.setItem(MIGRATION_FLAG_KEY, completed ? 'true' : 'false');
  },

  /**
   * Checks whether any game in the local vault currently has unencrypted credentials.
   */
  hasUnencryptedGames: (): boolean => {
    const games = OfflineVault.getGames();
    return games.some((g) => {
      const hasUnencryptedPassword = Boolean(g.psn_password && !isEncrypted(g.psn_password));
      const hasUnencryptedCodes = Boolean(
        g.backup_codes && g.backup_codes.some((c) => !isEncrypted(c))
      );
      return hasUnencryptedPassword || hasUnencryptedCodes;
    });
  },

  /**
   * Migrates all local games to encrypted ciphertext envelopes.
   * Processes asynchronously in micro-batches to guarantee 60/120 FPS UI smoothness.
   */
  migrateLocalGames: async (
    key: Uint8Array,
    onProgress?: (percent: number) => void
  ): Promise<{ total: number; migrated: number }> => {
    const allGames = OfflineVault.getGames();
    const total = allGames.length;

    if (total === 0) {
      VaultMigration.setMigrationCompleted(true);
      onProgress?.(100);
      return { total: 0, migrated: 0 };
    }

    // Identify games needing encryption (Idempotency: skips any game already starting with enc:v1:)
    const gamesToMigrate = allGames.filter((g) => {
      const needsPasswordEnc = Boolean(g.psn_password && !isEncrypted(g.psn_password));
      const needsCodesEnc = Boolean(
        g.backup_codes && g.backup_codes.some((c) => !isEncrypted(c))
      );
      return needsPasswordEnc || needsCodesEnc;
    });

    if (gamesToMigrate.length === 0) {
      VaultMigration.setMigrationCompleted(true);
      onProgress?.(100);
      return { total, migrated: 0 };
    }

    const updatedMap = new Map<string, Game>();
    let processedCount = 0;

    // Process in micro-batches
    for (let i = 0; i < gamesToMigrate.length; i += BATCH_CHUNK_SIZE) {
      const chunk = gamesToMigrate.slice(i, i + BATCH_CHUNK_SIZE);

      for (const game of chunk) {
        const updatedGame: Game = {
          ...game,
          psn_password: game.psn_password ? encryptString(game.psn_password, key) : undefined,
          backup_codes: game.backup_codes ? encryptBackupCodes(game.backup_codes, key) : undefined,
        };
        updatedMap.set(game.id, updatedGame);
        processedCount++;
      }

      if (onProgress) {
        const progress = Math.round((processedCount / gamesToMigrate.length) * 100);
        onProgress(progress);
      }

      // Yield event loop to ensure zero frame drops
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // Merge into complete list and save to SQLite and memory
    const finalGames = allGames.map((g) => updatedMap.get(g.id) || g);
    OfflineVault.saveGames(finalGames);

    // Mark migration completed
    VaultMigration.setMigrationCompleted(true);
    onProgress?.(100);

    return { total, migrated: gamesToMigrate.length };
  },
};

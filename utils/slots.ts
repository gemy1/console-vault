import { AccountType, ConsolePlatform, Game, ClientAllocation, SlotType } from '../types/vault';

/**
 * Returns all potential slots for a game based on its platform and account_type.
 * - Full + BOTH: Primary_PS5, Primary_PS4, Secondary, Full (4 slots)
 * - Full + PS5: Primary_PS5, Secondary, Full (3 slots)
 * - Full + PS4: Primary_PS4, Secondary, Full (3 slots)
 * - Primary + BOTH: Primary_PS5, Primary_PS4 (2 slots)
 * - Primary + PS5: Primary_PS5 (1 slot)
 * - Primary + PS4: Primary_PS4 (1 slot)
 * - Secondary + any: Secondary (1 slot)
 */
export function getGamePotentialSlots(
  platform: ConsolePlatform = 'PS5',
  accountType: AccountType = 'Full'
): SlotType[] {
  if (accountType === 'Full') {
    if (platform === 'BOTH') {
      return ['Primary_PS5', 'Primary_PS4', 'Secondary', 'Full'];
    }
    if (platform === 'PS4') {
      return ['Primary_PS4', 'Secondary', 'Full'];
    }
    return ['Primary_PS5', 'Secondary', 'Full'];
  }

  if (accountType === 'Primary') {
    if (platform === 'BOTH') {
      return ['Primary_PS5', 'Primary_PS4'];
    }
    if (platform === 'PS4') {
      return ['Primary_PS4'];
    }
    return ['Primary_PS5'];
  }

  // Secondary: exactly ONE shared secondary slot regardless of platform
  return ['Secondary'];
}

/**
 * Returns the currently available (unsold) slots for a given game.
 * - If 'Full' account slot is sold, NO slots are available (0).
 * - If any individual slot is sold (e.g. Primary PS5), the account can no longer be sold as 'Full',
 *   and that individual slot is also marked taken.
 * - If excludeAllocationId is passed, that allocation is considered not taken (useful when editing an allocation).
 */
export function getGameAvailableSlots(
  game: Game,
  allocations: ClientAllocation[],
  excludeAllocationId?: string
): SlotType[] {
  const activeAllocs = allocations.filter(
    (a) => a.game_id === game.id && a.status === 'Active' && (!excludeAllocationId || a.id !== excludeAllocationId)
  );

  const potentialSlots = getGamePotentialSlots(game.platform, game.account_type);

  // If a Full account sale is already active, entire game is locked
  const hasFull = activeAllocs.some((a) => a.slot_type === 'Full');
  if (hasFull) {
    return [];
  }

  const takenTypes = new Set(activeAllocs.map((a) => a.slot_type));
  const hasAnyIndividualTaken = takenTypes.size > 0;

  return potentialSlots.filter((slot) => {
    // If already taken, not available
    if (takenTypes.has(slot)) return false;

    // If any individual slot was sold, 'Full' can no longer be sold
    if (slot === 'Full' && hasAnyIndividualTaken) return false;

    return true;
  });
}

/**
 * Determines if a game has no available slots left to sell.
 */
export function isGameSoldOut(
  game: Game,
  allocations: ClientAllocation[]
): boolean {
  return getGameAvailableSlots(game, allocations).length === 0;
}

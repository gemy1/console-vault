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
 * Returns the slots to display for a game based on current allocations.
 * Mutual exclusivity rules:
 * - If 'Full' account is allocated: only 'Full' is displayed (other slots disappear).
 * - If ANY individual slot is allocated: 'Full' disappears (only individual slots are displayed).
 * - If no slots are allocated: all potential slots are displayed.
 *
 * If excludeAllocationId is provided (e.g. editing an existing allocation),
 * that allocation is ignored when calculating exclusivity.
 */
export function getGameDisplaySlots(
  game: Game,
  allocations: ClientAllocation[],
  excludeAllocationId?: string
): SlotType[] {
  const activeAllocs = allocations.filter(
    (a) => a.game_id === game.id && a.status === 'Active' && (!excludeAllocationId || a.id !== excludeAllocationId)
  );

  const potentialSlots = getGamePotentialSlots(game.platform, game.account_type);

  // If Full account is sold, only Full exists (other slots disappear)
  const hasFull = activeAllocs.some((a) => a.slot_type === 'Full');
  if (hasFull) {
    return ['Full'];
  }

  // If any individual slot is sold, Full disappears completely
  const hasAnyIndividualTaken = activeAllocs.some((a) => a.slot_type !== 'Full');
  if (hasAnyIndividualTaken) {
    return potentialSlots.filter((s) => s !== 'Full');
  }

  return potentialSlots;
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

  const displaySlots = getGameDisplaySlots(game, allocations, excludeAllocationId);

  // If a Full account sale is already active, entire game is locked
  const hasFull = activeAllocs.some((a) => a.slot_type === 'Full');
  if (hasFull) {
    return [];
  }

  const takenTypes = new Set(activeAllocs.map((a) => a.slot_type));

  return displaySlots.filter((slot) => !takenTypes.has(slot));
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

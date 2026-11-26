// #region Imports

import { type MobileSnapshot, type MobileTicket } from '@symphony/mobile-contracts';

// #endregion

/**
 * Resolves a ticket only from the current authorized product snapshot.
 *
 * @param snapshot - Fresh scoped mobile snapshot.
 * @param workItemId - Requested product work-item identity.
 * @returns The currently visible ticket.
 * @throws Error when the item no longer belongs to the snapshot scope.
 * @public
 */
export function requireTicket(snapshot: MobileSnapshot, workItemId: string): MobileTicket {
  const ticket = snapshot.tickets.find((candidate) => candidate.id === workItemId);
  if (!ticket) throw new Error('The ticket is no longer available.');
  return ticket;
}

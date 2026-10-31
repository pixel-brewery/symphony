// #region Imports

import { type MobileSnapshot, type MobileTicket } from '@symphony/mobile-contracts';

// #endregion

export function requireTicket(snapshot: MobileSnapshot, workItemId: string): MobileTicket {
  const ticket = snapshot.tickets.find((candidate) => candidate.id === workItemId);
  if (!ticket) throw new Error('The ticket is no longer available.');
  return ticket;
}

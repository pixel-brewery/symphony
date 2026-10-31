// #region Imports

import type { MobileTicket } from '@symphony/mobile-contracts';

// #endregion

/** Whether the desktop currently offers a step on this ticket that a person could start. */
export function hasRunnableAction(ticket: MobileTicket): boolean {
  return ticket.actions.some((action) => !action.blockedReason);
}

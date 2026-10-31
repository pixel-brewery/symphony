// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { MobileExecution, MobileTicket } from '@symphony/mobile-contracts';
import type { IMobileDashboardFocus } from './IMobileDashboardFocus';
import { hasRunnableAction } from './hasRunnableAction';

// #endregion

@Pipe({ name: 'mobileDashboardFocus', standalone: true, pure: true })
export class MobileDashboardFocusPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param execution - Execution.
   * @param ticket - Ticket.
   * @public
   */
  public transform(
    execution: MobileExecution | undefined,
    ticket: MobileTicket | undefined,
  ): IMobileDashboardFocus {
    if (execution) {
      const kind =
        execution.kind === 'analysis'
          ? 'Analysis'
          : execution.kind === 'solution'
            ? 'Solution'
            : 'Revision';
      return {
        ariaLabel: `View active process for ${execution.ticketTitle}`,
        actionLabel: 'View process',
        context: execution.latestProgress ?? `${kind} · ${execution.state}`,
        eyebrow: 'ACTIVE PROCESS',
        queryParams: { execution: execution.id },
        route: ['/processes'],
        title: execution.ticketTitle,
      };
    }
    if (ticket) {
      return {
        ariaLabel: `Open ${ticket.externalId}: ${ticket.title}`,
        actionLabel: hasRunnableAction(ticket) ? 'Continue ticket' : 'View ticket',
        context: `${ticket.externalId} · ${ticket.stateLabel}`,
        eyebrow: hasRunnableAction(ticket) ? 'READY FOR YOU' : 'CURRENT FOCUS',
        route: ['/tickets', ticket.id],
        title: ticket.title,
      };
    }
    return {
      ariaLabel: 'View ticket history',
      actionLabel: 'View tickets',
      context: 'Completed work stays available in your ticket history.',
      eyebrow: 'ALL CAUGHT UP',
      route: ['/tickets'],
      title: 'Your board is clear',
    };
  }

  // #endregion
}

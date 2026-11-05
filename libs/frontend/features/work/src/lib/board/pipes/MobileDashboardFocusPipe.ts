// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { MobileExecution, MobileTicket } from '@symphony/mobile-contracts';
import type { IMobileDashboardFocus } from './IMobileDashboardFocus';
import { hasRunnableAction } from './hasRunnableAction';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

@Pipe({ name: 'mobileDashboardFocus', standalone: true, pure: false })
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
        ariaLabel: translateLabel(
          'loc.symphony.labels.view.active.process.for.6590431',
          execution.ticketTitle,
        ),
        get actionLabel() {
          return translateLabel('loc.symphony.labels.view.process.9b25b3f');
        },
        context: execution.latestProgress ?? `${kind} · ${execution.state}`,
        eyebrow: translateLabel('loc.symphony.labels.active.process.234aeca'),
        queryParams: { execution: execution.id },
        route: ['/processes'],
        title: execution.ticketTitle,
      };
    }
    if (ticket) {
      return {
        ariaLabel: translateLabel(
          'loc.symphony.labels.open.be8e4f6',
          ticket.externalId,
          ticket.title,
        ),
        get actionLabel() {
          return hasRunnableAction(ticket)
            ? translateLabel('loc.symphony.labels.continue.ticket.1a7b7f7')
            : translateLabel('loc.symphony.labels.view.ticket.631ad74');
        },
        context: `${ticket.externalId} · ${ticket.stateLabel}`,
        eyebrow: hasRunnableAction(ticket)
          ? translateLabel('loc.symphony.labels.ready.for.you.c2624e8')
          : translateLabel('loc.symphony.labels.current.focus.75d05f1'),
        route: ['/tickets', ticket.id],
        title: ticket.title,
      };
    }
    return {
      ariaLabel: translateLabel('loc.symphony.labels.view.ticket.history.2b4543d'),
      get actionLabel() {
        return translateLabel('loc.symphony.labels.view.tickets.435a05d');
      },
      context: translateLabel(
        'loc.symphony.labels.completed.work.stays.available.in.your.ticket.histor.46a0436',
      ),
      eyebrow: translateLabel('loc.symphony.labels.all.caught.up.0f20e69'),
      route: ['/tickets'],
      get title() {
        return translateLabel('loc.symphony.labels.your.board.is.clear.24de9fc');
      },
    };
  }

  // #endregion
}

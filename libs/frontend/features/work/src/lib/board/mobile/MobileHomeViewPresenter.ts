// #region Imports

import { computed, inject, Injectable } from '@angular/core';
import { ViewPresenter } from '@symphony/frontend-core/mobile';
import { MobileCompanionStore } from '@symphony/frontend-feature-mobile/browser';
import type { MobileExecution, MobileTicket } from '@symphony/mobile-contracts';
import { hasRunnableAction } from '../pipes/hasRunnableAction';

// #endregion

@Injectable()
export class MobileHomeViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _store = inject(MobileCompanionStore);

  /**
   * The snapshot.
   *
   * @public
   * @readonly
   */
  /** @public */ public readonly connectionState = this._store.connectionState;
  public readonly snapshot = this._store.snapshot;

  /**
   * The tickets.
   *
   * @public
   * @readonly
   */
  public readonly tickets = computed(() => this.snapshot()?.tickets ?? []);

  /**
   * The open ticket count.
   *
   * @public
   * @readonly
   */
  public readonly openTicketCount = computed(
    () => this.tickets().filter((ticket) => !ticket.terminal).length,
  );

  /**
   * The completed ticket count.
   *
   * @public
   * @readonly
   */
  public readonly completedTicketCount = computed(
    () => this.tickets().filter((ticket) => ticket.terminal === true).length,
  );

  /**
   * The total ticket count.
   *
   * @public
   * @readonly
   */
  public readonly totalTicketCount = computed(() => this.tickets().length);

  /**
   * The completion maximum.
   *
   * @public
   * @readonly
   */
  public readonly completionMaximum = computed(() => Math.max(this.totalTicketCount(), 1));

  /**
   * The active executions.
   *
   * @public
   * @readonly
   */
  public readonly activeExecutions = computed(() =>
    (this.snapshot()?.executions ?? []).filter((execution) => this.isActive(execution)),
  );

  /**
   * The focus ticket.
   *
   * @public
   * @readonly
   */
  public readonly focusTicket = computed(() => this.resolveFocusTicket());

  /**
   * The next ticket.
   *
   * @public
   * @readonly
   */
  public readonly nextTicket = computed(() => {
    const focusTicketId = this.focusTicket()?.id;
    return this.tickets().find(
      (ticket) => ticket.id !== focusTicketId && !ticket.terminal && hasRunnableAction(ticket),
    );
  });

  // #endregion

  // #region Methods

  /**
   * The most advanced open ticket. Board columns arrive in process order, so the last column
   * holding an open ticket is the one closest to completion and therefore the one to show.
   */
  private resolveFocusTicket(): MobileTicket | undefined {
    const open = this.tickets().filter((ticket) => !ticket.terminal);
    const columns = this.snapshot()?.boardColumns ?? [];
    for (const column of [...columns].reverse()) {
      const ticket = open.find((candidate) => candidate.boardColumnId === column.id);
      if (ticket) return ticket;
    }
    return open[0];
  }

  private isActive(execution: MobileExecution): boolean {
    return (
      execution.state === 'queued' || execution.state === 'running' || execution.state === 'waiting'
    );
  }

  // #endregion
}

// #region Imports

import { computed, inject, Injectable, signal } from '@angular/core';
import { ViewPresenter, Command } from '@symphony/frontend-core/mobile';
import { MobileCompanionStore } from '@symphony/frontend-feature-mobile/browser';

// #endregion

@Injectable()
export class MobileTicketsViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _store = inject(MobileCompanionStore);

  /**
   * The query.
   *
   * @public
   * @readonly
   */
  public readonly query = signal('');

  /**
   * The tickets.
   *
   * @public
   * @readonly
   */
  public readonly tickets = computed(() => {
    const normalized = this.query().trim().toLocaleLowerCase();
    const tickets = this._store.snapshot()?.tickets ?? [];
    if (!normalized) return tickets;
    return tickets.filter(
      (ticket) =>
        ticket.title.toLocaleLowerCase().includes(normalized) ||
        ticket.externalId.toLocaleLowerCase().includes(normalized),
    );
  });

  private readonly _updateQueryCommand: Command<unknown> = new Command(
    (detail) => void this.onExecuteUpdateQueryCommand(detail),
  );
  private readonly _clearQueryCommand: Command<void> = new Command(
    () => void this.onExecuteClearQueryCommand(),
  );
  // #endregion

  // #region Properties

  /**
   * The updateQuery command.
   *
   * @public
   * @readonly
   */
  public get updateQueryCommand(): Command<unknown> {
    return this._updateQueryCommand;
  }
  /**
   * The clearQuery command.
   *
   * @public
   * @readonly
   */
  public get clearQueryCommand(): Command<void> {
    return this._clearQueryCommand;
  }
  // #endregion

  // #region Methods

  /**
   * Updates the query.
   *
   * @param detail - Detail.
   * @private
   */
  private onExecuteUpdateQueryCommand(detail: unknown): void {
    if (
      typeof detail === 'object' &&
      detail !== null &&
      'query' in detail &&
      typeof detail.query === 'string'
    ) {
      this.query.set(detail.query);
    }
  }

  /**
   * Clears the query.
   *
   * @private
   */
  private onExecuteClearQueryCommand(): void {
    this.query.set('');
  }

  // #endregion
}

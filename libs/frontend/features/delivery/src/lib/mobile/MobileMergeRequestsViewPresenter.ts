// #region Imports

import { computed, inject, Injectable, signal } from '@angular/core';
import { ViewPresenter, Command } from '@symphony/frontend-core/mobile';
import { MobileCompanionStore } from '@symphony/frontend-feature-mobile/browser';

// #endregion

@Injectable()
export class MobileMergeRequestsViewPresenter extends ViewPresenter {
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
   * The all merge requests.
   *
   * @public
   * @readonly
   */
  public readonly allMergeRequests = computed(() => this._store.snapshot()?.mergeRequests ?? []);

  /**
   * The merge requests.
   *
   * @public
   * @readonly
   */
  public readonly mergeRequests = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    const mergeRequests = this.allMergeRequests().toSorted((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
    if (!query) return mergeRequests;
    return mergeRequests.filter(
      (mergeRequest) =>
        mergeRequest.title.toLocaleLowerCase().includes(query) ||
        mergeRequest.author?.toLocaleLowerCase().includes(query) === true ||
        mergeRequest.sourceBranch.toLocaleLowerCase().includes(query) ||
        mergeRequest.targetBranch.toLocaleLowerCase().includes(query) ||
        String(mergeRequest.number).includes(query),
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

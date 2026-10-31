// #region Imports

import { computed, inject, Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ViewPresenter, Command } from '@symphony/frontend-core/mobile';
import { MobileCompanionStore } from '@symphony/frontend-feature-mobile/browser';
import type { MobileExecution, MobileQueueEntry } from '@symphony/mobile-contracts';

// #endregion

@Injectable()
export class MobileProcessesViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _store = inject(MobileCompanionStore);
  private readonly _route = inject(ActivatedRoute);

  /**
   * The loading.
   *
   * @public
   * @readonly
   */
  public readonly loading = this._store.loading;

  /**
   * The highlighted execution ID.
   *
   * @public
   * @readonly
   */
  public readonly highlightedExecutionId = this._route.snapshot.queryParamMap.get('execution');

  /**
   * The active executions.
   *
   * @public
   * @readonly
   */
  public readonly activeExecutions = computed(() =>
    (this._store.snapshot()?.executions ?? []).filter((execution) => this.isActive(execution)),
  );

  /**
   * The recent executions.
   *
   * @public
   * @readonly
   */
  public readonly recentExecutions = computed(() =>
    (this._store.snapshot()?.executions ?? []).filter((execution) => !this.isActive(execution)),
  );

  /**
   * Steps the desktop accepted that are waiting for a free execution slot, in start order.
   *
   * @public
   * @readonly
   */
  public readonly queuedProcesses = computed<readonly MobileQueueEntry[]>(
    () => this._store.snapshot()?.executionQueue ?? [],
  );

  private readonly _removeFromQueueCommand: Command<MobileQueueEntry> = new Command(
    (entry) => void this.onExecuteRemoveFromQueueCommand(entry),
  );
  private readonly _cancelCommand: Command<MobileExecution> = new Command(
    (execution) => void this.onExecuteCancelCommand(execution),
  );
  // #endregion

  // #region Properties

  /**
   * The removeFromQueue command.
   *
   * @public
   * @readonly
   */
  public get removeFromQueueCommand(): Command<MobileQueueEntry> {
    return this._removeFromQueueCommand;
  }
  /**
   * The cancel command.
   *
   * @public
   * @readonly
   */
  public get cancelCommand(): Command<MobileExecution> {
    return this._cancelCommand;
  }
  // #endregion

  // #region Methods

  /**
   * Removes the from queue.
   *
   * @param entry - Entry.
   * @private
   */
  private onExecuteRemoveFromQueueCommand(entry: MobileQueueEntry): void {
    void this._store.runCommand({ action: 'remove-queue-entry', entryId: entry.id });
  }

  /**
   * Cancels.
   *
   * @param execution - Execution.
   * @private
   */
  private onExecuteCancelCommand(execution: MobileExecution): void {
    if (this.isActive(execution)) {
      void this._store.runCommand({ action: 'cancel-execution', executionId: execution.id });
    }
  }

  /**
   * Whether it is active.
   *
   * @param execution - Execution.
   * @private
   */
  private isActive(execution: MobileExecution): boolean {
    return (
      execution.state === 'queued' || execution.state === 'running' || execution.state === 'waiting'
    );
  }

  // #endregion
}

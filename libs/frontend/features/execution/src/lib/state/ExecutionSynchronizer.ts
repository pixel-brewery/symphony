// #region Imports

import { DOCUMENT } from '@angular/common';
import { DestroyRef, Inject, inject, Injectable, type Signal } from '@angular/core';
import type { IExecutionEvent } from '@symphony/domain-execution';
import { EXECUTION_ACTIVITY, type IExecutionActivity } from '@symphony/frontend-core/execution';
import { NotificationService, operatorErrorMessage } from '@symphony/frontend-notification';
import type { IExecutionContext } from '../ports/IExecutionContext';
import type { IExecutionProjection } from '../ports/IExecutionProjection';
import type { IExecutionRefresh } from '../ports/IExecutionRefresh';
import type { IExecutionClient } from '../ports/IExecutionClient';
import type { IExecutionSynchronization } from '../ports/IExecutionSynchronization';
import { EXECUTION_CONTEXT } from '../ports/ExecutionContextToken';
import { EXECUTION_PROJECTION } from '../ports/ExecutionProjectionToken';
import { EXECUTION_REFRESH } from '../ports/ExecutionRefreshToken';
import { EXECUTION_CLIENT } from '../ports/ExecutionClientToken';

// #endregion

/** Owns one execution event subscription, refresh timer and freshness signal per renderer. @public */
@Injectable()
export class ExecutionSynchronizer implements IExecutionSynchronization {
  // #region Fields

  private readonly _window: Window;
  private _unsubscribe?: () => void;
  private _executionStateRefreshTimer?: number;
  private _initialized = false;
  /** Whether the latest execution synchronization succeeded. @public @readonly */
  public readonly activityFresh: Signal<boolean>;

  // #endregion

  // #region Ctor

  /** Connects typed projection ports and the renderer-owned cleanup scope. @public */
  public constructor(
    @Inject(EXECUTION_ACTIVITY)
    private readonly _activity: IExecutionActivity = inject(EXECUTION_ACTIVITY),
    @Inject(EXECUTION_CONTEXT)
    private readonly _context: IExecutionContext = inject(EXECUTION_CONTEXT),
    @Inject(EXECUTION_PROJECTION)
    private readonly _projection: IExecutionProjection = inject(EXECUTION_PROJECTION),
    @Inject(EXECUTION_REFRESH)
    private readonly _refresh: IExecutionRefresh = inject(EXECUTION_REFRESH),
    @Inject(EXECUTION_CLIENT) private readonly _client: IExecutionClient = inject(EXECUTION_CLIENT),
    @Inject(NotificationService)
    private readonly _notifications: Pick<NotificationService, 'showError'> = inject(
      NotificationService,
    ),
    @Inject(DOCUMENT) document: Document = inject(DOCUMENT),
    @Inject(DestroyRef) destroyRef: DestroyRef = inject(DestroyRef),
  ) {
    const browserWindow = document.defaultView;
    if (!browserWindow) throw new Error('Orchestration synchronization requires a browser window.');
    this._window = browserWindow;
    this.activityFresh = _activity.activityFresh;
    destroyRef.onDestroy(() => this.dispose());
  }

  // #endregion

  // #region Methods

  /** Applies transport refresh success or failure to the same execution freshness owner. @public */
  public markActivityFresh(fresh: boolean): void {
    this._activity.markActivityFresh(fresh);
  }

  /**
   * Subscribes to execution events once for this renderer.
   *
   * @public
   */
  public initialize(): void {
    if (this._initialized) return;
    this._initialized = true;
    this._unsubscribe = this._client.onExecutionEvent((event) => {
      this.applyExecutionEvent(event);
      this.scheduleExecutionStateRefresh();
    });
  }

  /**
   * Schedules an execution-state reconciliation after an accepted operation.
   *
   * @param delayMilliseconds - Delay used to coalesce closely related events.
   * @public
   */
  public scheduleExecutionStateRefresh(delayMilliseconds = 500): void {
    if (this._executionStateRefreshTimer !== undefined) {
      this._window.clearTimeout(this._executionStateRefreshTimer);
    }
    this._executionStateRefreshTimer = this._window.setTimeout(() => {
      this._executionStateRefreshTimer = undefined;
      void this.synchronizeExecutionState();
    }, delayMilliseconds);
  }

  private dispose(): void {
    this._unsubscribe?.();
    this._unsubscribe = undefined;
    if (this._executionStateRefreshTimer !== undefined) {
      this._window.clearTimeout(this._executionStateRefreshTimer);
    }
  }

  private async refreshWorkItemOf(executionId: string): Promise<void> {
    const workItemId = this._context
      .projection()
      ?.executions.find((candidate) => candidate.id === executionId)?.workItemId;
    if (!workItemId) return;
    const overtakenRefresh = this._refresh.repeatAfterActiveRefresh();
    try {
      const workItem = await this._client.request('work-items.detail', { workItemId });
      this._projection.update((snapshot) =>
        snapshot
          ? {
              ...snapshot,
              workItems: snapshot.workItems.map((candidate) =>
                candidate.id === workItem.id ? workItem : candidate,
              ),
            }
          : snapshot,
      );
    } catch (cause) {
      this.showError(cause, 'Unable to load work-item details.');
    } finally {
      overtakenRefresh();
    }
  }

  private applyExecutionEvent(event: IExecutionEvent): void {
    this._projection.update((snapshot) => {
      if (!snapshot || snapshot.events.some((candidate) => candidate.id === event.id)) {
        return snapshot;
      }
      const terminalState =
        event.kind === 'analysis.completed' || event.kind === 'solution.completed'
          ? ('succeeded' as const)
          : event.kind === 'execution.failed'
            ? ('failed' as const)
            : event.kind === 'execution.cancelled'
              ? ('cancelled' as const)
              : undefined;
      const execution = snapshot.executions.find((candidate) => candidate.id === event.executionId);
      return {
        ...snapshot,
        events: [...snapshot.events, event].sort((left, right) => left.sequence - right.sequence),
        executions:
          terminalState && execution
            ? snapshot.executions.map((candidate) =>
                candidate.id === event.executionId
                  ? {
                      ...candidate,
                      state: terminalState,
                      finishedAt: event.occurredAt,
                      ...(terminalState === 'succeeded'
                        ? { summary: event.message, error: undefined }
                        : terminalState === 'failed'
                          ? { error: event.message, summary: undefined }
                          : { error: undefined, summary: undefined }),
                    }
                  : candidate,
              )
            : snapshot.executions,
      };
    });
    if (
      event.kind === 'execution.started' ||
      event.kind === 'solution.started' ||
      event.kind === 'analysis.completed' ||
      event.kind === 'solution.completed'
    ) {
      void this.refreshWorkItemOf(event.executionId);
    }
  }

  private async synchronizeExecutionState(): Promise<void> {
    try {
      const executionState = await this._client.request('execution-state.get', {});
      this._activity.markActivityFresh(true);
      this._projection.update((snapshot) =>
        snapshot ? { ...snapshot, ...executionState } : snapshot,
      );
      if (
        executionState.executionQueue.length ||
        executionState.executions.some(
          (execution) =>
            (execution.state === 'queued' ||
              execution.state === 'running' ||
              execution.state === 'waiting') &&
            execution.pause === undefined,
        )
      ) {
        this.scheduleExecutionStateRefresh(2_000);
      }
    } catch (cause) {
      this._activity.markActivityFresh(false);
      this.showError(cause, 'Unable to synchronize execution state.');
    }
  }

  private showError(cause: unknown, fallback: string): void {
    this._notifications.showError(fallback, operatorErrorMessage(cause));
  }

  // #endregion
}

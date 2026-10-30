// #region Imports

import { DOCUMENT } from '@angular/common';
import { effect, Inject, inject, Injectable, Optional } from '@angular/core';
import type { IOrchestrationSnapshot } from '@symphony/ipc-contracts-composition';
import type { IWorkSelection } from './IWorkSelection';
import { WORK_SELECTION } from './WorkSelectionToken';
import { OrchestrationOperation } from './OrchestrationOperation';
import type { IExecutionActivity } from './IExecutionActivity';
import { EXECUTION_ACTIVITY } from './ExecutionActivityToken';

// #endregion

/** Synchronizes event-driven orchestration state and bounded provider refreshes. */
@Injectable({ providedIn: 'root' })
export class OrchestrationSynchronizer extends OrchestrationOperation {
  // #region Fields

  private readonly _workSelection: IWorkSelection | null;
  private readonly _executionActivity: IExecutionActivity | null;
  private readonly _window: Window;
  private _refreshInFlight?: Promise<void>;
  private _refreshRequested = false;
  private _refreshForceRequested = false;

  // #endregion

  // #region Ctor

  /**
   * Constructs the synchronizer for the active renderer window.
   *
   * @public
   */
  public constructor(
    @Optional()
    @Inject(EXECUTION_ACTIVITY)
    executionActivity: IExecutionActivity | null = inject(EXECUTION_ACTIVITY, { optional: true }),
    @Optional()
    @Inject(WORK_SELECTION)
    workSelection: IWorkSelection | null = inject(WORK_SELECTION, { optional: true }),
    @Inject(DOCUMENT)
    document: Document = inject(DOCUMENT),
  ) {
    super();
    this._workSelection = workSelection;
    this._executionActivity = executionActivity;
    const browserWindow = document.defaultView;
    if (!browserWindow) throw new Error('Orchestration synchronization requires a browser window.');
    this._window = browserWindow;

    effect((cleanup) => {
      const intervalMinutes = this._state.settings()?.runtime.boardRefreshIntervalMinutes ?? 15;
      const timer = this._window.setInterval(
        () => void this.refresh(),
        Math.max(15, intervalMinutes) * 60_000,
      );
      cleanup(() => this._window.clearInterval(timer));
    });
  }

  /**
   * Refreshes the provider snapshot while coalescing concurrent requests.
   *
   * @param force - Whether providers should be queried instead of the local cache.
   * @returns The active refresh operation.
   * @public
   */
  public refresh(force = true): Promise<void> {
    if (this._refreshInFlight) {
      this._refreshRequested = true;
      this._refreshForceRequested ||= force;
      return this._refreshInFlight;
    }
    this._refreshInFlight = this.drainSnapshotRefreshes(force);
    return this._refreshInFlight;
  }

  /**
   * Captures whether a snapshot refresh can overtake a local mutation.
   *
   * @returns A callback that repeats the refresh only when one was already active.
   * @public
   */
  public repeatAfterActiveRefresh(): () => void {
    return this._refreshInFlight ? () => void this.refresh() : () => undefined;
  }

  /**
   * Applies a cached snapshot only while the requested workspace remains active.
   *
   * @param workspaceId - Workspace selected when the read began.
   * @public
   */
  public async loadCachedSnapshotForWorkspace(workspaceId: string): Promise<void> {
    try {
      const snapshot = await this._client.request('snapshot.get', {});
      if (this._state.settings()?.activeViewScope.workspaceIds[0] === workspaceId) {
        this.applySnapshot(snapshot);
      }
    } catch {
      // A missing cache is normal; the forced provider refresh owns visible failures.
    }
  }

  private async drainSnapshotRefreshes(force: boolean): Promise<void> {
    let forceNext = force;
    try {
      do {
        this._refreshRequested = false;
        this._refreshForceRequested = false;
        try {
          const requestedScope = this.activeViewScopeKey();
          const snapshot = await this._client.request(
            forceNext ? 'snapshot.refresh' : 'snapshot.get',
            {},
          );
          if (requestedScope === this.activeViewScopeKey()) {
            this.applySnapshot(snapshot);
          } else {
            this._refreshRequested = true;
            this._refreshForceRequested ||= forceNext;
          }
        } catch (cause) {
          this._executionActivity?.markActivityFresh(false);
          this.showError(cause, 'Unable to load orchestration state.');
        } finally {
          this._state.loading.set(false);
        }
        forceNext = this._refreshForceRequested;
      } while (this._refreshRequested);
    } finally {
      this._refreshInFlight = undefined;
    }
  }

  private applySnapshot(snapshot: IOrchestrationSnapshot): void {
    this._executionActivity?.markActivityFresh(true);
    this._state.snapshot.set(snapshot);
    this._workSelection?.ensureDefault(snapshot.workItems[0]?.id);
  }

  private activeViewScopeKey(): string {
    return (this._state.settings()?.activeViewScope.workspaceIds ?? []).join('\u0000');
  }

  // #endregion
}

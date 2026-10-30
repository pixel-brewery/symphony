// #region Imports

import { Inject, inject, Injectable } from '@angular/core';
import { OrchestrationState } from './OrchestrationState';

// #endregion

/** Read-only transport and configured-scope projections shared by feature-owned contexts. @public */
@Injectable({ providedIn: 'root' })
export class ApplicationProjection {
  // #region Ctor

  /** Connects the one snapshot and settings owner without constructing feature operations. @public */
  public constructor(
    @Inject(OrchestrationState)
    private readonly _state: OrchestrationState = inject(OrchestrationState),
  ) {}

  // #endregion

  // #region Properties

  /** Current validated process snapshot. @public @readonly */
  public get snapshot() {
    return this._state.snapshot.asReadonly();
  }
  /** Current validated aggregate settings. @public @readonly */
  public get settings() {
    return this._state.settings.asReadonly();
  }
  /** Whether the first process snapshot is pending. @public @readonly */
  public get loading() {
    return this._state.loading.asReadonly();
  }
  /** Inspected runtime health from the same process snapshot. @public @readonly */
  public get runtimeHealth() {
    return this._state.runtimeHealth;
  }
  /** Configured active workspace scope. @public @readonly */
  public get selectedWorkspaceIds() {
    return this._state.selectedWorkspaceIds;
  }
  /** First configured workspace in that scope. @public @readonly */
  public get activeWorkspace() {
    return this._state.activeWorkspace;
  }
  /** Enabled configured repositories in the active scope. @public @readonly */
  public get scopedRepositories() {
    return this._state.scopedRepositories;
  }
  /** Existing active-board work projection over the same snapshot. @public @readonly */
  public get scopedWorkItems() {
    return this._state.scopedWorkItems;
  }
  /** Enabled configured work sources in the active scope. @public @readonly */
  public get availableBoards() {
    return this._state.availableBoards;
  }
  /** Configured active work source. @public @readonly */
  public get activeBoard() {
    return this._state.activeBoard;
  }
  /** Existing source selection for work creation. @public @readonly */
  public get creationBoard() {
    return this._state.creationBoard;
  }
  /** Existing work-creation availability projection. @public @readonly */
  public get canCreateWorkItem() {
    return this._state.canCreateWorkItem;
  }
  /** Existing pull-request creation availability projection. @public @readonly */
  public get canCreatePullRequest() {
    return this._state.canCreatePullRequest;
  }

  // #endregion
}

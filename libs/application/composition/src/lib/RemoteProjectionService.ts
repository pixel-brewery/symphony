// #region Imports

import type { ICiRun, ICiWorkflow } from '@symphony/domain-ci';
import type { IRemoteDataStatus } from '@symphony/domain-core';
import type { IWorkItem } from '@symphony/domain-work';
import type { RemoteProjectionSnapshot } from './RemoteProjectionSnapshot';
import type { IRemoteProjectionServiceDependencies } from './IRemoteProjectionServiceDependencies';

// #endregion

/** Joins the independent feature-owned read models for the execution consumer. */
export class RemoteProjectionService {
  // #region Ctor

  public constructor(private readonly _dependencies: IRemoteProjectionServiceDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Joins the selected remote read models.
   *
   * @param forceRefresh - Refresh every provider even when stored reads are fresh.
   * @public
   */
  public async snapshot(forceRefresh = false): Promise<RemoteProjectionSnapshot> {
    const [workTracking, pullRequests, continuousIntegration] = await Promise.all([
      this._dependencies.workTracking.loadProjection(forceRefresh),
      this._dependencies.pullRequests.loadProjection(forceRefresh),
      this._dependencies.continuousIntegration.loadProjection(forceRefresh),
    ]);
    return {
      workItems: workTracking.projection.workItems,
      projectFields: workTracking.projection.projectFields,
      boardColumns: workTracking.projection.boardColumns,
      pullRequests: pullRequests.projection.pullRequests,
      ciWorkflows: continuousIntegration.projection.ciWorkflows ?? [],
      ciRuns: continuousIntegration.projection.ciRuns,
      remoteData: {
        workItems: workTracking.status,
        ...(this._dependencies.includePullRequestStatus
          ? { pullRequests: pullRequests.status }
          : {}),
        ...(this._dependencies.includeContinuousIntegrationStatus
          ? { ciRuns: continuousIntegration.status }
          : {}),
      },
    };
  }

  /**
   * Refreshes every selected remote read model.
   *
   * @public
   */
  public refresh(): Promise<RemoteProjectionSnapshot> {
    return this.snapshot(true);
  }

  /**
   * Refreshes CI runs, with the workflow catalog only when requested.
   *
   * @param includeWorkflowCatalog - Include repository workflow definitions.
   * @public
   */
  public refreshContinuousIntegration(includeWorkflowCatalog = false): Promise<{
    readonly ciWorkflows: readonly ICiWorkflow[];
    readonly ciRuns: readonly ICiRun[];
    readonly status: IRemoteDataStatus;
  }> {
    return this._dependencies.continuousIntegration.refresh(includeWorkflowCatalog);
  }

  /**
   * Requires a current provider reading before exposing work items for execution.
   *
   * @public
   */
  public loadOperationalWorkItems(): Promise<readonly IWorkItem[]> {
    return this._dependencies.workTracking.loadOperationalWorkItems();
  }

  /**
   * Hydrates the selected item through its work-tracking query owner.
   *
   * @param workItemId - Item to load.
   * @public
   */
  public loadWorkItemDetails(workItemId: string): Promise<IWorkItem> {
    return this._dependencies.workTracking.loadWorkItemDetails(workItemId);
  }

  /**
   * Records provider-confirmed item state through its work-tracking query owner.
   *
   * @param workItem - Provider-confirmed item state.
   * @public
   */
  public recordWorkItem(workItem: IWorkItem): void {
    this._dependencies.workTracking.recordWorkItem(workItem);
  }

  // #endregion
}

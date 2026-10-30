// #region Imports

import type { IOrchestrationSnapshot } from '@symphony/ipc-contracts-composition';
import type { ICiRun, ICiWorkflow, ILocalCiExecution } from '@symphony/domain-ci';
import type { IRemoteDataStatus } from '@symphony/domain-core';
import { readinessOf } from '@symphony/domain-workflow';
import type { IOrchestrationSnapshotDependencies } from './IOrchestrationSnapshotDependencies';

// #endregion

/** Assembles feature projections at the orchestrator composition boundary. @public */
export class OrchestrationSnapshotService {
  // #region Ctor

  public constructor(private readonly _dependencies: IOrchestrationSnapshotDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Snapshots.
   *
   * @public
   */
  public async snapshot(): Promise<IOrchestrationSnapshot> {
    const workflow = this._dependencies.catalog.workflow();
    const remote = await this._dependencies.remoteProjectionQueries.snapshot();
    this._dependencies.execution.reconcileDeliveryGroupProjection(remote.workItems);
    const health = await this._dependencies.catalog.health();
    const execution = this._dependencies.execution.executionState();
    return {
      health,
      workItems: remote.workItems,
      projectFields: remote.projectFields,
      boardColumns: remote.boardColumns,
      executions: execution.executions,
      executionQueue: execution.executionQueue,
      goals: execution.goals,
      deliveryGroups: execution.deliveryGroups,
      deliveryGroupProposals: execution.deliveryGroupProposals,
      pullRequests: remote.pullRequests,
      ciWorkflows: remote.ciWorkflows,
      ciRuns: remote.ciRuns,
      localCiExecutions: this._dependencies.localCiExecutions?.() ?? [],
      events: execution.events,
      workflow,
      workItemReadiness: (this._dependencies.workflowRecords?.listWorkflowRecords() ?? []).map(
        readinessOf,
      ),
      skills: this._dependencies.catalog.skills(),
      remoteData: remote.remoteData,
    };
  }

  /**
   * Refreshes the snapshot.
   *
   * @public
   */
  public async refreshSnapshot(): Promise<IOrchestrationSnapshot> {
    const workflow = this._dependencies.catalog.workflow();
    const remote = await this._dependencies.remoteProjectionQueries.refresh();
    await this._dependencies.execution.reconcileDeliveryGroupProjection(remote.workItems, true);
    const health = await this._dependencies.catalog.health();
    const execution = this._dependencies.execution.executionState();
    return {
      health,
      workItems: remote.workItems,
      projectFields: remote.projectFields,
      boardColumns: remote.boardColumns,
      executions: execution.executions,
      executionQueue: execution.executionQueue,
      goals: execution.goals,
      deliveryGroups: execution.deliveryGroups,
      deliveryGroupProposals: execution.deliveryGroupProposals,
      pullRequests: remote.pullRequests,
      ciWorkflows: remote.ciWorkflows,
      ciRuns: remote.ciRuns,
      localCiExecutions: this._dependencies.localCiExecutions?.() ?? [],
      events: execution.events,
      workflow,
      workItemReadiness: (this._dependencies.workflowRecords?.listWorkflowRecords() ?? []).map(
        readinessOf,
      ),
      skills: this._dependencies.catalog.skills(),
      remoteData: remote.remoteData,
    };
  }

  /**
   * Refreshes the continuous integration.
   *
   * @param includeWorkflowCatalog - Also refresh repository workflow definitions and capabilities.
   * @public
   */
  public async refreshContinuousIntegration(includeWorkflowCatalog = false): Promise<{
    readonly ciWorkflows: readonly ICiWorkflow[];
    readonly ciRuns: readonly ICiRun[];
    readonly localCiExecutions: readonly ILocalCiExecution[];
    readonly remoteData: IRemoteDataStatus;
  }> {
    const remote =
      await this._dependencies.remoteProjectionQueries.refreshContinuousIntegration(
        includeWorkflowCatalog,
      );
    return {
      ciWorkflows: remote.ciWorkflows,
      ciRuns: remote.ciRuns,
      localCiExecutions: this._dependencies.localCiExecutions?.() ?? [],
      remoteData: remote.status,
    };
  }

  // #endregion
}

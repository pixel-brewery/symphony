// #region Imports

import type { ContinuousIntegrationUsageReportDto } from '@symphony/ipc-contracts-ci';
import type { Signal } from '@angular/core';
import type { ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Consumes CI commands and readonly state from its single feature owner.
 *
 * @public
 */
export interface ICiOperations {
  /** Feature-owned usage reports for the active repository scope. @public @readonly */
  readonly continuousIntegrationUsage: Signal<readonly ContinuousIntegrationUsageReportDto[]>;
  /** Feature-owned usage refresh lifecycle. @public @readonly */
  readonly continuousIntegrationUsageBusy: Signal<boolean>;
  /** Workspace activation derived by the CI owner from authoritative settings. @public @readonly */
  readonly localCiEnabledWorkspaceIds: Signal<ReadonlySet<string>>;
  /** Reads a repository's existing usage report. @public */
  continuousIntegrationUsageReport(
    repositoryBindingId: string,
  ): ContinuousIntegrationUsageReportDto | undefined;
  /** Refreshes only the requested or currently active repository usage. @public */
  refreshContinuousIntegrationUsage(
    repositoryBindingIds?: readonly string[],
    silent?: boolean,
  ): Promise<boolean>;
  /**
   * Read-only feature-owned localCiRunningRunId state.
   *
   * @public
   * @readonly
   */
  readonly localCiRunningRunId: Signal<string | undefined>;
  /**
   * Read-only feature-owned localCiStartedAt state.
   *
   * @public
   * @readonly
   */
  readonly localCiStartedAt: Signal<string | undefined>;
  /**
   * Read-only feature-owned localCiCleanupBusy state.
   *
   * @public
   * @readonly
   */
  readonly localCiCleanupBusy: Signal<boolean>;
  /**
   * Read-only feature-owned runnerImageCatalog state.
   *
   * @public
   * @readonly
   */
  readonly runnerImageCatalog: Signal<ResponsePayload<'local-ci.images.list'> | undefined>;
  /**
   * Read-only feature-owned runnerImageBusy state.
   *
   * @public
   * @readonly
   */
  readonly runnerImageBusy: Signal<boolean>;
  /**
   * Read-only feature-owned localCiInstances state.
   *
   * @public
   * @readonly
   */
  readonly localCiInstances: Signal<ResponsePayload<'local-ci.instances.list'> | undefined>;
  /**
   * Read-only feature-owned localCiInstanceRemoving state.
   *
   * @public
   * @readonly
   */
  readonly localCiInstanceRemoving: Signal<string | undefined>;
  /**
   * Read-only feature-owned localCiInstancesBusy state.
   *
   * @public
   * @readonly
   */
  readonly localCiInstancesBusy: Signal<boolean>;
  /**
   * Read-only feature-owned continuousIntegrationRunsBusy state.
   *
   * @public
   * @readonly
   */
  readonly continuousIntegrationRunsBusy: Signal<boolean>;
  /**
   * Delegates localCiEnabledFor to the owning CI feature.
   *
   * @public
   */
  localCiEnabledFor(workspaceId: string | undefined): boolean;
  /**
   * Delegates refreshContinuousIntegrationRuns to the owning CI feature.
   *
   * @public
   */
  refreshContinuousIntegrationRuns(includeWorkflowCatalog?: boolean): Promise<void>;
  /**
   * Delegates loadContinuousIntegrationRunDetails to the owning CI feature.
   *
   * @public
   */
  loadContinuousIntegrationRunDetails(runId: string): Promise<ResponsePayload<'ci.run.details'>>;
  /**
   * Delegates loadContinuousIntegrationRunLog to the owning CI feature.
   *
   * @public
   */
  loadContinuousIntegrationRunLog(
    runId: string,
    kind: 'output' | 'failure',
    offset: number,
  ): Promise<ResponsePayload<'ci.run.log'>>;
  /**
   * Delegates cancelCiRun to the owning CI feature.
   *
   * @public
   */
  cancelCiRun(runId: string): Promise<void>;
  /**
   * Delegates rerunCiRun to the owning CI feature.
   *
   * @public
   */
  rerunCiRun(runId: string): Promise<void>;
  /**
   * Delegates dispatchCiWorkflow to the owning CI feature.
   *
   * @public
   */
  dispatchCiWorkflow(
    workflowId: string,
    ref: string,
    inputs?: Readonly<Record<string, string>>,
  ): Promise<void>;
  /**
   * Delegates runCiWorkflowLocally to the owning CI feature.
   *
   * @public
   */
  runCiWorkflowLocally(workflowId: string, ref: string): Promise<void>;
  /**
   * Delegates runCiLocally to the owning CI feature.
   *
   * @public
   */
  runCiLocally(runId: string): Promise<void>;
  /**
   * Delegates cancelLocalCiRun to the owning CI feature.
   *
   * @public
   */
  cancelLocalCiRun(runId: string): Promise<void>;
  /**
   * Delegates refreshRunnerImages to the owning CI feature.
   *
   * @public
   */
  refreshRunnerImages(refresh?: boolean): Promise<void>;
  /**
   * Delegates selectRunnerImage to the owning CI feature.
   *
   * @public
   */
  selectRunnerImage(workspaceId: string, releaseTag: string): Promise<boolean>;
  /**
   * Delegates refreshLocalCiInstances to the owning CI feature.
   *
   * @public
   */
  refreshLocalCiInstances(force?: boolean): Promise<void>;
  /**
   * Delegates removeLocalCiInstance to the owning CI feature.
   *
   * @public
   */
  removeLocalCiInstance(name: string): Promise<boolean>;
  /**
   * Delegates clearLocalCiData to the owning CI feature.
   *
   * @public
   */
  clearLocalCiData(): Promise<boolean>;
}

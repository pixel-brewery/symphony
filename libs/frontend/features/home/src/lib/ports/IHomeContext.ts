// #region Imports

import type { Signal } from '@angular/core';
import type { ICiRunHistory } from '@symphony/domain-ci';
import type { IExternalServiceIncident } from '@symphony/domain-platform';
import type { IWorkItem } from '@symphony/domain-work';
import type { IWorkflowStageChangeHistory } from '@symphony/domain-workflow';
import type { IRepositoryBinding, IWorkspaceDefinition } from '@symphony/domain-workspace';
import type { ICiOperations } from '@symphony/frontend-core/ci';
import type { IDeliveryLaunchOperations } from '@symphony/frontend-core/delivery-operations';
import type { IExecutionOperations } from '@symphony/frontend-core/execution';
import type { IWorkflowOperations } from '@symphony/frontend-core/workflow';
import type { IRepositoryRuntimeOperations } from '@symphony/frontend-core/workspace';
import type {
  ApplicationSettingsDto,
  IOrchestrationSnapshot,
} from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * The shared projections and the optional feature-owned commands Overview and Inbox consume. An
 * operation is `null` when its owning feature is not part of the product.
 *
 * @public
 */
export interface IHomeContext {
  /** Whether the first validated snapshot has arrived. @public @readonly */
  readonly hasSnapshot: Signal<boolean>;
  /** First confirmed upstream incident relevant to this page. @public @readonly */
  readonly externalServiceIncident: Signal<IExternalServiceIncident | undefined>;
  /** The validated process snapshot of the active scope. @public @readonly */
  readonly snapshot: Signal<IOrchestrationSnapshot | undefined>;
  /** Authoritative configuration. @public @readonly */
  readonly settings: Signal<ApplicationSettingsDto | undefined>;
  /** The first workspace of the active scope. @public @readonly */
  readonly activeWorkspace: Signal<IWorkspaceDefinition | undefined>;
  /** Workspaces of the active scope. @public @readonly */
  readonly selectedWorkspaceIds: Signal<readonly string[]>;
  /** Enabled repositories of the active scope. @public @readonly */
  readonly scopedRepositories: Signal<readonly IRepositoryBinding[]>;
  /** Work items of the active board scope. @public @readonly */
  readonly scopedWorkItems: Signal<readonly IWorkItem[]>;
  /** The board selected in the active scope, if any. @public @readonly */
  readonly activeBoardId: Signal<string | undefined>;
  /** Whether a GitHub refresh is in flight. @public @readonly */
  readonly syncBusy: Signal<boolean>;
  /** Execution commands. @public @readonly */
  readonly execution: IExecutionOperations | null;
  /** Workflow gate commands. @public @readonly */
  readonly workflow: IWorkflowOperations | null;
  /** Actions commands. @public @readonly */
  readonly ci: ICiOperations | null;
  /** Orbit's delivery evidence queries. @public @readonly */
  readonly delivery: IDeliveryLaunchOperations | null;
  /** Repository preparation, which local AI execution needs first. @public @readonly */
  readonly repositoryRuntime: IRepositoryRuntimeOperations | null;
  /** Joins the existing once-only application bootstrap. @public */
  initialize(): Promise<void>;
  /** Refreshes work items, pull requests and Actions from GitHub, as the Board and Actions do. @public */
  sync(): Promise<void>;
  /**
   * Reads the recorded stage changes of the active scope since an instant (ISO).
   *
   * @public
   */
  listStageChanges(since: string): Promise<IWorkflowStageChangeHistory>;
  /**
   * Reads the recorded finished workflow runs of the active scope since an instant (ISO).
   *
   * @public
   */
  listRunHistory(since: string): Promise<ICiRunHistory>;
}

// #region Imports
import type { RemoteAccessService } from '@pixel-brewery/remote-core';
import type { IRemoteHostIdentity } from '@pixel-brewery/remote-protocol';
import { type OrchestratorSettingsState } from '../../../composition/OrchestratorSettingsState';
import { type OrchestrationSnapshotService } from '../../../snapshot/OrchestrationSnapshotService';
import { type WorkItemService } from '@symphony/application-work';
import { type AnalyzerService } from '@symphony/application-execution';
import { type WorkflowEngineService } from '@symphony/application-workflow';
import { type IWorkflowRecord } from '@symphony/domain-workflow';
import { type StructuredLogger } from '@symphony/logging';
import { type IStorageWriteAdmission } from '../../../storage-governor/IStorageWriteAdmission';
// #endregion

/**
 * Consumes only the capabilities required by mobileGateway orchestration.
 *
 * @public
 */
export interface ICreateMobileGatewayDependencies {
  /**
   * The single initialized SDK authority owner for this Symphony installation.
   *
   * @public
   */
  readonly mobileAccess: RemoteAccessService;
  /**
   * Stable app and installation identity persisted by the mobile authorization store.
   *
   * @public
   */
  readonly mobileIdentity: IRemoteHostIdentity;
  /**
   * Records an authorized product observation through the same serialized persistence writer.
   *
   * @param deviceId - SDK-admitted device whose durable last-use observation should be updated.
   * @returns Resolves after the observation commits, or immediately when the grant was revoked.
   * @throws An error when the private record cannot be persisted.
   *
   * @public
   */
  readonly recordMobileActivity: (deviceId: string) => Promise<void>;
  /**
   * Reads committed last-use metadata without exposing a credential hash.
   *
   * @param deviceId - Device identifier from the SDK administration projection.
   * @returns The last committed timestamp, or undefined when no use has been recorded.
   *
   * @public
   */
  readonly lastMobileActivity: (deviceId: string) => string | undefined;
  /**
   * Host-private canonical configuration used only for explicit product projections and scope decisions.
   *
   * @public
   */
  readonly settingsState: Readonly<Pick<OrchestratorSettingsState, 'current'>>;
  /**
   * Canonical product snapshot owner; the mobile adapter selects its public fields.
   *
   * @public
   */
  readonly snapshotService: Pick<OrchestrationSnapshotService, 'snapshot'>;
  /**
   * Existing metadata, creation, drafting and movement owner retaining product validation.
   *
   * @public
   */
  readonly workItemService: Pick<
    WorkItemService,
    'metadata' | 'create' | 'draft' | 'cancelDraft' | 'move'
  >;
  /**
   * Existing workspace write-admission policy.
   *
   * @public
   */
  readonly storageGovernor: IStorageWriteAdmission;
  /**
   * Checks current workspace storage admission before an execution or product write.
   *
   * @remarks This callback can await a new snapshot. Remote composition must check its
   * request signal after this promise resolves and before invoking a new product admission.
   * @param workItemId - Optional existing ticket identifying the storage scope.
   * @param workload - Optional execution workload for the storage policy.
   * @returns Resolves when the canonical storage policy permits the operation.
   * @throws An error when snapshot reading or storage admission fails.
   *
   * @public
   */
  readonly assertWorkItemStorage: (
    workItemId?: string,
    workload?: 'analysis' | 'implementation',
  ) => Promise<void>;
  /**
   * Existing execution admission, cancellation and publication owner.
   *
   * @public
   */
  readonly service: Pick<
    AnalyzerService,
    | 'requestAnalysis'
    | 'requestSolution'
    | 'cancelExecution'
    | 'removeExecutionQueueEntry'
    | 'publishPullRequest'
  >;
  /**
   * Canonical workflow-stage projection and transition owner.
   *
   * @public
   */
  readonly workflowEngine: Pick<WorkflowEngineService, 'adoptOperatorStage'>;
  /**
   * Records a validated operator decision for an existing scoped work item.
   *
   * @param input - Scoped ticket, currently offered option and any existing optional decision evidence.
   * @returns The workflow record produced by the canonical decision owner, when available.
   * @throws An error when the decision is unavailable or cannot be committed.
   *
   * @public
   */
  readonly recordOperatorDecision: (input: {
    /**
     * Existing work item identified by the current product scope.
     *
     * @public
     */
    readonly workItemId: string;
    /**
     * Currently offered workflow decision identifier.
     *
     * @public
     */
    readonly optionId: string;
    /**
     * Optional operator note carried by the existing decision workflow.
     *
     * @public
     */
    readonly note?: string;
    /**
     * Optional commit identity relevant to the product decision.
     *
     * @public
     */
    readonly commitSha?: string;
  }) => Promise<IWorkflowRecord | undefined>;
  /**
   * Sanitized structured diagnostics owned by the orchestrator.
   *
   * @public
   */
  readonly logger: Pick<StructuredLogger, 'error'>;
}

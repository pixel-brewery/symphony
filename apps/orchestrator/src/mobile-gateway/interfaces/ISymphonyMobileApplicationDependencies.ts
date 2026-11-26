// #region Imports

import { type ExecutionAdmission } from '@symphony/application-execution';
import { type IAgentProfile } from '@symphony/domain-team';
import { type IExecutionQueueEntry, type IExecutionRecord } from '@symphony/domain-execution';
import {
  type IIssueDraft,
  type IIssueDraftRequest,
  type IWorkItem,
  type IWorkItemEditorMetadata,
} from '@symphony/domain-work';
import { type IOrchestrationSnapshot } from '@symphony/ipc-contracts-composition';
import {
  type IMobileDisplaySettings,
  type MobileWorkItemCreateRequest,
} from '@symphony/mobile-contracts';

// #endregion

/**
 * Supplies the existing Symphony product operations after SDK route and device admission.
 *
 * @remarks This port deliberately contains no general IPC dispatcher, credential access or filesystem capability.
 * Admission callbacks receive the SDK request signal through any asynchronous storage check. Cancellation
 * before domain admission denies new work; the existing product owner retains already admitted operations.
 * @public
 */
export interface ISymphonyMobileApplicationDependencies {
  /**
   * Human-readable host label, separate from the installation identifier.
   *
   * @public
   */
  readonly desktopName: string;
  /**
   * Read-only projection of the host automation preference.
   *
   * @returns Whether the host currently permits automatic execution.
   *
   * @public
   */
  readonly remoteAutomationEnabled: () => boolean;
  /**
   * Employees in the selected workspace scope, projected without account or route policy details.
   *
   * @returns Selected employee profiles for explicit mobile display projection.
   *
   * @public
   */
  readonly employees?: () => readonly IAgentProfile[];
  /**
   * Canonical internal snapshot source. Only explicit mobile fields leave this adapter.
   *
   * @returns Current selected product state without performing a product mutation.
   * @throws An error when the authoritative product snapshot cannot be read.
   *
   * @public
   */
  readonly snapshot: () => Promise<IOrchestrationSnapshot>;
  /**
   * Returns current workspace, repository and field metadata for creation admission.
   *
   * @param repository - Optional repository selected from the current workspace metadata.
   * @returns The single authorized workspace and its current creation metadata.
   * @throws An error when no single workspace is selected or the repository is no longer available.
   *
   * @public
   */
  readonly workItemCreationContext: (repository?: string) => Promise<{
    /**
     * Identifier of the currently authorized product workspace.
     *
     * @public
     */
    readonly workspaceId: string;
    /**
     * Human-readable name of the authorized workspace.
     *
     * @public
     */
    readonly workspaceName: string;
    /**
     * Current product creation metadata including allowed repositories, fields and skill summaries.
     *
     * @public
     */
    readonly metadata: IWorkItemEditorMetadata;
  }>;
  /**
   * Creates a work item after current workspace and metadata checks.
   *
   * @param input - Validated product fields belonging to the current creation scope.
   * @returns The work item created by the existing product owner.
   * @throws An error when workspace selection, storage or product admission rejects the write.
   *
   * @public
   */
  readonly createWorkItem: (input: MobileWorkItemCreateRequest) => Promise<IWorkItem>;
  /**
   * Runs the existing product issue-drafting workflow.
   *
   * @param input - Identified drafting instructions already checked against the current creation scope.
   * @returns The existing workflow's completed draft, without creating a work item.
   * @throws An error when the skill, storage, scope or drafting operation is unavailable or cancelled.
   *
   * @public
   */
  readonly draftIssue: (input: IIssueDraftRequest) => Promise<IIssueDraft>;
  /**
   * Cancels only the identified product draft operation.
   *
   * @param operationId - Identifier supplied when the original draft was admitted.
   * @returns True when the existing owner found and cancelled that draft; otherwise false.
   *
   * @public
   */
  readonly cancelIssueDraft: (operationId: string) => boolean;
  /**
   * Admits analysis through the existing execution and storage owner.
   *
   * @param workItemId - Current ticket for which analysis remains an offered action.
   * @param prompt - Optional operator instructions for the existing analysis workflow.
   * @param signal - SDK request lifetime, checked after storage validation and before execution admission.
   * @returns The product admission describing a started or queued analysis.
   * @throws An abort reason when the request was cancelled before admission, or a product admission error.
   *
   * @public
   */
  readonly startAnalyzer: (
    workItemId: string,
    prompt: string | undefined,
    signal: AbortSignal,
  ) => Promise<ExecutionAdmission>;
  /**
   * Admits implementation or rework through the existing execution owner.
   *
   * @param workItemId - Current ticket for which implementation or rework remains an offered action.
   * @param feedback - Optional operator feedback, required by the product action when rework needs it.
   * @param signal - SDK request lifetime, checked after storage validation and before execution admission.
   * @returns The product admission describing a started or queued implementation.
   * @throws An abort reason when the request was cancelled before admission, or a product admission error.
   *
   * @public
   */
  readonly startSolver: (
    workItemId: string,
    feedback: string | undefined,
    signal: AbortSignal,
  ) => Promise<ExecutionAdmission>;
  /**
   * Cancels an identified current product execution.
   *
   * @param executionId - Identifier of an execution present in the current active projection.
   * @returns The execution returned by the existing cancellation owner.
   * @throws An error when the execution no longer permits cancellation.
   *
   * @public
   */
  readonly cancelExecution: (executionId: string) => Promise<IExecutionRecord>;
  /**
   * Removes an identified currently waiting execution.
   *
   * @param entryId - Identifier of an entry still present in the current waiting queue.
   * @returns The entry removed by the existing queue owner.
   * @throws An error when the entry is no longer waiting.
   *
   * @public
   */
  readonly removeQueueEntry: (entryId: string) => IExecutionQueueEntry;
  /**
   * Publishes only the implementation allowed by the current ticket action.
   *
   * @param executionId - Execution selected by the ticket's current publication action.
   * @returns The execution returned by the existing publication workflow.
   * @throws An error when publication is unavailable or the product owner rejects admission.
   *
   * @public
   */
  readonly publishPullRequest: (executionId: string) => Promise<IExecutionRecord>;
  /**
   * Moves a ticket only after its current board target has been validated.
   *
   * @param workItemId - Current scoped ticket to move.
   * @param boardColumnId - Validated destination belonging to that ticket's provider board.
   * @param signal - SDK request lifetime, checked after storage validation and before the provider write.
   * @returns The moved work item after the existing workflow owner adopts its stage.
   * @throws An abort reason before admission, or a storage, provider or workflow error.
   *
   * @public
   */
  readonly moveWorkItem: (
    workItemId: string,
    boardColumnId: string,
    signal: AbortSignal,
  ) => Promise<IWorkItem>;
  /**
   * Records one currently offered human workflow decision.
   *
   * @param workItemId - Scoped ticket whose current action offers this decision.
   * @param optionId - Exact offered human-decision option.
   * @returns Resolves after the existing workflow owner records the decision.
   * @throws An error when the offered decision is no longer valid.
   *
   * @public
   */
  readonly decideWorkflow: (workItemId: string, optionId: string) => Promise<void>;
  /**
   * Receives safe product HTTP failure metadata without request bodies or credentials.
   *
   * @param failure - Query-free product operation, safe category and optional value-free schema issue paths.
   * @returns Returns after handing the diagnostic to the orchestrator's logger.
   *
   * @public
   */
  readonly reportRequestFailure?: (failure: {
    /**
     * Actual HTTP method associated with the product validation failure.
     *
     * @public
     */
    readonly method: string;
    /**
     * Product path without its query or any pairing material.
     *
     * @public
     */
    readonly pathname: string;
    /**
     * HTTP failure status emitted by the product adapter.
     *
     * @public
     */
    readonly status: number;
    /**
     * Stable safe failure category.
     *
     * @public
     */
    readonly code: string;
    /**
     * Safe diagnostic explanation without a raw provider or filesystem cause.
     *
     * @public
     */
    readonly error: string;
    /**
     * Optional schema issue categories and field paths, excluding submitted values.
     *
     * @public
     */
    readonly validationIssues?: readonly {
      /**
       * Stable safe failure category.
       *
       * @public
       */
      readonly code: string;
      /**
       * Schema field path, without the rejected value.
       *
       * @public
       */
      readonly path: string;
    }[];
  }) => void;
  /**
   * Injected product instant source for deterministic projections and events.
   *
   * @returns The current product instant used for snapshot and invalidation timestamps.
   *
   * @public
   */
  readonly now?: () => Date;
  /**
   * Optional single-writer observation callback for an admitted SDK device.
   *
   * @param deviceId - Device already authenticated by the SDK for this admitted operation.
   * @returns Resolves after existing-grant activity metadata commits without adding a grant.
   * @throws An error when the product's private observation record cannot be saved.
   *
   * @public
   */
  readonly recordActivity?: (deviceId: string) => Promise<void>;
  /**
   * Explicit strict display projection; full application settings must never be returned.
   *
   * @returns Only the validated selected-workspace display configuration.
   * @throws An error when the display projection violates its product schema.
   *
   * @public
   */
  readonly displaySettings?: () => IMobileDisplaySettings;
}

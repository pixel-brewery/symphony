/**
 * The facts of an agent execution the Actions screen reads to show a run's AI diagnosis and to
 * find the pull request an `Fix with AI` revision belongs to.
 *
 * It is a structural subset of the snapshot's execution records, so the CI feature reads them
 * without depending on the execution feature.
 *
 * @public
 */
export interface ICiAgentExecution {
  /** Execution id. @public @readonly */
  readonly id: string;
  /** Workspace that owns the execution. @public @readonly */
  readonly workspaceId?: string;
  /** Work item the execution acts on. @public @readonly */
  readonly workItemId: string;
  /** Analysis, solution or revision. @public @readonly */
  readonly kind?: string;
  /** Lifecycle state such as `running` or `succeeded`. @public @readonly */
  readonly state: string;
  /** Process role, for example `ci-diagnosis` or `ci-repair`. @public @readonly */
  readonly skillFlowRole?: string;
  /** Recovery journal the execution belongs to. @public @readonly */
  readonly agenticDeliveryId?: string;
  /** Start time. @public @readonly */
  readonly startedAt: string;
  /** Finish time. @public @readonly */
  readonly finishedAt?: string;
  /** Result text the agent reported. @public @readonly */
  readonly summary?: string;
  /** Failure text. @public @readonly */
  readonly error?: string;
  /** Branch the execution worked on. @public @readonly */
  readonly workspaceReference?: string;
  /** Pull request the execution published. @public @readonly */
  readonly pullRequest?: { readonly number: number };
  /** Agent and repositories the execution was bound to. @public @readonly */
  readonly bindingSnapshot?: {
    readonly agentProfileId: string;
    readonly repositoryBindingIds: readonly string[];
  };
}

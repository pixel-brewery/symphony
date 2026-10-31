/**
 * A bounded, workspace-scoped read of recorded stage changes.
 *
 * @public
 */
export interface IWorkflowStageChangeQuery {
  /** Workspaces whose stage changes are read; nothing is read for an empty list. @public @readonly */
  readonly workspaceIds: readonly string[];
  /** Earliest change instant of interest (ISO); earlier changes of the same items are included. @public @readonly */
  readonly since: string;
  /** Most changes returned, newest first. @public @readonly */
  readonly limit: number;
}

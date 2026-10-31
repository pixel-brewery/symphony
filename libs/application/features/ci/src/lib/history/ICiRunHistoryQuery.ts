/**
 * A bounded, workspace-scoped read of recorded workflow runs.
 *
 * @public
 */
export interface ICiRunHistoryQuery {
  /** Workspaces whose runs are read; nothing is read for an empty list. @public @readonly */
  readonly workspaceIds: readonly string[];
  /** Earliest run start of interest (ISO). @public @readonly */
  readonly since: string;
  /** Most runs returned, newest first. @public @readonly */
  readonly limit: number;
}

// #region Imports

import type { ApplicationSettingsDto, ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * One workspace in the Settings `Workspaces` list with the facts of its one-line summary.
 *
 * @public
 */
export interface IWorkspaceDirectoryEntry {
  /**
   * The configured workspace.
   *
   * @public
   * @readonly
   */
  readonly workspace: ApplicationSettingsDto['workspaces'][number];
  /**
   * Number of AI agents in the workspace.
   *
   * @public
   * @readonly
   */
  readonly agents: number;
  /**
   * Number of AI accounts (Codex, Claude Code and OpenCode connections).
   *
   * @public
   * @readonly
   */
  readonly aiAccounts: number;
  /**
   * Number of repositories.
   *
   * @public
   * @readonly
   */
  readonly repositories: number;
  /**
   * Repositories without a prepared local checkout, `undefined` while unknown.
   *
   * @public
   * @readonly
   */
  readonly unpreparedRepositories: number | undefined;
  /**
   * The workspace's measured storage, `undefined` until a measurement completed.
   *
   * @public
   * @readonly
   */
  readonly storage: ResponsePayload<'storage.status.get'>['workspaces'][number] | undefined;
}

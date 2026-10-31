// #region Imports

import type { IAgentTeam } from '@symphony/domain-team';

// #endregion

/**
 * The AI team that runs one enabled workspace's work items, resolved as the orchestrator resolves
 * a workspace's skills: the team of the workspace's enabled delivery context, otherwise the
 * workspace's own team.
 *
 * @public
 */
export interface ISkillsWorkspaceTeam {
  /**
   * The workspace identifier.
   *
   * @public
   * @readonly
   */
  readonly workspaceId: string;
  /**
   * The workspace name, for messages that name skipped workspaces.
   *
   * @public
   * @readonly
   */
  readonly workspaceName: string;
  /**
   * The team whose responsibilities carry the workspace's skill packages.
   *
   * @public
   * @readonly
   */
  readonly team: IAgentTeam;
}

// #region Imports

import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * One agent in the menu-bar panel's `Agents` list: who it is and what it does right now.
 *
 * @public
 */
export interface IMenuBarAgentRow {
  /**
   * Agent profile identifier.
   *
   * @public
   * @readonly
   */
  readonly id: string;

  /**
   * Agent name, for example `Ida Implementierung`.
   *
   * @public
   * @readonly
   */
  readonly name: string;

  /**
   * Figure the agent appears with.
   *
   * @public
   * @readonly
   */
  readonly appearance: ApplicationSettingsDto['agentProfiles'][number]['appearance'];

  /**
   * Current activity state, as the run panel projects it.
   *
   * @public
   * @readonly
   */
  readonly state:
    'queued' | 'working' | 'needs-input' | 'paused' | 'blocked' | 'completed' | 'failed';

  /**
   * Delivery-flow role of the current or latest work, for example `solution`.
   *
   * @public
   * @readonly
   */
  readonly role?: string;

  /**
   * Key of the work item, for example `CR-0602`.
   *
   * @public
   * @readonly
   */
  readonly workItemKey?: string;

  /**
   * Title of the work item.
   *
   * @public
   * @readonly
   */
  readonly workItemTitle?: string;

  /**
   * Execution that pause and resume act on.
   *
   * @public
   * @readonly
   */
  readonly executionId?: string;

  /**
   * When the work last changed, as an ISO timestamp.
   *
   * @public
   * @readonly
   */
  readonly updatedAt?: string;
}

// #region Imports

import type { FixWithAiState } from './FixWithAiState';

// #endregion

/**
 * The availability of `Fix with AI` for the selected run.
 *
 * @public
 */
export interface IFixWithAi {
  /** Whether the action can start, or why not. @public @readonly */
  readonly state: FixWithAiState;
  /** The work item whose pull request the run checked. @public @readonly */
  readonly workItemId?: string;
}

// #region Imports

import type { ExecutionState } from '@symphony/domain-execution';

// #endregion

/**
 * One of the five delivery stages a work item passes - `Analysis`, `Solution`, `Implementation`,
 * `Checks`, `Acceptance` - with the facts its caption is composed from.
 *
 * @public
 */
export interface IWorkItemStage {
  readonly id: 'analysis' | 'solution' | 'implementation' | 'checks' | 'acceptance';
  readonly state: 'done' | 'current' | 'failed' | 'pending';
  /** State of the run behind the stage, while one exists. */
  readonly activity?: ExecutionState;
  /** Agent that ran the stage's step. */
  readonly agentName?: string;
  /** Whether a person recorded the stage's result instead of an agent. */
  readonly manual?: boolean;
  /** When the stage's step finished, or started while it runs. */
  readonly at?: string;
  /** Version of the implementation plan. */
  readonly planVersion?: number;
  readonly pullRequestNumber?: number;
  readonly branch?: string;
  readonly checksTotal?: number;
  readonly checksRunning?: number;
  readonly checksFailed?: number;
  readonly checksPassed?: number;
}

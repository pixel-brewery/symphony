// #region Imports

import type { ICiRun, ILocalCiExecution } from '@symphony/domain-ci';
import type { ActionRunner } from './ActionRunner';

// #endregion

/**
 * One workflow run as the Actions screen lists it: the GitHub run merged with the managed local
 * runner's execution of the same attempt, so a run appears once with its latest verdict.
 *
 * @public
 */
export interface IActionRunRow {
  /** The GitHub run id, or the pending local request id while a local start has no run yet. @public @readonly */
  readonly id: string;
  /** The GitHub run, when one exists. @public @readonly */
  readonly run?: ICiRun;
  /** Workflow definition the run belongs to. @public @readonly */
  readonly workflowId?: string;
  /** Workflow name as GitHub reports it. @public @readonly */
  readonly workflowName: string;
  /** Effective state: the local runner's verdict when it is newer than GitHub's. @public @readonly */
  readonly status: ICiRun['status'];
  /** Where the run executed. @public @readonly */
  readonly runner: ActionRunner;
  /** Branch or tag. @public @readonly */
  readonly branch?: string;
  /** Commit revision. @public @readonly */
  readonly revision?: string;
  /** Trigger event such as `push` or `workflow_dispatch`. @public @readonly */
  readonly event?: string;
  /** Who started the run. @public @readonly */
  readonly actor?: string;
  /** Start of the effective execution. @public @readonly */
  readonly startedAt?: string;
  /** End of the effective execution. @public @readonly */
  readonly finishedAt?: string;
  /** Latest local execution of this attempt. @public @readonly */
  readonly localExecution?: ILocalCiExecution;
  /** Whether the managed local runner is executing this run now. @public @readonly */
  readonly runningLocally: boolean;
}

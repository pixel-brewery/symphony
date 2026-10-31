// #region Imports

import type { ICiRun } from '@symphony/domain-ci';

// #endregion

/**
 * One check of a work item's delivery: a workflow run on its pull-request branch, or a check of
 * the verification report when no workflow has run.
 *
 * @public
 */
export interface IWorkItemCheck {
  readonly id: string;
  readonly name: string;
  readonly status: ICiRun['status'];
  readonly source: 'workflow' | 'verification';
  readonly runId?: string;
  readonly workspaceId?: string;
  readonly startedAt?: string;
  readonly finishedAt?: string;
  readonly externalUrl?: string;
}

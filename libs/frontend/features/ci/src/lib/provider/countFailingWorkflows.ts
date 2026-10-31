// #region Imports

import type { ICiRun, ICiWorkflow, ILocalCiExecution } from '@symphony/domain-ci';
import { buildActionRunRows } from '../actions/view-presenters/actionsOverview/buildActionRunRows';
import { projectWorkflowList } from '../actions/view-presenters/actionsOverview/projectWorkflowList';

// #endregion

/**
 * Counts the failing workflows for the sidebar's `Actions` badge with the same rule the Actions
 * screen uses for its dots and subtitle: a workflow fails when its latest finished run failed,
 * where a newer local-runner verdict replaces the GitHub result of the same run.
 *
 * @param input - Projected remote runs, local-runner executions and workflows of the workspace.
 * @returns The number of failing workflows.
 * @public
 */
export function countFailingWorkflows(input: {
  readonly runs: readonly ICiRun[];
  readonly localExecutions: readonly ILocalCiExecution[];
  readonly workflows: readonly ICiWorkflow[];
}): number {
  const rows = buildActionRunRows(input);
  return projectWorkflowList(input.workflows, rows).filter((entry) => entry.health === 'failing')
    .length;
}

// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import type { IGoalVerificationReport } from '@symphony/domain-execution';
import type { IWorkItemCheck } from './IWorkItemCheck';

// #endregion

/**
 * Resolves the checks of a work item: the newest run of every workflow on its pull-request
 * branch, or - while no workflow has run there - the checks of its newest verification report.
 *
 * @param pullRequest - The delivered pull request, when the loaded list contains it.
 * @param branch - Implementation branch, used while the pull request is not loaded.
 * @param runs - Every loaded workflow run.
 * @param report - Newest verification report of the work item's goal.
 * @returns The checks, ordered by name.
 * @public
 */
export function resolveWorkItemChecks(
  pullRequest: IPullRequestSummary | undefined,
  branch: string | undefined,
  runs: readonly ICiRun[],
  report: IGoalVerificationReport | undefined,
): readonly IWorkItemCheck[] {
  const sourceBranch = pullRequest?.sourceBranch ?? branch;
  const branchRuns = sourceBranch
    ? runs.filter(
        (run) =>
          run.branch === sourceBranch &&
          (!pullRequest || run.repositoryBindingId === pullRequest.repositoryBindingId),
      )
    : [];
  const newestByWorkflow = new Map<string, ICiRun>();
  for (const run of branchRuns) {
    const key = run.workflowId ?? run.name;
    const current = newestByWorkflow.get(key);
    if (!current || runTimestamp(run).localeCompare(runTimestamp(current)) > 0) {
      newestByWorkflow.set(key, run);
    }
  }
  if (newestByWorkflow.size) {
    return [...newestByWorkflow.values()]
      .map((run): IWorkItemCheck => ({
        id: run.id,
        name: run.name,
        status: run.status,
        source: 'workflow',
        runId: run.id,
        workspaceId: run.workspaceId,
        ...(run.startedAt ? { startedAt: run.startedAt } : {}),
        ...(run.finishedAt ? { finishedAt: run.finishedAt } : {}),
        ...(run.externalUrl ? { externalUrl: run.externalUrl } : {}),
      }))
      .toSorted((left, right) => left.name.localeCompare(right.name));
  }
  return (report?.checks ?? []).map((check, index) => ({
    id: `${report!.id}:${index}`,
    name: check.label,
    status: check.state === 'passed' ? 'succeeded' : 'failed',
    source: 'verification',
    finishedAt: report!.recordedAt,
  }));
}

function runTimestamp(run: ICiRun): string {
  return run.startedAt ?? run.finishedAt ?? '';
}

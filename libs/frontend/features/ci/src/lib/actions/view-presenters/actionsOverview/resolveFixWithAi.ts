// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { ICiAgentExecution } from '../../../ports/ICiAgentExecution';
import type { IFixWithAi } from './IFixWithAi';
import type { IRepairPolicy } from './IRepairPolicy';

// #endregion

const ACTIVE_EXECUTION_STATES = new Set(['queued', 'running', 'waiting']);

/**
 * Decides whether `Fix with AI` may start a revision for a failed run.
 *
 * The revision belongs to the work item whose delivered pull request the run checked: the latest
 * succeeded implementation or revision that published a pull request from the run's branch. It is
 * allowed only at the `Repair` level of `Fix failed checks` — agentic delivery on, managed branch
 * updates allowed and at least one repair kind enabled — the same switches the automatic repair
 * obeys, and only while no other execution works on the item.
 *
 * @param input - The run, the snapshot's executions, the policy and the agent feature's presence.
 * @returns The availability.
 * @public
 */
export function resolveFixWithAi(input: {
  readonly run: ICiRun | undefined;
  readonly executions: readonly ICiAgentExecution[];
  readonly policy: IRepairPolicy | undefined;
  readonly operationsAvailable: boolean;
}): IFixWithAi {
  if (!input.operationsAvailable) return { state: 'unavailable' };
  const run = input.run;
  if (!run?.branch) return { state: 'no-pull-request' };
  const source = input.executions
    .filter(
      (execution) =>
        (execution.kind === 'solution' || execution.kind === 'revision') &&
        execution.state === 'succeeded' &&
        execution.pullRequest !== undefined &&
        execution.workspaceReference === run.branch &&
        (execution.workspaceId === undefined || execution.workspaceId === run.workspaceId) &&
        (execution.bindingSnapshot?.repositoryBindingIds.includes(run.repositoryBindingId) ?? true),
    )
    .reduce<ICiAgentExecution | undefined>(
      (latest, execution) =>
        !latest || execution.startedAt.localeCompare(latest.startedAt) > 0 ? execution : latest,
      undefined,
    );
  if (!source) return { state: 'no-pull-request' };
  const policy = input.policy;
  const repairAllowed =
    policy !== undefined &&
    policy.enabled &&
    policy.managedBranchUpdatesEnabled &&
    (policy.sourceRepairEnabled || policy.workflowRepairEnabled);
  if (!repairAllowed) return { state: 'policy', workItemId: source.workItemId };
  const busy = input.executions.some(
    (execution) =>
      execution.workItemId === source.workItemId && ACTIVE_EXECUTION_STATES.has(execution.state),
  );
  return { state: busy ? 'busy' : 'available', workItemId: source.workItemId };
}

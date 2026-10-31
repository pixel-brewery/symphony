// #region Imports

import type { IPullRequestSummary } from '@symphony/domain-delivery';
import { isActiveExecution, type IExecutionRecord } from '@symphony/domain-execution';
import type { IPullRequestDelivery } from './IPullRequestDelivery';

// #endregion

/**
 * Resolves the delivery behind a pull request from the executions that published it: the work
 * item, the agent of that item's latest execution and its latest AI check repair. A pull request
 * Symphony did not publish has no delivery.
 *
 * @param pullRequest - Pull request.
 * @param executions - Executions in scope.
 * @param workItems - Work items in scope.
 * @param agentProfiles - Configured agent profiles.
 * @returns The delivery.
 * @public
 */
export function resolvePullRequestDelivery(
  pullRequest: Pick<IPullRequestSummary, 'number' | 'externalUrl' | 'repositoryBindingId'>,
  executions: readonly IExecutionRecord[],
  workItems: readonly { readonly id: string; readonly externalId: string }[],
  agentProfiles: readonly { readonly id: string; readonly displayName: string }[],
): IPullRequestDelivery {
  const publication = executions
    .filter(
      (execution) =>
        execution.pullRequest &&
        (execution.pullRequest.externalUrl === pullRequest.externalUrl ||
          (execution.pullRequest.number === pullRequest.number &&
            execution.bindingSnapshot?.repositoryBindingIds.includes(
              pullRequest.repositoryBindingId,
            ))),
    )
    .toSorted((left, right) => right.startedAt.localeCompare(left.startedAt))[0];
  if (!publication) return { active: false };
  const workItemId = publication.workItemId;
  const itemExecutions = executions
    .filter((execution) => execution.workItemId === workItemId)
    .toSorted((left, right) => right.startedAt.localeCompare(left.startedAt));
  const workItemKey =
    workItems.find((item) => item.id === workItemId)?.externalId ??
    publication.workItemSnapshot?.externalId;
  const agentProfileId = itemExecutions.find(
    (execution) => execution.bindingSnapshot?.agentProfileId,
  )?.bindingSnapshot?.agentProfileId;
  const agentName = agentProfiles.find((profile) => profile.id === agentProfileId)?.displayName;
  const repairExecution = itemExecutions.find(
    (execution) =>
      execution.skillFlowRole === 'ci-diagnosis' || execution.skillFlowRole === 'ci-repair',
  );
  return {
    workItemId,
    ...(workItemKey ? { workItemKey } : {}),
    ...(agentProfileId ? { agentProfileId } : {}),
    ...(agentName ? { agentName } : {}),
    ...(repairExecution ? { repairExecution } : {}),
    active: itemExecutions.some(isActiveExecution),
  };
}

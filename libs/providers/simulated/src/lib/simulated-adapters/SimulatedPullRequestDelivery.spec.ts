// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import { describe, expect, it } from 'vitest';
import { SimulatedPullRequestDelivery } from './SimulatedPullRequestDelivery';

// #endregion

function workItem(externalId: string): IWorkItem {
  return {
    id: `item-${externalId}`,
    workspaceId: 'personal',
    externalId,
    title: `Change ${externalId}`,
    body: '',
    provider: 'simulated',
    repository: 'example/platform',
    repositoryBindingIds: ['repository-1'],
    labels: [],
    assignees: [],
  };
}

function execution(item: IWorkItem): IExecutionRecord {
  return {
    id: `execution-${item.id}`,
    workItemId: item.id,
    workspaceId: 'personal',
    workflowId: 'default',
    kind: 'solution',
    mode: 'ai',
    state: 'succeeded',
    startedAt: '2026-10-30T10:00:00.000Z',
    workspaceReference: `codex/${item.externalId}`,
  } as IExecutionRecord;
}

describe('SimulatedPullRequestDelivery', () => {
  it('lists published pull requests with deterministic pending review requests', async () => {
    // arrange
    const delivery = new SimulatedPullRequestDelivery();
    for (const externalId of ['#141', '#142']) {
      const item = workItem(externalId);
      await delivery.publishPullRequest(execution(item), item);
    }

    // act
    const pullRequests = await delivery.listPullRequests();

    // assert
    expect(
      pullRequests
        .map((pullRequest) => [pullRequest.number, pullRequest.requestedReviewers])
        .toSorted(([left], [right]) => Number(left) - Number(right)),
    ).toEqual([
      [141, ['local-developer']],
      [142, ['simulated-teammate']],
    ]);
  });
});

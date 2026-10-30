// #region Imports

import { describe, expect, it, vi } from 'vitest';
import type { IAutomationReceipt, IAutomationSourceCheckpoint } from '@symphony/domain-automation';
import type { IFeedbackIntakeSignal } from '@symphony/domain-feedback';
import type { IWorkItem, IWorkItemMutation } from '@symphony/domain-work';
import { FeedbackIntakeService } from './FeedbackIntakeService';
import type { IFeedbackIntakeRepository } from './IFeedbackIntakeRepository';
import type { IFeedbackIntakeSettings } from './IFeedbackIntakeSettings';

// #endregion

const marker = '<!-- symphony-feedback-intake:abc123 -->';
const signal: IFeedbackIntakeSignal = {
  id: 'teams-feedback:abc123',
  sourceId: 'teams-feedback',
  workspaceId: 'personal',
  targetWorkItemSourceId: 'github-project',
  targetRepositoryBindingId: 'repository',
  occurredAt: '2030-01-01T10:05:00.000Z',
  marker,
  title: 'FLAMOX365 feedback',
  prompt: 'Create a work item from this feedback.',
  actor: 'Ada Lovelace',
  externalUrl: 'https://teams.microsoft.com/l/message/reply',
};

function fixture(initialSignals: readonly IFeedbackIntakeSignal[] = []) {
  const settings: IFeedbackIntakeSettings = {
    workItemSources: [
      {
        id: 'github-project',
        workspaceId: 'personal',
        connectionId: 'github',
        provider: 'github-projects',
        displayName: 'Product board',
        ownerType: 'organization',
        owner: 'example',
        projectNumber: 1,
        enabled: true,
      },
    ],
    repositoryBindings: [
      {
        id: 'repository',
        workspaceId: 'personal',
        sourceControlConnectionId: 'github',
        displayName: 'Platform',
        provider: 'github',
        host: 'github.com',
        owner: 'example',
        name: 'platform',
        defaultBranch: 'main',
        localPath: '/tmp/platform',
        enabled: true,
      },
    ],
  };
  const signals = [...initialSignals];
  const receipts: IAutomationReceipt[] = [];
  const checkpoints: IAutomationSourceCheckpoint[] = [];
  const repository: IFeedbackIntakeRepository = {
    saveAutomationReceipt: (receipt) => {
      const index = receipts.findIndex((candidate) => candidate.signalId === receipt.signalId);
      if (index >= 0) receipts[index] = receipt;
      else receipts.push(receipt);
    },
    listAutomationReceipts: () => receipts,
    saveAutomationCheckpoint: (checkpoint) => checkpoints.push(checkpoint),
    listAutomationCheckpoints: () => checkpoints,
  };
  const items: IWorkItem[] = [];
  const create = vi.fn(async (input: IWorkItemMutation): Promise<IWorkItem> => {
    const item: IWorkItem = {
      id: 'PVTI_created',
      workspaceId: input.workspaceId,
      sourceId: input.sourceId,
      externalId: '#42',
      title: input.title,
      body: input.body,
      bodyFormat: 'markdown',
      stageId: 'backlog',
      provider: 'github-projects',
      repository: input.repository,
      labels: [],
      assignees: [],
    };
    items.push(item);
    return item;
  });
  const service = new FeedbackIntakeService({
    settings: () => settings,
    intake: {
      listSources: () => [{ id: signal.sourceId, workspaceId: signal.workspaceId }],
      listSignals: async () => signals,
      testSource: async () => ({ status: 'completed', message: 'Connected.' }),
    },
    tracker: {
      listWorkItems: async () => items,
    },
    workItems: {
      draft: vi.fn(async () => ({
        title: 'Keyboard navigation for the task board',
        body: '## Problem\nKeyboard navigation is missing.',
        projectFields: [],
        labels: [],
        assignees: [],
      })),
      create,
    },
    repository,
    clock: { now: () => '2030-01-01T11:00:00.000Z' },
  });
  return { service, signals, receipts, checkpoints, items, create };
}

describe('FeedbackIntakeService', () => {
  it('baselines existing feedback, then creates each later request exactly once', async () => {
    // act
    // arrange
    const test = fixture([signal]);

    // assert
    await expect(test.service.synchronize()).resolves.toMatchObject({ baselined: 1, created: 0 });
    expect(test.create).not.toHaveBeenCalled();

    const later = { ...signal, id: 'teams-feedback:def456', marker: `${marker}-later` };
    test.signals.push(later);
    await expect(test.service.synchronize()).resolves.toMatchObject({ created: 1 });
    await expect(test.service.synchronize()).resolves.toMatchObject({ created: 0 });

    expect(test.create).toHaveBeenCalledTimes(1);
    expect(test.items[0]?.body).toContain(later.marker);
    expect(test.items[0]?.body).toContain('Open the source conversation');
  });

  it('recovers an existing marked work item after an interrupted receipt write', async () => {
    // arrange
    const test = fixture([]);
    await test.service.synchronize();
    test.items.push({
      id: 'PVTI_existing',
      workspaceId: 'personal',
      sourceId: 'github-project',
      externalId: '#41',
      title: 'Existing issue',
      body: `Already created\n${marker}`,
      stageId: 'backlog',
      provider: 'github-projects',
      repository: 'example/platform',
      labels: [],
      assignees: [],
    });
    // act
    test.signals.push(signal);

    // assert
    await expect(test.service.synchronize()).resolves.toMatchObject({ recovered: 1, created: 0 });
    expect(test.create).not.toHaveBeenCalled();
    expect(test.receipts.at(-1)).toMatchObject({
      signalId: signal.id,
      state: 'completed',
      workItemId: 'PVTI_existing',
    });
  });
});

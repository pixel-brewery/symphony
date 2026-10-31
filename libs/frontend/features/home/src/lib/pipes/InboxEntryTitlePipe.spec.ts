// #region Imports

import type { IWorkItem } from '@symphony/domain-work';
import { describe, expect, it } from 'vitest';
import type { IInboxEntry } from '../inbox/IInboxEntry';
import { InboxEntryTitlePipe } from './InboxEntryTitlePipe';

// #endregion

function entry(overrides: Partial<IInboxEntry>): IInboxEntry {
  return {
    id: 'entry',
    group: 'decision',
    kind: 'solution',
    at: '2026-10-30T10:00:00.000Z',
    workItem: { externalId: 'CR-0589', title: 'Restore test' } as IWorkItem,
    findings: [],
    options: [],
    ...overrides,
  };
}

describe('InboxEntryTitlePipe', () => {
  it('names what each entry asks for or reports', () => {
    // arrange
    const pipe = new InboxEntryTitlePipe();

    // act
    const titles = [
      entry({}),
      entry({ kind: 'acceptance' }),
      entry({ kind: 'delivery-group', workItemCount: 3 }),
      entry({ kind: 'failing-workflow', workflowName: 'Deploy Dev', failureStreak: 2 }),
      entry({ kind: 'failing-workflow', workflowName: 'Deploy Dev', failureStreak: 4 }),
      entry({ kind: 'merged-pull-request', pullRequestNumber: 705 }),
      entry({
        kind: 'execution',
        agentName: 'Claude Code',
        executionKind: 'solution',
        executionState: 'running',
      }),
      entry({
        kind: 'execution',
        agentName: 'Codex',
        executionKind: 'analysis',
        executionState: 'succeeded',
      }),
      entry({
        kind: 'execution',
        manual: true,
        executionKind: 'analysis',
        executionState: 'succeeded',
      }),
      entry({
        kind: 'execution',
        agentName: 'Codex',
        executionKind: 'solution',
        executionState: 'failed',
      }),
    ].map((value) => pipe.transform(value));

    // assert
    expect(titles).toEqual([
      'Choose how CR-0589 continues',
      'Review delivered work',
      'Deliver 3 work items together?',
      'Deploy Dev failed twice',
      'Deploy Dev failed 4 times',
      'PR #705 merged',
      'Claude Code started implementation',
      'Codex finished the analysis',
      'You recorded the analysis',
      'Codex could not finish implementation',
    ]);
  });
});

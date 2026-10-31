// #region Imports

import { defaultWorkflow } from '@symphony/domain-workflow';
import type { IExecutionQueueEntry } from '../model/IExecutionQueueEntry';
import type { IExecutionRecord } from '../model/IExecutionRecord';
import type { IWorkItem } from '@symphony/domain-work';
import { describe, expect, it } from 'vitest';
import { resolveWorkItemActions } from './resolveWorkItemActions';

// #endregion

const workItem: IWorkItem = {
  id: 'work-1',
  externalId: '#1',
  title: 'Context actions',
  body: '',
  stageId: 'qualified',
  provider: 'simulated',
  repository: 'owner/repository',
  labels: [],
  assignees: [],
};

function execution(overrides: Partial<IExecutionRecord>): IExecutionRecord {
  return {
    id: 'execution-1',
    workItemId: workItem.id,
    workflowId: 'workflow',
    kind: 'analysis',
    state: 'succeeded',
    summary: 'The analysis result the implementation starts from.',
    startedAt: '2026-08-13T10:00:00.000Z',
    ...overrides,
  };
}

function actions(
  item: IWorkItem,
  executions: readonly IExecutionRecord[] = [],
  executionQueue: readonly IExecutionQueueEntry[] = [],
) {
  return resolveWorkItemActions(item, executions, defaultWorkflow.stages, executionQueue);
}

function queueEntry(overrides: Partial<IExecutionQueueEntry> = {}): IExecutionQueueEntry {
  return {
    id: 'queue-1',
    workItemId: workItem.id,
    workItemExternalId: workItem.externalId,
    workItemTitle: workItem.title,
    kind: 'analysis',
    origin: 'operator',
    queuedAt: '2026-08-13T10:00:00.000Z',
    ...overrides,
  };
}

describe('resolveWorkItemActions', () => {
  it('offers withdrawal instead of a second start while a step waits for a slot', () => {
    // act
    const actual = actions(workItem, [], [queueEntry()]);

    // assert
    expect(actual).toEqual([
      {
        id: 'dequeue',
        kind: 'dequeue',
        label: 'Remove queued analysis',
        queueEntryId: 'queue-1',
      },
    ]);
  });

  it('ignores a queue entry that belongs to another work item', () => {
    // act
    const actual = actions(workItem, [], [queueEntry({ workItemId: 'work-2' })]);

    // assert
    expect(actual).toEqual([{ id: 'analyze', kind: 'analyze', label: 'Analyze now' }]);
  });

  it('offers immediate analysis for items in the analysis stage', () => {
    // act
    const actual = actions(workItem);

    // assert
    expect(actual).toEqual([{ id: 'analyze', kind: 'analyze', label: 'Analyze now' }]);
  });

  it('offers a re-analysis once the stage has produced one', () => {
    // act
    const actual = actions(workItem, [execution({})]);

    // assert
    expect(actual).toEqual([{ id: 'analyze', kind: 'analyze', label: 'Re-analyze', repeat: true }]);
  });

  it('offers implementation in the implementation stage with a successful analysis', () => {
    // act
    const actual = actions({ ...workItem, stageId: 'ready' }, [execution({})]);

    // assert
    expect(actual).toEqual([{ id: 'solve', kind: 'solve', label: 'Implement now' }]);
  });

  it('names the implementation even when it cannot start yet', () => {
    // act
    // arrange
    const [action] = actions({ ...workItem, stageId: 'ready' });

    // assert
    expect(action?.label).toBe('Implement now');
    expect(action?.blockedReason).toContain('Qualified');
  });

  it('treats an analysis without a summary as missing, exactly as the orchestrator does', () => {
    // act
    // arrange
    const [action] = actions({ ...workItem, stageId: 'ready' }, [
      execution({ summary: undefined }),
    ]);

    // assert
    expect(action?.blockedReason).toBeDefined();
  });

  it('retries the implementation, not the analysis, in a stage that runs no analysis', () => {
    // act
    const actual = actions({ ...workItem, stageId: 'ready' }, [
      execution({}),
      execution({
        id: 'execution-2',
        kind: 'solution',
        state: 'failed',
        startedAt: '2026-08-13T11:00:00.000Z',
      }),
    ]);

    // assert
    expect(actual).toEqual([
      { id: 'solve', kind: 'solve', label: 'Retry implementation', repeat: true },
    ]);
  });

  it('names the step a repair while the failed run still has its workspace', () => {
    // act
    const actual = actions({ ...workItem, stageId: 'ready' }, [
      execution({}),
      execution({
        id: 'execution-2',
        kind: 'solution',
        state: 'failed',
        startedAt: '2026-08-13T11:00:00.000Z',
        workspacePath: '/managed-workspaces/execution-2',
        workspaceReference: 'codex/work-1',
      }),
    ]);

    // assert
    expect(actual).toEqual([
      { id: 'solve', kind: 'solve', label: 'Repair implementation', repeat: true },
    ]);
  });

  it('offers the analysis retry after a failed analysis', () => {
    // act
    const actual = actions(workItem, [execution({ state: 'failed' })]);

    // assert
    expect(actual).toEqual([
      { id: 'analyze', kind: 'analyze', label: 'Retry analysis', repeat: true },
    ]);
  });

  it('marks a rework as needing a description rather than blocking it', () => {
    // act
    // arrange
    const [action] = actions({ ...workItem, stageId: 'ready' }, [
      execution({}),
      execution({
        id: 'execution-2',
        kind: 'solution',
        state: 'succeeded',
        startedAt: '2026-08-13T11:00:00.000Z',
      }),
    ]);

    // assert
    expect(action).toMatchObject({ label: 'Rework implementation', requiresFeedback: true });
    expect(action?.blockedReason).toBeUndefined();
  });

  it('offers the pull request the finished implementation has not published yet', () => {
    // arrange
    const solution = execution({
      id: 'execution-2',
      kind: 'solution',
      state: 'succeeded',
      startedAt: '2026-08-13T11:00:00.000Z',
      workspacePath: '/managed-workspaces/execution-2',
      workspaceReference: 'codex/work-1',
    });

    // act
    const actual = actions({ ...workItem, stageId: 'ready' }, [execution({}), solution]).at(-1);

    // assert
    expect(actual).toEqual({
      id: 'publish-pull-request',
      kind: 'publish-pull-request',
      label: 'Create pull request',
      executionId: 'execution-2',
    });
    expect(
      actions({ ...workItem, stageId: 'ready' }, [
        execution({}),
        {
          ...solution,
          pullRequest: {
            number: 7,
            externalUrl: 'https://example.test/pull/7',
            branchUrl: 'https://example.test/tree/codex/work-1',
          },
        },
      ]).some((action) => action.kind === 'publish-pull-request'),
    ).toBe(false);
  });

  it('offers the decisions of a human gate instead of a run', () => {
    // act
    const actual = actions({ ...workItem, stageId: 'backlog' }).map((action) => [
      action.kind,
      action.optionId,
      action.effect,
    ]);

    // assert
    expect(actual).toEqual([
      ['decide', 'approve', 'advance'],
      ['decide', 'hold', 'hold'],
      ['decide', 'split', 'split'],
      ['decide', 'duplicate', 'close'],
      ['decide', 'reject', 'close'],
    ]);
  });

  it('replaces every step with the cancellation while a run is in flight', () => {
    // act
    const actual = actions(workItem, [execution({ state: 'running' })]);

    // assert
    expect(actual).toEqual([
      { id: 'cancel', kind: 'cancel', label: 'Cancel run', executionId: 'execution-1' },
    ]);
  });

  it('offers nothing for an item another orchestrator has claimed', () => {
    // act
    const actual = actions({
      ...workItem,
      coordination: { state: 'claimed', claimId: 'claim-1', action: 'analyze' },
    });

    // assert
    expect(actual).toEqual([]);
  });

  it('offers nothing while the foreign claim lease still binds', () => {
    // act
    const actual = resolveWorkItemActions(
      {
        ...workItem,
        coordination: {
          state: 'claimed',
          claimId: 'claim-1',
          action: 'analyze',
          leaseUntil: '2026-08-13T11:00:00.000Z',
        },
      },
      [],
      defaultWorkflow.stages,
      [],
      new Date('2026-08-13T10:59:00.000Z'),
    );

    // assert
    expect(actual).toEqual([]);
  });

  it('frees the item once the foreign claim lease elapsed, even before a sync stamps it', () => {
    // act
    const actual = resolveWorkItemActions(
      {
        ...workItem,
        coordination: {
          state: 'claimed',
          claimId: 'claim-1',
          action: 'analyze',
          leaseUntil: '2026-08-13T11:00:00.000Z',
        },
      },
      [],
      defaultWorkflow.stages,
      [],
      new Date('2026-08-13T11:00:01.000Z'),
    ).map((action) => action.id);

    // assert
    expect(actual).toEqual(['analyze']);
  });

  it('keeps the steps of an item this orchestrator claimed itself', () => {
    // arrange
    const claim = {
      id: 'claim-1',
      workItemId: workItem.id,
      action: 'analyze' as const,
      owner: 'octocat',
      acquiredAt: '2026-08-13T10:00:00.000Z',
      leaseUntil: '2026-08-13T11:00:00.000Z',
    };

    // act
    const actual = actions(
      { ...workItem, coordination: { state: 'claimed', claimId: claim.id, action: 'analyze' } },
      [execution({ workItemClaim: claim })],
    ).map((action) => action.id);

    // assert
    expect(actual).toEqual(['analyze']);
  });
});

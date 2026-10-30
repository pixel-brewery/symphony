// #region Imports

import { defaultWorkflow } from '@symphony/domain-workflow';
import { type IExecutionRecord } from '@symphony/domain-execution';
import { type IWorkItem } from '@symphony/domain-work';
import { describe, expect, it } from 'vitest';
import { resolveBoardContextActions } from './';

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

function actions(item: IWorkItem, executions: readonly IExecutionRecord[] = []) {
  return resolveBoardContextActions(item, executions, defaultWorkflow.stages);
}

/**
 * The steps themselves are the domain's rule and are covered by `work-item-actions.spec.ts`;
 * what the menu adds is the icon, the emphasis, and the one step it cannot run itself.
 */
describe('resolveBoardContextActions', () => {
  it('offers the steps of the stage with a start icon, and marks a repeat as one', () => {
    // act
    const actual = actions(workItem);

    // assert
    expect(actual).toEqual([
      {
        id: 'analyze',
        kind: 'analyze',
        label: 'Analyze now',
        iconName: 'play',
        variant: 'highlight',
      },
    ]);
    expect(actions(workItem, [execution({})])).toEqual([
      {
        id: 'analyze',
        kind: 'analyze',
        label: 'Re-analyze',
        repeat: true,
        iconName: 'sync',
        variant: 'highlight',
      },
    ]);
  });

  it('blocks the rework the menu cannot describe and points at the drawer', () => {
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
    expect(action?.label).toBe('Rework implementation');
    expect(action?.blockedReason).toContain('describe');
  });

  it('keeps a blocked step blocked with the reason the domain gives it', () => {
    // act
    // arrange
    const [action] = actions({ ...workItem, stageId: 'ready' });

    // assert
    expect(action?.blockedReason).toContain('Qualified');
  });

  it('gives a human gate one successful way on and marks the closures', () => {
    // act
    const actual = actions({ ...workItem, stageId: 'backlog' }).map((action) => [
      action.optionId,
      action.iconName,
      action.variant,
    ]);

    // assert
    expect(actual).toEqual([
      ['approve', 'checkmark', 'success'],
      ['hold', 'info', 'default'],
      ['split', 'add', 'default'],
      ['duplicate', 'clear', 'danger'],
      ['reject', 'clear', 'danger'],
    ]);
  });

  it('marks the cancellation as destructive and the pull request as a result', () => {
    // act
    const actual = actions(workItem, [execution({ state: 'running' })]);

    // assert
    expect(actual).toEqual([
      {
        id: 'cancel',
        kind: 'cancel',
        label: 'Cancel run',
        executionId: 'execution-1',
        iconName: 'clear',
        variant: 'danger',
      },
    ]);
    expect(
      actions({ ...workItem, stageId: 'ready' }, [
        execution({}),
        execution({
          id: 'execution-2',
          kind: 'solution',
          state: 'succeeded',
          startedAt: '2026-08-13T11:00:00.000Z',
          workspacePath: '/managed-workspaces/execution-2',
          workspaceReference: 'codex/work-1',
        }),
      ]).at(-1),
    ).toMatchObject({ kind: 'publish-pull-request', iconName: 'add', variant: 'success' });
  });
});

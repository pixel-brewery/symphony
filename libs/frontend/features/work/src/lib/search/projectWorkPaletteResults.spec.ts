// @vitest-environment jsdom

// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import { describe, expect, it } from 'vitest';
import { projectWorkPaletteResults } from './projectWorkPaletteResults';

// #endregion

describe('projectWorkPaletteResults', () => {
  it('lists matching work items best first with their column and what they wait for', () => {
    // arrange
    const items = [
      workItem('594', 'CR-0594', 'Backup: document geo-redundant retention', 'todo'),
      workItem('589', 'CR-0589', 'Azure: Run and record the first database restore test', 'todo'),
      workItem('602', 'CR-0602', 'New Relic: reduce ingest', 'progress', 'Restore notes'),
      workItem('700', 'CR-0700', 'Unrelated', 'todo'),
    ];
    const executions = [execution('602', 'running'), execution('589', 'failed')];

    // act
    const results = projectWorkPaletteResults(
      items,
      {
        boardColumns: [
          { id: 'todo', label: 'TODO' },
          { id: 'progress', label: 'In progress' },
        ],
        executions,
        stages: [],
      },
      'restore',
    );

    // assert
    expect(results.map((result) => [result.reference, result.title, result.facts])).toEqual([
      [
        'CR-0589',
        'Azure: Run and record the first database restore test',
        ['TODO', 'waiting for you'],
      ],
      ['CR-0602', 'New Relic: reduce ingest', ['In progress', 'agent running']],
    ]);
    expect(results[0]).toMatchObject({
      id: 'work-item:589',
      group: 'work-items',
      icon: 'board',
      action: { kind: 'navigate', path: '/main/board', queryParams: { item: '589' } },
    });
  });

  it('marks running items, finds items by id and lists at most five', () => {
    // arrange
    const items = Array.from({ length: 7 }, (_, index) =>
      workItem(String(index), `CR-06${index}`, `Restore step ${index}`, 'todo'),
    );

    // act
    const byId = projectWorkPaletteResults(
      items,
      {
        boardColumns: [{ id: 'todo', label: 'TODO' }],
        executions: [execution('3', 'running')],
        stages: [],
      },
      'cr-063',
    );
    const many = projectWorkPaletteResults(items, undefined, 'restore');

    // assert
    expect(byId.map((result) => [result.reference, result.facts])).toEqual([
      ['CR-063', ['TODO', 'agent running']],
    ]);
    expect(many).toHaveLength(5);
    expect(many[0]?.facts).toEqual([]);
  });

  it('offers New work item… with its shortcut when nothing is typed or it matches', () => {
    // arrange
    const items = [workItem('1', 'CR-1', 'Create the release notes', 'todo')];

    // act
    const opening = projectWorkPaletteResults(items, undefined, '');
    const typed = projectWorkPaletteResults(items, undefined, 'new work');
    const create = projectWorkPaletteResults(items, undefined, 'create');

    // assert
    expect(opening).toEqual([
      expect.objectContaining({
        id: 'command:new-work-item',
        title: 'New work item…',
        shortcut: 'N',
        action: { kind: 'navigate', path: '/main/board', queryParams: { create: 'true' } },
      }),
    ]);
    expect(typed.map((result) => result.id)).toEqual(['command:new-work-item']);
    expect(create.map((result) => result.id)).toEqual(['work-item:1', 'command:new-work-item']);
  });
});

function workItem(
  id: string,
  externalId: string,
  title: string,
  boardColumnId: string,
  body = '',
): IWorkItem {
  return {
    id,
    externalId,
    title,
    body,
    provider: 'local',
    repository: 'flamox/app',
    boardColumnId,
    labels: [],
    assignees: [],
  };
}

function execution(workItemId: string, state: IExecutionRecord['state']): IExecutionRecord {
  return {
    id: `execution-${workItemId}`,
    workItemId,
    workflowId: 'workflow',
    state,
    startedAt: '2026-10-31T08:00:00Z',
  };
}

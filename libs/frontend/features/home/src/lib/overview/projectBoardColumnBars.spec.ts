// @vitest-environment jsdom

// #region Imports

import type { IWorkItem } from '@symphony/domain-work';
import { describe, expect, it } from 'vitest';
import { projectBoardColumnBars } from './projectBoardColumnBars';

// #endregion

function item(id: string, boardColumnId?: string): IWorkItem {
  return {
    id,
    externalId: id,
    title: id,
    body: '',
    provider: 'simulated',
    repository: 'owner/repo',
    labels: [],
    assignees: [],
    ...(boardColumnId ? { boardColumnId } : {}),
  };
}

describe('projectBoardColumnBars', () => {
  it('counts work items per board column in board order, relative to the fullest column', () => {
    // arrange
    const columns = [
      { id: 'backlog', label: 'Backlog' },
      { id: 'ready', label: 'Ready' },
      { id: 'done', label: 'Done' },
    ];
    const items = [
      item('1', 'backlog'),
      item('2', 'backlog'),
      item('3', 'backlog'),
      item('4', 'done'),
      item('5'),
    ];

    // act
    const bars = projectBoardColumnBars(columns, undefined, items);

    // assert
    expect(bars).toEqual([
      { id: 'backlog', label: 'Backlog', count: 3, share: 100 },
      { id: 'ready', label: 'Ready', count: 0, share: 0 },
      { id: 'done', label: 'Done', count: 1, share: 33.3 },
      { id: expect.any(String), label: 'No column', count: 1, share: 33.3 },
    ]);
  });
});

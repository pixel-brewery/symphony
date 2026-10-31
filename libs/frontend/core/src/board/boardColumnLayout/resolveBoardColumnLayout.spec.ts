// #region Imports

import type { IBoardColumn, IWorkItem } from '@symphony/domain-work';
import { describe, expect, it } from 'vitest';
import { resolveBoardColumnLayout, UNASSIGNED_BOARD_COLUMN_ID } from './';

// #endregion

function item(overrides: Partial<IWorkItem>): IWorkItem {
  return {
    id: 'work-1',
    externalId: '#1',
    title: 'Item',
    body: '',
    stageId: 'backlog',
    provider: 'github-projects',
    repository: 'owner/repository',
    labels: [],
    assignees: [],
    ...overrides,
  };
}

const columns: readonly IBoardColumn[] = [
  { id: 'a-backlog', label: 'Backlog', sourceId: 'a', stageId: 'backlog' },
  { id: 'a-qualified', label: 'Qualified', sourceId: 'a', stageId: 'ready' },
  { id: 'a-progress', label: 'Progress', sourceId: 'a', stageId: 'executing' },
  { id: 'a-parked', label: 'Parked', sourceId: 'a' },
  { id: 'b-todo', label: 'Todo', sourceId: 'b', stageId: 'backlog' },
  { id: 'b-doing', label: 'Doing', sourceId: 'b', stageId: 'executing' },
  { id: 'b-parked', label: 'parked', sourceId: 'b' },
];

describe('resolveBoardColumnLayout', () => {
  it('shows the selected board columns in provider order and keeps unmapped columns', () => {
    // arrange
    const layout = resolveBoardColumnLayout(columns, 'a');
    // act
    const actual = layout.columns.map((column) => column.id);

    // assert
    expect(actual).toEqual(['a-backlog', 'a-qualified', 'a-progress', 'a-parked']);
    expect(layout.columnIdFor(item({ sourceId: 'a', boardColumnId: 'a-parked' }))).toBe('a-parked');
    // Items are placed only by their provider column, never by workflow state.
    expect(layout.columnIdFor(item({ sourceId: 'a', stageId: 'qualified' }))).toBe(
      UNASSIGNED_BOARD_COLUMN_ID,
    );
    expect(layout.columnIdFor(item({ sourceId: 'a', boardColumnId: 'b-doing' }))).toBe(
      UNASSIGNED_BOARD_COLUMN_ID,
    );
  });

  it('appends a "No column" bucket only while items have no provider column', () => {
    // arrange
    const withoutColumn = item({ sourceId: 'a', stageId: 'acceptance' });
    // act
    const actual = resolveBoardColumnLayout(columns, 'a', [withoutColumn]).columns.at(-1);

    // assert
    expect(actual).toEqual({
      id: UNASSIGNED_BOARD_COLUMN_ID,
      label: 'No column',
    });
    expect(
      resolveBoardColumnLayout(columns, 'a', [
        item({ sourceId: 'a', boardColumnId: 'a-parked' }),
      ]).columns.map((column) => column.id),
    ).not.toContain(UNASSIGNED_BOARD_COLUMN_ID);
  });

  it('merges every board by workflow state and then by label', () => {
    // arrange
    const layout = resolveBoardColumnLayout(columns, undefined);
    // act
    const actual = layout.columns.map((column) => [column.id, column.label]);

    // assert
    expect(actual).toEqual([
      ['a-backlog', 'Backlog'],
      ['a-qualified', 'Qualified'],
      ['a-progress', 'Progress'],
      ['a-parked', 'Parked'],
    ]);
    expect(layout.columns.some((column) => column.sourceId)).toBe(false);
    expect(layout.columnIdFor(item({ sourceId: 'b', boardColumnId: 'b-doing' }))).toBe(
      'a-progress',
    );
    expect(layout.columnIdFor(item({ sourceId: 'b', boardColumnId: 'b-parked' }))).toBe('a-parked');
    expect(layout.columnIdFor(item({ sourceId: 'b', boardColumnId: 'b-todo' }))).toBe('a-backlog');
  });

  it('keeps two columns of the same board when they share one workflow stage', () => {
    // arrange
    const providerColumns: readonly IBoardColumn[] = [
      { id: 'a-progress', label: 'In progress', sourceId: 'a', stageId: 'progress' },
      { id: 'a-rollout', label: 'Rollout', sourceId: 'a', stageId: 'progress' },
    ];

    // act
    const layout = resolveBoardColumnLayout(providerColumns, undefined);

    // assert
    expect(layout.columns.map((column) => column.id)).toEqual(['a-progress', 'a-rollout']);
    expect(layout.columnIdFor(item({ sourceId: 'a', boardColumnId: 'a-rollout' }))).toBe(
      'a-rollout',
    );
  });

  it('resolves a merged column back to the column of the item own board', () => {
    // act
    // arrange
    const layout = resolveBoardColumnLayout(columns, undefined);

    // assert
    expect(layout.providerColumnFor(item({ sourceId: 'b' }), 'a-progress')?.id).toBe('b-doing');
    expect(layout.providerColumnFor(item({ sourceId: 'a' }), 'a-progress')?.id).toBe('a-progress');
    // "Qualified" exists on board a only, so a card of board b has nothing to be written to.
    expect(layout.providerColumnFor(item({ sourceId: 'b' }), 'a-qualified')).toBeUndefined();
    expect(
      layout.providerColumnFor(item({ sourceId: 'a' }), UNASSIGNED_BOARD_COLUMN_ID),
    ).toBeUndefined();
  });

  it('offers the single reported column set to every item when no board owns the columns', () => {
    // arrange
    const unattributed: readonly IBoardColumn[] = [
      { id: 'backlog', label: 'Backlog', stageId: 'backlog' },
      { id: 'ready', label: 'Ready', stageId: 'ready' },
    ];
    // act
    const layout = resolveBoardColumnLayout(unattributed, undefined);

    // assert
    expect(layout.providerColumnFor(item({ sourceId: 'simulated' }), 'ready')?.id).toBe('ready');
  });

  it('renders no columns for a board the provider has not reported', () => {
    // assert
    expect(resolveBoardColumnLayout(columns, 'missing').columns).toEqual([]);
  });
});

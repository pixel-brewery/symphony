// @vitest-environment jsdom

// #region Imports

import type { IWorkItem } from '@symphony/domain-work';
import { UNASSIGNED_BOARD_COLUMN_ID } from '@symphony/frontend-core';
import type { IOrchestrationSnapshot } from '@symphony/ipc-contracts-composition';
import { describe, expect, it } from 'vitest';
import { projectOrbitClusters } from './projectOrbitClusters';

// #endregion

const base: IWorkItem = {
  id: 'item',
  workspaceId: 'personal',
  externalId: '#1',
  title: 'Item',
  body: '',
  provider: 'simulated',
  repository: 'owner/repo',
  labels: [],
  assignees: [],
};

function item(id: string, externalId: string, column?: string, stageId?: string): IWorkItem {
  return {
    ...base,
    id,
    externalId,
    ...(column ? { boardColumnId: column } : {}),
    stageId: stageId ?? column ?? 'backlog',
  };
}

const snapshot: Partial<IOrchestrationSnapshot> = {
  boardColumns: [
    { id: 'backlog', label: 'Backlog', stageId: 'backlog' },
    { id: 'ready', label: 'Ready', stageId: 'ready' },
    { id: 'done', label: 'Done', stageId: 'done' },
  ],
  workflow: {
    stages: [
      { id: 'backlog', label: 'Backlog', description: '', kind: 'human-gate' },
      { id: 'ready', label: 'Ready', description: '', kind: 'human-gate' },
      { id: 'done', label: 'Done', description: '', kind: 'terminal' },
    ],
  } as unknown as IOrchestrationSnapshot['workflow'],
  executions: [
    {
      id: 'failed',
      workItemId: 'failing',
      workflowId: 'workflow',
      state: 'failed',
      startedAt: '2026-10-30T10:00:00Z',
    },
  ],
};

describe('projectOrbitClusters', () => {
  it('follows the board column order, skips empty columns and gathers attention items last', () => {
    // arrange
    const items = [
      item('done-a', 'CR-0457', 'done'),
      item('backlog-a', 'CR-0009', 'backlog'),
      item('backlog-b', 'CR-0010', 'backlog'),
      item('failing', 'CR-0589', 'ready'),
      item('loose', 'CR-0527', undefined, 'backlog'),
    ];

    // act
    const projection = projectOrbitClusters(items, snapshot, undefined);

    // assert
    expect(
      projection.clusters.map((cluster) => [
        cluster.id,
        cluster.label,
        cluster.tone,
        cluster.memberIds,
      ]),
    ).toEqual([
      ['column:backlog', 'Backlog', 'neutral', ['backlog-b', 'backlog-a']],
      ['column:done', 'Done', 'success', ['done-a']],
      [`column:${UNASSIGNED_BOARD_COLUMN_ID}`, 'No column', 'neutral', ['loose']],
      ['attention', 'Needs attention', 'danger', ['failing']],
    ]);
    expect(projection.clusters.find((cluster) => cluster.kind === 'attention')?.columnId).toBe(
      undefined,
    );
    expect(projection.columnLabels.get('failing')).toBe('Ready');
    expect(projection.columnLabels.get('loose')).toBe('No column');
  });

  it('returns no clusters without work items and tolerates a missing snapshot', () => {
    // arrange
    const items: IWorkItem[] = [];

    // act
    const empty = projectOrbitClusters(items, snapshot, undefined);
    const unloaded = projectOrbitClusters([item('a', '#1', 'backlog')], undefined, undefined);

    // assert
    expect(empty.clusters).toEqual([]);
    expect(unloaded.clusters).toHaveLength(1);
    expect(unloaded.columnLabels.get('a')).toBe('No column');
  });
});

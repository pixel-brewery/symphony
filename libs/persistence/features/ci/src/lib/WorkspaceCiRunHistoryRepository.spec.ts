// #region Imports

import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ICiRun } from '@symphony/domain-ci';
import { WorkspaceDatabaseRegistry } from '@symphony/persistence-core';
import { ciRunHistorySchema } from './CiRunHistorySchema';
import { WorkspaceCiRunHistoryRepository } from './WorkspaceCiRunHistoryRepository';

// #endregion

const directories: string[] = [];
const registries: WorkspaceDatabaseRegistry[] = [];

afterEach(() => {
  for (const registry of registries.splice(0)) registry.close();
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function setup(workspaceIds: readonly string[]) {
  const directory = mkdtempSync(join(tmpdir(), 'symphony-workspace-ci-history-'));
  directories.push(directory);
  const registry = new WorkspaceDatabaseRegistry({
    workspaceIds: () => workspaceIds,
    databasePath: (workspaceId) => join(directory, workspaceId, 'state.sqlite'),
  });
  registry.addSchema(ciRunHistorySchema);
  registries.push(registry);
  return { repository: new WorkspaceCiRunHistoryRepository(registry), directory };
}

function run(id: string, workspaceId: string, startedAt: string): ICiRun {
  return {
    id,
    workspaceId,
    ciBindingId: `ci-${workspaceId}`,
    repositoryBindingId: `repository-${workspaceId}`,
    name: 'Deploy Dev',
    status: 'failed',
    startedAt,
  };
}

describe('WorkspaceCiRunHistoryRepository', () => {
  it('records each run in its own workspace and merges the scope newest first', () => {
    // arrange
    const { repository } = setup(['personal', 'team']);
    repository.recordRuns(
      [
        run('p1', 'personal', '2026-10-02T00:00:00.000Z'),
        run('t1', 'team', '2026-10-03T00:00:00.000Z'),
        run('p2', 'personal', '2026-10-04T00:00:00.000Z'),
      ],
      '2026-04-14T00:00:00.000Z',
    );

    // act
    const both = repository.listRunHistory({
      workspaceIds: ['personal', 'team'],
      since: '2026-10-01T00:00:00.000Z',
      limit: 100,
    });
    const personal = repository.listRunHistory({
      workspaceIds: ['personal'],
      since: '2026-10-01T00:00:00.000Z',
      limit: 100,
    });

    // assert
    expect(both.runs.map((entry) => entry.id)).toEqual(['p2', 't1', 'p1']);
    expect(both.recordedSince).toBe('2026-10-02T00:00:00.000Z');
    expect(personal.runs.map((entry) => entry.id)).toEqual(['p2', 'p1']);
  });

  it('never opens storage for a workspace that is not configured', () => {
    // arrange
    const { repository, directory } = setup(['personal']);

    // act
    repository.recordRuns(
      [run('x', 'removed', '2026-10-02T00:00:00.000Z')],
      '2026-04-14T00:00:00.000Z',
    );
    const actual = repository.listRunHistory({
      workspaceIds: ['removed'],
      since: '2026-10-01T00:00:00.000Z',
      limit: 100,
    });

    // assert
    expect(actual).toEqual({ runs: [], truncated: false });
    expect(existsSync(join(directory, 'removed'))).toBe(false);
  });

  it('reports where the merged list becomes complete when the maximum cuts it', () => {
    // arrange
    const { repository } = setup(['personal', 'team']);
    repository.recordRuns(
      [
        run('p1', 'personal', '2026-10-02T00:00:00.000Z'),
        run('t1', 'team', '2026-10-03T00:00:00.000Z'),
      ],
      '2026-04-14T00:00:00.000Z',
    );

    // act
    const actual = repository.listRunHistory({
      workspaceIds: ['personal', 'team'],
      since: '2026-10-01T00:00:00.000Z',
      limit: 1,
    });

    // assert
    expect(actual.runs.map((entry) => entry.id)).toEqual(['t1']);
    expect(actual).toMatchObject({ truncated: true, recordedSince: '2026-10-03T00:00:00.000Z' });
  });
});

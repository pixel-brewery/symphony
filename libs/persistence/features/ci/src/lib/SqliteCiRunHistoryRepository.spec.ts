// #region Imports

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ICiRun } from '@symphony/domain-ci';
import { SqliteDatabase } from '@symphony/persistence-core';
import { SqliteCiRunHistoryRepository } from './SqliteCiRunHistoryRepository';

// #endregion

const directories: string[] = [];
const databases: SqliteDatabase[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function createRepository(): { repository: SqliteCiRunHistoryRepository; path: string } {
  const directory = mkdtempSync(join(tmpdir(), 'symphony-ci-run-history-'));
  directories.push(directory);
  const path = join(directory, 'state.sqlite');
  const database = new SqliteDatabase(path);
  databases.push(database);
  const repository = new SqliteCiRunHistoryRepository(database);
  repository.initialize();
  return { repository, path };
}

function run(id: string, startedAt: string, overrides: Partial<ICiRun> = {}): ICiRun {
  return {
    id,
    workspaceId: 'workspace-1',
    ciBindingId: 'ci-1',
    repositoryBindingId: 'repository-1',
    name: 'PR Quality',
    status: 'succeeded',
    startedAt,
    runAttempt: 1,
    ...overrides,
  };
}

const QUERY = { workspaceIds: ['workspace-1'], since: '2026-10-01T00:00:00.000Z', limit: 100 };

describe('SqliteCiRunHistoryRepository', () => {
  it('upserts runs by run id and attempt and keeps them across a reopen', () => {
    // arrange
    const { repository, path } = createRepository();
    repository.recordRuns(
      [
        run('ci-1:7', '2026-10-10T10:00:00.000Z', { status: 'failed' }),
        run('ci-1:8', '2026-10-11T10:00:00.000Z'),
      ],
      '2026-04-01T00:00:00.000Z',
    );

    // act
    repository.recordRuns(
      [
        run('ci-1:7', '2026-10-10T10:00:00.000Z', { status: 'failed', title: 'Renamed' }),
        run('ci-1:7', '2026-10-10T12:00:00.000Z', { runAttempt: 2 }),
      ],
      '2026-04-01T00:00:00.000Z',
    );
    const reopened = new SqliteDatabase(path);
    databases.push(reopened);
    const actual = new SqliteCiRunHistoryRepository(reopened).listRunHistory(QUERY);

    // assert
    expect(actual.runs.map((entry) => [entry.id, entry.runAttempt, entry.status])).toEqual([
      ['ci-1:8', 1, 'succeeded'],
      ['ci-1:7', 2, 'succeeded'],
      ['ci-1:7', 1, 'failed'],
    ]);
    expect(actual.runs[2]?.title).toBe('Renamed');
    expect(actual).toMatchObject({ recordedSince: '2026-10-10T10:00:00.000Z', truncated: false });
  });

  it('removes runs older than the retention bound and reads only the requested period', () => {
    // arrange
    const { repository } = createRepository();
    repository.recordRuns(
      [run('old', '2026-03-01T00:00:00.000Z'), run('kept', '2026-09-01T00:00:00.000Z')],
      '2026-01-01T00:00:00.000Z',
    );

    // act
    repository.recordRuns([run('new', '2026-10-20T00:00:00.000Z')], '2026-04-14T00:00:00.000Z');
    const actual = repository.listRunHistory(QUERY);

    // assert
    expect(actual.runs.map((entry) => entry.id)).toEqual(['new']);
    expect(actual.recordedSince).toBe('2026-09-01T00:00:00.000Z');
  });

  it('cuts the oldest runs at the maximum and keeps runs of other workspaces apart', () => {
    // arrange
    const { repository } = createRepository();
    repository.recordRuns(
      [
        run('a', '2026-10-02T00:00:00.000Z'),
        run('b', '2026-10-03T00:00:00.000Z'),
        run('c', '2026-10-04T00:00:00.000Z'),
        run('other', '2026-10-05T00:00:00.000Z', { workspaceId: 'workspace-2' }),
      ],
      '2026-04-14T00:00:00.000Z',
    );

    // act
    const actual = repository.listRunHistory({ ...QUERY, limit: 2 });

    // assert
    expect(actual.runs.map((entry) => entry.id)).toEqual(['c', 'b']);
    expect(actual).toMatchObject({ recordedSince: '2026-10-03T00:00:00.000Z', truncated: true });
  });

  it('reports no start for a scope without recorded runs', () => {
    // arrange
    const { repository } = createRepository();

    // act
    const actual = repository.listRunHistory(QUERY);

    // assert
    expect(actual).toEqual({ runs: [], truncated: false });
  });
});

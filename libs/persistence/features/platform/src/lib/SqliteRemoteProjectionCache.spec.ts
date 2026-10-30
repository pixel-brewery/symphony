// #region Imports

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SqliteDatabase } from '@symphony/persistence-core';
import { SqliteRemoteProjectionCache } from './SqliteRemoteProjectionCache';

// #endregion

const databases: SqliteDatabase[] = [];
const directories: string[] = [];

afterEach(() => {
  closeDatabases();
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('SqliteRemoteProjectionCache', () => {
  it('persists scoped read models across repository instances', () => {
    // arrange
    const directory = mkdtempSync(join(tmpdir(), 'symphony-remote-projections-'));
    directories.push(directory);
    const databasePath = join(directory, 'state.sqlite');
    const writer = createCache(databasePath);
    writer.initialize();
    writer.saveWorkTracking('workspace-a', {
      version: 1,
      workspaceIds: ['workspace-a'],
      workItems: [
        {
          id: 'item-a',
          workspaceId: 'workspace-a',
          externalId: '#1',
          title: 'Cached issue',
          body: 'Persist this provider-neutral projection.',
          stageId: 'backlog',
          provider: 'github',
          repository: 'example/repository',
          labels: [],
          assignees: [],
        },
      ],
      projectFields: [],
      boardColumns: [{ id: 'backlog', label: 'Backlog' }],
      refreshedAt: '2026-08-12T12:00:00.000Z',
    });
    writer.saveContinuousIntegration('workspace-a', {
      version: 1,
      workspaceIds: ['workspace-a'],
      ciRuns: [],
      refreshedAt: '2026-08-12T12:00:00.000Z',
    });
    writer.savePullRequests('workspace-a', {
      version: 1,
      workspaceIds: ['workspace-a'],
      pullRequests: [
        {
          id: 'repository-a:17',
          workspaceId: 'workspace-a',
          repositoryBindingId: 'repository-a',
          number: 17,
          title: 'Visible pull request',
          state: 'open',
          draft: false,
          sourceBranch: 'codex/change',
          targetBranch: 'main',
          externalUrl: 'https://github.com/example/repository/pull/17',
          createdAt: '2026-08-12T10:00:00.000Z',
          updatedAt: '2026-08-12T12:00:00.000Z',
        },
      ],
      refreshedAt: '2026-08-12T12:00:00.000Z',
    });

    closeDatabases();
    const reader = createCache(databasePath);
    // act
    reader.initialize();

    // assert
    expect(reader.loadWorkTracking('workspace-a')).toMatchObject({
      workspaceIds: ['workspace-a'],
      workItems: [expect.objectContaining({ id: 'item-a' })],
    });
    expect(reader.loadContinuousIntegration('workspace-a')).toEqual({
      version: 1,
      workspaceIds: ['workspace-a'],
      ciRuns: [],
      refreshedAt: '2026-08-12T12:00:00.000Z',
    });
    expect(reader.loadPullRequests('workspace-a')).toMatchObject({
      workspaceIds: ['workspace-a'],
      pullRequests: [expect.objectContaining({ number: 17 })],
    });
  });

  it('removes every cached scope that contains a deleted workspace', () => {
    // arrange
    const directory = mkdtempSync(join(tmpdir(), 'symphony-remote-projection-cleanup-'));
    directories.push(directory);
    const repository = createCache(join(directory, 'state.sqlite'));
    repository.initialize();
    for (const workspaceId of ['workspace-a', 'workspace-b']) {
      repository.saveWorkTracking(workspaceId, {
        version: 1,
        workspaceIds: [workspaceId],
        workItems: [],
        projectFields: [],
        boardColumns: [],
        refreshedAt: '2026-08-12T12:00:00.000Z',
      });
    }

    // act
    repository.removeWorkspace('workspace-a');

    // assert
    expect(repository.loadWorkTracking('workspace-a')).toBeUndefined();
    expect(repository.loadWorkTracking('workspace-b')).toBeDefined();
  });
});

function createCache(path: string): SqliteRemoteProjectionCache {
  const database = new SqliteDatabase(path);
  databases.push(database);
  return new SqliteRemoteProjectionCache(database);
}

function closeDatabases(): void {
  for (const database of databases.splice(0)) database.close();
}

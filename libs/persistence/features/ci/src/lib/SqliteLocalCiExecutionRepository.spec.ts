// #region Imports

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SqliteDatabase } from '@symphony/persistence-core';
import { SqliteLocalCiExecutionRepository } from './SqliteLocalCiExecutionRepository';

// #endregion

const directories: string[] = [];
const databases: SqliteDatabase[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('SqliteLocalCiExecutionRepository', () => {
  it('returns the newest managed local CI executions for the run rail', () => {
    // arrange
    const directory = mkdtempSync(join(tmpdir(), 'symphony-local-ci-run-history-'));
    directories.push(directory);
    const repository = createRepository(join(directory, 'state.sqlite'));
    repository.initialize();
    for (const [id, startedAt] of [
      ['older', '2026-08-15T08:00:00.000Z'],
      ['newer', '2026-08-15T09:00:00.000Z'],
    ] as const) {
      repository.saveLocalCiExecution({
        id,
        workspaceId: 'workspace-1',
        repositoryBindingId: 'repository-1',
        ciRunId: `ci-${id}`,
        runAttempt: id === 'newer' ? 2 : 1,
        state: 'succeeded',
        startedAt,
        finishedAt: startedAt,
        runner: {
          kind: 'managed-linux-vm',
          os: 'linux',
          architecture: 'arm64',
          label: `runner-${id}`,
          imageVersion: 'ubuntu-24.04',
        },
      });
    }

    // act
    const actual = repository
      .listLocalCiExecutions()
      .map((execution) => [execution.id, execution.runAttempt]);

    // assert
    expect(actual).toEqual([
      ['newer', 2],
      ['older', 1],
    ]);
  });

  it('bounds managed local CI evidence before persistence and while reading legacy rows', () => {
    // arrange
    const directory = mkdtempSync(join(tmpdir(), 'symphony-local-ci-bounded-evidence-'));
    directories.push(directory);
    const repository = createRepository(join(directory, 'state.sqlite'));
    repository.initialize();
    repository.saveLocalCiExecution({
      id: 'failed-run',
      workspaceId: 'workspace-1',
      repositoryBindingId: 'repository-1',
      ciRunId: 'ci-failed-run',
      state: 'failed',
      startedAt: '2026-08-16T08:00:00.000Z',
      finishedAt: '2026-08-16T08:10:00.000Z',
      failureLog: `discarded-${'x'.repeat(64_000)}-failure-tail`,
      localDiagnostics: `discarded-${'y'.repeat(64_000)}-diagnostic-tail`,
    });

    // act
    const [execution] = repository.listLocalCiExecutions();
    // assert
    expect(execution?.failureLog).toHaveLength(64_000);
    expect(execution?.failureLog).toMatch(/failure-tail$/u);
    expect(execution?.localDiagnostics).toHaveLength(64_000);
    expect(execution?.localDiagnostics).toMatch(/diagnostic-tail$/u);

    repository.saveLocalCiExecution({
      id: 'actionable-failed-run',
      workspaceId: 'workspace-1',
      repositoryBindingId: 'repository-1',
      ciRunId: 'ci-actionable-failed-run',
      state: 'failed',
      startedAt: '2026-08-16T08:20:00.000Z',
      finishedAt: '2026-08-16T08:30:00.000Z',
      failureLog: [
        ...Array.from({ length: 3_000 }, () => 'GET /assets/application.js 200 18ms'),
        'browser-e2e.spec.ts:42:7',
        '##[error]Error: expect(locator(\'[test-id="save"]\')).toBeVisible() timed out',
        'Call log: waiting for locator',
        ...Array.from({ length: 3_000 }, () => 'GET /assets/application.js 200 18ms'),
      ].join('\n'),
    });

    const actionable = repository
      .listLocalCiExecutions()
      .find((candidate) => candidate.id === 'actionable-failed-run');
    expect(actionable?.failureLog).toContain('expect(locator(\'[test-id="save"]\'))');
    expect(actionable?.failureLog?.length).toBeLessThan(1_000);
  });
});

function createRepository(path: string): SqliteLocalCiExecutionRepository {
  const database = new SqliteDatabase(path);
  databases.push(database);
  return new SqliteLocalCiExecutionRepository(database);
}

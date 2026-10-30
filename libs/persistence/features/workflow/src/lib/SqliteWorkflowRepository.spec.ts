// #region Imports

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { IWorkflowAuditEntry, IWorkflowRecord } from '@symphony/domain-workflow';
import { SqliteDatabase } from '@symphony/persistence-core';
import { SqliteWorkflowRepository } from './SqliteWorkflowRepository';

// #endregion

const directories: string[] = [];
const databases = new Set<SqliteDatabase>();

afterEach(() => {
  for (const database of databases) database.close();
  databases.clear();
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('SqliteWorkflowRepository', () => {
  it('recovers the complete workflow record after reopening the existing database', () => {
    // arrange
    const directory = mkdtempSync(join(tmpdir(), 'symphony-workflow-sqlite-'));
    directories.push(directory);
    const path = join(directory, 'state.sqlite');
    const database = open(path);
    const repository = new SqliteWorkflowRepository(database);
    repository.initialize();
    const record = workflowRecord();
    repository.saveWorkflowRecord(record);
    databases.delete(database);
    database.close();

    // act
    const recovered = new SqliteWorkflowRepository(open(path));
    recovered.initialize();

    // assert
    expect(recovered.workflowRecord(record.workItemId)).toEqual(record);
    expect(recovered.listWorkflowRecords()).toEqual([record]);
  });

  it('keeps audit entries append-only and returns their persisted sequence order', () => {
    // arrange
    const directory = mkdtempSync(join(tmpdir(), 'symphony-workflow-audit-'));
    directories.push(directory);
    const repository = new SqliteWorkflowRepository(open(join(directory, 'state.sqlite')));
    repository.initialize();
    const first: IWorkflowAuditEntry = {
      id: 'audit-first',
      workItemId: 'work-item',
      sequence: 1,
      occurredAt: '2030-01-01T10:00:00.000Z',
      kind: 'stage-changed',
      actor: 'test-owner',
      detail: 'Entered the qualified stage.',
    };
    const third: IWorkflowAuditEntry = { ...first, id: 'audit-third', sequence: 3 };
    repository.saveWorkflowAudit(third);
    repository.saveWorkflowAudit(first);

    // act
    const overwrite = (): void => repository.saveWorkflowAudit({ ...first, detail: 'Overwrite' });

    // assert
    expect(overwrite).toThrow();
    expect(repository.listWorkflowAudit('work-item')).toEqual([first, third]);
    expect(repository.nextWorkflowAuditSequence()).toBe(4);
  });
});

function open(path: string): SqliteDatabase {
  const database = new SqliteDatabase(path);
  databases.add(database);
  return database;
}

function workflowRecord(): IWorkflowRecord {
  return {
    workItemId: 'work-item',
    workspaceId: 'workspace',
    sourceId: 'source',
    workflowId: 'default',
    workflowVersion: 1,
    stageId: 'qualified',
    runtimeState: 'idle',
    revisions: {},
    routing: {},
    counters: {
      retriesByReason: {},
      reworksByRoute: {},
      consecutiveIdenticalFailures: 0,
      totalRuns: 0,
      enteredAt: '2030-01-01T10:00:00.000Z',
    },
    artifacts: [],
    pullRequestIds: [],
    updatedAt: '2030-01-01T10:00:00.000Z',
  };
}

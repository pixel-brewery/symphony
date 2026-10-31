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
  }, 30_000);

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
  }, 30_000);

  it('lists the stage history of the items that moved since the instant, newest first', () => {
    // arrange
    const repository = new SqliteWorkflowRepository(temporaryDatabase(), 'workspace');
    repository.initialize();
    repository.saveWorkflowAudit(
      audit('a-1', 'active', 1, '2030-01-01T10:00:00.000Z', 'qualified'),
    );
    repository.saveWorkflowAudit(audit('a-2', 'active', 2, '2030-01-10T10:00:00.000Z', 'done'));
    repository.saveWorkflowAudit({
      ...audit('a-3', 'active', 3, '2030-01-10T11:00:00.000Z', 'done'),
      kind: 'run-reported',
    });
    repository.saveWorkflowAudit(audit('i-1', 'idle', 4, '2029-12-01T10:00:00.000Z', 'qualified'));

    // act
    const actual = repository.listStageChanges({
      workspaceIds: ['workspace'],
      since: '2030-01-05T00:00:00.000Z',
      limit: 100,
    });

    // assert
    expect(actual).toEqual({
      changes: [
        {
          workItemId: 'active',
          fromStageId: 'backlog',
          toStageId: 'done',
          changedAt: '2030-01-10T10:00:00.000Z',
        },
        {
          workItemId: 'active',
          fromStageId: 'backlog',
          toStageId: 'qualified',
          changedAt: '2030-01-01T10:00:00.000Z',
        },
      ],
      recordedSince: '2029-12-01T10:00:00.000Z',
      truncated: false,
    });
  }, 30_000);

  it('cuts the oldest changes at the maximum and reports where the list becomes complete', () => {
    // arrange
    const repository = new SqliteWorkflowRepository(temporaryDatabase(), 'workspace');
    repository.initialize();
    for (const [index, day] of ['01', '02', '03'].entries()) {
      repository.saveWorkflowAudit(
        audit(`audit-${day}`, `item-${day}`, index + 1, `2030-01-${day}T10:00:00.000Z`, 'done'),
      );
    }

    // act
    const actual = repository.listStageChanges({
      workspaceIds: ['workspace'],
      since: '2030-01-01T00:00:00.000Z',
      limit: 2,
    });

    // assert
    expect(actual.changes.map((change) => change.workItemId)).toEqual(['item-03', 'item-02']);
    expect(actual.truncated).toBe(true);
    expect(actual.recordedSince).toBe('2030-01-02T10:00:00.000Z');
  }, 30_000);

  it('attributes pre-workspace audit entries through the workflow record of their work item', () => {
    // arrange
    const repository = new SqliteWorkflowRepository(temporaryDatabase());
    repository.initialize();
    repository.saveWorkflowRecord(workflowRecord());
    repository.saveWorkflowRecord({
      ...workflowRecord(),
      workItemId: 'other',
      workspaceId: 'other',
    });
    repository.saveWorkflowAudit(audit('mine', 'work-item', 1, '2030-01-02T10:00:00.000Z', 'done'));
    repository.saveWorkflowAudit(audit('theirs', 'other', 2, '2030-01-03T10:00:00.000Z', 'done'));
    repository.saveWorkflowAudit(audit('orphan', 'gone', 3, '2030-01-04T10:00:00.000Z', 'done'));

    // act
    const actual = repository.listStageChanges({
      workspaceIds: ['workspace'],
      since: '2030-01-01T00:00:00.000Z',
      limit: 100,
    });

    // assert
    expect(actual.changes.map((change) => change.workItemId)).toEqual(['work-item']);
    expect(actual.recordedSince).toBe('2030-01-02T10:00:00.000Z');
  }, 30_000);

  it('returns nothing from a workspace database outside the requested scope', () => {
    // arrange
    const repository = new SqliteWorkflowRepository(temporaryDatabase(), 'workspace');
    repository.initialize();
    repository.saveWorkflowAudit(audit('a', 'item', 1, '2030-01-02T10:00:00.000Z', 'done'));

    // act
    const actual = repository.listStageChanges({
      workspaceIds: ['other'],
      since: '2030-01-01T00:00:00.000Z',
      limit: 100,
    });

    // assert
    expect(actual).toEqual({ changes: [], truncated: false });
  }, 30_000);
});

function temporaryDatabase(): SqliteDatabase {
  const directory = mkdtempSync(join(tmpdir(), 'symphony-workflow-history-'));
  directories.push(directory);
  return open(join(directory, 'state.sqlite'));
}

function audit(
  id: string,
  workItemId: string,
  sequence: number,
  occurredAt: string,
  toStageId: string,
): IWorkflowAuditEntry {
  return {
    id,
    workItemId,
    sequence,
    occurredAt,
    kind: 'stage-changed',
    fromStageId: 'backlog',
    toStageId,
    actor: 'test-owner',
    detail: 'Moved.',
  };
}

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

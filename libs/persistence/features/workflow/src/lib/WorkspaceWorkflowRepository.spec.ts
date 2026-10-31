// #region Imports

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { IWorkflowAuditEntry, IWorkflowRecord } from '@symphony/domain-workflow';
import { SqliteDatabase, WorkspaceDatabaseRegistry } from '@symphony/persistence-core';
import { SqliteWorkflowRepository } from './SqliteWorkflowRepository';
import { WorkspaceWorkflowRepository } from './WorkspaceWorkflowRepository';
import { workflowSchema } from './WorkflowSchema';

// #endregion

const directories: string[] = [];
const closers: (() => void)[] = [];

afterEach(() => {
  for (const close of closers.splice(0)) close();
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function setup(workspaceIds: readonly string[]) {
  const directory = mkdtempSync(join(tmpdir(), 'symphony-workspace-workflow-'));
  directories.push(directory);
  const registry = new WorkspaceDatabaseRegistry({
    workspaceIds: () => workspaceIds,
    databasePath: (workspaceId) => join(directory, workspaceId, 'state.sqlite'),
  });
  registry.addSchema(workflowSchema);
  const legacyDatabase = new SqliteDatabase(join(directory, 'legacy.sqlite'));
  const legacy = new SqliteWorkflowRepository(legacyDatabase);
  legacy.initialize();
  closers.push(
    () => registry.close(),
    () => legacyDatabase.close(),
  );
  return { repository: new WorkspaceWorkflowRepository(registry, legacy), legacy };
}

function record(workItemId: string, workspaceId: string): IWorkflowRecord {
  return {
    workItemId,
    workspaceId,
    sourceId: 'source',
    workflowId: 'default',
    workflowVersion: 1,
    stageId: 'backlog',
    runtimeState: 'idle',
    revisions: {},
    routing: {},
    counters: {
      retriesByReason: {},
      reworksByRoute: {},
      consecutiveIdenticalFailures: 0,
      totalRuns: 0,
      enteredAt: '2030-01-01T00:00:00.000Z',
    },
    artifacts: [],
    pullRequestIds: [],
    updatedAt: '2030-01-01T00:00:00.000Z',
  };
}

function moved(id: string, workItemId: string, occurredAt: string): IWorkflowAuditEntry {
  return {
    id,
    workItemId,
    sequence: Number(id.replace(/\D/gu, '')) || 1,
    occurredAt,
    kind: 'stage-changed',
    fromStageId: 'acceptance',
    toStageId: 'done',
    actor: 'operator',
    detail: 'Accepted.',
  };
}

describe('WorkspaceWorkflowRepository', () => {
  it('merges the scoped workspace databases with pre-workspace entries of the scope', () => {
    // arrange
    const { repository, legacy } = setup(['personal', 'team']);
    repository.saveWorkflowRecord(record('personal-item', 'personal'));
    repository.saveWorkflowAudit(moved('a1', 'personal-item', '2030-01-03T10:00:00.000Z'));
    repository.saveWorkflowRecord(record('team-item', 'team'));
    repository.saveWorkflowAudit(moved('a2', 'team-item', '2030-01-04T10:00:00.000Z'));
    legacy.saveWorkflowRecord(record('legacy-item', 'personal'));
    legacy.saveWorkflowAudit(moved('a3', 'legacy-item', '2030-01-02T10:00:00.000Z'));

    // act
    const actual = repository.listStageChanges({
      workspaceIds: ['personal'],
      since: '2030-01-01T00:00:00.000Z',
      limit: 100,
    });

    // assert
    expect(actual.changes.map((change) => change.workItemId)).toEqual([
      'personal-item',
      'legacy-item',
    ]);
    expect(actual.recordedSince).toBe('2030-01-02T10:00:00.000Z');
    expect(actual.truncated).toBe(false);
  }, 30_000);

  it('keeps the newest changes across databases and reports where the merged list is complete', () => {
    // arrange
    const { repository } = setup(['personal', 'team']);
    repository.saveWorkflowRecord(record('personal-item', 'personal'));
    repository.saveWorkflowAudit(moved('a1', 'personal-item', '2030-01-01T10:00:00.000Z'));
    repository.saveWorkflowRecord(record('team-item', 'team'));
    repository.saveWorkflowAudit(moved('a2', 'team-item', '2030-01-02T10:00:00.000Z'));

    // act
    const actual = repository.listStageChanges({
      workspaceIds: ['personal', 'team'],
      since: '2030-01-01T00:00:00.000Z',
      limit: 1,
    });

    // assert
    expect(actual.changes.map((change) => change.workItemId)).toEqual(['team-item']);
    expect(actual).toMatchObject({ truncated: true, recordedSince: '2030-01-02T10:00:00.000Z' });
  }, 30_000);

  it('never opens storage for a workspace that is not configured', () => {
    // arrange
    const { repository } = setup(['personal']);

    // act
    const actual = repository.listStageChanges({
      workspaceIds: ['unknown'],
      since: '2030-01-01T00:00:00.000Z',
      limit: 100,
    });

    // assert
    expect(actual).toEqual({ changes: [], truncated: false });
  }, 30_000);
});

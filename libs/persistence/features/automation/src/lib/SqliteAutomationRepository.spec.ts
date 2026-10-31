// #region Imports

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  IAgenticDeliveryRecord,
  IAutomationReceipt,
  IAutomationSourceCheckpoint,
} from '@symphony/domain-automation';
import { SqliteDatabase } from '@symphony/persistence-core';
import { SqliteAutomationRepository } from './SqliteAutomationRepository';

// #endregion

const directories: string[] = [];
const databases = new Set<SqliteDatabase>();

afterEach(() => {
  for (const database of databases) database.close();
  databases.clear();
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('SqliteAutomationRepository', () => {
  it('keeps source checkpoints separate by workspace and replaces only their matching key', () => {
    // arrange
    const { repository } = fixture();
    const first: IAutomationSourceCheckpoint = {
      workspaceId: 'first',
      sourceId: 'shared-source',
      initializedAt: '2030-01-01T10:00:00.000Z',
    };
    const second = { ...first, workspaceId: 'second', initializedAt: '2030-01-01T11:00:00.000Z' };
    repository.saveAutomationCheckpoint(second);
    repository.saveAutomationCheckpoint(first);
    const synchronized = { ...first, synchronizedAt: '2030-01-01T12:00:00.000Z' };

    // act
    repository.saveAutomationCheckpoint(synchronized);

    // assert
    expect(repository.listAutomationCheckpoints()).toEqual([synchronized, second]);
  });

  it('recovers the latest receipt and complete agentic journal after reopening storage', () => {
    // arrange
    const { repository, database, path } = fixture();
    const first = receipt('first', '2030-01-01T10:00:00.000Z');
    const second = receipt('second', '2030-01-01T11:00:00.000Z');
    repository.saveAutomationReceipt(first);
    repository.saveAutomationReceipt(second);
    const completed: IAutomationReceipt = {
      ...first,
      state: 'completed',
      executionId: 'execution',
      updatedAt: '2030-01-01T12:00:00.000Z',
    };
    repository.saveAutomationReceipt(completed);
    const delivery: IAgenticDeliveryRecord = {
      id: 'delivery',
      workspaceId: 'workspace',
      repositoryBindingId: 'repository',
      ciRunId: 'run',
      runAttempt: 2,
      pullRequestNumber: 42,
      workItemId: 'work-item',
      sourceExecutionId: 'execution',
      state: 'awaiting-ci',
      fingerprint: 'failure-fingerprint',
      attempt: 2,
      observedAt: '2030-01-01T10:00:00.000Z',
      updatedAt: '2030-01-01T12:00:00.000Z',
      diagnosisExecutionId: 'diagnosis',
      repairExecutionId: 'repair',
      rerunRequestedAt: '2030-01-01T11:30:00.000Z',
    };
    repository.saveAgenticDelivery(delivery);
    databases.delete(database);
    database.close();

    // act
    const recovered = new SqliteAutomationRepository(open(path));
    recovered.initialize();

    // assert
    expect(recovered.listAutomationReceipts()).toEqual([second, completed]);
    expect(recovered.listAgenticDeliveries()).toEqual([delivery]);
  });
});

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'symphony-automation-sqlite-'));
  directories.push(directory);
  const path = join(directory, 'state.sqlite');
  const database = open(path);
  const repository = new SqliteAutomationRepository(database);
  repository.initialize();
  return { repository, database, path };
}

function open(path: string): SqliteDatabase {
  const database = new SqliteDatabase(path);
  databases.add(database);
  return database;
}

function receipt(signalId: string, updatedAt: string): IAutomationReceipt {
  return {
    signalId,
    sourceId: 'source',
    workspaceId: 'workspace',
    workItemId: 'work-item',
    action: 'synchronize',
    state: 'processing',
    observedAt: '2030-01-01T10:00:00.000Z',
    updatedAt,
  };
}

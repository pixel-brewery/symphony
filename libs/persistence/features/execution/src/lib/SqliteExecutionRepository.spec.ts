// #region Imports

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IDeliveryGroup, IDeliveryGroupProposal } from '@symphony/domain-execution';
import { SqliteDatabase } from '@symphony/persistence-core';
import { SqliteExecutionRepository } from './SqliteExecutionRepository';
import { afterEach, describe, expect, it } from 'vitest';

// #endregion

const temporaryDirectories: string[] = [];
const databases: SqliteDatabase[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('SqliteExecutionRepository delivery-group persistence', () => {
  it('prevents one work item from belonging to two active groups', () => {
    // arrange
    const repository = createRepository();
    repository.saveDeliveryGroup(group('group-1', ['root-1', 'shared-item']));

    // act
    const saveConflictingGroup = (): void =>
      repository.saveDeliveryGroup(group('group-2', ['root-2', 'shared-item']));

    // assert
    expect(saveConflictingGroup).toThrow();
    expect(repository.listDeliveryGroups().map((candidate) => candidate.id)).toEqual(['group-1']);
  }, 30_000);

  it('releases persisted membership when a group is dissolved', () => {
    // arrange
    const repository = createRepository();
    const first = group('group-1', ['root-1', 'shared-item']);
    repository.saveDeliveryGroup(first);

    // act
    repository.saveDeliveryGroup({
      ...first,
      state: 'dissolved',
      dissolvedAt: '2026-08-22T10:05:00.000Z',
      updatedAt: '2026-08-22T10:05:00.000Z',
    });
    repository.saveDeliveryGroup(group('group-2', ['root-2', 'shared-item']));

    // assert
    expect(repository.listDeliveryGroups()).toHaveLength(2);
  }, 30_000);

  it('round-trips an operator attestation on a persisted group', () => {
    // arrange
    const repository = createRepository();
    const attested: IDeliveryGroup = {
      ...group('group-1', ['root-1', 'item-2']),
      activationSource: 'manual-select',
      operatorAttestation: {
        attestedAt: '2026-08-22T10:00:00.000Z',
        reason: 'Both items change the same migration.',
      },
    };
    repository.saveDeliveryGroup(attested);

    // act
    const loaded = repository.listDeliveryGroups();

    // assert
    expect(loaded).toEqual([attested]);
  }, 30_000);

  it('round-trips an operator attestation on a persisted proposal', () => {
    // arrange
    const repository = createRepository();
    const attested: IDeliveryGroupProposal = {
      ...proposal('proposal-1', ['root-1', 'item-2']),
      operatorAttestation: { attestedAt: '2026-08-22T10:00:00.000Z' },
    };
    repository.saveDeliveryGroupProposal(attested);

    // act
    const loaded = repository.listDeliveryGroupProposals();

    // assert
    expect(loaded).toEqual([attested]);
  }, 30_000);
});

function createRepository(): SqliteExecutionRepository {
  const directory = mkdtempSync(join(tmpdir(), 'delivery-group-persistence-'));
  temporaryDirectories.push(directory);
  const database = new SqliteDatabase(join(directory, 'test.sqlite'));
  databases.push(database);
  const repository = new SqliteExecutionRepository(database);
  repository.initialize();
  return repository;
}

function group(id: string, workItemIds: readonly string[]): IDeliveryGroup {
  return {
    id,
    workspaceId: 'workspace-1',
    deliveryContextId: 'source-1',
    repository: 'example/platform',
    rootWorkItemId: workItemIds[0]!,
    workItemIds,
    revisions: Object.fromEntries(workItemIds.map((workItemId) => [workItemId, 1])),
    stageId: 'qualified',
    state: 'active',
    activationSource: 'proposal-confirmed',
    createdAt: '2026-08-22T10:00:00.000Z',
    updatedAt: '2026-08-22T10:00:00.000Z',
  };
}

function proposal(id: string, workItemIds: readonly string[]): IDeliveryGroupProposal {
  return {
    id,
    workspaceId: 'workspace-1',
    deliveryContextId: 'source-1',
    repository: 'example/platform',
    rootWorkItemId: workItemIds[0]!,
    workItemIds,
    revisions: Object.fromEntries(workItemIds.map((workItemId) => [workItemId, 1])),
    assessment: {
      relation: 'joint-delivery',
      workItemIds,
      assessedRevisions: Object.fromEntries(workItemIds.map((workItemId) => [workItemId, 1])),
      evidence: ['Both items describe the same migration.'],
      sharedChangeSurface: ['libs/example'],
      compatibleAcceptanceCriteria: true,
      compatibleVerification: true,
      hasOpenDecisions: false,
      hasExistingClaims: false,
      hasPullRequests: false,
      assessedAt: '2026-08-22T10:00:00.000Z',
    },
    activationSource: 'manual-select',
    state: 'open',
    createdAt: '2026-08-22T10:00:00.000Z',
    updatedAt: '2026-08-22T10:00:00.000Z',
  };
}

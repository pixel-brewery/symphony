// #region Imports

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { IDeliveryGroup, IDeliveryGroupProposal } from '@symphony/domain-execution';
import { SqliteOperationalRepositories } from './SqliteOperationalRepositories';

// #endregion

const directories: string[] = [];
const repositories: SqliteOperationalRepositories[] = [];

afterEach(() => {
  for (const repository of repositories.splice(0)) repository.close();
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('SqliteOperationalRepositories', () => {
  it('rolls every feature back when workspace deletion fails, then can retry without affecting another workspace', () => {
    // arrange
    const directory = mkdtempSync(join(tmpdir(), 'symphony-operational-rollback-'));
    directories.push(directory);
    const repository = new SqliteOperationalRepositories(join(directory, 'state.sqlite'));
    repositories.push(repository);
    repository.initialize();
    seed(repository, 'workspace-a');
    seed(repository, 'workspace-b');
    const beforeA = snapshot(repository, 'workspace-a');
    const beforeB = snapshot(repository, 'workspace-b');
    repository.database.connection.exec(`
      CREATE TRIGGER reject_workspace_group_delete
      BEFORE DELETE ON delivery_groups
      WHEN OLD.workspace_id = 'workspace-a'
      BEGIN SELECT RAISE(ABORT, 'injected delete failure'); END;
    `);

    // act
    const deletion = (): void => repository.deleteWorkspaceData('workspace-a');

    // assert
    expect(deletion).toThrow('injected delete failure');
    expect(snapshot(repository, 'workspace-a')).toEqual(beforeA);
    expect(snapshot(repository, 'workspace-b')).toEqual(beforeB);

    repository.database.connection.exec('DROP TRIGGER reject_workspace_group_delete');
    repository.deleteWorkspaceData('workspace-a');
    expect(snapshot(repository, 'workspace-a')).toEqual({
      executions: [],
      events: [],
      receipts: [],
      checkpoints: [],
      deliveries: [],
      groups: [],
      members: [],
      proposals: [],
      goals: [],
      queue: [],
    });
    expect(snapshot(repository, 'workspace-b')).toEqual(beforeB);
  });
});

function seed(repository: SqliteOperationalRepositories, workspaceId: string): void {
  const workItemId = `${workspaceId}-item`;
  const executionId = `${workspaceId}-execution`;
  const timestamp = '2030-01-01T10:00:00.000Z';
  repository.execution.saveExecution({
    id: executionId,
    workspaceId,
    workItemId,
    workflowId: 'default',
    state: 'succeeded',
    startedAt: timestamp,
    finishedAt: timestamp,
  });
  repository.execution.saveEvent({
    id: `${workspaceId}-event`,
    executionId,
    sequence: workspaceId === 'workspace-a' ? 1 : 2,
    kind: 'execution.started',
    message: 'Started.',
    occurredAt: timestamp,
  });
  repository.automation.saveAutomationReceipt({
    signalId: `${workspaceId}-signal`,
    sourceId: 'source',
    workspaceId,
    workItemId,
    action: 'synchronize',
    state: 'completed',
    observedAt: timestamp,
    updatedAt: timestamp,
    executionId,
  });
  repository.automation.saveAutomationCheckpoint({
    sourceId: 'source',
    workspaceId,
    initializedAt: timestamp,
  });
  repository.automation.saveAgenticDelivery({
    id: `${workspaceId}-agentic`,
    workspaceId,
    repositoryBindingId: 'repository',
    ciRunId: 'ci-run',
    runAttempt: 1,
    pullRequestNumber: 42,
    workItemId,
    sourceExecutionId: executionId,
    state: 'resolved',
    fingerprint: 'failure-fingerprint',
    attempt: 1,
    observedAt: timestamp,
    updatedAt: timestamp,
  });
  repository.execution.saveDeliveryGroup({
    ...group(`${workspaceId}-group`, [workItemId]),
    workspaceId,
  });
  repository.execution.saveDeliveryGroupProposal({
    ...proposal(`${workspaceId}-proposal`, [workItemId]),
    workspaceId,
  });
  repository.execution.saveGoal(goal(`${workspaceId}-goal`, workspaceId, workItemId));
  repository.execution.saveExecutionQueueEntry({
    id: `${workspaceId}-queue`,
    workspaceId,
    workItemId,
    workItemExternalId: '#1',
    workItemTitle: 'Queued work',
    kind: 'solution',
    origin: 'operator',
    queuedAt: timestamp,
  });
}

function snapshot(repository: SqliteOperationalRepositories, workspaceId: string) {
  const executions = repository.execution
    .listExecutions()
    .filter((entry) => entry.workspaceId === workspaceId);
  const executionIds = new Set(executions.map((entry) => entry.id));
  const groups = repository.execution
    .listDeliveryGroups()
    .filter((entry) => entry.workspaceId === workspaceId);
  return {
    executions,
    events: repository.execution
      .listEvents()
      .filter((entry) => executionIds.has(entry.executionId)),
    receipts: repository.automation
      .listAutomationReceipts()
      .filter((entry) => entry.workspaceId === workspaceId),
    checkpoints: repository.automation
      .listAutomationCheckpoints()
      .filter((entry) => entry.workspaceId === workspaceId),
    deliveries: repository.automation
      .listAgenticDeliveries()
      .filter((entry) => entry.workspaceId === workspaceId),
    groups,
    members: groups.flatMap((entry) =>
      repository.database.connection
        .prepare(
          'SELECT group_id, work_item_id, active FROM delivery_group_members WHERE group_id = ? ORDER BY work_item_id',
        )
        .all(entry.id),
    ),
    proposals: repository.execution
      .listDeliveryGroupProposals()
      .filter((entry) => entry.workspaceId === workspaceId),
    goals: repository.execution.listGoals().filter((entry) => entry.workspaceId === workspaceId),
    queue: repository.execution
      .listExecutionQueue()
      .filter((entry) => entry.workspaceId === workspaceId),
  };
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

function goal(id: string, workspaceId: string, workItemId: string) {
  return {
    id,
    workspaceId,
    workItemId,
    assignment: {
      id: `${id}-assignment`,
      workspaceId,
      workItemId,
      agentTeamId: `${workspaceId}-team`,
      responsibleAgentId: `${workspaceId}-agent`,
      objective: `Deliver ${workItemId}`,
      assignedAt: '2026-08-10T10:00:00Z',
      updatedAt: '2026-08-10T10:00:00Z',
    },
    state: 'planning' as const,
    currentRole: 'analysis' as const,
    handoffs: [],
    verificationReports: [],
    reviewDecisions: [],
    createdAt: '2026-08-10T10:00:00Z',
    updatedAt: '2026-08-10T10:00:00Z',
  };
}

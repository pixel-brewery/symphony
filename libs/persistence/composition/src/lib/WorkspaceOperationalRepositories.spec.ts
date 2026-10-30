// #region Imports

import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SqliteOperationalRepositories } from './SqliteOperationalRepositories';
import { WorkspaceOperationalRepositories } from './WorkspaceOperationalRepositories';

// #endregion

const repositories: WorkspaceOperationalRepositories[] = [];
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const repository of repositories.splice(0)) repository.close();
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('WorkspaceOperationalRepositories', () => {
  it('routes queued steps to their workspace database and removes them by ID alone', () => {
    // arrange
    const root = mkdtempSync(join(tmpdir(), 'symphony-workspace-queue-'));
    temporaryDirectories.push(root);
    const repository = new WorkspaceOperationalRepositories({
      workspaceIds: () => ['customer-a', 'private'],
      databasePath: (workspaceId) => join(root, workspaceId, 'state.sqlite'),
    });
    repositories.push(repository);
    repository.initialize();
    repository.execution.saveExecutionQueueEntry({
      id: 'queue-b',
      workspaceId: 'private',
      workItemId: 'b',
      workItemExternalId: '#2',
      workItemTitle: 'Second',
      kind: 'solution',
      origin: 'operator',
      queuedAt: '2026-08-10T11:00:00Z',
    });
    // act
    repository.execution.saveExecutionQueueEntry({
      id: 'queue-a',
      workspaceId: 'customer-a',
      workItemId: 'a',
      workItemExternalId: '#1',
      workItemTitle: 'First',
      kind: 'analysis',
      origin: 'operator',
      queuedAt: '2026-08-10T10:00:00Z',
    });

    // Oldest first across every workspace: that is the order the queue is drained in.
    // assert
    expect(repository.execution.listExecutionQueue().map((entry) => entry.id)).toEqual([
      'queue-a',
      'queue-b',
    ]);

    repository.execution.removeExecutionQueueEntry('queue-a');

    expect(repository.execution.listExecutionQueue().map((entry) => entry.id)).toEqual(['queue-b']);

    repository.removeWorkspaceData('private');

    expect(repository.execution.listExecutionQueue()).toEqual([]);
  });

  it('stores executions and events in separate workspace databases', () => {
    // arrange
    const root = mkdtempSync(join(tmpdir(), 'symphony-workspace-state-'));
    temporaryDirectories.push(root);
    const repository = new WorkspaceOperationalRepositories({
      workspaceIds: () => ['customer-a', 'private'],
      databasePath: (workspaceId) => join(root, workspaceId, 'state.sqlite'),
    });
    repositories.push(repository);
    repository.initialize();
    repository.execution.saveExecution({
      id: 'execution-a',
      workspaceId: 'customer-a',
      workItemId: 'a',
      workflowId: 'default',
      state: 'running',
      startedAt: '2026-08-10T10:00:00Z',
    });
    repository.execution.saveExecution({
      id: 'execution-b',
      workspaceId: 'private',
      workItemId: 'b',
      workflowId: 'default',
      state: 'running',
      startedAt: '2026-08-10T11:00:00Z',
    });
    repository.execution.saveEvent({
      id: 'event-a',
      executionId: 'execution-a',
      kind: 'execution.started',
      message: 'A',
      occurredAt: '2026-08-10T10:00:00Z',
      sequence: 1,
    });
    repository.automation.saveAutomationCheckpoint({
      sourceId: 'source-a',
      workspaceId: 'customer-a',
      initializedAt: '2026-08-10T10:00:00Z',
    });
    repository.automation.saveAutomationReceipt({
      signalId: 'signal-a',
      sourceId: 'source-a',
      workspaceId: 'customer-a',
      workItemId: 'a',
      action: 'analyze',
      state: 'started',
      observedAt: '2026-08-10T10:00:00Z',
      updatedAt: '2026-08-10T10:01:00Z',
      executionId: 'execution-a',
    });
    repository.execution.saveGoal(goal('goal-a', 'customer-a', 'a'));
    // act
    repository.execution.saveGoal(goal('goal-b', 'private', 'b'));

    // assert
    expect(existsSync(join(root, 'customer-a', 'state.sqlite'))).toBe(true);
    expect(existsSync(join(root, 'private', 'state.sqlite'))).toBe(true);
    expect(repository.execution.listExecutions().map((execution) => execution.id)).toEqual([
      'execution-b',
      'execution-a',
    ]);
    expect(repository.execution.listEvents().map((event) => event.id)).toEqual(['event-a']);
    expect(repository.automation.listAutomationCheckpoints()).toEqual([
      expect.objectContaining({ sourceId: 'source-a', workspaceId: 'customer-a' }),
    ]);
    expect(repository.automation.listAutomationReceipts()).toEqual([
      expect.objectContaining({ signalId: 'signal-a', executionId: 'execution-a' }),
    ]);
    expect(repository.execution.listGoals().map((record) => record.id)).toEqual([
      'goal-a',
      'goal-b',
    ]);
  });

  it('rejects new executions without a workspace boundary', () => {
    // arrange
    const root = mkdtempSync(join(tmpdir(), 'symphony-workspace-state-'));
    temporaryDirectories.push(root);
    // act
    const repository = new WorkspaceOperationalRepositories({
      workspaceIds: () => [],
      databasePath: (workspaceId) => join(root, workspaceId, 'state.sqlite'),
    });
    repositories.push(repository);
    // assert
    expect(() =>
      repository.execution.saveExecution({
        id: 'execution',
        workItemId: 'a',
        workflowId: 'default',
        state: 'running',
        startedAt: '2026-08-10T10:00:00Z',
      }),
    ).toThrow('immutable workspace ID');
  });

  it('deletes workspace execution data without affecting another workspace', () => {
    // arrange
    const root = mkdtempSync(join(tmpdir(), 'symphony-workspace-delete-'));
    temporaryDirectories.push(root);
    const legacy = new SqliteOperationalRepositories(join(root, 'legacy.sqlite'));
    const repository = new WorkspaceOperationalRepositories({
      workspaceIds: () => ['customer-a', 'private'],
      databasePath: (workspaceId) => join(root, workspaceId, 'state.sqlite'),
      legacy,
    });
    repositories.push(repository);
    repository.initialize();
    for (const [id, workspaceId] of [
      ['execution-a', 'customer-a'],
      ['execution-b', 'private'],
    ] as const) {
      repository.execution.saveExecution({
        id,
        workspaceId,
        workItemId: id,
        workflowId: 'default',
        state: 'succeeded',
        startedAt: '2026-08-10T10:00:00Z',
        finishedAt: '2026-08-10T10:01:00Z',
      });
      repository.execution.saveEvent({
        id: `event-${id}`,
        executionId: id,
        kind: 'analysis.completed',
        message: id,
        occurredAt: '2026-08-10T10:01:00Z',
        sequence: id === 'execution-a' ? 1 : 2,
      });
    }
    repository.automation.saveAutomationCheckpoint({
      sourceId: 'source-a',
      workspaceId: 'customer-a',
      initializedAt: '2026-08-10T10:00:00Z',
    });
    repository.automation.saveAutomationReceipt({
      signalId: 'signal-a',
      sourceId: 'source-a',
      workspaceId: 'customer-a',
      workItemId: 'a',
      action: 'analyze',
      state: 'completed',
      observedAt: '2026-08-10T10:00:00Z',
      updatedAt: '2026-08-10T10:01:00Z',
      executionId: 'execution-a',
    });
    repository.execution.saveGoal(goal('goal-a', 'customer-a', 'a'));
    repository.execution.saveGoal(goal('goal-b', 'private', 'b'));

    // act
    repository.removeWorkspaceData('customer-a');

    // assert
    expect(repository.execution.listExecutions().map((execution) => execution.id)).toEqual([
      'execution-b',
    ]);
    expect(repository.execution.listEvents().map((event) => event.id)).toEqual([
      'event-execution-b',
    ]);
    expect(repository.automation.listAutomationCheckpoints()).toEqual([]);
    expect(repository.automation.listAutomationReceipts()).toEqual([]);
    expect(repository.execution.listGoals().map((record) => record.id)).toEqual(['goal-b']);
  });
});

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

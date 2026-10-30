// #region Imports

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WorkspaceAgentRouteTelemetryRepository } from './WorkspaceAgentRouteTelemetryRepository';
import {
  WorkspaceDatabaseRegistry,
  type IWorkspaceDatabaseRegistryOptions,
} from '@symphony/persistence-core';
import { agentRouteTelemetrySchema } from './AgentRouteTelemetrySchema';

// #endregion

const directories: string[] = [];
const registries: WorkspaceDatabaseRegistry[] = [];

afterEach(() => {
  for (const registry of registries.splice(0)) registry.close();
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('WorkspaceAgentRouteTelemetryRepository', () => {
  it('persists route memory in separate workspace databases and removes one boundary exactly', () => {
    // arrange
    const root = mkdtempSync(join(tmpdir(), 'symphony-route-telemetry-'));
    directories.push(root);
    const pathFor = (workspaceId: string) => join(root, workspaceId, 'state.sqlite');
    const repository = createRepository({
      workspaceIds: () => ['workspace-a', 'workspace-b'],
      databasePath: pathFor,
    });
    repository.initialize();
    repository.save({
      workspaceId: 'workspace-a',
      routeCandidateId: 'candidate',
      attemptCount: 3,
      successCount: 1,
      failureCount: 2,
      consecutiveFailures: 2,
      averageLatencyMilliseconds: 250,
      lastAttemptAt: '2026-08-16T10:00:00.000Z',
      circuitOpenUntil: '2026-08-16T10:05:00.000Z',
    });
    repository.save({
      workspaceId: 'workspace-b',
      routeCandidateId: 'candidate',
      attemptCount: 1,
      successCount: 0,
      failureCount: 1,
      consecutiveFailures: 1,
      lastAttemptAt: '2026-08-16T10:01:00.000Z',
    });
    repository.saveAccountCooldown({
      workspaceId: 'workspace-a',
      aiConnectionId: 'account',
      reason: 'quota-exhausted',
      observedAt: '2026-08-16T10:00:00.000Z',
      retryAt: '2026-08-16T11:00:00.000Z',
    });
    repository.saveAccountCooldown({
      workspaceId: 'workspace-b',
      aiConnectionId: 'account',
      reason: 'rate-limited',
      observedAt: '2026-08-16T10:01:00.000Z',
      retryAt: '2026-08-16T10:02:00.000Z',
    });

    registries.shift()?.close();
    const reopened = createRepository({
      workspaceIds: () => ['workspace-a', 'workspace-b'],
      databasePath: pathFor,
    });
    // act
    reopened.initialize();
    // assert
    expect(reopened.load('workspace-a', 'candidate')).toMatchObject({
      averageLatencyMilliseconds: 250,
      circuitOpenUntil: '2026-08-16T10:05:00.000Z',
      successCount: 1,
    });
    expect(reopened.loadAccountCooldown('workspace-a', 'account')).toMatchObject({
      reason: 'quota-exhausted',
    });
    reopened.removeWorkspace('workspace-a');
    expect(reopened.loadAccountCooldown('workspace-a', 'account')).toBeUndefined();
    expect(reopened.load('workspace-b', 'candidate')).toMatchObject({ failureCount: 1 });
    expect(reopened.loadAccountCooldown('workspace-b', 'account')).toMatchObject({
      reason: 'rate-limited',
    });
  });
});

function createRepository(
  options: IWorkspaceDatabaseRegistryOptions,
): WorkspaceAgentRouteTelemetryRepository {
  const registry = new WorkspaceDatabaseRegistry(options);
  registry.addSchema(agentRouteTelemetrySchema);
  registries.push(registry);
  return new WorkspaceAgentRouteTelemetryRepository(registry);
}

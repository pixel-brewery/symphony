// #region Imports

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WorkspaceDatabaseRegistry } from '@symphony/persistence-core';
import {
  WorkspaceAgentRouteTelemetryRepository,
  agentRouteTelemetrySchema,
} from '@symphony/persistence-ai';
import { WorkspaceOperationalRepositories } from './WorkspaceOperationalRepositories';
import { WorkspaceRuntimeRepositories } from './WorkspaceRuntimeRepositories';

// #endregion

const registries: WorkspaceDatabaseRegistry[] = [];
const directories: string[] = [];

afterEach(() => {
  for (const registry of registries.splice(0)) registry.close();
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('WorkspaceRuntimeRepositories', () => {
  it('keeps borrowed connections usable until every workspace cleanup finishes', () => {
    // arrange
    const directory = mkdtempSync(join(tmpdir(), 'symphony-shared-workspace-cleanup-'));
    directories.push(directory);
    const options = {
      workspaceIds: () => ['workspace-a', 'workspace-b'],
      databasePath: (workspaceId: string) => join(directory, workspaceId, 'state.sqlite'),
    };
    const registry = new WorkspaceDatabaseRegistry(options);
    registries.push(registry);
    const operational = new WorkspaceOperationalRepositories({ ...options, registry });
    registry.addSchema(agentRouteTelemetrySchema);
    const telemetry = new WorkspaceAgentRouteTelemetryRepository(registry);
    const runtime = new WorkspaceRuntimeRepositories({
      ...options,
      registry,
      workspaceForRepository: (repositoryId) =>
        repositoryId === 'repository-a' ? 'workspace-a' : 'workspace-b',
    });
    operational.initialize();
    telemetry.initialize();
    runtime.initialize();
    for (const suffix of ['a', 'b']) {
      const workspaceId = `workspace-${suffix}`;
      const repositoryBindingId = `repository-${suffix}`;
      operational.execution.saveExecution({
        id: `execution-${suffix}`,
        workspaceId,
        workItemId: `item-${suffix}`,
        workflowId: 'default',
        state: 'succeeded',
        startedAt: '2030-01-01T10:00:00.000Z',
      });
      telemetry.save({
        workspaceId,
        routeCandidateId: 'route',
        attemptCount: 1,
        successCount: 1,
        failureCount: 0,
        consecutiveFailures: 0,
      });
      runtime.trust.saveTrustGrant({
        id: `grant-${suffix}`,
        workspaceId,
        repositoryBindingId,
        repositoryIdentity: 'github.com/example/platform',
        capabilities: ['agent-execution'],
        grantedAt: '2030-01-01T10:00:00.000Z',
      });
      runtime.localCi.saveLocalCiExecution({
        id: `local-ci-${suffix}`,
        workspaceId,
        repositoryBindingId,
        ciRunId: 'ci-run',
        state: 'succeeded',
        startedAt: '2030-01-01T10:00:00.000Z',
        finishedAt: '2030-01-01T10:00:00.000Z',
      });
    }

    // act
    operational.removeWorkspaceData('workspace-a');

    // assert
    expect(telemetry.load('workspace-a', 'route')).toMatchObject({ successCount: 1 });
    expect(runtime.trust.trustGrant('repository-a')).toBeDefined();
    telemetry.removeWorkspace('workspace-a');
    runtime.removeWorkspace('workspace-a');
    registry.closeWorkspace('workspace-a');
    expect(operational.execution.listExecutions().map((entry) => entry.id)).toEqual([
      'execution-b',
    ]);
    expect(telemetry.load('workspace-a', 'route')).toBeUndefined();
    expect(runtime.trust.trustGrant('repository-a')).toBeUndefined();
    expect(runtime.localCi.listLocalCiExecutions().map((entry) => entry.id)).toEqual([
      'local-ci-b',
    ]);
    expect(telemetry.load('workspace-b', 'route')).toMatchObject({ successCount: 1 });
    expect(runtime.trust.trustGrant('repository-b')).toBeDefined();
  }, 60_000);
});

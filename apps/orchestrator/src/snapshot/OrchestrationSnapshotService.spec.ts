// #region Imports

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultWorkflow } from '@symphony/domain-workflow';
import type { IRemoteProjectionRepository } from '@symphony/application-composition';
import {
  createExecutionFixture,
  cleanupExecutionFixtures,
  executionFixtureDirectories as temporaryDirectories,
  createMemoryRemoteProjectionRepository,
} from '@symphony/application-execution/testing';
import { OrchestrationSnapshotService } from './OrchestrationSnapshotService';

// #endregion

afterEach(cleanupExecutionFixtures);

function createFixture(...options: Parameters<typeof createExecutionFixture>) {
  const fixture = createExecutionFixture(...options);
  const snapshots = new OrchestrationSnapshotService({
    execution: fixture.service,
    remoteProjectionQueries: fixture.remoteProjectionQueries,
    catalog: fixture.catalog,
  });
  return { ...fixture, snapshots };
}

describe('OrchestrationSnapshotService', () => {
  it('captures the selected workflow before remote reads and reads execution state after health', async () => {
    // Arrange
    const fixture = createExecutionFixture(false);
    const calls: string[] = [];
    const before = { ...defaultWorkflow, id: 'workflow-before-refresh' };
    let selected = before;
    const service = new OrchestrationSnapshotService({
      execution: {
        executionState: () => {
          calls.push('execution');
          return fixture.service.executionState();
        },
        reconcileDeliveryGroupProjection: fixture.service.reconcileDeliveryGroupProjection.bind(
          fixture.service,
        ),
      },
      catalog: {
        workflow: () => {
          calls.push('workflow');
          return selected;
        },
        health: async () => {
          calls.push('health');
          return fixture.catalog.health();
        },
        skills: () => {
          calls.push('skills');
          return fixture.catalog.skills();
        },
      },
      remoteProjectionQueries: {
        snapshot: async () => {
          calls.push('remote');
          selected = { ...defaultWorkflow, id: 'workflow-after-refresh' };
          return { workItems: [], boardColumns: [] };
        },
        refresh: () => fixture.remoteProjectionQueries.refresh(),
        refreshContinuousIntegration: (includeWorkflowCatalog) =>
          fixture.remoteProjectionQueries.refreshContinuousIntegration(includeWorkflowCatalog),
      },
    });

    // Act
    const snapshot = await service.snapshot();

    // Assert
    expect(snapshot.workflow).toBe(before);
    expect(calls).toEqual(['workflow', 'remote', 'health', 'execution', 'skills']);
    expect(snapshot.localCiExecutions).toEqual([]);
    expect(snapshot.workItemReadiness).toEqual([]);
  });

  it('passes the CI catalog refresh choice and retains optional local execution defaults', async () => {
    // Arrange
    const fixture = createExecutionFixture(false);
    const requested: boolean[] = [];
    const status = {
      state: 'current' as const,
      lastSuccessfulRefreshAt: '2026-08-07T00:00:00.000Z',
    };
    const service = new OrchestrationSnapshotService({
      execution: fixture.service,
      catalog: fixture.catalog,
      remoteProjectionQueries: {
        snapshot: (forceRefresh) => fixture.remoteProjectionQueries.snapshot(forceRefresh),
        refresh: () => fixture.remoteProjectionQueries.refresh(),
        refreshContinuousIntegration: async (includeWorkflowCatalog = false) => {
          requested.push(includeWorkflowCatalog);
          return { ciWorkflows: [], ciRuns: [], status };
        },
      },
    });

    // Act
    const current = await service.refreshContinuousIntegration();
    await service.refreshContinuousIntegration(true);

    // Assert
    expect(requested).toEqual([false, true]);
    expect(current).toEqual({
      ciWorkflows: [],
      ciRuns: [],
      localCiExecutions: [],
      remoteData: status,
    });
  });

  it('restores the last provider-neutral projection after a restart and blocks stale execution', async () => {
    // arrange
    const directory = mkdtempSync(join(tmpdir(), 'orchestration-remote-projection-test-'));
    temporaryDirectories.push(directory);
    const remoteProjections = createMemoryRemoteProjectionRepository();
    const online = createFixture(
      false,
      true,
      'Plan persisted.',
      'qualified',
      false,
      true,
      remoteProjections,
    );

    const current = await online.snapshots.snapshot();

    // act
    const actual = current.workItems.map((item) => item.id);

    // assert
    expect(actual).toEqual(['item-1']);
    expect(current.remoteData?.workItems).toEqual({
      state: 'current',
      lastSuccessfulRefreshAt: '2026-08-07T00:00:00.000Z',
    });

    const restarted = createFixture(
      false,
      true,
      'Plan persisted.',
      'qualified',
      false,
      true,
      remoteProjections,
    );
    restarted.setWorkItemReadError(new Error('GraphQL rate limit exceeded.'));

    const stale = await restarted.snapshots.snapshot();

    expect(stale.workItems.map((item) => item.id)).toEqual(['item-1']);
    expect(stale.remoteData?.workItems).toEqual({
      state: 'stale',
      lastSuccessfulRefreshAt: '2026-08-07T00:00:00.000Z',
    });
    await expect(restarted.service.start(false, 'item-1')).rejects.toThrow(
      'GraphQL rate limit exceeded',
    );
    expect(restarted.preparedWorkspaces).toEqual([]);
  });

  it('returns local execution state with an unavailable marker before the first remote sync', async () => {
    // arrange
    const directory = mkdtempSync(join(tmpdir(), 'orchestration-empty-projection-test-'));
    temporaryDirectories.push(directory);
    const remoteProjections = createMemoryRemoteProjectionRepository();
    const fixture = createFixture(
      false,
      true,
      'Plan persisted.',
      'qualified',
      false,
      true,
      remoteProjections,
    );
    // act
    fixture.setWorkItemReadError(new Error('Provider unavailable.'));

    // assert
    await expect(fixture.snapshots.snapshot()).resolves.toMatchObject({
      workItems: [],
      executions: [],
      remoteData: { workItems: { state: 'unavailable' } },
    });
  });

  it('keeps fresh provider data when projection persistence fails', async () => {
    // arrange
    const remoteProjections: IRemoteProjectionRepository = {
      initialize: () => undefined,
      loadWorkTracking: () => undefined,
      saveWorkTracking: () => {
        throw new Error('Projection database is read-only.');
      },
      loadContinuousIntegration: () => undefined,
      saveContinuousIntegration: () => undefined,
      loadPullRequests: () => undefined,
      savePullRequests: () => undefined,
      removeWorkspace: () => undefined,
    };
    // act
    const fixture = createFixture(
      false,
      true,
      'Plan persisted.',
      'qualified',
      false,
      true,
      remoteProjections,
    );

    // assert
    await expect(fixture.snapshots.snapshot()).resolves.toMatchObject({
      workItems: [expect.objectContaining({ id: 'item-1' })],
      remoteData: { workItems: { state: 'current' } },
    });
  });

  it('starts a selected item from the loaded board without reloading the tracker', async () => {
    // arrange
    const fixture = createFixture(false);
    await fixture.snapshots.snapshot();

    await fixture.service.start(false, 'item-1');
    // act
    await fixture.terminalEvent;

    // assert
    expect(fixture.getWorkItemReads()).toBe(1);
  });
});

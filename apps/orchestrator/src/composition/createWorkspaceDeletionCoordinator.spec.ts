// #region Imports
import { describe, expect, it } from 'vitest';
import { createDefaultApplicationSettings } from '@symphony/configuration-composition';
import { type ICreateWorkspaceDeletionCoordinatorDependencies } from './ICreateWorkspaceDeletionCoordinatorDependencies';
import { createWorkspaceDeletionCoordinator } from './createWorkspaceDeletionCoordinator';
// #endregion

function deletionFixture(failRuntime = false) {
  const initial = createDefaultApplicationSettings('/tmp/symphony-deletion-test');
  const first = initial.workspaces[0];
  if (!first) throw new Error('Default workspace missing');
  const settingsState = {
    current: {
      ...initial,
      workspaces: [
        ...initial.workspaces,
        { ...first, id: 'deletion-target', displayName: 'Deletion target' },
      ],
    },
    save: (settings: typeof initial) => {
      order.push('save');
      return settings;
    },
  };
  const order: string[] = [];
  const dependencies: ICreateWorkspaceDeletionCoordinatorDependencies = {
    settingsState,
    workItemService: { hasActiveDraftForWorkspace: () => false },
    service: {
      clearWorkspace: async () => {
        order.push('clear');
        return { removed: 1, missing: 0, skipped: 0, failed: 0 };
      },
    },
    operationalRepositories: {
      removeWorkspaceData: () => {
        order.push('operational');
      },
    },
    agentAccountCooldowns: {
      clearWorkspace: () => {
        order.push('cooldown');
      },
    },
    agentRouteGovernor: {
      removeWorkspace: () => {
        order.push('governor');
      },
    },
    agentModelLockout: {
      clearWorkspace: () => {
        order.push('lockout');
      },
    },
    runtimeRepositories: {
      removeWorkspace: () => {
        order.push('runtime');
        if (failRuntime) throw new Error('Runtime cleanup failed');
      },
    },
    remoteProjectionCache: {
      removeWorkspace: () => {
        order.push('projections');
      },
    },
    workspaceDatabases: {
      closeWorkspace: () => {
        order.push('close');
      },
    },
    workspaceStoragePaths: () => [],
    normalizeMachinePaths: (settings) => settings,
    ensureWorkspaceRoot: () => {
      order.push('root');
    },
    synchronizeRemoteAutomation: async () => {
      order.push('automation');
    },
    synchronizeFeedbackIntake: async () => {
      order.push('feedback');
    },
    runAutonomousCycle: async () => {
      order.push('autonomy');
    },
  };
  return {
    order,
    settingsState,
    dependencies,
    coordinator: createWorkspaceDeletionCoordinator(dependencies),
  };
}

describe('createWorkspaceDeletionCoordinator', () => {
  it('cleans all existing families before closing their shared registry and saving settings', async () => {
    // arrange
    const fixture = deletionFixture();
    // act
    const result = await fixture.coordinator.deleteWorkspace('deletion-target');
    // assert
    expect(fixture.order).toEqual([
      'clear',
      'operational',
      'cooldown',
      'governor',
      'lockout',
      'runtime',
      'projections',
      'close',
      'save',
      'root',
      'automation',
      'feedback',
      'autonomy',
    ]);
    expect(result).toBe(fixture.settingsState.current);
    expect(result.workspaces.some((workspace) => workspace.id === 'deletion-target')).toBe(false);
    expect(fixture.coordinator.deletingWorkspaceIds().size).toBe(0);
  });

  it('restores the same settings owner and releases the deletion guard after cleanup failure', async () => {
    // arrange
    const fixture = deletionFixture(true);
    const previous = fixture.settingsState.current;
    // act
    await expect(fixture.coordinator.deleteWorkspace('deletion-target')).rejects.toThrow(
      'Runtime cleanup failed',
    );
    // assert
    expect(fixture.settingsState.current).toBe(previous);
    expect(fixture.order).toEqual([
      'clear',
      'operational',
      'cooldown',
      'governor',
      'lockout',
      'runtime',
    ]);
    expect(fixture.coordinator.deletingWorkspaceIds().size).toBe(0);
  });

  it('refuses an active draft before clearing or replacing workspace state', async () => {
    // arrange
    const fixture = deletionFixture();
    const coordinator = createWorkspaceDeletionCoordinator({
      ...fixture.dependencies,
      workItemService: { hasActiveDraftForWorkspace: () => true },
    });
    const previous = fixture.settingsState.current;
    // act
    await expect(coordinator.deleteWorkspace('deletion-target')).rejects.toThrow(
      'active work-item draft',
    );
    // assert
    expect(fixture.order).toEqual([]);
    expect(fixture.settingsState.current).toBe(previous);
    expect(coordinator.deletingWorkspaceIds().size).toBe(0);
  });
});

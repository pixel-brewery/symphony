// #region Imports
import { describe, expect, it } from 'vitest';
import {
  createDefaultApplicationSettings,
  type IApplicationSettings,
} from '@symphony/configuration-composition';
import { type IActiveLocalCiRun } from '../features/ci/IActiveLocalCiRun';
import { createSettingsRequests } from './createSettingsRequests';
// #endregion

function settingsFixture() {
  const initial = createDefaultApplicationSettings('/tmp/symphony-settings-requests');
  const order: string[] = [];
  const deleting = new Set<string>();
  const active = new Map<string, IActiveLocalCiRun>();
  const settingsState = {
    current: initial,
    save: (settings: IApplicationSettings) => {
      order.push('save');
      return settings;
    },
  };
  const requests = createSettingsRequests({
    settingsState,
    deletingWorkspaceIds: () => deleting,
    activeLocalCiRuns: () => active,
    localCiEnabledWorkspaceIds: (settings) =>
      settings.workspaces
        .filter((workspace) => workspace.localCiEnabled)
        .map((workspace) => workspace.id)
        .toSorted()
        .join(','),
    normalizeMachinePaths: (settings) => settings,
    ensureWorkspaceRoot: () => {
      order.push('root');
    },
    agentModelLockout: {
      clear: () => {
        order.push('clear-lockout');
      },
    },
    agentAccountCooldowns: {
      clearWorkspace: () => {
        order.push('clear-cooldown');
      },
    },
    service: {
      cleanupEligibleWorkspaces: async () => {
        order.push('cleanup');
      },
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
  });
  const save = requests.handlers.find((handler) => handler.method === 'settings.save');
  if (!save) throw new Error('Settings save handler missing');
  return { initial, order, deleting, active, settingsState, save };
}

describe('createSettingsRequests', () => {
  it('ensures the root before the full save and retains cleanup without restarting providers for a board layout change', async () => {
    // arrange
    const fixture = settingsFixture();
    const next = {
      ...fixture.initial,
      activeViewScope: { ...fixture.initial.activeViewScope, boardLayout: 'grouped' },
    };
    // act
    const result = await fixture.save.execute({ settings: next }, () => undefined);
    // assert
    expect(result).toBe(fixture.settingsState.current);
    expect(fixture.settingsState.current.activeViewScope.boardLayout).toBe('grouped');
    expect(fixture.order[0]).toBe('root');
    expect(fixture.order[1]).toBe('save');
    expect(fixture.order).toContain('cleanup');
    expect(fixture.order).not.toContain('automation');
    expect(fixture.order).not.toContain('feedback');
    expect(fixture.order).not.toContain('autonomy');
  });

  it('refuses a local-CI configuration change while the admitted run remains active', async () => {
    // arrange
    const fixture = settingsFixture();
    fixture.active.set('ci-run', {
      controller: new AbortController(),
      completion: Promise.resolve(),
      startedAt: '2026-10-30T08:00:00.000Z',
    });
    const next = {
      ...fixture.initial,
      runtime: { ...fixture.initial.runtime, workspaceRoot: '/tmp/another-ci-root' },
    };
    // act
    const result = fixture.save.execute({ settings: next }, () => undefined);
    // assert
    await expect(result).rejects.toThrow('Stop the active local CI run');
    expect(fixture.settingsState.current).toBe(fixture.initial);
    expect(fixture.order).toEqual([]);
  });

  it('refuses all settings changes during guarded workspace deletion', async () => {
    // arrange
    const fixture = settingsFixture();
    fixture.deleting.add('workspace');
    // act
    const result = fixture.save.execute({ settings: fixture.initial }, () => undefined);
    // assert
    await expect(result).rejects.toThrow('Wait for workspace deletion');
    expect(fixture.order).toEqual([]);
    expect(fixture.settingsState.current).toBe(fixture.initial);
  });
});

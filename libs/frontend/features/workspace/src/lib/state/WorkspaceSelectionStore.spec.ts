// @vitest-environment jsdom

// #region Imports

import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import type {
  ApplicationSettingsDto,
  IOrchestrationSnapshot,
} from '@symphony/ipc-contracts-composition';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WORKSPACE_CONFIGURATION } from '../ports/WorkspaceConfigurationToken';
import { WORKSPACE_CONTEXT } from '../ports/WorkspaceContextToken';
import { WORKSPACE_REFRESH } from '../ports/WorkspaceRefreshToken';
import { WORKSPACE_REFRESH_PARTICIPANTS } from '@symphony/frontend-core';
import { WorkspaceSelectionStore } from './WorkspaceSelectionStore';
// #endregion

function settingsWithServicewareWorkspace() {
  const defaults = createDefaultApplicationSettings('/tmp');
  return applicationSettingsSchema.parse({
    ...defaults,
    workspaces: [
      ...defaults.workspaces,
      {
        id: 'serviceware',
        displayName: 'Serviceware',
        shortCode: 'SW',
        color: '#c42b1c',
        enabled: true,
        isolation: 'strict',
        storageLimitGiB: 20,
        localCiEnabled: false,
        automaticDeliveryGroupingEnabled: false,
      },
    ],
  });
}

function createState() {
  const settings = signal<ApplicationSettingsDto | undefined>(undefined);
  const snapshot = signal<IOrchestrationSnapshot | undefined>(undefined);
  return {
    settings,
    snapshot,
    availableBoards: computed(
      () =>
        settings()?.workItemSources.filter(
          (source) =>
            source.enabled && settings()?.activeViewScope.workspaceIds.includes(source.workspaceId),
        ) ?? [],
    ),
    scopedWorkItems: computed(
      () =>
        snapshot()?.workItems.filter((item) =>
          item.workspaceId
            ? settings()?.activeViewScope.workspaceIds.includes(item.workspaceId)
            : settings()?.workspaces.length === 1,
        ) ?? [],
    ),
  };
}

describe('WorkspaceSelectionStore', () => {
  let state: ReturnType<typeof createState>;
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  beforeEach(() => {
    TestBed.resetTestingModule();
    state = createState();
    TestBed.configureTestingModule({
      providers: [WorkspaceSelectionStore, { provide: WORKSPACE_CONTEXT, useValue: state }],
    });
  });
  afterAll(() => TestBed.resetTestEnvironment());

  it('replaces the active workspace when the global workspace changes', async () => {
    // arrange
    const saveSettings = vi.fn().mockResolvedValue(false);
    TestBed.configureTestingModule({
      providers: [
        { provide: WORKSPACE_CONFIGURATION, useValue: { saveSettings } },
        { provide: WORKSPACE_REFRESH_PARTICIPANTS, useValue: [{ refresh: vi.fn() }] },
        { provide: WORKSPACE_REFRESH, useValue: {} },
      ],
    });
    const store = TestBed.inject(WorkspaceSelectionStore);
    state.settings.set(settingsWithServicewareWorkspace());

    // act
    await store.selectWorkspaceScope('serviceware');

    // assert
    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        activeViewScope: expect.objectContaining({ workspaceIds: ['serviceware'] }),
      }),
      false,
    );
  });

  it('refreshes a selected workspace when optional feature participants are absent', async () => {
    // arrange
    const refresh = vi.fn().mockResolvedValue(undefined);
    const loadCachedSnapshotForWorkspace = vi.fn().mockResolvedValue(undefined);
    const refreshContinuousIntegrationUsage = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: WORKSPACE_CONFIGURATION,
          useValue: {
            saveSettings: vi.fn().mockResolvedValue(true),
            refreshContinuousIntegrationUsage,
          },
        },
        {
          provide: WORKSPACE_REFRESH,
          useValue: { refresh, loadCachedSnapshotForWorkspace },
        },
      ],
    });
    state.settings.set(settingsWithServicewareWorkspace());
    const store = TestBed.inject(WorkspaceSelectionStore);

    // act
    await store.selectWorkspaceScope('serviceware');

    // assert
    expect(loadCachedSnapshotForWorkspace).toHaveBeenCalledExactlyOnceWith('serviceware');
    expect(refresh).toHaveBeenCalledOnce();
    expect(refreshContinuousIntegrationUsage).toHaveBeenCalledExactlyOnceWith(undefined, true);
  });

  it('loads the cached target board before forcing its provider refresh', async () => {
    // arrange
    const calls: string[] = [];
    const servicewareSnapshot = {
      workItems: [
        {
          id: 'serviceware-item',
          workspaceId: 'serviceware',
          sourceId: 'project',
          externalId: '#18',
          title: 'Edge Connector status',
          body: '',
          detailState: 'summary',
          bodyFormat: 'markdown',
          stageId: 'acceptance',
          boardColumnId: 'acceptance',
          provider: 'github-projects',
          repository: 'example/platform',
          repositoryBindingIds: ['repository'],
          projectFields: [],
          labels: [],
          assignees: [],
        },
      ],
      projectFields: [],
      boardColumns: [{ id: 'acceptance', label: 'Acceptance', stageId: 'acceptance' }],
      pullRequests: [],
      ciWorkflows: [],
      ciRuns: [],
      executions: [],
      executionQueue: [],
      remoteData: { workItems: { state: 'live' } },
    } as unknown as IOrchestrationSnapshot;
    const configuration = {
      saveSettings: vi.fn(async (next: unknown) => {
        state.settings.set(applicationSettingsSchema.parse(next));
        return true;
      }),
      refreshContinuousIntegrationUsage: vi.fn().mockResolvedValue(undefined),
    };
    const synchronizer = {
      loadCachedSnapshotForWorkspace: vi.fn(async () => {
        calls.push('cache');
        state.snapshot.set(servicewareSnapshot);
      }),
      refresh: vi.fn(async () => {
        calls.push('refresh');
      }),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: WORKSPACE_CONFIGURATION, useValue: configuration },
        {
          provide: WORKSPACE_REFRESH_PARTICIPANTS,
          useValue: [{ refresh: vi.fn().mockResolvedValue(undefined) }],
        },
        { provide: WORKSPACE_REFRESH, useValue: synchronizer },
      ],
    });
    state.settings.set(settingsWithServicewareWorkspace());
    const store = TestBed.inject(WorkspaceSelectionStore);

    // act
    await store.selectWorkspaceScope('serviceware');

    // assert
    expect(calls).toEqual(['cache', 'refresh']);
    expect(state.scopedWorkItems()).toEqual([
      expect.objectContaining({ id: 'serviceware-item', workspaceId: 'serviceware' }),
    ]);
  });
});

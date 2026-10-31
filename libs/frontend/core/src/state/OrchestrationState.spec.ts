// #region Imports
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import type { IOrchestrationSnapshot } from '@symphony/ipc-contracts-composition';
import { describe, expect, it } from 'vitest';
import { OrchestrationState } from './OrchestrationState';
// #endregion

function snapshotWithWorkspaceItems(): IOrchestrationSnapshot {
  const baseItem = {
    id: 'flamox-item',
    workspaceId: 'flamox',
    sourceId: 'project',
    externalId: '#18',
    title: 'Period picker',
    body: '',
    detailState: 'summary',
    bodyFormat: 'markdown',
    stageId: 'ready',
    boardColumnId: 'ready',
    provider: 'github-projects',
    repository: 'example/platform',
    repositoryBindingIds: ['repository'],
    projectFields: [],
    labels: [],
    assignees: [],
  } as const;
  return {
    workItems: [
      baseItem,
      {
        ...baseItem,
        id: 'serviceware-item',
        workspaceId: 'serviceware',
        title: 'Edge Connector status',
      },
    ],
    projectFields: [],
    boardColumns: [{ id: 'ready', label: 'Ready', stageId: 'ready' }],
    pullRequests: [],
    ciWorkflows: [],
    ciRuns: [],
    executions: [],
    executionQueue: [],
    remoteData: { workItems: { state: 'live' } },
  } as unknown as IOrchestrationSnapshot;
}

describe('OrchestrationState', () => {
  it('projects work items only from the selected workspace', () => {
    // arrange
    const state = new OrchestrationState();
    const defaults = createDefaultApplicationSettings('/tmp');
    state.settings.set(
      applicationSettingsSchema.parse({
        ...defaults,
        workspaces: [
          ...defaults.workspaces,
          {
            id: 'flamox',
            displayName: 'FLAMOX365',
            shortCode: 'FL',
            color: '#4f6bed',
            enabled: true,
            isolation: 'strict',
            storageLimitGiB: 20,
            localCiEnabled: false,
            automaticDeliveryGroupingEnabled: false,
          },
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
        activeViewScope: { ...defaults.activeViewScope, workspaceIds: ['serviceware'] },
      }),
    );
    state.snapshot.set(snapshotWithWorkspaceItems());

    // act
    const visibleIds = state.scopedWorkItems().map((item) => item.id);

    // assert
    expect(visibleIds).toEqual(['serviceware-item']);
  });
});

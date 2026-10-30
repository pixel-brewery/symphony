// #region Imports

import { describe, expect, it } from 'vitest';
import { createDefaultApplicationSettings } from '@symphony/configuration-composition';
import type { IApplicationSettings } from '@symphony/configuration-composition';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import { GitHubDeliveryAdapter } from './GitHubDeliveryAdapter';

// #endregion

function settings(): IApplicationSettings {
  return {
    ...createDefaultApplicationSettings(),
    repositoryBindings: [
      {
        id: 'repo',
        workspaceId: 'personal',
        sourceControlConnectionId: 'github',
        provider: 'github',
        host: 'github.com',
        owner: 'owner',
        name: 'repo',
        displayName: 'Repository',
        defaultBranch: 'main',
        localPath: '',
        enabled: true,
      },
    ],
    deliveryTargets: [
      {
        id: 'stable',
        workspaceId: 'personal',
        repositoryBindingId: 'repo',
        kind: 'release-channel',
        displayName: 'Stable',
        environment: 'stable',
        production: false,
      },
      {
        id: 'canary',
        workspaceId: 'personal',
        repositoryBindingId: 'repo',
        kind: 'release-channel',
        displayName: 'Canary',
        environment: 'canary',
        production: false,
      },
      {
        id: 'desktop',
        workspaceId: 'personal',
        repositoryBindingId: 'repo',
        kind: 'installation',
        displayName: 'Desktop installation',
        environment: 'desktop',
        production: false,
      },
    ],
  };
}
const item: IWorkItem = {
  id: 'ticket',
  workspaceId: 'personal',
  externalId: '#42',
  externalUrl: 'https://github.com/owner/repo/issues/42',
  title: 'Deliver change',
  body: '',
  provider: 'github-projects',
  repository: 'owner/repo',
  repositoryBindingIds: ['repo'],
  labels: [],
  assignees: [],
};
const execution: IExecutionRecord = {
  id: 'execution',
  workItemId: 'ticket',
  state: 'succeeded',
  workflowId: 'workflow',
  startedAt: '2026-10-06T10:00:00Z',
  pullRequest: {
    number: 42,
    externalUrl: 'https://github.com/owner/repo/pull/42',
    branchUrl: 'https://github.com/owner/repo/tree/symphony/execution',
  },
  bindingSnapshot: {
    workspaceId: 'personal',
    deliveryContextId: 'context',
    workItemSourceId: 'source',
    workTrackingConnectionId: 'tracker',
    repositoryBindingIds: ['repo'],
    sourceControlConnectionIds: ['github'],
    ciBindingIds: [],
    skillFlowRole: 'solution',
    agentTeamId: 'team',
    positionId: 'position',
    agentRoutePolicyId: 'route',
    aiConnectionId: 'cli',
    agentProfileId: 'employee',
    model: null,
    reasoningEffort: null,
  },
};

describe('GitHubDeliveryAdapter', () => {
  it('proves ticket inclusion by PR revision and ancestry, distinguishes channels and requires an installation receipt', async () => {
    // arrange
    let channelTag = 'v1';
    let receipt = false;
    const read = async (_repository: string, path: string): Promise<unknown> => {
      if (path.startsWith('deployments?'))
        return [
          {
            id: 2,
            environment: 'production',
            sha: 'new',
            ref: 'v2',
            production_environment: true,
            created_at: '2026-10-06T12:00:00Z',
          },
          {
            id: 1,
            environment: 'preview',
            sha: 'old',
            ref: 'v1',
            created_at: '2026-10-06T11:00:00Z',
          },
          {
            id: 3,
            environment: 'desktop',
            sha: 'new',
            ref: 'v2',
            created_at: '2026-10-06T12:01:00Z',
            payload: receipt ? { symphony: { kind: 'installation', version: 'v2' } } : {},
          },
        ];
      if (path.startsWith('deployments/'))
        return [{ state: 'success', created_at: '2026-10-06T12:02:00Z' }];
      if (path === 'pulls/42') return { merged: true, merge_commit_sha: 'merge' };
      if (path === 'compare/merge...new') return { status: 'ahead' };
      if (path === 'compare/merge...old') return { status: 'behind' };
      if (path === 'releases?per_page=100')
        return [1, 2].map((id) => ({
          id,
          tag_name: `v${id}`,
          published_at: `2026-10-0${id}T10:00:00Z`,
          draft: false,
          prerelease: id === 1,
          html_url: `https://github.com/owner/repo/releases/tag/v${id}`,
        }));
      if (path === 'releases/latest') return { id: 2 };
      if (path === 'contents/.symphony/release-channels.json')
        return {
          content: Buffer.from(
            JSON.stringify({ channels: { canary: { tag: channelTag } } }),
          ).toString('base64'),
        };
      if (path === 'commits/v1') return { sha: 'old' };
      if (path === 'commits/v2') return { sha: 'new' };
      throw new Error(`Unexpected read ${path}`);
    };
    const adapter = new GitHubDeliveryAdapter(
      settings,
      { request: async <T>(...args: Parameters<typeof read>) => (await read(...args)) as T },
      () => '2026-10-06T13:00:00Z',
    );
    // act
    const first = await adapter.refresh([item], [execution]);
    channelTag = 'v2';
    receipt = true;
    const next = await adapter.refresh([item], [execution]);
    // assert
    expect(first.evidence.find((entry) => entry.targetId === 'stable')).toMatchObject({
      kind: 'publication',
      version: 'v2',
      workItemIds: ['ticket'],
    });
    expect(first.evidence.find((entry) => entry.targetId === 'canary')).toMatchObject({
      version: 'v1',
      workItemIds: [],
    });
    expect(first.evidence.some((entry) => entry.kind === 'installation')).toBe(false);
    expect(next.evidence.find((entry) => entry.targetId === 'canary')).toMatchObject({
      version: 'v2',
      workItemIds: ['ticket'],
    });
    expect(next.evidence.find((entry) => entry.targetId === 'desktop')).toMatchObject({
      kind: 'installation',
      version: 'v2',
      workItemIds: ['ticket'],
    });
    expect(next.evidence.find((entry) => entry.id === 'repo:deployment:1')?.workItemIds).toEqual(
      [],
    );
  });
  it('keeps a failed account read distinct from an empty environment and offers an actionable refresh', async () => {
    // arrange
    const adapter = new GitHubDeliveryAdapter(
      settings,
      {
        request: async () => {
          throw new Error('403');
        },
      },
      () => '2026-10-06T13:00:00Z',
    );
    // act
    const result = await adapter.refresh([item], [execution]);
    // assert
    expect(result.evidence).toEqual([]);
    expect(result.errors[0]?.message).toContain('permissions');
    expect(result.targets).toHaveLength(3);
  });
  it('retains the actual active version after more than twenty failed deployment attempts', async () => {
    // arrange
    const configured = { ...settings(), deliveryTargets: [] };
    const records = Array.from({ length: 25 }, (_, index) => ({
      id: 25 - index,
      environment: 'production',
      sha: 'revision-' + (25 - index),
      ref: 'v' + (25 - index),
      production_environment: true,
      created_at: new Date(Date.UTC(2026, 9, 6, 10, 25 - index)).toISOString(),
    }));
    const adapter = new GitHubDeliveryAdapter(
      () => configured,
      {
        request: async <T>(_repository: string, path: string): Promise<T> =>
          (path.startsWith('deployments?')
            ? records
            : [
                {
                  state: path.startsWith('deployments/1/') ? 'success' : 'failure',
                  created_at: '2026-10-06T12:00:00Z',
                },
              ]) as T,
      },
      () => '2026-10-06T13:00:00Z',
    );
    // act
    const result = await adapter.refresh([], []);
    // assert
    expect(result.evidence.find((entry) => entry.state === 'succeeded')).toMatchObject({
      revision: 'revision-1',
      version: 'v1',
    });
    expect(result.evidence).toHaveLength(25);
  });
});

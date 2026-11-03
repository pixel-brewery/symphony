// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { createDefaultApplicationSettings } from '@symphony/configuration-composition';
import type { IApplicationSettings } from '@symphony/configuration-composition';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import { GitHubRequestGovernor } from '../github-request-governor/GitHubRequestGovernor';
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

  it('refreshes a large multi-environment history within the ordinary request budget while preserving active and inactive receipts', async () => {
    // arrange
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-06T13:00:00Z'));
    try {
      const configured = { ...settings(), deliveryTargets: [] };
      const records = Array.from({ length: 800 }, (_, index) => ({
        id: 800 - index,
        environment: `environment-${index % 8}`,
        sha: `revision-${800 - index}`,
        ref: `revision-${800 - index}`,
        created_at: '2026-10-06T12:00:00Z',
      }));
      let active = 0;
      let maximumActive = 0;
      let statusReads = 0;
      const pages: number[] = [];
      const adapter = new GitHubDeliveryAdapter(
        () => configured,
        {
          request: async <T>(_repository: string, path: string): Promise<T> => {
            if (path.startsWith('deployments?')) {
              const page = Number(new URLSearchParams(path.split('?')[1]).get('page'));
              pages.push(page);
              return records.slice((page - 1) * 100, page * 100) as T;
            }
            const id = Number(path.split('/')[1]);
            statusReads += 1;
            active += 1;
            maximumActive = Math.max(maximumActive, active);
            await new Promise<void>((resolve) => setTimeout(resolve, 800));
            active -= 1;
            return [
              {
                state: id > 792 ? 'success' : 'inactive',
                created_at: '2026-10-06T12:00:01Z',
              },
            ] as T;
          },
        },
        () => new Date().toISOString(),
      );
      const startedAt = Date.now();

      // act
      const refresh = adapter.refresh([], []);
      await vi.runAllTimersAsync();
      const result = await refresh;

      // assert
      expect(Date.now() - startedAt).toBeLessThan(35_000);
      expect(maximumActive).toBe(4);
      expect(statusReads).toBe(160);
      expect(pages).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(result.errors).toEqual([]);
      expect(result.targets).toHaveLength(8);
      expect(result.evidence).toHaveLength(160);
      expect(result.evidence.filter((entry) => entry.state === 'succeeded')).toHaveLength(8);
      expect(result.evidence.filter((entry) => entry.state === 'inactive')).toHaveLength(152);
      expect(result.evidence.map((entry) => entry.revision)).toEqual(
        records.slice(0, 160).map((record) => record.sha),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps healthy destinations and release channels when another destination is unreadable', async () => {
    // arrange
    const configured = {
      ...settings(),
      deliveryTargets: (settings().deliveryTargets ?? []).filter(
        (target) => target.id === 'stable',
      ),
    };
    const records = ['production', 'preview', 'production', 'other', 'preview'].map(
      (environment, index) => ({
        id: index + 1,
        environment,
        sha: `revision-${index + 1}`,
        ref: `revision-${index + 1}`,
        created_at: '2026-10-06T12:00:00Z',
      }),
    );
    const reads: string[] = [];
    const adapter = new GitHubDeliveryAdapter(
      () => configured,
      {
        request: async <T>(_repository: string, path: string): Promise<T> => {
          reads.push(path);
          if (path.startsWith('deployments?')) return records as T;
          if (path.startsWith('deployments/2/')) throw new Error('403');
          if (path.startsWith('deployments/'))
            return [{ state: 'success', created_at: '2026-10-06T12:00:01Z' }] as T;
          if (path === 'releases?per_page=100')
            return [
              {
                id: 1,
                tag_name: 'v1',
                published_at: '2026-10-06T12:00:00Z',
                draft: false,
                prerelease: false,
                html_url: 'https://github.com/owner/repo/releases/tag/v1',
              },
            ] as T;
          if (path === 'releases/latest') return { id: 1 } as T;
          if (path === 'commits/v1') return { sha: 'publication' } as T;
          throw new Error(`Unexpected read ${path}`);
        },
      },
      () => '2026-10-06T13:00:00Z',
    );

    // act
    const result = await adapter.refresh([], []);

    // assert
    expect(result.evidence.map((entry) => entry.revision)).toEqual([
      'revision-1',
      'revision-3',
      'revision-4',
      'publication',
    ]);
    expect(result.evidence.find((entry) => entry.targetId === 'stable')).toMatchObject({
      kind: 'publication',
      version: 'v1',
      state: 'succeeded',
    });
    expect(result.targets).toHaveLength(4);
    expect(result.errors).toEqual([
      expect.objectContaining({
        targetId: 'repo:environment:preview',
        message: expect.stringContaining('permissions'),
      }),
    ]);
    expect(reads).not.toContain('deployments/5/statuses?per_page=1');
  });

  it('keeps overlapping refreshes inside the existing account concurrency limit', async () => {
    // arrange
    vi.useFakeTimers();
    try {
      const configured = { ...settings(), deliveryTargets: [] };
      const governor = new GitHubRequestGovernor();
      const records = Array.from({ length: 8 }, (_, index) => ({
        id: index + 1,
        environment: 'production',
        sha: `revision-${index + 1}`,
        ref: `revision-${index + 1}`,
        created_at: '2026-10-06T12:00:00Z',
      }));
      let active = 0;
      let maximumActive = 0;
      const adapter = new GitHubDeliveryAdapter(
        () => configured,
        {
          request: async <T>(_repository: string, path: string): Promise<T> =>
            governor.run(async () => {
              if (path.startsWith('deployments?')) return records as T;
              active += 1;
              maximumActive = Math.max(maximumActive, active);
              await new Promise<void>((resolve) => setTimeout(resolve, 100));
              active -= 1;
              return [{ state: 'success', created_at: '2026-10-06T12:00:01Z' }] as T;
            }),
        },
        () => '2026-10-06T13:00:00Z',
      );

      // act
      const refreshes = Promise.all([adapter.refresh([], []), adapter.refresh([], [])]);
      await vi.runAllTimersAsync();
      const results = await refreshes;

      // assert
      expect(maximumActive).toBe(4);
      expect(active).toBe(0);
      expect(results.map((result) => result.evidence.length)).toEqual([8, 8]);
      expect(results.every((result) => result.errors.length === 0)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not query historical pull requests that cannot relate to the current item identities', async () => {
    // arrange
    const configured = { ...settings(), deliveryTargets: [] };
    const read = vi.fn(async (_repository: string, path: string): Promise<unknown> => {
      if (path.startsWith('deployments?'))
        return [
          {
            id: 1,
            environment: 'production',
            sha: 'delivered',
            ref: 'v1',
            created_at: '2026-10-06T12:00:00Z',
          },
        ];
      if (path.startsWith('deployments/'))
        return [{ state: 'success', created_at: '2026-10-06T12:00:01Z' }];
      throw new Error(`Unexpected read ${path}`);
    });
    const adapter = new GitHubDeliveryAdapter(
      () => configured,
      { request: async <T>(...args: Parameters<typeof read>) => (await read(...args)) as T },
      () => '2026-10-06T13:00:00Z',
    );

    // act
    const result = await adapter.refresh([], [execution]);

    // assert
    expect(result.errors).toEqual([]);
    expect(result.evidence).toEqual([
      expect.objectContaining({ state: 'succeeded', revision: 'delivered', workItemIds: [] }),
    ]);
    expect(read.mock.calls.map(([, path]) => path)).toEqual([
      'deployments?per_page=100&page=1',
      'deployments/1/statuses?per_page=1',
    ]);
  });

  it('bounds relevant ancestry reads and reuses proven relationships across refreshes', async () => {
    // arrange
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-06T13:00:00Z'));
    try {
      const configured = { ...settings(), deliveryTargets: [] };
      const items = Array.from({ length: 10 }, (_, index) => ({ ...item, id: `item-${index}` }));
      const executions = items.map((workItem, index) => ({
        ...execution,
        id: `execution-${index}`,
        workItemId: workItem.id,
        pullRequest: {
          number: index + 1,
          externalUrl: `https://github.com/owner/repo/pull/${index + 1}`,
          branchUrl: `https://github.com/owner/repo/tree/symphony/execution-${index}`,
        },
      }));
      const records = Array.from({ length: 30 }, (_, index) => ({
        id: index + 1,
        environment: `environment-${index % 3}`,
        sha: `delivered-${index}`,
        ref: `delivered-${index}`,
        created_at: '2026-10-06T12:00:00Z',
      }));
      let comparisons = 0;
      let active = 0;
      let maximumActive = 0;
      const adapter = new GitHubDeliveryAdapter(
        () => configured,
        {
          request: async <T>(_repository: string, path: string): Promise<T> => {
            if (path.startsWith('deployments?')) return records as T;
            if (path.startsWith('deployments/'))
              return [{ state: 'success', created_at: '2026-10-06T12:00:01Z' }] as T;
            if (path.startsWith('pulls/'))
              return { merged: true, merge_commit_sha: `merge-${path.split('/')[1]}` } as T;
            if (path.startsWith('compare/')) {
              comparisons += 1;
              active += 1;
              maximumActive = Math.max(maximumActive, active);
              await new Promise<void>((resolve) => setTimeout(resolve, 800));
              active -= 1;
              return { status: 'ahead' } as T;
            }
            throw new Error(`Unexpected read ${path}`);
          },
        },
        () => new Date().toISOString(),
      );
      const startedAt = Date.now();

      // act
      const first = adapter.refresh(items, executions);
      await vi.runAllTimersAsync();
      const result = await first;
      const repeated = await adapter.refresh(items, executions);

      // assert
      expect(Date.now() - startedAt).toBeLessThan(120_000);
      expect(maximumActive).toBe(4);
      expect(comparisons).toBe(300);
      expect(result.errors).toEqual([]);
      expect(result.evidence).toHaveLength(30);
      expect(result.evidence.every((entry) => entry.workItemIds.length === 10)).toBe(true);
      expect(repeated.evidence).toEqual(result.evidence);
    } finally {
      vi.useRealTimers();
    }
  });
});

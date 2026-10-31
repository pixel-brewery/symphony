// #region Imports

import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDefaultApplicationSettings } from '@symphony/configuration-composition';
import type { IApplicationSettings } from '@symphony/configuration-composition';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import { GitHubCloudProvider } from './GitHubCloudProvider';
import { GitHubRateLimitError } from '../github-request-governor/GitHubRateLimitError';

// #endregion

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('GitHubCloudProvider pull-request delivery', () => {
  it('accepts GitHub repository casing, commits pending changes, pushes only the implementation branch, and creates the PR', async () => {
    // arrange
    const workspacePath = mkdtempSync(join(tmpdir(), 'github-delivery-test-'));
    temporaryDirectories.push(workspacePath);
    const settings = deliverySettings(workspacePath);
    const realWorkspacePath = realpathSync(workspacePath);
    const commands: Array<{
      readonly command: string;
      readonly arguments_: readonly string[];
      readonly environment?: NodeJS.ProcessEnv;
    }> = [];
    const branch = 'codex/work-40-mandantenadministrator';
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (command, arguments_, environment) => {
        commands.push({ command: basename(command), arguments_, environment });
        if (command.endsWith('git')) {
          const gitArguments = arguments_.slice(2);
          if (gitArguments[0] === 'branch') return branch;
          if (gitArguments[0] === 'remote') return 'https://github.com/FLAMOX/Platform.git';
          if (gitArguments[0] === 'status') return ' M libs/example.ts';
          if (gitArguments[0] === 'rev-parse') return 'base-commit';
          if (gitArguments[0] === 'rev-list') return '1';
          return '';
        }
        const path = arguments_.at(-1) ?? '';
        if (path.includes('pulls?state=open')) return '[]';
        if (path.endsWith('/pulls')) {
          return JSON.stringify({
            number: 42,
            html_url: 'https://github.com/flamox/platform/pull/42',
          });
        }
        return '';
      },
    });
    const execution: IExecutionRecord = {
      id: 'execution-40',
      workspaceId: 'personal',
      workItemId: 'work-item-40',
      workflowId: 'default',
      kind: 'solution',
      state: 'succeeded',
      startedAt: '2026-08-11T08:00:00.000Z',
      finishedAt: '2026-08-11T08:10:00.000Z',
      workspacePath,
      workspaceReference: branch,
      summary: 'Activates the tenant administrator reliably.',
      deliveryGroupId: 'delivery-group-1',
      workItemIds: ['work-item-40', 'work-item-41'],
      workItemSnapshots: [
        {
          id: 'work-item-41',
          workspaceId: 'personal',
          externalId: 'CR-0041',
          externalUrl: 'https://github.com/flamox/platform/issues/41',
          title: 'Translate tenant administrator dialog',
          body: '',
          stageId: 'progress',
          provider: 'github-projects',
          repository: 'flamox/platform',
          repositoryBindingIds: ['repository-1'],
          labels: [],
          assignees: [],
        },
      ],
    };
    // act
    const workItem: IWorkItem = {
      id: 'work-item-40',
      workspaceId: 'personal',
      externalId: 'CR-0040',
      externalUrl: 'https://github.com/flamox/platform/issues/40',
      title: 'Activate tenant administrator reliably',
      body: '',
      stageId: 'progress',
      provider: 'github-projects',
      repository: 'flamox/platform',
      repositoryBindingIds: ['repository-1'],
      labels: [],
      assignees: [],
    };

    // assert
    await expect(provider.publishPullRequest(execution, workItem)).resolves.toEqual({
      number: 42,
      externalUrl: 'https://github.com/flamox/platform/pull/42',
      branchUrl: 'https://github.com/flamox/platform/tree/codex/work-40-mandantenadministrator',
    });
    expect(commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          command: 'git',
          arguments_: ['-C', realWorkspacePath, 'add', '--all'],
        }),
        expect.objectContaining({
          command: 'git',
          arguments_: ['-C', realWorkspacePath, 'push', '--set-upstream', 'origin', branch],
        }),
      ]),
    );
    expect(
      commands.some(
        (command) =>
          command.command === 'git' &&
          command.arguments_.includes('commit') &&
          command.arguments_.includes('CR-0040 Activate tenant administrator reliably'),
      ),
    ).toBe(true);
    const createRequest = commands.find(
      (command) => command.command === 'gh' && command.arguments_.at(-1)?.endsWith('/pulls'),
    );
    expect(createRequest?.arguments_).toEqual(
      expect.arrayContaining([
        '--method',
        'POST',
        '--raw-field',
        `head=${branch}`,
        '--raw-field',
        'base=main',
      ]),
    );
    // The closing keyword is the only thing GitHub reads as a link: a bare issue URL leaves the
    // issue's "Development" section empty and closes nothing on merge.
    const createdBody = createRequest?.arguments_.find((argument) => argument.startsWith('body='));
    expect(createdBody).toContain('Resolves #40');
    expect(createdBody).toContain('Resolves #41');
    const setupGit = commands.find(
      (command) => command.command === 'gh' && command.arguments_.includes('setup-git'),
    );
    expect(setupGit?.environment).toMatchObject({
      HOME: process.env['HOME'],
      GH_TOKEN: 'test-token',
      GITHUB_TOKEN: 'test-token',
    });
  });

  it('links an already open pull request that carries no reference to its issue', async () => {
    // A pull request opened before the link was part of the description would otherwise stay
    // unlinked for good, because delivery reuses the open pull request instead of opening a new one.
    // arrange
    const workspacePath = mkdtempSync(join(tmpdir(), 'github-delivery-link-'));
    temporaryDirectories.push(workspacePath);
    const settings = deliverySettings(workspacePath);
    const branch = 'codex/work-40-mandantenadministrator';
    const commands: Array<{ readonly command: string; readonly arguments_: readonly string[] }> =
      [];
    // act
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (command, arguments_) => {
        commands.push({ command: basename(command), arguments_ });
        if (command.endsWith('git')) {
          const gitArguments = arguments_.slice(2);
          if (gitArguments[0] === 'branch') return branch;
          if (gitArguments[0] === 'remote') return 'https://github.com/flamox/platform.git';
          if (gitArguments[0] === 'status') return '';
          if (gitArguments[0] === 'rev-parse') return 'base-commit';
          if (gitArguments[0] === 'rev-list') return '1';
          return '';
        }
        const path = arguments_.at(-1) ?? '';
        if (path.includes('pulls?state=open')) {
          return JSON.stringify([
            {
              number: 42,
              html_url: 'https://github.com/flamox/platform/pull/42',
              body: 'Reviewer notes that must survive.',
            },
          ]);
        }
        return '{}';
      },
    });

    // assert
    await expect(
      provider.publishPullRequest(deliveryExecution(workspacePath, branch), issueWorkItem()),
    ).resolves.toMatchObject({ number: 42 });

    const patch = commands.find((command) => command.arguments_.includes('PATCH'));
    expect(patch?.arguments_.at(-1)).toBe('repos/flamox/platform/pulls/42');
    expect(patch?.arguments_.find((argument) => argument.startsWith('body='))).toBe(
      'body=Reviewer notes that must survive.\n\nCloses #40',
    );
    expect(commands.some((command) => command.arguments_.at(-1)?.endsWith('/pulls'))).toBe(false);
  });

  it('leaves a pull request untouched when it already closes its issue', async () => {
    // arrange
    const workspacePath = mkdtempSync(join(tmpdir(), 'github-delivery-linked-'));
    temporaryDirectories.push(workspacePath);
    const settings = deliverySettings(workspacePath);
    const branch = 'codex/work-40-mandantenadministrator';
    const commands: Array<{ readonly command: string; readonly arguments_: readonly string[] }> =
      [];
    // act
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (command, arguments_) => {
        commands.push({ command: basename(command), arguments_ });
        if (command.endsWith('git')) {
          const gitArguments = arguments_.slice(2);
          if (gitArguments[0] === 'branch') return branch;
          if (gitArguments[0] === 'remote') return 'https://github.com/flamox/platform.git';
          if (gitArguments[0] === 'status') return '';
          if (gitArguments[0] === 'rev-parse') return 'base-commit';
          if (gitArguments[0] === 'rev-list') return '1';
          return '';
        }
        const path = arguments_.at(-1) ?? '';
        if (path.includes('pulls?state=open')) {
          return JSON.stringify([
            {
              number: 42,
              html_url: 'https://github.com/flamox/platform/pull/42',
              body: 'Done.\n\nFixes #40',
            },
          ]);
        }
        return '{}';
      },
    });

    // assert
    await expect(
      provider.publishPullRequest(deliveryExecution(workspacePath, branch), issueWorkItem()),
    ).resolves.toMatchObject({ number: 42 });

    expect(commands.some((command) => command.arguments_.includes('PATCH'))).toBe(false);
  });

  it('keeps a plain reference for a work item that is not a GitHub issue', async () => {
    // arrange
    const workspacePath = mkdtempSync(join(tmpdir(), 'github-delivery-foreign-'));
    temporaryDirectories.push(workspacePath);
    const settings = deliverySettings(workspacePath);
    const branch = 'codex/work-40-mandantenadministrator';
    const commands: Array<{ readonly command: string; readonly arguments_: readonly string[] }> =
      [];
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (command, arguments_) => {
        commands.push({ command: basename(command), arguments_ });
        if (command.endsWith('git')) {
          const gitArguments = arguments_.slice(2);
          if (gitArguments[0] === 'branch') return branch;
          if (gitArguments[0] === 'remote') return 'https://github.com/flamox/platform.git';
          if (gitArguments[0] === 'status') return '';
          if (gitArguments[0] === 'rev-parse') return 'base-commit';
          if (gitArguments[0] === 'rev-list') return '1';
          return '';
        }
        const path = arguments_.at(-1) ?? '';
        if (path.includes('pulls?state=open')) return '[]';
        if (path.endsWith('/pulls')) {
          return JSON.stringify({
            number: 43,
            html_url: 'https://github.com/flamox/platform/pull/43',
          });
        }
        return '{}';
      },
    });

    await provider.publishPullRequest(deliveryExecution(workspacePath, branch), {
      ...issueWorkItem(),
      provider: 'azure-devops',
      externalUrl: 'https://dev.azure.com/flamox/Platform/_workitems/edit/40',
    });

    // act
    const body = commands
      .find((command) => command.arguments_.at(-1)?.endsWith('/pulls'))
      ?.arguments_.find((argument) => argument.startsWith('body='));
    // A keyword GitHub cannot resolve would claim a link that does not exist.
    // assert
    expect(body).toContain('Issue: https://dev.azure.com/flamox/Platform/_workitems/edit/40');
    expect(body).not.toContain('Closes');
  });

  it('inspects a pull request without mutating GitHub state', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-inspection');
    const commands: Array<{ readonly command: string; readonly arguments_: readonly string[] }> =
      [];
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (command, arguments_) => {
        commands.push({ command: basename(command), arguments_ });
        return JSON.stringify({
          number: 42,
          html_url: 'https://github.com/flamox/platform/pull/42',
          state: 'closed',
          draft: false,
          merged_at: '2026-08-12T08:30:00Z',
          mergeable: true,
          mergeable_state: 'clean',
        });
      },
    });
    const execution: IExecutionRecord = {
      id: 'execution-42',
      workspaceId: 'personal',
      workItemId: 'work-item-42',
      workflowId: 'default',
      kind: 'solution',
      state: 'succeeded',
      startedAt: '2026-08-12T08:00:00Z',
      pullRequest: {
        number: 42,
        externalUrl: 'https://github.com/flamox/platform/pull/42',
        branchUrl: 'https://github.com/flamox/platform/tree/codex/issue-42',
      },
    };
    // act
    const item: IWorkItem = {
      id: 'work-item-42',
      workspaceId: 'personal',
      externalId: '#42',
      title: 'Inspect delivery',
      body: '',
      stageId: 'acceptance',
      provider: 'github-projects',
      repository: 'flamox/platform',
      repositoryBindingIds: ['repository-1'],
      labels: [],
      assignees: [],
    };

    // assert
    await expect(provider.inspectPullRequest(execution, item)).resolves.toEqual({
      state: 'merged',
      draft: false,
      baseBranchStatus: 'current',
    });
    expect(commands).toEqual([
      expect.objectContaining({
        command: 'gh',
        arguments_: expect.arrayContaining(['--method', 'GET', 'repos/flamox/platform/pulls/42']),
      }),
    ]);
  });

  it('reports a conflicting base branch when GitHub says the pull request is not mergeable', async () => {
    // GitHub reports mergeable=false with states other than "dirty" (for example "blocked"), so
    // the mergeable flag alone must already qualify the pull request as conflicting.
    // arrange
    const settings = deliverySettings('/tmp/symphony-conflict-inspection');
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async () =>
        JSON.stringify({
          number: 42,
          html_url: 'https://github.com/flamox/platform/pull/42',
          state: 'open',
          draft: false,
          merged_at: null,
          mergeable: false,
          mergeable_state: 'blocked',
        }),
    });
    const execution: IExecutionRecord = {
      id: 'execution-42',
      workspaceId: 'personal',
      workItemId: 'work-item-42',
      workflowId: 'default',
      kind: 'solution',
      state: 'succeeded',
      startedAt: '2026-08-12T08:00:00Z',
      pullRequest: {
        number: 42,
        externalUrl: 'https://github.com/flamox/platform/pull/42',
        branchUrl: 'https://github.com/flamox/platform/tree/codex/issue-42',
      },
    };

    // act
    const status = await provider.inspectPullRequest(execution, issueWorkItem());

    // assert
    expect(status).toEqual({ state: 'open', draft: false, baseBranchStatus: 'conflicting' });
  });

  it('updates a behind managed pull-request branch with the observed head revision', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-pull-request-update');
    const commands: Array<{ readonly command: string; readonly arguments_: readonly string[] }> =
      [];
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (command, arguments_) => {
        commands.push({ command: basename(command), arguments_ });
        return JSON.stringify({ message: 'Updating pull request branch.' });
      },
    });
    const execution: IExecutionRecord = {
      id: 'execution-42',
      workspaceId: 'personal',
      workItemId: 'work-item-42',
      workflowId: 'default',
      kind: 'solution',
      state: 'succeeded',
      startedAt: '2026-08-12T08:00:00Z',
      workspaceReference: 'codex/issue-42',
      pullRequest: {
        number: 42,
        externalUrl: 'https://github.com/flamox/platform/pull/42',
        branchUrl: 'https://github.com/flamox/platform/tree/codex/issue-42',
      },
    };

    // act
    await provider.updatePullRequestBranch(execution, issueWorkItem(), 'abc123');

    // assert
    expect(commands).toEqual([
      expect.objectContaining({
        command: 'gh',
        arguments_: expect.arrayContaining([
          '--method',
          'PUT',
          '--raw-field',
          'expected_head_sha=abc123',
          'repos/flamox/platform/pulls/42/update-branch',
        ]),
      }),
    ]);
  });
});

describe('GitHubCloudProvider pull-request collection', () => {
  it('lists the open pull requests from the selected GitHub repositories', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-pull-requests');
    const requests: string[] = [];
    // act
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      now: () => new Date('2026-08-14T15:00:00.000Z'),
      execute: async (_command, arguments_) => {
        const path = arguments_.at(-1) ?? '';
        requests.push(path);
        const pullRequest = {
          number: 203,
          html_url: 'https://github.com/flamox/platform/pull/203',
          title: 'Restore user invitation save action',
          state: 'open' as const,
          draft: false,
          user: { login: 'RueDeRennes' },
          head: { ref: 'fix/user-invitation' },
          base: { ref: 'main' },
          created_at: '2026-08-14T13:34:38Z',
          updated_at: '2026-08-14T14:20:00Z',
        };
        return path.includes('?state=open')
          ? JSON.stringify([pullRequest])
          : JSON.stringify({ ...pullRequest, mergeable: true, mergeable_state: 'behind' });
      },
    });

    // assert
    await expect(provider.listPullRequests()).resolves.toEqual([
      {
        id: 'repository-1:203',
        workspaceId: 'personal',
        repositoryBindingId: 'repository-1',
        number: 203,
        title: 'Restore user invitation save action',
        state: 'open',
        draft: false,
        author: 'RueDeRennes',
        sourceBranch: 'fix/user-invitation',
        targetBranch: 'main',
        baseBranchStatus: 'behind',
        externalUrl: 'https://github.com/flamox/platform/pull/203',
        createdAt: '2026-08-14T13:34:38Z',
        updatedAt: '2026-08-14T14:20:00Z',
      },
    ]);
    expect(requests).toEqual([
      'repos/flamox/platform/pulls?state=open&per_page=100&page=1',
      'repos/flamox/platform/pulls/203',
    ]);
  });

  it('reduces pending review requests to reviewer logins and organization team names', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-pull-request-reviewers');
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async () =>
        JSON.stringify([
          {
            number: 205,
            html_url: 'https://github.com/flamox/platform/pull/205',
            title: 'Export the audit log',
            state: 'open',
            draft: false,
            mergeable: true,
            mergeable_state: 'clean',
            head: { ref: 'feature/audit-export' },
            base: { ref: 'main' },
            requested_reviewers: [{ login: 'RueDeRennes', id: 7 }, { login: ' ' }, {}],
            requested_teams: [
              { slug: 'reviewers', organization: { login: 'flamox' } },
              { slug: 'platform' },
            ],
            created_at: '2026-08-14T13:34:38Z',
            updated_at: '2026-08-14T14:20:00Z',
          },
          {
            number: 206,
            html_url: 'https://github.com/flamox/platform/pull/206',
            title: 'Nobody asked',
            state: 'open',
            draft: true,
            mergeable: true,
            mergeable_state: 'clean',
            head: { ref: 'feature/nobody' },
            base: { ref: 'main' },
            requested_reviewers: [],
            requested_teams: null,
            created_at: '2026-08-14T13:34:38Z',
            updated_at: '2026-08-14T14:10:00Z',
          },
        ]),
    });

    // act
    const pullRequests = await provider.listPullRequests();

    // assert
    expect(pullRequests[0]).toMatchObject({
      number: 205,
      requestedReviewers: ['RueDeRennes'],
      requestedTeams: ['flamox/reviewers', 'flamox/platform'],
    });
    expect(pullRequests[1]).not.toHaveProperty('requestedReviewers');
    expect(pullRequests[1]).not.toHaveProperty('requestedTeams');
    expect(JSON.stringify(pullRequests)).not.toContain('"id":7');
  });

  it('fetches details only for pull requests without definitive mergeability and tolerates a failing detail fetch', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-pull-request-enrichment');
    const requests: string[] = [];
    const listedPullRequest = (
      number: number,
      updatedAt: string,
      mergeability: Partial<{ mergeable: boolean | null; mergeable_state: string }>,
    ) => ({
      number,
      html_url: `https://github.com/flamox/platform/pull/${number}`,
      title: `Pull request #${number}`,
      state: 'open' as const,
      draft: false,
      user: { login: 'RueDeRennes' },
      head: { ref: `fix/change-${number}` },
      base: { ref: 'main' },
      created_at: '2026-08-14T13:34:38Z',
      updated_at: updatedAt,
      ...mergeability,
    });
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (_command, arguments_) => {
        const path = arguments_.at(-1) ?? '';
        requests.push(path);
        if (path.includes('?state=open')) {
          return JSON.stringify([
            listedPullRequest(203, '2026-08-14T14:20:00Z', {
              mergeable: false,
              mergeable_state: 'dirty',
            }),
            listedPullRequest(204, '2026-08-14T14:30:00Z', {}),
          ]);
        }
        throw new Error('GitHub did not answer the pull-request detail request.');
      },
    });

    // act
    const pullRequests = await provider.listPullRequests();

    // assert
    expect(pullRequests).toEqual([
      expect.objectContaining({ number: 204, baseBranchStatus: 'unknown' }),
      expect.objectContaining({ number: 203, baseBranchStatus: 'conflicting' }),
    ]);
    expect(requests).toEqual([
      'repos/flamox/platform/pulls?state=open&per_page=100&page=1',
      'repos/flamox/platform/pulls/204',
    ]);
  });

  it('updates a listed pull-request branch with its freshly observed head revision', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-listed-pull-request-update');
    const commands: Array<readonly string[]> = [];
    let reads = 0;
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (_command, arguments_) => {
        commands.push([...arguments_]);
        const method = arguments_[arguments_.indexOf('--method') + 1];
        if (method === 'PUT') return JSON.stringify({ message: 'Updating pull request branch.' });
        reads += 1;
        return JSON.stringify({
          number: 203,
          html_url: 'https://github.com/flamox/platform/pull/203',
          title: 'Restore user invitation save action',
          state: 'open',
          draft: false,
          mergeable: true,
          mergeable_state: reads === 1 ? 'behind' : 'clean',
          user: { login: 'RueDeRennes' },
          head: { ref: 'fix/user-invitation', sha: reads === 1 ? 'old-head' : 'updated-head' },
          base: { ref: 'main' },
          created_at: '2026-08-14T13:34:38Z',
          updated_at: reads === 1 ? '2026-08-14T14:20:00Z' : '2026-08-14T15:01:00Z',
        });
      },
    });

    // act
    const updated = await provider.updateListedPullRequestBranch('repository-1', 203);

    // assert
    expect(updated).toMatchObject({
      id: 'repository-1:203',
      number: 203,
      updatedAt: '2026-08-14T15:01:00Z',
    });
    expect(commands).toHaveLength(3);
    expect(commands[1]).toEqual(
      expect.arrayContaining([
        '--method',
        'PUT',
        '--raw-field',
        'expected_head_sha=old-head',
        'repos/flamox/platform/pulls/203/update-branch',
      ]),
    );
  });

  it('treats an already current pull-request branch as an idempotent update', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-current-pull-request-update');
    const commands: Array<readonly string[]> = [];
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (_command, arguments_) => {
        commands.push([...arguments_]);
        return JSON.stringify({
          number: 203,
          html_url: 'https://github.com/flamox/platform/pull/203',
          title: 'Restore user invitation save action',
          state: 'open',
          draft: false,
          mergeable: true,
          mergeable_state: 'clean',
          user: { login: 'RueDeRennes' },
          head: { ref: 'fix/user-invitation', sha: 'current-head' },
          base: { ref: 'main' },
          created_at: '2026-08-14T13:34:38Z',
          updated_at: '2026-08-14T15:01:00Z',
        });
      },
    });

    // act
    const updated = await provider.updateListedPullRequestBranch('repository-1', 203);

    // assert
    expect(updated.baseBranchStatus).toBe('current');
    expect(commands).toHaveLength(1);
  });

  it('refuses to update a conflicting pull-request branch until its conflicts are resolved', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-conflicting-pull-request-update');
    const commands: Array<readonly string[]> = [];
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (_command, arguments_) => {
        commands.push([...arguments_]);
        return JSON.stringify(
          updatablePullRequestResponse({ mergeable: false, mergeable_state: 'dirty' }),
        );
      },
    });

    // act
    const update = provider.updateListedPullRequestBranch('repository-1', 203);

    // assert
    await expect(update).rejects.toThrow(
      'Resolve the pull-request branch conflicts before updating it.',
    );
    expect(commands).toHaveLength(1);
  });

  it('refuses to update a pull-request branch while GitHub is still calculating its status', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-unknown-pull-request-update');
    const commands: Array<readonly string[]> = [];
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (_command, arguments_) => {
        commands.push([...arguments_]);
        return JSON.stringify(
          updatablePullRequestResponse({ mergeable: null, mergeable_state: 'unknown' }),
        );
      },
    });

    // act
    const update = provider.updateListedPullRequestBranch('repository-1', 203);

    // assert
    await expect(update).rejects.toThrow(
      'GitHub has not finished calculating the pull-request branch status.',
    );
    expect(commands).toHaveLength(1);
  });

  it('refuses to update the branch of a pull request that is no longer open', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-closed-pull-request-update');
    const commands: Array<readonly string[]> = [];
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (_command, arguments_) => {
        commands.push([...arguments_]);
        return JSON.stringify(
          updatablePullRequestResponse({ state: 'closed', merged_at: '2026-08-14T14:45:00Z' }),
        );
      },
    });

    // act
    const update = provider.updateListedPullRequestBranch('repository-1', 203);

    // assert
    await expect(update).rejects.toThrow('Only an open pull-request branch can be updated.');
    expect(commands).toHaveLength(1);
  });
});

describe('GitHubCloudProvider workflow catalog', () => {
  it('lists repository workflows and detects workflow_dispatch from the default-branch YAML', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-workflows');
    // act
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (_command, arguments_) => {
        const path = arguments_.at(-1) ?? '';
        if (path.endsWith('/actions/workflows?per_page=100&page=1')) {
          return JSON.stringify({
            workflows: [
              {
                id: 101,
                name: 'PR Quality',
                path: '.github/workflows/ci.yml',
                state: 'active',
                html_url: 'https://github.com/flamox/platform/actions/workflows/ci.yml',
              },
              {
                id: 102,
                name: 'Cache Maintenance',
                path: '.github/workflows/cache.yml',
                state: 'disabled_manually',
              },
            ],
          });
        }
        if (path.includes('/contents/.github/workflows/ci.yml?ref=main')) {
          return JSON.stringify({
            type: 'file',
            encoding: 'base64',
            content: Buffer.from('on:\n  push:\n  workflow_dispatch:\n').toString('base64'),
          });
        }
        if (path.includes('/contents/.github/workflows/cache.yml?ref=main')) {
          return JSON.stringify({
            type: 'file',
            encoding: 'base64',
            content: Buffer.from('on:\n  schedule:\n    - cron: "0 4 * * *"\n').toString('base64'),
          });
        }
        throw new Error(`Unexpected GitHub path: ${path}`);
      },
    });

    // assert
    await expect(provider.listWorkflows()).resolves.toEqual([
      expect.objectContaining({
        id: 'ci-1:102',
        name: 'Cache Maintenance',
        state: 'disabled',
        supportsManualDispatch: false,
      }),
      expect.objectContaining({
        id: 'ci-1:101',
        name: 'PR Quality',
        state: 'active',
        supportsManualDispatch: true,
      }),
    ]);
  });

  it('does not hide a request limit reached while reading workflow capabilities', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-workflow-rate-limit');
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (_command, arguments_) => {
        const path = arguments_.at(-1) ?? '';
        if (path.endsWith('/actions/workflows?per_page=100&page=1')) {
          return JSON.stringify({
            workflows: [
              {
                id: 101,
                name: 'PR Quality',
                path: '.github/workflows/ci.yml',
                state: 'active',
              },
            ],
          });
        }
        throw new Error('gh: API rate limit exceeded (HTTP 403)');
      },
    });

    // act
    const workflows = provider.listWorkflows();

    // assert
    await expect(workflows).rejects.toBeInstanceOf(GitHubRateLimitError);
  });

  it('restores a workflow target before resolving its workspace after a provider restart', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-workflow-workspace');
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (_command, arguments_) => {
        const path = arguments_.at(-1) ?? '';
        if (path.endsWith('/actions/workflows?per_page=100&page=1')) {
          return JSON.stringify({
            workflows: [
              {
                id: 101,
                name: 'Deploy Dev',
                path: '.github/workflows/deploy.yml',
                state: 'active',
              },
            ],
          });
        }
        if (path.includes('/contents/.github/workflows/deploy.yml?ref=main')) {
          return JSON.stringify({
            type: 'file',
            encoding: 'base64',
            content: Buffer.from('on: workflow_dispatch\n').toString('base64'),
          });
        }
        throw new Error(`Unexpected GitHub path: ${path}`);
      },
    });

    // act
    const workspaceId = await provider.workflowWorkspaceId('ci-1:101');

    // assert
    expect(workspaceId).toBe('personal');
  });

  it('dispatches a selected workflow and returns the newly created provider-neutral run', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-workflow-dispatch');
    const requests: string[][] = [];
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      now: () => new Date('2026-08-16T13:00:00.000Z'),
      localRunnerPollMilliseconds: 0,
      execute: async (_command, arguments_) => {
        requests.push([...arguments_]);
        const path = arguments_.at(-1) ?? '';
        if (path.endsWith('/actions/workflows?per_page=100&page=1')) {
          return JSON.stringify({
            workflows: [
              {
                id: 101,
                name: 'Deploy Dev',
                path: '.github/workflows/deploy.yml',
                state: 'active',
              },
            ],
          });
        }
        if (path.includes('/contents/.github/workflows/deploy.yml?ref=main')) {
          return JSON.stringify({
            type: 'file',
            encoding: 'base64',
            content: Buffer.from('on: workflow_dispatch\n').toString('base64'),
          });
        }
        if (path.endsWith('/actions/workflows/101/dispatches')) {
          return [
            'HTTP/2.0 204 No Content',
            'X-Ratelimit-Limit: 5000',
            'X-Ratelimit-Remaining: 4999',
            'X-Ratelimit-Reset: 1786888800',
          ].join('\n');
        }
        if (path.includes('/actions/workflows/101/runs?event=workflow_dispatch&branch=main')) {
          return JSON.stringify({
            workflow_runs: [
              {
                id: 703,
                workflow_id: 101,
                name: 'Deploy Dev',
                display_title: 'Deploy Dev',
                event: 'workflow_dispatch',
                run_number: 353,
                actor: { login: 'RueDeRennes' },
                status: 'in_progress',
                head_branch: 'main',
                created_at: '2026-08-16T13:00:01.000Z',
              },
            ],
          });
        }
        throw new Error(`Unexpected GitHub path: ${path}`);
      },
    });

    // act
    const dispatch = provider.dispatchWorkflow('ci-1:101', 'main');

    // assert
    await expect(dispatch).resolves.toEqual(
      expect.objectContaining({
        id: 'ci-1:703',
        workflowId: 'ci-1:101',
        event: 'workflow_dispatch',
        actor: 'RueDeRennes',
        runNumber: 353,
        status: 'in-progress',
      }),
    );
    expect(
      requests.some(
        (request) =>
          request.includes('POST') &&
          request.includes('ref=main') &&
          request.at(-1)?.endsWith('/actions/workflows/101/dispatches'),
      ),
    ).toBe(true);
  });

  it('sends the managed local CI input when dispatching a prepared workflow locally', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-workflow-dispatch-local');
    const requests: string[][] = [];
    const workflowSource = [
      'on:',
      '    workflow_dispatch:',
      '        inputs:',
      '            symphony_local:',
      '                type: boolean',
      '                default: false',
      '',
    ].join('\n');
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      now: () => new Date('2026-08-16T13:00:00.000Z'),
      localRunnerPollMilliseconds: 0,
      execute: async (_command, arguments_) => {
        requests.push([...arguments_]);
        const path = arguments_.at(-1) ?? '';
        if (path.endsWith('/actions/workflows?per_page=100&page=1')) {
          return JSON.stringify({
            workflows: [
              {
                id: 101,
                name: 'Deploy Dev',
                path: '.github/workflows/deploy.yml',
                state: 'active',
              },
            ],
          });
        }
        if (path.includes('/contents/.github/workflows/deploy.yml?ref=main')) {
          return JSON.stringify({
            type: 'file',
            encoding: 'base64',
            content: Buffer.from(workflowSource).toString('base64'),
          });
        }
        if (path.endsWith('/actions/workflows/101/dispatches')) return '';
        if (path.includes('/actions/workflows/101/runs?event=workflow_dispatch&branch=main')) {
          return JSON.stringify({
            workflow_runs: [
              {
                id: 703,
                workflow_id: 101,
                name: 'Deploy Dev',
                display_title: 'Deploy Dev',
                event: 'workflow_dispatch',
                run_number: 353,
                actor: { login: 'RueDeRennes' },
                status: 'in_progress',
                head_branch: 'main',
                created_at: '2026-08-16T13:00:01.000Z',
              },
            ],
          });
        }
        throw new Error(`Unexpected GitHub path: ${path}`);
      },
    });

    // act
    await provider.listWorkflows();
    // assert
    await expect(provider.dispatchWorkflow('ci-1:101', 'main', { local: true })).resolves.toEqual(
      expect.objectContaining({ id: 'ci-1:703', event: 'workflow_dispatch' }),
    );
    expect(
      requests.some(
        (request) =>
          request.includes('POST') &&
          request.includes('ref=main') &&
          request.includes('inputs[symphony_local]=true') &&
          request.at(-1)?.endsWith('/actions/workflows/101/dispatches'),
      ),
    ).toBe(true);
  });

  it('refuses a local dispatch when the workflow does not declare the managed local CI input', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-workflow-dispatch-unprepared');
    const requests: string[][] = [];
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      now: () => new Date('2026-08-16T13:00:00.000Z'),
      localRunnerPollMilliseconds: 0,
      execute: async (_command, arguments_) => {
        requests.push([...arguments_]);
        const path = arguments_.at(-1) ?? '';
        if (path.endsWith('/actions/workflows?per_page=100&page=1')) {
          return JSON.stringify({
            workflows: [
              {
                id: 101,
                name: 'Deploy Dev',
                path: '.github/workflows/deploy.yml',
                state: 'active',
              },
            ],
          });
        }
        if (path.includes('/contents/.github/workflows/deploy.yml?ref=main')) {
          return JSON.stringify({
            type: 'file',
            encoding: 'base64',
            content: Buffer.from('on: workflow_dispatch\n').toString('base64'),
          });
        }
        throw new Error(`Unexpected GitHub path: ${path}`);
      },
    });

    // act
    await provider.listWorkflows();
    // assert
    await expect(provider.dispatchWorkflow('ci-1:101', 'main', { local: true })).rejects.toThrow(
      /not prepared for managed local CI/,
    );
    expect(
      requests.some((request) => request.at(-1)?.endsWith('/actions/workflows/101/dispatches')),
    ).toBe(false);
  });
});

describe('GitHubCloudProvider request budget', () => {
  it('uses REST response headers to block polling until the provider reset time', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-rest-rate-limit');
    const retryAt = '2099-08-19T11:00:00.000Z';
    let requests = 0;
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async () => {
        requests += 1;
        return [
          'HTTP/2 200 OK',
          'x-ratelimit-limit: 5000',
          'x-ratelimit-remaining: 0',
          `x-ratelimit-reset: ${Date.parse(retryAt) / 1_000}`,
          '',
          JSON.stringify({ workflow_runs: [] }),
        ].join('\n');
      },
    });
    await provider.listRuns();

    // act
    const nextPoll = provider.listRuns();

    // assert
    await expect(nextPoll).rejects.toMatchObject({
      name: 'GitHubRateLimitError',
      retryAt,
    } satisfies Partial<GitHubRateLimitError>);
    expect(requests).toBe(1);
  });
});

describe('GitHubCloudProvider Actions usage', () => {
  it('projects the current organization allowance and excludes larger-runner minutes', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-usage');
    // act
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      now: () => new Date('2026-08-14T12:00:00.000Z'),
      execute: async (_command, arguments_) => {
        const path = arguments_.at(-1) ?? '';
        if (path === 'repos/flamox/platform') {
          return JSON.stringify({ owner: { login: 'flamox', type: 'Organization' } });
        }
        if (path === 'orgs/flamox') return JSON.stringify({ plan: { name: 'team' } });
        if (path.startsWith('organizations/flamox/settings/billing/usage/summary?')) {
          return JSON.stringify({
            usageItems: [
              {
                product: 'Actions',
                sku: 'actions_linux',
                unitType: 'minutes',
                grossQuantity: 2_000,
              },
              {
                product: 'Actions',
                sku: 'actions_windows',
                unitType: 'minutes',
                grossQuantity: 500,
              },
              {
                product: 'Actions',
                sku: 'actions_linux_8_core',
                unitType: 'minutes',
                grossQuantity: 900,
              },
            ],
          });
        }
        throw new Error(`Unexpected GitHub path: ${path}`);
      },
    });

    // assert
    await expect(provider.readUsage(['repository-1'])).resolves.toEqual([
      {
        repositoryBindingId: 'repository-1',
        account: { type: 'organization', login: 'flamox', planName: 'team' },
        period: {
          startedAt: '2026-08-01T00:00:00.000Z',
          resetsAt: '2026-09-01T00:00:00.000Z',
        },
        minutes: {
          used: 2_500,
          included: 3_000,
          remaining: 500,
          usedPercent: 83,
          remainingPercent: 17,
        },
      },
    ]);
  });

  it('does not invent remaining minutes for an unknown or enterprise-managed plan', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-enterprise-usage');
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      now: () => new Date('2026-08-14T12:00:00.000Z'),
      execute: async (_command, arguments_) => {
        const path = arguments_.at(-1) ?? '';
        if (path === 'repos/flamox/platform') {
          return JSON.stringify({ owner: { login: 'flamox', type: 'Organization' } });
        }
        if (path === 'orgs/flamox') return JSON.stringify({ plan: { name: 'business' } });
        if (path.startsWith('organizations/flamox/settings/billing/usage/summary?')) {
          return JSON.stringify({
            usageItems: [
              {
                product: 'Actions',
                sku: 'actions_linux',
                unitType: 'minutes',
                grossQuantity: 50_000,
              },
            ],
          });
        }
        throw new Error(`Unexpected GitHub path: ${path}`);
      },
    });

    // act
    const [report] = await provider.readUsage(['repository-1']);

    // assert
    expect(report?.minutes).toEqual({ used: 50_000 });
    expect(report?.minutes?.remaining).toBeUndefined();
  });

  it('returns a bounded permission message without exposing the provider response', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-permission-usage');
    // act
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async () => {
        throw new Error('HTTP 403: secret provider response body');
      },
    });

    // assert
    await expect(provider.readUsage(['repository-1'])).resolves.toEqual([
      {
        repositoryBindingId: 'repository-1',
        error: 'GitHub billing usage requires account-owner or billing-manager access.',
      },
    ]);
  });
});

describe('GitHubCloudProvider Action details', () => {
  it('promotes a queued workflow summary when one current-attempt job is in progress', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-action-summary');
    // act
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (_command, arguments_) => {
        const path = arguments_.at(-1) ?? '';
        if (path.endsWith('/actions/runs?per_page=50')) {
          return JSON.stringify({
            workflow_runs: [{ id: 203, name: 'PR Quality', status: 'queued' }],
          });
        }
        if (path.endsWith('/actions/runs/203/jobs?filter=all&per_page=100')) {
          return JSON.stringify({
            jobs: [
              {
                id: 42,
                run_attempt: 2,
                status: 'in_progress',
              },
              {
                id: 43,
                run_attempt: 3,
                status: 'queued',
              },
              {
                id: 44,
                run_attempt: 3,
                status: 'in_progress',
              },
            ],
          });
        }
        throw new Error(`Unexpected GitHub path: ${path}`);
      },
    });

    // assert
    await expect(provider.listRuns()).resolves.toEqual([
      expect.objectContaining({
        id: 'ci-1:203',
        status: 'in-progress',
      }),
    ]);
  });

  it('does not expose jobs from the previous attempt while a new attempt is being published', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-action-attempt-transition');
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (_command, arguments_) => {
        const path = arguments_.at(-1) ?? '';
        if (path.endsWith('/actions/runs?per_page=50')) {
          return JSON.stringify({
            workflow_runs: [{ id: 203, name: 'PR Quality', status: 'queued', run_attempt: 4 }],
          });
        }
        if (path.endsWith('/actions/runs/203/jobs?filter=all&per_page=100')) {
          return JSON.stringify({
            jobs: [
              {
                id: 44,
                run_attempt: 3,
                name: 'Old failed shard',
                status: 'completed',
                conclusion: 'failure',
              },
            ],
          });
        }
        if (path.endsWith('/actions/runs/203')) {
          return JSON.stringify({ id: 203, status: 'queued', run_attempt: 4 });
        }
        throw new Error(`Unexpected GitHub path: ${path}`);
      },
    });

    // act
    await provider.listRuns();
    // assert
    await expect(provider.getRunDetails('ci-1:203')).resolves.toEqual({
      runId: 'ci-1:203',
      jobs: [],
    });
  });

  it('projects workflow jobs and steps without exposing GitHub response shapes', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-action-details');
    const requests: string[] = [];
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (_command, arguments_) => {
        const path = arguments_.at(-1) ?? '';
        if (path.endsWith('/actions/jobs/45/logs')) {
          return 'current failed job output\nAuthorization: Bearer ghp_12345678901234567890';
        }
        if (
          arguments_[0] === 'run' &&
          arguments_.includes('--job') &&
          arguments_.includes('--log')
        ) {
          return 'live build output\nAuthorization: Bearer ghp_12345678901234567890';
        }
        if (arguments_[0] === 'run' && arguments_.includes('--log-failed')) {
          return 'error ENOSPC no space left\nAuthorization: Bearer ghp_12345678901234567890';
        }
        requests.push(path);
        if (path.endsWith('/actions/runs?per_page=50')) {
          return JSON.stringify({
            workflow_runs: [{ id: 203, name: 'PR Quality', status: 'in_progress' }],
          });
        }
        if (path.endsWith('/actions/runs/203/jobs?filter=all&per_page=100')) {
          return JSON.stringify({
            jobs: [
              {
                id: 43,
                run_attempt: 2,
                name: 'Old quality attempt',
                status: 'completed',
                conclusion: 'failure',
                steps: [],
              },
              {
                id: 44,
                run_attempt: 3,
                name: 'Quality',
                status: 'in_progress',
                started_at: '2026-08-15T08:00:00Z',
                html_url: 'https://github.com/flamox/platform/actions/runs/203/job/44',
                steps: [
                  {
                    number: 1,
                    name: 'Setup workspace',
                    status: 'in_progress',
                  },
                  {
                    number: 2,
                    name: 'Prepare database',
                    status: 'completed',
                    conclusion: 'success',
                    started_at: '2026-08-15T08:00:01Z',
                    completed_at: '2026-08-15T08:00:10Z',
                  },
                  {
                    number: 3,
                    name: 'Browser tests',
                    status: 'in_progress',
                  },
                  {
                    number: 4,
                    name: 'Save results',
                    status: 'queued',
                  },
                ],
              },
              {
                id: 45,
                run_attempt: 3,
                name: 'Current E2E failure',
                status: 'completed',
                conclusion: 'failure',
                steps: [
                  {
                    number: 1,
                    name: 'Install browser',
                    status: 'in_progress',
                  },
                  {
                    number: 2,
                    name: 'Run browser matrix',
                    status: 'queued',
                  },
                ],
              },
            ],
          });
        }
        throw new Error(`Unexpected GitHub path: ${path}`);
      },
    });

    // act
    await provider.listRuns();
    // assert
    await expect(provider.getRunDetails('ci-1:203')).resolves.toEqual({
      runId: 'ci-1:203',
      logOutput:
        'Job: Current E2E failure\ncurrent failed job output\nAuthorization: Bearer [redacted]',
      failureLog: 'error ENOSPC no space left\nAuthorization: Bearer [redacted]',
      jobs: [
        {
          id: 'ci-1:203:job:44',
          name: 'Quality',
          status: 'in-progress',
          startedAt: '2026-08-15T08:00:00Z',
          externalUrl: 'https://github.com/flamox/platform/actions/runs/203/job/44',
          steps: [
            {
              id: 'ci-1:203:job:44:step:1',
              name: 'Setup workspace',
              status: 'succeeded',
            },
            {
              id: 'ci-1:203:job:44:step:2',
              name: 'Prepare database',
              status: 'succeeded',
              startedAt: '2026-08-15T08:00:01Z',
              finishedAt: '2026-08-15T08:00:10Z',
            },
            {
              id: 'ci-1:203:job:44:step:3',
              name: 'Browser tests',
              status: 'in-progress',
            },
            {
              id: 'ci-1:203:job:44:step:4',
              name: 'Save results',
              status: 'queued',
            },
          ],
        },
        {
          id: 'ci-1:203:job:45',
          name: 'Current E2E failure',
          status: 'failed',
          steps: [
            {
              id: 'ci-1:203:job:45:step:1',
              name: 'Install browser',
              status: 'failed',
            },
            {
              id: 'ci-1:203:job:45:step:2',
              name: 'Run browser matrix',
              status: 'skipped',
            },
          ],
        },
      ],
    });
    expect(requests).toContain(
      'repos/flamox/platform/actions/runs/203/jobs?filter=all&per_page=100',
    );
  });

  it('falls back to gh run view when the workflow jobs API is unavailable', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-action-details-cli-fallback');
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (_command, arguments_) => {
        const path = arguments_.at(-1) ?? '';
        if (path.endsWith('/actions/runs?per_page=50')) {
          return JSON.stringify({
            workflow_runs: [{ id: 203, name: 'PR Quality', status: 'completed' }],
          });
        }
        if (path.endsWith('/actions/runs/203/jobs?filter=all&per_page=100')) {
          throw new Error('gh: HTTP 404');
        }
        if (arguments_[0] === 'run' && arguments_.includes('--json')) {
          return JSON.stringify({
            jobs: [
              {
                databaseId: 44,
                name: 'Browser E2E shard 3/4',
                status: 'completed',
                conclusion: 'failure',
                startedAt: '2026-08-16T05:00:00Z',
                completedAt: '2026-08-16T05:12:00Z',
                url: 'https://github.com/flamox/platform/actions/runs/203/job/44',
                steps: [
                  {
                    number: 1,
                    name: 'Install Playwright browsers',
                    status: 'completed',
                    conclusion: 'failure',
                  },
                ],
              },
            ],
          });
        }
        if (arguments_[0] === 'run' && arguments_.includes('--log-failed')) {
          return 'Playwright browser installation failed';
        }
        throw new Error(`Unexpected GitHub path: ${path}`);
      },
    });

    // act
    await provider.listRuns();
    // assert
    await expect(provider.getRunDetails('ci-1:203')).resolves.toMatchObject({
      failureLog: 'Playwright browser installation failed',
      jobs: [
        {
          id: 'ci-1:203:job:44',
          name: 'Browser E2E shard 3/4',
          status: 'failed',
          steps: [
            {
              id: 'ci-1:203:job:44:step:1',
              name: 'Install Playwright browsers',
              status: 'failed',
            },
          ],
        },
      ],
    });
  });

  it('prioritizes actionable diagnostics when failed workflow output exceeds the persisted limit', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-action-details-large-failure');
    // act
    const noisyLine = 'GET /assets/application.js 200 18ms';
    // assert
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (_command, arguments_) => {
        const path = arguments_.at(-1) ?? '';
        if (path.endsWith('/actions/runs?per_page=50')) {
          return JSON.stringify({
            workflow_runs: [{ id: 204, name: 'PR Quality', status: 'completed' }],
          });
        }
        if (path.endsWith('/actions/runs/204/jobs?filter=all&per_page=100')) {
          return JSON.stringify({
            jobs: [
              {
                id: 46,
                run_attempt: 1,
                name: 'Browser E2E shard 4/4',
                status: 'completed',
                conclusion: 'failure',
                steps: [],
              },
            ],
          });
        }
        if (path.endsWith('/actions/jobs/46/logs')) {
          return 'completed job output';
        }
        if (arguments_[0] === 'run' && arguments_.includes('--log-failed')) {
          return [
            ...Array.from({ length: 4_000 }, () => noisyLine),
            'browser-e2e.spec.ts:42:7',
            '##[error]Error: expect(locator(\'[test-id="save"]\')).toBeVisible() timed out',
            'Call log: waiting for locator',
            ...Array.from({ length: 4_000 }, () => noisyLine),
          ].join('\n');
        }
        throw new Error(`Unexpected GitHub path: ${path}`);
      },
    });

    await provider.listRuns();
    const details = await provider.getRunDetails('ci-1:204');

    expect(details.failureLog).toContain('expect(locator(\'[test-id="save"]\'))');
    expect(details.failureLog?.length).toBeLessThanOrEqual(64_000);
    expect(details.failureLog?.split(noisyLine).length).toBeLessThanOrEqual(4);

    const chunks: string[] = [];
    let offset = 0;
    let complete = false;
    while (!complete) {
      const chunk = await provider.getRunLogChunk('ci-1:204', 'failure', offset);
      chunks.push(chunk.content);
      expect(chunk.content.length).toBeLessThanOrEqual(60_000);
      offset = chunk.nextOffset;
      complete = chunk.complete;
    }
    const streamedLog = chunks.join('');
    expect(streamedLog).toContain('expect(locator(\'[test-id="save"]\'))');
    expect(streamedLog.length).toBeGreaterThan(64_000);
  });
});

describe('GitHubCloudProvider managed local Actions runner', () => {
  it('finds the oldest queued run whose current jobs request the managed local runner', async () => {
    // arrange
    const defaults = deliverySettings('/tmp/symphony-local-ci-candidate');
    const settings: IApplicationSettings = {
      ...defaults,
      workspaces: defaults.workspaces.map((workspace) => ({
        ...workspace,
        localCiEnabled: true,
      })),
    };
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (_command, arguments_) => {
        const path = arguments_.at(-1) ?? '';
        if (path.endsWith('/actions/runs?per_page=50')) {
          return JSON.stringify({
            workflow_runs: [
              {
                id: 204,
                workflow_id: 77,
                name: 'Cloud quality',
                status: 'queued',
                run_attempt: 1,
                created_at: '2026-08-17T10:01:00.000Z',
              },
              {
                id: 203,
                workflow_id: 77,
                name: 'Deploy Dev',
                status: 'queued',
                run_attempt: 2,
                created_at: '2026-08-17T10:00:00.000Z',
              },
            ],
          });
        }
        if (path.endsWith('/actions/runs/203/jobs?filter=all&per_page=100')) {
          return JSON.stringify({
            jobs: [
              {
                run_attempt: 2,
                status: 'queued',
                labels: ['self-hosted', 'Linux', 'symphony-local-ci', 'symphony-run-203'],
              },
            ],
          });
        }
        if (path.endsWith('/actions/runs/204/jobs?filter=all&per_page=100')) {
          return JSON.stringify({
            jobs: [{ run_attempt: 1, status: 'queued', labels: ['ubuntu-latest'] }],
          });
        }
        throw new Error(`Unexpected GitHub path: ${path}`);
      },
    });

    // act
    const candidates = await provider.listManagedLocalRunCandidates();

    // assert
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      id: 'ci-1:203',
      name: 'Deploy Dev',
      status: 'queued',
      runAttempt: 2,
    });
  });

  it('does not query GitHub for local candidates when no workspace enables local CI', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-local-ci-disabled');
    let requested = false;
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async () => {
        requested = true;
        return JSON.stringify({ workflow_runs: [] });
      },
    });

    // act
    const candidates = await provider.listManagedLocalRunCandidates();

    // assert
    expect(candidates).toEqual([]);
    expect(requested).toBe(false);
  });

  it('cancels an older queued run that blocks a jobless selected run', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-local-ci-concurrency-blocker');
    const requests: Array<{ readonly method: string; readonly path: string }> = [];
    let selectedJobReads = 0;
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      localRunnerPollMilliseconds: 1,
      localRunner: {
        cleanup: async () => ({
          removedInstances: 0,
          failedInstances: 0,
          removedConfigurationFiles: 0,
        }),
        start: async () => {
          throw new Error('The VM must not start without a registration token.');
        },
      },
      execute: async (_command, arguments_) => {
        const method = arguments_[arguments_.indexOf('--method') + 1] ?? '';
        const path = arguments_.at(-1) ?? '';
        requests.push({ method, path });
        if (path.endsWith('/actions/runs?per_page=50')) {
          return JSON.stringify({
            workflow_runs: [
              {
                id: 203,
                workflow_id: 77,
                head_branch: 'feature/tours',
                status: 'pending',
                run_attempt: 2,
              },
            ],
          });
        }
        if (path.endsWith('/actions/runs/203')) {
          return JSON.stringify({ id: 203, status: 'pending', run_attempt: 2 });
        }
        if (path.endsWith('/actions/runs/203/jobs?filter=all&per_page=100')) {
          selectedJobReads += 1;
          return JSON.stringify({
            jobs:
              selectedJobReads <= 2
                ? []
                : [
                    {
                      run_attempt: 2,
                      name: 'Format, Lint, Typecheck & Test',
                      status: 'queued',
                      labels: ['self-hosted', 'Linux', 'symphony-local-ci', 'symphony-run-203'],
                    },
                  ],
          });
        }
        if (path.endsWith('/actions/workflows/77/runs?branch=feature%2Ftours&per_page=20')) {
          return JSON.stringify({
            workflow_runs: [
              {
                id: 203,
                workflow_id: 77,
                head_branch: 'feature/tours',
                status: 'pending',
                run_attempt: 2,
              },
              {
                id: 202,
                workflow_id: 77,
                head_branch: 'feature/tours',
                status: 'queued',
                run_attempt: 3,
              },
            ],
          });
        }
        if (path.endsWith('/actions/runs/202/jobs?filter=all&per_page=100')) {
          return JSON.stringify({
            jobs: [
              {
                run_attempt: 3,
                name: 'Browser E2E shard 4/4',
                status: 'completed',
                conclusion: 'failure',
              },
              {
                run_attempt: 3,
                name: 'Browser E2E',
                status: 'queued',
                labels: ['self-hosted', 'Linux', 'symphony-local-ci', 'symphony-run-202'],
              },
            ],
          });
        }
        if (path.endsWith('/actions/runs/202/cancel')) return '';
        if (path.endsWith('/actions/runs/202')) {
          return JSON.stringify({
            id: 202,
            status: 'completed',
            conclusion: 'cancelled',
            run_attempt: 3,
          });
        }
        if (path.endsWith('/actions/runners/registration-token')) return JSON.stringify({});
        throw new Error(`Unexpected GitHub path: ${path}`);
      },
    });

    // act
    await provider.listRuns();
    // assert
    await expect(
      provider.runLocally(
        'ci-1:203',
        'local-ci-execution-concurrency-blocker',
        '/tmp/symphony-local-ci-concurrency-blocker/runtime',
        new AbortController().signal,
      ),
    ).rejects.toThrow('GitHub did not issue a local runner registration token.');
    expect(
      requests.filter((request) => request.method === 'POST').map((request) => request.path),
    ).toEqual([
      'repos/flamox/platform/actions/runs/202/cancel',
      'repos/flamox/platform/actions/runners/registration-token',
    ]);
  });

  it('keeps the pre-VM setup failure visible in Action details', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-local-ci-setup-failure');
    let detailsUnavailable = false;
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      localRunnerPollMilliseconds: 1,
      localRunner: {
        cleanup: async () => ({
          removedInstances: 0,
          failedInstances: 0,
          removedConfigurationFiles: 0,
        }),
        start: async () => {
          throw new Error('The VM must not start without a published job.');
        },
      },
      execute: async (_command, arguments_) => {
        const path = arguments_.at(-1) ?? '';
        if (path.endsWith('/actions/runs?per_page=50')) {
          return JSON.stringify({ workflow_runs: [{ id: 203, status: 'queued' }] });
        }
        if (path.endsWith('/actions/runs/203')) {
          return JSON.stringify({ id: 203, status: 'queued' });
        }
        if (path.endsWith('/actions/runs/203/jobs?filter=all&per_page=100')) {
          if (detailsUnavailable) throw new Error('gh: HTTP 404');
          return JSON.stringify({ jobs: [] });
        }
        throw new Error(`Unexpected GitHub path: ${path}`);
      },
    });

    // act
    await provider.listRuns();
    // assert
    await expect(
      provider.runLocally(
        'ci-1:203',
        'local-ci-execution-setup-failure',
        '/tmp/symphony-local-ci-setup-failure/runtime',
        new AbortController().signal,
      ),
    ).rejects.toThrow(
      'GitHub kept workflow run 203 pending without jobs. Review older active runs, cancel any workflow holding the concurrency group, and then choose Run locally again.',
    );
    detailsUnavailable = true;
    await expect(provider.getRunDetails('ci-1:203')).resolves.toMatchObject({
      jobs: [],
      localDiagnostics:
        'Phase: Local runner setup failed\nError: GitHub kept workflow run 203 pending without jobs. Review older active runs, cancel any workflow holding the concurrency group, and then choose Run locally again.',
    });
  });

  it('starts local execution from a fresh attempt when cancelling the partial attempt is slow', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-local-ci-partial-attempt');
    const requests: Array<{ readonly method: string; readonly path: string }> = [];
    let runReads = 0;
    let jobReads = 0;
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      localRunnerPollMilliseconds: 1,
      localRunner: {
        cleanup: async () => ({
          removedInstances: 0,
          failedInstances: 0,
          removedConfigurationFiles: 0,
        }),
        start: async () => {
          throw new Error('The VM must not start without a registration token.');
        },
      },
      execute: async (_command, arguments_) => {
        const method = arguments_[arguments_.indexOf('--method') + 1] ?? '';
        const path = arguments_.at(-1) ?? '';
        requests.push({ method, path });
        if (path.endsWith('/actions/runs?per_page=50')) {
          return JSON.stringify({
            workflow_runs: [{ id: 203, status: 'queued', run_attempt: 3 }],
          });
        }
        if (path.endsWith('/actions/runs/203')) {
          runReads += 1;
          if (runReads === 1) return JSON.stringify({ id: 203, status: 'queued', run_attempt: 3 });
          if (runReads <= 40) {
            return JSON.stringify({ id: 203, status: 'queued', run_attempt: 3 });
          }
          if (runReads === 41) {
            return JSON.stringify({
              id: 203,
              status: 'completed',
              conclusion: 'cancelled',
              run_attempt: 3,
            });
          }
          return JSON.stringify({ id: 203, status: 'queued', run_attempt: 4 });
        }
        if (path.endsWith('/actions/runs/203/cancel')) return '';
        if (path.endsWith('/actions/runs/203/force-cancel')) return '';
        if (path.endsWith('/actions/runs/203/rerun')) return '';
        if (path.endsWith('/actions/runs/203/jobs?filter=all&per_page=100')) {
          jobReads += 1;
          if (jobReads < 3) {
            return JSON.stringify({
              jobs: [
                { run_attempt: 3, status: 'completed', conclusion: 'failure' },
                {
                  run_attempt: 3,
                  status: 'queued',
                  labels: ['self-hosted', 'Linux', 'symphony-local-ci', 'symphony-run-203'],
                },
              ],
            });
          }
          return JSON.stringify({
            jobs: [
              { run_attempt: 3, status: 'completed', conclusion: 'failure' },
              { run_attempt: 3, status: 'completed', conclusion: 'cancelled' },
              {
                run_attempt: 4,
                status: 'queued',
                labels: ['self-hosted', 'Linux', 'symphony-local-ci', 'symphony-run-203'],
              },
            ],
          });
        }
        if (path.endsWith('/actions/runners/registration-token')) return JSON.stringify({});
        throw new Error(`Unexpected GitHub path: ${path}`);
      },
    });

    // act
    await provider.listRuns();
    // assert
    await expect(
      provider.runLocally(
        'ci-1:203',
        'local-ci-execution-partial-attempt',
        '/tmp/symphony-local-ci-partial-attempt/runtime',
        new AbortController().signal,
      ),
    ).rejects.toThrow('GitHub did not issue a local runner registration token.');
    const mutations = requests
      .filter((request) => request.method === 'POST')
      .map(({ path }) => path);
    expect(mutations).toEqual([
      'repos/flamox/platform/actions/runs/203/cancel',
      'repos/flamox/platform/actions/runs/203/force-cancel',
      'repos/flamox/platform/actions/runs/203/force-cancel',
      'repos/flamox/platform/actions/runs/203/force-cancel',
      'repos/flamox/platform/actions/runs/203/rerun',
      'repos/flamox/platform/actions/runners/registration-token',
    ]);
  });

  it('reports an interrupted cancellation as a local cancellation instead of a timeout', async () => {
    // arrange
    const settings = deliverySettings('/tmp/symphony-local-ci-cancelled-setup');
    const controller = new AbortController();
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      localRunnerPollMilliseconds: 1,
      localRunner: {
        cleanup: async () => ({
          removedInstances: 0,
          failedInstances: 0,
          removedConfigurationFiles: 0,
        }),
        start: async () => {
          throw new Error('The VM must not start after cancellation.');
        },
      },
      execute: async (_command, arguments_) => {
        const path = arguments_.at(-1) ?? '';
        if (path.endsWith('/actions/runs?per_page=50')) {
          return JSON.stringify({
            workflow_runs: [{ id: 203, status: 'queued', run_attempt: 1 }],
          });
        }
        if (path.endsWith('/actions/runs/203')) {
          return JSON.stringify({ id: 203, status: 'queued', run_attempt: 1 });
        }
        if (path.endsWith('/actions/runs/203/jobs?filter=all&per_page=100')) {
          return JSON.stringify({
            jobs: [
              {
                run_attempt: 1,
                status: 'in_progress',
                labels: ['self-hosted', 'Linux', 'symphony-local-ci', 'symphony-run-203'],
              },
            ],
          });
        }
        if (path.endsWith('/actions/runs/203/cancel')) {
          controller.abort();
          return '';
        }
        throw new Error(`Unexpected GitHub path: ${path}`);
      },
    });
    await provider.listRuns();

    // act
    const execution = provider.runLocally(
      'ci-1:203',
      'local-ci-execution-cancelled-setup',
      '/tmp/symphony-local-ci-cancelled-setup/runtime',
      controller.signal,
    );

    // assert
    await expect(execution).rejects.toThrow(
      'Local CI was cancelled while GitHub was stopping workflow attempt 1.',
    );
  });

  it.each<{
    readonly scenario: string;
    readonly responses: readonly (string | undefined)[];
    readonly error?: string;
    readonly interruption?: 'cancel' | 'exit';
  }>([
    {
      scenario: 'binds a disposable runner to one workflow run and records the terminal revision',
      responses: [],
    },
    {
      scenario:
        'keeps the runner alive across transient status failures and resets the retry budget',
      responses: [
        ...Array<string>(5).fill('error connecting to api.github.com'),
        undefined,
        ...Array<string>(5).fill('gh: HTTP 503 Service Unavailable'),
      ],
    },
    {
      scenario: 'stops the runner after bounded consecutive connection failures',
      responses: Array<string>(6).fill('error connecting to api.github.com'),
      error: 'error connecting to api.github.com',
    },
    ...[401, 403, 404, 429].map((status) => ({
      scenario: `does not retry a permanent HTTP ${status} status failure`,
      responses: [`gh: HTTP ${status}`],
      error: `gh: HTTP ${status}`,
    })),
    {
      scenario: 'detects runner exit during connection recovery',
      responses: ['error connecting to api.github.com'],
      interruption: 'exit',
      error: 'The managed local runner stopped before the workflow completed.',
    },
    {
      scenario: 'honors cancellation during connection recovery',
      responses: ['error connecting to api.github.com'],
      interruption: 'cancel',
    },
  ])('$scenario', async ({ responses, error, interruption }) => {
    // arrange
    const defaults = deliverySettings('/tmp/symphony-local-ci');
    const settings: IApplicationSettings = {
      ...defaults,
      localCi: {
        reuseVirtualMachine: false,
        resourcePreset: 'custom',
        customResources: { cpus: 4, memoryGiB: 8, diskGiB: 24, cacheGiB: 4 },
        storageLimitGiB: 32,
      },
    };
    const requests: Array<{ readonly method: string; readonly path: string }> = [];
    const starts: unknown[] = [];
    let runReads = 0;
    let stopped = false;
    let startedRunnerName = '';
    let statusReads = 0;
    let finishRunner: () => void = () => undefined;
    const controller = new AbortController();
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      now: () => new Date('2026-08-14T12:00:00.000Z'),
      localRunnerPollMilliseconds: 1,
      localCiHostCapacity: () => ({
        logicalCpus: 18,
        memoryGiB: 64,
        availableStorageGiB: 100,
        storageLimitGiB: 32,
      }),
      localCiGuest: async () => ({
        image: {
          releaseTag: 'ubuntu24-arm64/20260817.96',
          architecture: 'arm64',
          ubuntuVersion: '24.04',
          ubuntuCodename: 'noble',
          cloudImageRelease: '20260725',
          cloudImageFile: 'ubuntu-24.04-server-cloudimg-arm64.img',
          cloudImageSha256: 'a'.repeat(64),
          aptPackages: ['jq'],
          nodeVersion: '24.15.0',
          nodeArchive: 'node-v24.15.0-linux-arm64.tar.xz',
          nodeSha256: 'b'.repeat(64),
          environment: {},
          resolvedAt: '2026-08-21T20:00:00.000Z',
        },
        setupScript: 'corepack enable\n',
      }),
      localRunner: {
        cleanup: async () => ({
          removedInstances: 0,
          failedInstances: 0,
          removedConfigurationFiles: 0,
        }),
        start: async (input) => {
          starts.push(input);
          startedRunnerName = input.runnerName;
          return {
            runnerName: input.runnerName,
            os: 'linux',
            architecture: 'arm64',
            imageVersion: 'test-image',
            completion: new Promise<void>((resolve) => {
              finishRunner = resolve;
            }),
            diagnostics: async () => 'Resources\nMem: 8Gi\nSwap: 4Gi',
            stop: async () => {
              stopped = true;
            },
          };
        },
      },
      execute: async (_command, arguments_) => {
        const method = arguments_[arguments_.indexOf('--method') + 1] ?? '';
        const path = arguments_.at(-1) ?? '';
        requests.push({ method, path });
        if (path.endsWith('/actions/runs?per_page=50')) {
          return JSON.stringify({
            workflow_runs: [
              {
                id: 203,
                name: 'Format, Lint, Typecheck & Test',
                status: 'queued',
                head_sha: 'abc123',
              },
            ],
          });
        }
        if (path.endsWith('/actions/runs/203')) {
          runReads += 1;
          if (runReads > 2 && statusReads < responses.length) {
            const failure = responses[statusReads++];
            expect(stopped).toBe(false);
            if (interruption === 'exit') finishRunner();
            if (interruption === 'cancel') controller.abort();
            if (failure) throw new Error(failure);
            return JSON.stringify({ id: 203, status: 'in_progress' });
          }
          return JSON.stringify(
            runReads === 1
              ? { id: 203, status: 'completed', conclusion: 'failure', head_sha: 'abc123' }
              : runReads === 2
                ? { id: 203, status: 'queued', head_sha: 'abc123' }
                : { id: 203, status: 'completed', conclusion: 'success', head_sha: 'def456' },
          );
        }
        if (path.endsWith('/actions/runs/203/rerun')) return '';
        if (path.endsWith('/actions/runs/203/jobs?filter=all&per_page=100')) {
          return JSON.stringify({
            jobs: [
              {
                status: 'queued',
                labels: ['self-hosted', 'Linux', 'symphony-local-ci', 'symphony-run-203'],
              },
            ],
          });
        }
        if (path.endsWith('/actions/runners/registration-token')) {
          return JSON.stringify({ token: 'registration-token-for-test' });
        }
        if (path.includes('/actions/runners?')) {
          return JSON.stringify({ runners: [{ id: 44, name: startedRunnerName }] });
        }
        if (method === 'DELETE' && path.endsWith('/actions/runners/44')) return '';
        throw new Error(`Unexpected GitHub path: ${path}`);
      },
    });

    // act
    await provider.listRuns();
    const execution = provider.runLocally(
      'ci-1:203',
      'local-ci-execution-1',
      '/tmp/symphony-local-ci/runtime',
      controller.signal,
    );

    // assert
    if (error) {
      await expect(execution).rejects.toThrow(error);
    } else {
      await expect(execution).resolves.toMatchObject({
        id: 'local-ci-execution-1',
        ciRunId: 'ci-1:203',
        ...(interruption === 'cancel' ? {} : { revision: 'def456' }),
        state: interruption === 'cancel' ? 'cancelled' : 'succeeded',
        runner: {
          kind: 'managed-linux-vm',
          architecture: 'arm64',
          label: 'symphony-run-203',
        },
      });
    }
    expect(statusReads).toBe(responses.length);
    expect(stopped).toBe(true);
    expect(requests).toContainEqual({
      method: 'POST',
      path: 'repos/flamox/platform/actions/runs/203/rerun',
    });
    expect(starts).toEqual([
      expect.objectContaining({
        repositoryUrl: 'https://github.com/flamox/platform',
        labels: ['symphony-local-ci', 'symphony-run-203'],
        runtimeRoot: '/tmp/symphony-local-ci/runtime',
        resources: { cpus: 4, memoryGiB: 8, diskGiB: 24, cacheGiB: 4 },
        storageLimitGiB: 32,
        minimumFreeDiskGiB: 20,
      }),
    ]);
    expect(requests).toContainEqual({
      method: 'DELETE',
      path: 'repos/flamox/platform/actions/runners/44',
    });
  });
});

describe('GitHubCloudProvider pull-request authoring', () => {
  it('pages through the branches of the repository and sorts them by name', async () => {
    // arrange
    const settings = deliverySettings('/tmp/authoring');
    const requests: string[] = [];
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (_command, arguments_) => {
        const path = arguments_.at(-1) ?? '';
        requests.push(path);
        if (path.endsWith('page=1')) {
          return JSON.stringify(
            Array.from({ length: 100 }, (_value, index) => ({
              name: `release/${String(index).padStart(3, '0')}`,
              protected: false,
            })),
          );
        }
        return JSON.stringify([{ name: 'main', protected: true }, { name: 'feature/drawer' }]);
      },
    });

    // act
    const inventory = await provider.listBranches('repository-1');

    // assert
    expect(requests).toEqual([
      'repos/flamox/platform/branches?per_page=100&page=1',
      'repos/flamox/platform/branches?per_page=100&page=2',
    ]);
    expect(inventory.repositoryBindingId).toBe('repository-1');
    expect(inventory.defaultBranch).toBe('main');
    expect(inventory.branches).toHaveLength(102);
    expect(inventory.branches[0]).toEqual({ name: 'feature/drawer', protected: false });
    expect(inventory.branches.at(-1)).toEqual({ name: 'release/099', protected: false });
    expect(inventory.branches).toContainEqual({ name: 'main', protected: true });
  });

  it('rejects a repository outside the selected workspace scope', async () => {
    // arrange
    const settings = deliverySettings('/tmp/authoring');
    // act
    const provider = new GitHubCloudProvider({
      settings: () => ({
        ...settings,
        repositoryBindings: settings.repositoryBindings.map((repository) => ({
          ...repository,
          enabled: false,
        })),
      }),
      token: async () => 'test-token',
      execute: async () => '',
    });

    // assert
    await expect(provider.listBranches('repository-1')).rejects.toThrow(
      'The selected GitHub repository is unavailable.',
    );
  });

  it('compares the branch pair and surfaces the pull request that already covers it', async () => {
    // arrange
    const settings = deliverySettings('/tmp/authoring');
    const requests: string[] = [];
    // act
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async (_command, arguments_) => {
        const path = arguments_.at(-1) ?? '';
        requests.push(path);
        if (path.includes('/compare/')) {
          return JSON.stringify({
            status: 'diverged',
            ahead_by: 2,
            behind_by: 5,
            files: [{ filename: 'libs/example.ts' }],
            commits: [
              {
                sha: 'aaaaaaaaaaaa',
                commit: {
                  message: 'Add the drawer\n\nDetails follow.',
                  author: { name: 'Ada', date: '2026-08-15T06:00:00Z' },
                },
                author: { login: 'ada' },
              },
              { sha: 'bbbbbbbbbbbb', commit: { message: 'Cover the drawer' } },
            ],
          });
        }
        return JSON.stringify([
          { number: 7, html_url: 'https://github.com/flamox/platform/pull/7' },
        ]);
      },
    });

    // assert
    await expect(
      provider.compareBranches('repository-1', 'main', 'feature/pull-request-drawer'),
    ).resolves.toEqual({
      repositoryBindingId: 'repository-1',
      targetBranch: 'main',
      sourceBranch: 'feature/pull-request-drawer',
      status: 'diverged',
      aheadBy: 2,
      behindBy: 5,
      changedFiles: 1,
      commits: [
        { revision: 'bbbbbbbbbbbb', title: 'Cover the drawer' },
        {
          revision: 'aaaaaaaaaaaa',
          title: 'Add the drawer',
          author: 'ada',
          committedAt: '2026-08-15T06:00:00Z',
        },
      ],
      existingPullRequest: { number: 7, externalUrl: 'https://github.com/flamox/platform/pull/7' },
    });
    expect(requests[0]).toBe('repos/flamox/platform/compare/main...feature/pull-request-drawer');
    expect(requests[1]).toBe(
      'repos/flamox/platform/pulls?state=open&head=flamox%3Afeature%2Fpull-request-drawer&base=main',
    );
  });

  it('rejects a comparison of one branch with itself', async () => {
    // arrange
    const settings = deliverySettings('/tmp/authoring');
    // act
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async () => '',
    });

    // assert
    await expect(provider.compareBranches('repository-1', 'main', 'main')).rejects.toThrow(
      'A pull request needs two different branches.',
    );
  });

  it('opens the pull request with a JSON draft flag and projects the created summary', async () => {
    // arrange
    const settings = deliverySettings('/tmp/authoring');
    const commands: Array<readonly string[]> = [];
    // act
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      now: () => new Date('2026-08-19T09:00:00.000Z'),
      execute: async (_command, arguments_) => {
        commands.push([...arguments_]);
        return JSON.stringify({
          number: 128,
          html_url: 'https://github.com/flamox/platform/pull/128',
          title: 'Open pull requests from the delivery view',
          state: 'open',
          draft: true,
          user: { login: 'RueDeRennes' },
          head: { ref: 'feature/pull-request-drawer' },
          base: { ref: 'main' },
          created_at: '2026-08-19T08:59:00Z',
          updated_at: '2026-08-19T08:59:00Z',
        });
      },
    });

    // assert
    await expect(
      provider.createPullRequest({
        repositoryBindingId: 'repository-1',
        targetBranch: 'main',
        sourceBranch: 'feature/pull-request-drawer',
        title: '  Open pull requests from the delivery view  ',
        body: 'Adds the compare drawer.',
        draft: true,
      }),
    ).resolves.toEqual({
      id: 'repository-1:128',
      workspaceId: 'personal',
      repositoryBindingId: 'repository-1',
      number: 128,
      title: 'Open pull requests from the delivery view',
      state: 'open',
      draft: true,
      baseBranchStatus: 'unknown',
      author: 'RueDeRennes',
      sourceBranch: 'feature/pull-request-drawer',
      targetBranch: 'main',
      externalUrl: 'https://github.com/flamox/platform/pull/128',
      createdAt: '2026-08-19T08:59:00Z',
      updatedAt: '2026-08-19T08:59:00Z',
    });
    const request = commands[0] ?? [];
    expect(request).toContain('POST');
    expect(request.at(-1)).toBe('repos/flamox/platform/pulls');
    expect(request).toContain('title=Open pull requests from the delivery view');
    expect(request).toContain('head=feature/pull-request-drawer');
    expect(request).toContain('base=main');
    expect(request).toContain('--field');
    expect(request).toContain('draft=true');
  });

  it('rejects a pull request without a title', async () => {
    // arrange
    const settings = deliverySettings('/tmp/authoring');
    // act
    const provider = new GitHubCloudProvider({
      settings: () => settings,
      token: async () => 'test-token',
      execute: async () => '',
    });

    // assert
    await expect(
      provider.createPullRequest({
        repositoryBindingId: 'repository-1',
        targetBranch: 'main',
        sourceBranch: 'feature/pull-request-drawer',
        title: '   ',
        body: '',
        draft: false,
      }),
    ).rejects.toThrow('Enter a pull-request title.');
  });
});

describe('GitHubCloudProvider revision-bound actions', () => {
  it('reconciles a unique manual-dispatch marker without relying on a branch revision or writing again', async () => {
    // arrange
    let ambiguous = false;
    const definition =
      'run-name: Symphony ${{ inputs.symphony_operation_id }}\non:\n  workflow_dispatch:\n    inputs:\n      symphony_operation_id:\n        type: string\n';
    const calls: string[][] = [];
    const provider = new GitHubCloudProvider({
      settings: () => deliverySettings('/tmp/symphony-marker-proof'),
      token: async () => 'test-token',
      execute: async (_command, args) => {
        calls.push([...args]);
        const path = args.at(-1) ?? '';
        if (path.includes('/actions/workflows?'))
          return JSON.stringify({
            workflows: [{ id: 101, name: 'CI', path: '.github/workflows/ci.yml', state: 'active' }],
          });
        if (path.includes('/contents/'))
          return JSON.stringify({
            type: 'file',
            encoding: 'base64',
            content: Buffer.from(definition).toString('base64'),
          });
        if (path.includes('/runs?event=')) {
          const run = {
            id: 901,
            workflow_id: 101,
            name: 'CI',
            status: 'queued',
            head_sha: 'a-ref-that-changed',
            display_title: 'Symphony operation-uuid',
            created_at: '2026-10-06T12:00:01Z',
          };
          return JSON.stringify({ workflow_runs: ambiguous ? [run, { ...run, id: 902 }] : [run] });
        }
        throw new Error('Unexpected ' + path);
      },
    });
    // act
    const input = await provider.workflowOperationInput('ci-1:101', 'main');
    const run = await provider.reconcileWorkflowDispatch(
      'ci-1:101',
      'operation-uuid',
      '2026-10-06T12:00:00Z',
    );
    ambiguous = true;
    const missing = await provider.reconcileWorkflowDispatch(
      'ci-1:101',
      'operation-uuid',
      '2026-10-06T12:00:00Z',
    );
    // assert
    expect(input).toBe('symphony_operation_id');
    expect(run).toMatchObject({ id: 'ci-1:901', revision: 'a-ref-that-changed' });
    expect(missing).toBeUndefined();
    expect(calls.some((args) => args.includes('POST'))).toBe(false);
  });
  it('accepts only the exact approval receipt marker and all requested environments', async () => {
    // arrange
    const calls: string[][] = [];
    const provider = new GitHubCloudProvider({
      settings: () => deliverySettings('/tmp/symphony-approval-receipt'),
      token: async () => 'test-token',
      execute: async (_command, args) => {
        calls.push([...args]);
        return JSON.stringify([
          {
            comment: 'Reviewed\n[Symphony operation operation-uuid]',
            environments: [{ id: 1 }, { id: 2 }],
          },
        ]);
      },
    });
    // act
    const accepted = await provider.hasApprovalReceipt('ci-1:901', 'operation-uuid', [1, 2]);
    const wrongMarker = await provider.hasApprovalReceipt('ci-1:901', 'other-id', [1]);
    const wrongEnvironment = await provider.hasApprovalReceipt('ci-1:901', 'operation-uuid', [3]);
    // assert
    expect(accepted).toBe(true);
    expect(wrongMarker).toBe(false);
    expect(wrongEnvironment).toBe(false);
    expect(calls.every((args) => args.at(-1)?.endsWith('/actions/runs/901/approvals'))).toBe(true);
    expect(calls.some((args) => args.includes('POST'))).toBe(false);
  });
  it('uses the dispatch response run ID and loads its graph from that exact revision', async () => {
    // arrange
    const requests: string[][] = [];
    const definition =
      'on: workflow_dispatch\njobs:\n  build:\n    runs-on: ubuntu-latest\n  test:\n    needs: build\n    runs-on: ubuntu-latest\n';
    const provider = new GitHubCloudProvider({
      settings: () => deliverySettings('/tmp/symphony-exact-dispatch'),
      token: async () => 'test-token',
      execute: async (_command, arguments_) => {
        requests.push([...arguments_]);
        const path = arguments_.at(-1) ?? '';
        if (path.includes('/actions/workflows?'))
          return JSON.stringify({
            workflows: [{ id: 101, name: 'CI', path: '.github/workflows/ci.yml', state: 'active' }],
          });
        if (path.includes('/contents/.github/workflows/ci.yml?ref='))
          return JSON.stringify({
            type: 'file',
            encoding: 'base64',
            content: Buffer.from(definition).toString('base64'),
          });
        if (path.endsWith('/dispatches')) return JSON.stringify({ workflow_run_id: 901 });
        if (path.endsWith('/actions/runs/901'))
          return JSON.stringify({
            id: 901,
            workflow_id: 101,
            name: 'CI',
            status: 'completed',
            conclusion: 'success',
            head_sha: 'immutable-sha',
            head_branch: 'main',
            path: '.github/workflows/ci.yml',
          });
        if (path.endsWith('/pending_deployments')) return '[]';
        if (path.includes('/jobs?'))
          return JSON.stringify({
            jobs: [
              { id: 42, name: 'build', status: 'completed', conclusion: 'success', steps: [] },
            ],
          });
        throw new Error(`Unexpected path ${path}`);
      },
    });
    // act
    const run = await provider.dispatchWorkflow('ci-1:101', 'main', { requireProof: true });
    const details = await provider.getRunDetails(run.id);
    // assert
    expect(run).toMatchObject({ id: 'ci-1:901', revision: 'immutable-sha' });
    expect(details.workflowGraph).toMatchObject({
      revision: 'immutable-sha',
      jobs: [
        { id: 'build', needs: [] },
        { id: 'test', needs: ['build'] },
      ],
    });
    expect(requests.some((request) => request.includes('X-GitHub-Api-Version: 2026-03-10'))).toBe(
      true,
    );
    expect(requests.some((request) => request.at(-1)?.endsWith('?ref=immutable-sha'))).toBe(true);
    expect(requests.some((request) => request.at(-1)?.includes('runs?event='))).toBe(false);
  });

  it.each(['revision', 'authority', 'timer'] as const)(
    'rechecks %s before an approval and never writes a changed decision',
    async (changed) => {
      // arrange
      let writes = 0;
      const provider = new GitHubCloudProvider({
        settings: () => deliverySettings('/tmp/symphony-approval-check'),
        token: async () => 'test-token',
        now: () => new Date('2026-10-06T12:00:00Z'),
        execute: async (_command, arguments_) => {
          if (arguments_.includes('POST')) {
            writes += 1;
            return '[]';
          }
          const path = arguments_.at(-1) ?? '';
          if (path.endsWith('/actions/runs/901'))
            return JSON.stringify({
              id: 901,
              head_sha: changed === 'revision' ? 'other-sha' : 'expected-sha',
            });
          if (path.endsWith('/pending_deployments'))
            return JSON.stringify([
              {
                environment: { id: 1, name: 'Production' },
                current_user_can_approve: changed !== 'authority',
                wait_timer: changed === 'timer' ? 30 : 0,
                wait_timer_started_at: '2026-10-06T11:55:00Z',
              },
            ]);
          throw new Error(`Unexpected path ${path}`);
        },
      });
      // act
      const operation = provider.reviewPendingApprovals(
        'ci-1:901',
        'expected-sha',
        [1],
        'approved',
        'Release the reviewed version.',
      );
      // assert
      await expect(operation).rejects.toThrow(
        changed === 'revision' ? 'revision changed' : 'approval changed',
      );
      expect(writes).toBe(0);
    },
  );
});

function deliverySettings(workspacePath: string): IApplicationSettings {
  const settings = createDefaultApplicationSettings(workspacePath);
  return {
    ...settings,
    connections: [
      ...settings.connections,
      {
        id: 'github-1',
        workspaceId: 'personal',
        kind: 'github',
        displayName: 'GitHub',
        hostname: 'github.com',
        gitProtocol: 'https',
      },
    ],
    repositoryBindings: [
      {
        id: 'repository-1',
        workspaceId: 'personal',
        sourceControlConnectionId: 'github-1',
        displayName: 'flamox/platform',
        provider: 'github',
        host: 'github.com',
        owner: 'flamox',
        name: 'platform',
        defaultBranch: 'main',
        localPath: workspacePath,
        enabled: true,
      },
    ],
    ciBindings: [
      {
        id: 'ci-1',
        workspaceId: 'personal',
        repositoryBindingId: 'repository-1',
        sourceControlConnectionId: 'github-1',
        displayName: 'GitHub Actions',
        provider: 'github-actions',
        enabled: true,
      },
    ],
  };
}

function deliveryExecution(workspacePath: string, branch: string): IExecutionRecord {
  return {
    id: 'execution-40',
    workspaceId: 'personal',
    workItemId: 'work-item-40',
    workflowId: 'default',
    kind: 'solution',
    state: 'succeeded',
    startedAt: '2026-08-11T08:00:00.000Z',
    finishedAt: '2026-08-11T08:10:00.000Z',
    workspacePath,
    workspaceReference: branch,
    summary: 'Activates the tenant administrator reliably.',
  };
}

function updatablePullRequestResponse(
  overrides: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return {
    number: 203,
    html_url: 'https://github.com/flamox/platform/pull/203',
    title: 'Restore user invitation save action',
    state: 'open',
    draft: false,
    merged_at: null,
    user: { login: 'RueDeRennes' },
    head: { ref: 'fix/user-invitation', sha: 'current-head' },
    base: { ref: 'main' },
    created_at: '2026-08-14T13:34:38Z',
    updated_at: '2026-08-14T14:20:00Z',
    ...overrides,
  };
}

function issueWorkItem(): IWorkItem {
  return {
    id: 'work-item-40',
    workspaceId: 'personal',
    externalId: 'CR-0040',
    externalUrl: 'https://github.com/flamox/platform/issues/40',
    title: 'Activate tenant administrator reliably',
    body: '',
    stageId: 'progress',
    provider: 'github-projects',
    repository: 'flamox/platform',
    repositoryBindingIds: ['repository-1'],
    labels: [],
    assignees: [],
  };
}

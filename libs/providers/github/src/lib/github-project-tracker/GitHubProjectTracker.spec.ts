// #region Imports

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { WorkItemClaimMissingError } from '@symphony/application-work';
import { createDefaultApplicationSettings } from '@symphony/configuration-composition';
import type { IApplicationSettings } from '@symphony/configuration-composition';
import type { ProjectFieldValue } from '@symphony/domain-work';
import { GitHubProjectTracker } from './GitHubProjectTracker';

// #endregion

function githubSettings(): IApplicationSettings {
  const defaults = createDefaultApplicationSettings('/tmp');
  return {
    ...defaults,
    connections: [
      ...defaults.connections,
      {
        id: 'github',
        workspaceId: 'personal',
        kind: 'github',
        displayName: 'GitHub',
        hostname: 'github.com',
        accountLogin: 'octocat',
        gitProtocol: 'https',
      },
    ],
    workItemSources: [
      {
        id: 'project',
        workspaceId: 'personal',
        connectionId: 'github',
        provider: 'github-projects',
        displayName: 'Platform board',
        ownerType: 'organization',
        owner: 'example',
        projectNumber: 42,
        columnMappings: [
          { columnId: 'ready', stageId: 'ready' },
          { columnId: 'done', stageId: 'done' },
        ],
        enabled: true,
      },
    ],
    repositoryBindings: [
      {
        id: 'repository',
        workspaceId: 'personal',
        sourceControlConnectionId: 'github',
        displayName: 'example/platform',
        provider: 'github',
        host: 'github.com',
        owner: 'example',
        name: 'platform',
        defaultBranch: 'main',
        localPath: '/tmp/platform',
        enabled: true,
      },
    ],
  };
}

function claimReference(repository: string, externalId: string): string {
  const digest = createHash('sha256')
    .update(`github-projects\0${repository}\0${externalId}`)
    .digest('hex')
    .slice(0, 40);
  return `refs/heads/symphony/claims/${digest}`;
}

/**
 * A GitHub repository that answers the Git data API from memory, so the claim tests can assert
 * what a lease actually writes into the shared repository.
 */
function createClaimHarness() {
  const references = new Map<string, string>([['heads/main', 'base']]);
  const commitMessages = new Map<string, string>();
  let commitSequence = 0;
  let clock = new Date('2026-08-19T10:00:00.000Z');
  const writtenCommits: string[] = [];
  const assigneeEdits: string[] = [];
  const issueAssignees: string[] = [];

  const runCommand = async (args: readonly string[], _environment: unknown, input?: string) => {
    if (args[0] === 'issue' && args[1] === 'edit') {
      assigneeEdits.push(args.slice(2).join(' '));
      const addIndex = args.indexOf('--add-assignee');
      if (addIndex >= 0) issueAssignees.push(...String(args[addIndex + 1]).split(','));
      const removeIndex = args.indexOf('--remove-assignee');
      if (removeIndex >= 0) {
        const removed = new Set(String(args[removeIndex + 1]).split(','));
        for (let index = issueAssignees.length - 1; index >= 0; index -= 1) {
          if (removed.has(issueAssignees[index]!)) issueAssignees.splice(index, 1);
        }
      }
      return '';
    }
    if (args[0] === 'project' && args[1] === 'item-list') {
      return JSON.stringify({
        items: [
          {
            id: 'PVTI_1',
            assignees: [],
            content: { number: 18, title: 'Coordinate me', repository: 'example/platform' },
          },
        ],
      });
    }
    if (args[0] === 'issue' && args[1] === 'list') return '[]';
    if (
      args[0] === 'api' &&
      (args.some((argument) => argument.includes('/assignees')) ||
        args.some((argument) => argument.includes('/labels')))
    )
      return '[]';
    if (args[0] === 'api' && args[1] === 'graphql') {
      const request = JSON.parse(input ?? '{}') as {
        query: string;
        variables: Record<string, unknown>;
      };
      if (request.query.includes('query ProjectIdentity')) {
        return JSON.stringify({ data: { organization: { projectV2: { id: 'PVT_project' } } } });
      }
      if (request.query.includes('query ProjectFields')) {
        return JSON.stringify({
          data: {
            node: {
              fields: {
                nodes: [
                  {
                    __typename: 'ProjectV2SingleSelectField',
                    id: 'assistant-phase',
                    name: 'Assistant phase',
                    options: [
                      { id: 'none', name: 'None' },
                      { id: 'analyze', name: 'Analyze' },
                    ],
                  },
                ],
              },
            },
          },
        });
      }
      if (request.query.includes('query ProjectBoardItems')) {
        return JSON.stringify({
          data: {
            node: {
              items: {
                pageInfo: { hasNextPage: false },
                nodes: [
                  {
                    id: 'PVTI_1',
                    content: {
                      __typename: 'Issue',
                      id: 'I_18',
                      number: 18,
                      title: 'Coordinate me',
                      repository: { nameWithOwner: 'example/platform' },
                      labels: { nodes: [] },
                      assignees: { nodes: [] },
                    },
                    fieldValues: { nodes: [] },
                  },
                ],
              },
            },
          },
        });
      }
      return JSON.stringify({
        data: { updateProjectV2ItemFieldValue: { projectV2Item: { id: 'PVTI_1' } } },
      });
    }
    if (args[0] === 'api') {
      const method = args[args.indexOf('--method') + 1];
      const endpoint = args.find((argument) => argument.startsWith('repos/')) ?? '';
      if (method === 'GET' && /\/issues\/\d+$/u.test(endpoint)) {
        return JSON.stringify({ assignees: issueAssignees.map((login) => ({ login })) });
      }
      if (method === 'GET' && endpoint.includes('/git/matching-refs/')) {
        const prefix = endpoint.split('/git/matching-refs/')[1] ?? '';
        return JSON.stringify(
          [...references]
            .filter(([reference]) => reference.startsWith(prefix))
            .map(([reference, sha]) => ({ ref: `refs/${reference}`, object: { sha } })),
        );
      }
      if (method === 'GET' && endpoint.includes('/git/ref/')) {
        const reference = decodeURIComponent(endpoint.split('/git/ref/')[1] ?? '');
        const sha = references.get(reference);
        if (!sha) throw new Error('HTTP 404: Not Found');
        return JSON.stringify({ object: { sha } });
      }
      if (method === 'GET' && endpoint.includes('/git/commits/')) {
        const sha = endpoint.split('/git/commits/')[1] ?? '';
        return JSON.stringify({ tree: { sha: '7ee' }, message: commitMessages.get(sha) ?? '' });
      }
      if (method === 'POST' && endpoint.endsWith('/git/commits')) {
        commitSequence += 1;
        const sha = `c1a1${commitSequence}`;
        const body = JSON.parse(input ?? '{}') as { message: string };
        commitMessages.set(sha, body.message);
        writtenCommits.push(body.message);
        return JSON.stringify({ sha });
      }
      if (method === 'POST' && endpoint.endsWith('/git/refs')) {
        const body = JSON.parse(input ?? '{}') as { ref: string; sha: string };
        const reference = body.ref.replace(/^refs\//u, '');
        if (references.has(reference)) throw new Error('HTTP 422: Reference already exists');
        references.set(reference, body.sha);
        return JSON.stringify({ ref: body.ref, object: { sha: body.sha } });
      }
      if (method === 'PATCH' && endpoint.includes('/git/refs/')) {
        const body = JSON.parse(input ?? '{}') as { sha: string };
        references.set(endpoint.split('/git/refs/')[1] ?? '', body.sha);
        return JSON.stringify({ object: { sha: body.sha } });
      }
      if (method === 'DELETE' && endpoint.includes('/git/refs/')) {
        references.delete(endpoint.split('/git/refs/')[1] ?? '');
        return '';
      }
    }
    throw new Error(`Unexpected gh invocation: ${args.join(' ')}`);
  };

  const trackerFor = (login: string, heartbeatSeconds = 60) => {
    const settings = githubSettings();
    return new GitHubProjectTracker({
      settings: () => ({
        ...settings,
        connections: settings.connections.map((connection) =>
          connection.kind === 'github' ? { ...connection, accountLogin: login } : connection,
        ),
      }),
      now: () => clock.toISOString(),
      claimLeaseMinutes: () => 30,
      claimHeartbeatSeconds: () => heartbeatSeconds,
      runCommand: (args, environment, input) =>
        args[0] === 'api' && args.includes('user')
          ? Promise.resolve(`${login}\n`)
          : runCommand(args, environment, input),
    });
  };

  return {
    references,
    commitMessages,
    writtenCommits,
    assigneeEdits,
    issueAssignees,
    trackerFor,
    setNow: (instant: string) => {
      clock = new Date(instant);
    },
  };
}

describe('GitHubProjectTracker', () => {
  it('loads every project item across GraphQL pages without truncation', async () => {
    // arrange
    const cursors: (string | undefined)[] = [];
    const commentCursors: string[] = [];
    let detailQueries = 0;
    const tracker = new GitHubProjectTracker({
      settings: githubSettings,
      token: async () => 'token',
      runCommand: async (args, _environment, standardInput) => {
        if (args[0] === 'api' && args[1] === 'graphql') {
          const request = JSON.parse(standardInput ?? '{}') as {
            query: string;
            variables: Record<string, unknown>;
          };
          if (request.query.includes('query ProjectIdentity')) {
            return JSON.stringify({
              data: { organization: { projectV2: { id: 'PVT_project' } } },
            });
          }
          if (request.query.includes('query ProjectFields')) {
            return JSON.stringify({
              data: {
                node: { fields: { pageInfo: { hasNextPage: false }, nodes: [] } },
              },
            });
          }
          if (request.query.includes('query ProjectBoardItems')) {
            const cursor = request.variables['cursor'] as string | undefined;
            cursors.push(cursor);
            const number = cursor ? 102 : 1;
            return JSON.stringify({
              data: {
                node: {
                  items: {
                    pageInfo: cursor
                      ? { hasNextPage: false, endCursor: null }
                      : { hasNextPage: true, endCursor: 'page-2' },
                    nodes: [
                      {
                        id: `PVTI_${number}`,
                        content: {
                          __typename: 'Issue',
                          id: `I_${number}`,
                          number,
                          title: `Item ${number}`,
                          repository: { nameWithOwner: 'example/platform' },
                          labels: { pageInfo: { hasNextPage: false }, nodes: [] },
                          assignees: { pageInfo: { hasNextPage: false }, nodes: [] },
                        },
                        fieldValues: { pageInfo: { hasNextPage: false }, nodes: [] },
                      },
                    ],
                  },
                },
              },
            });
          }
          if (request.query.includes('query IssueDetail')) {
            detailQueries += 1;
            return JSON.stringify({
              data: {
                repository: {
                  issueOrPullRequest: {
                    title: 'Item 1',
                    body: 'Hydrated only when the item is opened.',
                    createdAt: '2026-08-14T10:00:00Z',
                    updatedAt: '2026-08-14T11:00:00Z',
                    comments: {
                      pageInfo: { hasNextPage: true, endCursor: 'comments-2' },
                      nodes: [
                        {
                          id: 'IC_1',
                          databaseId: 501,
                          url: 'https://github.com/example/platform/issues/1#issuecomment-501',
                          body: 'Order the budget fields after the floor heights.',
                          createdAt: '2026-08-14T10:30:00Z',
                          updatedAt: '2026-08-14T10:31:00Z',
                          author: {
                            login: 'rekepb',
                            avatarUrl: 'https://avatars.example.com/rekepb',
                          },
                        },
                        {
                          id: 'IC_ghost',
                          databaseId: 502,
                          body: 'Left by an account that no longer exists.',
                          createdAt: '2026-08-14T10:40:00Z',
                          author: null,
                        },
                      ],
                    },
                  },
                },
              },
            });
          }
          if (request.query.includes('query IssueComments')) {
            commentCursors.push(request.variables['cursor'] as string);
            return JSON.stringify({
              data: {
                repository: {
                  issueOrPullRequest: {
                    comments: {
                      pageInfo: { hasNextPage: false, endCursor: null },
                      nodes: [
                        {
                          id: 'IC_3',
                          databaseId: 503,
                          body: '## Symphony analysis\n\nRecorded by Symphony.',
                          createdAt: '2026-08-14T11:00:00Z',
                          author: { login: 'symphony-bot' },
                        },
                      ],
                    },
                  },
                },
              },
            });
          }
        }
        if (
          args[0] === 'api' &&
          (args.some((argument) => argument.includes('/assignees')) ||
            args.some((argument) => argument.includes('/labels')))
        ) {
          return '[]';
        }
        throw new Error(`Unexpected gh invocation: ${args.join(' ')}`);
      },
    });

    const items = await tracker.listWorkItems();

    // act
    const actual = items.map((item) => item.externalId);

    // assert
    expect(actual).toEqual(['#1', '#102']);
    expect(cursors).toEqual([undefined, 'page-2']);
    expect(items[0]).toMatchObject({ body: '', detailState: 'summary' });
    expect(detailQueries).toBe(0);

    const detail = await tracker.loadWorkItemDetails(items[0]!);
    expect(detail).toMatchObject({
      body: 'Hydrated only when the item is opened.',
      detailState: 'complete',
    });
    expect(detailQueries).toBe(1);
    // The thread arrives with the issue, oldest first, and follows the connection past the
    // first page; an author GitHub no longer resolves leaves the comment without one.
    expect(commentCursors).toEqual(['comments-2']);
    expect(detail.comments).toEqual([
      {
        id: '501',
        author: { login: 'rekepb', avatarUrl: 'https://avatars.example.com/rekepb' },
        body: 'Order the budget fields after the floor heights.',
        bodyFormat: 'markdown',
        createdAt: '2026-08-14T10:30:00Z',
        updatedAt: '2026-08-14T10:31:00Z',
        url: 'https://github.com/example/platform/issues/1#issuecomment-501',
      },
      {
        id: '502',
        body: 'Left by an account that no longer exists.',
        bodyFormat: 'markdown',
        createdAt: '2026-08-14T10:40:00Z',
      },
      {
        id: '503',
        author: { login: 'symphony-bot' },
        body: '## Symphony analysis\n\nRecorded by Symphony.',
        bodyFormat: 'markdown',
        createdAt: '2026-08-14T11:00:00Z',
      },
    ]);
  });

  it('loads every supported dynamic field and gets multi-select values from GraphQL', async () => {
    // arrange
    const queries: string[] = [];
    // act
    const invocations: string[][] = [];
    // assert
    const tracker = new GitHubProjectTracker({
      settings: githubSettings,
      token: async () => 'token',
      runCommand: async (args, environment, standardInput) => {
        invocations.push([...args]);
        expect(environment['GH_HOST']).toBe('github.com');
        if (args[0] === 'project' && args[1] === 'view') {
          return JSON.stringify({ id: 'PVT_project' });
        }
        if (args[0] === 'project' && args[1] === 'item-list') {
          return JSON.stringify({
            items: [
              {
                id: 'PVTI_1',
                labels: ['bug'],
                assignees: ['octocat'],
                content: {
                  number: 18,
                  title: 'Keep dynamic fields visible',
                  repository: 'Example/Platform',
                },
              },
              {
                id: 'PVTI_2',
                labels: [],
                assignees: [],
                content: {
                  number: 19,
                  title: 'Keep claim loading bounded',
                  repository: 'Example/Platform',
                },
              },
            ],
          });
        }
        if (args[0] === 'api' && args[1] === 'graphql') {
          const request = JSON.parse(standardInput ?? '{}') as {
            query: string;
            variables: Record<string, unknown>;
          };
          queries.push(request.query);
          if (request.query.includes('query ProjectIdentity')) {
            return JSON.stringify({
              data: { organization: { projectV2: { id: 'PVT_project' } } },
            });
          }
          if (request.query.includes('query ProjectFields')) {
            return JSON.stringify({
              data: {
                node: {
                  fields: {
                    nodes: [
                      {
                        __typename: 'ProjectV2SingleSelectField',
                        id: 'status',
                        name: 'Status',
                        options: [
                          { id: 'ready', name: 'Ready' },
                          { id: 'done', name: 'Done' },
                        ],
                      },
                      {
                        __typename: 'ProjectV2MultiSelectField',
                        id: 'keywords',
                        name: 'Keywords',
                        options: [
                          { id: 'angular', name: 'Angular' },
                          { id: 'desktop', name: 'Desktop' },
                        ],
                      },
                      {
                        __typename: 'ProjectV2SingleSelectField',
                        id: 'assistant-phase',
                        name: 'Assistant phase',
                        options: [
                          { id: 'none', name: 'None' },
                          { id: 'create', name: 'Create' },
                          { id: 'analyze', name: 'Analyze' },
                          { id: 'solve', name: 'Solve' },
                        ],
                      },
                      {
                        __typename: 'ProjectV2Field',
                        id: 'summary',
                        name: 'Summary',
                        dataType: 'TEXT',
                      },
                      {
                        __typename: 'ProjectV2Field',
                        id: 'score',
                        name: 'Score',
                        dataType: 'NUMBER',
                      },
                      {
                        __typename: 'ProjectV2Field',
                        id: 'target',
                        name: 'Target',
                        dataType: 'DATE',
                      },
                      {
                        __typename: 'ProjectV2IterationField',
                        id: 'iteration',
                        name: 'Iteration',
                        configuration: {
                          iterations: [
                            {
                              id: 'sprint-1',
                              title: 'Sprint 1',
                              startDate: '2026-08-10',
                              duration: 7,
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            });
          }
          if (request.query.includes('query ProjectBoardItems')) {
            return JSON.stringify({
              data: {
                node: {
                  items: {
                    pageInfo: { hasNextPage: false, endCursor: null },
                    nodes: [
                      {
                        id: 'PVTI_1',
                        content: {
                          __typename: 'Issue',
                          id: 'I_18',
                          number: 18,
                          title: 'Keep dynamic fields visible',
                          repository: { nameWithOwner: 'Example/Platform' },
                          labels: { nodes: [{ name: 'bug' }] },
                          assignees: { nodes: [{ login: 'octocat' }] },
                        },
                        fieldValues: {
                          nodes: [
                            {
                              __typename: 'ProjectV2ItemFieldSingleSelectValue',
                              field: { id: 'status' },
                              optionId: 'ready',
                            },
                            {
                              __typename: 'ProjectV2ItemFieldMultiSelectValue',
                              field: { id: 'keywords' },
                              options: [{ id: 'angular' }, { id: 'desktop' }],
                            },
                            {
                              __typename: 'ProjectV2ItemFieldSingleSelectValue',
                              field: { id: 'assistant-phase' },
                              optionId: 'analyze',
                            },
                            {
                              __typename: 'ProjectV2ItemFieldTextValue',
                              field: { id: 'summary' },
                              text: 'Renderer parity',
                            },
                            {
                              __typename: 'ProjectV2ItemFieldNumberValue',
                              field: { id: 'score' },
                              number: 8,
                            },
                            {
                              __typename: 'ProjectV2ItemFieldDateValue',
                              field: { id: 'target' },
                              date: '2026-08-18',
                            },
                            {
                              __typename: 'ProjectV2ItemFieldIterationValue',
                              field: { id: 'iteration' },
                              iterationId: 'sprint-1',
                            },
                          ],
                        },
                      },
                      {
                        id: 'PVTI_2',
                        content: {
                          __typename: 'Issue',
                          id: 'I_19',
                          number: 19,
                          title: 'Keep claim loading bounded',
                          repository: { nameWithOwner: 'Example/Platform' },
                          labels: { nodes: [] },
                          assignees: { nodes: [] },
                        },
                        fieldValues: {
                          nodes: [
                            {
                              __typename: 'ProjectV2ItemFieldSingleSelectValue',
                              field: { id: 'status' },
                              optionId: 'ready',
                            },
                            {
                              __typename: 'ProjectV2ItemFieldSingleSelectValue',
                              field: { id: 'assistant-phase' },
                              optionId: 'solve',
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            });
          }
          if (request.query.includes('query WorkItemClaimCommits')) {
            return JSON.stringify({
              data: {
                repository: {
                  claim0: { message: 'Symphony claim\n\nOwner: hubot\nAction: analyze' },
                  claim1: { message: 'Symphony claim\n\nOwner: monalisa\nAction: solve' },
                },
              },
            });
          }
          return JSON.stringify({
            data: {
              node: {
                items: {
                  pageInfo: { hasNextPage: false, endCursor: null },
                  nodes: [
                    {
                      id: 'PVTI_1',
                      fieldValues: {
                        nodes: [
                          {
                            __typename: 'ProjectV2ItemFieldSingleSelectValue',
                            field: { id: 'status' },
                            optionId: 'ready',
                          },
                          {
                            __typename: 'ProjectV2ItemFieldMultiSelectValue',
                            field: { id: 'keywords' },
                            options: [{ id: 'angular' }, { id: 'desktop' }],
                          },
                          {
                            __typename: 'ProjectV2ItemFieldSingleSelectValue',
                            field: { id: 'assistant-phase' },
                            optionId: 'analyze',
                          },
                          {
                            __typename: 'ProjectV2ItemFieldTextValue',
                            field: { id: 'summary' },
                            text: 'Renderer parity',
                          },
                          {
                            __typename: 'ProjectV2ItemFieldNumberValue',
                            field: { id: 'score' },
                            number: 8,
                          },
                          {
                            __typename: 'ProjectV2ItemFieldDateValue',
                            field: { id: 'target' },
                            date: '2026-08-18',
                          },
                          {
                            __typename: 'ProjectV2ItemFieldIterationValue',
                            field: { id: 'iteration' },
                            iterationId: 'sprint-1',
                          },
                        ],
                      },
                    },
                    {
                      id: 'PVTI_2',
                      fieldValues: {
                        nodes: [
                          {
                            __typename: 'ProjectV2ItemFieldSingleSelectValue',
                            field: { id: 'status' },
                            optionId: 'ready',
                          },
                          {
                            __typename: 'ProjectV2ItemFieldSingleSelectValue',
                            field: { id: 'assistant-phase' },
                            optionId: 'solve',
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          });
        }
        if (args[0] === 'issue' && args[1] === 'list') return '[]';
        if (
          args[0] === 'api' &&
          (args.some((argument) => argument.includes('/assignees')) ||
            args.some((argument) => argument.includes('/labels')))
        )
          return '[]';
        if (
          args[0] === 'api' &&
          args.includes('GET') &&
          String(args.at(-1)).includes('/git/matching-refs/heads/symphony/claims')
        ) {
          return JSON.stringify([
            {
              ref: claimReference('example/platform', '#18'),
              object: { sha: 'claim-sha-one' },
            },
            {
              ref: claimReference('example/platform', '#19'),
              object: { sha: 'claim-sha-two' },
            },
          ]);
        }
        throw new Error(`Unexpected gh invocation: ${args.join(' ')}`);
      },
    });

    const items = await tracker.listWorkItems();
    const fields = await tracker.listProjectFields();

    expect(fields.map((field) => [field.name, field.type])).toEqual([
      ['Status', 'single-select'],
      ['Keywords', 'multi-select'],
      ['Assistant phase', 'single-select'],
      ['Summary', 'text'],
      ['Score', 'number'],
      ['Target', 'date'],
      ['Iteration', 'iteration'],
    ]);
    expect(items[0]).toMatchObject({
      workspaceId: 'personal',
      sourceId: 'project',
      stageId: 'ready',
      repository: 'example/platform',
      assistanceAction: 'analyze',
      coordination: {
        state: 'claimed',
        action: 'analyze',
        owner: 'hubot',
      },
      projectFields: expect.arrayContaining([
        { fieldId: 'keywords', type: 'multi-select', value: ['angular', 'desktop'] },
      ]),
    });
    expect(items[1]).toMatchObject({
      assistanceAction: 'solve',
      coordination: {
        state: 'claimed',
        action: 'solve',
        owner: 'monalisa',
      },
    });
    expect(fields.find((field) => field.id === 'assistant-phase')).toMatchObject({
      role: 'assistance-action',
      options: expect.arrayContaining([
        expect.objectContaining({ label: 'None', assistanceAction: 'none' }),
        expect.objectContaining({ label: 'Create', assistanceAction: 'create' }),
        expect.objectContaining({ label: 'Analyze', assistanceAction: 'analyze' }),
        expect.objectContaining({ label: 'Solve', assistanceAction: 'solve' }),
      ]),
    });
    expect(queries.find((query) => query.includes('query ProjectFields'))).toContain(
      'options: multiSelectOptions',
    );
    const valuesQuery = queries.find((query) => query.includes('query ProjectBoardItems'));
    expect(valuesQuery).toContain('ProjectV2ItemFieldMultiSelectValue');
    expect(valuesQuery).toContain('... on ProjectV2MultiSelectField { id }');
    expect(valuesQuery).not.toContain('fragment ProjectFieldId on ProjectV2FieldConfiguration');
    expect(
      invocations.filter((args) =>
        args.some((argument) => argument.includes('/git/matching-refs/heads/symphony/claims')),
      ),
    ).toHaveLength(1);
    expect(queries.filter((query) => query.includes('query WorkItemClaimCommits'))).toHaveLength(1);
  });

  it('writes multi-select values through the typed GraphQL mutation', async () => {
    // arrange
    let values: readonly ProjectFieldValue[] = [
      { fieldId: 'status', type: 'single-select', value: 'ready' },
      { fieldId: 'keywords', type: 'multi-select', value: ['angular'] },
    ];
    const mutationInputs: Record<string, unknown>[] = [];
    // GitHub answers a field mutation with the item it just wrote, so the stub builds the same
    // node for the board read and for the mutation payload.
    const itemNode = () => ({
      id: 'PVTI_1',
      content: {
        __typename: 'Issue',
        id: 'I_18',
        number: 18,
        title: 'Keywords',
        repository: { nameWithOwner: 'example/platform' },
        labels: { nodes: [] },
        assignees: { nodes: [] },
      },
      fieldValues: {
        nodes: values.map((value) =>
          value.type === 'multi-select'
            ? {
                __typename: 'ProjectV2ItemFieldMultiSelectValue',
                field: { id: value.fieldId },
                options: value.value.map((id) => ({ id })),
              }
            : {
                __typename: 'ProjectV2ItemFieldSingleSelectValue',
                field: { id: value.fieldId },
                optionId: value.value,
              },
        ),
      },
    });
    const tracker = new GitHubProjectTracker({
      settings: githubSettings,
      token: async () => 'token',
      runCommand: async (args, _environment, standardInput) => {
        if (args[0] === 'project' && args[1] === 'view') return '{"id":"PVT_project"}';
        if (args[0] === 'project' && args[1] === 'item-list') {
          return JSON.stringify({
            items: [
              {
                id: 'PVTI_1',
                labels: [],
                assignees: [],
                content: {
                  number: 18,
                  title: 'Keywords',
                  repository: 'example/platform',
                },
              },
            ],
          });
        }
        if (args[0] === 'api' && args[1] === 'graphql') {
          const request = JSON.parse(standardInput ?? '{}') as {
            query: string;
            variables: Record<string, unknown>;
          };
          if (request.query.includes('query ProjectIdentity')) {
            return JSON.stringify({
              data: { organization: { projectV2: { id: 'PVT_project' } } },
            });
          }
          if (request.query.includes('query ProjectFields')) {
            return JSON.stringify({
              data: {
                node: {
                  fields: {
                    nodes: [
                      {
                        __typename: 'ProjectV2SingleSelectField',
                        id: 'status',
                        name: 'Status',
                        options: [{ id: 'ready', name: 'Ready' }],
                      },
                      {
                        __typename: 'ProjectV2MultiSelectField',
                        id: 'keywords',
                        name: 'Keywords',
                        options: [
                          { id: 'angular', name: 'Angular' },
                          { id: 'desktop', name: 'Desktop' },
                        ],
                      },
                    ],
                  },
                },
              },
            });
          }
          if (request.query.includes('query ProjectBoardItems')) {
            return JSON.stringify({
              data: { node: { items: { pageInfo: { hasNextPage: false }, nodes: [itemNode()] } } },
            });
          }
          if (request.query.includes('query ProjectBoardItem(')) {
            return JSON.stringify({ data: { node: itemNode() } });
          }
          mutationInputs.push(request.variables);
          if (request.query.includes('multiSelectOptionIds')) {
            values = values.map((value) =>
              value.fieldId === 'keywords'
                ? {
                    fieldId: 'keywords',
                    type: 'multi-select',
                    value: request.variables['value'] as readonly string[],
                  }
                : value,
            );
          }
          return JSON.stringify({
            data: { updateProjectV2ItemFieldValue: { projectV2Item: itemNode() } },
          });
        }
        if (args[0] === 'issue' && args[1] === 'list') return '[]';
        if (
          args[0] === 'api' &&
          (args.some((argument) => argument.includes('/assignees')) ||
            args.some((argument) => argument.includes('/labels')))
        )
          return '[]';
        if (args[0] === 'issue' && args[1] === 'edit') return '';
        throw new Error(`Unexpected gh invocation: ${args.join(' ')}`);
      },
    });

    await tracker.listWorkItems();
    // act
    const updated = await tracker.updateWorkItem('PVTI_1', {
      workspaceId: 'personal',
      sourceId: 'project',
      title: 'Keywords',
      body: '',
      repository: 'example/platform',
      projectFields: [
        { fieldId: 'status', type: 'single-select', value: 'ready' },
        { fieldId: 'keywords', type: 'multi-select', value: ['angular', 'desktop'] },
      ],
      labels: [],
      assignees: [],
    });

    // assert
    expect(mutationInputs).toContainEqual({
      projectId: 'PVT_project',
      itemId: 'PVTI_1',
      fieldId: 'keywords',
      value: ['angular', 'desktop'],
    });
    expect(updated.projectFields).toContainEqual({
      fieldId: 'keywords',
      type: 'multi-select',
      value: ['angular', 'desktop'],
    });
  });

  it('accepts only configured-account commands and reacts after remote execution starts', async () => {
    // arrange
    const invocations: string[][] = [];
    const tracker = new GitHubProjectTracker({
      settings: githubSettings,
      token: async () => 'token',
      runCommand: async (args, _environment, standardInput) => {
        invocations.push([...args]);
        if (args[0] === 'project' && args[1] === 'view') {
          return JSON.stringify({ id: 'PVT_project' });
        }
        if (args[0] === 'project' && args[1] === 'item-list') {
          return JSON.stringify({
            items: [
              {
                id: 'PVTI_1',
                content: {
                  number: 18,
                  title: 'Repair formatting',
                  body: 'Run the formatter.',
                  repository: 'example/platform',
                  url: 'https://github.com/example/platform/issues/18',
                },
              },
            ],
          });
        }
        if (args[0] === 'api' && args[1] === 'graphql') {
          const request = JSON.parse(standardInput ?? '{}') as {
            query: string;
          };
          if (request.query.includes('query ProjectIdentity')) {
            return JSON.stringify({
              data: { organization: { projectV2: { id: 'PVT_project' } } },
            });
          }
          if (request.query.includes('query ProjectFields')) {
            return JSON.stringify({
              data: {
                node: {
                  fields: {
                    nodes: [
                      {
                        __typename: 'ProjectV2SingleSelectField',
                        id: 'status',
                        name: 'Status',
                        options: [{ id: 'ready', name: 'Ready' }],
                      },
                    ],
                  },
                },
              },
            });
          }
          if (request.query.includes('query ProjectBoardItems')) {
            return JSON.stringify({
              data: {
                node: {
                  items: {
                    pageInfo: { hasNextPage: false },
                    nodes: [
                      {
                        id: 'PVTI_1',
                        content: {
                          __typename: 'Issue',
                          id: 'I_18',
                          number: 18,
                          title: 'Repair formatting',
                          repository: { nameWithOwner: 'example/platform' },
                          url: 'https://github.com/example/platform/issues/18',
                          labels: { nodes: [] },
                          assignees: { nodes: [] },
                        },
                        fieldValues: {
                          nodes: [
                            {
                              __typename: 'ProjectV2ItemFieldSingleSelectValue',
                              field: { id: 'status' },
                              optionId: 'ready',
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            });
          }
          if (request.query.includes('query IssueAutomation')) {
            return JSON.stringify({
              data: {
                repository: {
                  issue: {
                    title: 'Repair formatting',
                    body: 'Run the formatter.',
                    createdAt: '2026-08-11T08:00:00Z',
                    updatedAt: '2026-08-11T09:00:00Z',
                    lastEditedAt: '2026-08-11T08:30:00Z',
                    author: { login: 'octocat' },
                    userContentEdits: {
                      nodes: [{ editedAt: '2026-08-11T08:30:00Z', editor: { login: 'octocat' } }],
                    },
                    comments: {
                      pageInfo: { hasNextPage: false },
                      nodes: [
                        {
                          databaseId: 91,
                          body: '/symphony fix Run the formatter and update the PR.',
                          createdAt: '2026-08-11T09:00:00Z',
                          updatedAt: '2026-08-11T09:00:00Z',
                          author: { login: 'octocat' },
                        },
                        {
                          databaseId: 92,
                          body: '/symphony retry',
                          createdAt: '2026-08-11T09:01:00Z',
                          updatedAt: '2026-08-11T09:01:00Z',
                          author: { login: 'mallory' },
                        },
                      ],
                    },
                  },
                },
              },
            });
          }
        }
        if (args[0] === 'issue' && args[1] === 'list') return '[]';
        if (args[0] === 'api' && args.some((argument) => argument.includes('/issues/comments?'))) {
          return JSON.stringify([
            [
              {
                id: 91,
                body: '/symphony fix Run the formatter and update the PR.',
                created_at: '2026-08-11T09:00:00Z',
                updated_at: '2026-08-11T09:00:00Z',
                issue_url: 'https://api.github.com/repos/example/platform/issues/18',
                user: { login: 'octocat' },
              },
              {
                id: 92,
                body: '/symphony retry',
                created_at: '2026-08-11T09:01:00Z',
                updated_at: '2026-08-11T09:01:00Z',
                issue_url: 'https://api.github.com/repos/example/platform/issues/18',
                user: { login: 'mallory' },
              },
            ],
          ]);
        }
        if (args[0] === 'api' && args.some((argument) => argument.includes('/issues?state=all'))) {
          return JSON.stringify([[{ number: 18 }]]);
        }
        if (
          args[0] === 'api' &&
          (args.some((argument) => argument.includes('/assignees')) ||
            args.some((argument) => argument.includes('/labels')))
        )
          return '[]';
        if (args.includes('reactions')) return '';
        if (args.some((argument) => argument.includes('/reactions'))) return '';
        throw new Error(`Unexpected gh invocation: ${args.join(' ')}`);
      },
    });

    const signals = await tracker.listAutomationSignals();
    // act
    const command = signals.find((candidate) => candidate.origin === 'comment')!;

    // assert
    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'synchronize', origin: 'work-item-change' }),
        expect.objectContaining({
          action: 'solve',
          origin: 'comment',
          actorLogin: 'octocat',
          request: 'Run the formatter and update the PR.',
          externalCommentId: '91',
        }),
      ]),
    );
    expect(signals.some((candidate) => candidate.externalCommentId === '92')).toBe(false);

    await tracker.acknowledgeAutomationSignal(command, 'started');

    expect(
      invocations.some(
        (args) =>
          args.includes('POST') &&
          args.some((argument) => argument.includes('/issues/comments/91/reactions')) &&
          args.includes('content=rocket'),
      ),
    ).toBe(true);
  });

  it('publishes results as issue comments with their links and skips items without an issue', async () => {
    // arrange
    const comments: { endpoint: string; body: string }[] = [];
    const tracker = new GitHubProjectTracker({
      settings: githubSettings,
      token: async () => 'token',
      runCommand: async (args, _environment, standardInput) => {
        if (args[0] === 'api' && args[1] === 'graphql') {
          const request = JSON.parse(standardInput ?? '{}') as { query: string };
          if (request.query.includes('query ProjectIdentity')) {
            return JSON.stringify({
              data: { organization: { projectV2: { id: 'PVT_project' } } },
            });
          }
          if (request.query.includes('query ProjectFields')) {
            return JSON.stringify({
              data: { node: { fields: { pageInfo: { hasNextPage: false }, nodes: [] } } },
            });
          }
          if (request.query.includes('query ProjectBoardItems')) {
            return JSON.stringify({
              data: {
                node: {
                  items: {
                    pageInfo: { hasNextPage: false },
                    nodes: [
                      {
                        id: 'PVTI_18',
                        content: {
                          __typename: 'Issue',
                          id: 'I_18',
                          number: 18,
                          title: 'Repair formatting',
                          repository: { nameWithOwner: 'example/platform' },
                          url: 'https://github.com/example/platform/issues/18',
                          labels: { nodes: [] },
                          assignees: { nodes: [] },
                        },
                        fieldValues: { nodes: [] },
                      },
                    ],
                  },
                },
              },
            });
          }
        }
        if (args[0] === 'api' && args.some((argument) => argument.includes('/assignees'))) {
          return '[]';
        }
        const endpoint = args.find((argument) => argument.includes('/issues/'));
        if (args[0] === 'api' && args.includes('POST') && endpoint?.endsWith('/comments')) {
          const body = JSON.parse(standardInput ?? '{}') as { body: string };
          comments.push({ endpoint, body: body.body });
          return JSON.stringify({ id: 5 });
        }
        throw new Error(`Unexpected gh invocation: ${args.join(' ')}`);
      },
    });

    const [item] = await tracker.listWorkItems();
    const note = {
      kind: 'analysis',
      heading: 'Symphony analysis',
      body: '## Problem and evidence\n\nThe result never left Symphony.\n',
    } as const;

    await tracker.publishWorkItemNote(item!, note);
    await tracker.publishWorkItemNote({ ...item!, externalId: 'PVTI_draft' }, note);
    // act
    await tracker.publishWorkItemNote(item!, {
      kind: 'implementation',
      heading: 'Symphony implementation',
      body: 'The formatter now runs.',
      details: [
        {
          label: 'Pull request',
          value: '#42',
          url: 'https://github.com/example/platform/pull/42',
        },
        { label: 'Branch', value: 'codex/work-item-18' },
      ],
    });

    // assert
    expect(comments).toEqual([
      {
        endpoint: 'repos/example/platform/issues/18/comments',
        body: '## Symphony analysis\n\n## Problem and evidence\n\nThe result never left Symphony.',
      },
      {
        endpoint: 'repos/example/platform/issues/18/comments',
        body:
          '## Symphony implementation\n\n' +
          '- **Pull request:** [#42](https://github.com/example/platform/pull/42)\n' +
          '- **Branch:** `codex/work-item-18`\n\n' +
          'The formatter now runs.',
      },
    ]);
  });

  it('writes an operator comment on the issue and answers with what GitHub stored', async () => {
    // arrange
    const written: { endpoint: string; body: string }[] = [];
    const tracker = new GitHubProjectTracker({
      settings: githubSettings,
      token: async () => 'token',
      now: () => '2026-08-20T09:00:00.000Z',
      runCommand: async (args, _environment, standardInput) => {
        if (args[0] === 'api' && args[1] === 'graphql') {
          const request = JSON.parse(standardInput ?? '{}') as { query: string };
          if (request.query.includes('query ProjectIdentity')) {
            return JSON.stringify({
              data: { organization: { projectV2: { id: 'PVT_project' } } },
            });
          }
          if (request.query.includes('query ProjectFields')) {
            return JSON.stringify({
              data: { node: { fields: { pageInfo: { hasNextPage: false }, nodes: [] } } },
            });
          }
          if (request.query.includes('query ProjectBoardItems')) {
            return JSON.stringify({
              data: {
                node: {
                  items: {
                    pageInfo: { hasNextPage: false },
                    nodes: [
                      {
                        id: 'PVTI_18',
                        content: {
                          __typename: 'Issue',
                          id: 'I_18',
                          number: 18,
                          title: 'Repair formatting',
                          repository: { nameWithOwner: 'example/platform' },
                          url: 'https://github.com/example/platform/issues/18',
                          labels: { nodes: [] },
                          assignees: { nodes: [] },
                        },
                        fieldValues: { nodes: [] },
                      },
                    ],
                  },
                },
              },
            });
          }
        }
        if (args[0] === 'api' && args.some((argument) => argument.includes('/assignees'))) {
          return '[]';
        }
        const endpoint = args.find((argument) => argument.includes('/issues/'));
        if (args[0] === 'api' && args.includes('POST') && endpoint?.endsWith('/comments')) {
          const payload = JSON.parse(standardInput ?? '{}') as { body: string };
          written.push({ endpoint, body: payload.body });
          return JSON.stringify({
            id: 8801,
            body: payload.body,
            created_at: '2026-08-20T09:00:01Z',
            html_url: 'https://github.com/example/platform/issues/18#issuecomment-8801',
            user: { login: 'octocat', avatar_url: 'https://avatars.example/octocat' },
          });
        }
        throw new Error(`Unexpected gh invocation: ${args.join(' ')}`);
      },
    });
    const [item] = await tracker.listWorkItems();

    // act
    const comment = await tracker.createWorkItemComment(
      item!.id,
      'Reconcile **managed workspaces** first.',
    );

    // assert
    expect(written).toEqual([
      {
        endpoint: 'repos/example/platform/issues/18/comments',
        body: 'Reconcile **managed workspaces** first.',
      },
    ]);
    expect(comment).toEqual({
      id: '8801',
      author: { login: 'octocat', avatarUrl: 'https://avatars.example/octocat' },
      body: 'Reconcile **managed workspaces** first.',
      bodyFormat: 'markdown',
      createdAt: '2026-08-20T09:00:01Z',
      url: 'https://github.com/example/platform/issues/18#issuecomment-8801',
    });
  });

  it('grants one atomic claim across independent machines and releases only the owner token', async () => {
    // arrange
    const references = new Map<string, string>([['heads/main', 'ba5e']]);
    let commitSequence = 0;
    const phaseValues: string[] = [];
    const assigneeEdits: string[] = [];
    const runCommand = async (
      args: readonly string[],
      _environment: NodeJS.ProcessEnv,
      input?: string,
    ) => {
      if (args[0] === 'issue' && args[1] === 'edit') {
        assigneeEdits.push(args.slice(2).join(' '));
        return '';
      }
      if (args[0] === 'project' && args[1] === 'view') return '{"id":"PVT_project"}';
      if (args[0] === 'project' && args[1] === 'item-list') {
        return JSON.stringify({
          items: [
            {
              id: 'PVTI_1',
              assignees: ['another-contributor'],
              content: { number: 18, title: 'Coordinate me', repository: 'example/platform' },
            },
          ],
        });
      }
      if (args[0] === 'issue' && args[1] === 'list') return '[]';
      if (
        args[0] === 'api' &&
        (args.some((argument) => argument.includes('/assignees')) ||
          args.some((argument) => argument.includes('/labels')))
      )
        return '[]';
      if (args[0] === 'api' && args[1] === 'graphql') {
        const request = JSON.parse(input ?? '{}') as {
          query: string;
          variables: Record<string, unknown>;
        };
        if (request.query.includes('query ProjectIdentity')) {
          return JSON.stringify({
            data: { organization: { projectV2: { id: 'PVT_project' } } },
          });
        }
        if (request.query.includes('query ProjectFields')) {
          return JSON.stringify({
            data: {
              node: {
                fields: {
                  nodes: [
                    {
                      __typename: 'ProjectV2SingleSelectField',
                      id: 'status',
                      name: 'Status',
                      options: [{ id: 'backlog', name: 'Backlog' }],
                    },
                    {
                      __typename: 'ProjectV2SingleSelectField',
                      id: 'assistant-phase',
                      name: 'Assistant phase',
                      options: [
                        { id: 'none', name: 'None' },
                        { id: 'create', name: 'Create' },
                        { id: 'analyze', name: 'Analyze' },
                        { id: 'solve', name: 'Solve' },
                      ],
                    },
                  ],
                },
              },
            },
          });
        }
        if (request.query.includes('query ProjectBoardItems')) {
          return JSON.stringify({
            data: {
              node: {
                items: {
                  pageInfo: { hasNextPage: false },
                  nodes: [
                    {
                      id: 'PVTI_1',
                      content: {
                        __typename: 'Issue',
                        id: 'I_18',
                        number: 18,
                        title: 'Coordinate me',
                        repository: { nameWithOwner: 'example/platform' },
                        labels: { nodes: [] },
                        assignees: { nodes: [{ login: 'another-contributor' }] },
                      },
                      fieldValues: { nodes: [] },
                    },
                  ],
                },
              },
            },
          });
        }
        phaseValues.push(String(request.variables['value']));
        return JSON.stringify({
          data: { updateProjectV2ItemFieldValue: { projectV2Item: { id: 'PVTI_1' } } },
        });
      }
      if (args[0] === 'api') {
        const method = args[args.indexOf('--method') + 1];
        const endpoint = args.find((argument) => argument.startsWith('repos/')) ?? '';
        if (method === 'GET' && /\/issues\/\d+$/u.test(endpoint)) {
          return JSON.stringify({ assignees: [{ login: 'another-contributor' }] });
        }
        if (method === 'GET' && endpoint.includes('/git/ref/')) {
          const reference = decodeURIComponent(endpoint.split('/git/ref/')[1] ?? '');
          const sha = references.get(reference);
          if (!sha) throw new Error('HTTP 404: Not Found');
          return JSON.stringify({ object: { sha } });
        }
        if (method === 'GET' && endpoint.includes('/git/commits/')) {
          return JSON.stringify({ tree: { sha: '7ee' } });
        }
        if (method === 'POST' && endpoint.endsWith('/git/commits')) {
          commitSequence += 1;
          return JSON.stringify({ sha: `c1a1${commitSequence}` });
        }
        if (method === 'POST' && endpoint.endsWith('/git/refs')) {
          const body = JSON.parse(input ?? '{}') as { ref: string; sha: string };
          const reference = body.ref.replace(/^refs\//u, '');
          if (references.has(reference)) throw new Error('HTTP 422: Reference already exists');
          references.set(reference, body.sha);
          return JSON.stringify({ ref: body.ref, object: { sha: body.sha } });
        }
        if (method === 'PATCH' && endpoint.includes('/git/refs/')) {
          const body = JSON.parse(input ?? '{}') as { sha: string };
          const reference = endpoint.split('/git/refs/')[1] ?? '';
          references.set(reference, body.sha);
          return JSON.stringify({ ref: `refs/${reference}`, object: { sha: body.sha } });
        }
        if (method === 'DELETE' && endpoint.includes('/git/refs/')) {
          const reference = endpoint.split('/git/refs/')[1] ?? '';
          references.delete(reference);
          return '';
        }
      }
      throw new Error(`Unexpected gh invocation: ${args.join(' ')}`);
    };
    const trackerFor = (login: string) => {
      const settings = githubSettings();
      return new GitHubProjectTracker({
        settings: () => ({
          ...settings,
          connections: settings.connections.map((connection) =>
            connection.kind === 'github' ? { ...connection, accountLogin: login } : connection,
          ),
        }),
        runCommand: (args, environment, input) =>
          args[0] === 'api' && args.includes('user')
            ? Promise.resolve(`${login}\n`)
            : runCommand(args, environment, input),
      });
    };
    const first = trackerFor('octocat');
    const second = trackerFor('hubot');
    const [firstItem] = await first.listWorkItems();
    const [secondItem] = await second.listWorkItems();

    const claims = await Promise.all([
      first.acquireWorkItemClaim(firstItem!, 'analyze', 'execution-one'),
      second.acquireWorkItemClaim(secondItem!, 'analyze', 'execution-two'),
    ]);
    const winnerIndex = claims.findIndex((claim) => claim.status === 'acquired');
    // act
    const actual = claims.filter((claim) => claim.status === 'acquired');

    // assert
    expect(actual).toHaveLength(1);
    expect(claims.filter((claim) => claim.status === 'contended')).toHaveLength(1);
    expect(commitSequence).toBe(1);
    expect(phaseValues).toEqual(['analyze']);
    // Triggering the action makes the claiming account the only assignee - the previous
    // assignee is removed in the same edit, and the losing machine never writes one.
    const winnerLogin = winnerIndex === 0 ? 'octocat' : 'hubot';
    expect(assigneeEdits).toEqual([
      `18 --repo example/platform --add-assignee ${winnerLogin} --remove-assignee another-contributor`,
    ]);

    const winner = winnerIndex === 0 ? first : second;
    const acquisition = claims[winnerIndex]!;
    if (acquisition.status !== 'acquired') throw new Error('Expected an acquired claim.');
    await winner.releaseWorkItemClaim(acquisition.claim);

    expect(phaseValues).toEqual(['analyze', 'none']);
    expect([...references.keys()]).toEqual(['heads/main']);
  });

  it('lets a second orchestrator take a work item over once the claim lease expired', async () => {
    // arrange
    const harness = createClaimHarness();
    const first = harness.trackerFor('octocat');
    const second = harness.trackerFor('hubot');
    const [firstItem] = await first.listWorkItems();
    const [secondItem] = await second.listWorkItems();

    const held = await first.acquireWorkItemClaim(firstItem!, 'analyze', 'execution-one');
    // act
    if (held.status !== 'acquired') throw new Error('Expected the first claim to be acquired.');
    // assert
    expect(held.claim.claimVersion).toBe(1);
    expect(held.claim.leaseUntil).toBe('2026-08-19T10:30:00.000Z');
    expect(harness.issueAssignees).toEqual(['octocat']);

    // While the lease is valid the work item stays off limits for the second orchestrator.
    await expect(
      second.acquireWorkItemClaim(secondItem!, 'analyze', 'execution-two'),
    ).resolves.toMatchObject({ status: 'contended' });

    // The first machine dies; once its lease elapses the second one may take the item over.
    harness.setNow('2026-08-19T10:31:00.000Z');
    const takeover = await second.acquireWorkItemClaim(secondItem!, 'analyze', 'execution-two');
    if (takeover.status !== 'acquired') throw new Error('Expected the expired claim to be taken.');
    expect(takeover.claim.owner).toBe('hubot');
    expect(takeover.claim.claimVersion).toBe(2);
    // The takeover reassigns the issue: the new owner becomes the only assignee even though
    // this machine never saw the previous assignment in its own projection.
    expect(harness.issueAssignees).toEqual(['hubot']);

    // The original worker comes back and must be refused: its fencing token is behind.
    await expect(first.renewWorkItemClaim(held.claim)).rejects.toThrow(/taken over by hubot/u);
  });

  it('reports a claim whose reference disappeared as lost instead of as a transport error', async () => {
    // arrange
    const harness = createClaimHarness();
    const tracker = harness.trackerFor('octocat');
    const [item] = await tracker.listWorkItems();

    const held = await tracker.acquireWorkItemClaim(item!, 'analyze', 'execution-one');
    if (held.status !== 'acquired') throw new Error('Expected the claim to be acquired.');

    // Whatever removed the reference - another orchestrator, a person, a sweep - the claim is
    // simply gone. Passing GitHub's 404 on would tell the operator about a URL, not about that.
    // act
    harness.references.delete(claimReference('example/platform', '#18').replace(/^refs\//u, ''));

    // assert
    await expect(tracker.advanceWorkItemClaim(held.claim, 'solve')).rejects.toBeInstanceOf(
      WorkItemClaimMissingError,
    );
    // Releasing what is already gone is the outcome the caller wanted, so it completes quietly.
    await expect(tracker.releaseWorkItemClaim(held.claim)).resolves.toBeUndefined();
  });

  it('sweeps claim references whose lease elapsed and keeps every live one', async () => {
    // arrange
    const harness = createClaimHarness();
    const tracker = harness.trackerFor('octocat');
    const [item] = await tracker.listWorkItems();

    const held = await tracker.acquireWorkItemClaim(item!, 'analyze', 'execution-one');
    if (held.status !== 'acquired') throw new Error('Expected the claim to be acquired.');
    const abandoned = claimReference('example/platform', '#404').replace(/^refs\//u, '');
    harness.references.set(abandoned, 'c1a1-abandoned');
    // act
    harness.commitMessages.set(
      'c1a1-abandoned',
      [
        'Symphony claim for example/platform work item 404',
        '',
        'Owner: hubot',
        'Action: analyze',
        'Lease-Until: 2026-08-19T09:00:00.000Z',
      ].join('\n'),
    );

    // Inside its lease the live claim is untouchable, so the sweep finds nothing to release.
    // assert
    await expect(tracker.releaseAbandonedWorkItemClaims([held.claim.id])).resolves.toBe(1);
    expect(harness.references.has(abandoned)).toBe(false);
    expect(
      harness.references.has(claimReference('example/platform', '#18').replace(/^refs\//u, '')),
    ).toBe(true);

    // The live claim is only protected by its lease once the caller stops naming it as retained.
    harness.setNow('2026-08-19T10:31:00.000Z');
    await expect(tracker.releaseAbandonedWorkItemClaims([])).resolves.toBe(1);
    expect(
      harness.references.has(claimReference('example/platform', '#18').replace(/^refs\//u, '')),
    ).toBe(false);
  });

  it('extends a lease without reporting a claim commit on the work item every heartbeat', async () => {
    // arrange
    const harness = createClaimHarness();
    const tracker = harness.trackerFor('octocat');
    const [item] = await tracker.listWorkItems();

    const held = await tracker.acquireWorkItemClaim(item!, 'analyze', 'execution-one');
    // act
    if (held.status !== 'acquired') throw new Error('Expected the claim to be acquired.');
    // assert
    expect(harness.writtenCommits).toHaveLength(1);
    // GitHub would report a claim commit naming "#18" on the work item itself.
    expect(harness.writtenCommits[0]).not.toContain('#18');
    expect(harness.writtenCommits[0]).toContain('Symphony claim for example/platform work item 18');

    // Heartbeats inside the lease only re-check ownership; they must not write to the repository.
    let claim = held.claim;
    for (const instant of ['10:01', '10:05', '10:10', '10:14']) {
      harness.setNow(`2026-08-19T${instant}:00.000Z`);
      claim = await tracker.renewWorkItemClaim(claim);
    }
    expect(harness.writtenCommits).toHaveLength(1);
    expect(claim.leaseUntil).toBe('2026-08-19T10:30:00.000Z');
    expect(claim.id).toBe(held.claim.id);

    // Once half the lease is gone it is extended, so it never lapses under a live run.
    harness.setNow('2026-08-19T10:16:00.000Z');
    claim = await tracker.renewWorkItemClaim(claim);
    expect(harness.writtenCommits).toHaveLength(2);
    expect(claim.leaseUntil).toBe('2026-08-19T10:46:00.000Z');
    expect(claim.id).not.toBe(held.claim.id);

    // The extension is readable by every other orchestrator, which is what a takeover checks.
    expect(harness.writtenCommits[1]).toContain('Lease-Until: 2026-08-19T10:46:00.000Z');
  });

  it('turns every renamed status option into a column and keeps items in their columns', async () => {
    // arrange
    const statusOptions = [
      { id: 'opt-backlog', name: 'Backlog' },
      { id: 'opt-qualified', name: 'Qualified' },
      { id: 'opt-ready', name: 'Ready' },
      { id: 'opt-progress', name: 'Progress' },
      { id: 'opt-acceptance', name: 'Acceptance' },
      { id: 'opt-done', name: 'Done' },
      { id: 'opt-parked', name: 'Parked' },
    ];
    const createTracker = (settings: IApplicationSettings) =>
      new GitHubProjectTracker({
        settings: () => settings,
        token: async () => 'token',
        runCommand: async (args, _environment, standardInput) => {
          if (args[0] === 'api' && args[1] === 'graphql') {
            const request = JSON.parse(standardInput ?? '{}') as {
              query: string;
              variables: Record<string, unknown>;
            };
            if (request.query.includes('query ProjectIdentity')) {
              return JSON.stringify({
                data: { organization: { projectV2: { id: 'PVT_project' } } },
              });
            }
            if (request.query.includes('query ProjectFields')) {
              return JSON.stringify({
                data: {
                  node: {
                    fields: {
                      pageInfo: { hasNextPage: false },
                      nodes: [
                        {
                          __typename: 'ProjectV2SingleSelectField',
                          id: 'status',
                          name: 'Status',
                          options: statusOptions,
                        },
                      ],
                    },
                  },
                },
              });
            }
            if (request.query.includes('query ProjectBoardItems')) {
              const item = (number: number, optionId: string | undefined) => ({
                id: `PVTI_${number}`,
                content: {
                  __typename: 'Issue',
                  id: `I_${number}`,
                  number,
                  title: `Item ${number}`,
                  repository: { nameWithOwner: 'example/platform' },
                  labels: { pageInfo: { hasNextPage: false }, nodes: [] },
                  assignees: { pageInfo: { hasNextPage: false }, nodes: [] },
                },
                fieldValues: {
                  pageInfo: { hasNextPage: false },
                  nodes: optionId
                    ? [
                        {
                          __typename: 'ProjectV2ItemFieldSingleSelectValue',
                          field: { id: 'status' },
                          optionId,
                        },
                      ]
                    : [],
                },
              });
              return JSON.stringify({
                data: {
                  node: {
                    items: {
                      pageInfo: { hasNextPage: false, endCursor: null },
                      nodes: [
                        item(1, 'opt-qualified'),
                        item(2, 'opt-acceptance'),
                        item(3, 'opt-parked'),
                        item(4, undefined),
                      ],
                    },
                  },
                },
              });
            }
          }
          if (
            args[0] === 'api' &&
            args.some((argument) => /\/(assignees|labels)/u.test(argument))
          ) {
            return '[]';
          }
          throw new Error(`Unexpected gh invocation: ${args.join(' ')}`);
        },
      });

    const tracker = createTracker(githubSettings());
    const items = await tracker.listWorkItems();
    const columns = await tracker.listBoardColumns();

    // act
    const actual = columns.map((column) => [column.id, column.label]);

    // assert
    expect(actual).toEqual(statusOptions.map((option) => [option.id, option.name]));
    expect(columns.every((column) => column.sourceId === 'project')).toBe(true);
    // Without saved mappings the tracker guesses nothing: columns carry no stage, and items
    // stay visible without one so automation leaves them alone.
    expect(columns.some((column) => column.stageId)).toBe(false);
    expect(items.map((item) => [item.externalId, item.boardColumnId, item.stageId])).toEqual([
      ['#1', 'opt-qualified', undefined],
      ['#2', 'opt-acceptance', undefined],
      ['#3', 'opt-parked', undefined],
      ['#4', undefined, undefined],
    ]);
    await expect(tracker.transition('PVTI_1', 'ready')).rejects.toThrow(
      /no status column mapped to the "ready" stage/u,
    );

    const settings = githubSettings();
    const mapped = createTracker({
      ...settings,
      workItemSources: settings.workItemSources.map((source) =>
        source.provider === 'github-projects'
          ? {
              ...source,
              columnMappings: [
                { columnId: 'opt-parked', stageId: 'backlog' },
                { columnId: 'opt-qualified', stageId: 'qualified' },
                { columnId: 'opt-acceptance', stageId: 'acceptance' },
              ],
            }
          : source,
      ),
    });
    const mappedItems = await mapped.listWorkItems();
    const mappedColumns = await mapped.listBoardColumns();
    expect(mappedColumns.find((column) => column.id === 'opt-parked')?.stageId).toBe('backlog');
    expect(mappedColumns.find((column) => column.id === 'opt-qualified')?.stageId).toBe(
      'qualified',
    );
    expect(mappedItems.map((item) => item.stageId)).toEqual([
      'qualified',
      'acceptance',
      'backlog',
      undefined,
    ]);
    const metadata = await mapped.listEditorMetadata('example/platform', 'personal', 'project');
    expect(metadata.states.map((column) => column.label)).toEqual(
      statusOptions.map((option) => option.name),
    );
  });

  it('discovers account and repository projects and reads project columns for the settings editor', async () => {
    // act
    // arrange
    const queries: { query: string; variables: Record<string, unknown> }[] = [];
    // assert
    const tracker = new GitHubProjectTracker({
      settings: githubSettings,
      token: async () => 'token',
      runCommand: async (args, _environment, standardInput) => {
        if (args[0] === 'api' && args[1] === 'graphql') {
          const request = JSON.parse(standardInput ?? '{}') as {
            query: string;
            variables: Record<string, unknown>;
          };
          queries.push(request);
          const project = (number: number, title: string, ownerType: 'User' | 'Organization') => ({
            id: `PVT_${number}`,
            number,
            title,
            url: `https://github.com/${ownerType === 'User' ? 'users' : 'orgs'}/example/projects/${number}`,
            closed: false,
            owner: { __typename: ownerType, login: 'example' },
          });
          if (request.query.includes('query AccountProjects')) {
            const cursor = request.variables['cursor'] as string | undefined;
            return JSON.stringify({
              data: {
                viewer: {
                  login: 'octocat',
                  projectsV2: {
                    pageInfo: cursor
                      ? { hasNextPage: false, endCursor: null }
                      : { hasNextPage: true, endCursor: 'more' },
                    nodes: cursor ? [project(3, 'flamox', 'User')] : [project(1, 'Mosaik', 'User')],
                  },
                },
              },
            });
          }
          if (request.query.includes('query RepositoryProjects')) {
            return JSON.stringify({
              data: {
                repository: {
                  projectsV2: {
                    pageInfo: { hasNextPage: false },
                    nodes: [project(3, 'flamox', 'User'), project(7, 'Roadmap', 'Organization')],
                  },
                },
              },
            });
          }
          if (request.query.includes('query ProjectIdentity')) {
            expect(request.variables).toEqual({ owner: 'example', number: 7 });
            return JSON.stringify({
              data: { organization: { projectV2: { id: 'PVT_7' } } },
            });
          }
          if (request.query.includes('query ProjectFields')) {
            return JSON.stringify({
              data: {
                node: {
                  fields: {
                    pageInfo: { hasNextPage: false },
                    nodes: [
                      {
                        __typename: 'ProjectV2SingleSelectField',
                        id: 'status',
                        name: 'Status',
                        options: [
                          { id: 'todo', name: 'Todo' },
                          { id: 'wip', name: 'In development' },
                          { id: 'custom', name: 'Waiting for customer' },
                        ],
                      },
                    ],
                  },
                },
              },
            });
          }
        }
        throw new Error(`Unexpected gh invocation: ${args.join(' ')}`);
      },
    });

    const projects = await tracker.listProjects('personal', 'github');
    expect(
      projects.map((project) => [
        project.ownerType,
        project.projectNumber,
        project.title,
        project.origin,
      ]),
    ).toEqual([
      ['user', 3, 'flamox', 'repository'],
      ['user', 1, 'Mosaik', 'account'],
      ['organization', 7, 'Roadmap', 'repository'],
    ]);
    expect(queries.filter((entry) => entry.query.includes('query AccountProjects'))).toHaveLength(
      2,
    );

    const columns = await tracker.listSourceColumns({
      id: 'draft',
      workspaceId: 'personal',
      connectionId: 'github',
      provider: 'github-projects',
      displayName: 'Roadmap',
      ownerType: 'organization',
      owner: 'example',
      projectNumber: 7,
      enabled: true,
    });
    expect(columns).toEqual([
      { id: 'todo', label: 'Todo' },
      { id: 'wip', label: 'In development' },
      { id: 'custom', label: 'Waiting for customer' },
    ]);
  });

  it('reports a status write from a project read that started after it', async () => {
    // arrange
    let status = 'ready';
    let boardReads = 0;
    let boardReadStarted = (): void => {};
    let releaseFirstBoardRead = (): void => {};
    const secondBoardRead = new Promise<void>((resolve) => {
      boardReadStarted = resolve;
    });
    const firstBoardReadReleased = new Promise<void>((resolve) => {
      releaseFirstBoardRead = resolve;
    });
    const tracker = new GitHubProjectTracker({
      settings: githubSettings,
      token: async () => 'token',
      runCommand: async (args, _environment, standardInput) => {
        if (args[0] === 'api' && args[1] === 'graphql') {
          const request = JSON.parse(standardInput ?? '{}') as {
            query: string;
            variables: Record<string, unknown>;
          };
          if (request.query.includes('query ProjectIdentity')) {
            return JSON.stringify({
              data: { organization: { projectV2: { id: 'PVT_project' } } },
            });
          }
          if (request.query.includes('query ProjectFields')) {
            return JSON.stringify({
              data: {
                node: {
                  fields: {
                    nodes: [
                      {
                        __typename: 'ProjectV2SingleSelectField',
                        id: 'status',
                        name: 'Status',
                        options: [
                          { id: 'ready', name: 'Ready' },
                          { id: 'done', name: 'Done' },
                        ],
                      },
                    ],
                  },
                },
              },
            });
          }
          if (request.query.includes('query ProjectBoardItems')) {
            // The status this read observes, fixed before it is allowed to answer: a read that
            // started earlier cannot see a write that lands while it is still running.
            const observed = status;
            boardReads += 1;
            if (boardReads === 2) {
              boardReadStarted();
              await firstBoardReadReleased;
            }
            return JSON.stringify({
              data: {
                node: {
                  items: {
                    pageInfo: { hasNextPage: false },
                    nodes: [
                      {
                        id: 'PVTI_1',
                        content: {
                          __typename: 'Issue',
                          id: 'I_18',
                          number: 18,
                          title: 'Period picker',
                          repository: { nameWithOwner: 'example/platform' },
                          labels: { nodes: [] },
                          assignees: { nodes: [] },
                        },
                        fieldValues: {
                          nodes: [
                            {
                              __typename: 'ProjectV2ItemFieldSingleSelectValue',
                              field: { id: 'status' },
                              optionId: observed,
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            });
          }
          status = request.variables['value'] as string;
          // The write answers from its own payload, so it reports the column it just set even
          // while a board read that started earlier is still returning the previous one.
          return JSON.stringify({
            data: {
              updateProjectV2ItemFieldValue: {
                projectV2Item: {
                  id: 'PVTI_1',
                  content: {
                    __typename: 'Issue',
                    id: 'I_18',
                    number: 18,
                    title: 'Period picker',
                    repository: { nameWithOwner: 'example/platform' },
                    labels: { nodes: [] },
                    assignees: { nodes: [] },
                  },
                  fieldValues: {
                    nodes: [
                      {
                        __typename: 'ProjectV2ItemFieldSingleSelectValue',
                        field: { id: 'status' },
                        optionId: status,
                      },
                    ],
                  },
                },
              },
            },
          });
        }
        if (args[0] === 'issue' && args[1] === 'list') return '[]';
        if (
          args[0] === 'api' &&
          (args.some((argument) => argument.includes('/assignees')) ||
            args.some((argument) => argument.includes('/labels')))
        ) {
          return '[]';
        }
        throw new Error(`Unexpected gh invocation: ${args.join(' ')}`);
      },
    });

    await tracker.listWorkItems();
    const boardRefresh = tracker.listWorkItems();
    await secondBoardRead;
    const moved = tracker.transition('PVTI_1', 'done');
    // act
    releaseFirstBoardRead();

    // assert
    await expect(moved).resolves.toMatchObject({ stageId: 'done', boardColumnId: 'done' });
    await expect(boardRefresh).resolves.toMatchObject([{ stageId: 'ready' }]);
  });
  it('moves a card without reading the project back', async () => {
    // arrange
    const queries: string[] = [];
    let status = 'ready';
    const itemNode = () => ({
      id: 'PVTI_1',
      content: {
        __typename: 'Issue',
        id: 'I_18',
        number: 18,
        title: 'Period picker',
        repository: { nameWithOwner: 'example/platform' },
        labels: { pageInfo: { hasNextPage: false }, nodes: [] },
        assignees: { pageInfo: { hasNextPage: false }, nodes: [] },
      },
      fieldValues: {
        pageInfo: { hasNextPage: false },
        nodes: [
          {
            __typename: 'ProjectV2ItemFieldSingleSelectValue',
            field: { id: 'status' },
            optionId: status,
          },
        ],
      },
    });
    const tracker = new GitHubProjectTracker({
      settings: githubSettings,
      token: async () => 'token',
      runCommand: async (args, _environment, standardInput) => {
        if (args[0] === 'api' && args[1] === 'graphql') {
          const request = JSON.parse(standardInput ?? '{}') as {
            query: string;
            variables: Record<string, unknown>;
          };
          queries.push(request.query);
          if (request.query.includes('query ProjectIdentity')) {
            return JSON.stringify({
              data: { organization: { projectV2: { id: 'PVT_project' } } },
            });
          }
          if (request.query.includes('query ProjectFields')) {
            return JSON.stringify({
              data: {
                node: {
                  fields: {
                    pageInfo: { hasNextPage: false },
                    nodes: [
                      {
                        __typename: 'ProjectV2SingleSelectField',
                        id: 'status',
                        name: 'Status',
                        options: [
                          { id: 'ready', name: 'Ready' },
                          { id: 'done', name: 'Done' },
                        ],
                      },
                    ],
                  },
                },
              },
            });
          }
          if (request.query.includes('query ProjectBoardItems')) {
            return JSON.stringify({
              data: { node: { items: { pageInfo: { hasNextPage: false }, nodes: [itemNode()] } } },
            });
          }
          status = request.variables['value'] as string;
          return JSON.stringify({
            data: { updateProjectV2ItemFieldValue: { projectV2Item: itemNode() } },
          });
        }
        if (
          args[0] === 'api' &&
          (args.some((argument) => argument.includes('/assignees')) ||
            args.some((argument) => argument.includes('/labels')))
        ) {
          return '[]';
        }
        throw new Error(`Unexpected gh invocation: ${args.join(' ')}`);
      },
    });

    await tracker.listWorkItems();
    queries.length = 0;
    // act
    const moved = await tracker.moveToColumn('PVTI_1', 'done');

    // assert
    expect(moved).toMatchObject({ stageId: 'done', boardColumnId: 'done' });
    // One mutation, and nothing else: neither the project identity, nor its fields, nor its
    // items are read again for a column change.
    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain('mutation UpdateProjectField');
  });
});

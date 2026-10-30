// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { RemoteProviderAuthenticationRequiredError } from '@symphony/application-core';
import { createDefaultApplicationSettings } from '@symphony/configuration-composition';
import { suggestStageId } from '@symphony/domain-work';
import { AzureDevOpsWorkTracker } from './AzureDevOpsWorkTracker';

// #endregion

describe('AzureDevOpsWorkTracker', () => {
  it('suggests every Bridge Team column without treating team qualifiers as status text', () => {
    // arrange
    const stages = createDefaultApplicationSettings('/tmp').workflow.stages;

    // act/assert
    expect(suggestStageId('New', stages)).toBe('backlog');
    expect(suggestStageId('Prepared (PO)', stages)).toBe('qualified');
    expect(suggestStageId('Preparation (Devs)', stages)).toBe('ready');
    expect(suggestStageId('In progress (Devs)', stages)).toBe('progress');
    expect(suggestStageId('Acceptance (PO)', stages)).toBe('acceptance');
    expect(suggestStageId('Rollout', stages)).toBe('progress');
    expect(suggestStageId('Done', stages)).toBe('done');
  });

  it('signals a missing credential without making a provider request', async () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/tmp');
    const settings = {
      ...defaults,
      connections: [
        ...defaults.connections,
        {
          id: 'ado',
          workspaceId: 'personal',
          kind: 'azure-devops' as const,
          displayName: 'Platform Engine',
          organization: 'serviceware-se',
          credentialRef: 'env:SERVICEWARE_ADO_PAT',
        },
      ],
      workItemSources: [
        {
          id: 'source',
          workspaceId: 'personal',
          connectionId: 'ado',
          provider: 'azure-devops' as const,
          displayName: 'Bridge Team',
          project: 'Platform Engine',
          wiql: 'SELECT [System.Id] FROM WorkItems',
          enabled: true,
        },
      ],
    };
    const fetch = vi.fn();
    const tracker = new AzureDevOpsWorkTracker({
      settings: () => settings,
      credential: () => undefined,
      fetch: fetch as typeof globalThis.fetch,
    });

    // act
    const result = tracker.listWorkItems();

    // assert
    await expect(result).rejects.toBeInstanceOf(RemoteProviderAuthenticationRequiredError);
    await expect(result).rejects.toThrow(
      'Sign in to Azure DevOps for Platform Engine before continuing.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('turns an Azure DevOps sign-in page into a clear credential error', async () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/tmp');
    const settings = {
      ...defaults,
      connections: [
        ...defaults.connections,
        {
          id: 'ado',
          workspaceId: 'personal',
          kind: 'azure-devops' as const,
          displayName: 'Platform Engine',
          organization: 'serviceware-se',
        },
      ],
      workItemSources: [
        {
          id: 'source',
          workspaceId: 'personal',
          connectionId: 'ado',
          provider: 'azure-devops' as const,
          displayName: 'Bridge Team',
          project: 'Platform Engine',
          wiql: 'SELECT [System.Id] FROM WorkItems',
          enabled: true,
        },
      ],
    };
    const tracker = new AzureDevOpsWorkTracker({
      settings: () => settings,
      credential: () => ({ scheme: 'Basic', token: 'invalid-pat' }),
      fetch: vi.fn(
        async () =>
          new Response('<html><title>Sign in</title></html>', {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          }),
      ) as typeof globalThis.fetch,
    });

    // act
    const result = tracker.listWorkItems();

    // assert
    await expect(result).rejects.toBeInstanceOf(RemoteProviderAuthenticationRequiredError);
    await expect(result).rejects.toThrow(
      'Azure DevOps did not accept the credential for Platform Engine. Verify the personal access token and try again.',
    );
  });

  it('queries only selected workspace sources and maps columns through saved mappings', async () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/tmp');
    const settings = {
      ...defaults,
      connections: [
        ...defaults.connections,
        {
          id: 'ado-a',
          workspaceId: 'personal',
          kind: 'azure-devops' as const,
          displayName: 'Customer A',
          organization: 'customer-a',
          credentialRef: 'env:ADO_A',
        },
      ],
      workItemSources: [
        {
          id: 'source-a',
          workspaceId: 'personal',
          connectionId: 'ado-a',
          provider: 'azure-devops' as const,
          displayName: 'Customer A backlog',
          project: 'Platform',
          wiql: 'SELECT [System.Id] FROM WorkItems',
          columnMappings: [{ columnId: 'Active', stageId: 'progress' as const }],
          enabled: true,
        },
      ],
    };
    const requests: Array<{ url: string; authorization: string | null }> = [];
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, authorization: new Headers(init?.headers).get('Authorization') });
      if (url.includes('workitemsbatch'))
        return Response.json({
          value: [
            {
              id: 42,
              rev: 7,
              _links: {
                html: { href: 'https://dev.azure.com/customer-a/Platform/_workitems/edit/42' },
              },
              fields: {
                'System.Title': 'Make provider boundaries explicit',
                'System.Description': '<p>Acceptance criteria</p>',
                'System.State': 'Active',
                'System.WorkItemType': 'Task',
                'System.Tags': 'architecture; customer-a',
                'System.CreatedDate': '2026-08-09T10:00:00Z',
                'System.ChangedDate': '2026-08-10T10:00:00Z',
              },
            },
          ],
        });
      if (url.includes('workitemtypes/Task/states'))
        return Response.json({
          value: [
            { name: 'New', category: 'Proposed' },
            { name: 'Active', category: 'InProgress' },
            { name: 'Closed', category: 'Completed' },
          ],
        });
      return Response.json({ workItems: [{ id: 42 }] });
    });
    const tracker = new AzureDevOpsWorkTracker({
      settings: () => settings,
      credential: () => ({ scheme: 'Basic', token: 'customer-a-pat' }),
      fetch: fetch as typeof globalThis.fetch,
    });

    // act
    const items = await tracker.listWorkItems();

    // assert
    expect(items).toEqual([
      expect.objectContaining({
        id: 'personal:source-a:42',
        workspaceId: 'personal',
        sourceId: 'source-a',
        externalId: 'AB#42',
        title: 'Make provider boundaries explicit',
        stageId: 'progress',
        boardColumnId: 'Active',
        revision: 7,
        provider: 'azure-devops',
      }),
    ]);
    // Columns are the provider's work-item states; only the saved mapping carries a workflow state.
    expect(await tracker.listBoardColumns()).toEqual([
      { id: 'New', label: 'New', sourceId: 'source-a' },
      { id: 'Active', label: 'Active', sourceId: 'source-a', stageId: 'progress' },
      { id: 'Closed', label: 'Closed', sourceId: 'source-a' },
    ]);
    await expect(tracker.transition('personal:source-a:42', 'completed')).rejects.toThrow(
      /no column mapped to the workflow state "completed"/u,
    );
    expect(
      requests.every((request) =>
        request.url.startsWith('https://dev.azure.com/customer-a/Platform/_apis/'),
      ),
    ).toBe(true);
    expect(
      requests.every(
        (request) =>
          request.authorization === `Basic ${Buffer.from(':customer-a-pat').toString('base64')}`,
      ),
    ).toBe(true);
  });

  it('uses the team board field for exact columns, moves and editor metadata', async () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/tmp');
    const settings = {
      ...defaults,
      connections: [
        ...defaults.connections,
        {
          id: 'ado',
          workspaceId: 'personal',
          kind: 'azure-devops' as const,
          displayName: 'Platform Engine',
          organization: 'serviceware-se',
        },
      ],
      workItemSources: [
        {
          id: 'source',
          workspaceId: 'personal',
          connectionId: 'ado',
          provider: 'azure-devops' as const,
          displayName: 'Bridge Team backlog items',
          project: 'Platform Engine',
          team: 'Bridge Team',
          boardId: 'Backlog items',
          wiql: "SELECT [System.Id] FROM WorkItems WHERE [System.State] <> 'Closed'",
          columnMappings: [
            { columnId: 'new', stageId: 'backlog' as const },
            { columnId: 'preparation', stageId: 'ready' as const },
            { columnId: 'acceptance', stageId: 'acceptance' as const },
          ],
          enabled: true,
        },
      ],
      repositoryBindings: [
        ...defaults.repositoryBindings,
        {
          id: 'platform-engine',
          workspaceId: 'personal',
          sourceControlConnectionId: 'github',
          displayName: 'serviceware-se/platform-engine',
          provider: 'github' as const,
          host: 'github.com',
          owner: 'serviceware-se',
          name: 'platform-engine',
          defaultBranch: 'main',
          localPath: '/tmp/platform-engine',
          enabled: true,
        },
        {
          id: 'iam-frontend',
          workspaceId: 'personal',
          sourceControlConnectionId: 'github',
          displayName: 'serviceware-se/iam-frontend',
          provider: 'github' as const,
          host: 'github.com',
          owner: 'serviceware-se',
          name: 'iam-frontend',
          defaultBranch: 'main',
          localPath: '/tmp/iam-frontend',
          enabled: true,
        },
      ],
    };
    const requests: string[] = [];
    const bodies: unknown[] = [];
    const columnField = 'WEF_0123456789_Kanban.Column';
    const doneField = 'WEF_0123456789_Kanban.Column.Done';
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      requests.push(url);
      if (init?.body) bodies.push(JSON.parse(String(init.body)));
      if (url.includes('work/boards/Backlog%20items?')) {
        return Response.json({
          id: 'Microsoft.RequirementCategory',
          name: 'Backlog items',
          fields: {
            columnField: { referenceName: columnField },
            doneField: { referenceName: doneField },
          },
        });
      }
      if (url.includes('work/backlogs?')) {
        return Response.json({
          value: [
            {
              id: 'Microsoft.RequirementCategory',
              name: 'Backlog items',
              workItemTypes: [{ name: 'Product Backlog Item' }, { name: 'Bug' }],
            },
          ],
        });
      }
      if (url.includes('work/backlogs/Microsoft.RequirementCategory/workItems')) {
        return Response.json({
          workItems: [{ target: { id: 63_196 } }, { target: { id: 63_213 } }],
        });
      }
      if (url.includes('wit/workitemsbatch')) {
        return Response.json({
          value: [
            {
              id: 63_196,
              rev: 2,
              fields: {
                'System.Title': 'Integrate Configuration Deploy into Customer Registry',
                'System.State': 'New',
                [columnField]: 'New',
                'System.WorkItemType': 'Product Backlog Item',
                'System.Tags': 'cloud-connect; platform',
              },
            },
            {
              id: 63_213,
              rev: 4,
              fields: {
                'System.Title': 'Spike: Cloud Connect prototype',
                'System.State': 'Active',
                // Azure may persist the canonical column value without the team-specific suffix
                // returned by the Boards API.
                [columnField]: 'Acceptance',
                'System.WorkItemType': 'Product Backlog Item',
                'System.AssignedTo': {
                  id: 'tobias-id',
                  uniqueName: 'tobias@example.com',
                  displayName: 'Tobias Breitkopf',
                  imageUrl: 'https://dev.azure.com/private-avatar',
                },
              },
            },
          ],
        });
      }
      if (url.includes('work/boards/Backlog%20items/columns')) {
        return Response.json({
          value: [
            {
              id: 'new',
              name: 'New',
              columnType: 'incoming',
              stateMappings: { 'Product Backlog Item': 'New', Bug: 'New' },
            },
            {
              id: 'preparation',
              name: 'Preparation (Devs)',
              columnType: 'inProgress',
              stateMappings: { 'Product Backlog Item': 'Active', Bug: 'Active' },
            },
            {
              id: 'acceptance',
              name: 'Acceptance (PO)',
              columnType: 'inProgress',
              stateMappings: { 'Product Backlog Item': 'Active', Bug: 'Active' },
            },
          ],
        });
      }
      if (url.includes('wit/workitems/63213?')) {
        return Response.json({
          id: 63_213,
          rev: 5,
          fields: {
            'System.Title': 'Spike: Cloud Connect prototype',
            'System.State': 'Active',
            [columnField]: 'Preparation (Devs)',
            'System.WorkItemType': 'Product Backlog Item',
          },
        });
      }
      return new Response('Unexpected Azure DevOps request', { status: 500 });
    });
    const tracker = new AzureDevOpsWorkTracker({
      settings: () => settings,
      credential: () => ({ scheme: 'Basic', token: 'serviceware-pat' }),
      fetch: fetch as typeof globalThis.fetch,
    });

    // act
    const items = await tracker.listWorkItems();
    const metadata = await tracker.listEditorMetadata(undefined, 'personal', 'source');
    const moved = await tracker.moveToColumn(items[1]!.id, 'preparation');

    // assert
    expect(items).toEqual([
      expect.objectContaining({ externalId: 'AB#63196', boardColumnId: 'new' }),
      expect.objectContaining({
        externalId: 'AB#63213',
        boardColumnId: 'acceptance',
        repository: 'serviceware-se/platform-engine',
        repositoryBindingIds: ['platform-engine'],
        assignees: [
          {
            login: 'tobias@example.com',
            displayName: 'Tobias Breitkopf',
          },
        ],
      }),
    ]);
    expect(moved).toEqual(expect.objectContaining({ boardColumnId: 'preparation' }));
    expect(metadata).toEqual(
      expect.objectContaining({
        repositories: ['serviceware-se/platform-engine', 'serviceware-se/iam-frontend'],
        workItemTypes: ['Product Backlog Item', 'Bug'],
        defaultWorkItemType: 'Product Backlog Item',
        labels: [
          { name: 'cloud-connect', color: '808080' },
          { name: 'platform', color: '808080' },
        ],
        assignees: [
          {
            login: 'tobias@example.com',
            displayName: 'Tobias Breitkopf',
          },
        ],
      }),
    );
    expect(bodies[0]).toEqual(
      expect.objectContaining({ fields: expect.arrayContaining([columnField, doneField]) }),
    );
    expect(bodies.at(-1)).toContainEqual({
      op: 'add',
      path: `/fields/${columnField}`,
      value: 'Preparation (Devs)',
    });
    expect(requests.some((url) => url.includes('/wit/wiql'))).toBe(false);
    expect(requests).toContain(
      'https://dev.azure.com/serviceware-se/Platform%20Engine/Bridge%20Team/_apis/work/backlogs/Microsoft.RequirementCategory/workItems?api-version=7.1',
    );
  });

  it('uses optimistic revision checks when updating a work item', async () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/tmp');
    const settings = {
      ...defaults,
      connections: [
        ...defaults.connections,
        {
          id: 'ado',
          workspaceId: 'personal',
          kind: 'azure-devops' as const,
          displayName: 'ADO',
          organization: 'example',
        },
      ],
      workItemSources: [
        {
          id: 'source',
          workspaceId: 'personal',
          connectionId: 'ado',
          provider: 'azure-devops' as const,
          displayName: 'ADO',
          project: 'Platform',
          wiql: 'SELECT [System.Id] FROM WorkItems',
          enabled: true,
        },
      ],
    };
    const bodies: string[] = [];
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (init?.body) bodies.push(String(init.body));
      if (url.includes('workitemsbatch'))
        return Response.json({
          value: [
            {
              id: 9,
              rev: 3,
              fields: {
                'System.Title': 'Before',
                'System.State': 'New',
                'System.WorkItemType': 'Task',
              },
            },
          ],
        });
      if (url.includes('workitemtypes/Task/states'))
        return Response.json({ value: [{ name: 'New', category: 'Proposed' }] });
      if (url.includes('workitems/9'))
        return Response.json({
          id: 9,
          rev: 4,
          fields: { 'System.Title': 'After', 'System.State': 'New', 'System.WorkItemType': 'Task' },
        });
      return Response.json({ workItems: [{ id: 9 }] });
    });
    const tracker = new AzureDevOpsWorkTracker({
      settings: () => settings,
      credential: () => ({ scheme: 'Bearer', token: 'entra-token' }),
      fetch: fetch as typeof globalThis.fetch,
    });
    const [item] = await tracker.listWorkItems();
    // act
    await tracker.updateWorkItem(item!.id, {
      workspaceId: 'personal',
      sourceId: 'source',
      revision: 3,
      title: 'After',
      body: '',
      repository: '',
      projectFields: [],
      labels: [],
      assignees: [],
    });
    // assert
    expect(JSON.parse(bodies.at(-1)!)).toContainEqual({ op: 'test', path: '/rev', value: 3 });
  });

  it('creates the selected Azure type and keeps the provider discussion usable', async () => {
    // arrange
    const defaults = createDefaultApplicationSettings('/tmp');
    const settings = {
      ...defaults,
      connections: [
        ...defaults.connections,
        {
          id: 'ado',
          workspaceId: 'personal',
          kind: 'azure-devops' as const,
          displayName: 'ADO',
          organization: 'example',
        },
      ],
      workItemSources: [
        {
          id: 'source',
          workspaceId: 'personal',
          connectionId: 'ado',
          provider: 'azure-devops' as const,
          displayName: 'ADO',
          project: 'Platform',
          wiql: 'SELECT [System.Id] FROM WorkItems',
          enabled: true,
        },
      ],
    };
    const requests: Array<{ url: string; method: string; body?: unknown }> = [];
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      requests.push({
        url,
        method: init?.method ?? 'GET',
        ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}),
      });
      if (url.includes('workitemsbatch')) {
        return Response.json({
          value: [
            {
              id: 9,
              rev: 3,
              fields: {
                'System.Title': 'Summary',
                'System.State': 'New',
                'System.WorkItemType': 'Task',
              },
            },
          ],
        });
      }
      if (url.includes('workitemtypes/Task/states')) {
        return Response.json({ value: [{ name: 'New', category: 'Proposed' }] });
      }
      if (url.includes('workitems/9/comments') && init?.method === 'POST') {
        return Response.json({
          id: 12,
          text: 'Acknowledged',
          format: 'markdown',
          createdDate: '2026-08-31T12:00:00Z',
          createdBy: { uniqueName: 'andre@example.com', displayName: 'Andre Wehlert' },
        });
      }
      if (url.includes('workitems/9/comments')) {
        return Response.json({
          comments: [
            {
              id: 11,
              text: 'Please cover the <strong>fallback</strong>. <a href="https://example.com/old">Old item</a>',
              // Migrated Azure comments can contain HTML while claiming to be Markdown.
              format: 'markdown',
              createdDate: '2026-08-31T11:00:00Z',
              createdBy: { uniqueName: 'marc@example.com', displayName: 'Marc' },
            },
          ],
        });
      }
      if (url.includes('workitems/9?$expand=all')) {
        return Response.json({
          id: 9,
          rev: 3,
          fields: {
            'System.Title': 'Complete title',
            'System.Description': '<p>Complete body</p>',
            'System.State': 'New',
            'System.WorkItemType': 'Task',
          },
        });
      }
      if (url.includes('workitems/$Product%20Backlog%20Item')) {
        return Response.json({
          id: 10,
          rev: 1,
          fields: {
            'System.Title': 'Created',
            'System.Description': 'Body',
            'System.State': 'New',
            'System.WorkItemType': 'Product Backlog Item',
          },
        });
      }
      return Response.json({ workItems: [{ id: 9 }] });
    });
    const tracker = new AzureDevOpsWorkTracker({
      settings: () => settings,
      credential: () => ({ scheme: 'Basic', token: 'pat' }),
      fetch: fetch as typeof globalThis.fetch,
    });
    const [item] = await tracker.listWorkItems();

    // act
    const detail = await tracker.loadWorkItemDetails(item!);
    const comment = await tracker.createWorkItemComment(item!.id, 'Acknowledged');
    const created = await tracker.createWorkItem({
      workspaceId: 'personal',
      sourceId: 'source',
      workItemType: 'Product Backlog Item',
      title: 'Created',
      body: 'Body',
      repository: 'example/platform',
      projectFields: [],
      labels: [],
      assignees: [],
    });

    // assert
    expect(detail).toEqual(
      expect.objectContaining({
        title: 'Complete title',
        body: 'Complete body',
        bodyFormat: 'markdown',
        detailState: 'complete',
        comments: [
          expect.objectContaining({
            id: '11',
            body: 'Please cover the **fallback**. [Old item](https://example.com/old)',
            author: { login: 'marc@example.com', displayName: 'Marc' },
          }),
        ],
      }),
    );
    expect(comment).toEqual(
      expect.objectContaining({
        id: '12',
        body: 'Acknowledged',
        author: { login: 'andre@example.com', displayName: 'Andre Wehlert' },
      }),
    );
    expect(created).toEqual(
      expect.objectContaining({ workItemType: 'Product Backlog Item', title: 'Created' }),
    );
    expect(
      requests.some(
        (request) =>
          request.method === 'POST' && request.url.includes('workitems/$Product%20Backlog%20Item'),
      ),
    ).toBe(true);
    expect(
      requests.find((request) => request.url.includes('workitems/$Product%20Backlog%20Item'))?.body,
    ).toContainEqual({
      op: 'add',
      path: '/fields/System.Description',
      value: '<p>Body</p>\n',
    });
    expect(
      requests
        .filter((request) => request.url.includes('workitems/9/comments'))
        .every((request) => request.url.includes('api-version=7.1-preview.4')),
    ).toBe(true);
  });
});

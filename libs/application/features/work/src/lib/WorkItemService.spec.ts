// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { WorkItemService } from './WorkItemService';
import type { IIssueDraftingPort } from './IIssueDraftingPort';
import type { IWorkItemSkillCatalog } from './IWorkItemSkillCatalog';
import type { IWorkItemTrackingPort } from './IWorkItemTrackingPort';
import type {
  ProjectFieldDefinition,
  ProjectFieldValue,
  IWorkItem,
  IWorkItemMutation,
} from '@symphony/domain-work';
import type { ISkillPackageDocument } from '@symphony/domain-skills';

// #endregion

const creatorSkill: ISkillPackageDocument = {
  id: 'repository:create-change-request',
  name: 'create-change-request',
  displayName: 'Create Change Request',
  description: 'Draft complete repository issues.',
  source: 'repository',
  location: '/workspace/.agents/skills/create-change-request',
  editable: false,
  implicitInvocation: true,
  updatedAt: '2026-08-08T00:00:00.000Z',
  digest: 'creator',
  resourceCount: 0,
  warnings: [],
  instructions: 'Draft an implementation-ready change request.',
  openaiYaml: '',
  files: [],
};

const projectFields: readonly ProjectFieldDefinition[] = [
  {
    id: 'field-status',
    name: 'Status',
    type: 'single-select',
    role: 'workflow-state',
    options: [{ id: 'status-backlog', label: 'Backlog', stageId: 'backlog' }],
  },
  { id: 'field-keywords', name: 'Keywords', type: 'text', role: 'custom' },
  {
    id: 'field-areas',
    name: 'Areas',
    type: 'multi-select',
    role: 'custom',
    options: [{ id: 'area-board', label: 'Board' }],
  },
];

const projectFieldValues: readonly ProjectFieldValue[] = [
  { fieldId: 'field-status', type: 'single-select', value: 'status-backlog' },
  { fieldId: 'field-keywords', type: 'text', value: 'issue creation, project workflow' },
  { fieldId: 'field-areas', type: 'multi-select', value: ['area-board'] },
];

const mutation: IWorkItemMutation = {
  title: 'Create issues from the board',
  body: '## Acceptance criteria',
  repository: 'example/platform',
  projectFields: projectFieldValues,
  labels: ['enhancement'],
  assignees: ['octocat'],
};

const draftRequest = {
  operationId: 'draft-operation-1',
  repository: mutation.repository,
  prompt: 'Create and edit issues from the board.',
} as const;

function createFixture(activeCreator = true, workingDirectory = '/workspace', discussion = true) {
  const item = {
    id: 'PVTI_19',
    externalId: '#19',
    title: mutation.title,
    body: mutation.body,
    repository: mutation.repository,
    stageId: 'backlog' as const,
    projectFields: mutation.projectFields,
    labels: mutation.labels,
    assignees: [{ login: 'octocat' }],
    provider: 'Azure DevOps',
    updatedAt: '2026-08-08T00:00:00.000Z',
  } as const;
  const tracker: IWorkItemTrackingPort = {
    listEditorMetadata: vi.fn(async () => ({
      repositories: ['example/platform'],
      labels: [{ name: 'enhancement', color: 'a2eeef' }],
      assignees: [{ login: 'octocat', displayName: 'The Octocat' }],
      states: [{ id: 'backlog' as const, label: 'Backlog' }],
      projectFields,
    })),
    createWorkItem: vi.fn(async () => item),
    updateWorkItem: vi.fn(async () => item),
    moveToColumn: vi.fn(async (_workItemId: string, boardColumnId: string) => ({
      ...item,
      boardColumnId,
    })),
    ...(discussion
      ? {
          createWorkItemComment: vi.fn(async (_workItemId: string, body: string) => ({
            id: 'comment-19-2',
            author: { login: 'octocat' },
            body,
            bodyFormat: 'markdown' as const,
            createdAt: '2026-08-09T10:00:00.000Z',
          })),
        }
      : {}),
  };
  const catalog: IWorkItemSkillCatalog = {
    skills: () =>
      activeCreator
        ? [
            {
              id: creatorSkill.id,
              name: creatorSkill.name,
              version: '1.0.0',
              description: creatorSkill.description,
              capabilities: ['work-item-creation'],
              source: 'workspace',
            },
          ]
        : [],
    analysisSkill: () => undefined,
    solutionSkill: () => undefined,
    issueCreatorSkill: () => (activeCreator ? creatorSkill : undefined),
  };
  const draftIssue: ReturnType<typeof vi.fn<IIssueDraftingPort['draftIssue']>> = vi.fn(
    async () => ({
      title: 'Drafted issue',
      body: '## Drafted body',
      projectFields: projectFieldValues,
      labels: ['enhancement'],
      assignees: ['octocat'],
    }),
  );
  const workItemChanged = vi.fn();
  const detail: IWorkItem = {
    ...item,
    detailState: 'complete',
    comments: [
      {
        id: 'comment-19-1',
        author: { login: 'workspace-owner' },
        body: 'The board needs this.',
        bodyFormat: 'markdown',
        createdAt: '2026-08-08T10:00:00.000Z',
      },
    ],
  };
  const service = new WorkItemService({
    tracker,
    catalog,
    issueDrafter: { draftIssue },
    workingDirectory: () => workingDirectory || undefined,
    workItemDetails: vi.fn(async () => detail),
    workItemChanged,
  });
  return { service, tracker, draftIssue, workItemChanged };
}

describe('WorkItemService', () => {
  it('adds workspace-owned skills to provider-neutral editor metadata', async () => {
    // arrange
    const { service, tracker } = createFixture();

    // act
    const metadata = await service.metadata('example/platform');

    // assert
    expect(tracker.listEditorMetadata).toHaveBeenCalledWith(
      'example/platform',
      undefined,
      undefined,
    );
    expect(metadata.issueCreatorSkill).toMatchObject({
      id: creatorSkill.id,
      name: 'create-change-request',
      capabilities: ['work-item-creation'],
    });
    expect(metadata.assignees[0]?.displayName).toBe('The Octocat');
  });

  it('delegates create, edit and skill-based drafting without provider data leakage', async () => {
    // arrange
    const { service, tracker, draftIssue, workItemChanged } = createFixture();

    await service.create(mutation);
    await service.update('PVTI_19', mutation);
    // act
    const draft = await service.draft(draftRequest);

    // assert
    expect(tracker.createWorkItem).toHaveBeenCalledWith(mutation);
    expect(tracker.updateWorkItem).toHaveBeenCalledWith('PVTI_19', mutation);
    expect(workItemChanged).toHaveBeenCalledTimes(2);
    expect(workItemChanged).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 'PVTI_19' }));
    expect(draft).toEqual({
      title: 'Drafted issue',
      body: '## Drafted body',
      projectFields: projectFieldValues,
      labels: ['enhancement'],
      assignees: ['octocat'],
    });
    expect(draftIssue).toHaveBeenCalledWith(
      draftRequest,
      {
        repositories: ['example/platform'],
        labels: [{ name: 'enhancement', color: 'a2eeef' }],
        assignees: [{ login: 'octocat', displayName: 'The Octocat' }],
        states: [{ id: 'backlog', label: 'Backlog' }],
        projectFields,
      },
      creatorSkill,
      '/workspace',
      expect.any(AbortSignal),
    );
  });

  it('moves an item to the board column the operator picked and republishes it', async () => {
    // arrange
    const { service, tracker, workItemChanged } = createFixture();

    // act
    const moved = await service.move('PVTI_19', 'opt-ready');

    // assert
    expect(tracker.moveToColumn).toHaveBeenCalledWith('PVTI_19', 'opt-ready');
    expect(moved.boardColumnId).toBe('opt-ready');
    expect(workItemChanged).toHaveBeenCalledWith(expect.objectContaining({ id: 'PVTI_19' }));
  });

  it('rejects classifications outside the tracker metadata allowlist', async () => {
    // arrange
    const { service, draftIssue } = createFixture();
    // act
    draftIssue.mockResolvedValueOnce({
      title: 'Drafted issue',
      body: '## Drafted body',
      projectFields: projectFieldValues,
      labels: ['invented-label'],
      assignees: ['octocat'],
    });

    // assert
    await expect(service.draft({ ...draftRequest, prompt: 'Draft an issue.' })).rejects.toThrow(
      'unavailable label: invented-label',
    );
  });

  it('rejects a Project option that is not part of the live board schema', async () => {
    // arrange
    const { service, draftIssue } = createFixture();
    // act
    draftIssue.mockResolvedValueOnce({
      title: 'Drafted issue',
      body: '## Drafted body',
      projectFields: projectFieldValues.map((value) =>
        value.fieldId === 'field-status'
          ? { fieldId: value.fieldId, type: 'single-select' as const, value: 'status-invented' }
          : value,
      ),
      labels: ['enhancement'],
      assignees: ['octocat'],
    });

    // assert
    await expect(service.draft({ ...draftRequest, prompt: 'Draft an issue.' })).rejects.toThrow(
      'unavailable option for Status',
    );
  });

  it('requires an active Issue Creator skill and source before drafting', async () => {
    // assert
    await expect(
      createFixture(false).service.draft({ ...draftRequest, prompt: 'Draft an issue.' }),
    ).rejects.toThrow('Activate the create-change-request skill');
    await expect(
      createFixture(true, '').service.draft({ ...draftRequest, prompt: 'Draft an issue.' }),
    ).rejects.toThrow('Choose an active repository source');
  });

  it('cancels an active Issue Creator operation through its provider-neutral id', async () => {
    // arrange
    const { service, draftIssue } = createFixture();
    draftIssue.mockImplementationOnce(
      async (_request, _metadata, _skill, _workingDirectory, signal) =>
        new Promise<never>((_, reject) => {
          signal.addEventListener('abort', () => reject(new Error('Draft cancelled.')), {
            once: true,
          });
        }),
    );

    // act
    const draft = service.draft(draftRequest);
    // assert
    await vi.waitFor(() => expect(draftIssue).toHaveBeenCalledOnce());

    expect(service.cancelDraft(draftRequest.operationId)).toBe(true);
    await expect(draft).rejects.toThrow('Draft cancelled.');
    expect(service.cancelDraft(draftRequest.operationId)).toBe(false);
  });

  it('reports and cancels active Issue Creator operations before application shutdown', async () => {
    // arrange
    const { service, draftIssue } = createFixture();
    draftIssue.mockImplementationOnce(
      async (_request, _metadata, _skill, _workingDirectory, signal) =>
        new Promise<never>((_, reject) => {
          signal.addEventListener('abort', () => reject(new Error('Draft cancelled.')), {
            once: true,
          });
        }),
    );

    // act
    const draft = service.draft(draftRequest);
    // assert
    await vi.waitFor(() => expect(draftIssue).toHaveBeenCalledOnce());

    expect(service.activeDraftOperations()).toEqual([
      {
        operationId: draftRequest.operationId,
        repository: draftRequest.repository,
      },
    ]);
    await expect(service.cancelActiveDrafts()).resolves.toEqual([draftRequest.operationId]);
    await expect(draft).rejects.toThrow('Draft cancelled.');
    expect(service.activeDraftOperations()).toEqual([]);
  });

  it('reactivates an active Issue Creator operation after a lifecycle interruption', async () => {
    // arrange
    const { service, draftIssue } = createFixture();
    draftIssue
      .mockImplementationOnce(
        async (_request, _metadata, _skill, _workingDirectory, signal) =>
          new Promise<never>((_, reject) => {
            signal.addEventListener('abort', () => reject(new Error('Draft interrupted.')), {
              once: true,
            });
          }),
      )
      .mockResolvedValueOnce({
        title: 'Reactivated draft',
        body: '## Reactivated body',
        projectFields: projectFieldValues,
        labels: ['enhancement'],
        assignees: ['octocat'],
      });

    // act
    const draft = service.draft(draftRequest);
    // assert
    await vi.waitFor(() => expect(draftIssue).toHaveBeenCalledOnce());

    expect(service.reactivateActiveDrafts()).toBe(1);
    await expect(draft).resolves.toMatchObject({ title: 'Reactivated draft' });
    expect(draftIssue).toHaveBeenCalledTimes(2);
    expect(service.activeDraftOperations()).toEqual([]);
  });

  it('appends a written comment to the thread the drawer already shows', async () => {
    // arrange
    const { service, tracker, workItemChanged } = createFixture();

    // act
    const commented = await service.comment('PVTI_19', 'Reconcile managed workspaces first.');

    // assert
    expect(tracker.createWorkItemComment).toHaveBeenCalledWith(
      'PVTI_19',
      'Reconcile managed workspaces first.',
    );
    expect(commented.comments?.map((comment) => comment.body)).toEqual([
      'The board needs this.',
      'Reconcile managed workspaces first.',
    ]);
    expect(workItemChanged).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'PVTI_19', detailState: 'complete' }),
    );
  });

  it('refuses a comment the provider cannot carry instead of dropping it', async () => {
    // arrange
    const { service } = createFixture(true, '/workspace', false);

    // act
    const refused = service.comment('PVTI_19', 'Reconcile managed workspaces first.');

    // assert
    await expect(refused).rejects.toThrow('does not carry comments');
  });
});

// @vitest-environment jsdom

// #region Imports

import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import type { IWorkItem } from '@symphony/domain-work';
import { NotificationService } from '@symphony/frontend-notification';
import { OPERATION_ID_PROVIDER, WORK_SELECTION } from '@symphony/frontend-core/work';
import type { IOrchestrationSnapshot } from '@symphony/ipc-contracts-composition';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WORK_CLIENT } from '../ports/WorkClientToken';
import { WORK_CONTEXT } from '../ports/WorkContextToken';
import { WORK_EXECUTION } from '../ports/WorkExecutionToken';
import { WORK_WORKFLOW } from '../ports/WorkWorkflowToken';
import { WORK_PROJECTION } from '../ports/WorkProjectionToken';
import { WORK_REFRESH } from '../ports/WorkRefreshToken';
import { WorkSelectionStore } from './WorkSelectionStore';
import { WorkStore } from './WorkStore';

// #endregion

function snapshotWith(boardColumnId: string): IOrchestrationSnapshot {
  return {
    workItems: [
      {
        id: 'PVTI_1',
        workspaceId: 'personal',
        sourceId: 'project',
        externalId: '#18',
        title: 'Period picker',
        body: '',
        detailState: 'summary',
        bodyFormat: 'markdown',
        stageId: 'ready',
        boardColumnId,
        provider: 'github-projects',
        repository: 'example/platform',
        repositoryBindingIds: ['repository'],
        projectFields: [],
        labels: [],
        assignees: [],
      },
    ],
    projectFields: [],
    boardColumns: [
      { id: 'ready', label: 'Ready', stageId: 'ready' },
      { id: 'done', label: 'Done', stageId: 'done' },
    ],
    pullRequests: [],
    ciWorkflows: [],
    ciRuns: [],
    executions: [],
    executionQueue: [],
    remoteData: { workItems: { state: 'live' } },
  } as unknown as IOrchestrationSnapshot;
}

function storeWith(
  move: () => Promise<unknown>,
  update?: () => Promise<unknown>,
  metadata?: (payload?: unknown) => Promise<unknown>,
  requestOverride?: (method: string, payload?: unknown) => Promise<unknown>,
) {
  const state = { snapshot: signal<IOrchestrationSnapshot | undefined>(snapshotWith('ready')) };
  const refresh = vi.fn().mockResolvedValue(undefined);
  const replayRefresh = vi.fn();
  const notifications = { showSuccess: vi.fn(), showError: vi.fn(), showInfo: vi.fn() };
  const selection = new WorkSelectionStore();
  const projection = {
    replaceItem: (item: IWorkItem) =>
      state.snapshot.update((snapshot) =>
        snapshot
          ? {
              ...snapshot,
              workItems: snapshot.workItems.map((candidate) =>
                candidate.id === item.id ? item : candidate,
              ),
            }
          : snapshot,
      ),
    upsertItem: (item: IWorkItem) =>
      state.snapshot.update((snapshot) =>
        snapshot
          ? {
              ...snapshot,
              workItems: snapshot.workItems.some((candidate) => candidate.id === item.id)
                ? snapshot.workItems.map((candidate) =>
                    candidate.id === item.id ? item : candidate,
                  )
                : [...snapshot.workItems, item],
            }
          : snapshot,
      ),
  };
  const request =
    requestOverride ??
    ((method: string, payload?: unknown) => {
      if (method === 'work-items.move') return move();
      if (method === 'work-items.update' && update) return update();
      if (method === 'work-items.metadata' && metadata) return metadata(payload);
      return Promise.reject(new Error(`Unexpected request: ${method}`));
    });
  let operationId = 0;
  const execution = { alignDeliveryGroup: vi.fn().mockResolvedValue(true) };
  TestBed.configureTestingModule({
    providers: [
      WorkStore,
      { provide: WORK_SELECTION, useValue: selection },
      { provide: OPERATION_ID_PROVIDER, useValue: () => `draft-${++operationId}` },
      { provide: NotificationService, useValue: notifications },
      { provide: WORK_CLIENT, useValue: { request } },
      { provide: WORK_PROJECTION, useValue: projection },
      {
        provide: WORK_CONTEXT,
        useValue: {
          items: computed(() => state.snapshot()?.workItems ?? []),
          boardColumns: computed(() => state.snapshot()?.boardColumns ?? []),
        },
      },
      {
        provide: WORK_REFRESH,
        useValue: { refresh, repeatAfterActiveRefresh: () => replayRefresh },
      },
      { provide: WORK_EXECUTION, useValue: execution },
      {
        provide: WORK_WORKFLOW,
        useValue: {
          workflowBusy: signal(false),
          loadWorkflowProcess: vi.fn(),
          decideWorkflow: vi.fn(),
          answerWorkflowQuestion: vi.fn(),
        },
      },
    ],
  });
  return {
    refresh,
    replayRefresh,
    state,
    store: TestBed.inject(WorkStore),
    notifications,
    selection,
    execution,
  };
}

describe('WorkStore', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  beforeEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('shows the card in its new column before the provider confirms the write', async () => {
    // arrange
    let settle = (): void => undefined;
    const pending = new Promise<void>((resolve) => {
      settle = resolve;
    });
    const { state, store } = storeWith(async () => {
      await pending;
      return { ...snapshotWith('done').workItems[0] };
    });

    // act
    const move = store.moveWorkItem('PVTI_1', 'done', 'Done');

    // assert
    expect(state.snapshot()?.workItems[0]).toMatchObject({
      boardColumnId: 'done',
      stageId: 'done',
    });
    settle();
    await expect(move).resolves.toBe(true);
    expect(state.snapshot()?.workItems[0]).toMatchObject({ boardColumnId: 'done' });
  });

  it('reports the failed action first and the provider evidence below it', async () => {
    // arrange
    const { store, notifications } = storeWith(() =>
      Promise.reject(new Error('gh: Not Found (HTTP 404)')),
    );

    // act
    const moved = await store.moveWorkItem('PVTI_1', 'done', 'Done');

    // assert
    expect(moved).toBe(false);
    expect(notifications.showError).toHaveBeenCalledWith(
      'Unable to move the work item.',
      'GitHub answered: Not Found (HTTP 404)',
    );
  });

  it('keeps an automatic assignable-user preload failure silent', async () => {
    // arrange
    const { store, notifications } = storeWith(
      async () => undefined,
      undefined,
      () => Promise.reject(new Error('gh: API rate limit exceeded (HTTP 403)')),
    );

    // act
    const users = await store.loadAssignableUsers('ruederennes/flamox', 'flamox', 'project', false);

    // assert
    expect(users).toBeUndefined();
    expect(notifications.showError).not.toHaveBeenCalled();
  });

  it('omits an empty repository from the metadata IPC scope', async () => {
    // arrange
    const metadata = vi.fn(async () => ({
      repositories: [],
      labels: [],
      assignees: [],
      states: [],
      projectFields: [],
    }));
    const { store } = storeWith(async () => undefined, undefined, metadata);

    // act
    await store.loadWorkItemMetadata('', 'serviceware', 'bridge-team');

    // assert
    expect(metadata).toHaveBeenCalledWith({
      workspaceId: 'serviceware',
      sourceId: 'bridge-team',
    });
  });

  it('puts the card back when the provider rejects the write', async () => {
    // arrange
    const { state, store } = storeWith(() =>
      Promise.reject(new Error('GitHub rejected the write.')),
    );

    // act
    const moved = await store.moveWorkItem('PVTI_1', 'done', 'Done');

    // assert
    expect(moved).toBe(false);
    expect(state.snapshot()?.workItems[0]).toMatchObject({
      boardColumnId: 'ready',
      stageId: 'ready',
    });
  });

  it('moves a delivery group through its root before aligning every member', async () => {
    // arrange
    const { store } = storeWith(() => Promise.reject(new Error('unused')));
    const move = vi.spyOn(store, 'moveWorkItem').mockResolvedValue(true);
    const align = vi.spyOn(store, 'alignDeliveryGroup').mockResolvedValue(true);

    // act
    const moved = await store.moveDeliveryGroup('group-1', 'PVTI_1', 'done', 'Done');

    // assert
    expect(moved).toBe(true);
    expect(move).toHaveBeenCalledWith('PVTI_1', 'done', 'Done');
    expect(align).toHaveBeenCalledWith('group-1');
    expect(move.mock.invocationCallOrder[0]).toBeLessThan(align.mock.invocationCallOrder[0]!);
  });

  it('does not align a delivery group when its root move fails', async () => {
    // arrange
    const { store } = storeWith(() => Promise.reject(new Error('unused')));
    vi.spyOn(store, 'moveWorkItem').mockResolvedValue(false);
    const align = vi.spyOn(store, 'alignDeliveryGroup').mockResolvedValue(true);

    // act
    const moved = await store.moveDeliveryGroup('group-1', 'PVTI_1', 'done', 'Done');

    // assert
    expect(moved).toBe(false);
    expect(align).not.toHaveBeenCalled();
  });

  it('keeps an updated card in its place instead of appending it', async () => {
    // arrange
    const base = snapshotWith('ready');
    const first = base.workItems[0]!;
    const updated = { ...first, assignees: [{ login: 'workspace-owner' }] };
    const { state, store } = storeWith(
      () => Promise.reject(new Error('unused')),
      async () => updated,
    );
    state.snapshot.set({
      ...base,
      workItems: [first, { ...first, id: 'PVTI_2', externalId: '#19', title: 'Second card' }],
    });

    // act
    await store.updateWorkItem('PVTI_1', {
      title: first.title,
      body: first.body,
      repository: first.repository,
      projectFields: [],
      labels: [],
      assignees: ['workspace-owner'],
    });

    // assert
    expect(state.snapshot()?.workItems.map((item) => item.id)).toEqual(['PVTI_1', 'PVTI_2']);
    expect(state.snapshot()?.workItems[0]).toMatchObject({
      assignees: [{ login: 'workspace-owner' }],
    });
  });

  it('replays a refresh overtaken by a failed mutation and releases the feature busy state', async () => {
    // arrange
    const { store, replayRefresh } = storeWith(
      async () => undefined,
      async () => {
        throw new Error('rejected');
      },
    );

    // act
    const result = await store.updateWorkItem('PVTI_1', {
      title: 'Title',
      body: '',
      repository: 'example/platform',
      labels: [],
      assignees: [],
      projectFields: [],
    });

    // assert
    expect(result).toBeUndefined();
    expect(store.workItemsBusy()).toBe(false);
    expect(replayRefresh).toHaveBeenCalledOnce();
    expect(store.workItemMutationError()).toBe('rejected');
  });

  it('keeps the editor metadata and busy state untouched while another scope loads assignees', async () => {
    // arrange
    const editor = {
      repositories: [],
      labels: [],
      assignees: [{ login: 'editor' }],
      states: [],
      projectFields: [],
    };
    const preload = { ...editor, assignees: [{ login: 'menu' }] };
    let requests = 0;
    const { store } = storeWith(
      async () => undefined,
      undefined,
      async () => (++requests === 1 ? editor : preload),
    );
    await store.loadWorkItemMetadata('editor/repo');
    const metadata = store.workItemMetadata();

    // act
    const assignees = await store.loadAssignableUsers('menu/repo');

    // assert
    expect(assignees).toEqual(preload.assignees);
    expect(store.workItemMetadata()).toBe(metadata);
    expect(store.workItemsBusy()).toBe(false);
  });

  it('cancels the active draft by operation id and suppresses its expected request failure', async () => {
    // arrange
    let rejectDraft: (cause: Error) => void = () => undefined;
    const pending = new Promise<never>((_resolve, reject) => {
      rejectDraft = reject;
    });
    const request = vi.fn((method: string) =>
      method === 'work-items.draft' ? pending : Promise.resolve({ cancelled: true }),
    );
    const { store, notifications } = storeWith(
      async () => undefined,
      undefined,
      undefined,
      request,
    );
    const draft = store.draftIssue({ prompt: 'Create a task', repository: 'example/platform' });

    // act
    const cancelled = await store.cancelIssueDraft();
    rejectDraft(new Error('cancelled'));
    const result = await draft;

    // assert
    expect(cancelled).toBe(true);
    expect(request).toHaveBeenLastCalledWith('work-items.draft.cancel', { operationId: 'draft-1' });
    expect(result).toBeUndefined();
    expect(store.issueDraftBusy()).toBe(false);
    expect(notifications.showError).not.toHaveBeenCalled();
  });
});

// #region Imports

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoteProviderAuthenticationRequiredError } from '@symphony/application-core';
import type { IWorkItem } from '@symphony/domain-work';
import type { IWorkItemDetailProjection } from './IWorkItemDetailProjection';
import type { IWorkTrackingProjectionPort } from './IWorkTrackingProjectionPort';
import type { IWorkTrackingProjectionRepository } from './IWorkTrackingProjectionRepository';
import { WorkTrackingProjectionService } from './WorkTrackingProjectionService';

// #endregion

const item: IWorkItem = {
  id: 'item-1',
  workspaceId: 'workspace-1',
  sourceId: 'source-1',
  externalId: '#13',
  title: 'CR-0013 Mark the custom date range in the period picker',
  body: '',
  detailState: 'summary',
  stageId: 'ready',
  boardColumnId: 'column-ready',
  provider: 'github-projects',
  repository: 'example/platform',
  repositoryBindingIds: ['binding-1'],
  projectFields: [{ fieldId: 'field-status', type: 'single-select', value: 'column-ready' }],
  labels: [],
  assignees: [],
  updatedAt: '2026-08-18T09:00:00.000Z',
};

/** The same item after a person moved it to another column by hand: only the board state moved. */
const movedItem: IWorkItem = {
  ...item,
  stageId: 'acceptance',
  boardColumnId: 'column-acceptance',
  projectFields: [{ fieldId: 'field-status', type: 'single-select', value: 'column-acceptance' }],
};

const storedComments = [
  {
    id: 'comment-1',
    author: { login: 'rekepb' },
    body: 'Mark the range in the same accent as the presets.',
    createdAt: '2026-08-18T08:30:00.000Z',
  },
];

const storedDetail: IWorkItemDetailProjection = {
  version: 1,
  workspaceIds: ['workspace-1'],
  workItem: {
    ...item,
    body: 'The period picker never marks the custom range.',
    comments: storedComments,
    detailState: 'complete',
  },
  refreshedAt: '2026-08-18T09:05:00.000Z',
};

function createTracker(workItems: readonly IWorkItem[]): IWorkTrackingProjectionPort {
  return {
    listWorkItems: vi.fn(async () => workItems),
    listBoardColumns: vi.fn(async () => [
      { id: 'column-ready', label: 'Ready', sourceId: 'source-1', stageId: 'ready' },
      {
        id: 'column-acceptance',
        label: 'Acceptance',
        sourceId: 'source-1',
        stageId: 'acceptance',
      },
    ]),
    listProjectFields: vi.fn(async () => []),
    loadWorkItemDetails: vi.fn(async (workItem: IWorkItem) => ({
      ...workItem,
      body: 'freshly hydrated body',
      comments: [
        {
          id: 'comment-2',
          author: { login: 'rekepb' },
          body: 'freshly hydrated comment',
          createdAt: '2026-08-19T07:00:00.000Z',
        },
      ],
      detailState: 'complete' as const,
    })),
  };
}

describe('WorkTrackingProjectionService work-item details', () => {
  let details: Map<string, IWorkItemDetailProjection>;
  let repository: IWorkTrackingProjectionRepository;

  beforeEach(() => {
    details = new Map([[storedDetail.workItem.id, storedDetail]]);
    repository = {
      loadWorkTracking: vi.fn(() => undefined),
      saveWorkTracking: vi.fn(),
      loadWorkItemDetail: vi.fn((_scope: string, workItemId: string) => details.get(workItemId)),
      saveWorkItemDetail: vi.fn((_scope: string, projection: IWorkItemDetailProjection) => {
        details.set(projection.workItem.id, projection);
      }),
    };
  });

  function createService(tracker: IWorkTrackingProjectionPort): WorkTrackingProjectionService {
    return new WorkTrackingProjectionService({
      tracker,
      repository,
      clock: { now: () => '2026-08-19T10:00:00.000Z' },
      scope: () => ({
        workspaceIds: ['workspace-1'],
        workTracking: 'workspace-1',
      }),
    });
  }

  it('reports the column the item is in now while reusing the stored body', async () => {
    // A GitHub Project column is stored beside the issue, so moving the item leaves the issue
    // timestamp untouched: the stored detail still validates while naming the previous column.
    // arrange
    const tracker = createTracker([movedItem]);
    const service = createService(tracker);

    // act
    const detail = await service.loadWorkItemDetails('item-1');

    // assert
    expect(detail).toMatchObject({
      stageId: 'acceptance',
      boardColumnId: 'column-acceptance',
      projectFields: [
        { fieldId: 'field-status', type: 'single-select', value: 'column-acceptance' },
      ],
      body: 'The period picker never marks the custom range.',
      comments: storedComments,
      detailState: 'complete',
    });
    expect(tracker.loadWorkItemDetails).not.toHaveBeenCalled();
  });

  it('hydrates once more when the stored detail predates discussions', async () => {
    // A detail stored before Symphony read comment threads has nothing to reuse for them; its
    // body alone would present the item as complete while the discussion stayed invisible.
    // arrange
    const legacy = { ...storedDetail.workItem };
    delete legacy.comments;
    details.set('item-1', { ...storedDetail, workItem: legacy });
    const tracker = createTracker([item]);
    const service = createService(tracker);

    // act
    const detail = await service.loadWorkItemDetails('item-1');

    // assert
    expect(tracker.loadWorkItemDetails).toHaveBeenCalledOnce();
    expect(detail.comments).toEqual([expect.objectContaining({ id: 'comment-2' })]);
    expect(details.get('item-1')?.workItem.comments).toEqual(detail.comments);
  });

  it('stops the stored detail from handing out the previous column again', async () => {
    // arrange
    const service = createService(createTracker([movedItem]));

    // act
    await service.loadWorkItemDetails('item-1');

    // assert
    expect(details.get('item-1')?.workItem).toMatchObject({ stageId: 'acceptance' });
  });

  it('hydrates from the tracker once the stored body no longer matches the item', async () => {
    // arrange
    const tracker = createTracker([{ ...movedItem, updatedAt: '2026-08-19T08:00:00.000Z' }]);
    const service = createService(tracker);

    // act
    const detail = await service.loadWorkItemDetails('item-1');

    // assert
    expect(tracker.loadWorkItemDetails).toHaveBeenCalledOnce();
    expect(detail).toMatchObject({
      body: 'freshly hydrated body',
      comments: [expect.objectContaining({ body: 'freshly hydrated comment' })],
      stageId: 'acceptance',
    });
  });

  it('keeps the discussion out of the board summary it records', async () => {
    // arrange
    const service = createService(createTracker([item]));
    await service.loadOperationalWorkItems();

    // act
    service.recordWorkItem({ ...storedDetail.workItem, title: 'Renamed' });

    // assert
    expect(details.get('item-1')?.workItem).toMatchObject({
      title: 'Renamed',
      comments: storedComments,
    });
    const summary = (await service.loadOperationalWorkItems()).find(
      (candidate) => candidate.id === 'item-1',
    );
    expect(summary).toMatchObject({ title: 'Renamed', body: '', detailState: 'summary' });
    expect(summary).not.toHaveProperty('comments');
  });

  it('projects a safe recovery reason when the work tracker needs authentication', async () => {
    // arrange
    const tracker = createTracker([]);
    tracker.listWorkItems = vi.fn(async () => {
      throw new RemoteProviderAuthenticationRequiredError('Provider-specific sign-in detail.');
    });
    const service = createService(tracker);

    // act
    const snapshot = await service.loadProjection();

    // assert
    const status = snapshot.status;
    expect(status).toEqual({
      state: 'unavailable',
      reason: 'authentication-required',
    });
    expect(JSON.stringify(status)).not.toContain('Provider-specific');
  });

  it('moves the stored detail along when a mutation reports the item in a new column', () => {
    // arrange
    const service = createService(createTracker([item]));

    // act
    service.recordWorkItem(movedItem);

    // assert
    expect(details.get('item-1')?.workItem).toMatchObject({
      stageId: 'acceptance',
      boardColumnId: 'column-acceptance',
      body: 'The period picker never marks the custom range.',
      detailState: 'complete',
    });
  });

  it('keeps the last complete board when a provider omits the matching columns', async () => {
    // A rate-limited or scope-mixed provider response must not replace a usable board with a
    // projection that sends every item to the synthetic "No column" bucket.
    // arrange
    const cached = {
      version: 1 as const,
      workspaceIds: ['workspace-1'],
      workItems: [item],
      projectFields: [],
      boardColumns: [
        { id: 'column-ready', label: 'Ready', sourceId: 'source-1', stageId: 'ready' as const },
      ],
      refreshedAt: '2026-08-19T09:00:00.000Z',
    };
    vi.mocked(repository.loadWorkTracking).mockReturnValue(cached);
    const tracker = createTracker([item]);
    tracker.listBoardColumns = vi.fn(async () => []);
    const service = createService(tracker);

    // act
    const snapshot = await service.loadProjection(true);

    // assert
    expect(snapshot.projection.workItems).toEqual([item]);
    expect(snapshot.projection.boardColumns).toEqual(cached.boardColumns);
    expect(snapshot.status).toMatchObject({ state: 'stale' });
    expect(repository.saveWorkTracking).not.toHaveBeenCalled();
  });

  it('restarts a board refresh for the newly selected scope', async () => {
    // arrange
    let activeScope = 'workspace-1';
    let releaseFirstRead!: () => void;
    const firstRead = new Promise<void>((resolve) => {
      releaseFirstRead = resolve;
    });
    let reads = 0;
    const azureItem: IWorkItem = {
      ...item,
      id: 'item-2',
      workspaceId: 'workspace-2',
      sourceId: 'source-2',
      externalId: 'AB#2',
      provider: 'azure-devops',
      boardColumnId: 'acceptance',
    };
    const tracker = createTracker([]);
    tracker.listWorkItems = vi.fn(async () => {
      reads += 1;
      if (reads === 1) await firstRead;
      return activeScope === 'workspace-1' ? [item] : [azureItem];
    });
    tracker.listBoardColumns = vi.fn(async () =>
      activeScope === 'workspace-1'
        ? [{ id: 'column-ready', label: 'Ready', sourceId: 'source-1' }]
        : [{ id: 'acceptance', label: 'Acceptance', sourceId: 'source-2' }],
    );
    const service = new WorkTrackingProjectionService({
      tracker,
      repository,
      clock: { now: () => '2026-08-19T10:00:00.000Z' },
      scope: () => ({
        workspaceIds: [activeScope],
        workTracking: activeScope,
      }),
    });
    const first = service.loadProjection(true);
    activeScope = 'workspace-2';

    // act
    const second = service.loadProjection(true);
    releaseFirstRead();
    await first;
    const snapshot = await second;

    // assert
    expect(snapshot.projection.workItems).toEqual([expect.objectContaining({ id: 'item-2' })]);
    expect(snapshot.projection.boardColumns).toEqual([
      expect.objectContaining({ id: 'acceptance', sourceId: 'source-2' }),
    ]);
    expect(repository.saveWorkTracking).toHaveBeenCalledTimes(1);
    expect(repository.saveWorkTracking).toHaveBeenCalledWith(
      'workspace-2',
      expect.objectContaining({ workspaceIds: ['workspace-2'] }),
    );
  });

  it('shows a saved target board immediately while its provider refreshes', async () => {
    // A workspace switch must not leave the board empty for the duration of an Azure DevOps read.
    // arrange
    const savedAzureItem: IWorkItem = {
      ...item,
      id: 'item-2',
      workspaceId: 'workspace-2',
      sourceId: 'source-2',
      externalId: 'AB#2',
      provider: 'azure-devops',
      boardColumnId: 'acceptance',
    };
    vi.mocked(repository.loadWorkTracking).mockImplementation((scope) =>
      scope === 'workspace-2'
        ? {
            version: 1,
            workspaceIds: ['workspace-2'],
            workItems: [savedAzureItem],
            projectFields: [],
            boardColumns: [{ id: 'acceptance', label: 'Acceptance', sourceId: 'source-2' }],
            refreshedAt: '2026-08-19T09:00:00.000Z',
          }
        : undefined,
    );
    const tracker = createTracker([]);
    const service = new WorkTrackingProjectionService({
      tracker,
      repository,
      clock: { now: () => '2026-08-19T10:00:00.000Z' },
      scope: () => ({
        workspaceIds: ['workspace-2'],
        workTracking: 'workspace-2',
      }),
      maxAgeMilliseconds: () => 1_000,
    });

    // act
    const snapshot = await service.loadProjection(false);

    // assert
    expect(snapshot.projection.workItems).toEqual([savedAzureItem]);
    expect(snapshot.projection.boardColumns).toEqual([
      expect.objectContaining({ id: 'acceptance', sourceId: 'source-2' }),
    ]);
    expect(snapshot.status).toMatchObject({ state: 'stale' });
    expect(tracker.listWorkItems).not.toHaveBeenCalled();
  });

  it('stops a superseded board read before asking the new provider for columns', async () => {
    // arrange
    let activeScope = 'workspace-1';
    let releaseItems!: () => void;
    const itemsReady = new Promise<void>((resolve) => {
      releaseItems = resolve;
    });
    const tracker = createTracker([]);
    tracker.listWorkItems = vi.fn(async () => {
      await itemsReady;
      return [item];
    });
    const service = new WorkTrackingProjectionService({
      tracker,
      repository,
      clock: { now: () => '2026-08-19T10:00:00.000Z' },
      scope: () => ({
        workspaceIds: [activeScope],
        workTracking: activeScope,
      }),
    });
    const refresh = service.loadProjection(true);
    activeScope = 'workspace-2';

    // act
    releaseItems();
    await refresh;

    // assert
    expect(tracker.listBoardColumns).not.toHaveBeenCalled();
    expect(repository.saveWorkTracking).not.toHaveBeenCalled();
  });
});

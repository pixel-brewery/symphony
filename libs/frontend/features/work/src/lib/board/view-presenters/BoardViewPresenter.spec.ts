// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { DialogService, DrawerService } from '@pixel-brewery/mosaik-elements-angular';
import { ClipboardService, ExternalLinkService } from '@symphony/frontend-core';
import { NotificationService } from '@symphony/frontend-notification';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IBoardColumn, IWorkItem } from '@symphony/domain-work';
import { defaultWorkflow } from '@symphony/domain-workflow';
import { BehaviorSubject, Subject } from 'rxjs';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { IWorkBoardContext } from '../../ports/IWorkBoardContext';
import { WORK_BOARD_CONTEXT } from '../../ports/WorkBoardContextToken';
import { WORK_BOARD_ROUTE } from '../../ports/WorkBoardRouteToken';
import { WORK_BOARD_SELECTION } from '../../ports/WorkBoardSelectionToken';
import { WORK_CI_OPERATIONS } from '../../ports/WorkCiOperationsToken';
import { WORK_EXECUTION_READ } from '../../ports/WorkExecutionReadToken';
import { WorkFilterStore } from '../../state/WorkFilterStore';
import { WorkStore } from '../../state/WorkStore';
import { LocalExecutionApprovalService } from '../services/LocalExecutionApprovalService';
import { NewWorkItemSheet } from '../services/NewWorkItemSheet';
import { BoardColumnCollapseStore } from '../state/BoardColumnCollapseStore';
import { BoardViewPresenter } from './BoardViewPresenter';

// #endregion

interface IArrangeOptions {
  readonly items?: readonly IWorkItem[];
  readonly executions?: readonly IExecutionRecord[];
  readonly queryParameters?: Record<string, string>;
  readonly accountLogin?: string;
  readonly canCreate?: boolean;
  readonly boardColumns?: readonly IBoardColumn[];
  readonly availableBoards?: number;
}

function arrange(workflowAvailable: boolean, options: IArrangeOptions = {}) {
  const item: IWorkItem = {
    id: 'work-1',
    externalId: '#1',
    title: 'Existing item',
    body: '',
    stageId: 'qualified',
    provider: 'simulated',
    repository: 'owner/repository',
    labels: [],
    assignees: [],
  };
  const items = options.items ?? [item];
  const snapshot = signal<ReturnType<IWorkBoardContext['snapshot']>>({
    workItems: items,
    boardColumns: options.boardColumns ?? [
      { id: 'backlog', label: 'Backlog', stageId: 'backlog' },
      { id: 'qualified', label: 'Qualified', stageId: 'qualified' },
      { id: 'ready', label: 'Ready', stageId: 'ready' },
      { id: 'done', label: 'Done', stageId: 'done' },
    ],
    executions: options.executions ?? [],
    events: [],
    workflow: defaultWorkflow,
  });
  const settings = {
    workspaces: [],
    activeViewScope: { workspaceIds: ['workspace-1'], boardLayout: 'mixed' },
    connections: options.accountLogin
      ? [
          {
            id: 'github-1',
            workspaceId: 'workspace-1',
            kind: 'github',
            displayName: 'GitHub',
            hostname: 'github.com',
            accountLogin: options.accountLogin,
            gitProtocol: 'https',
          },
        ]
      : [],
    agentProfiles: [],
  } as unknown as NonNullable<ReturnType<IWorkBoardContext['settings']>>;
  const context: IWorkBoardContext = {
    snapshot,
    settings: signal(settings),
    availableBoards: signal(
      Array.from({ length: options.availableBoards ?? 0 }, (_, index) => ({
        id: `board-${index}`,
      })) as unknown as ReturnType<IWorkBoardContext['availableBoards']>,
    ),
    activeBoard: signal(undefined),
    scopedWorkItems: signal(options.items ?? []),
    canCreateWorkItem: signal(options.canCreate ?? false),
  };
  const parameters = new BehaviorSubject(
    convertToParamMap(options.queryParameters ?? { item: item.id, process: 'true' }),
  );
  const navigate = vi.fn<Router['navigate']>(async () => true);
  const isExpanded = vi.fn((_columnId: string, expandedByDefault = true) => expandedByDefault);
  const selectWorkItem = vi.fn<WorkStore['selectWorkItem']>(() => {});
  const moveWorkItem = vi.fn<WorkStore['moveWorkItem']>(async () => true);
  const work: Pick<
    WorkStore,
    'workflowAvailable' | 'selectWorkItem' | 'loadAssignableUsers' | 'moveWorkItem'
  > = {
    workflowAvailable,
    selectWorkItem,
    loadAssignableUsers: vi.fn(async () => []),
    moveWorkItem,
  };
  const notifications = { showInfo: vi.fn(), showWarning: vi.fn() };
  const requestAttention = vi.fn();
  const openSheet = vi.fn();
  const drawer = { closed: new Subject<void>(), requestAttention };
  const show = vi.fn<(component: unknown, options: unknown) => typeof drawer>(() => drawer);
  TestBed.configureTestingModule({
    providers: [
      BoardViewPresenter,
      WorkFilterStore,
      { provide: WORK_BOARD_CONTEXT, useValue: context },
      { provide: WorkStore, useValue: work },
      { provide: WORK_CI_OPERATIONS, useValue: null },
      { provide: WORK_EXECUTION_READ, useValue: null },
      { provide: WORK_BOARD_ROUTE, useValue: {} },
      { provide: WORK_BOARD_SELECTION, useValue: null },
      { provide: DialogService, useValue: {} },
      { provide: DrawerService, useValue: { show, isShown: () => true } },
      { provide: LocalExecutionApprovalService, useValue: {} },
      { provide: ClipboardService, useValue: {} },
      { provide: ExternalLinkService, useValue: {} },
      { provide: NotificationService, useValue: notifications },
      { provide: BoardColumnCollapseStore, useValue: { isExpanded } },
      { provide: NewWorkItemSheet, useValue: { open: openSheet } },
      {
        provide: ActivatedRoute,
        useValue: { queryParamMap: parameters, snapshot: { queryParamMap: parameters.value } },
      },
      { provide: Router, useValue: { navigate } },
    ],
  });
  return {
    presenter: TestBed.inject(BoardViewPresenter),
    parameters,
    show,
    selectWorkItem,
    requestAttention,
    navigate,
    openSheet,
    item,
    moveWorkItem,
    notifications,
  };
}

function workItem(id: string, overrides: Partial<IWorkItem> = {}): IWorkItem {
  return {
    id,
    externalId: '#' + id,
    title: 'Item ' + id,
    body: '',
    stageId: 'ready',
    boardColumnId: 'ready',
    provider: 'simulated',
    repository: 'owner/repository',
    labels: [],
    assignees: [],
    ...overrides,
  };
}

function click(modifiers: Partial<Pick<MouseEvent, 'metaKey' | 'ctrlKey' | 'shiftKey'>> = {}) {
  return {
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    ...modifiers,
    composedPath: () => [],
  } as unknown as MouseEvent;
}

describe('BoardViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('ignores both a process bookmark and a direct process command when Workflow is omitted', async () => {
    // arrange
    const { presenter, selectWorkItem, show, item } = arrange(false);

    // act
    TestBed.tick();
    presenter.openProcessCommand.execute(item.id);
    await Promise.resolve();

    // assert
    expect(presenter.workflowAvailable).toBe(false);
    expect(presenter.openProcessCommand.canExecute()).toBe(false);
    expect(selectWorkItem).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });

  it('opens the existing process bookmark once and draws attention on another activation when Workflow is included', async () => {
    // arrange
    const { presenter, selectWorkItem, show, requestAttention, item } = arrange(true);
    TestBed.tick();
    await vi.waitFor(() => expect(show).toHaveBeenCalledOnce());

    // act
    presenter.openProcessCommand.execute(item.id);

    // assert
    expect(presenter.workflowAvailable).toBe(true);
    expect(presenter.openProcessCommand.canExecute()).toBe(true);
    expect(selectWorkItem).toHaveBeenCalledExactlyOnceWith(item.id);
    expect(show).toHaveBeenCalledExactlyOnceWith(expect.any(Function), {
      data: { workItemId: item.id },
    });
    expect(requestAttention).toHaveBeenCalledOnce();
  });

  it('keeps a column drill-down in the address in step with the column filter', () => {
    // arrange
    const drillDown = arrange(true, { queryParameters: { column: 'qualified' } });
    TestBed.resetTestingModule();
    const plain = arrange(true, { queryParameters: {} });

    // act
    drillDown.presenter.filterByColumnCommand.execute(undefined);
    plain.presenter.filterByColumnCommand.execute('ready');

    // assert
    expect(drillDown.navigate).toHaveBeenCalledExactlyOnceWith([], {
      queryParams: { column: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    expect(plain.navigate).not.toHaveBeenCalled();
    expect(plain.presenter.selectedColumnId()).toBe('ready');
  });

  it('opens the new-work-item sheet in the column whose plus was used', () => {
    // arrange
    const { presenter, openSheet } = arrange(true, { canCreate: true, queryParameters: {} });

    // act
    presenter.createTaskCommand.execute({ id: 'ready', label: 'Ready', stageId: 'ready' });
    presenter.createTaskCommand.execute();

    // assert
    expect(openSheet).toHaveBeenNthCalledWith(1, { columnId: 'ready', stageId: 'ready' });
    expect(openSheet).toHaveBeenNthCalledWith(2, {});
  });

  it('opens the sheet for ?create=true once a board can receive the work item', () => {
    // arrange
    const { openSheet, navigate, notifications } = arrange(true, {
      canCreate: true,
      queryParameters: { create: 'true' },
    });

    // act
    TestBed.tick();

    // assert
    expect(openSheet).toHaveBeenCalledExactlyOnceWith({});
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { create: null }, replaceUrl: true }),
    );
    expect(notifications.showWarning).not.toHaveBeenCalled();
  });

  it('says why ?create=true cannot open the sheet instead of dropping it', () => {
    // arrange
    const { openSheet, notifications } = arrange(true, {
      canCreate: false,
      availableBoards: 2,
      queryParameters: { create: 'true' },
    });

    // act
    TestBed.tick();

    // assert
    expect(openSheet).not.toHaveBeenCalled();
    expect(notifications.showWarning).toHaveBeenCalledExactlyOnceWith(
      'Select one board to create a work item',
      'Several boards are in view. Choose one under Filter › Board, then create the work item.',
    );
  });

  it('opens the work item screen when a card is activated instead of a detail dialog', () => {
    // arrange
    const { presenter, navigate, show, selectWorkItem } = arrange(true, {
      items: [workItem('github:owner/repository#12')],
      queryParameters: {},
    });
    TestBed.tick();

    // act
    presenter.openTaskFromCardCommand.execute([click(), 'github:owner/repository#12']);

    // assert
    expect(selectWorkItem).toHaveBeenCalledExactlyOnceWith('github:owner/repository#12');
    expect(navigate).toHaveBeenCalledExactlyOnceWith(
      ['/main/board', 'github:owner/repository#12'],
      {},
    );
    expect(show).not.toHaveBeenCalled();
  });

  it('replaces a work-item bookmark on the board with the work item screen', async () => {
    // arrange
    const { navigate, item } = arrange(true, { queryParameters: { item: 'work-1' } });

    // act
    TestBed.tick();

    // assert
    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledExactlyOnceWith(['/main/board', item.id], {
        replaceUrl: true,
      }),
    );
  });

  it('adds a modifier-clicked card to the delivery selection without opening it', () => {
    // arrange
    const { presenter, navigate } = arrange(true, {
      items: [workItem('a'), workItem('b')],
      queryParameters: {},
    });
    TestBed.tick();

    // act
    presenter.openTaskFromCardCommand.execute([click({ metaKey: true }), 'a']);
    presenter.openTaskFromCardCommand.execute([click({ shiftKey: true }), 'b']);

    // assert
    expect(presenter.selectedItemKeys()).toEqual(['a', 'b']);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('narrows the board to the segment and counts the segments over the whole board', () => {
    // arrange
    const items = [
      workItem('running'),
      workItem('failed'),
      workItem('mine', { assignees: [{ login: 'Octo' }] }),
    ];
    const executions: IExecutionRecord[] = [
      {
        id: 'execution-running',
        workItemId: 'running',
        workflowId: 'workflow',
        kind: 'solution',
        state: 'running',
        startedAt: '2026-08-13T10:00:00.000Z',
      },
      {
        id: 'execution-failed',
        workItemId: 'failed',
        workflowId: 'workflow',
        kind: 'solution',
        state: 'failed',
        startedAt: '2026-08-13T10:00:00.000Z',
      },
    ];
    const { presenter } = arrange(true, {
      items,
      executions,
      queryParameters: {},
      accountLogin: 'octo',
    });
    TestBed.tick();
    const visible = () => presenter.filteredWorkItems().map((item) => item.id);

    // act
    presenter.selectSegmentCommand.execute('running');
    const running = visible();
    presenter.selectSegmentCommand.execute('attention');
    const attention = visible();
    presenter.selectSegmentCommand.execute('mine');
    const mine = visible();
    presenter.selectSegmentCommand.execute('all');

    // assert
    expect(running).toEqual(['running']);
    expect(attention).toContain('failed');
    expect(mine).toEqual(['mine']);
    expect(visible()).toEqual(['running', 'failed', 'mine']);
    expect(presenter.runningCount()).toBe(1);
    expect(presenter.attentionCount()).toBe(attention.length);
    expect(presenter.segment()).toBe('all');
  });

  it('keeps Needs you while a later address only changes other keys', () => {
    // arrange
    const { presenter, parameters } = arrange(false, {
      items: [workItem('a')],
      queryParameters: { attention: 'true' },
    });
    TestBed.tick();
    const selected = presenter.segment();

    // act
    parameters.next(convertToParamMap({ q: 'login' }));
    TestBed.tick();
    const afterSearch = presenter.segment();
    presenter.selectSegmentCommand.execute('all');
    parameters.next(convertToParamMap({ q: 'login', item: 'missing' }));
    TestBed.tick();

    // assert
    expect(selected).toBe('attention');
    expect(afterSearch).toBe('attention');
    expect(presenter.searchQuery()).toBe('login');
    expect(presenter.segment()).toBe('all');
  });

  it('moves a card dropped under All boards to its own board column of that stage', async () => {
    // arrange
    const { presenter, moveWorkItem, notifications } = arrange(false, {
      items: [
        workItem('a', { sourceId: 'board-a', boardColumnId: 'a-ready' }),
        workItem('b', { sourceId: 'board-b', boardColumnId: 'b-ready' }),
      ],
      queryParameters: {},
      availableBoards: 2,
      boardColumns: [
        { id: 'a-ready', label: 'Ready', stageId: 'ready', sourceId: 'board-a' },
        { id: 'a-done', label: 'Done', stageId: 'done', sourceId: 'board-a' },
        { id: 'b-ready', label: 'Ready', stageId: 'ready', sourceId: 'board-b' },
        { id: 'b-done', label: 'Done', stageId: 'done', sourceId: 'board-b' },
        { id: 'a-archive', label: 'Archive', stageId: 'archive', sourceId: 'board-a' },
      ],
    });

    // act
    await presenter.moveBoardEntry({ itemKey: 'b', toColumnKey: 'a-done' });
    await presenter.moveBoardEntry({ itemKey: 'b', toColumnKey: 'a-archive' });

    // assert
    expect(presenter.allColumns().map((column) => column.id)).toEqual([
      'a-ready',
      'a-done',
      'a-archive',
    ]);
    expect(moveWorkItem).toHaveBeenCalledExactlyOnceWith('b', 'b-done', 'Done');
    expect(notifications.showInfo).toHaveBeenCalledWith(
      'Not moved',
      'The board of #b has no Archive column.',
    );
  });

  it('offers Mine only while the settings name the signed-in GitHub account', () => {
    // arrange
    const { presenter } = arrange(true, { items: [workItem('a')], queryParameters: {} });
    TestBed.tick();

    // act
    presenter.selectSegmentCommand.execute('mine');

    // assert
    expect(presenter.canShowMine()).toBe(false);
    expect(presenter.segment()).toBe('all');
  });

  it('narrows the board to the repository of the repository chip', () => {
    // arrange
    const { presenter } = arrange(true, {
      items: [workItem('a'), workItem('b', { repository: 'owner/other' })],
      queryParameters: {},
    });
    TestBed.tick();

    // act
    presenter.filterByRepositoryCommand.execute('owner/other');

    // assert
    expect(presenter.availableRepositories()).toEqual(['owner/other', 'owner/repository']);
    expect(presenter.filteredWorkItems().map((item) => item.id)).toEqual(['b']);
    expect(presenter.hasActiveFilters()).toBe(true);
  });

  it('collapses Backlog, Qualified and Done until the operator expands them', () => {
    // arrange
    const { presenter } = arrange(true, { items: [workItem('a')], queryParameters: {} });
    TestBed.tick();

    // act
    const expanded = presenter
      .allColumns()
      .map((column) => [column.id, presenter.isColumnExpanded()(column.id)]);

    // assert
    expect(expanded).toEqual([
      ['backlog', false],
      ['qualified', false],
      ['ready', true],
      ['done', false],
    ]);
  });

  it('opens a column collapsed by default while a search finds items in it', () => {
    // arrange
    const { presenter } = arrange(true, {
      items: [workItem('a', { stageId: 'backlog', boardColumnId: 'backlog', title: 'Needle' })],
      queryParameters: { q: 'needle' },
    });

    // act
    TestBed.tick();

    // assert
    expect(presenter.isColumnExpanded()('backlog')).toBe(true);
    expect(presenter.isColumnExpanded()('qualified')).toBe(false);
  });
});

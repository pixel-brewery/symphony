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
import type { IWorkItem } from '@symphony/domain-work';
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
import { BoardColumnCollapseStore } from '../state/BoardColumnCollapseStore';
import { BoardViewPresenter } from './BoardViewPresenter';

// #endregion

function arrange(workflowAvailable: boolean) {
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
  const snapshot = signal<ReturnType<IWorkBoardContext['snapshot']>>({
    workItems: [item],
    boardColumns: [],
    executions: [],
    events: [],
    workflow: defaultWorkflow,
  });
  const context: IWorkBoardContext = {
    snapshot,
    settings: signal(undefined),
    availableBoards: signal([]),
    activeBoard: signal(undefined),
    scopedWorkItems: signal([]),
    canCreateWorkItem: signal(false),
  };
  const parameters = new BehaviorSubject(convertToParamMap({ item: item.id, process: 'true' }));
  const selectWorkItem = vi.fn<WorkStore['selectWorkItem']>(() => {});
  const work: Pick<WorkStore, 'workflowAvailable' | 'selectWorkItem'> = {
    workflowAvailable,
    selectWorkItem,
  };
  const requestAttention = vi.fn();
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
      { provide: NotificationService, useValue: {} },
      { provide: BoardColumnCollapseStore, useValue: { isExpanded: () => true } },
      {
        provide: ActivatedRoute,
        useValue: { queryParamMap: parameters, snapshot: { queryParamMap: parameters.value } },
      },
      { provide: Router, useValue: { navigate: vi.fn(async () => true) } },
    ],
  });
  return {
    presenter: TestBed.inject(BoardViewPresenter),
    parameters,
    show,
    selectWorkItem,
    requestAttention,
    item,
  };
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
});

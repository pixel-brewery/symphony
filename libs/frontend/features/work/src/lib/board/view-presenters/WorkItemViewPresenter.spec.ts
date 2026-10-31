// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import type { ICiRun } from '@symphony/domain-ci';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import { defaultWorkflow } from '@symphony/domain-workflow';
import { ExternalLinkService } from '@symphony/frontend-core';
import { DesktopSpeechRecognitionService } from '@symphony/frontend-interaction';
import { NotificationService } from '@symphony/frontend-notification';
import type { WorkItemEditorMetadataDto } from '@symphony/ipc-contracts-work';
import { BehaviorSubject } from 'rxjs';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WORK_BOARD_CONTEXT } from '../../ports/WorkBoardContextToken';
import { WORK_BOARD_ROUTE } from '../../ports/WorkBoardRouteToken';
import { WORK_CI_OPERATIONS } from '../../ports/WorkCiOperationsToken';
import { WORK_EXECUTION_READ } from '../../ports/WorkExecutionReadToken';
import { WORK_PUBLICATION_READ } from '../../ports/WorkPublicationReadToken';
import { WORK_SKILLS_READ } from '../../ports/WorkSkillsReadToken';
import { WORK_TASK_CONTEXT } from '../../ports/WorkTaskContextToken';
import { WorkStore } from '../../state/WorkStore';
import { LocalExecutionApprovalService } from '../services/LocalExecutionApprovalService';
import { WorkItemViewPresenter } from './WorkItemViewPresenter';

// #endregion

function item(overrides: Partial<IWorkItem> = {}): IWorkItem {
  return {
    id: 'work-1',
    workspaceId: 'personal',
    sourceId: 'source-1',
    externalId: 'CR-0602',
    title: 'Reduce ingest',
    body: 'Limit the ingest.',
    provider: 'github-projects',
    externalUrl: 'https://github.com/o/r/issues/702',
    repository: 'o/r',
    stageId: 'progress',
    boardColumnId: 'progress',
    labels: ['privacy'],
    assignees: [{ login: 'octo' }],
    createdAt: '2026-10-17T09:00:00.000Z',
    ...overrides,
  };
}

const solution: IExecutionRecord = {
  id: 'execution-2',
  workItemId: 'work-1',
  workflowId: 'workflow',
  kind: 'solution',
  state: 'succeeded',
  startedAt: '2026-10-31T16:00:00.000Z',
  finishedAt: '2026-10-31T16:48:00.000Z',
  workspaceReference: 'claude/cr-0602',
  pullRequest: {
    number: 714,
    externalUrl: 'https://github.com/o/r/pull/714',
    branchUrl: 'https://github.com/o/r/tree/claude/cr-0602',
  },
};

const runningCheck: ICiRun = {
  id: 'run-1',
  workspaceId: 'personal',
  ciBindingId: 'ci-1',
  repositoryBindingId: 'repository-1',
  name: 'PR Quality',
  status: 'in-progress',
  branch: 'claude/cr-0602',
  startedAt: '2026-10-31T16:52:00.000Z',
  externalUrl: 'https://github.com/o/r/actions/runs/1',
};

const metadata = {
  repositories: ['o/r'],
  labels: [],
  assignees: [],
  states: [],
  projectFields: [],
} as unknown as WorkItemEditorMetadataDto;

async function settle(): Promise<void> {
  for (let index = 0; index < 10; index += 1) await Promise.resolve();
}

function createFixture(
  workItems: readonly IWorkItem[] = [item()],
  executions: readonly IExecutionRecord[] = [solution],
) {
  const snapshot = signal({
    workItems: [...workItems],
    goals: [],
    executions: [...executions],
    events: [],
    workflow: defaultWorkflow,
    boardColumns: [{ id: 'progress', label: 'In progress', stageId: 'progress' }],
    workItemReadiness: [],
    projectFields: [],
    pullRequests: [
      {
        id: 'pr-714',
        workspaceId: 'personal',
        repositoryBindingId: 'repository-1',
        number: 714,
        title: 'CR-0602',
        state: 'open' as const,
        draft: false,
        sourceBranch: 'claude/cr-0602',
        targetBranch: 'main',
        externalUrl: 'https://github.com/o/r/pull/714',
        createdAt: '2026-10-31T16:48:00.000Z',
        updatedAt: '2026-10-31T16:52:00.000Z',
      },
    ],
    ciRuns: [runningCheck],
  });
  const loadedMetadata = signal<WorkItemEditorMetadataDto | undefined>(undefined);
  const work = {
    executionAvailable: true,
    workflowAvailable: true,
    publicationAvailable: true,
    workItemsBusy: signal(false),
    workItemCommentBusy: signal(false),
    workItemMetadata: loadedMetadata.asReadonly(),
    selectWorkItem: vi.fn(),
    loadWorkItemDetails: vi.fn(async () => true),
    loadWorkItemMetadata: vi.fn(async () => {
      loadedMetadata.set(metadata);
      return true;
    }),
    updateWorkItem: vi.fn(async (_id: string, mutation: { title: string }) =>
      item({ title: mutation.title }),
    ),
    commentOnWorkItem: vi.fn(),
  };
  const ci = {
    localCiRunningRunId: signal<string | undefined>(undefined),
    localCiEnabledFor: () => false,
    refreshContinuousIntegrationRuns: vi.fn(),
    rerunCiRun: vi.fn(async () => true),
    runCiLocally: vi.fn(),
    cancelLocalCiRun: vi.fn(),
    cancelCiRun: vi.fn(async () => true),
  };
  const parameters = new BehaviorSubject(convertToParamMap({ workItemId: 'work-1' }));
  const navigate = vi.fn(async () => true);
  const boardRoute = {
    snapshot,
    initialize: vi.fn(async () => undefined),
    refresh: vi.fn(async () => undefined),
  };
  const context = {
    snapshot,
    settings: signal({
      agentTeams: [],
      agentProfiles: [],
      workItemSources: [],
      deliveryContexts: [],
      repositoryBindings: [],
    }),
    selectedWorkspaceIds: signal(['personal']),
    activeWorkspace: signal({ id: 'personal' }),
    creationBoard: signal(undefined),
  };
  TestBed.configureTestingModule({
    providers: [
      WorkItemViewPresenter,
      { provide: WORK_TASK_CONTEXT, useValue: context },
      { provide: WORK_BOARD_CONTEXT, useValue: context },
      { provide: WORK_BOARD_ROUTE, useValue: boardRoute },
      { provide: WorkStore, useValue: work },
      { provide: WORK_EXECUTION_READ, useValue: { executionQueue: signal([]) } },
      { provide: WORK_PUBLICATION_READ, useValue: { pullRequestBusy: signal(false) } },
      { provide: WORK_SKILLS_READ, useValue: null },
      { provide: WORK_CI_OPERATIONS, useValue: ci },
      { provide: NotificationService, useValue: { showWarning: vi.fn() } },
      { provide: LocalExecutionApprovalService, useValue: { request: vi.fn(async () => '') } },
      { provide: ExternalLinkService, useValue: { open: vi.fn() } },
      { provide: Router, useValue: { navigate } },
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: parameters.asObservable(),
          snapshot: { paramMap: parameters.value },
        },
      },
      {
        provide: DesktopSpeechRecognitionService,
        useValue: { available: false, start: vi.fn(), stop: vi.fn(), cancel: vi.fn() },
      },
    ],
  });
  const presenter = TestBed.inject(WorkItemViewPresenter);
  return { presenter, work, ci, parameters, navigate, snapshot };
}

describe('WorkItemViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  beforeEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('opens the routed work item with its column, delivery stages and checks', async () => {
    // arrange
    const { presenter, work } = createFixture();

    // act
    presenter.initialize();
    await settle();

    // assert
    expect(presenter.isHydrating()).toBe(false);
    expect(work.loadWorkItemDetails).toHaveBeenCalledWith('work-1');
    expect(work.loadWorkItemMetadata).toHaveBeenCalledWith('o/r', 'personal', 'source-1');
    expect(presenter.workItem()?.externalId).toBe('CR-0602');
    expect(presenter.column()?.label).toBe('In progress');
    expect(presenter.notFound()).toBe(false);
    expect(presenter.pullRequest()?.number).toBe(714);
    expect(presenter.checks().map((check) => [check.name, check.status])).toEqual([
      ['PR Quality', 'in-progress'],
    ]);
    expect(presenter.stages().map((stage) => stage.id)).toEqual([
      'analysis',
      'solution',
      'implementation',
      'checks',
      'acceptance',
    ]);
    expect(presenter.stages()[2]).toMatchObject({ pullRequestNumber: 714 });
    expect(presenter.editor.model().title).toBe('Reduce ingest');
  });

  it('keeps the published pull request and its branch after a revision on the same branch', async () => {
    // arrange
    const unpublished: IExecutionRecord = { ...solution };
    delete unpublished.pullRequest;
    const revision: IExecutionRecord = {
      ...unpublished,
      id: 'revision-1',
      kind: 'revision',
      startedAt: '2026-10-31T17:30:00.000Z',
    };
    const { presenter } = createFixture([item()], [solution, revision]);

    // act
    presenter.initialize();
    await settle();

    // assert
    expect(presenter.solutionExecution()?.id).toBe('revision-1');
    expect(presenter.pullRequest()?.number).toBe(714);
    expect(presenter.branchUrl()).toBe('https://github.com/o/r/tree/claude/cr-0602');
    expect(presenter.canPublishPullRequest()).toBe(false);
  });

  it('shows the not-found state for an unknown id and leads back to the board', async () => {
    // arrange
    const { presenter, work, navigate } = createFixture([]);

    // act
    presenter.initialize();
    await settle();
    presenter.backToBoardCommand.execute();

    // assert
    expect(presenter.notFound()).toBe(true);
    expect(work.loadWorkItemDetails).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/main/board']);
  });

  it('edits title and description in a session that saves or discards them', async () => {
    // arrange
    const { presenter, work } = createFixture();
    presenter.initialize();
    await settle();

    // act
    presenter.toggleContentEditingCommand.execute();
    presenter.editor.form.title().value.set('Reduce ingest to the agreed scope');
    presenter.saveCommand.execute();
    await settle();

    // assert
    expect(work.updateWorkItem).toHaveBeenCalledWith(
      'work-1',
      expect.objectContaining({ title: 'Reduce ingest to the agreed scope' }),
    );
    expect(presenter.isEditingSession()).toBe(false);

    presenter.toggleContentEditingCommand.execute();
    presenter.editor.form.title().value.set('Discarded');
    presenter.cancelContentEditingCommand.execute(undefined);
    expect(presenter.editor.model().title).toBe('Reduce ingest');
    expect(presenter.isEditingContent()).toBe(false);
  });

  it('stops the running check on GitHub through the pull-request run action', async () => {
    // arrange
    const { presenter, ci } = createFixture();
    presenter.initialize();
    await settle();
    const stop = presenter.checkActions().find((action) => action.id === 'remote');

    // act
    presenter.executeCheckActionCommand.execute(stop!);
    await settle();

    // assert
    expect(stop).toMatchObject({ cancels: true, runId: 'run-1' });
    expect(ci.cancelCiRun).toHaveBeenCalledWith('run-1');
    expect(presenter.activeCheck()?.externalUrl).toBe('https://github.com/o/r/actions/runs/1');
  });

  it('hydrates the next work item when the route id changes in place', async () => {
    // arrange
    const { presenter, work, parameters } = createFixture([
      item(),
      item({ id: 'work-2', externalId: 'CR-0603', title: 'Second' }),
    ]);
    presenter.initialize();
    await settle();

    // act
    parameters.next(convertToParamMap({ workItemId: 'work-2' }));
    TestBed.tick();
    await settle();

    // assert
    expect(presenter.workItemId()).toBe('work-2');
    expect(work.loadWorkItemDetails).toHaveBeenLastCalledWith('work-2');
    expect(presenter.editor.model().title).toBe('Second');
  });
});

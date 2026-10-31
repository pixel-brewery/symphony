// @vitest-environment jsdom

// #region Imports

import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideRouter, Router } from '@angular/router';
import type { ICiRun, ICiRunHistory } from '@symphony/domain-ci';
import type { IDeliverySnapshot, IPullRequestSummary } from '@symphony/domain-delivery';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import { defaultWorkflow, type IWorkflowStageChangeHistory } from '@symphony/domain-workflow';
import type { IDeliveryLaunchOperations } from '@symphony/frontend-core/delivery-operations';
import type {
  ApplicationSettingsDto,
  IOrchestrationSnapshot,
} from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { IHomeContext } from '../ports/IHomeContext';
import { HOME_CONTEXT } from '../ports/HomeContextToken';
import { HomeViewPresenter } from './HomeViewPresenter';

// #endregion

function item(id: string, stageId: string): IWorkItem {
  return {
    id,
    workspaceId: 'workspace',
    externalId: `CR-${id}`,
    title: `Title ${id}`,
    body: '',
    stageId,
    boardColumnId: stageId,
    provider: 'simulated',
    repository: 'owner/repo',
    labels: [],
    assignees: [],
  };
}

function analysis(workItemId: string, finishedAt: string): IExecutionRecord {
  return {
    id: `analysis-${workItemId}`,
    workItemId,
    workflowId: 'workflow',
    kind: 'analysis',
    mode: 'ai',
    state: 'succeeded',
    startedAt: finishedAt,
    finishedAt,
    summary: 'Ready.',
  };
}

function failedRun(): ICiRun {
  return {
    id: 'run',
    workspaceId: 'workspace',
    ciBindingId: 'ci',
    repositoryBindingId: 'repo',
    name: 'Deploy Dev',
    status: 'failed',
    startedAt: new Date(Date.now() - 60_000).toISOString(),
    finishedAt: new Date(Date.now() - 30_000).toISOString(),
  };
}

function snapshotWith(
  workItems: readonly IWorkItem[],
  executions: readonly IExecutionRecord[],
  ciRuns: readonly ICiRun[] = [],
): IOrchestrationSnapshot {
  return {
    workItems,
    boardColumns: defaultWorkflow.stages.map((stage) => ({
      id: stage.id,
      label: stage.label,
      stageId: stage.id,
    })),
    executions,
    events: [],
    workflow: defaultWorkflow,
    skills: [],
    pullRequests: [],
    ciRuns,
    remoteData: {
      workItems: { state: 'current' },
      pullRequests: { state: 'current' },
      ciRuns: { state: 'current' },
    },
  } as unknown as IOrchestrationSnapshot;
}

const DAY = 86_400_000;

function stageHistory(recordedDaysAgo = 90): IWorkflowStageChangeHistory {
  const at = (days: number): string => new Date(Date.now() - days * DAY).toISOString();
  return {
    changes: [
      { workItemId: '1', toStageId: 'qualified', changedAt: at(4) },
      { workItemId: '1', toStageId: 'done', changedAt: at(1) },
      { workItemId: '2', toStageId: 'done', changedAt: at(20) },
    ],
    recordedSince: at(recordedDaysAgo),
    truncated: false,
  };
}

function setup(
  delivery: Partial<IDeliveryLaunchOperations> | null = null,
  history: {
    readonly listStageChanges?: (since: string) => Promise<IWorkflowStageChangeHistory>;
    readonly listRunHistory?: (since: string) => Promise<ICiRunHistory>;
  } = {},
) {
  const snapshot = signal<IOrchestrationSnapshot | undefined>(undefined);
  const settings = signal<ApplicationSettingsDto | undefined>({
    agentProfiles: [
      { id: 'claude', displayName: 'Claude Code', workspaceId: 'workspace', enabled: true },
    ],
    agentTeams: [],
    deliveryTargets: [],
    connections: [],
  } as unknown as ApplicationSettingsDto);
  const sync = vi.fn(async () => undefined);
  const listStageChanges = vi.fn(history.listStageChanges ?? (async () => stageHistory()));
  const listRunHistory = vi.fn(
    history.listRunHistory ??
      (async (): Promise<ICiRunHistory> => ({ runs: [], truncated: false })),
  );
  const context: IHomeContext = {
    hasSnapshot: computed(() => Boolean(snapshot())),
    externalServiceIncident: signal(undefined),
    snapshot,
    settings,
    activeWorkspace: signal({ displayName: 'FLAMOX365' } as never),
    selectedWorkspaceIds: signal(['workspace']),
    scopedRepositories: signal([]),
    scopedWorkItems: computed(() => snapshot()?.workItems ?? []),
    activeBoardId: signal(undefined),
    syncBusy: signal(false),
    execution: null,
    workflow: null,
    ci: null,
    delivery: delivery as IDeliveryLaunchOperations | null,
    repositoryRuntime: null,
    initialize: async () => undefined,
    sync,
    listStageChanges,
    listRunHistory,
  };
  TestBed.configureTestingModule({
    providers: [provideRouter([]), HomeViewPresenter, { provide: HOME_CONTEXT, useValue: context }],
  });
  return {
    presenter: TestBed.inject(HomeViewPresenter),
    snapshot,
    settings,
    sync,
    listStageChanges,
    listRunHistory,
  };
}

describe('HomeViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterAll(() => TestBed.resetTestEnvironment());
  afterEach(() => TestBed.resetTestingModule());

  it('shows skeletons until the snapshot arrives', () => {
    // arrange
    const { presenter, snapshot } = setup();

    // act
    const before = [presenter.pullRequestsState(), presenter.boardState(), presenter.reporting()];
    snapshot.set(snapshotWith([], []));

    // assert
    expect(before).toEqual(['loading', 'loading', undefined]);
    expect(presenter.pullRequestsState()).toBe('ready');
    expect(presenter.decisionCount()).toBe(0);
  });

  it('summarises the waiting decisions, the failing workflow and the running agent', () => {
    // arrange
    const { presenter, snapshot } = setup();
    const items = ['1', '2', '3', '4', '5'].map((id) => item(id, 'ready'));
    const executions = items.map((entry, index) =>
      analysis(entry.id, new Date(Date.now() - (index + 1) * 60_000).toISOString()),
    );
    const running: IExecutionRecord = {
      ...analysis('6', new Date().toISOString()),
      id: 'running',
      kind: 'solution',
      state: 'running',
      finishedAt: undefined,
      bindingSnapshot: { agentProfileId: 'claude' } as IExecutionRecord['bindingSnapshot'],
    };

    // act
    snapshot.set(
      snapshotWith([...items, item('6', 'progress')], [...executions, running], [failedRun()]),
    );

    // assert
    expect(presenter.decisionCount()).toBe(6);
    expect(presenter.failingWorkflowName()).toBe('Deploy Dev');
    expect(presenter.activeAgentWork()).toEqual({
      agentName: 'Claude Code',
      workItemKey: 'CR-6',
      implementing: true,
    });
    expect(presenter.waitingDecisions().map((entry) => entry.id)).toEqual([
      'solution:2',
      'solution:3',
      'solution:4',
      'solution:5',
    ]);
  });

  it('recomputes every reporting figure when the period changes', () => {
    // arrange
    const { presenter, snapshot } = setup();
    const old = { ...analysis('1', new Date(Date.now() - 20 * 86_400_000).toISOString()) };
    snapshot.set(snapshotWith([item('1', 'done')], [old]));

    // act
    const week = presenter.reporting()?.agentRuns.current;
    presenter.selectPeriodCommand.execute('30-days');

    // assert
    expect(week).toBe(0);
    expect(presenter.period()).toBe('30-days');
    expect(presenter.reporting()?.agentRuns.current).toBe(1);
  });

  it('reads Orbit evidence for the Production card and offers a retry after a failure', async () => {
    // arrange
    const delivery: IDeliverySnapshot = { targets: [], evidence: [], errors: [], refreshedAt: '' };
    const refresh = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(delivery);
    const { presenter, snapshot } = setup({ refresh });
    snapshot.set(snapshotWith([], []));

    // act
    presenter.initialize();
    await vi.waitFor(() => expect(presenter.productionState()).toBe('failed'));
    presenter.retryProductionCommand.execute();
    await vi.waitFor(() => expect(presenter.productionState()).toBe('ready'));

    // assert
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(presenter.production()?.state).toBe('unassigned');
  });

  it('syncs through the existing refresh and opens the new-work-item sheet on the Board', async () => {
    // arrange
    const { presenter, sync } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    // act
    presenter.syncCommand.execute();
    presenter.newWorkItemCommand.execute();
    presenter.openBoardColumnCommand.execute('ready');

    // assert
    expect(sync).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/main/board'], { queryParams: { create: 'true' } });
    expect(navigate).toHaveBeenCalledWith(['/main/board'], { queryParams: { column: 'ready' } });
  });

  it('loads the recorded history when the page opens and again when the period changes', async () => {
    // arrange
    const { presenter, snapshot, listStageChanges, listRunHistory } = setup();
    snapshot.set(snapshotWith([], []));

    // act
    presenter.initialize();
    await vi.waitFor(() => expect(presenter.stageHistoryState()).toBe('ready'));
    const week = presenter.reporting();
    presenter.selectPeriodCommand.execute('30-days');
    TestBed.tick();
    await vi.waitFor(() => expect(listStageChanges).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(presenter.stageHistoryState()).toBe('ready'));

    // assert
    expect(week?.delivered).toEqual({ current: 1, previous: 0 });
    expect(week?.medianLeadTimeDays).toEqual({ current: 3 });
    expect(presenter.reporting()?.delivered).toEqual({ current: 2, previous: 0 });
    const [firstSince] = listStageChanges.mock.calls[0]!;
    const [secondSince] = listStageChanges.mock.calls[1]!;
    expect(Date.parse(secondSince)).toBeLessThanOrEqual(Date.now() - 60 * DAY + 60_000);
    expect(Date.parse(firstSince)).toBeGreaterThan(Date.parse(secondSince));
    expect(listRunHistory.mock.calls.map(([since]) => since)).toEqual([firstSince, secondSince]);
  });

  it('keeps only the newest history read when an older one answers late', async () => {
    // arrange
    let answerFirst: (history: IWorkflowStageChangeHistory) => void = () => undefined;
    const first = new Promise<IWorkflowStageChangeHistory>((resolve) => (answerFirst = resolve));
    const { presenter, snapshot, listStageChanges } = setup(null, {
      listStageChanges: vi
        .fn()
        .mockImplementationOnce(() => first)
        .mockImplementation(async () => stageHistory(5)),
    });
    snapshot.set(snapshotWith([], []));
    presenter.initialize();
    await vi.waitFor(() => expect(listStageChanges).toHaveBeenCalledTimes(1));

    // act
    presenter.selectPeriodCommand.execute('quarter');
    TestBed.tick();
    await vi.waitFor(() => expect(presenter.stageHistoryState()).toBe('ready'));
    answerFirst(stageHistory(400));
    await Promise.resolve();

    // assert
    expect(presenter.reporting()?.deliveryHistorySince).toBe(
      (await listStageChanges.mock.results[1]!.value).recordedSince,
    );
    expect(presenter.reporting()?.delivered).toBeUndefined();
  });

  it('offers a retry when a history read fails and keeps the other source working', async () => {
    // arrange
    const listRunHistory = vi
      .fn<(since: string) => Promise<ICiRunHistory>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ runs: [], recordedSince: '2026-01-01T00:00:00.000Z', truncated: false });
    const { presenter, snapshot } = setup(null, { listRunHistory });
    snapshot.set(snapshotWith([], []));

    // act
    presenter.initialize();
    await vi.waitFor(() => expect(presenter.runHistoryState()).toBe('failed'));
    const failed = [presenter.stageHistoryState(), presenter.workflowRunsState()];
    presenter.retryReportingCommand.execute();
    await vi.waitFor(() => expect(presenter.runHistoryState()).toBe('ready'));

    // assert
    expect(failed).toEqual(['ready', 'failed']);
    expect(presenter.workflowRunsState()).toBe('ready');
    expect(presenter.reporting()?.workflowRuns).toEqual({
      total: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
    });
  });

  it('reads the history again after Sync now', async () => {
    // arrange
    const { presenter, snapshot, listStageChanges } = setup();
    snapshot.set(snapshotWith([], []));
    presenter.initialize();
    await vi.waitFor(() => expect(listStageChanges).toHaveBeenCalledTimes(1));

    // act
    presenter.syncCommand.execute();
    await vi.waitFor(() => expect(listStageChanges).toHaveBeenCalledTimes(2));

    // assert
    expect(presenter.syncing()).toBe(false);
  });

  it('counts the pull requests waiting for the review of the signed-in GitHub account', () => {
    // arrange
    const { presenter, snapshot, settings } = setup();
    const waiting = {
      id: 'repo:1',
      workspaceId: 'workspace',
      repositoryBindingId: 'repo',
      number: 1,
      title: 'Export',
      state: 'open',
      draft: false,
      sourceBranch: 'feature/export',
      targetBranch: 'main',
      requestedReviewers: ['RueDeRennes'],
      externalUrl: 'https://example.test/pr/1',
      createdAt: '2026-10-30T08:00:00.000Z',
      updatedAt: '2026-10-30T08:00:00.000Z',
    } satisfies IPullRequestSummary;
    snapshot.set({
      ...snapshotWith([], []),
      pullRequests: [waiting],
    } as unknown as IOrchestrationSnapshot);

    // act
    const unknown = presenter.pullRequestCounts().waitingForReview;
    settings.update(
      (current) =>
        ({
          ...current,
          connections: [
            { id: 'gh', kind: 'github', workspaceId: 'workspace', accountLogin: 'ruederennes' },
          ],
        }) as unknown as ApplicationSettingsDto,
    );

    // assert
    expect(unknown).toBeUndefined();
    expect(presenter.pullRequestCounts().waitingForReview).toBe(1);
  });
});

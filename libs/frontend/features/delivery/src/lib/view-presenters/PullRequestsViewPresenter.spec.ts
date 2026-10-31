// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ActivatedRoute, convertToParamMap, Router, type ParamMap } from '@angular/router';
import { DialogService } from '@pixel-brewery/mosaik-elements-angular';
import type { ICiRun } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import type { IExecutionRecord } from '@symphony/domain-execution';
import { ExternalLinkService, WorkspaceScopePresenter } from '@symphony/frontend-core';
import { EXECUTION_OPERATIONS } from '@symphony/frontend-core/execution';
import { BehaviorSubject } from 'rxjs';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DELIVERY_CI_OPERATIONS } from '../ports/DeliveryCiOperationsToken';
import { DELIVERY_ROUTE_HYDRATION } from '../ports/DeliveryRouteHydrationToken';
import { DELIVERY_VIEW_CONTEXT } from '../ports/DeliveryViewContextToken';
import type { IDeliveryViewContext } from '../ports/IDeliveryViewContext';
import { PullRequestStore } from '../state/PullRequestStore';
import { PullRequestsViewPresenter } from './PullRequestsViewPresenter';

// #endregion

type Settings = NonNullable<ReturnType<IDeliveryViewContext['settings']>>;
type Snapshot = NonNullable<ReturnType<IDeliveryViewContext['snapshot']>>;

describe('PullRequestsViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('counts the segments and narrows the table to the selected one', () => {
    // arrange
    const { presenter } = arrange();

    // act
    const counts = presenter.segmentCounts();
    presenter.segment.set('needs-action');
    const needsAction = presenter.visibleRows().map((row) => row.pullRequest.number);
    presenter.segment.set('drafts');
    const drafts = presenter.visibleRows().map((row) => row.pullRequest.number);

    // assert
    expect(counts).toEqual({ open: 5, 'needs-action': 3, drafts: 1 });
    expect(needsAction).toEqual([712, 701, 694]);
    expect(drafts).toEqual([698]);
  });

  it('projects checks, merge state, work item and agent for each row', () => {
    // arrange
    const { presenter } = arrange();

    // act
    const row = presenter.rows().find((candidate) => candidate.pullRequest.number === 712);

    // assert
    expect(row?.checksSummary).toEqual({
      state: 'failing',
      failing: 1,
      failingNames: ['PR Quality'],
      total: 1,
    });
    expect(row?.mergeState).toBe('mergeable');
    expect(row?.delivery).toMatchObject({
      workItemId: 'item-589',
      workItemKey: 'CR-0589',
      agentName: 'Codex',
      active: false,
    });
  });

  it('follows the view, state and pull-request query parameters', async () => {
    // arrange
    const { presenter, queryParams } = arrange();

    // act
    queryParams.next(convertToParamMap({ view: 'drafts', pullRequest: 'repository:698' }));
    await settle();

    // assert
    expect(presenter.segment()).toBe('drafts');
    expect(presenter.selectedRow()?.pullRequest.number).toBe(698);

    // act
    queryParams.next(convertToParamMap({ view: 'unknown', state: 'open', base: 'behind' }));
    await settle();

    // assert
    expect(presenter.segment()).toBe('open');
    expect(presenter.visibleRows().map((row) => row.pullRequest.number)).toEqual([701]);
    expect(presenter.hasActiveFilters()).toBe(true);
  });

  it('inspects the first visible pull request until one is selected', () => {
    // arrange
    const { presenter } = arrange();

    // act
    const initial = presenter.selectedRow()?.pullRequest.number;
    presenter.selectPullRequestCommand.execute('repository:694');
    const selected = presenter.selectedRow()?.pullRequest.number;
    presenter.segment.set('drafts');
    const hidden = presenter.selectedRow()?.pullRequest.number;

    // assert
    expect(initial).toBe(712);
    expect(selected).toBe(694);
    expect(hidden).toBe(698);
  });

  it('keeps the selected segment in the view query parameter', async () => {
    // arrange
    const { presenter, router } = arrange();

    // act
    presenter.selectSegmentCommand.execute('needs-action');
    await settle();
    presenter.selectSegmentCommand.execute('open');
    await settle();

    // assert
    expect(router.navigate).toHaveBeenNthCalledWith(
      1,
      [],
      expect.objectContaining({ queryParams: { view: 'needs-action' } }),
    );
    expect(router.navigate).toHaveBeenNthCalledWith(
      2,
      [],
      expect.objectContaining({ queryParams: { view: null } }),
    );
  });

  it('blocks Repair with AI while the automation policy does not allow AI repairs', async () => {
    // arrange
    const { presenter, startSolver } = arrange({ sourceRepairEnabled: false });
    const row = presenter.rows().find((candidate) => candidate.pullRequest.number === 712)!;
    presenter.selectPullRequestCommand.execute(row.pullRequest.id);

    // act
    presenter.repairWithAiCommand.execute(row);
    await settle();

    // assert
    expect(presenter.repairBlock()).toBe('policy');
    expect(startSolver).not.toHaveBeenCalled();
  });

  it('asks the Solver to repair the failed checks where the policy allows AI repairs', async () => {
    // arrange
    const { presenter, startSolver } = arrange();
    const row = presenter.rows().find((candidate) => candidate.pullRequest.number === 712)!;
    presenter.selectPullRequestCommand.execute(row.pullRequest.id);

    // act
    const block = presenter.repairBlock();
    presenter.repairWithAiCommand.execute(row);
    await settle();

    // assert
    expect(block).toBeUndefined();
    expect(startSolver).toHaveBeenCalledExactlyOnceWith(
      false,
      'item-589',
      expect.stringContaining('#712 on codex/cr-0589: PR Quality'),
    );
    expect(presenter.repairingPullRequestId()).toBeUndefined();
  });

  it('does not repair a pull request Symphony did not deliver', async () => {
    // arrange
    const { presenter, startSolver } = arrange();
    const row = presenter.rows().find((candidate) => candidate.pullRequest.number === 694)!;
    presenter.selectPullRequestCommand.execute(row.pullRequest.id);

    // act
    presenter.repairWithAiCommand.execute(row);
    await settle();

    // assert
    expect(presenter.repairBlock()).toBe('not-delivered');
    expect(startSolver).not.toHaveBeenCalled();
  });

  it('runs the failed check locally and opens the delivered work item on the Board', async () => {
    // arrange
    const { presenter, router } = arrange();
    presenter.selectPullRequestCommand.execute('repository:712');

    // act
    const run = presenter.selectedChecksRun();
    presenter.openWorkItemCommand.execute('item-589');
    await settle();

    // assert
    expect(run?.id).toBe('run-712');
    expect(router.navigate).toHaveBeenCalledWith(['/main/board'], {
      queryParams: { item: 'item-589' },
    });
  });

  it('marks a refresh busy until both pull requests and runs are loaded', async () => {
    // arrange
    const { presenter, hydration } = arrange();
    let finish: () => void = () => undefined;
    hydration.refresh.mockImplementationOnce(
      () =>
        new Promise<undefined>((resolve) => {
          finish = () => resolve(undefined);
        }),
    );

    // act
    presenter.refreshCommand.execute();
    await settle();
    const busy = presenter.isRefreshing();
    finish();
    await settle();

    // assert
    expect(busy).toBe(true);
    expect(presenter.isRefreshing()).toBe(false);
    expect(hydration.refreshContinuousIntegrationRuns).toHaveBeenCalledOnce();
  });
});

function arrange(policyOverrides: { sourceRepairEnabled?: boolean } = {}) {
  const queryParams = new BehaviorSubject<ParamMap>(convertToParamMap({}));
  const router = { navigate: vi.fn(async () => true) };
  const startSolver = vi.fn(async () => true);
  const hydration = {
    initialize: vi.fn(async () => undefined),
    refresh: vi.fn(async () => undefined),
    refreshContinuousIntegrationRuns: vi.fn(async () => undefined),
  };
  const snapshot: Snapshot = {
    // The last listed pull request is closed: it never shows under any segment.
    pullRequests: [
      pullRequest(712, 'codex/cr-0589', { baseBranchStatus: 'current' }),
      pullRequest(714, 'claude/cr-0602', { baseBranchStatus: 'current' }),
      pullRequest(701, 'claude/cr-0458', { baseBranchStatus: 'behind' }),
      pullRequest(694, 'codex/cr-0608', { baseBranchStatus: 'conflicting' }),
      pullRequest(698, 'claude/cr-0612', { draft: true }),
      { ...pullRequest(650, 'old', {}), state: 'closed' as const },
    ].map((candidate, index) => ({
      ...candidate,
      updatedAt: new Date(Date.UTC(2026, 9, 30, 12 - index)).toISOString(),
    })),
    ciRuns: [run('run-712', 'codex/cr-0589', 'failed'), run('run-714', 'claude/cr-0602', 'queued')],
    localCiExecutions: [],
    executions: [execution('item-589', 712, 'agent-codex')],
    workItems: [{ id: 'item-589', externalId: 'CR-0589' }] as unknown as Snapshot['workItems'],
  };
  const settings = {
    repositoryBindings: [
      {
        id: 'repository',
        workspaceId: 'workspace',
        provider: 'github',
        owner: 'ruederennes',
        name: 'flamox',
        enabled: true,
      },
    ],
    agentProfiles: [{ id: 'agent-codex', displayName: 'Codex' }],
    ciBindings: [
      {
        id: 'ci',
        workspaceId: 'workspace',
        repositoryBindingId: 'repository',
        enabled: true,
        agenticDeliveryEnabled: true,
      },
    ],
    runtime: {
      agenticDelivery: {
        enabled: true,
        observeFailures: true,
        aiDiagnosisEnabled: true,
        sourceRepairEnabled: policyOverrides.sourceRepairEnabled ?? true,
        workflowRepairEnabled: true,
        managedBranchUpdatesEnabled: true,
      },
    },
  } as unknown as Settings;
  const context: IDeliveryViewContext = {
    snapshot: signal(snapshot),
    settings: signal(settings),
    selectedWorkspaceIds: signal(['workspace']),
    canCreatePullRequest: signal(true),
  };
  TestBed.configureTestingModule({
    providers: [
      PullRequestsViewPresenter,
      { provide: WorkspaceScopePresenter, useValue: {} },
      { provide: ExternalLinkService, useValue: { open: vi.fn() } },
      {
        provide: PullRequestStore,
        useValue: {
          pullRequestBranchUpdatingId: signal(undefined),
          updatePullRequestBranch: vi.fn(),
        },
      },
      { provide: DialogService, useValue: { show: vi.fn(), isShown: vi.fn(() => false) } },
      {
        provide: ActivatedRoute,
        useValue: {
          queryParamMap: queryParams.asObservable(),
          snapshot: { queryParamMap: convertToParamMap({}) },
        },
      },
      { provide: Router, useValue: router },
      { provide: DELIVERY_VIEW_CONTEXT, useValue: context },
      {
        provide: DELIVERY_CI_OPERATIONS,
        useValue: {
          localCiRunningRunId: signal(undefined),
          localCiStartedAt: signal(undefined),
          localCiEnabledFor: () => true,
          rerunCiRun: vi.fn(),
          runCiLocally: vi.fn(),
          cancelLocalCiRun: vi.fn(),
          cancelCiRun: vi.fn(),
        },
      },
      { provide: EXECUTION_OPERATIONS, useValue: { startSolver } },
      { provide: DELIVERY_ROUTE_HYDRATION, useValue: hydration },
    ],
  });
  const presenter = TestBed.inject(PullRequestsViewPresenter);
  TestBed.tick();
  return { presenter, queryParams, router, startSolver, hydration };
}

async function settle(): Promise<void> {
  TestBed.tick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  TestBed.tick();
}

function pullRequest(
  number: number,
  sourceBranch: string,
  overrides: Partial<IPullRequestSummary>,
): IPullRequestSummary {
  return {
    id: `repository:${number}`,
    workspaceId: 'workspace',
    repositoryBindingId: 'repository',
    number,
    title: `Pull request ${number}`,
    state: 'open',
    draft: false,
    sourceBranch,
    targetBranch: 'dev',
    externalUrl: `https://github.com/ruederennes/flamox/pull/${number}`,
    createdAt: '2026-10-29T08:00:00.000Z',
    updatedAt: '2026-10-30T08:00:00.000Z',
    ...overrides,
  };
}

function run(id: string, branch: string, status: ICiRun['status']): ICiRun {
  return {
    id,
    workspaceId: 'workspace',
    ciBindingId: 'ci',
    repositoryBindingId: 'repository',
    workflowId: 'quality',
    name: 'PR Quality',
    status,
    branch,
    startedAt: '2026-10-30T09:00:00.000Z',
    ...(status === 'failed' ? { finishedAt: '2026-10-30T09:00:42.000Z' } : {}),
  };
}

function execution(workItemId: string, number: number, agentProfileId: string): IExecutionRecord {
  return {
    id: `execution-${number}`,
    workItemId,
    workflowId: 'workflow',
    kind: 'solution',
    state: 'succeeded',
    startedAt: '2026-10-29T07:00:00.000Z',
    pullRequest: {
      number,
      externalUrl: `https://github.com/ruederennes/flamox/pull/${number}`,
      branchUrl: 'https://github.com/ruederennes/flamox/tree/codex/cr-0589',
    },
    bindingSnapshot: {
      agentProfileId,
      repositoryBindingIds: ['repository'],
    } as unknown as IExecutionRecord['bindingSnapshot'],
  };
}

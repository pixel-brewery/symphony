// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { createDefaultApplicationSettings } from '@symphony/configuration-composition';
import type { IDeliveryLaunchPlan, IDeliverySnapshot } from '@symphony/domain-delivery';
import type { IRepositoryBinding } from '@symphony/domain-workspace';
import type { IWorkItem } from '@symphony/domain-work';
import type { RequestPayload, IOrchestrationSnapshot } from '@symphony/ipc-contracts-composition';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { WorkFilterStore } from '@symphony/frontend-feature-work/filters';
import { ORBIT_CONTEXT } from '../ports/OrbitContextToken';
import { NotificationService } from '@symphony/frontend-notification';
import { BehaviorSubject } from 'rxjs';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { OrbitViewPresenter } from './OrbitViewPresenter';

vi.mock('@symphony/frontend-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@symphony/frontend-core')>();
  const { DestroyRef, inject, InjectionToken, signal } = await import('@angular/core');
  class CommandStub<TParameter = void> {
    private readonly _execute: (parameter: TParameter) => void;
    public constructor(execute: (parameter: TParameter) => void) {
      this._execute = execute;
    }
    public execute(parameter?: TParameter): void {
      this._execute(parameter as TParameter);
    }
  }
  class ViewPresenterStub {
    public readonly disposed = signal(false);
    public constructor() {
      inject(DestroyRef).onDestroy(() => this.disposed.set(true));
    }
    public initialize(): void {}
  }
  return {
    Command: CommandStub,
    ViewPresenter: ViewPresenterStub,
    ORCHESTRATION_CLIENT: new InjectionToken('ORCHESTRATION_CLIENT'),
    NotificationService: class NotificationService {},
    resolveBoardColumnLayout: actual.resolveBoardColumnLayout,
    workItemIdsNeedingAttention: actual.workItemIdsNeedingAttention,
  };
});

// #endregion

const repositories: IRepositoryBinding[] = ['repo-a', 'repo-b'].map((id) => ({
  id,
  workspaceId: 'personal',
  sourceControlConnectionId: 'connection',
  displayName: id,
  provider: 'simulated',
  host: 'example.invalid',
  owner: 'owner',
  name: id,
  defaultBranch: 'main',
  localPath: '',
  enabled: true,
}));
const targets = ['a', 'b', 'c'].map((id) => ({
  id,
  workspaceId: 'personal',
  repositoryBindingId: id === 'c' ? 'repo-b' : 'repo-a',
  displayName: id,
  kind: 'environment' as const,
  environment: id,
  production: false,
  workflowId: 'deploy',
  versionInput: 'version',
}));
const item: IWorkItem = {
  id: 'ticket-a',
  workspaceId: 'personal',
  externalId: '#123',
  title: 'Actual ticket',
  body: '',
  provider: 'simulated',
  repository: 'owner/repo-a',
  labels: [],
  assignees: [],
};

function setup(options: { work?: boolean; delivery?: boolean } = {}) {
  const pending: {
    readonly name: string;
    readonly resolve: (value: unknown) => void;
    readonly reject: (cause: unknown) => void;
  }[] = [];
  const query = new BehaviorSubject(convertToParamMap({}));
  const selectedWorkItem = signal<IWorkItem | undefined>(undefined);
  const explicit = signal(false);
  const filters = options.work === false ? null : new WorkFilterStore();
  const store = {
    workFilters: filters,
    delivery:
      options.delivery === false
        ? null
        : {
            refresh: () => request('delivery.refresh', {}),
            operations: () => request('delivery.operations', {}),
            preview: (payload: RequestPayload<'delivery.preview'>) =>
              request('delivery.preview', payload),
            start: (payload: RequestPayload<'delivery.start'>) =>
              request('delivery.start', payload),
            reconcile: (operationId: string) => request('delivery.reconcile', { operationId }),
          },
    settings: signal<ReturnType<typeof createDefaultApplicationSettings>>({
      ...createDefaultApplicationSettings(),
      deliveryTargets: targets,
      agentProfiles: [],
    }),
    snapshot: signal<Partial<IOrchestrationSnapshot> | undefined>(undefined),
    activityFresh: signal(true),
    scopedRepositories: signal(repositories),
    selectedWorkspaceIds: signal(['personal']),
    scopedWorkItems: signal([item]),
    activeBoardId: signal<string | undefined>(undefined),
    selectedWorkItem,
    selectionExplicit: explicit,
    selectWorkItem: vi.fn((id: string | undefined) => {
      selectedWorkItem.set(id === item.id ? item : undefined);
      explicit.set(Boolean(id));
    }),
    initialize: vi.fn(async () => undefined),
    refreshContinuousIntegrationRuns: vi.fn(async () => undefined),
  };
  const request = vi.fn((...args: [name: string, payload?: unknown]) => {
    const [name] = args;
    if (name === 'delivery.operations') return Promise.resolve([]);
    return new Promise((resolve, reject) => pending.push({ name, resolve, reject }));
  });
  TestBed.configureTestingModule({
    providers: [
      OrbitViewPresenter,
      { provide: ORBIT_CONTEXT, useValue: store },
      { provide: ORCHESTRATION_CLIENT, useValue: { request } },
      { provide: NotificationService, useValue: { showWarning: vi.fn(), showError: vi.fn() } },
      { provide: Router, useValue: { navigate: vi.fn() } },
      {
        provide: ActivatedRoute,
        useValue: { queryParamMap: query },
      },
    ],
  });
  return {
    presenter: TestBed.inject(OrbitViewPresenter),
    pending,
    request,
    store,
    query,
    navigate: TestBed.inject(Router).navigate as ReturnType<typeof vi.fn>,
  };
}

async function initialize(presenter: OrbitViewPresenter): Promise<void> {
  presenter.initialize();
  await Promise.resolve();
  TestBed.tick();
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  TestBed.tick();
}

function snapshot(targetId: string): IDeliverySnapshot {
  const target = targets.find((entry) => entry.id === targetId)!;
  return {
    targets: [target],
    refreshedAt: '2026-10-09T12:00:00Z',
    errors: [],
    evidence: [
      {
        id: `proof-${targetId}`,
        targetId,
        workspaceId: target.workspaceId,
        repositoryBindingId: target.repositoryBindingId,
        kind: 'deployment',
        revision: `revision-${targetId}`,
        state: 'succeeded',
        observedAt: '2026-10-09T12:00:00Z',
        workItemIds: [],
      },
    ],
  };
}

function plan(targetId: string, ref: string): IDeliveryLaunchPlan {
  return {
    targetId,
    targetName: targetId,
    repositoryBindingId: 'repo-a',
    ref,
    revision: ref,
    workflowId: 'deploy',
    workflowPath: '.github/workflows/deploy.yml',
    inputs: { version: ref },
    definitionHash: `fingerprint-${targetId}-${ref}`,
  };
}

describe('OrbitViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterAll(() => TestBed.resetTestEnvironment());
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('invalidates late evidence from a previous project without hiding configured targets', async () => {
    // arrange
    const { presenter, pending } = setup();
    await initialize(presenter);
    const oldRequest = pending[0]!;
    expect(presenter.targets().map((target) => target.id)).toEqual(['a', 'b']);

    // act
    presenter.repositoryId.set('repo-b');
    TestBed.tick();
    expect(presenter.delivery()).toBeUndefined();
    expect(presenter.targets().map((target) => target.id)).toEqual(['c']);
    pending[1]!.resolve(snapshot('c'));
    await settle();
    oldRequest.resolve(snapshot('a'));
    await settle();

    // assert
    expect(presenter.selectedDelivery().evidence.map((evidence) => evidence.targetId)).toEqual([
      'c',
    ]);
    expect(presenter.deliveryBusy()).toBe(false);
    expect(presenter.deliveryError()).toBe('');
  });

  it('keeps the configured appearance when older delivery evidence finishes loading', async () => {
    // arrange
    const { presenter, pending, store } = setup();
    await initialize(presenter);
    // act
    store.settings.update((settings) => ({
      ...settings,
      deliveryTargets: (settings.deliveryTargets ?? []).map((target) =>
        target.id === 'a'
          ? { ...target, displayName: 'Current Production', celestialBody: 'earth' }
          : target,
      ),
    }));
    pending[0]!.resolve(snapshot('a'));
    await settle();
    // assert
    expect(presenter.targets().find((target) => target.id === 'a')).toMatchObject({
      displayName: 'a',
      celestialBody: 'earth',
    });
    expect(presenter.selectedDelivery().evidence[0]?.targetId).toBe('a');
  });

  it('retains configured destinations and marks unavailable proofs as stale after a failed query', async () => {
    // arrange
    const { presenter, pending } = setup();
    await initialize(presenter);

    // act
    pending[0]!.reject(new Error('Account unavailable'));
    await settle();

    // assert
    expect(presenter.targets().map((target) => target.id)).toEqual(['a', 'b']);
    expect(presenter.deliveryError()).not.toBe('');
    expect(
      presenter
        .orbitScene()
        .nodes.filter((node) => node.kind === 'target')
        .every((node) => node.deliveryState === 'stale'),
    ).toBe(true);
  });

  it('never installs or starts a late delivery preview for a previously selected target or ref', async () => {
    // arrange
    const { presenter, pending, request } = setup();
    await initialize(presenter);
    pending[0]!.resolve(snapshot('a'));
    await settle();
    presenter.selectCommand.execute('target:a');
    presenter.changeLaunchRefCommand.execute('sha-a');
    presenter.previewLaunchCommand.execute();
    const previewA = pending[1]!;

    // act
    presenter.selectCommand.execute('target:b');
    presenter.changeLaunchRefCommand.execute('sha-b');
    presenter.previewLaunchCommand.execute();
    pending[2]!.resolve(plan('b', 'sha-b'));
    await settle();
    previewA.resolve(plan('a', 'sha-a'));
    await settle();
    expect(presenter.launchPlan()?.targetId).toBe('b');
    presenter.changeLaunchRefCommand.execute('sha-c');
    presenter.previewLaunchCommand.execute();
    const previewC = pending[3]!;
    presenter.changeLaunchRefCommand.execute('sha-d');
    previewC.resolve(plan('b', 'sha-c'));
    await settle();
    presenter.startLaunchCommand.execute();

    // assert
    expect(presenter.launchPlan()).toBeUndefined();
    expect(request.mock.calls.some(([name]) => name === 'delivery.start')).toBe(false);
  });

  it('uses contextual search to focus the actual ticket while retaining Board selection when details close', async () => {
    // arrange
    const { presenter, pending, query, store } = setup();
    await initialize(presenter);
    pending[0]!.resolve(snapshot('a'));
    await settle();

    // act
    query.next(convertToParamMap({ q: '#123' }));
    const firstFocus = presenter.focusRevision();
    presenter.focusSearchCommand.execute();
    expect(presenter.focusRevision()).toBeGreaterThan(firstFocus);
    presenter.closeDetailsCommand.execute();

    // assert
    expect(presenter.landscape?.query()).toBe('#123');
    expect(presenter.focusId()).toBe('ticket:ticket-a');
    expect(store.selectedWorkItem()?.id).toBe('ticket-a');
    expect(presenter.selectedTicket()).toBeUndefined();
  });

  it('makes every configured destination reachable independently of the visible label budget', async () => {
    // arrange
    const { presenter, pending, store } = setup();
    store.settings.update((settings) => ({
      ...settings,
      deliveryTargets: Array.from({ length: 100 }, (_, index) => ({
        ...targets[0]!,
        id: `target-${index}`,
        displayName: `Destination ${index}`,
      })),
    }));
    await initialize(presenter);
    pending[0]!.resolve({ ...snapshot('a'), targets: [], evidence: [] });
    await settle();

    // act
    const menu = presenter.destinationMenu();
    presenter.selectTargetCommand.execute(menu.at(-1)!.id);

    // assert
    expect(menu).toHaveLength(100);
    expect(presenter.selectedTarget()?.id).toBe('target-99');
    expect(presenter.focusId()).toBe('target:target-99');
    expect(presenter.inspectorMode()).toBe('destination');
  });

  it("does not associate another repository's identically numbered pull request with the selected ticket", async () => {
    // arrange
    const { presenter, pending, store } = setup();
    const actualUrl = 'https://example.invalid/owner/repo-a/pull/42';
    store.snapshot.set({
      executions: [
        {
          id: 'execution-a',
          workItemId: item.id,
          workflowId: 'workflow',
          state: 'succeeded',
          startedAt: '2026-10-09T12:00:00Z',
          pullRequest: {
            number: 42,
            externalUrl: actualUrl,
            branchUrl: 'https://example.invalid/branch/a',
          },
        },
      ],
      pullRequests: ['a', 'b'].map((id) => ({
        id,
        workspaceId: 'personal',
        repositoryBindingId: `repo-${id}`,
        number: 42,
        title: 'Same number',
        state: 'merged',
        draft: false,
        sourceBranch: 'feature',
        targetBranch: 'main',
        headRevision: `sha-${id}`,
        externalUrl: `https://example.invalid/owner/repo-${id}/pull/42`,
        createdAt: '2026-10-09T11:00:00Z',
        updatedAt: '2026-10-09T12:00:00Z',
      })),
      ciRuns: ['a', 'b'].map((id) => ({
        id: `run-${id}`,
        workspaceId: 'personal',
        ciBindingId: `ci-${id}`,
        repositoryBindingId: `repo-${id}`,
        name: 'CI',
        status: 'succeeded',
        revision: `sha-${id}`,
      })),
    });
    await initialize(presenter);
    pending[0]!.resolve(snapshot('a'));
    await settle();

    // act
    presenter.selectTicketCommand.execute(item.id);

    // assert
    expect(presenter.ticketRuns().map((run) => run.id)).toEqual(['run-a']);
  });

  it('uses only enabled identities from the current project workspace for ambient flights', () => {
    // arrange
    const { presenter, store } = setup();
    const base = createDefaultApplicationSettings().agentProfiles[0]!;
    store.settings.update((settings) => ({
      ...settings,
      agentProfiles: [
        {
          ...base,
          id: 'pilot-a',
          workspaceId: 'personal',
          displayName: 'Paula',
          appearance: { figure: 'dot', color: 'rose', accessories: [] },
        },
        { ...base, id: 'pilot-disabled', workspaceId: 'personal', enabled: false },
        { ...base, id: 'pilot-other', workspaceId: 'other', displayName: 'Arno' },
      ],
    }));
    store.selectedWorkspaceIds.set(['personal', 'other']);
    store.scopedRepositories.set([
      ...repositories,
      { ...repositories[0]!, id: 'repo-other', workspaceId: 'other' },
    ]);
    // act
    const first = presenter.orbitCrew();
    presenter.repositoryId.set('repo-other');
    // assert
    expect(first).toEqual([
      {
        id: 'pilot-a',
        name: 'Paula',
        appearance: { figure: 'dot', color: 'rose', accessories: [] },
      },
    ]);
    expect(presenter.orbitCrew()).toEqual([
      { id: 'pilot-other', name: 'Arno', appearance: base.appearance },
    ]);
    expect(presenter.orbitScene().nodes.some((node) => node.id.startsWith('pilot-'))).toBe(false);
  });

  it('ignores retired employee objects while preserving ticket selection and the cluster list', async () => {
    // arrange
    const { presenter, pending, store } = setup();
    const second = { ...item, id: 'ticket-b', externalId: '#124' };
    store.scopedWorkItems.set([item, second]);
    await initialize(presenter);
    pending[0]!.resolve(snapshot('a'));
    await settle();

    // act
    presenter.selectCommand.execute('agent:worker:work:ticket-b');

    // assert
    expect(presenter.selectedSceneId()).toBeUndefined();
    expect(new Set(presenter.orbitScene().nodes.map((node) => node.kind))).toEqual(
      new Set(['production', 'target', 'ticket', 'group']),
    );
    expect(presenter.inspectorMode()).toBe('cluster');
    expect(presenter.clusterItems().map((entry) => entry.id)).toEqual(['ticket-b', 'ticket-a']);
    presenter.selectTicketCommand.execute(item.id);
    expect(presenter.selectedSceneId()).toBe(`ticket:${item.id}`);
    expect(presenter.selectedTicket()?.id).toBe(item.id);
  });
  it('retains readonly configured targets and refuses every Delivery command when its participant is omitted', async () => {
    // arrange
    const { presenter, request } = setup({ work: false, delivery: false });
    await initialize(presenter);
    presenter.selectCommand.execute('target:a');
    presenter.changeLaunchRefCommand.execute('revision-a');
    presenter.launchPlan.set(plan('a', 'revision-a'));

    // act
    presenter.refreshDeliveryCommand.execute();
    presenter.previewLaunchCommand.execute();
    presenter.startLaunchCommand.execute();
    presenter.reconcileCommand.execute('operation-a');
    presenter.configureDeliveryCommand.execute();
    presenter.searchCommand.execute('#123');
    presenter.clearFiltersCommand.execute();
    await settle();

    // assert
    expect(presenter.deliveryAvailable).toBe(false);
    expect(presenter.workFiltersAvailable).toBe(false);
    expect(presenter.landscape).toBeNull();
    expect(presenter.targets().map((target) => target.id)).toEqual(['a', 'b']);
    expect(presenter.deliveryBusy()).toBe(false);
    expect(presenter.launchBusy()).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });

  it('clusters work items by board column, inspects Needs attention first and opens either on the Board', async () => {
    // arrange
    const { presenter, pending, store, navigate } = setup();
    const done = {
      ...item,
      id: 'ticket-done',
      externalId: '#7',
      stageId: 'done',
      boardColumnId: 'done',
    };
    const failing = {
      ...item,
      id: 'ticket-failing',
      externalId: '#9',
      stageId: 'backlog',
      boardColumnId: 'backlog',
    };
    const backlog = {
      ...item,
      id: 'ticket-backlog',
      externalId: '#8',
      stageId: 'backlog',
      boardColumnId: 'backlog',
    };
    store.scopedWorkItems.set([done, failing, backlog]);
    store.snapshot.set(clusterSnapshot('ticket-failing'));
    await initialize(presenter);
    pending[0]!.resolve(snapshot('a'));
    await settle();

    // act
    const clusters = presenter
      .clusters()
      .map((cluster) => [cluster.label, cluster.tone, cluster.memberIds]);
    const firstInspected = presenter.inspectedCluster()?.label;
    presenter.showOnBoardCommand.execute();
    presenter.selectCommand.execute('group:column:done');
    presenter.showOnBoardCommand.execute();

    // assert
    expect(clusters).toEqual([
      ['Backlog', 'neutral', ['ticket-backlog']],
      ['Done', 'success', ['ticket-done']],
      ['Needs attention', 'danger', ['ticket-failing']],
    ]);
    expect(firstInspected).toBe('Needs attention');
    expect(presenter.inspectorMode()).toBe('cluster');
    expect(presenter.inspectedCluster()?.label).toBe('Done');
    expect(presenter.columnLabels().get('ticket-failing')).toBe('Backlog');
    expect(navigate.mock.calls).toEqual([
      [['/main/board'], { queryParams: { attention: 'true' } }],
      [['/main/board'], { queryParams: { column: 'done' } }],
    ]);
  });

  it('counts collected evidence and the items missing from the confirmed Production version', async () => {
    // arrange
    const { presenter, pending, store } = setup();
    const first = {
      ...item,
      id: 'ticket-1',
      externalId: '#1',
      stageId: 'done',
      boardColumnId: 'done',
    };
    const second = {
      ...item,
      id: 'ticket-2',
      externalId: '#2',
      stageId: 'done',
      boardColumnId: 'done',
    };
    store.scopedWorkItems.set([first, second]);
    store.snapshot.set(clusterSnapshot());
    store.settings.update((settings) => ({
      ...settings,
      deliveryTargets: [{ ...targets[0]!, production: true }],
    }));
    await initialize(presenter);
    const before = presenter.evidenceKnown();

    // act
    pending[0]!.resolve({
      targets: [{ ...targets[0]!, production: true }],
      refreshedAt: '2026-10-09T12:00:00Z',
      errors: [],
      evidence: [
        {
          id: 'proof',
          targetId: 'a',
          workspaceId: 'personal',
          repositoryBindingId: 'repo-a',
          kind: 'deployment',
          revision: 'revision',
          version: 'v2026.10.3',
          state: 'succeeded',
          observedAt: '2026-10-09T12:00:00Z',
          workItemIds: ['ticket-1'],
        },
      ],
    });
    await settle();

    // assert
    expect(before).toBe(false);
    expect(presenter.evidenceKnown()).toBe(true);
    expect(presenter.inspectedCluster()?.label).toBe('Done');
    expect(presenter.clusterEvidenceCount()).toBe(1);
    expect(presenter.clusterUnconfirmedCount()).toBe(1);
    expect(presenter.productionName()).toBe('a');
    expect(presenter.productionNode()).toMatchObject({
      deliveryState: 'confirmed',
      version: 'v2026.10.3',
    });
  });

  it('reports the confirmed version of the selected one of several Production destinations', async () => {
    // arrange
    const { presenter, pending, store } = setup();
    const production = targets
      .filter((target) => target.repositoryBindingId === 'repo-a')
      .map((target) => ({ ...target, production: true }));
    store.settings.update((settings) => ({ ...settings, deliveryTargets: production }));
    await initialize(presenter);
    pending[0]!.resolve({
      targets: production,
      refreshedAt: '2026-10-09T12:00:00Z',
      errors: [],
      evidence: production.map((target, index) => ({
        id: `proof-${target.id}`,
        targetId: target.id,
        workspaceId: 'personal',
        repositoryBindingId: 'repo-a',
        kind: 'deployment' as const,
        revision: `revision-${index}`,
        version: `v2026.10.${index + 1}`,
        state: 'succeeded' as const,
        observedAt: '2026-10-09T12:00:00Z',
        workItemIds: [],
      })),
    });
    await settle();
    const before = {
      name: presenter.toolbarDestination()?.displayName,
      node: presenter.toolbarDestinationNode(),
    };

    // act
    presenter.selectTargetCommand.execute('b');

    // assert
    expect(presenter.productionName()).toBe('Production');
    expect(before.name).toBe('a');
    expect(before.node).toMatchObject({ deliveryState: 'confirmed', version: 'v2026.10.1' });
    expect(presenter.toolbarDestination()?.displayName).toBe('b');
    expect(presenter.toolbarDestinationNode()).toMatchObject({
      deliveryState: 'confirmed',
      version: 'v2026.10.2',
    });
  });

  it('returns from a selected cluster to the default one and opens Delivery destinations in Settings', async () => {
    // arrange
    const { presenter, pending, store, navigate } = setup();
    const done = {
      ...item,
      id: 'ticket-done',
      externalId: '#7',
      stageId: 'done',
      boardColumnId: 'done',
    };
    const failing = { ...item, id: 'ticket-failing', externalId: '#9', stageId: 'done' };
    store.scopedWorkItems.set([done, failing]);
    store.snapshot.set(clusterSnapshot('ticket-failing'));
    await initialize(presenter);
    pending[0]!.resolve(snapshot('a'));
    await settle();
    presenter.selectCommand.execute('group:column:done');
    const selected = presenter.inspectedCluster()?.label;

    // act
    presenter.dismissOverlayCommand.execute();
    presenter.openDeliverySettingsCommand.execute();

    // assert
    expect(selected).toBe('Done');
    expect(presenter.inspectedCluster()?.label).toBe('Needs attention');
    expect(navigate).toHaveBeenLastCalledWith(['/main/settings'], {
      queryParams: { workspace: 'personal', section: 'delivery', repository: 'repo-a' },
    });
  });
});

function clusterSnapshot(failedWorkItemId?: string): Partial<IOrchestrationSnapshot> {
  return {
    boardColumns: [
      { id: 'backlog', label: 'Backlog', stageId: 'backlog' },
      { id: 'done', label: 'Done', stageId: 'done' },
    ],
    workflow: {
      stages: [
        { id: 'backlog', label: 'Backlog', description: '', kind: 'human-gate' },
        { id: 'done', label: 'Done', description: '', kind: 'terminal' },
      ],
    } as unknown as IOrchestrationSnapshot['workflow'],
    executions: failedWorkItemId
      ? [
          {
            id: 'execution-failed',
            workItemId: failedWorkItemId,
            workflowId: 'workflow',
            state: 'failed',
            startedAt: '2026-10-09T12:00:00Z',
          },
        ]
      : [],
  };
}

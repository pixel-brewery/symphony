// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { DrawerService } from '@pixel-brewery/mosaik-elements-angular';
import type { ICiRun, ICiRunDetails, ICiWorkflow } from '@symphony/domain-ci';
import {
  Clock,
  EXECUTION_OPERATIONS,
  ExternalLinkService,
  WorkspaceScopePresenter,
} from '@symphony/frontend-core';
import { ApplicationBootstrap } from '@symphony/frontend-core/bootstrap';
import { NotificationService } from '@symphony/frontend-notification';
import { BehaviorSubject } from 'rxjs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { CI_ACTION_CONTEXT } from '../../ports/CiActionContextToken';
import type { ICiAgentExecution } from '../../ports/ICiAgentExecution';
import { CiStore } from '../../state/CiStore';
import { ActionsViewPresenter } from './ActionsViewPresenter';

vi.mock('@pixel-brewery/mosaik-elements-angular', async () => {
  const { InjectionToken } = await import('@angular/core');
  return {
    DRAWER_REF: new InjectionToken('DRAWER_REF'),
    DRAWER_REF_DATA: new InjectionToken('DRAWER_REF_DATA'),
    DrawerService: class DrawerServiceStub {},
  };
});

vi.mock('../views/drawers/ActionDrawerView', () => ({
  ActionDrawerView: class ActionDrawerViewStub {},
}));

vi.mock('@symphony/frontend-core/bootstrap', () => ({
  ApplicationBootstrap: class ApplicationBootstrapStub {},
}));

vi.mock('@symphony/frontend-core', async () => {
  const { InjectionToken } = await import('@angular/core');
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
    public dispose(): void {
      // The stub owns no resources.
    }
  }
  return {
    Clock: class ClockStub {},
    Command: CommandStub,
    EXECUTION_OPERATIONS: new InjectionToken('EXECUTION_OPERATIONS'),
    ExternalLinkService: class ExternalLinkServiceStub {},
    Hydratable: () => ViewPresenterStub,
    ViewPresenter: ViewPresenterStub,
    WorkspaceScopePresenter: class WorkspaceScopePresenterStub {},
  };
});

// #endregion

const workflow: ICiWorkflow = {
  id: 'ci:102',
  workspaceId: 'personal',
  ciBindingId: 'ci',
  repositoryBindingId: 'repository',
  name: 'Deploy Dev',
  path: '.github/workflows/deploy.yml',
  state: 'active',
  defaultBranch: 'dev',
  supportsManualDispatch: true,
};

function run(id: string, status: ICiRun['status'], startedAt: string): ICiRun {
  return {
    id,
    workspaceId: 'personal',
    ciBindingId: 'ci',
    repositoryBindingId: 'repository',
    workflowId: workflow.id,
    name: workflow.name,
    status,
    branch: 'codex/cr-0589',
    revision: 'e81f3b2',
    runAttempt: 1,
    startedAt,
    ...(status === 'queued' || status === 'in-progress'
      ? {}
      : { finishedAt: startedAt.replace('T08', 'T09') }),
  };
}

const failedRun = run('ci:1', 'failed', '2026-10-30T08:00:00.000Z');
const passedRun = run('ci:2', 'succeeded', '2026-10-29T08:00:00.000Z');
const runningRun = run('ci:3', 'in-progress', '2026-10-30T10:00:00.000Z');

const delivered: ICiAgentExecution = {
  id: 'solution',
  workspaceId: 'personal',
  workItemId: 'work-item-589',
  kind: 'solution',
  state: 'succeeded',
  startedAt: '2026-10-28T08:00:00.000Z',
  workspaceReference: 'codex/cr-0589',
  pullRequest: { number: 712 },
};

const failedDetails: ICiRunDetails = {
  runId: failedRun.id,
  jobs: [
    {
      id: 'job',
      name: 'deploy',
      status: 'failed',
      steps: [{ id: 'step', name: 'Deploy to app-flamox-dev', status: 'failed' }],
    },
  ],
  failureLog: 'ERROR: The resource could not be found.',
};

function createPresenter(queryParams: Record<string, string>) {
  const ci = {
    runs: signal<readonly ICiRun[]>([failedRun, passedRun, runningRun]),
    workflows: signal<readonly ICiWorkflow[]>([workflow]),
    remoteData: signal(undefined),
    continuousIntegrationRunsBusy: signal(false),
    localCiRunningRunId: signal<string | undefined>(undefined),
    localCiStartedAt: signal<string | undefined>(undefined),
    localCiEnabledFor: () => true,
    loadContinuousIntegrationRunDetails: vi.fn(async () => failedDetails),
    cancelCiRun: vi.fn(async () => undefined),
    cancelLocalCiRun: vi.fn(async () => undefined),
  };
  const executions = { startSolver: vi.fn(async () => true) };
  const router = { navigate: vi.fn(async () => true) };
  const queryParamMap = new BehaviorSubject(convertToParamMap(queryParams));
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      ActionsViewPresenter,
      { provide: CiStore, useValue: ci },
      {
        provide: CI_ACTION_CONTEXT,
        useValue: {
          snapshot: signal({ executions: [delivered], localCiExecutions: [] }),
          settings: signal({
            repositoryBindings: [],
            runtime: {
              agenticDelivery: {
                enabled: true,
                managedBranchUpdatesEnabled: true,
                sourceRepairEnabled: true,
                workflowRepairEnabled: false,
              },
            },
          }),
        },
      },
      {
        provide: ActivatedRoute,
        useValue: { queryParamMap, snapshot: { queryParamMap: queryParamMap.value } },
      },
      { provide: Router, useValue: router },
      { provide: Clock, useValue: { now: signal(Date.parse('2026-10-30T12:00:00.000Z')) } },
      { provide: DrawerService, useValue: {} },
      { provide: EXECUTION_OPERATIONS, useValue: executions },
      { provide: ExternalLinkService, useValue: { open: vi.fn() } },
      { provide: NotificationService, useValue: { showSuccess: vi.fn(), showError: vi.fn() } },
      { provide: ApplicationBootstrap, useValue: { initialize: vi.fn(async () => undefined) } },
      { provide: WorkspaceScopePresenter, useValue: {} },
    ],
  });
  return { presenter: TestBed.inject(ActionsViewPresenter), ci, executions, router };
}

describe('ActionsViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterAll(() => TestBed.resetTestEnvironment());

  it('opens on All runs and applies the status link from Overview', () => {
    // arrange
    const { presenter } = createPresenter({ status: 'failed' });

    // act
    TestBed.tick();

    // assert
    expect(presenter.selectedWorkflow()).toBeUndefined();
    expect(presenter.overview().running).toEqual([]);
    expect(presenter.overview().history.map((row) => row.id)).toEqual(['ci:1']);
    expect(presenter.activeRunCount()).toBe(1);
    expect(presenter.failingWorkflowCount()).toBe(1);
  });

  it('selects the workflow and run of a run link and loads its steps', async () => {
    // arrange
    const { presenter, ci } = createPresenter({ run: 'ci:2' });

    // act
    TestBed.tick();
    await vi.waitFor(() => expect(ci.loadContinuousIntegrationRunDetails).toHaveBeenCalled());

    // assert
    expect(presenter.selectedWorkflow()?.id).toBe(workflow.id);
    expect(presenter.selectedRun()?.id).toBe('ci:2');
    expect(presenter.workflowRuns().map((row) => row.id)).toEqual(['ci:3', 'ci:1', 'ci:2']);
    expect(ci.loadContinuousIntegrationRunDetails).toHaveBeenCalledWith('ci:2');
  });

  it('starts Fix with AI on the pull request the failed run checked', async () => {
    // arrange
    const { presenter, ci, executions } = createPresenter({ workflow: workflow.id });
    TestBed.tick();
    await vi.waitFor(() => expect(presenter.runSteps().length).toBe(1));

    // act
    presenter.fixWithAiCommand.execute();
    await vi.waitFor(() => expect(executions.startSolver).toHaveBeenCalled());

    // assert
    expect(ci.loadContinuousIntegrationRunDetails).toHaveBeenCalledWith('ci:1');
    expect(presenter.selectedRun()?.id).toBe('ci:1');
    expect(presenter.fixWithAi()).toEqual({ state: 'available', workItemId: 'work-item-589' });
    expect(executions.startSolver).toHaveBeenCalledWith(
      false,
      'work-item-589',
      expect.stringContaining('Failed steps: Deploy to app-flamox-dev.'),
    );
  });

  it('stops a GitHub run on GitHub and a local run on the local runner', async () => {
    // arrange
    const { presenter, ci } = createPresenter({});
    ci.localCiRunningRunId.set('ci:1');
    ci.localCiStartedAt.set('2026-10-30T11:00:00.000Z');
    const [localRow, githubRow] = presenter.overview().running;

    // act
    presenter.stopRunCommand.execute(githubRow!);
    presenter.stopRunCommand.execute(localRow!);
    await vi.waitFor(() => expect(ci.cancelLocalCiRun).toHaveBeenCalled());

    // assert
    expect(localRow?.id).toBe('ci:1');
    expect(ci.cancelCiRun).toHaveBeenCalledWith('ci:3');
    expect(ci.cancelLocalCiRun).toHaveBeenCalledWith('ci:1');
  });

  it('opens the dispatch confirmation for a palette intent once and clears the intent', () => {
    // arrange
    const { presenter, router } = createPresenter({ workflow: workflow.id, dispatch: 'github' });

    // act
    TestBed.tick();

    // assert
    expect(presenter.selectedWorkflow()?.id).toBe(workflow.id);
    expect(presenter.dispatchProposal()?.id).toBe(workflow.id);
    expect(presenter.dispatchRef()).toBe('dev');
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { dispatch: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      }),
    );
  });

  it('keeps the selected workflow in the URL', () => {
    // arrange
    const { presenter, router } = createPresenter({});

    // act
    presenter.selectWorkflowCommand.execute(workflow.id);

    // assert
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { workflow: workflow.id, run: null },
        queryParamsHandling: 'merge',
      }),
    );
  });
});

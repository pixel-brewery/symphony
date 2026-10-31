// @vitest-environment jsdom

// #region Imports

import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { MessageBoxService } from '@pixel-brewery/mosaik-elements-angular';
import type { ICiRun } from '@symphony/domain-ci';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import { defaultWorkflow } from '@symphony/domain-workflow';
import type { IExecutionOperations } from '@symphony/frontend-core/execution';
import type { IWorkflowOperations } from '@symphony/frontend-core/workflow';
import type { IRepositoryRuntimeOperations } from '@symphony/frontend-core/workspace';
import { NotificationService } from '@symphony/frontend-notification';
import type {
  ApplicationSettingsDto,
  IOrchestrationSnapshot,
} from '@symphony/ipc-contracts-composition';
import { BehaviorSubject, of } from 'rxjs';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { IHomeContext } from '../ports/IHomeContext';
import { HOME_CONTEXT } from '../ports/HomeContextToken';
import { InboxViewPresenter } from './InboxViewPresenter';

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

const analysis: IExecutionRecord = {
  id: 'analysis',
  workItemId: 'ready',
  workflowId: 'workflow',
  kind: 'analysis',
  mode: 'ai',
  state: 'succeeded',
  startedAt: new Date(Date.now() - 120_000).toISOString(),
  finishedAt: new Date(Date.now() - 60_000).toISOString(),
  summary: 'Restore into an isolated target.',
};

const run: ICiRun = {
  id: 'run',
  workspaceId: 'workspace',
  ciBindingId: 'ci',
  repositoryBindingId: 'repo',
  name: 'Deploy Dev',
  status: 'failed',
  startedAt: new Date(Date.now() - 600_000).toISOString(),
  finishedAt: new Date(Date.now() - 300_000).toISOString(),
};

function setup(options: { unprepared?: boolean; entry?: string } = {}) {
  const snapshot = signal<IOrchestrationSnapshot | undefined>({
    workItems: [
      item('ready', 'ready'),
      {
        ...item('acceptance', 'acceptance'),
        updatedAt: new Date(Date.now() - 1_800_000).toISOString(),
      },
    ],
    boardColumns: defaultWorkflow.stages.map((stage) => ({ id: stage.id, label: stage.label })),
    executions: [analysis],
    events: [],
    workflow: defaultWorkflow,
    skills: [],
    ciRuns: [run],
  } as unknown as IOrchestrationSnapshot);
  const execution = {
    delegateWorkItem: vi.fn(async () => true),
    startSolver: vi.fn(async () => true),
    completeManualSolution: vi.fn(async () => true),
    reviewGoal: vi.fn(async () => true),
    confirmDeliveryGroup: vi.fn(async () => undefined),
    rejectDeliveryGroup: vi.fn(async () => true),
  };
  const workflow = { decideWorkflow: vi.fn(async () => undefined) };
  const runtime = {
    repositoryRuntimeStatus: vi.fn(() => ({
      preparation: { state: options.unprepared ? 'unprepared' : 'prepared' },
    })),
    refreshRepositoryRuntime: vi.fn(async () => true),
    prepareRepository: vi.fn(async () => true),
  };
  const messageBox = { show: vi.fn(() => ({ closed: of({ reason: 'negative' }) })) };
  const context: IHomeContext = {
    hasSnapshot: computed(() => Boolean(snapshot())),
    externalServiceIncident: signal(undefined),
    snapshot,
    settings: signal({
      agentProfiles: [
        { id: 'codex', displayName: 'Codex', workspaceId: 'workspace', enabled: true },
      ],
      agentTeams: [],
      repositoryBindings: [
        { id: 'repo', workspaceId: 'workspace', owner: 'owner', name: 'repo', enabled: true },
      ],
    } as unknown as ApplicationSettingsDto),
    activeWorkspace: signal(undefined),
    selectedWorkspaceIds: signal(['workspace']),
    scopedRepositories: signal([]),
    scopedWorkItems: computed(() => snapshot()?.workItems ?? []),
    activeBoardId: signal(undefined),
    syncBusy: signal(false),
    execution: execution as unknown as IExecutionOperations,
    workflow: workflow as unknown as IWorkflowOperations,
    ci: null,
    delivery: null,
    repositoryRuntime: runtime as unknown as IRepositoryRuntimeOperations,
    initialize: async () => undefined,
    sync: async () => undefined,
    listStageChanges: async () => ({ changes: [], truncated: false }),
    listRunHistory: async () => ({ runs: [], truncated: false }),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      InboxViewPresenter,
      { provide: HOME_CONTEXT, useValue: context },
      {
        provide: ActivatedRoute,
        useValue: {
          queryParamMap: new BehaviorSubject(
            convertToParamMap(options.entry ? { entry: options.entry } : {}),
          ),
        },
      },
      { provide: MessageBoxService, useValue: messageBox },
      {
        provide: NotificationService,
        useValue: { showWarning: vi.fn(), showError: vi.fn(), showSuccess: vi.fn() },
      },
    ],
  });
  return {
    presenter: TestBed.inject(InboxViewPresenter),
    execution,
    workflow,
    runtime,
    messageBox,
  };
}

describe('InboxViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterAll(() => TestBed.resetTestEnvironment());
  afterEach(() => TestBed.resetTestingModule());

  it('groups decisions and updates, filters them and selects the first entry', () => {
    // arrange
    const { presenter } = setup();

    // act
    const all = presenter.decisions().map((entry) => entry.kind);
    presenter.selectFilterCommand.execute('updates');

    // assert
    expect(all).toEqual(['solution', 'failing-workflow', 'acceptance']);
    expect(presenter.decisionCount()).toBe(3);
    expect(presenter.decisions()).toEqual([]);
    expect(presenter.selectedEntry()).toBeUndefined();
  });

  it('selects the entry a link asks for and shows its five stages', () => {
    // arrange
    const { presenter } = setup({ entry: 'solution:ready' });

    // act
    const steps = presenter.steps().map((step) => [step.id, step.state]);

    // assert
    expect(presenter.selectedEntry()?.id).toBe('solution:ready');
    expect(steps).toEqual([
      ['analysis', 'done'],
      ['solution', 'attention'],
      ['implementation', 'pending'],
      ['checks', 'pending'],
      ['acceptance', 'pending'],
    ]);
  });

  it('assigns the chosen agent and starts the implementation', async () => {
    // arrange
    const { presenter, execution } = setup({ entry: 'solution:ready' });

    // act
    presenter.selectOptionCommand.execute('assign-codex');
    presenter.continueCommand.execute();
    await vi.waitFor(() => expect(execution.startSolver).toHaveBeenCalled());

    // assert
    expect(execution.delegateWorkItem).toHaveBeenCalledWith(
      'ready',
      undefined,
      'codex',
      'Title ready',
    );
    expect(execution.startSolver).toHaveBeenCalledWith(false, 'ready');
  });

  it('asks to prepare an unprepared repository first and starts nothing when declined', async () => {
    // arrange
    const { presenter, execution, messageBox } = setup({
      entry: 'solution:ready',
      unprepared: true,
    });

    // act
    presenter.continueCommand.execute();
    await vi.waitFor(() => expect(presenter.busy()).toBe(false));

    // assert
    expect(messageBox.show).toHaveBeenCalledWith(
      expect.objectContaining({ header: 'Prepare owner/repo locally?' }),
    );
    expect(execution.delegateWorkItem).not.toHaveBeenCalled();
    expect(execution.startSolver).not.toHaveBeenCalled();
  });

  it('requires the protocol before recording the implementation yourself', async () => {
    // arrange
    const { presenter, execution } = setup({ entry: 'solution:ready' });
    presenter.selectOptionCommand.execute('record-solution');

    // act
    const blocked = presenter.canContinue();
    presenter.updateNoteCommand.execute('Restored and measured RPO and RTO.');
    presenter.continueCommand.execute();
    await vi.waitFor(() => expect(execution.completeManualSolution).toHaveBeenCalled());

    // assert
    expect(blocked).toBe(false);
    expect(presenter.noteRequirement()).toBe('required');
    expect(execution.completeManualSolution).toHaveBeenCalledWith(
      'ready',
      'Restored and measured RPO and RTO.',
    );
  });

  it('accepts delivered work from the list through the gate decision', async () => {
    // arrange
    const { presenter, workflow } = setup();
    const entry = presenter.decisions().find((candidate) => candidate.kind === 'acceptance')!;

    // act
    presenter.acceptCommand.execute(entry);
    await vi.waitFor(() => expect(workflow.decideWorkflow).toHaveBeenCalled());
    presenter.requestChangesCommand.execute(entry);

    // assert
    expect(workflow.decideWorkflow).toHaveBeenCalledWith('acceptance', 'accept', undefined);
    expect(presenter.selectedEntry()?.id).toBe(entry.id);
    expect(presenter.selectedOption()).toMatchObject({ optionId: 'reject-implementation' });
    expect(presenter.noteRequirement()).toBe('optional');
  });

  it('opens a failing workflow in Actions and snoozes an entry for the session', async () => {
    // arrange
    const { presenter } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const failing = presenter.decisions().find((entry) => entry.kind === 'failing-workflow')!;
    presenter.selectEntryCommand.execute(failing.id);

    // act
    presenter.selectOptionCommand.execute('open-actions');
    presenter.continueCommand.execute();
    await vi.waitFor(() => expect(navigate).toHaveBeenCalled());
    presenter.snoozeCommand.execute();

    // assert
    expect(navigate).toHaveBeenCalledWith(['/main/actions'], { queryParams: { q: 'Deploy Dev' } });
    expect(presenter.decisions().some((entry) => entry.id === failing.id)).toBe(false);
  });
});

// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Router } from '@angular/router';
import { DIALOG_REF, DIALOG_REF_DATA } from '@pixel-brewery/mosaik-elements-angular';
import type { IWorkItem } from '@symphony/domain-work';
import { defaultWorkflow } from '@symphony/domain-workflow';
import { DesktopSpeechRecognitionService } from '@symphony/frontend-interaction';
import type { WorkItemEditorMetadataDto } from '@symphony/ipc-contracts-work';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WORK_SKILLS_READ } from '../../ports/WorkSkillsReadToken';
import { WORK_TASK_CONTEXT } from '../../ports/WorkTaskContextToken';
import { WorkStore } from '../../state/WorkStore';
import { LocalExecutionApprovalService } from '../services/LocalExecutionApprovalService';
import { NewWorkItemSheetViewPresenter } from './NewWorkItemSheetViewPresenter';

// #endregion

const metadata = {
  repositories: ['example/platform'],
  labels: [{ name: 'security', color: 'ff0000' }],
  assignees: [],
  states: [
    { id: 'backlog', label: 'Backlog', stageId: 'backlog' },
    { id: 'qualified', label: 'Qualified', stageId: 'qualified' },
    { id: 'ready', label: 'Ready', stageId: 'ready' },
  ],
  projectFields: [
    {
      id: 'field-status',
      name: 'Status',
      type: 'single-select',
      role: 'workflow-state',
      options: [
        { id: 'status-backlog', label: 'Backlog', stageId: 'backlog' },
        { id: 'status-qualified', label: 'Qualified', stageId: 'qualified' },
        { id: 'status-ready', label: 'Ready', stageId: 'ready' },
      ],
    },
  ],
  analysisSkill: { id: 'analyze', name: 'analyze', version: '1', description: '' },
} as unknown as WorkItemEditorMetadataDto;

function created(overrides: Partial<IWorkItem> = {}): IWorkItem {
  return {
    id: 'work-new',
    externalId: '#200',
    title: 'Rotate the backup key',
    body: '',
    provider: 'simulated',
    repository: 'example/platform',
    labels: ['security'],
    assignees: [],
    stageId: 'backlog',
    boardColumnId: 'backlog',
    ...overrides,
  };
}

async function settle(): Promise<void> {
  for (let index = 0; index < 6; index += 1) await Promise.resolve();
}

function createFixture(
  options: {
    readonly createResult?: IWorkItem;
    readonly executionAvailable?: boolean;
    readonly sheet?: { readonly columnId?: string; readonly stageId?: string };
  } = {},
) {
  const loaded = signal<WorkItemEditorMetadataDto | undefined>(undefined);
  const error = signal<string | undefined>(undefined);
  const work = {
    executionAvailable: options.executionAvailable ?? true,
    workItemMetadata: loaded.asReadonly(),
    workItemsBusy: signal(false),
    issueDraftBusy: signal(false),
    workItemMutationError: error.asReadonly(),
    loadWorkItemMetadata: vi.fn(async () => {
      loaded.set(metadata);
      return true;
    }),
    createWorkItem: vi.fn(async () => {
      if (options.createResult) return options.createResult;
      error.set('GitHub refused the issue.');
      return undefined;
    }),
    moveWorkItem: vi.fn(async () => true),
    startAnalyzer: vi.fn(async () => true),
    draftIssue: vi.fn(),
    cancelIssueDraft: vi.fn(),
  };
  const close = vi.fn();
  const navigate = vi.fn(async () => true);
  const approval = { request: vi.fn(async () => '' as const) };
  TestBed.configureTestingModule({
    providers: [
      NewWorkItemSheetViewPresenter,
      { provide: WorkStore, useValue: work },
      {
        provide: WORK_TASK_CONTEXT,
        useValue: {
          snapshot: signal({ workItems: [], workflow: defaultWorkflow, boardColumns: [] }),
          settings: signal({
            agentTeams: [
              {
                id: 'team-1',
                workspaceId: 'personal',
                displayName: 'Team',
                assignments: [
                  { role: 'analysis', primaryAgentId: 'codex', fallbackAgentIds: [] },
                  { role: 'work-item-creation', primaryAgentId: 'claude', fallbackAgentIds: [] },
                ],
              },
            ],
            agentProfiles: [
              { id: 'codex', workspaceId: 'personal', displayName: 'Codex', enabled: true },
              { id: 'claude', workspaceId: 'personal', displayName: 'Claude Code', enabled: true },
            ],
            workItemSources: [],
            deliveryContexts: [],
            repositoryBindings: [],
          }),
          selectedWorkspaceIds: signal(['personal']),
          activeWorkspace: signal({ id: 'personal' }),
          creationBoard: signal(undefined),
        },
      },
      { provide: WORK_SKILLS_READ, useValue: null },
      { provide: Router, useValue: { navigate } },
      { provide: LocalExecutionApprovalService, useValue: approval },
      {
        provide: DesktopSpeechRecognitionService,
        useValue: { available: false, start: vi.fn(), stop: vi.fn(), cancel: vi.fn() },
      },
      { provide: DIALOG_REF, useValue: { close } },
      { provide: DIALOG_REF_DATA, useValue: options.sheet ?? {} },
    ],
  });
  const presenter = TestBed.inject(NewWorkItemSheetViewPresenter);
  return { presenter, work, close, navigate, approval };
}

describe('NewWorkItemSheetViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  beforeEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('starts in the initial column and blocks creation while the title is empty', async () => {
    // arrange
    const { presenter } = createFixture();

    // act
    presenter.initialize();
    await settle();

    // assert
    expect(presenter.isHydrating()).toBe(false);
    expect(presenter.selectedColumn()?.label).toBe('Backlog');
    expect(presenter.editor.projectFieldSelection()('field-status')).toBe('status-backlog');
    expect(presenter.analysisAgent()?.displayName).toBe('Codex');
    expect(presenter.canCreate()).toBe(false);
    expect(presenter.createCommand.canExecute()).toBe(false);
  });

  it('offers the analysis only for a column that runs it', async () => {
    // arrange
    const { presenter } = createFixture();
    presenter.initialize();
    await settle();

    // act
    const inBacklog = presenter.canAnalyzeAfterCreating();
    presenter.selectColumnCommand.execute('qualified');

    // assert
    expect(inBacklog).toBe(false);
    expect(presenter.selectedColumnStage()?.kind).toBe('automated');
    expect(presenter.canAnalyzeAfterCreating()).toBe(true);
    expect(presenter.analyzeAfterCreating()).toBe(true);
    expect(presenter.editor.projectFieldSelection()('field-status')).toBe('status-qualified');
  });

  it('keeps the input and reports the refusal inside the sheet when creation fails', async () => {
    // arrange
    const { presenter, close } = createFixture();
    presenter.initialize();
    await settle();
    presenter.editor.form.title().value.set('Rotate the backup key');

    // act
    presenter.createCommand.execute();
    await settle();

    // assert
    expect(close).not.toHaveBeenCalled();
    expect(presenter.createError()).toBe('GitHub refused the issue.');
    expect(presenter.editor.model().title).toBe('Rotate the backup key');
  });

  it('creates in the chosen column, closes and starts the analysis through the step command', async () => {
    // arrange
    const { presenter, work, close, approval } = createFixture({
      createResult: created({ stageId: 'qualified', boardColumnId: 'qualified' }),
    });
    presenter.initialize();
    await settle();
    presenter.editor.form.title().value.set('Rotate the backup key');
    presenter.selectColumnCommand.execute('qualified');
    presenter.editor.toggleLabelCommand.execute('security');

    // act
    presenter.createCommand.execute();
    await settle();

    // assert
    expect(work.createWorkItem).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Rotate the backup key',
        labels: ['security'],
        projectFields: [
          { fieldId: 'field-status', type: 'single-select', value: 'status-qualified' },
        ],
      }),
    );
    expect(close).toHaveBeenCalledOnce();
    expect(work.moveWorkItem).not.toHaveBeenCalled();
    expect(approval.request).toHaveBeenCalled();
    expect(work.startAnalyzer).toHaveBeenCalledWith(false, 'work-new', undefined, undefined);
  });

  it('moves the created item when the provider placed it elsewhere and skips an unasked analysis', async () => {
    // arrange
    const { presenter, work } = createFixture({ createResult: created() });
    presenter.initialize();
    await settle();
    presenter.editor.form.title().value.set('Prepare the release');
    presenter.selectColumnCommand.execute('ready');

    // act
    presenter.createCommand.execute();
    await settle();

    // assert
    expect(work.moveWorkItem).toHaveBeenCalledWith('work-new', 'ready', 'Ready');
    expect(work.startAnalyzer).not.toHaveBeenCalled();
  });

  it('starts in the column its caller asked for, by id or by stage', async () => {
    // arrange
    const byId = createFixture({ sheet: { columnId: 'ready' } });

    // act
    byId.presenter.initialize();
    await settle();

    // assert
    expect(byId.presenter.selectedColumn()?.label).toBe('Ready');
    expect(byId.presenter.editor.projectFieldSelection()('field-status')).toBe('status-ready');

    TestBed.resetTestingModule();
    const byStage = createFixture({
      sheet: { columnId: 'merged-qualified', stageId: 'qualified' },
    });
    byStage.presenter.initialize();
    await settle();
    expect(byStage.presenter.selectedColumn()?.label).toBe('Qualified');
  });
});

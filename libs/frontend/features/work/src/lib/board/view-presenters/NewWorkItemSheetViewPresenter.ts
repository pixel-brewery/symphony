// #region Imports

import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Cancel,
  DIALOG_REF,
  DIALOG_REF_DATA,
  type IDialogRef,
} from '@pixel-brewery/mosaik-elements-angular';
import type { IBoardColumn, IWorkItem } from '@symphony/domain-work';
import { findStage, stageExecutesRole } from '@symphony/domain-workflow';
import { Command, Hydratable, ViewPresenter } from '@symphony/frontend-core';
import { DesktopSpeechRecognitionService } from '@symphony/frontend-interaction';
import { WORK_SKILLS_READ } from '../../ports/WorkSkillsReadToken';
import { WORK_TASK_CONTEXT } from '../../ports/WorkTaskContextToken';
import { WorkStore } from '../../state/WorkStore';
import type { INewWorkItemSheetOptions } from '../services/INewWorkItemSheetOptions';
import { LocalExecutionApprovalService } from '../services/LocalExecutionApprovalService';
import { readEventText, readEventValue, WorkItemForm } from './workItemForm';
import type { WorkflowInputMode } from './WorkflowInputMode';

// #endregion

/**
 * Owns the `New work item` sheet: written by hand or drafted by the creation agent, created in
 * the chosen repository and column, and optionally handed to the analysis right away.
 *
 * Creation failures keep every entered value and are reported inside the sheet.
 *
 * @public
 */
@Injectable()
export class NewWorkItemSheetViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _context = inject(WORK_TASK_CONTEXT);
  private readonly _work = inject(WorkStore);
  private readonly _skills = inject(WORK_SKILLS_READ);
  private readonly _router = inject(Router);
  private readonly _localExecutionApproval = inject(LocalExecutionApprovalService);
  private readonly _speechRecognition = inject(DesktopSpeechRecognitionService);
  private readonly _dialogRef = inject(DIALOG_REF) as IDialogRef<
    INewWorkItemSheetOptions,
    IWorkItem
  >;
  private readonly _options: INewWorkItemSheetOptions =
    (inject(DIALOG_REF_DATA, { optional: true }) as INewWorkItemSheetOptions | null) ?? {};
  private readonly _selectedColumnId = signal<string | undefined>(undefined);
  private readonly _analyzeRequested = signal(true);
  private readonly _attempted = signal(false);
  private readonly _isCancellingDraft = signal(false);
  private readonly _isRecording = signal(false);

  /**
   * The form, shared with the work-item screen.
   *
   * @public
   * @readonly
   */
  public readonly editor = new WorkItemForm();

  /** Whether the item is written by hand or drafted by the creation agent. @public @readonly */
  public readonly inputMode = signal<WorkflowInputMode>('manual');

  /** Whether the AI draft is still being described or already under review. @public @readonly */
  public readonly creatorStage = signal<'prompt' | 'review'>('prompt');

  /** What the creation agent is asked to draft. @public @readonly */
  public readonly draftPrompt = signal('');

  /** Agent chosen to draft; empty lets the workspace team decide. @public @readonly */
  public readonly creationAgentId = signal('');

  /** Whether the skills catalog exists in this product. @public @readonly */
  public readonly skillsAvailable = this._skills !== null;

  /** Whether speech input is available. @public @readonly */
  public readonly voiceInputAvailable = this._speechRecognition.available;

  /** Whether a save is running. @public @readonly */
  public readonly isSaving = this._work.workItemsBusy;

  /** Whether the creation agent is drafting. @public @readonly */
  public readonly isDrafting = this._work.issueDraftBusy;

  /** Whether the draft is being cancelled. @public @readonly */
  public readonly isCancellingDraft = this._isCancellingDraft.asReadonly();

  /** Whether speech input records into the prompt. @public @readonly */
  public readonly isRecording = this._isRecording.asReadonly();

  /** Whether a creation skill is assigned. @public @readonly */
  public readonly hasIssueCreator = computed(() =>
    Boolean(this.editor.metadata()?.issueCreatorSkill),
  );

  /** Whether an AI draft is under review. @public @readonly */
  public readonly isAiDraft = computed(
    () => this.inputMode() === 'ai' && this.creatorStage() === 'review',
  );

  /** Whether the form is shown: always by hand, after drafting with AI. @public @readonly */
  public readonly showsForm = computed(
    () => this.inputMode() === 'manual' || this.creatorStage() === 'review',
  );

  /** Agents that hold the creation responsibility in the workspace. @public @readonly */
  public readonly creationAgents = computed(() => {
    const assignment = this.assignment('work-item-creation');
    const eligible = new Set(
      assignment ? [assignment.primaryAgentId, ...assignment.fallbackAgentIds] : [],
    );
    const workspaceId = this.editor.creationWorkspaceId();
    return (this._context.settings()?.agentProfiles ?? []).filter(
      (agent) => agent.workspaceId === workspaceId && agent.enabled && eligible.has(agent.id),
    );
  });

  /** Agent that drafts unless another is chosen. @public @readonly */
  public readonly creationAgent = computed(() => {
    const primaryId = this.assignment('work-item-creation')?.primaryAgentId;
    return (this._context.settings()?.agentProfiles ?? []).find((agent) => agent.id === primaryId);
  });

  /** Agent that runs the analysis in the workspace. @public @readonly */
  public readonly analysisAgent = computed(() => {
    const primaryId = this.assignment('analysis')?.primaryAgentId;
    return (this._context.settings()?.agentProfiles ?? []).find((agent) => agent.id === primaryId);
  });

  /** Repositories a new item can belong to. @public @readonly */
  public readonly repositories = computed(() => this.editor.metadata()?.repositories ?? []);

  /**
   * Columns of the creation board a new item can start in.
   *
   * @public
   * @readonly
   */
  public readonly columns = computed<readonly IBoardColumn[]>(() => {
    const states = this.editor.metadata()?.states ?? [];
    if (states.length) return states;
    const boardId = this._context.creationBoard()?.id;
    return (this._context.snapshot()?.boardColumns ?? []).filter(
      (column) => !boardId || !column.sourceId || column.sourceId === boardId,
    );
  });

  /** The chosen column. @public @readonly */
  public readonly selectedColumn = computed(() => {
    const columns = this.columns();
    const selectedId = this._selectedColumnId();
    const initialStageId = this._context.snapshot()?.workflow.initialStageId;
    return (
      columns.find((column) => column.id === selectedId) ??
      columns.find((column) => column.stageId === initialStageId) ??
      columns[0]
    );
  });

  /** Workflow stage of the chosen column. @public @readonly */
  public readonly selectedColumnStage = computed(() =>
    findStage(this._context.snapshot()?.workflow.stages ?? [], this.selectedColumn()?.stageId),
  );

  /** Whether execution commands exist in this product. @public @readonly */
  public readonly executionAvailable = this._work.executionAvailable;

  /** Whether an analysis skill is assigned. @public @readonly */
  public readonly hasAnalysisSkill = computed(() => Boolean(this.editor.metadata()?.analysisSkill));

  /** Whether the chosen column runs the analysis. @public @readonly */
  public readonly columnRunsAnalysis = computed(() =>
    stageExecutesRole(
      this._context.snapshot()?.workflow.stages ?? [],
      this.selectedColumn()?.stageId,
      'analyze',
    ),
  );

  /** Whether the analysis can start right after creating. @public @readonly */
  public readonly canAnalyzeAfterCreating = computed(
    () => this.executionAvailable && this.hasAnalysisSkill() && this.columnRunsAnalysis(),
  );

  /** Whether the analysis starts right after creating. @public @readonly */
  public readonly analyzeAfterCreating = computed(
    () => this._analyzeRequested() && this.canAnalyzeAfterCreating(),
  );

  /** Labels the provider offers. @public @readonly */
  public readonly availableLabels = computed(() => this.editor.metadata()?.labels ?? []);

  /** Whether `Create work item` can run. @public @readonly */
  public readonly canCreate = computed(
    () =>
      !this.isSaving() &&
      !this.isHydrating() &&
      this.showsForm() &&
      this.editor.hasRequiredValues(),
  );

  /**
   * Why the newest creation was refused; shown in the sheet, which keeps the input.
   *
   * @public
   * @readonly
   */
  public readonly createError = computed(() =>
    this._attempted() ? this._work.workItemMutationError() : undefined,
  );

  private readonly _selectInputModeCommand = new Command<WorkflowInputMode>((mode) =>
    this.inputMode.set(mode),
  );
  private readonly _updateDraftPromptCommand = new Command<unknown>((event) => {
    const value = readEventText(event);
    if (value !== undefined) this.draftPrompt.set(value);
  });
  private readonly _updateCreationAgentCommand = new Command<unknown>((event) => {
    const value = String(readEventValue(event) ?? '');
    if (this.creationAgents().some((agent) => agent.id === value)) this.creationAgentId.set(value);
  });
  private readonly _draftCommand = new Command<unknown>((event) => void this.onExecuteDraft(event));
  private readonly _cancelDraftCommand = new Command<void>(() => void this.onExecuteCancelDraft());
  private readonly _startOverCommand = new Command<void>(() => this.creatorStage.set('prompt'));
  private readonly _openSkillsCommand = new Command<void>(
    () => {
      this._dialogRef.close(Cancel.negative());
      void this._router.navigate(['/main/settings'], { queryParams: { section: 'skills' } });
    },
    computed(() => this.skillsAvailable),
  );
  private readonly _selectRepositoryCommand = new Command<string>(
    (repository) => void this.editor.selectRepository(repository),
  );
  private readonly _selectColumnCommand = new Command<string>((columnId) =>
    this.selectColumn(columnId),
  );
  private readonly _toggleAnalyzeAfterCreatingCommand = new Command<void>(
    () => this._analyzeRequested.update((requested) => !requested),
    this.canAnalyzeAfterCreating,
  );
  private readonly _createCommand = new Command<void>(
    () => void this.onExecuteCreate(),
    this.canCreate,
  );
  private readonly _cancelCommand = new Command<void>(() =>
    this._dialogRef.close(Cancel.negative()),
  );
  private readonly _startVoiceInputCommand = new Command<void>(() => this.onExecuteStartVoice());
  private readonly _stopVoiceInputCommand = new Command<void>(
    () => void this._speechRecognition.stop(),
  );
  private readonly _cancelVoiceInputCommand = new Command<void>(() => {
    this._isRecording.set(false);
    void this._speechRecognition.cancel();
  });

  // #endregion

  // #region Ctor

  /** @public */
  public constructor() {
    super();
    inject(DestroyRef).onDestroy(() => void this._speechRecognition.cancel());
  }

  // #endregion

  // #region Properties

  /** Chooses `Write it myself` or `Draft with AI`. @public @readonly */
  public get selectInputModeCommand(): Command<WorkflowInputMode> {
    return this._selectInputModeCommand;
  }

  /** Writes the draft prompt. @public @readonly */
  public get updateDraftPromptCommand(): Command<unknown> {
    return this._updateDraftPromptCommand;
  }

  /** Chooses the drafting agent. @public @readonly */
  public get updateCreationAgentCommand(): Command<unknown> {
    return this._updateCreationAgentCommand;
  }

  /** Asks the creation agent for a draft. @public @readonly */
  public get draftCommand(): Command<unknown> {
    return this._draftCommand;
  }

  /** Cancels the running draft. @public @readonly */
  public get cancelDraftCommand(): Command<void> {
    return this._cancelDraftCommand;
  }

  /** Returns from the draft review to the prompt. @public @readonly */
  public get startOverCommand(): Command<void> {
    return this._startOverCommand;
  }

  /** Opens Settings at Skills to assign a creation skill. @public @readonly */
  public get openSkillsCommand(): Command<void> {
    return this._openSkillsCommand;
  }

  /** Chooses the repository. @public @readonly */
  public get selectRepositoryCommand(): Command<string> {
    return this._selectRepositoryCommand;
  }

  /** Chooses the column the item starts in. @public @readonly */
  public get selectColumnCommand(): Command<string> {
    return this._selectColumnCommand;
  }

  /** Switches the analysis after creating on or off. @public @readonly */
  public get toggleAnalyzeAfterCreatingCommand(): Command<void> {
    return this._toggleAnalyzeAfterCreatingCommand;
  }

  /** Creates the work item. @public @readonly */
  public get createCommand(): Command<void> {
    return this._createCommand;
  }

  /** Closes the sheet without creating. @public @readonly */
  public get cancelCommand(): Command<void> {
    return this._cancelCommand;
  }

  /** Starts speech input into the draft prompt. @public @readonly */
  public get startVoiceInputCommand(): Command<void> {
    return this._startVoiceInputCommand;
  }

  /** Stops speech input. @public @readonly */
  public get stopVoiceInputCommand(): Command<void> {
    return this._stopVoiceInputCommand;
  }

  /** Cancels speech input. @public @readonly */
  public get cancelVoiceInputCommand(): Command<void> {
    return this._cancelVoiceInputCommand;
  }

  // #endregion

  // #region Methods

  /**
   * Loads the provider metadata of the creation board and starts in the column the caller asked
   * for - by its id, else by its stage - or in the board's initial column.
   *
   * @public
   */
  public override async onHydrate(): Promise<void> {
    await this.editor.loadMetadata();
    const { columnId, stageId } = this._options;
    const requested =
      this.columns().find((column) => columnId !== undefined && column.id === columnId) ??
      this.columns().find((column) => stageId !== undefined && column.stageId === stageId);
    this.selectColumn((requested ?? this.selectedColumn())?.id);
  }

  private assignment(role: string) {
    const settings = this._context.settings();
    const workspaceId = this.editor.creationWorkspaceId();
    const team = (settings?.agentTeams ?? []).find(
      (candidate) => candidate.workspaceId === workspaceId,
    );
    return team?.assignments.find((candidate) => candidate.role === role);
  }

  private selectColumn(columnId: string | undefined): void {
    const column = this.columns().find((candidate) => candidate.id === columnId);
    if (!column) return;
    this._selectedColumnId.set(column.id);
    this.editor.selectWorkflowStage(column.stageId);
  }

  private async onExecuteDraft(event: unknown): Promise<void> {
    if (this.isDrafting()) return;
    const prompt = readEventText(event)?.trim() || this.draftPrompt().trim();
    const current = this.editor.model();
    if (!prompt || !current.repository) return;
    this.draftPrompt.set(prompt);
    const workspaceId = this.editor.creationWorkspaceId();
    const sourceId = this._context.creationBoard()?.id;
    const draft = await this._work.draftIssue({
      ...(workspaceId ? { workspaceId } : {}),
      ...(sourceId ? { sourceId } : {}),
      repository: current.repository,
      prompt,
      ...(this.creationAgentId() ? { agentProfileId: this.creationAgentId() } : {}),
      ...(current.title.trim() ? { title: current.title } : {}),
      ...(current.body.trim() ? { body: current.body } : {}),
      projectFields: current.projectFields,
    });
    if (!draft) {
      // The prompt box empties itself on submit; the text a person wrote goes back into it.
      this.draftPrompt.set('');
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      this.draftPrompt.set(prompt);
      return;
    }
    this.editor.applyDraft(draft);
    // The draft classifies the workflow state as well; the chosen column stays authoritative.
    this.selectColumn(this.selectedColumn()?.id);
    this.creatorStage.set('review');
  }

  private async onExecuteCancelDraft(): Promise<void> {
    if (!this.isDrafting() || this._isCancellingDraft()) return;
    this._isCancellingDraft.set(true);
    try {
      await this._work.cancelIssueDraft();
    } finally {
      this._isCancellingDraft.set(false);
    }
  }

  /**
   * Creates the item, places it in the chosen column when the provider did not already, and
   * starts the analysis through the same command the screen uses when it was asked for.
   */
  private async onExecuteCreate(): Promise<void> {
    if (!this.canCreate()) return;
    this._attempted.set(true);
    const column = this.selectedColumn();
    const analyze = this.analyzeAfterCreating();
    const created = await this._work.createWorkItem(this.editor.toMutation());
    if (!created) return;
    this._dialogRef.close(Cancel.positive(created));
    if (column && created.boardColumnId !== column.id && created.stageId !== column.stageId) {
      const moved = await this._work.moveWorkItem(created.id, column.id, column.label);
      if (!moved) return;
    }
    if (!analyze) return;
    const item = this._context
      .snapshot()
      ?.workItems.find((candidate) => candidate.id === created.id);
    const approval = await this._localExecutionApproval.request(item ?? created);
    if (approval === false) return;
    await this._work.startAnalyzer(false, created.id, undefined, approval || undefined);
  }

  private onExecuteStartVoice(): void {
    if (this._isRecording()) return;
    this._isRecording.set(true);
    void this._speechRecognition.start(
      (transcript) =>
        this.draftPrompt.update((current) =>
          [current.trim(), transcript].filter(Boolean).join(' '),
        ),
      () => this._isRecording.set(false),
    );
  }

  // #endregion
}

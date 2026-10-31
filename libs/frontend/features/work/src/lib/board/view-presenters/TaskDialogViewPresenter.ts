// #region Imports

import {
  activeWorkItemCoordination,
  type IWorkItemComment,
  type IWorkItemFieldRepair,
  type IWorkItemHealth,
  type ProjectFieldDefinition,
  type ProjectFieldValue,
} from '@symphony/domain-work';
import { findStage, stageExecutesRole } from '@symphony/domain-workflow';
import { inspectWorkItem, isCompletedAnalysis } from '@symphony/domain-execution';
import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal,
  type WritableSignal,
} from '@angular/core';
import {
  Command,
  Hydratable,
  resolveImplementationBranchUrl,
  ViewPresenter,
} from '@symphony/frontend-core';
import { NotificationService } from '@symphony/frontend-notification';
import { LocalExecutionApprovalService } from '../services/LocalExecutionApprovalService';
import { Router } from '@angular/router';
import {
  DRAWER_REF,
  DRAWER_REF_DATA,
  type IDrawerRef,
} from '@pixel-brewery/mosaik-elements-angular';
import { type FieldTree, form, required } from '@angular/forms/signals';
import type { TaskDialogData } from './TaskDialogData';
import type { WorkflowInputMode } from './WorkflowInputMode';
import { WorkStore } from '../../state/WorkStore';
import { DesktopSpeechRecognitionService } from '@symphony/frontend-interaction';
import { WORK_TASK_CONTEXT } from '../../ports/WorkTaskContextToken';
import { WORK_EXECUTION_READ } from '../../ports/WorkExecutionReadToken';
import { WORK_PUBLICATION_READ } from '../../ports/WorkPublicationReadToken';
import { WORK_SKILLS_READ } from '../../ports/WorkSkillsReadToken';

// #endregion

interface IIssueFormModel {
  title: string;
  body: string;
  repository: string;
  workItemType: string;
  projectFields: ProjectFieldValue[];
  labels: string[];
  assignees: string[];
}

type AiPromptTarget = 'work-item-creation' | 'analysis' | 'solution';

@Injectable()
export class TaskDialogViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _context = inject(WORK_TASK_CONTEXT);
  private readonly _work = inject(WorkStore);
  private readonly _executionRead = inject(WORK_EXECUTION_READ);
  private readonly _publication = inject(WORK_PUBLICATION_READ);
  private readonly _skills = inject(WORK_SKILLS_READ);
  /** Availability of the actual cross-feature command participants. @public @readonly */
  public readonly executionAvailable = this._work.executionAvailable;
  /** Availability of the actual workflow command participant. @public @readonly */
  public readonly workflowAvailable = this._work.workflowAvailable;
  /** Availability of the actual Delivery publication participant. @public @readonly */
  public readonly publicationAvailable = this._work.publicationAvailable;
  /** Availability of the actual Skills participant. @public @readonly */
  public readonly skillsAvailable = this._skills !== null;
  private readonly _notificationService = inject(NotificationService);
  private readonly _localExecutionApproval = inject(LocalExecutionApprovalService);
  private readonly _router = inject(Router);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _speechRecognition = inject(DesktopSpeechRecognitionService);
  private readonly _drawerRef = inject(DRAWER_REF) as IDrawerRef<TaskDialogData>;
  private readonly _data = inject(DRAWER_REF_DATA) as TaskDialogData;
  private _loadedMetadataRepository?: string;
  private _loadingMetadataRepository?: string;

  private readonly _model = signal<IIssueFormModel>({
    title: '',
    body: '',
    repository: '',
    workItemType: '',
    projectFields: [],
    labels: [],
    assignees: [],
  });

  /**
   * The form.
   *
   * @public
   * @readonly
   */
  public readonly form: FieldTree<IIssueFormModel> = form(this._model, (schema) => {
    required(schema.title, { message: 'Enter a work-item title.' });
    required(schema.repository, { message: 'Choose a repository.' });
  });

  /**
   * The mode.
   *
   * @public
   * @readonly
   */
  public readonly mode = signal(this._data.mode);
  private readonly _contentEditing = signal(this._data.mode === 'create');
  private readonly _contentEditSession = signal(this._data.mode === 'create');

  /**
   * Whether title and description are shown as inputs. A new item has nothing to read yet, so
   * creation starts editing; an existing item opens readable and switches on request.
   *
   * @public
   * @readonly
   */
  public readonly isEditingContent = this._contentEditing.asReadonly();

  /**
   * Whether an existing item has entered its edit session. Previewing Markdown keeps the
   * session active so the footer continues to offer Save and Cancel until the edit is resolved.
   *
   * @public
   * @readonly
   */
  public readonly isEditingSession = this._contentEditSession.asReadonly();

  /**
   * The create input mode.
   *
   * @public
   * @readonly
   */
  public readonly createInputMode = signal<WorkflowInputMode>('manual');

  /**
   * The analysis input mode.
   *
   * @public
   * @readonly
   */
  public readonly analysisInputMode = signal<WorkflowInputMode>('manual');

  /**
   * The solution input mode.
   *
   * @public
   * @readonly
   */
  public readonly solutionInputMode = signal<WorkflowInputMode>('manual');

  /**
   * The creator stage.
   *
   * @public
   * @readonly
   */
  public readonly creatorStage = signal<'prompt' | 'review'>('prompt');

  /**
   * Whether it is starting.
   *
   * @public
   * @readonly
   */
  public readonly isStarting = signal(false);

  /**
   * Whether it is solving.
   *
   * @public
   * @readonly
   */
  public readonly isSolving = signal(false);

  /**
   * Whether it is cancelling execution.
   *
   * @public
   * @readonly
   */
  public readonly isCancellingExecution = signal(false);

  /**
   * Whether it is removing queue entry.
   *
   * @public
   * @readonly
   */
  public readonly isRemovingQueueEntry = signal(false);

  /**
   * Whether it is cancelling draft.
   *
   * @public
   * @readonly
   */
  public readonly isCancellingDraft = signal(false);

  /**
   * The draft prompt.
   *
   * @public
   * @readonly
   */
  public readonly draftPrompt = signal('');

  /**
   * The analysis prompt.
   *
   * @public
   * @readonly
   */
  public readonly analysisPrompt = signal('');

  /**
   * The solution prompt.
   *
   * @public
   * @readonly
   */
  public readonly solutionPrompt = signal('');

  /**
   * The comment draft.
   *
   * @public
   * @readonly
   */
  public readonly commentDraft = signal('');

  /**
   * The manual analysis.
   *
   * @public
   * @readonly
   */
  public readonly manualAnalysis = signal('');

  /**
   * The manual solution.
   *
   * @public
   * @readonly
   */
  public readonly manualSolution = signal('');

  /**
   * The delegated team ID.
   *
   * @public
   * @readonly
   */
  public readonly delegatedTeamId = signal('');

  /**
   * The responsible agent ID.
   *
   * @public
   * @readonly
   */
  public readonly responsibleAgentId = signal('');

  /**
   * The goal objective.
   *
   * @public
   * @readonly
   */
  public readonly goalObjective = signal('');

  /**
   * The delegation busy.
   *
   * @public
   * @readonly
   */
  public readonly delegationBusy = signal(false);
  private readonly _voiceTarget = signal<AiPromptTarget | undefined>(undefined);

  /**
   * The voice input available.
   *
   * @public
   * @readonly
   */
  public readonly voiceInputAvailable = this._speechRecognition.available;

  /**
   * Whether it is saving.
   *
   * @public
   * @readonly
   */
  public readonly isSaving = this._work.workItemsBusy;

  /**
   * Whether it is commenting.
   *
   * @public
   * @readonly
   */
  public readonly isCommenting = this._work.workItemCommentBusy;

  /**
   * Whether it is drafting.
   *
   * @public
   * @readonly
   */
  public readonly isDrafting = this._work.issueDraftBusy;

  /**
   * Whether it is publishing pull request.
   *
   * @public
   * @readonly
   */
  public readonly isPublishingPullRequest = computed(
    () => this._publication?.pullRequestBusy() ?? false,
  );

  /**
   * The metadata.
   *
   * @public
   * @readonly
   */
  public readonly metadata = this._work.workItemMetadata;

  /**
   * The project fields.
   *
   * @public
   * @readonly
   */
  public readonly projectFields = computed(() => this.metadata()?.projectFields ?? []);

  /**
   * The work item ID.
   *
   * @public
   * @readonly
   */
  public readonly workItemId = computed(() =>
    this._data.mode === 'edit' ? this._data.workItemId : undefined,
  );

  /**
   * The work item.
   *
   * @public
   * @readonly
   */
  public readonly workItem = computed(() => {
    const id = this.workItemId();
    return id ? this._context.snapshot()?.workItems.find((item) => item.id === id) : undefined;
  });

  /**
   * The goal.
   *
   * @public
   * @readonly
   */
  public readonly goal = computed(() => {
    const id = this.workItemId();
    return id ? this._context.snapshot()?.goals?.find((goal) => goal.workItemId === id) : undefined;
  });

  /**
   * The workspace teams.
   *
   * @public
   * @readonly
   */
  public readonly workspaceTeams = computed(() => {
    const workspaceId = this.workItem()?.workspaceId;
    return (this._context.settings()?.agentTeams ?? []).filter(
      (team) => team.workspaceId === workspaceId,
    );
  });

  /**
   * Agent that formulates a new work item, taken from the workspace team assignment for the
   * creation responsibility. Creation runs before a work item exists, so it cannot use the
   * delegation team selected on an existing card.
   *
   * @public
   * @readonly
   */
  public readonly creationAgent = computed(() => {
    const settings = this._context.settings();
    const workspaceId = this._context.selectedWorkspaceIds()[0];
    const team = (settings?.agentTeams ?? []).find(
      (candidate) => candidate.workspaceId === workspaceId,
    );
    const assignment = team?.assignments.find(
      (candidate) => candidate.role === 'work-item-creation',
    );
    return (settings?.agentProfiles ?? []).find((agent) => agent.id === assignment?.primaryAgentId);
  });

  /**
   * Every agent that holds the creation responsibility in the active workspace.
   *
   * @public
   * @readonly
   */
  public readonly creationAgents = computed(() => {
    const settings = this._context.settings();
    const workspaceId = this._context.selectedWorkspaceIds()[0];
    const team = (settings?.agentTeams ?? []).find(
      (candidate) => candidate.workspaceId === workspaceId,
    );
    const assignment = team?.assignments.find(
      (candidate) => candidate.role === 'work-item-creation',
    );
    const eligible = new Set(
      assignment ? [assignment.primaryAgentId, ...assignment.fallbackAgentIds] : [],
    );
    return (settings?.agentProfiles ?? []).filter(
      (agent) => agent.workspaceId === workspaceId && agent.enabled && eligible.has(agent.id),
    );
  });

  /**
   * The creation agent ID.
   *
   * @public
   * @readonly
   */
  public readonly creationAgentId = signal('');

  /**
   * The workspace agents.
   *
   * @public
   * @readonly
   */
  public readonly workspaceAgents = computed(() => {
    const workspaceId = this.workItem()?.workspaceId;
    const team = this.workspaceTeams().find((candidate) => candidate.id === this.delegatedTeamId());
    const teamAgentIds = team
      ? new Set(
          team.assignments.flatMap((assignment) => [
            assignment.primaryAgentId,
            ...assignment.fallbackAgentIds,
          ]),
        )
      : undefined;
    return (this._context.settings()?.agentProfiles ?? []).filter(
      (agent) =>
        agent.workspaceId === workspaceId &&
        agent.enabled &&
        (!teamAgentIds || teamAgentIds.has(agent.id)),
    );
  });

  /**
   * The responsible agent.
   *
   * @public
   * @readonly
   */
  public readonly responsibleAgent = computed(() =>
    this._context
      .settings()
      ?.agentProfiles.find((agent) => agent.id === this.goal()?.assignment.responsibleAgentId),
  );

  /**
   * The executing agent.
   *
   * @public
   * @readonly
   */
  public readonly executingAgent = computed(() =>
    this._context
      .settings()
      ?.agentProfiles.find((agent) => agent.id === this.goal()?.executingAgentId),
  );

  /**
   * The goal team.
   *
   * @public
   * @readonly
   */
  public readonly goalTeam = computed(() =>
    this.workspaceTeams().find((team) => team.id === this.goal()?.assignment.agentTeamId),
  );

  /**
   * Whether it is git hub work item.
   *
   * @public
   * @readonly
   */
  public readonly isGitHubWorkItem = computed(
    () => this.mode() === 'edit' && this.workItem()?.provider === 'github-projects',
  );

  /**
   * Label for opening the item in the provider that owns it.
   *
   * @public
   * @readonly
   */
  public readonly workItemOpenLabel = computed(() => {
    switch (this.workItem()?.provider) {
      case 'azure-devops':
        return 'Open in Azure DevOps';
      case 'github-projects':
        return 'Open in GitHub';
      default:
        return 'Open work item';
    }
  });

  /**
   * Provider icon for the external item action.
   *
   * @public
   * @readonly
   */
  public readonly workItemOpenIcon = computed(() => {
    switch (this.workItem()?.provider) {
      case 'azure-devops':
        return 'azureDevOps';
      case 'github-projects':
        return 'github';
      default:
        return 'open';
    }
  });

  /**
   * The work item URL.
   *
   * @public
   * @readonly
   */
  public readonly workItemUrl = computed(() => this.workItem()?.externalUrl);

  /**
   * Discussion as it arrived with the complete item. A board refresh or a save hands the store
   * a summary again, which carries no thread, and the drawer must not blank the comments then.
   */
  private readonly _loadedComments = signal<readonly IWorkItemComment[]>([]);

  /**
   * Provider discussion thread, oldest first; empty until the complete item has arrived.
   *
   * @public
   * @readonly
   */
  public readonly comments = computed(() => this.workItem()?.comments ?? this._loadedComments());
  private readonly _updateCommentDraftCommand: Command<unknown> = new Command<unknown>((event) => {
    const value = this.valueFromEvent(event);
    if (value !== undefined) this.commentDraft.set(value);
  });
  private readonly _publishCommentCommand: Command<unknown> = new Command<unknown>(
    (event) => void this.onExecutePublishCommentCommand(event),
    computed(() => this.mode() === 'edit' && !this.isCommenting()),
  );
  private readonly _cancelContentEditingCommand: Command<unknown> = new Command<unknown>(() =>
    this.cancelContentEditing(),
  );
  private readonly _closeCommand: Command<unknown> = new Command<unknown>(() =>
    this.onExecuteCloseCommand(),
  );

  /**
   * Whether it can save.
   *
   * @public
   * @readonly
   */
  public readonly canSave = computed(
    () =>
      !this.isSaving() &&
      (this.mode() === 'edit' ||
        this.createInputMode() === 'manual' ||
        this.creatorStage() === 'review') &&
      this._model().title.trim().length > 0 &&
      this._model().repository.trim().length > 0,
  );

  /**
   * Whether it has issue creator.
   *
   * @public
   * @readonly
   */
  public readonly hasIssueCreator = computed(() => Boolean(this.metadata()?.issueCreatorSkill));

  /**
   * Whether it is AI draft.
   *
   * @public
   * @readonly
   */
  public readonly isAiDraft = computed(
    () =>
      this.mode() === 'create' &&
      this.createInputMode() === 'ai' &&
      this.creatorStage() === 'review',
  );

  /**
   * The analysis skill.
   *
   * @public
   * @readonly
   */
  public readonly analysisSkill = computed(() => this.metadata()?.analysisSkill);

  /**
   * The solution skill.
   *
   * @public
   * @readonly
   */
  public readonly solutionSkill = computed(() => this.metadata()?.solutionSkill);

  /**
   * Whether it has analysis skill.
   *
   * @public
   * @readonly
   */
  public readonly hasAnalysisSkill = computed(() => Boolean(this.analysisSkill()));

  /**
   * Whether it has solution skill.
   *
   * @public
   * @readonly
   */
  public readonly hasSolutionSkill = computed(() => Boolean(this.solutionSkill()));

  /**
   * The execution.
   *
   * @public
   * @readonly
   */
  public readonly execution = computed(() => {
    const id = this.workItemId();
    if (!id) return undefined;
    return [...(this._context.snapshot()?.executions ?? [])]
      .filter((execution) => execution.workItemId === id)
      .sort((left, right) => left.startedAt.localeCompare(right.startedAt))
      .at(-1);
  });

  /**
   * The analysis execution.
   *
   * @public
   * @readonly
   */
  public readonly analysisExecution = computed(() => {
    const id = this.workItemId();
    if (!id) return undefined;
    return [...(this._context.snapshot()?.executions ?? [])]
      .filter(
        (execution) =>
          execution.workItemId === id &&
          (execution.kind === undefined || execution.kind === 'analysis'),
      )
      .sort((left, right) => left.startedAt.localeCompare(right.startedAt))
      .at(-1);
  });

  /**
   * The solution execution.
   *
   * @public
   * @readonly
   */
  public readonly solutionExecution = computed(() => {
    const id = this.workItemId();
    if (!id) return undefined;
    return [...(this._context.snapshot()?.executions ?? [])]
      .filter(
        (execution) =>
          execution.workItemId === id &&
          (execution.kind === 'solution' || execution.kind === 'revision'),
      )
      .sort((left, right) => left.startedAt.localeCompare(right.startedAt))
      .at(-1);
  });

  /**
   * The implementation branch.
   *
   * @public
   * @readonly
   */
  public readonly implementationBranch = computed(
    () => this.solutionExecution()?.workspaceReference,
  );

  /**
   * The pull request.
   *
   * @public
   * @readonly
   */
  public readonly pullRequest = computed(() => this.solutionExecution()?.pullRequest);

  /**
   * The latest deterministic verification report for the checks section.
   *
   * @public
   * @readonly
   */
  public readonly latestVerificationReport = computed(() =>
    this.goal()?.verificationReports.at(-1),
  );

  /**
   * Number of provider comments, execution events, and the ticket-opened entry shown in the
   * activity section.
   *
   * @public
   * @readonly
   */
  public readonly activityCount = computed(
    () => this.comments().length + this.events().length + (this.workItem()?.createdAt ? 1 : 0),
  );

  /**
   * The branch URL.
   *
   * @public
   * @readonly
   */
  public readonly branchUrl = computed(() =>
    resolveImplementationBranchUrl(this.solutionExecution()),
  );

  /**
   * Whether it can publish pull request.
   *
   * @public
   * @readonly
   */
  public readonly canPublishPullRequest = computed(() => {
    if (!this._work.publicationAvailable) return false;
    const execution = this.solutionExecution();
    return Boolean(
      execution &&
      execution.state === 'succeeded' &&
      execution.workspacePath &&
      execution.workspaceReference &&
      !execution.pullRequest &&
      !this.isPublishingPullRequest(),
    );
  });

  /**
   * The events.
   *
   * @public
   * @readonly
   */
  public readonly events = computed(() => {
    const executionId = this.execution()?.id;
    if (!executionId) return [];
    return [...(this._context.snapshot()?.events ?? [])]
      .filter(
        (event) =>
          event.executionId === executionId &&
          event.kind !== 'agent.progress' &&
          event.kind !== 'solver.progress',
      )
      .sort((left, right) => left.sequence - right.sequence);
  });

  /**
   * The step this item is waiting to start once an execution slot frees up.
   *
   * @public
   * @readonly
   */
  public readonly queueEntry = computed(() => {
    const id = this.workItemId();
    if (!id) return undefined;
    return (this._executionRead?.executionQueue() ?? []).find((entry) => entry.workItemId === id);
  });

  /**
   * Whether it is running.
   *
   * @public
   * @readonly
   */
  public readonly isRunning = computed(
    () =>
      this.isStarting() ||
      this.isSolving() ||
      Boolean(this.queueEntry()) ||
      this.execution()?.state === 'queued' ||
      this.execution()?.state === 'running' ||
      this.execution()?.state === 'waiting',
  );

  /**
   * The active execution.
   *
   * @public
   * @readonly
   */
  public readonly activeExecution = computed(() => {
    const execution = this.execution();
    return execution?.state === 'queued' ||
      execution?.state === 'running' ||
      execution?.state === 'waiting'
      ? execution
      : undefined;
  });

  /**
   * Ownership held by another orchestrator; an expired lease no longer blocks the item.
   *
   * @public
   * @readonly
   */
  public readonly externalCoordination = computed(() => {
    const coordination = activeWorkItemCoordination(this.workItem()?.coordination, new Date());
    if (!coordination) return undefined;
    const isOwnedLocally = (this._context.snapshot()?.executions ?? []).some(
      (execution) => execution.workItemClaim?.id === coordination.claimId,
    );
    if (isOwnedLocally) return undefined;
    return coordination;
  });

  /**
   * Decisions the current stage offers. A human gate lists them; every other stage has none,
   * which is what makes the gate the only way forward.
   */
  /**
   * Workflow stage the opened item rests in; missing while its board column is unmapped.
   *
   * @public
   * @readonly
   */
  public readonly stage = computed(() =>
    findStage(this._context.snapshot()?.workflow.stages ?? [], this.workItem()?.stageId),
  );

  /**
   * The gate decisions.
   *
   * @public
   * @readonly
   */
  public readonly gateDecisions = computed(() => {
    const stage = this.stage();
    return stage?.kind === 'human-gate' ? (stage.decisions ?? []) : [];
  });

  /**
   * Steps the drawer may offer. The orchestrator refuses a role the current stage does not
   * execute, so a step shown outside its stage could only ever produce an error - and while
   * it is shown it reads as the step the item is waiting for, which is how an item ends up
   * resting in a stage it was never analysed for.
   *
   * @public
   * @readonly
   */
  public readonly runsAnalysisStep = computed(() => this.stageRunsRole('analyze'));

  /**
   * The runs solution step.
   *
   * @public
   * @readonly
   */
  public readonly runsSolutionStep = computed(() => this.stageRunsRole('solve'));

  /**
   * Why no step is offered at all, so the controls are never an empty box.
   *
   * @public
   * @readonly
   */
  public readonly noStepReason = computed(() => {
    if (this.runsAnalysisStep()) return undefined;
    const stage = this.stage();
    const label = stage?.label ?? 'This stage';
    if (stage?.kind === 'human-gate') {
      return `${label} waits for a decision, not for a run. Choose one above to release the item for technical work.`;
    }
    if (!this.runsSolutionStep()) {
      return `${label} runs neither the analysis nor the implementation. Move the item to a stage that does — the findings at the top of this drawer name which one.`;
    }
    return this.hasSuccessfulAnalysis()
      ? undefined
      : `${label} implements, and an implementation always starts from a completed analysis. This item has none, so no step can be started here.`;
  });

  /**
   * Everything wrong with the opened item, in full. The board shows the same findings from
   * the same function, so the card and the drawer can never contradict each other; only the
   * amount of text differs.
   *
   * @public
   * @readonly
   */
  public readonly health = computed<IWorkItemHealth | undefined>(() => {
    const item = this.workItem();
    const snapshot = this._context.snapshot();
    // Field definitions arrive with the editor metadata, which is loaded per item and already
    // scoped to its board. Without them, absent fields cannot be told apart from foreign ones.
    // Metadata is store-wide, so while this drawer hydrates it may still describe the item
    // opened before this one; reporting against that would name fields of the wrong board.
    if (!item || !snapshot || !this.metadata() || this.isHydrating()) return undefined;
    const column = snapshot.boardColumns?.find(
      (candidate) => candidate.id === item.boardColumnId,
    )?.label;
    const readiness = snapshot.workItemReadiness?.find(
      (candidate) => candidate.workItemId === item.id,
    );
    const health = inspectWorkItem(item, {
      stages: snapshot.workflow.stages,
      fields: this.projectFields(),
      executions: snapshot.executions.filter((execution) => execution.workItemId === item.id),
      ...(readiness ? { readiness } : {}),
      ...(column ? { boardColumnLabel: column } : {}),
    });
    return health.severity ? health : undefined;
  });

  /**
   * The repairs.
   *
   * @public
   * @readonly
   */
  public readonly repairs = computed<readonly IWorkItemFieldRepair[]>(
    () => this.health()?.repairs ?? [],
  );

  /**
   * Whether it is repairing.
   *
   * @public
   * @readonly
   */
  public readonly isRepairing = signal(false);

  /**
   * Whether it can start.
   *
   * @public
   * @readonly
   */
  public readonly canStart = computed(() => {
    if (!this._work.executionAvailable) return false;
    return (
      !this.isRunning() &&
      !this.externalCoordination() &&
      this.stageRunsRole('analyze') &&
      (this.analysisInputMode() === 'manual'
        ? this.manualAnalysis().trim().length > 0
        : this.hasAnalysisSkill())
    );
  });

  /**
   * Whether an analysis the implementation can consume exists. Matches the record the
   * orchestrator picks when the Solver starts - a later failed attempt does not invalidate an
   * earlier result, and a succeeded run without a summary is not one it could start from.
   *
   * @public
   * @readonly
   */
  public readonly hasSuccessfulAnalysis = computed(() => {
    const id = this.workItemId();
    if (!id) return false;
    return (this._context.snapshot()?.executions ?? []).some(
      (execution) => execution.workItemId === id && isCompletedAnalysis(execution),
    );
  });

  /**
   * The requires feedback.
   *
   * @public
   * @readonly
   */
  public readonly requiresFeedback = computed(
    () => this.solutionExecution()?.state === 'succeeded',
  );

  /**
   * Whether it can solve.
   *
   * @public
   * @readonly
   */
  public readonly canSolve = computed(() => {
    if (!this._work.executionAvailable) return false;
    return (
      !this.isRunning() &&
      !this.externalCoordination() &&
      this.stageRunsRole('solve') &&
      this.hasSuccessfulAnalysis() &&
      (this.solutionInputMode() === 'manual'
        ? this.manualSolution().trim().length > 0
        : this.hasSolutionSkill() &&
          (!this.requiresFeedback() || this.solutionPrompt().trim().length > 0))
    );
  });

  /**
   * The analysis result skill.
   *
   * @public
   * @readonly
   */
  public readonly analysisResultSkill = computed(() =>
    this.executionSkill(this.analysisExecution()?.skillId),
  );

  /**
   * The solution result skill.
   *
   * @public
   * @readonly
   */
  public readonly solutionResultSkill = computed(() =>
    this.executionSkill(this.solutionExecution()?.skillId),
  );

  /**
   * The analysis result is AI.
   *
   * @public
   * @readonly
   */
  public readonly analysisResultIsAi = computed(() =>
    this.executionUsesAi(this.analysisExecution()),
  );

  /**
   * The solution result is AI.
   *
   * @public
   * @readonly
   */
  public readonly solutionResultIsAi = computed(() =>
    this.executionUsesAi(this.solutionExecution()),
  );
  private readonly _updateCreationAgentCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateCreationAgentCommand(event),
  );
  private readonly _decideCommand: Command<string> = new Command(
    (optionId) => void this.onExecuteDecideCommand(optionId),
  );
  private readonly _applyRepairsCommand: Command<void> = new Command(
    () => void this.onExecuteApplyRepairsCommand(),
  );
  private readonly _repositoryChangedCommand: Command<void> = new Command(
    () => void this.onExecuteRepositoryChangedCommand(),
  );
  private readonly _updateDraftPromptCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateDraftPromptCommand(event),
  );
  private readonly _updateAnalysisPromptCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateAnalysisPromptCommand(event),
  );
  private readonly _updateSolutionPromptCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateSolutionPromptCommand(event),
  );
  private readonly _updateManualAnalysisCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateManualAnalysisCommand(event),
  );
  private readonly _updateManualSolutionCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateManualSolutionCommand(event),
  );
  private readonly _updateDelegatedTeamCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateDelegatedTeamCommand(event),
  );
  private readonly _updateResponsibleAgentCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateResponsibleAgentCommand(event),
  );
  private readonly _delegateGoalCommand: Command<void> = new Command(
    () => void this.onExecuteDelegateGoalCommand(),
  );
  private readonly _reviewGoalCommand: Command<'approved' | 'revision-required' | 'blocked'> =
    new Command((decision) => void this.onExecuteReviewGoalCommand(decision));
  private readonly _selectCreateInputModeCommand: Command<WorkflowInputMode> = new Command(
    (mode) => void this.onExecuteSelectCreateInputModeCommand(mode),
  );
  private readonly _selectAnalysisInputModeCommand: Command<WorkflowInputMode> = new Command(
    (mode) => void this.onExecuteSelectAnalysisInputModeCommand(mode),
  );
  private readonly _selectSolutionInputModeCommand: Command<WorkflowInputMode> = new Command(
    (mode) => void this.onExecuteSelectSolutionInputModeCommand(mode),
  );
  private readonly _isLabelSelected = computed(
    () => (label: string) => this.resolveIsLabelSelected(label),
  );

  private readonly _toggleLabelCommand: Command<string> = new Command(
    (label) => void this.onExecuteToggleLabelCommand(label),
  );
  private readonly _isAssigneeSelected = computed(
    () => (login: string) => this.resolveIsAssigneeSelected(login),
  );

  private readonly _toggleAssigneeCommand: Command<string> = new Command(
    (login) => void this.onExecuteToggleAssigneeCommand(login),
  );
  private readonly _projectFieldText = computed(
    () => (fieldId: string) => this.resolveProjectFieldText(fieldId),
  );

  private readonly _projectFieldNumber = computed(
    () => (fieldId: string) => this.resolveProjectFieldNumber(fieldId),
  );

  private readonly _projectFieldDate = computed(
    () => (fieldId: string) => this.resolveProjectFieldDate(fieldId),
  );

  private readonly _projectFieldSelection = computed(
    () => (fieldId: string) => this.resolveProjectFieldSelection(fieldId),
  );

  private readonly _isProjectFieldOptionSelected = computed(
    () => (fieldId: string, optionId: string) =>
      this.resolveIsProjectFieldOptionSelected(fieldId, optionId),
  );

  private readonly _updateProjectFieldCommand: Command<
    readonly [field: ProjectFieldDefinition, event: unknown]
  > = new Command((parameters) => void this.onExecuteUpdateProjectFieldCommand(...parameters));
  private readonly _clearProjectFieldCommand: Command<ProjectFieldDefinition> = new Command(
    (field) => void this.onExecuteClearProjectFieldCommand(field),
  );
  private readonly _toggleProjectFieldOptionCommand: Command<
    readonly [fieldId: string, optionId: string]
  > = new Command(
    (parameters) => void this.onExecuteToggleProjectFieldOptionCommand(...parameters),
  );
  private readonly _draftWithIssueCreatorCommand: Command<unknown | undefined> = new Command(
    (event) => void this.onExecuteDraftWithIssueCreatorCommand(event),
  );
  private readonly _startOverCommand: Command<void> = new Command(
    () => void this.onExecuteStartOverCommand(),
  );
  private readonly _openSkillsCommand: Command<void> = new Command(
    () => void this.onExecuteOpenSkillsCommand(),
    computed(() => this.skillsAvailable),
  );
  private readonly _voiceState = computed(
    () => (target: AiPromptTarget) => this.resolveVoiceState(target),
  );

  private readonly _startVoiceInputCommand: Command<AiPromptTarget> = new Command(
    (target) => void this.onExecuteStartVoiceInputCommand(target),
  );
  private readonly _stopVoiceInputCommand: Command<void> = new Command(
    () => void this.onExecuteStopVoiceInputCommand(),
  );
  private readonly _cancelVoiceInputCommand: Command<void> = new Command(
    () => void this.onExecuteCancelVoiceInputCommand(),
  );
  private readonly _saveCommand: Command<{ readonly close?: boolean } | undefined> = new Command(
    (options) => void this.onExecuteSaveCommand(options),
  );
  private readonly _toggleContentEditingCommand: Command<void> = new Command(
    () => void this.onExecuteToggleContentEditingCommand(),
  );
  private readonly _startTaskCommand: Command<void> = new Command(
    () => void this.onExecuteStartTaskCommand(),
  );
  private readonly _startSolutionCommand: Command<void> = new Command(
    () => void this.onExecuteStartSolutionCommand(),
  );
  private readonly _removeQueueEntryCommand: Command<void> = new Command(
    () => void this.onExecuteRemoveQueueEntryCommand(),
  );
  private readonly _cancelActiveExecutionCommand: Command<void> = new Command(
    () => void this.onExecuteCancelActiveExecutionCommand(),
  );
  private readonly _cancelDraftCommand: Command<void> = new Command(
    () => void this.onExecuteCancelDraftCommand(),
  );
  private readonly _publishPullRequestCommand: Command<void> = new Command(
    () => void this.onExecutePublishPullRequestCommand(),
  );
  // #endregion

  // #region Ctor

  public constructor() {
    super();
    this._destroyRef.onDestroy(() => void this._speechRecognition.cancel());
  }

  // #endregion

  // #region Properties

  /**
   * Writes the composed comment into the provider discussion of the open work item.
   *
   * @public
   * @readonly
   */
  public get publishCommentCommand(): Command<unknown> {
    return this._publishCommentCommand;
  }

  /**
   * Writes text-box changes into the provider comment draft.
   *
   * @public
   * @readonly
   */
  public get updateCommentDraftCommand(): Command<unknown> {
    return this._updateCommentDraftCommand;
  }

  /**
   * Discards the active content edit session.
   *
   * @public
   * @readonly
   */
  public get cancelContentEditingCommand(): Command<unknown> {
    return this._cancelContentEditingCommand;
  }

  /**
   * Closes the owning drawer through the same command contract as the other header actions.
   *
   * @public
   * @readonly
   */
  public get closeCommand(): Command<unknown> {
    return this._closeCommand;
  }

  /**
   * The updateCreationAgent command.
   *
   * @public
   * @readonly
   */
  public get updateCreationAgentCommand(): Command<unknown> {
    return this._updateCreationAgentCommand;
  }
  /**
   * The decide command.
   *
   * @public
   * @readonly
   */
  public get decideCommand(): Command<string> {
    return this._decideCommand;
  }
  /**
   * The applyRepairs command.
   *
   * @public
   * @readonly
   */
  public get applyRepairsCommand(): Command<void> {
    return this._applyRepairsCommand;
  }
  /**
   * The repositoryChanged command.
   *
   * @public
   * @readonly
   */
  public get repositoryChangedCommand(): Command<void> {
    return this._repositoryChangedCommand;
  }
  /**
   * The updateDraftPrompt command.
   *
   * @public
   * @readonly
   */
  public get updateDraftPromptCommand(): Command<unknown> {
    return this._updateDraftPromptCommand;
  }
  /**
   * The updateAnalysisPrompt command.
   *
   * @public
   * @readonly
   */
  public get updateAnalysisPromptCommand(): Command<unknown> {
    return this._updateAnalysisPromptCommand;
  }
  /**
   * The updateSolutionPrompt command.
   *
   * @public
   * @readonly
   */
  public get updateSolutionPromptCommand(): Command<unknown> {
    return this._updateSolutionPromptCommand;
  }
  /**
   * The updateManualAnalysis command.
   *
   * @public
   * @readonly
   */
  public get updateManualAnalysisCommand(): Command<unknown> {
    return this._updateManualAnalysisCommand;
  }
  /**
   * The updateManualSolution command.
   *
   * @public
   * @readonly
   */
  public get updateManualSolutionCommand(): Command<unknown> {
    return this._updateManualSolutionCommand;
  }
  /**
   * The updateDelegatedTeam command.
   *
   * @public
   * @readonly
   */
  public get updateDelegatedTeamCommand(): Command<unknown> {
    return this._updateDelegatedTeamCommand;
  }
  /**
   * The updateResponsibleAgent command.
   *
   * @public
   * @readonly
   */
  public get updateResponsibleAgentCommand(): Command<unknown> {
    return this._updateResponsibleAgentCommand;
  }
  /**
   * The delegateGoal command.
   *
   * @public
   * @readonly
   */
  public get delegateGoalCommand(): Command<void> {
    return this._delegateGoalCommand;
  }
  /**
   * The reviewGoal command.
   *
   * @public
   * @readonly
   */
  public get reviewGoalCommand(): Command<'approved' | 'revision-required' | 'blocked'> {
    return this._reviewGoalCommand;
  }
  /**
   * The selectCreateInputMode command.
   *
   * @public
   * @readonly
   */
  public get selectCreateInputModeCommand(): Command<WorkflowInputMode> {
    return this._selectCreateInputModeCommand;
  }
  /**
   * The selectAnalysisInputMode command.
   *
   * @public
   * @readonly
   */
  public get selectAnalysisInputModeCommand(): Command<WorkflowInputMode> {
    return this._selectAnalysisInputModeCommand;
  }
  /**
   * The selectSolutionInputMode command.
   *
   * @public
   * @readonly
   */
  public get selectSolutionInputModeCommand(): Command<WorkflowInputMode> {
    return this._selectSolutionInputModeCommand;
  }
  /**
   * The isLabelSelected projection.
   *
   * @public
   * @readonly
   */
  public get isLabelSelected() {
    return this._isLabelSelected;
  }
  /**
   * The toggleLabel command.
   *
   * @public
   * @readonly
   */
  public get toggleLabelCommand(): Command<string> {
    return this._toggleLabelCommand;
  }
  /**
   * The isAssigneeSelected projection.
   *
   * @public
   * @readonly
   */
  public get isAssigneeSelected() {
    return this._isAssigneeSelected;
  }
  /**
   * The toggleAssignee command.
   *
   * @public
   * @readonly
   */
  public get toggleAssigneeCommand(): Command<string> {
    return this._toggleAssigneeCommand;
  }
  /**
   * The projectFieldText projection.
   *
   * @public
   * @readonly
   */
  public get projectFieldText() {
    return this._projectFieldText;
  }
  /**
   * The projectFieldNumber projection.
   *
   * @public
   * @readonly
   */
  public get projectFieldNumber() {
    return this._projectFieldNumber;
  }
  /**
   * The projectFieldDate projection.
   *
   * @public
   * @readonly
   */
  public get projectFieldDate() {
    return this._projectFieldDate;
  }
  /**
   * The projectFieldSelection projection.
   *
   * @public
   * @readonly
   */
  public get projectFieldSelection() {
    return this._projectFieldSelection;
  }
  /**
   * The isProjectFieldOptionSelected projection.
   *
   * @public
   * @readonly
   */
  public get isProjectFieldOptionSelected() {
    return this._isProjectFieldOptionSelected;
  }
  /**
   * The updateProjectField command.
   *
   * @public
   * @readonly
   */
  public get updateProjectFieldCommand(): Command<
    readonly [field: ProjectFieldDefinition, event: unknown]
  > {
    return this._updateProjectFieldCommand;
  }
  /**
   * The clearProjectField command.
   *
   * @public
   * @readonly
   */
  public get clearProjectFieldCommand(): Command<ProjectFieldDefinition> {
    return this._clearProjectFieldCommand;
  }
  /**
   * The toggleProjectFieldOption command.
   *
   * @public
   * @readonly
   */
  public get toggleProjectFieldOptionCommand(): Command<
    readonly [fieldId: string, optionId: string]
  > {
    return this._toggleProjectFieldOptionCommand;
  }
  /**
   * The draftWithIssueCreator command.
   *
   * @public
   * @readonly
   */
  public get draftWithIssueCreatorCommand(): Command<unknown | undefined> {
    return this._draftWithIssueCreatorCommand;
  }
  /**
   * The startOver command.
   *
   * @public
   * @readonly
   */
  public get startOverCommand(): Command<void> {
    return this._startOverCommand;
  }
  /**
   * The openSkills command.
   *
   * @public
   * @readonly
   */
  public get openSkillsCommand(): Command<void> {
    return this._openSkillsCommand;
  }
  /**
   * The voiceState projection.
   *
   * @public
   * @readonly
   */
  public get voiceState() {
    return this._voiceState;
  }
  /**
   * The startVoiceInput command.
   *
   * @public
   * @readonly
   */
  public get startVoiceInputCommand(): Command<AiPromptTarget> {
    return this._startVoiceInputCommand;
  }
  /**
   * The stopVoiceInput command.
   *
   * @public
   * @readonly
   */
  public get stopVoiceInputCommand(): Command<void> {
    return this._stopVoiceInputCommand;
  }
  /**
   * The cancelVoiceInput command.
   *
   * @public
   * @readonly
   */
  public get cancelVoiceInputCommand(): Command<void> {
    return this._cancelVoiceInputCommand;
  }
  /**
   * The save command.
   *
   * @public
   * @readonly
   */
  public get saveCommand(): Command<{ readonly close?: boolean } | undefined> {
    return this._saveCommand;
  }
  /**
   * The toggleContentEditing command.
   *
   * @public
   * @readonly
   */
  public get toggleContentEditingCommand(): Command<void> {
    return this._toggleContentEditingCommand;
  }
  /**
   * The startTask command.
   *
   * @public
   * @readonly
   */
  public get startTaskCommand(): Command<void> {
    return this._startTaskCommand;
  }
  /**
   * The startSolution command.
   *
   * @public
   * @readonly
   */
  public get startSolutionCommand(): Command<void> {
    return this._startSolutionCommand;
  }
  /**
   * The removeQueueEntry command.
   *
   * @public
   * @readonly
   */
  public get removeQueueEntryCommand(): Command<void> {
    return this._removeQueueEntryCommand;
  }
  /**
   * The cancelActiveExecution command.
   *
   * @public
   * @readonly
   */
  public get cancelActiveExecutionCommand(): Command<void> {
    return this._cancelActiveExecutionCommand;
  }
  /**
   * The cancelDraft command.
   *
   * @public
   * @readonly
   */
  public get cancelDraftCommand(): Command<void> {
    return this._cancelDraftCommand;
  }
  /**
   * The publishPullRequest command.
   *
   * @public
   * @readonly
   */
  public get publishPullRequestCommand(): Command<void> {
    return this._publishPullRequestCommand;
  }
  // #endregion

  // #region Methods

  /**
   * Updates the creation agent.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateCreationAgentCommand(event: unknown): void {
    const value = String(this.eventValue(event) ?? '');
    if (!value || !this.creationAgents().some((agent) => agent.id === value)) return;
    this.creationAgentId.set(value);
  }

  /**
   * Returns the decide.
   *
   * @param optionId - Option id.
   * @private
   */
  private async onExecuteDecideCommand(optionId: string): Promise<void> {
    if (!this._work.workflowAvailable) return;
    const workItemId = this.workItem()?.id;
    if (!workItemId) return;
    await this._work.decideWorkflow(workItemId, optionId);
  }

  /**
   * Writes every repair the findings offer in one update.
   *
   * A repair only ever restores a value Symphony can derive — it never guesses product data,
   * so applying it cannot overwrite a decision a person made.
   *
   * @private
   */
  private async onExecuteApplyRepairsCommand(): Promise<void> {
    const repairs = this.repairs();
    if (!repairs.length || this.isRepairing() || this.isRunning()) return;
    this.isRepairing.set(true);
    try {
      for (const repair of repairs) this.replaceProjectFieldValue(repair.value);
      await this.onExecuteSaveCommand({ close: false });
    } finally {
      this.isRepairing.set(false);
    }
  }

  /**
   * Handles hydrate.
   *
   * @public
   */
  public override onHydrate(): Promise<void> {
    return this.hydrate();
  }

  /**
   * Returns the repository changed.
   *
   * @private
   */
  private async onExecuteRepositoryChangedCommand(): Promise<void> {
    if (this._data.mode === 'edit') return;
    const repository = this._model().repository;
    if (
      !repository ||
      repository === this._loadedMetadataRepository ||
      repository === this._loadingMetadataRepository
    ) {
      return;
    }
    this._loadingMetadataRepository = repository;
    try {
      await this._work.loadWorkItemMetadata(
        repository,
        this.creationWorkspaceId(),
        this._context.creationBoard()?.id,
      );
      this._loadedMetadataRepository = repository;
      const metadata = this.metadata();
      if (metadata) {
        this._model.update((model) => ({
          ...model,
          workItemType:
            model.workItemType || metadata.defaultWorkItemType || metadata.workItemTypes?.[0] || '',
          projectFields: this.normalizeProjectFields(metadata.projectFields, model.projectFields),
        }));
      }
    } finally {
      if (this._loadingMetadataRepository === repository) {
        this._loadingMetadataRepository = undefined;
      }
    }
  }

  /**
   * Updates the draft prompt.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateDraftPromptCommand(event: unknown): void {
    const value = this.valueFromEvent(event);
    if (value !== undefined) this.draftPrompt.set(value);
  }

  /**
   * Updates the analysis prompt.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateAnalysisPromptCommand(event: unknown): void {
    const value = this.valueFromEvent(event);
    if (value !== undefined) this.analysisPrompt.set(value);
  }

  /**
   * Updates the solution prompt.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateSolutionPromptCommand(event: unknown): void {
    const value = this.valueFromEvent(event);
    if (value !== undefined) this.solutionPrompt.set(value);
  }

  /**
   * Updates the manual analysis.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateManualAnalysisCommand(event: unknown): void {
    const value = this.valueFromEvent(event);
    if (value !== undefined) this.manualAnalysis.set(value);
  }

  /**
   * Updates the manual solution.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateManualSolutionCommand(event: unknown): void {
    const value = this.valueFromEvent(event);
    if (value !== undefined) this.manualSolution.set(value);
  }

  /**
   * Updates the delegated team.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateDelegatedTeamCommand(event: unknown): void {
    const value = String(this.eventValue(event) ?? '');
    if (!this.workspaceTeams().some((team) => team.id === value)) return;
    this.delegatedTeamId.set(value);
    if (!this.workspaceAgents().some((agent) => agent.id === this.responsibleAgentId())) {
      this.responsibleAgentId.set(this.workspaceAgents()[0]?.id ?? '');
    }
  }

  /**
   * Updates the responsible agent.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateResponsibleAgentCommand(event: unknown): void {
    const value = String(this.eventValue(event) ?? '');
    if (this.workspaceAgents().some((agent) => agent.id === value)) {
      this.responsibleAgentId.set(value);
    }
  }

  /**
   * Updates the goal objective.
   *
   * @param event - Event.
   * @private
   */
  private updateGoalObjective(event: unknown): void {
    const value = this.valueFromEvent(event);
    if (value !== undefined) this.goalObjective.set(value);
  }

  /**
   * Returns the delegate goal.
   *
   * @private
   */
  private async onExecuteDelegateGoalCommand(): Promise<void> {
    if (!this._work.executionAvailable) return;
    const workItemId = this.workItemId();
    if (!workItemId || !this.delegatedTeamId() || !this.responsibleAgentId()) return;
    this.delegationBusy.set(true);
    try {
      await this._work.delegateWorkItem(
        workItemId,
        this.delegatedTeamId(),
        this.responsibleAgentId(),
        this.goalObjective(),
      );
    } finally {
      this.delegationBusy.set(false);
    }
  }

  /**
   * Returns the review goal.
   *
   * @param decision - Decision.
   * @private
   */
  private async onExecuteReviewGoalCommand(
    decision: 'approved' | 'revision-required' | 'blocked',
  ): Promise<void> {
    if (!this._work.executionAvailable) return;
    const workItemId = this.workItemId();
    if (!workItemId) return;
    this.delegationBusy.set(true);
    try {
      const reviewed = await this._work.reviewGoal(
        workItemId,
        decision,
        decision === 'approved'
          ? 'Goal approved from the task review.'
          : decision === 'revision-required'
            ? this.solutionPrompt().trim() || 'Revision required.'
            : 'Goal blocked by the operator.',
      );
      if (reviewed && decision === 'revision-required') {
        this.solutionInputMode.set('ai');
        await this.onExecuteStartSolutionCommand();
      }
    } finally {
      this.delegationBusy.set(false);
    }
  }

  /**
   * Selects the create input mode.
   *
   * @param mode - Mode.
   * @private
   */
  private onExecuteSelectCreateInputModeCommand(mode: WorkflowInputMode): void {
    this.createInputMode.set(mode);
  }

  /**
   * Selects the analysis input mode.
   *
   * @param mode - Mode.
   * @private
   */
  private onExecuteSelectAnalysisInputModeCommand(mode: WorkflowInputMode): void {
    this.analysisInputMode.set(mode);
  }

  /**
   * Selects the solution input mode.
   *
   * @param mode - Mode.
   * @private
   */
  private onExecuteSelectSolutionInputModeCommand(mode: WorkflowInputMode): void {
    this.solutionInputMode.set(mode);
  }

  /**
   * Whether it is label selected.
   *
   * @param label - Label.
   * @private
   */
  private resolveIsLabelSelected(label: string): boolean {
    return this._model().labels.includes(label);
  }

  /**
   * Toggles the label.
   *
   * @param label - Label.
   * @private
   */
  private onExecuteToggleLabelCommand(label: string): void {
    this._model.update((model) => ({
      ...model,
      labels: model.labels.includes(label)
        ? model.labels.filter((candidate) => candidate !== label)
        : [...model.labels, label],
    }));
  }

  /**
   * Whether it is assignee selected.
   *
   * @param login - Login.
   * @private
   */
  private resolveIsAssigneeSelected(login: string): boolean {
    return this._model().assignees.includes(login);
  }

  /**
   * Toggles the assignee.
   *
   * @param login - Login.
   * @private
   */
  private onExecuteToggleAssigneeCommand(login: string): void {
    this._model.update((model) => ({
      ...model,
      assignees: model.assignees.includes(login)
        ? model.assignees.filter((candidate) => candidate !== login)
        : [...model.assignees, login],
    }));
  }

  /**
   * Returns the project field text.
   *
   * @param fieldId - Field id.
   * @private
   */
  private resolveProjectFieldText(fieldId: string): string {
    const value = this.projectFieldValue(fieldId);
    return value?.type === 'text' ? value.value : '';
  }

  /**
   * Returns the project field number.
   *
   * @param fieldId - Field id.
   * @private
   */
  private resolveProjectFieldNumber(fieldId: string): number | null {
    const value = this.projectFieldValue(fieldId);
    return value?.type === 'number' ? value.value : null;
  }

  /**
   * Returns the project field date.
   *
   * @param fieldId - Field id.
   * @private
   */
  private resolveProjectFieldDate(fieldId: string): Date | null {
    const value = this.projectFieldValue(fieldId);
    return value?.type === 'date' && value.value ? new Date(`${value.value}T00:00:00`) : null;
  }

  /**
   * Returns the project field selection.
   *
   * @param fieldId - Field id.
   * @private
   */
  private resolveProjectFieldSelection(fieldId: string): string {
    const value = this.projectFieldValue(fieldId);
    return value?.type === 'single-select' || value?.type === 'iteration'
      ? (value.value ?? '')
      : '';
  }

  /**
   * Whether it is project field option selected.
   *
   * @param fieldId - Field id.
   * @param optionId - Option id.
   * @private
   */
  private resolveIsProjectFieldOptionSelected(fieldId: string, optionId: string): boolean {
    const value = this.projectFieldValue(fieldId);
    return value?.type === 'multi-select' && value.value.includes(optionId);
  }

  /**
   * Updates the project field.
   *
   * @param field - Field.
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateProjectFieldCommand(field: ProjectFieldDefinition, event: unknown): void {
    const raw = this.eventValue(event);
    let value: ProjectFieldValue;
    switch (field.type) {
      case 'text':
        value = { fieldId: field.id, type: field.type, value: typeof raw === 'string' ? raw : '' };
        break;
      case 'number': {
        const number =
          typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
        value = {
          fieldId: field.id,
          type: field.type,
          value: Number.isFinite(number) ? number : null,
        };
        break;
      }
      case 'date':
        value = {
          fieldId: field.id,
          type: field.type,
          value: raw instanceof Date && !Number.isNaN(raw.valueOf()) ? this.dateValue(raw) : '',
        };
        break;
      case 'single-select':
      case 'iteration':
        value = {
          fieldId: field.id,
          type: field.type,
          value: typeof raw === 'string' && raw ? raw : null,
        };
        break;
      case 'multi-select':
        return;
    }
    this.replaceProjectFieldValue(value);
  }

  /**
   * Clears the project field.
   *
   * @param field - Field.
   * @private
   */
  private onExecuteClearProjectFieldCommand(field: ProjectFieldDefinition): void {
    this.replaceProjectFieldValue(this.emptyProjectFieldValue(field));
  }

  /**
   * Toggles the project field option.
   *
   * @param fieldId - Field id.
   * @param optionId - Option id.
   * @private
   */
  private onExecuteToggleProjectFieldOptionCommand(fieldId: string, optionId: string): void {
    const value = this.projectFieldValue(fieldId);
    if (value?.type !== 'multi-select') return;
    this.replaceProjectFieldValue({
      ...value,
      value: value.value.includes(optionId)
        ? value.value.filter((candidate) => candidate !== optionId)
        : [...value.value, optionId],
    });
  }

  /**
   * Drafts the with issue creator.
   *
   * @param event - Event.
   * @private
   */
  private async onExecuteDraftWithIssueCreatorCommand(event?: unknown): Promise<void> {
    if (this.isDrafting()) return;
    const submitted = this.valueFromEvent(event)?.trim();
    const prompt = submitted || this.draftPrompt().trim();
    if (!prompt || !this._model().repository) return;
    this.draftPrompt.set(prompt);
    const current = this._model();
    const draft = await this._work.draftIssue({
      ...(this.creationWorkspaceId() ? { workspaceId: this.creationWorkspaceId()! } : {}),
      ...(this._context.creationBoard()?.id ? { sourceId: this._context.creationBoard()!.id } : {}),
      repository: current.repository,
      prompt,
      ...(this.creationAgentId() ? { agentProfileId: this.creationAgentId() } : {}),
      ...(current.title.trim() ? { title: current.title } : {}),
      ...(current.body.trim() ? { body: current.body } : {}),
      projectFields: current.projectFields,
    });
    if (draft) {
      this._model.update((model) => ({
        ...model,
        title: draft.title,
        body: draft.body,
        projectFields: [...draft.projectFields],
        labels: [...draft.labels],
        assignees: [...draft.assignees],
      }));
      this.creatorStage.set('review');
    } else {
      await this.restoreSubmitted(this.draftPrompt, prompt);
    }
  }

  /**
   * Starts the over.
   *
   * @private
   */
  private onExecuteStartOverCommand(): void {
    this.creatorStage.set('prompt');
  }

  /**
   * Opens the skills.
   *
   * @private
   */
  private async onExecuteOpenSkillsCommand(): Promise<void> {
    if (!this.skillsAvailable) return;
    this.onExecuteCloseCommand();
    await this._router.navigate(['/main/settings'], { queryParams: { section: 'skills' } });
  }

  /**
   * Returns the voice state.
   *
   * @param target - Target.
   * @private
   */
  private resolveVoiceState(target: AiPromptTarget): 'idle' | 'recording' {
    return this._voiceTarget() === target ? 'recording' : 'idle';
  }

  /**
   * Starts the voice input.
   *
   * @param target - Target.
   * @private
   */
  private onExecuteStartVoiceInputCommand(target: AiPromptTarget): void {
    if (this._voiceTarget()) return;
    this._voiceTarget.set(target);
    void this._speechRecognition.start(
      (transcript) => this.appendPrompt(target, transcript),
      () => this.finishVoiceInput(),
    );
  }

  /**
   * Stops the voice input.
   *
   * @private
   */
  private onExecuteStopVoiceInputCommand(): void {
    void this._speechRecognition.stop();
  }

  /**
   * Cancels the voice input.
   *
   * @private
   */
  private onExecuteCancelVoiceInputCommand(): void {
    this.finishVoiceInput();
    void this._speechRecognition.cancel();
  }

  /**
   * Saves the drawer model. A repair keeps the drawer open (`close: false`) so the person can
   * see the banner disappear and confirm the item is sound before leaving it.
   *
   * @param options - Options.
   * @private
   */
  private async onExecuteSaveCommand(options?: { readonly close?: boolean }): Promise<void> {
    if (!this.canSave()) return;
    const current = this._model();
    const existing = this.workItem();
    const settings = this._context.settings();
    const workspaceId = existing?.workspaceId ?? this.creationWorkspaceId();
    const deliveryContext = settings?.deliveryContexts.find(
      (context) => context.enabled && context.workspaceId === workspaceId,
    );
    const sourceId =
      existing?.sourceId ??
      this._context.creationBoard()?.id ??
      deliveryContext?.workItemSourceIds[0] ??
      settings?.workItemSources.find(
        (source) => source.enabled && source.workspaceId === workspaceId,
      )?.id;
    const repositoryBindingIds = existing?.repositoryBindingIds?.length
      ? existing.repositoryBindingIds
      : (settings?.repositoryBindings ?? [])
          .filter(
            (repository) =>
              repository.enabled &&
              repository.workspaceId === workspaceId &&
              (repository.id === current.repository ||
                repository.displayName === current.repository ||
                `${repository.owner}/${repository.name}` === current.repository),
          )
          .map((repository) => repository.id);
    const mutation = {
      ...(workspaceId ? { workspaceId } : {}),
      ...(sourceId ? { sourceId } : {}),
      ...(current.workItemType ? { workItemType: current.workItemType } : {}),
      title: current.title.trim(),
      body: current.body,
      repository: current.repository,
      repositoryBindingIds,
      projectFields: current.projectFields,
      labels: current.labels,
      assignees: current.assignees,
    };
    const saved =
      this._data.mode === 'create'
        ? await this._work.createWorkItem(mutation)
        : await this._work.updateWorkItem(this._data.workItemId, mutation);
    if (saved && (options?.close ?? true)) this._drawerRef.close();
  }

  /**
   * Switches title and description between their readable and editable rendering.
   *
   * @private
   */
  private onExecuteToggleContentEditingCommand(): void {
    if (this.mode() === 'edit') this._contentEditSession.set(true);
    this._contentEditing.update((editing) => !editing);
  }

  /**
   * Discards the current edit session and restores the last provider-owned item detail.
   *
   * @private
   */
  private cancelContentEditing(): void {
    if (this.mode() !== 'edit') return;
    const item = this.workItem();
    if (!item) return;
    this._model.set({
      title: item.title,
      body: item.body,
      repository: item.repository,
      workItemType: item.workItemType ?? '',
      projectFields: [...(item.projectFields ?? [])],
      labels: [...item.labels],
      assignees: item.assignees.map((assignee) => assignee.login),
    });
    this._contentEditing.set(false);
    this._contentEditSession.set(false);
  }

  /**
   * Closes.
   *
   * @private
   */
  private onExecuteCloseCommand(): void {
    this._drawerRef.close();
  }

  /**
   * Starts the task.
   *
   * @private
   */
  private async onExecuteStartTaskCommand(): Promise<void> {
    const id = this.workItemId();
    if (!id || !this.canStart()) return;
    this.isStarting.set(true);
    try {
      if (this.analysisInputMode() === 'manual') {
        const completed = await this._work.completeManualAnalysis(id, this.manualAnalysis().trim());
        if (completed) this.manualAnalysis.set('');
      } else {
        const approval = await this.requestLocalExecutionApproval();
        if (approval !== false) {
          await this._work.startAnalyzer(
            false,
            id,
            this.analysisPrompt().trim() || undefined,
            approval || undefined,
          );
        }
      }
    } finally {
      this.isStarting.set(false);
    }
  }

  /**
   * Starts the solution.
   *
   * @private
   */
  private async onExecuteStartSolutionCommand(): Promise<void> {
    const id = this.workItemId();
    if (!id || !this.canSolve()) return;
    if (this.solutionInputMode() === 'manual') {
      this.isSolving.set(true);
      try {
        const completed = await this._work.completeManualSolution(id, this.manualSolution().trim());
        if (completed) this.manualSolution.set('');
      } finally {
        this.isSolving.set(false);
      }
      return;
    }
    const feedback = this.solutionPrompt().trim();
    if (this.requiresFeedback() && !feedback) {
      this._notificationService.showWarning(
        'Describe the requested changes.',
        'Add feedback before starting an AI revision.',
      );
      return;
    }
    this.isSolving.set(true);
    try {
      const approval = await this.requestLocalExecutionApproval();
      if (approval === false) return;
      const started = await this._work.startSolver(
        false,
        id,
        feedback || undefined,
        approval || undefined,
      );
      if (started) this.solutionPrompt.set('');
    } finally {
      this.isSolving.set(false);
    }
  }

  /**
   * Removes the queue entry.
   *
   * @private
   */
  private async onExecuteRemoveQueueEntryCommand(): Promise<void> {
    const entry = this.queueEntry();
    if (!entry || this.isRemovingQueueEntry()) return;
    this.isRemovingQueueEntry.set(true);
    try {
      await this._work.removeQueueEntry(entry.id);
    } finally {
      this.isRemovingQueueEntry.set(false);
    }
  }

  /**
   * Cancels the active execution.
   *
   * @private
   */
  private async onExecuteCancelActiveExecutionCommand(): Promise<void> {
    const execution = this.activeExecution();
    if (!execution || this.isCancellingExecution()) return;
    this.isCancellingExecution.set(true);
    try {
      await this._work.cancelExecution(execution.id);
    } finally {
      this.isCancellingExecution.set(false);
    }
  }

  /**
   * Cancels the draft.
   *
   * @private
   */
  private async onExecuteCancelDraftCommand(): Promise<void> {
    if (!this.isDrafting() || this.isCancellingDraft()) return;
    this.isCancellingDraft.set(true);
    try {
      await this._work.cancelIssueDraft();
    } finally {
      this.isCancellingDraft.set(false);
    }
  }

  /**
   * Publishes the pull request.
   *
   * @private
   */
  private async onExecutePublishPullRequestCommand(): Promise<void> {
    const execution = this.solutionExecution();
    if (!execution || !this.canPublishPullRequest()) return;
    await this._work.publishPullRequest(execution.id);
  }

  /** Whether the item's stage runs the given role in the configured workflow. */
  private stageRunsRole(role: 'analyze' | 'solve'): boolean {
    const snapshot = this._context.snapshot();
    if (!snapshot) return false;
    return stageExecutesRole(snapshot.workflow.stages, this.workItem()?.stageId, role);
  }

  private async hydrate(): Promise<void> {
    if (this._data.mode === 'edit') {
      const loaded = await this._work.loadWorkItemDetails(this._data.workItemId);
      if (!loaded) throw new Error('Work-item details are required before editing.');
    }
    const item = this.workItem();
    if (this._data.mode === 'edit' && item) {
      this._loadedComments.set(item.comments ?? []);
      this._model.set({
        title: item.title,
        body: item.body,
        repository: item.repository,
        workItemType: item.workItemType ?? '',
        projectFields: [...(item.projectFields ?? [])],
        labels: [...item.labels],
        assignees: item.assignees.map((assignee) => assignee.login),
      });
      const goal = this.goal();
      const defaultTeam =
        this.workspaceTeams().find((team) => team.id === goal?.assignment.agentTeamId) ??
        this.workspaceTeams()[0];
      const defaultAgent =
        this.workspaceAgents().find((agent) => agent.id === goal?.assignment.responsibleAgentId) ??
        this.workspaceAgents()[0];
      this.delegatedTeamId.set(defaultTeam?.id ?? '');
      this.responsibleAgentId.set(defaultAgent?.id ?? '');
      this.goalObjective.set(goal?.assignment.objective ?? item.title);
    }
    await this._work.loadWorkItemMetadata(
      item?.repository,
      item?.workspaceId ?? this.creationWorkspaceId(),
      item?.sourceId ?? this._context.creationBoard()?.id,
    );
    const metadata = this.metadata();
    if (metadata) {
      const repository = this._model().repository || metadata.repositories[0] || '';
      this._loadedMetadataRepository = repository;
      this._model.update((model) => ({
        ...model,
        repository,
        workItemType:
          model.workItemType || metadata.defaultWorkItemType || metadata.workItemTypes?.[0] || '',
        projectFields: this.normalizeProjectFields(metadata.projectFields, model.projectFields),
      }));
    }
  }

  /** Workspace that owns new work items: the selected board's workspace, else the first selected workspace. */
  private creationWorkspaceId(): string | undefined {
    return this._context.creationBoard()?.workspaceId ?? this._context.activeWorkspace()?.id;
  }

  private finishVoiceInput(): void {
    this._voiceTarget.set(undefined);
  }

  private appendPrompt(target: AiPromptTarget, transcript: string): void {
    const append = (current: string): string =>
      [current.trim(), transcript].filter(Boolean).join(' ');
    switch (target) {
      case 'work-item-creation':
        this.draftPrompt.update(append);
        return;
      case 'analysis':
        this.analysisPrompt.update(append);
        return;
      case 'solution':
        this.solutionPrompt.update(append);
        return;
    }
  }

  /**
   * Writes the composed comment into the provider discussion and shows it in the thread it
   * joined. A refused comment goes back into the box: text a person wrote is never dropped
   * because the provider said no.
   */
  private async onExecutePublishCommentCommand(event: unknown): Promise<void> {
    if (this._data.mode !== 'edit') return;
    const body = (this.valueFromEvent(event) ?? this.commentDraft()).trim();
    if (!body) return;
    const commented = await this._work.commentOnWorkItem(this._data.workItemId, body);
    if (!commented) {
      await this.restoreSubmitted(this.commentDraft, body);
      return;
    }
    this._loadedComments.set(commented.comments ?? []);
    this.commentDraft.set('');
  }

  /**
   * Puts a refused submission back into its box. The box empties itself on submit, so the value
   * it still holds is the one that is bound - it has to leave the signal for one frame before
   * the same text is accepted again.
   */
  private async restoreSubmitted(target: WritableSignal<string>, value: string): Promise<void> {
    target.set('');
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    target.set(value);
  }

  private valueFromEvent(event: unknown): string | undefined {
    if (typeof event === 'string') return event;
    if (!event || typeof event !== 'object') return undefined;
    const record = event as Record<string, unknown>;
    const detail =
      record['detail'] && typeof record['detail'] === 'object'
        ? (record['detail'] as Record<string, unknown>)
        : record;
    const target =
      record['target'] && typeof record['target'] === 'object'
        ? (record['target'] as Record<string, unknown>)
        : undefined;
    const value = detail['value'] ?? target?.['value'];
    return typeof value === 'string' ? value : undefined;
  }

  private eventValue(event: unknown): unknown {
    if (event instanceof Date || typeof event === 'string' || typeof event === 'number') {
      return event;
    }
    if (!event || typeof event !== 'object') return undefined;
    const record = event as Record<string, unknown>;
    const detail =
      record['detail'] && typeof record['detail'] === 'object'
        ? (record['detail'] as Record<string, unknown>)
        : record;
    const target =
      record['target'] && typeof record['target'] === 'object'
        ? (record['target'] as Record<string, unknown>)
        : undefined;
    // A selection reports the selected item as `newValue`.
    const selection =
      detail['newValue'] && typeof detail['newValue'] === 'object'
        ? (detail['newValue'] as Record<string, unknown>)['value']
        : undefined;
    return detail['value'] ?? selection ?? target?.['value'] ?? record['detail'];
  }

  private projectFieldValue(fieldId: string): ProjectFieldValue | undefined {
    return this._model().projectFields.find((value) => value.fieldId === fieldId);
  }

  private replaceProjectFieldValue(value: ProjectFieldValue): void {
    this._model.update((model) => ({
      ...model,
      projectFields: [
        ...model.projectFields.filter((candidate) => candidate.fieldId !== value.fieldId),
        value,
      ],
    }));
  }

  private normalizeProjectFields(
    fields: readonly ProjectFieldDefinition[],
    values: readonly ProjectFieldValue[],
  ): ProjectFieldValue[] {
    return fields.map((field) => {
      const existing = values.find(
        (value) => value.fieldId === field.id && value.type === field.type,
      );
      if (existing) return existing;
      if (field.role === 'workflow-state' && field.type === 'single-select') {
        return {
          fieldId: field.id,
          type: field.type,
          value:
            field.options.find(
              (option) => option.stageId === this._context.snapshot()?.workflow.initialStageId,
            )?.id ??
            field.options[0]?.id ??
            null,
        };
      }
      return this.emptyProjectFieldValue(field);
    });
  }

  private emptyProjectFieldValue(field: ProjectFieldDefinition): ProjectFieldValue {
    switch (field.type) {
      case 'text':
      case 'date':
        return { fieldId: field.id, type: field.type, value: '' };
      case 'number':
      case 'single-select':
      case 'iteration':
        return { fieldId: field.id, type: field.type, value: null };
      case 'multi-select':
        return { fieldId: field.id, type: field.type, value: [] };
    }
  }

  private dateValue(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async requestLocalExecutionApproval(): Promise<'once' | 'repository' | '' | false> {
    return this._localExecutionApproval.request(this.workItem());
  }

  private executionSkill(skillId: string | undefined) {
    if (!skillId) return undefined;
    return this._skills?.skillCatalog()?.packages.find((candidate) => candidate.id === skillId);
  }

  private executionUsesAi(
    execution: { readonly mode?: 'manual' | 'ai'; readonly skillId?: string } | undefined,
  ): boolean {
    return Boolean(execution && execution.mode !== 'manual' && execution.skillId);
  }

  // #endregion
}

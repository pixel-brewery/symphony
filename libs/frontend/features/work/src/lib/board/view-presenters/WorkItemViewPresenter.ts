// #region Imports

import {
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  signal,
  untracked,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { inspectWorkItem, isCompletedAnalysis } from '@symphony/domain-execution';
import {
  activeWorkItemCoordination,
  type IWorkItemComment,
  type IWorkItemFieldRepair,
  type IWorkItemHealth,
} from '@symphony/domain-work';
import { findStage, stageExecutesRole } from '@symphony/domain-workflow';
import {
  Clock,
  Command,
  ExternalLinkService,
  Hydratable,
  resolveImplementationBranchUrl,
  resolvePullRequestRun,
  ViewPresenter,
  workItemIdsNeedingAttention,
} from '@symphony/frontend-core';
import { DesktopSpeechRecognitionService } from '@symphony/frontend-interaction';
import { NotificationService } from '@symphony/frontend-notification';
import { map } from 'rxjs';
import { WORK_BOARD_CONTEXT } from '../../ports/WorkBoardContextToken';
import { WORK_BOARD_ROUTE } from '../../ports/WorkBoardRouteToken';
import { WORK_CI_OPERATIONS } from '../../ports/WorkCiOperationsToken';
import { WORK_EXECUTION_READ } from '../../ports/WorkExecutionReadToken';
import { WORK_PUBLICATION_READ } from '../../ports/WorkPublicationReadToken';
import { WORK_SKILLS_READ } from '../../ports/WorkSkillsReadToken';
import { WORK_TASK_CONTEXT } from '../../ports/WorkTaskContextToken';
import { WorkStore } from '../../state/WorkStore';
import { LocalExecutionApprovalService } from '../services/LocalExecutionApprovalService';
import { resolveBoardCardState } from './boardCard';
import {
  resolveBoardPullRequestActions,
  type IBoardPullRequestAction,
} from './boardPullRequestAction';
import { hydrateBoardRoute } from './routeHydration';
import {
  resolveAcceptanceCriteria,
  resolveWorkItemActivity,
  resolveWorkItemChecks,
  resolveWorkItemStages,
  type IWorkItemCheck,
} from './workItemDetail';
import { readEventText, readEventValue, WorkItemForm } from './workItemForm';
import type { WorkflowInputMode } from './WorkflowInputMode';

// #endregion

type AiPromptTarget = 'analysis' | 'solution';

/**
 * Owns the work-item screen at `/main/board/:workItemId`: the item, its five delivery stages,
 * checks, acceptance criteria, activity and discussion, and every command the former detail
 * drawer offered - editing, the gate decisions, delegation to the AI team, the analysis and
 * implementation steps, runs, pull-request publication and the field repairs.
 *
 * @public
 */
@Injectable()
export class WorkItemViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _context = inject(WORK_TASK_CONTEXT);
  private readonly _board = inject(WORK_BOARD_CONTEXT);
  private readonly _boardRoute = inject(WORK_BOARD_ROUTE);
  private readonly _work = inject(WorkStore);
  private readonly _executionRead = inject(WORK_EXECUTION_READ);
  private readonly _publication = inject(WORK_PUBLICATION_READ);
  private readonly _skills = inject(WORK_SKILLS_READ);
  private readonly _ci = inject(WORK_CI_OPERATIONS);
  private readonly _notifications = inject(NotificationService);
  private readonly _localExecutionApproval = inject(LocalExecutionApprovalService);
  private readonly _externalLinks = inject(ExternalLinkService);
  private readonly _router = inject(Router);
  private readonly _route = inject(ActivatedRoute);
  private readonly _speechRecognition = inject(DesktopSpeechRecognitionService);
  private readonly _clock = inject(Clock);
  private readonly _hydratedId = signal<string | undefined>(undefined);
  private readonly _contentEditing = signal(false);
  private readonly _contentEditSession = signal(false);
  private readonly _voiceTarget = signal<AiPromptTarget | undefined>(undefined);
  private readonly _checkActionBusy = signal(false);

  /**
   * Discussion as it arrived with the complete item. A board refresh or a save hands the store a
   * summary again, which carries no thread, and the screen must not blank the comments then.
   */
  private readonly _loadedComments = signal<readonly IWorkItemComment[]>([]);

  /**
   * Id of the opened work item, decoded from the route.
   *
   * @public
   * @readonly
   */
  public readonly workItemId: Signal<string> = toSignal(
    this._route.paramMap.pipe(map((parameters) => parameters.get('workItemId') ?? '')),
    { initialValue: this._route.snapshot.paramMap.get('workItemId') ?? '' },
  );

  /**
   * The editable form behind `Edit`, shared with the new-work-item sheet.
   *
   * @public
   * @readonly
   */
  public readonly editor = new WorkItemForm();

  /**
   * Current time, ticking every 30 seconds, for relative times and running durations.
   *
   * @public
   * @readonly
   */
  public readonly now = this._clock.now;

  /** Whether execution commands exist in this product. @public @readonly */
  public readonly executionAvailable = this._work.executionAvailable;
  /** Whether workflow decisions exist in this product. @public @readonly */
  public readonly workflowAvailable = this._work.workflowAvailable;
  /** Whether pull-request publication exists in this product. @public @readonly */
  public readonly publicationAvailable = this._work.publicationAvailable;
  /** Whether the skills catalog exists in this product. @public @readonly */
  public readonly skillsAvailable = this._skills !== null;
  /** Whether workflow runs can be driven from here. @public @readonly */
  public readonly ciAvailable = this._ci !== null;
  /** Whether speech input is available. @public @readonly */
  public readonly voiceInputAvailable = this._speechRecognition.available;

  /** Whether title, description and fields are shown as inputs. @public @readonly */
  public readonly isEditingContent = this._contentEditing.asReadonly();

  /**
   * Whether an edit session is open. Previewing keeps the session, so `Save changes` and
   * `Cancel editing` stay offered until the edit is resolved.
   *
   * @public
   * @readonly
   */
  public readonly isEditingSession = this._contentEditSession.asReadonly();

  /** The analysis input mode. @public @readonly */
  public readonly analysisInputMode = signal<WorkflowInputMode>('manual');
  /** The solution input mode. @public @readonly */
  public readonly solutionInputMode = signal<WorkflowInputMode>('manual');
  /** Whether an analysis is being started. @public @readonly */
  public readonly isStarting = signal(false);
  /** Whether an implementation is being started. @public @readonly */
  public readonly isSolving = signal(false);
  /** Whether the active run is being cancelled. @public @readonly */
  public readonly isCancellingExecution = signal(false);
  /** Whether the queue entry is being removed. @public @readonly */
  public readonly isRemovingQueueEntry = signal(false);
  /** Whether the field repairs are being written. @public @readonly */
  public readonly isRepairing = signal(false);
  /** Whether a delegation or review is being written. @public @readonly */
  public readonly delegationBusy = signal(false);
  /** Optional focus for the analysis. @public @readonly */
  public readonly analysisPrompt = signal('');
  /** Feedback for a revision. @public @readonly */
  public readonly solutionPrompt = signal('');
  /** Manually recorded analysis. @public @readonly */
  public readonly manualAnalysis = signal('');
  /** Manually recorded implementation. @public @readonly */
  public readonly manualSolution = signal('');
  /** The comment being written. @public @readonly */
  public readonly commentDraft = signal('');
  /** Team the item is delegated to. @public @readonly */
  public readonly delegatedTeamId = signal('');
  /** Agent responsible for the item. @public @readonly */
  public readonly responsibleAgentId = signal('');
  /** Objective handed to the AI team. @public @readonly */
  public readonly goalObjective = signal('');

  /** Whether a save is running. @public @readonly */
  public readonly isSaving = this._work.workItemsBusy;
  /** Whether a comment is being published. @public @readonly */
  public readonly isCommenting = this._work.workItemCommentBusy;

  /**
   * The opened work item.
   *
   * @public
   * @readonly
   */
  public readonly workItem = computed(() => {
    const id = this.workItemId();
    return id ? this._context.snapshot()?.workItems.find((item) => item.id === id) : undefined;
  });

  /**
   * Whether the route names a work item the loaded board does not contain.
   *
   * @public
   * @readonly
   */
  public readonly notFound = computed(
    () => !this.isHydrating() && this._hydratedId() === this.workItemId() && !this.workItem(),
  );

  /**
   * Board column the item rests in.
   *
   * @public
   * @readonly
   */
  public readonly column = computed(() => {
    const columnId = this.workItem()?.boardColumnId;
    return columnId
      ? this._board.snapshot()?.boardColumns.find((candidate) => candidate.id === columnId)
      : undefined;
  });

  /**
   * The goal delegated for the item.
   *
   * @public
   * @readonly
   */
  public readonly goal = computed(() => {
    const id = this.workItemId();
    return id ? this._context.snapshot()?.goals?.find((goal) => goal.workItemId === id) : undefined;
  });

  /**
   * Workflow stage the item rests in; missing while its column is unmapped.
   *
   * @public
   * @readonly
   */
  public readonly stage = computed(() =>
    findStage(this._context.snapshot()?.workflow.stages ?? [], this.workItem()?.stageId),
  );

  /**
   * Label for opening the item where its provider keeps it.
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
   * Provider URL of the item.
   *
   * @public
   * @readonly
   */
  public readonly workItemUrl = computed(() => this.workItem()?.externalUrl);

  /**
   * Provider discussion, oldest first; empty until the complete item arrived.
   *
   * @public
   * @readonly
   */
  public readonly comments = computed(() => this.workItem()?.comments ?? this._loadedComments());

  /**
   * Runs of the item, oldest first.
   *
   * @public
   * @readonly
   */
  public readonly executions = computed(() => {
    const id = this.workItemId();
    return (this._context.snapshot()?.executions ?? [])
      .filter((execution) => execution.workItemId === id)
      .toSorted((left, right) => left.startedAt.localeCompare(right.startedAt));
  });

  /** Newest run of the item. @public @readonly */
  public readonly execution = computed(() => this.executions().at(-1));

  /** Newest analysis run. @public @readonly */
  public readonly analysisExecution = computed(() =>
    this.executions()
      .filter((execution) => execution.kind === undefined || execution.kind === 'analysis')
      .at(-1),
  );

  /** Newest implementation or revision run. @public @readonly */
  public readonly solutionExecution = computed(() =>
    this.executions()
      .filter((execution) => execution.kind === 'solution' || execution.kind === 'revision')
      .at(-1),
  );

  /**
   * Newest implementation run that published a pull request. A revision continues on the branch
   * and pull request of the run before it without carrying the reference itself, so the newest
   * run alone would lose the pull request after every revision.
   *
   * @public
   * @readonly
   */
  public readonly publishedExecution = computed(() =>
    this.executions()
      .filter(
        (execution) =>
          (execution.kind === 'solution' || execution.kind === 'revision') && execution.pullRequest,
      )
      .at(-1),
  );

  /** Branch the implementation works on. @public @readonly */
  public readonly implementationBranch = computed(
    () => this.solutionExecution()?.workspaceReference,
  );

  /** Remote URL of the implementation branch, once published. @public @readonly */
  public readonly branchUrl = computed(() => {
    const latest = this.solutionExecution();
    const published = this.publishedExecution();
    return resolveImplementationBranchUrl(
      latest && !latest.pullRequest && published?.workspaceReference === latest.workspaceReference
        ? published
        : latest,
    );
  });

  /** The delivered pull request. @public @readonly */
  public readonly pullRequest = computed(() => this.publishedExecution()?.pullRequest);

  /** The delivered pull request as the loaded pull-request list knows it. @public @readonly */
  public readonly pullRequestSummary = computed(() => {
    const reference = this.pullRequest();
    return reference
      ? this._board
          .snapshot()
          ?.pullRequests?.find((candidate) => candidate.externalUrl === reference.externalUrl)
      : undefined;
  });

  /** Whether a pull request is being published. @public @readonly */
  public readonly isPublishingPullRequest = computed(
    () => this._publication?.pullRequestBusy() ?? false,
  );

  /** Whether the finished implementation can be published as a pull request. @public @readonly */
  public readonly canPublishPullRequest = computed(() => {
    if (!this.publicationAvailable) return false;
    const execution = this.solutionExecution();
    return Boolean(
      execution &&
      execution.state === 'succeeded' &&
      execution.workspacePath &&
      execution.workspaceReference &&
      !execution.pullRequest &&
      !this.pullRequest() &&
      !this.isPublishingPullRequest(),
    );
  });

  /** Newest verification report of the goal. @public @readonly */
  public readonly latestVerificationReport = computed(() =>
    this.goal()?.verificationReports.at(-1),
  );

  /**
   * Checks of the delivery: the newest run of every workflow on the pull-request branch, or the
   * verification checks.
   *
   * @public
   * @readonly
   */
  public readonly checks = computed(() =>
    resolveWorkItemChecks(
      this.pullRequestSummary(),
      this.implementationBranch(),
      this._board.snapshot()?.ciRuns ?? [],
      this.latestVerificationReport(),
    ),
  );

  /** When the newest check started. @public @readonly */
  public readonly checksStartedAt = computed(() =>
    this.checks()
      .flatMap((check) => (check.startedAt ? [check.startedAt] : []))
      .toSorted()
      .at(-1),
  );

  /** A check whose run is in progress, to view or stop. @public @readonly */
  public readonly activeCheck = computed(() =>
    this.checks().find(
      (check) =>
        check.source === 'workflow' &&
        (check.status === 'in-progress' || check.status === 'queued'),
    ),
  );

  /**
   * The run actions the pull-request page offers for this branch - run or stop on GitHub, run or
   * stop on the local runner - without opening the pull request, which the inspector links.
   *
   * @public
   * @readonly
   */
  public readonly checkActions = computed<readonly IBoardPullRequestAction[]>(() => {
    const reference = this.pullRequest();
    if (!reference || !this._ci) return [];
    const summary = this.pullRequestSummary();
    const run = summary
      ? resolvePullRequestRun(summary, this._board.snapshot()?.ciRuns ?? [])
      : undefined;
    const localRunId = this._ci.localCiRunningRunId();
    return resolveBoardPullRequestActions(
      { reference, ...(summary ? { summary } : {}), ...(run ? { run } : {}) },
      {
        localCiEnabled: this._ci.localCiEnabledFor(
          run?.workspaceId ?? this.workItem()?.workspaceId,
        ),
        ...(localRunId ? { localRunId } : {}),
      },
    ).filter((action) => action.id !== 'open' && !action.blockedReason);
  });

  /** Whether a run action is in flight. @public @readonly */
  public readonly isCheckActionBusy = this._checkActionBusy.asReadonly();

  /** Run events of the newest run, oldest first. @public @readonly */
  public readonly events = computed(() => {
    const executionId = this.execution()?.id;
    if (!executionId) return [];
    return (this._context.snapshot()?.events ?? [])
      .filter(
        (event) =>
          event.executionId === executionId &&
          event.kind !== 'agent.progress' &&
          event.kind !== 'solver.progress',
      )
      .toSorted((left, right) => left.sequence - right.sequence);
  });

  /**
   * Opening, run events and comments in one activity, newest first.
   *
   * @public
   * @readonly
   */
  public readonly activity = computed(() =>
    resolveWorkItemActivity(this.workItem()?.createdAt, this.events(), this.comments()),
  );

  /** Agent profiles of the settings. @public @readonly */
  public readonly agents = computed(() => this._context.settings()?.agentProfiles ?? []);

  /** Agent responsible for the goal. @public @readonly */
  public readonly responsibleAgent = computed(() =>
    this.agents().find((agent) => agent.id === this.goal()?.assignment.responsibleAgentId),
  );

  /** Agent currently working on the goal. @public @readonly */
  public readonly executingAgent = computed(() =>
    this.agents().find((agent) => agent.id === this.goal()?.executingAgentId),
  );

  /**
   * Agent shown in the inspector: the one working now, else the responsible one, else the one
   * that ran the newest step.
   *
   * @public
   * @readonly
   */
  public readonly inspectorAgent = computed(() => {
    const runAgentId = this.execution()?.bindingSnapshot?.agentProfileId;
    return (
      this.executingAgent() ??
      this.responsibleAgent() ??
      this.agents().find((agent) => agent.id === runAgentId)
    );
  });

  /**
   * The state the board card shows for the item - status chip and delivery progress - resolved
   * from the same facts the board uses, so the screen and the card always agree.
   *
   * @public
   * @readonly
   */
  public readonly cardState = computed(() => {
    const item = this.workItem();
    const snapshot = this._context.snapshot();
    if (!item || !snapshot) return undefined;
    const stages = snapshot.workflow.stages;
    const executions = this.executions();
    const readiness = snapshot.workItemReadiness?.find(
      (candidate) => candidate.workItemId === item.id,
    );
    const needsAttention = workItemIdsNeedingAttention([item], executions, {
      stages,
      fields: snapshot.projectFields ?? [],
      readiness: snapshot.workItemReadiness ?? [],
    }).has(item.id);
    const reference = this.pullRequest();
    const summary = this.pullRequestSummary();
    const run = summary
      ? resolvePullRequestRun(summary, this._board.snapshot()?.ciRuns ?? [])
      : undefined;
    const coordination = this.externalCoordination();
    const agentId = this.execution()?.bindingSnapshot?.agentProfileId;
    const agentName = this.agents().find((agent) => agent.id === agentId)?.displayName;
    return resolveBoardCardState({
      item,
      stages,
      executions,
      needsAttention,
      columnLabel: this.column()?.label ?? this.stage()?.label ?? '',
      ...(readiness ? { readiness } : {}),
      ...(reference
        ? { pullRequest: { reference, ...(summary ? { summary } : {}), ...(run ? { run } : {}) } }
        : {}),
      ...(coordination
        ? {
            coordination: {
              action: coordination.action,
              ...(coordination.owner ? { owner: coordination.owner } : {}),
            },
          }
        : {}),
      ...(agentName ? { agentName } : {}),
    });
  });

  /**
   * The five delivery stages.
   *
   * @public
   * @readonly
   */
  public readonly stages = computed(() => {
    const progress = this.cardState();
    if (!progress) return [];
    const goal = this.goal();
    return resolveWorkItemStages({
      progress,
      executions: this.executions(),
      ...(goal ? { goal } : {}),
      checks: this.checks(),
      agents: this.agents(),
    });
  });

  /** Acceptance criteria of the plan. @public @readonly */
  public readonly acceptanceCriteria = computed(() =>
    resolveAcceptanceCriteria(this.workItemId(), this.goal()),
  );

  /** Number of acceptance criteria met. @public @readonly */
  public readonly acceptanceMetCount = computed(
    () => this.acceptanceCriteria().filter((criterion) => criterion.met).length,
  );

  /** Teams of the item's workspace. @public @readonly */
  public readonly workspaceTeams = computed(() => {
    const workspaceId = this.workItem()?.workspaceId;
    return (this._context.settings()?.agentTeams ?? []).filter(
      (team) => team.workspaceId === workspaceId,
    );
  });

  /** Agents of the delegated team. @public @readonly */
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
    return this.agents().filter(
      (agent) =>
        agent.workspaceId === workspaceId &&
        agent.enabled &&
        (!teamAgentIds || teamAgentIds.has(agent.id)),
    );
  });

  /** The delegated team. @public @readonly */
  public readonly goalTeam = computed(() =>
    this.workspaceTeams().find((team) => team.id === this.goal()?.assignment.agentTeamId),
  );

  /** The step this item waits to start once an execution slot frees up. @public @readonly */
  public readonly queueEntry = computed(() => {
    const id = this.workItemId();
    return (this._executionRead?.executionQueue() ?? []).find((entry) => entry.workItemId === id);
  });

  /** Whether a step runs, starts or waits in the queue. @public @readonly */
  public readonly isRunning = computed(
    () =>
      this.isStarting() ||
      this.isSolving() ||
      Boolean(this.queueEntry()) ||
      this.execution()?.state === 'queued' ||
      this.execution()?.state === 'running' ||
      this.execution()?.state === 'waiting',
  );

  /** The run in progress. @public @readonly */
  public readonly activeExecution = computed(() => {
    const execution = this.execution();
    return execution?.state === 'queued' ||
      execution?.state === 'running' ||
      execution?.state === 'waiting'
      ? execution
      : undefined;
  });

  /** Ownership held by another orchestrator. @public @readonly */
  public readonly externalCoordination = computed(() => {
    const coordination = activeWorkItemCoordination(this.workItem()?.coordination, new Date());
    if (!coordination) return undefined;
    const isOwnedLocally = (this._context.snapshot()?.executions ?? []).some(
      (execution) => execution.workItemClaim?.id === coordination.claimId,
    );
    return isOwnedLocally ? undefined : coordination;
  });

  /** Decisions the current human gate offers. @public @readonly */
  public readonly gateDecisions = computed(() => {
    const stage = this.stage();
    return stage?.kind === 'human-gate' ? (stage.decisions ?? []) : [];
  });

  /** Whether the item's stage runs the analysis. @public @readonly */
  public readonly runsAnalysisStep = computed(() => this.stageRunsRole('analyze'));
  /** Whether the item's stage runs the implementation. @public @readonly */
  public readonly runsSolutionStep = computed(() => this.stageRunsRole('solve'));

  /** Whether an analysis the implementation can start from exists. @public @readonly */
  public readonly hasSuccessfulAnalysis = computed(() =>
    this.executions().some((execution) => isCompletedAnalysis(execution)),
  );

  /** Why no step can be started here, so the controls are never an empty box. @public @readonly */
  public readonly noStepReason = computed(() => {
    if (this.runsAnalysisStep()) return undefined;
    const stage = this.stage();
    const label = stage?.label ?? 'This stage';
    if (stage?.kind === 'human-gate') {
      return `${label} waits for a decision, not for a run. Choose one above to release the item for technical work.`;
    }
    if (!this.runsSolutionStep()) {
      return `${label} runs neither the analysis nor the implementation. Move the item to a stage that does — the findings at the top of this screen name which one.`;
    }
    return this.hasSuccessfulAnalysis()
      ? undefined
      : `${label} implements, and an implementation always starts from a completed analysis. This item has none, so no step can be started here.`;
  });

  /**
   * Everything wrong with the item, from the same inspection the board cards use.
   *
   * @public
   * @readonly
   */
  public readonly health = computed<IWorkItemHealth | undefined>(() => {
    const item = this.workItem();
    const snapshot = this._context.snapshot();
    // Field definitions arrive with the editor metadata, which is store-wide: while this screen
    // hydrates it may still describe another item, so nothing is reported until it is current.
    if (!item || !snapshot || !this.editor.metadata() || this.isHydrating()) return undefined;
    const column = snapshot.boardColumns?.find(
      (candidate) => candidate.id === item.boardColumnId,
    )?.label;
    const readiness = snapshot.workItemReadiness?.find(
      (candidate) => candidate.workItemId === item.id,
    );
    const health = inspectWorkItem(item, {
      stages: snapshot.workflow.stages,
      fields: this.editor.projectFields(),
      executions: snapshot.executions.filter((execution) => execution.workItemId === item.id),
      ...(readiness ? { readiness } : {}),
      ...(column ? { boardColumnLabel: column } : {}),
    });
    return health.severity ? health : undefined;
  });

  /** Field repairs the findings offer. @public @readonly */
  public readonly repairs = computed<readonly IWorkItemFieldRepair[]>(
    () => this.health()?.repairs ?? [],
  );

  /** Whether the edited values can be saved. @public @readonly */
  public readonly canSave = computed(
    () => !this.isSaving() && Boolean(this.workItem()) && this.editor.hasRequiredValues(),
  );

  /** Analysis skill of the item's board. @public @readonly */
  public readonly analysisSkill = computed(() => this.editor.metadata()?.analysisSkill);
  /** Implementation skill of the item's board. @public @readonly */
  public readonly solutionSkill = computed(() => this.editor.metadata()?.solutionSkill);
  /** Whether an analysis skill is assigned. @public @readonly */
  public readonly hasAnalysisSkill = computed(() => Boolean(this.analysisSkill()));
  /** Whether an implementation skill is assigned. @public @readonly */
  public readonly hasSolutionSkill = computed(() => Boolean(this.solutionSkill()));

  /** Whether the next implementation is a revision that needs feedback. @public @readonly */
  public readonly requiresFeedback = computed(
    () => this.solutionExecution()?.state === 'succeeded',
  );

  /** Whether the analysis step can start. @public @readonly */
  public readonly canStart = computed(() => {
    if (!this.executionAvailable) return false;
    return (
      !this.isRunning() &&
      !this.externalCoordination() &&
      this.stageRunsRole('analyze') &&
      (this.analysisInputMode() === 'manual'
        ? this.manualAnalysis().trim().length > 0
        : this.hasAnalysisSkill())
    );
  });

  /** Whether the implementation step can start. @public @readonly */
  public readonly canSolve = computed(() => {
    if (!this.executionAvailable) return false;
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

  /** Skill that produced the newest analysis. @public @readonly */
  public readonly analysisResultSkill = computed(() =>
    this.executionSkill(this.analysisExecution()?.skillId),
  );
  /** Skill that produced the newest implementation. @public @readonly */
  public readonly solutionResultSkill = computed(() =>
    this.executionSkill(this.solutionExecution()?.skillId),
  );
  /** Whether the newest analysis came from an agent. @public @readonly */
  public readonly analysisResultIsAi = computed(() =>
    this.executionUsesAi(this.analysisExecution()),
  );
  /** Whether the newest implementation came from an agent. @public @readonly */
  public readonly solutionResultIsAi = computed(() =>
    this.executionUsesAi(this.solutionExecution()),
  );

  /**
   * Skill shown in the inspector: the one the newest run used, else the one the stage would use.
   *
   * @public
   * @readonly
   */
  public readonly currentSkill = computed(() => {
    const execution = this.execution();
    if (execution?.skillSnapshot) {
      return {
        name: execution.skillSnapshot.displayName || execution.skillSnapshot.name,
        role: execution.skillFlowRole ?? (execution.kind === 'analysis' ? 'analysis' : 'solution'),
      };
    }
    if (this.runsAnalysisStep() && this.analysisSkill()) {
      return { name: this.analysisSkill()!.name, role: 'analysis' };
    }
    if (this.runsSolutionStep() && this.solutionSkill()) {
      return { name: this.solutionSkill()!.name, role: 'solution' };
    }
    return undefined;
  });

  private readonly _voiceState = computed(() => {
    const target = this._voiceTarget();
    return (candidate: AiPromptTarget) => (target === candidate ? 'recording' : 'idle');
  });
  private readonly _backToBoardCommand = new Command<void>(
    () => void this._router.navigate(['/main/board']),
  );
  private readonly _openWorkItemCommand = new Command<void>(() =>
    this._externalLinks.open(this.workItemUrl()),
  );
  private readonly _viewCheckLogCommand = new Command<IWorkItemCheck>((check) =>
    this._externalLinks.open(check.externalUrl),
  );
  private readonly _executeCheckActionCommand = new Command<IBoardPullRequestAction>(
    (action) => void this.onExecuteCheckAction(action),
    computed(() => !this._checkActionBusy()),
  );
  private readonly _updateCommentDraftCommand = new Command<unknown>((event) =>
    this.writeText(this.commentDraft, event),
  );
  private readonly _publishCommentCommand = new Command<unknown>(
    (event) => void this.onExecutePublishComment(event),
    computed(() => !this.isCommenting() && Boolean(this.workItem())),
  );
  private readonly _toggleContentEditingCommand = new Command<void>(() => {
    this._contentEditSession.set(true);
    this._contentEditing.update((editing) => !editing);
  });
  private readonly _cancelContentEditingCommand = new Command<unknown>(() =>
    this.cancelContentEditing(),
  );
  private readonly _saveCommand = new Command<void>(() => void this.onExecuteSave());
  private readonly _applyRepairsCommand = new Command<void>(
    () => void this.onExecuteApplyRepairs(),
  );
  private readonly _decideCommand = new Command<string>(
    (optionId) => void this.onExecuteDecide(optionId),
  );
  private readonly _updateAnalysisPromptCommand = new Command<unknown>((event) =>
    this.writeText(this.analysisPrompt, event),
  );
  private readonly _updateSolutionPromptCommand = new Command<unknown>((event) =>
    this.writeText(this.solutionPrompt, event),
  );
  private readonly _updateManualAnalysisCommand = new Command<unknown>((event) =>
    this.writeText(this.manualAnalysis, event),
  );
  private readonly _updateManualSolutionCommand = new Command<unknown>((event) =>
    this.writeText(this.manualSolution, event),
  );
  private readonly _selectAnalysisInputModeCommand = new Command<WorkflowInputMode>((mode) =>
    this.analysisInputMode.set(mode),
  );
  private readonly _selectSolutionInputModeCommand = new Command<WorkflowInputMode>((mode) =>
    this.solutionInputMode.set(mode),
  );
  private readonly _updateDelegatedTeamCommand = new Command<unknown>((event) =>
    this.onExecuteUpdateDelegatedTeam(event),
  );
  private readonly _updateResponsibleAgentCommand = new Command<unknown>((event) => {
    const value = String(readEventValue(event) ?? '');
    if (this.workspaceAgents().some((agent) => agent.id === value)) {
      this.responsibleAgentId.set(value);
    }
  });
  private readonly _delegateGoalCommand = new Command<void>(
    () => void this.onExecuteDelegateGoal(),
  );
  private readonly _reviewGoalCommand = new Command<'approved' | 'revision-required' | 'blocked'>(
    (decision) => void this.onExecuteReviewGoal(decision),
  );
  private readonly _startTaskCommand = new Command<void>(() => void this.onExecuteStartTask());
  private readonly _startSolutionCommand = new Command<void>(
    () => void this.onExecuteStartSolution(),
  );
  private readonly _removeQueueEntryCommand = new Command<void>(
    () => void this.onExecuteRemoveQueueEntry(),
  );
  private readonly _cancelActiveExecutionCommand = new Command<void>(
    () => void this.onExecuteCancelActiveExecution(),
  );
  private readonly _publishPullRequestCommand = new Command<void>(
    () => void this.onExecutePublishPullRequest(),
  );
  private readonly _openSkillsCommand = new Command<void>(
    () => void this._router.navigate(['/main/settings'], { queryParams: { section: 'skills' } }),
    computed(() => this.skillsAvailable),
  );
  private readonly _startVoiceInputCommand = new Command<AiPromptTarget>((target) =>
    this.onExecuteStartVoiceInput(target),
  );
  private readonly _stopVoiceInputCommand = new Command<void>(
    () => void this._speechRecognition.stop(),
  );
  private readonly _cancelVoiceInputCommand = new Command<void>(() => {
    this._voiceTarget.set(undefined);
    void this._speechRecognition.cancel();
  });

  // #endregion

  // #region Ctor

  /** @public */
  public constructor() {
    super();
    inject(DestroyRef).onDestroy(() => void this._speechRecognition.cancel());
    // The router reuses this screen when only the id changes (back, forward, another link), so
    // the next item hydrates in place instead of showing the previous one.
    effect(() => {
      const id = this.workItemId();
      untracked(() => {
        const hydrated = this._hydratedId();
        if (hydrated !== undefined && hydrated !== id) this.initialize();
      });
    });
  }

  // #endregion

  // #region Properties

  /** Speech state per prompt. @public @readonly */
  public get voiceState(): Signal<(target: AiPromptTarget) => 'recording' | 'idle'> {
    return this._voiceState;
  }

  /** Returns to the board. @public @readonly */
  public get backToBoardCommand(): Command<void> {
    return this._backToBoardCommand;
  }

  /** Opens the item where its provider keeps it. @public @readonly */
  public get openWorkItemCommand(): Command<void> {
    return this._openWorkItemCommand;
  }

  /** Opens a check's log on GitHub. @public @readonly */
  public get viewCheckLogCommand(): Command<IWorkItemCheck> {
    return this._viewCheckLogCommand;
  }

  /** Runs or stops the branch's workflow run on GitHub or the local runner. @public @readonly */
  public get executeCheckActionCommand(): Command<IBoardPullRequestAction> {
    return this._executeCheckActionCommand;
  }

  /** Writes the comment box. @public @readonly */
  public get updateCommentDraftCommand(): Command<unknown> {
    return this._updateCommentDraftCommand;
  }

  /** Publishes the comment into the provider discussion. @public @readonly */
  public get publishCommentCommand(): Command<unknown> {
    return this._publishCommentCommand;
  }

  /** Switches between reading and editing title, description and fields. @public @readonly */
  public get toggleContentEditingCommand(): Command<void> {
    return this._toggleContentEditingCommand;
  }

  /** Discards the edit session. @public @readonly */
  public get cancelContentEditingCommand(): Command<unknown> {
    return this._cancelContentEditingCommand;
  }

  /** Saves the edit session. @public @readonly */
  public get saveCommand(): Command<void> {
    return this._saveCommand;
  }

  /** Writes every field repair the findings offer. @public @readonly */
  public get applyRepairsCommand(): Command<void> {
    return this._applyRepairsCommand;
  }

  /** Takes a decision of the human gate. @public @readonly */
  public get decideCommand(): Command<string> {
    return this._decideCommand;
  }

  /** Writes the analysis focus. @public @readonly */
  public get updateAnalysisPromptCommand(): Command<unknown> {
    return this._updateAnalysisPromptCommand;
  }

  /** Writes the revision feedback. @public @readonly */
  public get updateSolutionPromptCommand(): Command<unknown> {
    return this._updateSolutionPromptCommand;
  }

  /** Writes the manual analysis. @public @readonly */
  public get updateManualAnalysisCommand(): Command<unknown> {
    return this._updateManualAnalysisCommand;
  }

  /** Writes the manual implementation notes. @public @readonly */
  public get updateManualSolutionCommand(): Command<unknown> {
    return this._updateManualSolutionCommand;
  }

  /** Chooses manual or AI analysis. @public @readonly */
  public get selectAnalysisInputModeCommand(): Command<WorkflowInputMode> {
    return this._selectAnalysisInputModeCommand;
  }

  /** Chooses manual or AI implementation. @public @readonly */
  public get selectSolutionInputModeCommand(): Command<WorkflowInputMode> {
    return this._selectSolutionInputModeCommand;
  }

  /** Chooses the delivery team. @public @readonly */
  public get updateDelegatedTeamCommand(): Command<unknown> {
    return this._updateDelegatedTeamCommand;
  }

  /** Chooses the responsible agent. @public @readonly */
  public get updateResponsibleAgentCommand(): Command<unknown> {
    return this._updateResponsibleAgentCommand;
  }

  /** Assigns the item to the AI team. @public @readonly */
  public get delegateGoalCommand(): Command<void> {
    return this._delegateGoalCommand;
  }

  /** Accepts the work or requests changes. @public @readonly */
  public get reviewGoalCommand(): Command<'approved' | 'revision-required' | 'blocked'> {
    return this._reviewGoalCommand;
  }

  /** Starts or records the analysis. @public @readonly */
  public get startTaskCommand(): Command<void> {
    return this._startTaskCommand;
  }

  /** Starts or records the implementation. @public @readonly */
  public get startSolutionCommand(): Command<void> {
    return this._startSolutionCommand;
  }

  /** Removes the queued step. @public @readonly */
  public get removeQueueEntryCommand(): Command<void> {
    return this._removeQueueEntryCommand;
  }

  /** Cancels the run in progress. @public @readonly */
  public get cancelActiveExecutionCommand(): Command<void> {
    return this._cancelActiveExecutionCommand;
  }

  /** Publishes the implementation as a pull request. @public @readonly */
  public get publishPullRequestCommand(): Command<void> {
    return this._publishPullRequestCommand;
  }

  /** Opens Settings at Skills. @public @readonly */
  public get openSkillsCommand(): Command<void> {
    return this._openSkillsCommand;
  }

  /** Starts speech input into a prompt. @public @readonly */
  public get startVoiceInputCommand(): Command<AiPromptTarget> {
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
   * Loads the board when the screen is opened directly, then the complete item and the metadata
   * it is edited against.
   *
   * @public
   */
  public override async onHydrate(): Promise<void> {
    const id = this.workItemId();
    this.resetSession();
    await hydrateBoardRoute(this._boardRoute);
    if (!this._context.snapshot()?.workItems.some((item) => item.id === id)) {
      this._hydratedId.set(id);
      return;
    }
    this._work.selectWorkItem(id);
    await this._work.loadWorkItemDetails(id);
    const item = this.workItem();
    if (item) {
      this._loadedComments.set(item.comments ?? []);
      this.editor.reset(item);
      const goal = this.goal();
      const team =
        this.workspaceTeams().find((candidate) => candidate.id === goal?.assignment.agentTeamId) ??
        this.workspaceTeams()[0];
      this.delegatedTeamId.set(team?.id ?? '');
      const agent =
        this.workspaceAgents().find(
          (candidate) => candidate.id === goal?.assignment.responsibleAgentId,
        ) ?? this.workspaceAgents()[0];
      this.responsibleAgentId.set(agent?.id ?? '');
      this.goalObjective.set(goal?.assignment.objective ?? item.title);
    }
    await this.editor.loadMetadata(item);
    this._hydratedId.set(id);
  }

  private resetSession(): void {
    this._contentEditing.set(false);
    this._contentEditSession.set(false);
    this._loadedComments.set([]);
    this.commentDraft.set('');
    this.analysisPrompt.set('');
    this.solutionPrompt.set('');
    this.manualAnalysis.set('');
    this.manualSolution.set('');
    this.analysisInputMode.set('manual');
    this.solutionInputMode.set('manual');
  }

  private stageRunsRole(role: 'analyze' | 'solve'): boolean {
    const snapshot = this._context.snapshot();
    if (!snapshot) return false;
    return stageExecutesRole(snapshot.workflow.stages, this.workItem()?.stageId, role);
  }

  private writeText(target: WritableSignal<string>, event: unknown): void {
    const value = readEventText(event);
    if (value !== undefined) target.set(value);
  }

  private cancelContentEditing(): void {
    const item = this.workItem();
    if (!item) return;
    this.editor.reset(item);
    this._contentEditing.set(false);
    this._contentEditSession.set(false);
  }

  /**
   * Saves the edit session. A repair keeps the session closed and the screen in place, so the
   * person sees the findings disappear.
   */
  private async onExecuteSave(): Promise<void> {
    const item = this.workItem();
    if (!item || !this.canSave()) return;
    const saved = await this._work.updateWorkItem(item.id, this.editor.toMutation(item));
    if (!saved) return;
    this._contentEditing.set(false);
    this._contentEditSession.set(false);
  }

  /**
   * Writes every repair the findings offer in one update. A repair only restores a value
   * Symphony can derive, so it never overwrites a decision a person made.
   */
  private async onExecuteApplyRepairs(): Promise<void> {
    const item = this.workItem();
    const repairs = this.repairs();
    if (!item || !repairs.length || this.isRepairing() || this.isRunning()) return;
    this.isRepairing.set(true);
    try {
      for (const repair of repairs) this.editor.replaceProjectFieldValue(repair.value);
      await this._work.updateWorkItem(item.id, this.editor.toMutation(item));
    } finally {
      this.isRepairing.set(false);
    }
  }

  private async onExecuteDecide(optionId: string): Promise<void> {
    const workItemId = this.workItem()?.id;
    if (!this.workflowAvailable || !workItemId) return;
    await this._work.decideWorkflow(workItemId, optionId);
  }

  private onExecuteUpdateDelegatedTeam(event: unknown): void {
    const value = String(readEventValue(event) ?? '');
    if (!this.workspaceTeams().some((team) => team.id === value)) return;
    this.delegatedTeamId.set(value);
    if (!this.workspaceAgents().some((agent) => agent.id === this.responsibleAgentId())) {
      this.responsibleAgentId.set(this.workspaceAgents()[0]?.id ?? '');
    }
  }

  private async onExecuteDelegateGoal(): Promise<void> {
    const workItemId = this.workItem()?.id;
    if (!this.executionAvailable || !workItemId) return;
    if (!this.delegatedTeamId() || !this.responsibleAgentId()) return;
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

  private async onExecuteReviewGoal(
    decision: 'approved' | 'revision-required' | 'blocked',
  ): Promise<void> {
    const workItemId = this.workItem()?.id;
    if (!this.executionAvailable || !workItemId) return;
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
        await this.onExecuteStartSolution();
      }
    } finally {
      this.delegationBusy.set(false);
    }
  }

  private async onExecuteStartTask(): Promise<void> {
    const id = this.workItem()?.id;
    if (!id || !this.canStart()) return;
    this.isStarting.set(true);
    try {
      if (this.analysisInputMode() === 'manual') {
        const completed = await this._work.completeManualAnalysis(id, this.manualAnalysis().trim());
        if (completed) this.manualAnalysis.set('');
      } else {
        const approval = await this._localExecutionApproval.request(this.workItem());
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

  private async onExecuteStartSolution(): Promise<void> {
    const id = this.workItem()?.id;
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
      this._notifications.showWarning(
        'Describe the requested changes.',
        'Add feedback before starting an AI revision.',
      );
      return;
    }
    this.isSolving.set(true);
    try {
      const approval = await this._localExecutionApproval.request(this.workItem());
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

  private async onExecuteRemoveQueueEntry(): Promise<void> {
    const entry = this.queueEntry();
    if (!entry || this.isRemovingQueueEntry()) return;
    this.isRemovingQueueEntry.set(true);
    try {
      await this._work.removeQueueEntry(entry.id);
    } finally {
      this.isRemovingQueueEntry.set(false);
    }
  }

  private async onExecuteCancelActiveExecution(): Promise<void> {
    const execution = this.activeExecution();
    if (!execution || this.isCancellingExecution()) return;
    this.isCancellingExecution.set(true);
    try {
      await this._work.cancelExecution(execution.id);
    } finally {
      this.isCancellingExecution.set(false);
    }
  }

  private async onExecutePublishPullRequest(): Promise<void> {
    const execution = this.solutionExecution();
    if (!execution || !this.canPublishPullRequest()) return;
    await this._work.publishPullRequest(execution.id);
  }

  private async onExecuteCheckAction(action: IBoardPullRequestAction): Promise<void> {
    const runId = action.runId;
    if (!this._ci || !runId || action.blockedReason) return;
    this._checkActionBusy.set(true);
    try {
      if (action.id === 'remote') {
        await (action.cancels ? this._ci.cancelCiRun(runId) : this._ci.rerunCiRun(runId));
      } else if (action.id === 'local') {
        await (action.cancels ? this._ci.cancelLocalCiRun(runId) : this._ci.runCiLocally(runId));
      }
    } finally {
      this._checkActionBusy.set(false);
    }
  }

  /**
   * Writes the comment into the provider discussion. A refused comment goes back into the box:
   * text a person wrote is never dropped because the provider said no.
   */
  private async onExecutePublishComment(event: unknown): Promise<void> {
    const id = this.workItem()?.id;
    const body = (readEventText(event) ?? this.commentDraft()).trim();
    if (!id || !body) return;
    const commented = await this._work.commentOnWorkItem(id, body);
    if (!commented) {
      await this.restoreSubmitted(this.commentDraft, body);
      return;
    }
    this._loadedComments.set(commented.comments ?? []);
    this.commentDraft.set('');
  }

  private onExecuteStartVoiceInput(target: AiPromptTarget): void {
    if (this._voiceTarget()) return;
    this._voiceTarget.set(target);
    const prompt = target === 'analysis' ? this.analysisPrompt : this.solutionPrompt;
    void this._speechRecognition.start(
      (transcript) =>
        prompt.update((current) => [current.trim(), transcript].filter(Boolean).join(' ')),
      () => this._voiceTarget.set(undefined),
    );
  }

  /**
   * Puts a refused submission back into its box. The box empties itself on submit, so the value
   * has to leave the signal for one frame before the same text is accepted again.
   */
  private async restoreSubmitted(target: WritableSignal<string>, value: string): Promise<void> {
    target.set('');
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    target.set(value);
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

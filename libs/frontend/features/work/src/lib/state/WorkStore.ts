// #region Imports

import { computed, Inject, inject, Injectable, Optional, signal, type Signal } from '@angular/core';
import type { IDeliveryGroup, IDeliveryGroupProposal } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import { NotificationService, operatorErrorMessage } from '@symphony/frontend-notification';
import {
  OPERATION_ID_PROVIDER,
  WORK_SELECTION,
  type IWorkOperations,
  type IWorkSelection,
} from '@symphony/frontend-core/work';
import type { RequestPayload } from '@symphony/ipc-contracts-composition';
import type {
  IssueDraftDto,
  WorkItemEditorMetadataDto,
  WorkItemMutationDto,
} from '@symphony/ipc-contracts-work';
import type { WorkflowProcessDto } from '@symphony/ipc-contracts-workflow';
import type { IWorkClient } from '../ports/IWorkClient';
import type { IWorkContext } from '../ports/IWorkContext';
import type { IWorkProjection } from '../ports/IWorkProjection';
import type { IWorkRefresh } from '../ports/IWorkRefresh';
import { WORK_CLIENT } from '../ports/WorkClientToken';
import { WORK_CONTEXT } from '../ports/WorkContextToken';
import { WORK_EXECUTION } from '../ports/WorkExecutionToken';
import type { IWorkExecution } from '../ports/IWorkExecution';
import type { IWorkflowOperations } from '@symphony/frontend-core/workflow';
import { WORK_WORKFLOW } from '../ports/WorkWorkflowToken';
import { WORK_PROJECTION } from '../ports/WorkProjectionToken';
import { WORK_REFRESH } from '../ports/WorkRefreshToken';

// #endregion

/**
 * Owns Work mutations, editor state and drafting without a writable Core state dependency.
 *
 * @public
 */
@Injectable()
export class WorkStore implements IWorkOperations {
  // #region Fields

  private readonly _context: IWorkContext;
  private readonly _projection: IWorkProjection;
  private readonly _refresh: IWorkRefresh;
  private readonly _execution: IWorkExecution | null;
  private readonly _workflow: IWorkflowOperations | null;
  private readonly _selection: IWorkSelection;
  private readonly _client: IWorkClient;
  private readonly _notifications: Pick<
    NotificationService,
    'showSuccess' | 'showError' | 'showInfo'
  >;
  private readonly _createOperationId: () => string;
  private readonly _issueDraftOperationId = signal<string | undefined>(undefined);
  private readonly _cancelledIssueDrafts = new Set<string>();
  private readonly _workItemMetadata = signal<WorkItemEditorMetadataDto | undefined>(undefined);
  private readonly _workItemsBusy = signal(false);
  private readonly _workItemCommentBusy = signal(false);
  private readonly _issueDraftBusy = signal(false);
  private readonly _publicWorkItemMetadata = this._workItemMetadata.asReadonly();
  private readonly _publicWorkItemsBusy: Signal<boolean>;
  private readonly _publicWorkItemCommentBusy = this._workItemCommentBusy.asReadonly();
  private readonly _publicIssueDraftBusy = this._issueDraftBusy.asReadonly();
  private readonly _selectedWorkItem: Signal<IWorkItem | undefined>;

  // #endregion

  // #region Ctor

  /** Connects Work's bounded operation and projection dependencies. @public */
  public constructor(
    @Inject(WORK_CONTEXT) context: IWorkContext = inject(WORK_CONTEXT),
    @Inject(WORK_PROJECTION) projection: IWorkProjection = inject(WORK_PROJECTION),
    @Inject(WORK_REFRESH) refresh: IWorkRefresh = inject(WORK_REFRESH),
    @Optional()
    @Inject(WORK_EXECUTION)
    execution: IWorkExecution | null = inject(WORK_EXECUTION, { optional: true }),
    @Optional()
    @Inject(WORK_WORKFLOW)
    workflow: IWorkflowOperations | null = inject(WORK_WORKFLOW, { optional: true }),
    @Inject(WORK_SELECTION) selection: IWorkSelection = inject(WORK_SELECTION),
    @Inject(WORK_CLIENT) client: IWorkClient = inject(WORK_CLIENT),
    @Inject(NotificationService)
    notifications: Pick<NotificationService, 'showSuccess' | 'showError' | 'showInfo'> = inject(
      NotificationService,
    ),
    @Inject(OPERATION_ID_PROVIDER) createOperationId: () => string = inject(OPERATION_ID_PROVIDER),
  ) {
    this._context = context;
    this._projection = projection;
    this._refresh = refresh;
    this._execution = execution;
    this._workflow = workflow;
    this._publicWorkItemsBusy = computed(
      () => this._workItemsBusy() || (workflow?.workflowBusy() ?? false),
    );
    this._selection = selection;
    this._client = client;
    this._notifications = notifications;
    this._createOperationId = createOperationId;
    this._selectedWorkItem = computed(() =>
      context.items().find((item) => item.id === selection.selectedWorkItemId()),
    );
  }

  // #endregion

  // #region Properties

  /** Whether the actual Execution command owner is included. @public @readonly */
  public get executionAvailable(): boolean {
    return this._execution !== null;
  }
  /** Whether the actual Workflow command owner is included. @public @readonly */
  public get workflowAvailable(): boolean {
    return this._workflow !== null;
  }
  /** Whether execution can delegate to its actual Delivery publication owner. @public @readonly */
  public get publicationAvailable(): boolean {
    return this._execution?.publicationAvailable ?? false;
  }

  /** Current feature-owned workItemMetadata. @public @readonly */
  public get workItemMetadata(): Signal<WorkItemEditorMetadataDto | undefined> {
    return this._publicWorkItemMetadata;
  }

  /** Current feature-owned workItemsBusy. @public @readonly */
  public get workItemsBusy(): Signal<boolean> {
    return this._publicWorkItemsBusy;
  }

  /** Current feature-owned workItemCommentBusy. @public @readonly */
  public get workItemCommentBusy(): Signal<boolean> {
    return this._publicWorkItemCommentBusy;
  }

  /** Current feature-owned issueDraftBusy. @public @readonly */
  public get issueDraftBusy(): Signal<boolean> {
    return this._publicIssueDraftBusy;
  }

  /** Current item selected in the authoritative snapshot. @public @readonly */
  public get selectedWorkItem(): Signal<IWorkItem | undefined> {
    return this._selectedWorkItem;
  }

  // #endregion

  // #region Methods

  /** Records an explicit operator selection. @public */
  public selectWorkItem(workItemId: string | undefined): void {
    this._selection.select(workItemId);
  }

  /**
   * Loads the work item details.
   *
   * @param workItemId - Work item id.
   * @public
   */
  public async loadWorkItemDetails(workItemId: string): Promise<boolean> {
    try {
      const workItem = await this._client.request('work-items.detail', { workItemId });
      this._projection.replaceItem(workItem);
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to load work-item details.');
      return false;
    }
  }

  /**
   * Loads the work item metadata.
   *
   * @param repository - Repository.
   * @param workspaceId - Workspace id.
   * @param sourceId - Source id.
   * @public
   */
  public async loadWorkItemMetadata(
    repository?: string,
    workspaceId?: string,
    sourceId?: string,
  ): Promise<boolean> {
    this._workItemsBusy.set(true);
    try {
      const scope = {
        ...(repository?.trim() ? { repository: repository.trim() } : {}),
        ...(workspaceId?.trim() ? { workspaceId: workspaceId.trim() } : {}),
        ...(sourceId?.trim() ? { sourceId: sourceId.trim() } : {}),
      };
      this._workItemMetadata.set(await this._client.request('work-items.metadata', scope));
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to load work-item metadata.');
      return false;
    } finally {
      this._workItemsBusy.set(false);
    }
  }

  /**
   * Assignable people of one editor scope, fetched without touching `workItemMetadata`: that
   * signal belongs to the open editor drawer, and a board card menu asking for another
   * repository must not swap the drawer's option lists or flash its busy state mid-edit.
   *
   * @param repository - Repository.
   * @param workspaceId - Workspace id.
   * @param sourceId - Source id.
   * @param notifyOnFailure - Whether a user-triggered request should surface a toast.
   * @public
   */
  public async loadAssignableUsers(
    repository?: string,
    workspaceId?: string,
    sourceId?: string,
    notifyOnFailure = true,
  ): Promise<WorkItemEditorMetadataDto['assignees'] | undefined> {
    try {
      const metadata = await this._client.request('work-items.metadata', {
        ...(repository?.trim() ? { repository: repository.trim() } : {}),
        ...(workspaceId?.trim() ? { workspaceId: workspaceId.trim() } : {}),
        ...(sourceId?.trim() ? { sourceId: sourceId.trim() } : {}),
      });
      return metadata.assignees;
    } catch (cause) {
      if (notifyOnFailure) this.showError(cause, 'Unable to load the assignable users.');
      return undefined;
    }
  }

  /**
   * Creates the work item.
   *
   * @param item - Item.
   * @public
   */
  public async createWorkItem(item: WorkItemMutationDto): Promise<IWorkItem | undefined> {
    return this.mutateWorkItem('work-items.create', { item }, 'Work item created.');
  }

  /**
   * Updates the work item.
   *
   * @param workItemId - Work item id.
   * @param item - Item.
   * @public
   */
  public async updateWorkItem(
    workItemId: string,
    item: WorkItemMutationDto,
  ): Promise<IWorkItem | undefined> {
    return this.mutateWorkItem('work-items.update', { workItemId, item }, 'Work item updated.');
  }

  /**
   * Writes one comment into the provider discussion of a work item and answers with the item as
   * it reads afterwards, thread included.
   *
   * @param workItemId - Work item id.
   * @param body - Body.
   * @public
   */
  public async commentOnWorkItem(workItemId: string, body: string): Promise<IWorkItem | undefined> {
    this._workItemCommentBusy.set(true);
    try {
      const commented = await this._client.request('work-items.comment', { workItemId, body });
      this._projection.replaceItem(commented);
      this._notifications.showSuccess('Comment published.');
      return commented;
    } catch (cause) {
      this.showError(cause, 'Unable to publish the comment.');
      return undefined;
    } finally {
      this._workItemCommentBusy.set(false);
    }
  }

  /**
   * Moves one work item to another board column. The selection is left alone: moving a card
   * from the board is not opening it, and pulling the drawer onto a card an operator only
   * pushed sideways is a jump they did not ask for.
   *
   * @param workItemId - Work item id.
   * @param boardColumnId - Board column id.
   * @param columnLabel - Column label.
   * @public
   */
  public async moveWorkItem(
    workItemId: string,
    boardColumnId: string,
    columnLabel?: string,
  ): Promise<boolean> {
    const previous = this._context.items().find((candidate) => candidate.id === workItemId);
    const overtakenRefresh = this.refreshStartedBeforeMutation();
    // The card moves as soon as the operator drops it. Writing the column at the provider is a
    // network round trip, and holding the card in the column it just left for the length of
    // that trip reads as a dropped interaction; a rejected write puts it back.
    if (previous) this._projection.replaceItem(this.withBoardColumn(previous, boardColumnId));
    try {
      const moved = await this._client.request('work-items.move', { workItemId, boardColumnId });
      this._projection.replaceItem(moved);
      this._notifications.showSuccess(
        columnLabel ? `Moved to ${columnLabel}.` : 'Work item moved.',
      );
      return true;
    } catch (cause) {
      if (previous) this._projection.replaceItem(previous);
      this.showError(cause, 'Unable to move the work item.');
      return false;
    } finally {
      overtakenRefresh();
    }
  }

  /**
   * Drafts the issue.
   *
   * @param payload - Payload.
   * @public
   */
  public async draftIssue(
    payload: Omit<RequestPayload<'work-items.draft'>, 'operationId'>,
  ): Promise<IssueDraftDto | undefined> {
    const operationId = this._createOperationId();
    this._issueDraftOperationId.set(operationId);
    this._issueDraftBusy.set(true);
    try {
      const draft = await this._client.request('work-items.draft', {
        ...payload,
        operationId,
      });
      this._notifications.showSuccess('Issue draft ready.', 'Review it before saving.');
      return draft;
    } catch (cause) {
      if (!this._cancelledIssueDrafts.has(operationId)) {
        this.showError(cause, 'Unable to draft the work item.');
      }
      return undefined;
    } finally {
      if (this._issueDraftOperationId() === operationId) {
        this._issueDraftOperationId.set(undefined);
        this._issueDraftBusy.set(false);
      }
      this._cancelledIssueDrafts.delete(operationId);
    }
  }

  /**
   * Cancels the issue draft.
   *
   * @public
   */
  public async cancelIssueDraft(): Promise<boolean> {
    const operationId = this._issueDraftOperationId();
    if (!operationId) return false;
    this._cancelledIssueDrafts.add(operationId);
    try {
      const result = await this._client.request('work-items.draft.cancel', { operationId });
      if (result.cancelled) {
        this._notifications.showInfo('Issue drafting cancelled.');
      }
      return result.cancelled;
    } catch (cause) {
      this._cancelledIssueDrafts.delete(operationId);
      this.showError(cause, 'Unable to cancel issue drafting.');
      return false;
    }
  }

  /**
   * Moves a delivery group as one board entry. The root owns the provider transition; once that
   * succeeds, the existing alignment operation brings every remaining member to the same column.
   *
   * @param deliveryGroupId - Delivery group identifier.
   * @param rootWorkItemId - Root work item identifier.
   * @param boardColumnId - Provider column identifier.
   * @param columnLabel - Human-readable column label.
   * @public
   */
  public async moveDeliveryGroup(
    deliveryGroupId: string,
    rootWorkItemId: string,
    boardColumnId: string,
    columnLabel?: string,
  ): Promise<boolean> {
    if (!(await this.moveWorkItem(rootWorkItemId, boardColumnId, columnLabel))) return false;
    return this.alignDeliveryGroup(deliveryGroupId);
  }

  /**
   * Projects one work item into a board column, carrying the stage that column stands for. A
   * column without a mapped stage leaves the item unstaged rather than keeping the stage of the
   * column it just left.
   */
  private withBoardColumn(workItem: IWorkItem, boardColumnId: string): IWorkItem {
    const stageId = this._context
      .boardColumns()
      .find((candidate) => candidate.id === boardColumnId)?.stageId;
    return { ...workItem, boardColumnId, stageId };
  }

  /**
   * Repeats a board refresh that was already in flight when a work item was written.
   *
   * Such a refresh read the provider before the write reached it, and it replaces the whole
   * work-item list when it lands - which is how a just created card, or one just moved to
   * another column, silently disappears again until the next refresh.
   */
  private refreshStartedBeforeMutation(): () => void {
    return this._refresh.repeatAfterActiveRefresh();
  }

  private async mutateWorkItem<M extends 'work-items.create' | 'work-items.update'>(
    method: M,
    payload: RequestPayload<M>,
    message: string,
  ): Promise<IWorkItem | undefined> {
    this._workItemsBusy.set(true);
    const overtakenRefresh = this.refreshStartedBeforeMutation();
    try {
      const updated = await this._client.request(method, payload);
      // The board renders its columns in list order: an updated card keeps its place, only a
      // created one is appended. Appending on update shuffled the board on every save.
      this._projection.upsertItem(updated);
      this._selection.selectMutationResult(updated.id);
      this._notifications.showSuccess(message);
      return updated;
    } catch (cause) {
      this.showError(cause, 'Unable to save the work item.');
      return undefined;
    } finally {
      this._workItemsBusy.set(false);
      overtakenRefresh();
    }
  }

  /** Consumes the existing startAnalyzer operation without a feature dependency. @public */
  public startAnalyzer(
    simulateFailure: boolean,
    workItemId?: string,
    prompt?: string,
    executionApproval?: 'once' | 'repository',
  ): Promise<boolean> {
    if (!this._execution) return Promise.resolve(false);
    return this._execution.startAnalyzer(simulateFailure, workItemId, prompt, executionApproval);
  }

  /** Consumes the existing delegateWorkItem operation without a feature dependency. @public */
  public delegateWorkItem(
    workItemId: string,
    agentTeamId?: string,
    responsibleAgentId?: string,
    objective?: string,
  ): Promise<boolean> {
    if (!this._execution) return Promise.resolve(false);
    return this._execution.delegateWorkItem(workItemId, agentTeamId, responsibleAgentId, objective);
  }

  /** Consumes the existing reviewGoal operation without a feature dependency. @public */
  public reviewGoal(
    workItemId: string,
    decision: 'approved' | 'revision-required' | 'blocked',
    message: string,
  ): Promise<boolean> {
    if (!this._execution) return Promise.resolve(false);
    return this._execution.reviewGoal(workItemId, decision, message);
  }

  /** Consumes the existing assessDeliveryGroup operation without a feature dependency. @public */
  public assessDeliveryGroup(
    workItemIds: readonly string[],
    rootWorkItemId: string,
    activationSource: IDeliveryGroup['activationSource'],
    assessmentMode?: 'analyzer' | 'direct',
  ): Promise<IDeliveryGroupProposal | undefined> {
    if (!this._execution) return Promise.resolve(undefined);
    return this._execution.assessDeliveryGroup(
      workItemIds,
      rootWorkItemId,
      activationSource,
      assessmentMode,
    );
  }

  /** Consumes the existing groupDeliveryDirectly operation without a feature dependency. @public */
  public groupDeliveryDirectly(
    workItemIds: readonly string[],
    rootWorkItemId: string,
    activationSource: Extract<IDeliveryGroup['activationSource'], 'manual-drag' | 'manual-select'>,
  ): Promise<IDeliveryGroup | undefined> {
    if (!this._execution) return Promise.resolve(undefined);
    return this._execution.groupDeliveryDirectly(workItemIds, rootWorkItemId, activationSource);
  }

  /** Consumes the existing confirmDeliveryGroup operation without a feature dependency. @public */
  public confirmDeliveryGroup(
    proposalId: string,
    attestation?: {
      reason?: string;
    },
  ): Promise<IDeliveryGroup | undefined> {
    if (!this._execution) return Promise.resolve(undefined);
    return this._execution.confirmDeliveryGroup(proposalId, attestation);
  }

  /** Consumes the existing rejectDeliveryGroup operation without a feature dependency. @public */
  public rejectDeliveryGroup(proposalId: string, reason?: string): Promise<boolean> {
    if (!this._execution) return Promise.resolve(false);
    return this._execution.rejectDeliveryGroup(proposalId, reason);
  }

  /** Consumes the existing dissolveDeliveryGroup operation without a feature dependency. @public */
  public dissolveDeliveryGroup(deliveryGroupId: string): Promise<boolean> {
    if (!this._execution) return Promise.resolve(false);
    return this._execution.dissolveDeliveryGroup(deliveryGroupId);
  }

  /** Consumes the existing alignDeliveryGroup operation without a feature dependency. @public */
  public alignDeliveryGroup(deliveryGroupId: string): Promise<boolean> {
    if (!this._execution) return Promise.resolve(false);
    return this._execution.alignDeliveryGroup(deliveryGroupId);
  }

  /** Consumes the existing completeManualAnalysis operation without a feature dependency. @public */
  public completeManualAnalysis(workItemId: string, summary: string): Promise<boolean> {
    if (!this._execution) return Promise.resolve(false);
    return this._execution.completeManualAnalysis(workItemId, summary);
  }

  /** Consumes the existing startSolver operation without a feature dependency. @public */
  public startSolver(
    simulateFailure: boolean,
    workItemId: string,
    feedback?: string,
    executionApproval?: 'once' | 'repository',
  ): Promise<boolean> {
    if (!this._execution) return Promise.resolve(false);
    return this._execution.startSolver(simulateFailure, workItemId, feedback, executionApproval);
  }

  /** Consumes the existing completeManualSolution operation without a feature dependency. @public */
  public completeManualSolution(workItemId: string, summary: string): Promise<boolean> {
    if (!this._execution) return Promise.resolve(false);
    return this._execution.completeManualSolution(workItemId, summary);
  }

  /** Consumes the existing removeQueueEntry operation without a feature dependency. @public */
  public removeQueueEntry(entryId: string): Promise<boolean> {
    if (!this._execution) return Promise.resolve(false);
    return this._execution.removeQueueEntry(entryId);
  }

  /** Consumes the existing cancelExecution operation without a feature dependency. @public */
  public cancelExecution(executionId: string): Promise<boolean> {
    if (!this._execution) return Promise.resolve(false);
    return this._execution.cancelExecution(executionId);
  }

  /** Consumes the existing publishPullRequest operation without a feature dependency. @public */
  public publishPullRequest(executionId: string): Promise<boolean> {
    if (!this._execution) return Promise.resolve(false);
    return this._execution.publishPullRequest(executionId);
  }

  /** Consumes the existing loadWorkflowProcess operation without a feature dependency. @public */
  public loadWorkflowProcess(workItemId: string): Promise<WorkflowProcessDto | undefined> {
    if (!this._workflow) return Promise.resolve(undefined);
    return this._workflow.loadWorkflowProcess(workItemId);
  }

  /** Consumes the existing decideWorkflow operation without a feature dependency. @public */
  public async decideWorkflow(workItemId: string, optionId: string, note?: string): Promise<void> {
    if (!this._workflow) throw new Error('Workflow feature is not available.');
    return this._workflow.decideWorkflow(workItemId, optionId, note);
  }

  /** Consumes the existing answerWorkflowQuestion operation without a feature dependency. @public */
  public async answerWorkflowQuestion(
    workItemId: string,
    questionId: string,
    option?: string,
    note?: string,
  ): Promise<void> {
    if (!this._workflow) throw new Error('Workflow feature is not available.');
    return this._workflow.answerWorkflowQuestion(workItemId, questionId, option, note);
  }

  private showError(cause: unknown, fallback: string): void {
    this._notifications.showError(fallback, operatorErrorMessage(cause));
  }

  // #endregion
}

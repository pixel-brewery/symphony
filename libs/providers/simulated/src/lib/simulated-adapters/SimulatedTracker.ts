// #region Imports

import type { IWorkItemCoordinationPort } from '@symphony/application-work';
import type { IWorkTrackingPort as TrackerPort } from '@symphony/providers-work';
import type { ClosureReasonCode, WorkflowStageId } from '@symphony/domain-workflow';
import type {
  IBoardColumn,
  IBoardColumnCandidate,
  IWorkItem,
  IWorkItemClaim,
  IWorkItemComment,
  IWorkItemEditorMetadata,
  IWorkItemMutation,
  ProjectFieldDefinition,
  ProjectFieldValue,
  WorkItemClaimAcquisition,
} from '@symphony/domain-work';
import { simulatedFieldValues } from './simulatedFieldValues';
import { simulatedProjectFields } from './SimulatedProjectFields';

// #endregion

export class SimulatedTracker implements TrackerPort, IWorkItemCoordinationPort {
  // #region Fields

  private readonly _items: IWorkItem[];
  private readonly _seededItemIds: ReadonlySet<string>;
  private readonly _claims = new Map<string, IWorkItemClaim>();

  // #endregion

  // #region Ctor

  public constructor(
    additionalBacklogItems = 0,
    private readonly _context: () => {
      readonly workspaceId: string;
      readonly sourceId: string;
      readonly repositoryBindingId?: string;
    } = () => ({ workspaceId: 'personal', sourceId: 'simulated' }),
    private readonly _listFailure: () => Error | undefined = () => undefined,
  ) {
    const overflowItems: IWorkItem[] = Array.from(
      { length: additionalBacklogItems },
      (_, index) => ({
        ...this.scope(),
        id: `work-item-overflow-${index + 1}`,
        externalId: `#${141 - index}`,
        title: `Queued reconciliation task ${index + 1}`,
        body: 'Additional simulated backlog work used to verify dense board behavior.',
        stageId: 'backlog',
        provider: 'Simulated tracker',
        repository: 'example/platform',
        projectFields: simulatedFieldValues('backlog', 'reconciliation, workspace'),
        labels: ['orchestration'],
        assignees: [],
        createdAt: '2026-08-01T09:00:00.000Z',
        updatedAt: '2026-08-05T10:00:00.000Z',
      }),
    );

    this._items = [
      {
        ...this.scope(),
        id: 'work-item-142',
        externalId: '#142',
        title: 'Add deterministic workspace reconciliation',
        body: [
          '## Recovery scope',
          '',
          'Reconcile **managed workspaces** after restart.',
          '',
          '- Detect actionable drift',
          '- Surface safe recovery guidance',
          '',
          'Raw HTML remains text: <strong>not trusted</strong>',
        ].join('\n'),
        stageId: 'backlog',
        provider: 'Simulated tracker',
        repository: 'example/platform',
        projectFields: simulatedFieldValues('backlog', 'recovery, workspace lifecycle'),
        labels: ['orchestration', 'reliability'],
        assignees: [
          { login: 'octo-operator', displayName: 'Octo Operator' },
          { login: 'workspace-owner', displayName: 'Workspace Owner' },
        ],
        comments: [
          {
            id: 'comment-142-1',
            author: { login: 'workspace-owner', displayName: 'Workspace Owner' },
            body: 'Please reconcile **managed workspaces only**; personal clones stay untouched.',
            bodyFormat: 'markdown',
            createdAt: '2026-08-03T09:30:00.000Z',
          },
          {
            id: 'comment-142-2',
            author: { login: 'octo-operator', displayName: 'Octo Operator' },
            body: 'Agreed. Drift detection first, recovery guidance second.',
            bodyFormat: 'markdown',
            createdAt: '2026-08-04T14:05:00.000Z',
          },
          {
            id: 'comment-142-3',
            author: { login: 'symphony-bot', displayName: 'Symphony Analyzer' },
            // Mirrors real analysis comments: unbreakable code lines and tables must scroll
            // inside the comment instead of widening the task drawer.
            body: [
              '**Symphony analysis**',
              '',
              'The analyzed source is `dev@8cc1378695ec8ca6e5af53bd1686c363fbd18ca1` and the',
              'owning module is `libs/backend/features/finance/src/accounting-connector/services/AccountingPaymentSyncService.ts`.',
              '',
              '| Path | Operation | Notes |',
              '| --- | --- | --- |',
              '| `apps/database/prisma/models/invoice.prisma` | modify | append-only collection history |',
              '| `libs/backend/features/finance/src/invoice/mappers/InvoiceMappingProfile.ts` | reuse | chronological timeline |',
              '',
              '```ts',
              'const timeline = buildInvoiceTimeline(invoice, collectionActions, paymentRecords); // stays on one unbroken line to exercise horizontal containment',
              '```',
            ].join('\n'),
            bodyFormat: 'markdown',
            createdAt: '2026-08-05T15:52:17.000Z',
          },
        ],
        createdAt: '2026-08-01T08:15:00.000Z',
        updatedAt: '2026-08-07T08:15:00.000Z',
      },
      ...overflowItems,
      {
        ...this.scope(),
        id: 'work-item-138',
        externalId: '#138',
        title: 'Expose execution diagnostics',
        body: 'Show process and runtime health without leaking privileged APIs.',
        stageId: 'qualified',
        provider: 'Simulated tracker',
        repository: 'example/platform',
        projectFields: simulatedFieldValues('qualified', 'diagnostics, observability'),
        labels: ['desktop', 'observability'],
        assignees: [{ login: 'desktop-owner', displayName: 'Desktop Owner' }],
        createdAt: '2026-08-02T13:40:00.000Z',
        updatedAt: '2026-08-06T13:40:00.000Z',
      },
    ];
    this._seededItemIds = new Set(this._items.map((item) => item.id));
  }

  // #endregion

  // #region Methods

  /**
   * Returns the coordinates work item.
   *
   * @public
   */
  public coordinatesWorkItem(): boolean {
    return true;
  }

  /**
   * Returns the acquire work item claim.
   *
   * @param workItem - Work item.
   * @param action - Action.
   * @param executionId - Execution id.
   * @public
   */
  public async acquireWorkItemClaim(
    workItem: IWorkItem,
    action: IWorkItemClaim['action'],
    executionId: string,
  ): Promise<WorkItemClaimAcquisition> {
    if (this._claims.has(workItem.id)) return { status: 'contended' };
    const now = new Date();
    const claim: IWorkItemClaim = {
      id: `simulated:${workItem.id}:${executionId}`,
      workItemId: workItem.id,
      action,
      owner: 'simulated-user',
      acquiredAt: now.toISOString(),
      leaseUntil: new Date(now.getTime() + 30 * 60_000).toISOString(),
      heartbeatAt: now.toISOString(),
      claimVersion: 1,
    };
    this._claims.set(workItem.id, claim);
    this.setAssistanceAction(workItem.id, action);
    this.assignClaimOwner(workItem.id, claim.owner);
    return { status: 'acquired', claim };
  }

  /**
   * Returns the advance work item claim.
   *
   * @param claim - Claim.
   * @param action - Action.
   * @public
   */
  public async advanceWorkItemClaim(
    claim: IWorkItemClaim,
    action: IWorkItemClaim['action'],
  ): Promise<IWorkItemClaim> {
    if (this._claims.get(claim.workItemId)?.id !== claim.id) {
      throw new Error(`Distributed claim ownership was lost for ${claim.workItemId}.`);
    }
    const advanced = { ...claim, action };
    this._claims.set(claim.workItemId, advanced);
    this.setAssistanceAction(claim.workItemId, action);
    return advanced;
  }

  /**
   * Releases the work item claim.
   *
   * @param claim - Claim.
   * @public
   */
  public async releaseWorkItemClaim(claim: IWorkItemClaim): Promise<void> {
    if (this._claims.get(claim.workItemId)?.id !== claim.id) {
      throw new Error(`Distributed claim ownership was lost for ${claim.workItemId}.`);
    }
    this.setAssistanceAction(claim.workItemId, 'none');
    this._claims.delete(claim.workItemId);
  }

  /**
   * Lists the work items.
   *
   * @public
   */
  public async listWorkItems(): Promise<readonly IWorkItem[]> {
    const failure = this._listFailure();
    if (failure) throw failure;
    return this._items.map((item) => this.present(item));
  }

  /**
   * Loads the work item details.
   *
   * @param workItem - Work item.
   * @public
   */
  public async loadWorkItemDetails(workItem: IWorkItem): Promise<IWorkItem> {
    const complete = this._items.find((candidate) => candidate.id === workItem.id);
    if (!complete) throw new Error(`Unknown simulated work item: ${workItem.id}`);
    return this.present({
      ...complete,
      detailState: 'complete',
      comments: complete.comments ?? [],
    });
  }

  /**
   * Simulated columns are the workflow states themselves, owned by the simulated source.
   *
   * @public
   */
  public async listBoardColumns(): Promise<readonly IBoardColumn[]> {
    const sourceId = this._context().sourceId;
    return simulatedColumns.map((column) => ({ ...column, sourceId }));
  }

  /**
   * Lists the source columns.
   *
   * @public
   */
  public async listSourceColumns(): Promise<readonly IBoardColumnCandidate[]> {
    return simulatedColumns.map((column): IBoardColumnCandidate => ({
      id: column.id,
      label: column.label,
      ...(column.stageId ? { suggestedStageId: column.stageId } : {}),
    }));
  }

  /**
   * Lists the project fields.
   *
   * @public
   */
  public async listProjectFields(): Promise<readonly ProjectFieldDefinition[]> {
    return simulatedProjectFields;
  }

  /**
   * Lists the editor metadata.
   *
   * @public
   */
  public async listEditorMetadata(): Promise<IWorkItemEditorMetadata> {
    return {
      repositories: ['example/platform'],
      labels: [
        { name: 'bug', color: 'd73a4a', description: 'Something is not working' },
        { name: 'desktop', color: '7057ff' },
        { name: 'orchestration', color: '0e8a16' },
        { name: 'reliability', color: '1d76db' },
      ],
      assignees: [
        { login: 'octo-operator', displayName: 'Octo Operator' },
        { login: 'workspace-owner', displayName: 'Workspace Owner' },
        { login: 'desktop-owner', displayName: 'Desktop Owner' },
      ],
      states: await this.listBoardColumns(),
      projectFields: simulatedProjectFields,
    };
  }

  /**
   * Creates the work item.
   *
   * @param input - Input.
   * @public
   */
  public async createWorkItem(input: IWorkItemMutation): Promise<IWorkItem> {
    const number = Math.max(...this._items.map((item) => Number(item.externalId.slice(1)))) + 1;
    const metadata = await this.listEditorMetadata();
    const createdAt = new Date().toISOString();
    const item: IWorkItem = {
      ...this.scope(input.workspaceId, input.sourceId, input.repositoryBindingIds),
      id: `work-item-${number}`,
      externalId: `#${number}`,
      title: input.title,
      body: input.body,
      ...(simulatedStage(input.projectFields)
        ? { stageId: simulatedStage(input.projectFields)! }
        : {}),
      provider: 'Simulated tracker',
      repository: input.repository,
      projectFields: input.projectFields.map((value) => ({ ...value })),
      labels: [...input.labels],
      assignees: input.assignees.map(
        (login) => metadata.assignees.find((assignee) => assignee.login === login) ?? { login },
      ),
      createdAt,
      updatedAt: createdAt,
    };
    this._items.push(item);
    return this.present(item);
  }

  /**
   * Updates the work item.
   *
   * @param workItemId - Work item id.
   * @param input - Input.
   * @public
   */
  public async updateWorkItem(workItemId: string, input: IWorkItemMutation): Promise<IWorkItem> {
    const index = this._items.findIndex((item) => item.id === workItemId);
    const current = this._items[index];
    if (!current || index < 0) throw new Error(`Unknown work item: ${workItemId}`);
    const metadata = await this.listEditorMetadata();
    const updated: IWorkItem = {
      ...current,
      ...input,
      ...(simulatedStage(input.projectFields)
        ? { stageId: simulatedStage(input.projectFields)! }
        : {}),
      projectFields: input.projectFields.map((value) => ({ ...value })),
      labels: [...input.labels],
      assignees: input.assignees.map(
        (login) => metadata.assignees.find((assignee) => assignee.login === login) ?? { login },
      ),
      updatedAt: new Date().toISOString(),
    };
    this._items[index] = updated;
    return this.present(updated);
  }

  /**
   * Returns the transition.
   *
   * @param workItemId - Work item id.
   * @param stage - Stage.
   * @public
   */
  public async transition(workItemId: string, stage: WorkflowStageId): Promise<IWorkItem> {
    const index = this._items.findIndex((item) => item.id === workItemId);
    const current = this._items[index];
    if (!current || index < 0) {
      throw new Error(`Unknown work item: ${workItemId}`);
    }
    const status = simulatedProjectFields[0];
    const optionId =
      status && 'options' in status
        ? status.options.find((option) => option.stageId === stage)?.id
        : undefined;
    const projectFields = (
      current.projectFields ?? simulatedFieldValues(current.stageId ?? 'backlog', '')
    ).map((value): ProjectFieldValue =>
      value.fieldId === 'field-status'
        ? { fieldId: value.fieldId, type: 'single-select', value: optionId ?? null }
        : value,
    );
    const updated = {
      ...current,
      stageId: stage,
      projectFields,
      updatedAt: new Date().toISOString(),
    };
    this._items[index] = updated;
    return this.present(updated);
  }

  /**
   * Records the closure the way a provider does: the item keeps its place until the engine
   * moves it, but its native state says it is closed and the reason is readable on it.
   *
   * @param workItemId - Work item id.
   * @param reason - Reason.
   * @public
   */
  public async closeWorkItem(workItemId: string, reason: ClosureReasonCode): Promise<IWorkItem> {
    const index = this._items.findIndex((item) => item.id === workItemId);
    const current = this._items[index];
    if (!current || index < 0) throw new Error(`Unknown work item: ${workItemId}`);
    const updated: IWorkItem = {
      ...current,
      nativeState: 'closed',
      labels: current.labels.includes(reason) ? current.labels : [...current.labels, reason],
      updatedAt: new Date().toISOString(),
    };
    this._items[index] = updated;
    return this.present(updated);
  }

  /**
   * Simulated columns carry the stage of the same name, so a move is a stage change.
   *
   * @param workItemId - Work item id.
   * @param boardColumnId - Board column id.
   * @public
   */
  public async moveToColumn(workItemId: string, boardColumnId: string): Promise<IWorkItem> {
    const column = simulatedColumns.find((candidate) => candidate.id === boardColumnId);
    if (!column?.stageId) throw new Error(`Unknown board column: ${boardColumnId}`);
    return this.transition(workItemId, column.stageId);
  }

  /**
   * Appends one operator comment to the simulated discussion, numbered like the seeded thread so
   * a written comment is addressable in tests exactly like a seeded one.
   *
   * @param workItemId - Work item id.
   * @param body - Body.
   * @public
   */
  public async createWorkItemComment(workItemId: string, body: string): Promise<IWorkItemComment> {
    const index = this._items.findIndex((item) => item.id === workItemId);
    const current = this._items[index];
    if (!current || index < 0) throw new Error(`Unknown simulated work item: ${workItemId}`);
    const comments = current.comments ?? [];
    const comment: IWorkItemComment = {
      id: `comment-${current.externalId.replace(/^#/u, '')}-${comments.length + 1}`,
      author: { login: 'octo-operator', displayName: 'Octo Operator' },
      body,
      bodyFormat: 'markdown',
      createdAt: new Date().toISOString(),
    };
    this._items[index] = { ...current, comments: [...comments, comment] };
    return comment;
  }

  /** Mirrors the provider behavior: claiming an action makes the owner the only assignee. */
  private assignClaimOwner(workItemId: string, owner: string): void {
    const index = this._items.findIndex((item) => item.id === workItemId);
    if (index < 0) throw new Error(`Unknown simulated work item: ${workItemId}`);
    const current = this._items[index]!;
    this._items[index] = { ...current, assignees: [{ login: owner }] };
  }

  private setAssistanceAction(workItemId: string, action: IWorkItem['assistanceAction']): void {
    const index = this._items.findIndex((item) => item.id === workItemId);
    if (index < 0) throw new Error(`Unknown simulated work item: ${workItemId}`);
    const current = this._items[index]!;
    const optionId = `assistant-${action ?? 'none'}`;
    this._items[index] = {
      ...current,
      assistanceAction: action,
      projectFields: (current.projectFields ?? []).map((value) =>
        value.fieldId === 'field-assistant-phase' && value.type === 'single-select'
          ? { ...value, value: optionId }
          : value,
      ),
    };
  }

  /** Projects reusable fixture items into the currently selected simulated provider scope. */
  private present(item: IWorkItem): IWorkItem {
    return withSimulatedColumn(
      this._seededItemIds.has(item.id)
        ? {
            ...item,
            ...this.scope(),
          }
        : item,
    );
  }

  private scope(
    workspaceId?: string,
    sourceId?: string,
    repositoryBindingIds?: readonly string[],
  ): Pick<IWorkItem, 'workspaceId' | 'sourceId' | 'repositoryBindingIds'> {
    const context = this._context();
    const bindingIds =
      repositoryBindingIds ?? (context.repositoryBindingId ? [context.repositoryBindingId] : []);
    return {
      workspaceId: workspaceId ?? context.workspaceId,
      sourceId: sourceId ?? context.sourceId,
      repositoryBindingIds: bindingIds,
    };
  }

  // #endregion
}

function simulatedStage(values: readonly ProjectFieldValue[]): WorkflowStageId {
  const selected = values.find((value) => value.fieldId === 'field-status')?.value;
  const status = simulatedProjectFields[0];
  return (
    (status && 'options' in status
      ? status.options.find((option) => option.id === selected)?.stageId
      : undefined) ?? 'backlog'
  );
}

const simulatedColumns: readonly IBoardColumn[] = [
  { id: 'backlog', label: 'Backlog', stageId: 'backlog' },
  { id: 'qualified', label: 'Qualified', stageId: 'qualified' },
  { id: 'ready', label: 'Ready', stageId: 'ready' },
  { id: 'progress', label: 'Progress', stageId: 'progress' },
  { id: 'acceptance', label: 'Acceptance', stageId: 'acceptance' },
  { id: 'done', label: 'Done', stageId: 'done' },
];

function withSimulatedColumn(item: IWorkItem): IWorkItem {
  return item.stageId ? { ...item, boardColumnId: item.stageId } : item;
}

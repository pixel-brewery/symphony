// #region Imports

import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import {
  DialogService,
  DrawerService,
  DropDownButtonComponent,
  type IDrawerRef,
} from '@pixel-brewery/mosaik-elements-angular';
import { firstValueFrom } from 'rxjs';
import {
  activeWorkItemCoordination,
  projectFieldDisplayValue,
  projectFieldSearchText,
  type IBoardColumn,
  type ProjectFieldDefinition,
  type IWorkItem,
  type IWorkItemAssignee,
  type IWorkItemHealth,
} from '@symphony/domain-work';
import {
  inspectWorkItem,
  type IDeliveryGroup,
  type IDeliveryGroupProposal,
  type IExecutionEvent,
  type IExecutionRecord,
} from '@symphony/domain-execution';
import {
  ClipboardService,
  ExternalLinkService,
  Hydratable,
  resolveBoardColumnLayout,
  resolvePullRequestRun,
  UNASSIGNED_BOARD_COLUMN_ID,
  ViewPresenter,
  watchCreateIntent,
  workItemIdsNeedingAttention,
  Command,
} from '@symphony/frontend-core';
import { NotificationService } from '@symphony/frontend-notification';
import { LocalExecutionApprovalService } from '../services/LocalExecutionApprovalService';
import { DeliveryGroupModeDialogView } from '../views/dialogs/DeliveryGroupModeDialogView';
import { TaskDialogView } from '../views/dialogs/TaskDialogView';
import { resolveBoardContextActions, type IBoardContextAction } from './boardContextAction';
import {
  resolveBoardPullRequest,
  resolveBoardPullRequestActions,
  type IBoardPullRequestAction,
} from './boardPullRequestAction';
import { toggleAssigneeMutation } from './toggleAssigneeMutation';
import type { ITaskRuntimeState } from '../pipes/ITaskRuntimeState';
import type { IDeliveryGroupDrawerData } from './IDeliveryGroupDrawerData';
import type { DeliveryGroupAssessmentMode } from './DeliveryGroupAssessmentMode';
import type { IBoardColumnEntry } from './IBoardColumnEntry';
import { hydrateBoardRoute } from './routeHydration';
import { isWorkItemScopeUnavailable } from './isWorkItemScopeUnavailable';
import { resolveWorkItemUnavailablePresentation } from './resolveWorkItemUnavailablePresentation';
import { shouldRequestAssignableUsers } from './shouldRequestAssignableUsers';
import { BoardColumnCollapseStore } from '../state/BoardColumnCollapseStore';
import { WorkStore } from '../../state/WorkStore';
import { WorkFilterStore } from '../../state/WorkFilterStore';
import { WORK_BOARD_CONTEXT } from '../../ports/WorkBoardContextToken';
import { WORK_CI_OPERATIONS } from '../../ports/WorkCiOperationsToken';
import { WORK_EXECUTION_READ } from '../../ports/WorkExecutionReadToken';
import { WORK_BOARD_ROUTE } from '../../ports/WorkBoardRouteToken';
import { WORK_BOARD_SELECTION } from '../../ports/WorkBoardSelectionToken';

// #endregion

@Injectable()
export class BoardViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _context = inject(WORK_BOARD_CONTEXT);
  private readonly _work = inject(WorkStore);
  /** Whether this product includes the actual Workflow command and drawer owner. @public @readonly */
  public readonly workflowAvailable = this._work.workflowAvailable;
  private readonly _ci = inject(WORK_CI_OPERATIONS);
  private readonly _executionRead = inject(WORK_EXECUTION_READ);
  private readonly _boardRoute = inject(WORK_BOARD_ROUTE);
  private readonly _boardSelection = inject(WORK_BOARD_SELECTION);
  private _openedRouteItem = '';
  private readonly _landscape = inject(WorkFilterStore);
  /** Shared stage selection with the landscape. @public */ public readonly selectedStageId =
    this._landscape.stageId;
  /** Clear the landscape's stage filter from this view. @public */ public readonly clearStageFilterCommand =
    new Command<void>(() => this._landscape.stageId.set(undefined));
  private readonly _dialogService = inject(DialogService);
  private readonly _drawerService = inject(DrawerService);
  private readonly _localExecutionApproval = inject(LocalExecutionApprovalService);
  private readonly _clipboard = inject(ClipboardService);
  private readonly _externalLinks = inject(ExternalLinkService);
  private readonly _notifications = inject(NotificationService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _columnCollapse = inject(BoardColumnCollapseStore);

  private readonly _queryParamMap = toSignal(this._route.queryParamMap, {
    initialValue: this._route.snapshot.queryParamMap,
  });
  private _activeDrawer?: IDrawerRef<{ mode: 'create' } | { mode: 'edit'; workItemId: string }>;
  private _activeProcessDrawer?: IDrawerRef<{ workItemId: string }>;
  private _activeGroupDrawer?: IDrawerRef<IDeliveryGroupDrawerData>;
  private _processDrawerPending = false;

  /**
   * Boards (work-item sources) inside the selected workspaces.
   *
   * @public
   * @readonly
   */
  public readonly boards = this._context.availableBoards;

  /**
   * Board shown on the view; undefined merges every board in scope.
   *
   * @public
   * @readonly
   */
  public readonly selectedBoard = this._context.activeBoard;

  /**
   * Whether it can switch boards.
   *
   * @public
   * @readonly
   */
  public readonly canSwitchBoards = computed(
    () => Boolean(this._boardSelection) && this.boards().length > 1,
  );
  private readonly _providerColumns = computed(() => this._context.snapshot()?.boardColumns ?? []);

  /**
   * Columns of the selected board in provider order. Without a selection, columns of
   * every board are merged by workflow state, then by label, so items from several
   * boards share one column per stage.
   */
  private readonly _columnLayout = computed(() =>
    resolveBoardColumnLayout(this._providerColumns(), this.selectedBoard()?.id, this.workItems()),
  );

  /**
   * Every visible column, unaffected by the column filter; feeds the filter menu and moves.
   *
   * @public
   * @readonly
   */
  public readonly allColumns = computed(() => this._columnLayout().columns);

  /**
   * Columns the flow board renders: one column while the column filter narrows the view.
   *
   * @public
   * @readonly
   */
  public readonly columns = computed(() => {
    const columns = this.allColumns();
    const selectedColumnId = this.selectedColumnId();
    return selectedColumnId ? columns.filter((column) => column.id === selectedColumnId) : columns;
  });

  /**
   * The all work items.
   *
   * @public
   * @readonly
   */
  public readonly allWorkItems = computed(() => this._context.snapshot()?.workItems ?? []);

  /**
   * Work items of the selected board, or of every board in scope.
   *
   * @public
   * @readonly
   */
  public readonly workItems = this._context.scopedWorkItems;

  /**
   * The project fields.
   *
   * @public
   * @readonly
   */
  public readonly projectFields = computed(() => this._context.snapshot()?.projectFields ?? []);

  /**
   * The work item remote data.
   *
   * @public
   * @readonly
   */
  public readonly workItemRemoteData = computed(
    () => this._context.snapshot()?.remoteData?.workItems,
  );

  /**
   * Whether the active work-item scope has neither fresh nor cached provider data.
   *
   * @public
   * @readonly
   */
  public readonly workItemsUnavailable = computed(() =>
    isWorkItemScopeUnavailable(this.workItemRemoteData(), this.workItems().length),
  );

  /**
   * Actionable first-sync failure copy for the active work-item sources.
   *
   * @public
   * @readonly
   */
  public readonly workItemUnavailablePresentation = computed(() =>
    resolveWorkItemUnavailablePresentation(this.workItemRemoteData(), this.boards()),
  );

  /**
   * The search query.
   *
   * @public
   * @readonly
   */
  public readonly searchQuery = this._landscape.query;

  /**
   * The selected label.
   *
   * @public
   * @readonly
   */
  public readonly selectedLabel = this._landscape.label;

  /**
   * The selected assignee login.
   *
   * @public
   * @readonly
   */
  public readonly selectedAssigneeLogin = signal<string | undefined>(undefined);

  /**
   * Column the board is narrowed to (home widget click-through); undefined shows every column.
   *
   * @public
   * @readonly
   */
  public readonly selectedColumnId = this._landscape.columnId;

  /**
   * Narrows the board to items a person has to act on (home "Needs attention" widget).
   *
   * @public
   * @readonly
   */
  public readonly attentionOnly = signal(false);

  /**
   * The selected column.
   *
   * @public
   * @readonly
   */
  public readonly selectedColumn = computed(() =>
    this.allColumns().find((column) => column.id === this.selectedColumnId()),
  );

  private readonly _attentionWorkItemIds = computed(() =>
    workItemIdsNeedingAttention(this.workItems(), this._context.snapshot()?.executions ?? [], {
      stages: this._context.snapshot()?.workflow.stages ?? [],
      fields: this.projectFields(),
      readiness: this._context.snapshot()?.workItemReadiness ?? [],
    }),
  );
  private readonly _contextActionBusyIds = signal<ReadonlySet<string>>(new Set());

  /**
   * People the item's tracker accepts as assignees, keyed by the scope the editor-metadata
   * request takes. One board mixes items of several repositories, so each scope is fetched
   * once - together with the board - and shared by every card of that scope.
   */
  private readonly _assignableUsersByScope = signal<
    ReadonlyMap<string, readonly IWorkItemAssignee[]>
  >(new Map());
  private readonly _assignableUsersLoadingScopes = signal<ReadonlySet<string>>(new Set());
  private readonly _assignableUsersFailedScopes = signal<ReadonlySet<string>>(new Set());

  /**
   * The available labels.
   *
   * @public
   * @readonly
   */
  public readonly availableLabels = computed(() =>
    [...new Set(this.workItems().flatMap((item) => item.labels))].sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: 'base' }),
    ),
  );

  /**
   * The available assignees.
   *
   * @public
   * @readonly
   */
  public readonly availableAssignees = computed(() => {
    const assignees = new Map<string, IWorkItemAssignee>();
    for (const item of this.workItems()) {
      for (const assignee of this.resolveAssignees(item)) assignees.set(assignee.login, assignee);
    }
    return [...assignees.values()].sort((left, right) =>
      (left.displayName ?? left.login).localeCompare(right.displayName ?? right.login, undefined, {
        sensitivity: 'base',
      }),
    );
  });

  /**
   * The selected assignee.
   *
   * @public
   * @readonly
   */
  public readonly selectedAssignee = computed(() =>
    this.availableAssignees().find((assignee) => assignee.login === this.selectedAssigneeLogin()),
  );

  /**
   * Whether it has active filters.
   *
   * @public
   * @readonly
   */
  public readonly hasActiveFilters = computed(
    () =>
      Boolean(this.searchQuery().trim()) ||
      Boolean(this.selectedLabel()) ||
      Boolean(this.selectedAssigneeLogin()) ||
      Boolean(this.selectedColumnId()) ||
      this.attentionOnly() ||
      Boolean(this.selectedStageId()),
  );

  /**
   * The filtered work items.
   *
   * @public
   * @readonly
   */
  public readonly filteredWorkItems = computed(() => {
    const stageId = this._landscape.stageId();
    const query = this.searchQuery().trim().toLocaleLowerCase();
    const selectedLabel = this.selectedLabel();
    const selectedAssigneeLogin = this.selectedAssigneeLogin();
    const attentionIds = this.attentionOnly() ? this._attentionWorkItemIds() : undefined;
    return this.workItems().filter((item) => {
      if (attentionIds && !attentionIds.has(item.id)) return false;
      if (stageId && item.stageId !== stageId) return false;
      if (selectedLabel && !item.labels.includes(selectedLabel)) return false;
      if (
        selectedAssigneeLogin &&
        !this.resolveAssignees(item).some((assignee) => assignee.login === selectedAssigneeLogin)
      ) {
        return false;
      }
      if (!query) return true;
      return [
        item.externalId,
        item.title,
        item.body,
        item.repository,
        this.resolveImplementationBranch(item.id),
        projectFieldSearchText(this.projectFields(), item.projectFields),
        ...item.labels,
        ...this.resolveAssignees(item).flatMap((assignee) => [
          assignee.login,
          assignee.displayName ?? '',
        ]),
      ]
        .join(' ')
        .toLocaleLowerCase()
        .includes(query);
    });
  });

  private readonly _itemsByColumn = computed(() => {
    const layout = this._columnLayout();
    const itemsByColumn = new Map<string, IWorkItem[]>();
    for (const column of layout.columns) itemsByColumn.set(column.id, []);
    for (const item of this.filteredWorkItems()) {
      const columnId = layout.columnIdFor(item);
      const items = itemsByColumn.get(columnId);
      if (items) items.push(item);
      else itemsByColumn.set(columnId, [item]);
    }
    return itemsByColumn;
  });

  private readonly _workItemsById = computed(
    () => new Map(this.allWorkItems().map((item) => [item.id, item])),
  );

  private readonly _compactDeliveryGroups = computed(() => {
    const itemById = this._workItemsById();
    return (this._context.snapshot()?.deliveryGroups ?? []).filter((group) => {
      if (group.state !== 'active' && group.state !== 'synchronizing') return false;
      const items = group.workItemIds.map((workItemId) => itemById.get(workItemId));
      const root = itemById.get(group.rootWorkItemId);
      return Boolean(
        root?.boardColumnId &&
        items.every((item) => item?.boardColumnId === root.boardColumnId) &&
        items.every((item) => this.filteredWorkItems().some((visible) => visible.id === item?.id)),
      );
    });
  });

  private readonly _compactGroupMemberIds = computed(
    () => new Set(this._compactDeliveryGroups().flatMap((group) => group.workItemIds)),
  );

  private readonly _columnEntriesByColumn = computed(() => {
    const entriesByColumn = new Map<string, IBoardColumnEntry[]>();
    const itemById = this._workItemsById();
    const groupedItemIds = this._compactGroupMemberIds();
    for (const column of this.columns()) entriesByColumn.set(column.id, []);
    for (const group of this._compactDeliveryGroups()) {
      const columnId = itemById.get(group.rootWorkItemId)?.boardColumnId;
      const entries = columnId ? entriesByColumn.get(columnId) : undefined;
      if (entries) entries.push({ id: group.id, kind: 'group', group });
    }
    for (const [columnId, items] of this._itemsByColumn()) {
      const entries = entriesByColumn.get(columnId);
      if (!entries) continue;
      for (const item of items) {
        if (!groupedItemIds.has(item.id)) entries.push({ id: item.id, kind: 'item', item });
      }
    }
    return entriesByColumn;
  });

  private readonly _columnEntryKeysByColumn = computed(
    () =>
      new Map(
        [...this._columnEntriesByColumn()].map(([columnId, entries]) => [
          columnId,
          entries.map((entry) => entry.id),
        ]),
      ),
  );

  private readonly _projectFieldEntriesByWorkItem = computed(() => {
    const fields = this.projectFields();
    return new Map(
      this.workItems().map((item) => [item.id, this.createProjectFieldEntries(fields, item)]),
    );
  });

  private readonly _implementationBranches = computed(() => {
    const latestByWorkItem = new Map<string, { branch: string; startedAt: string }>();
    for (const execution of this._context.snapshot()?.executions ?? []) {
      if (
        !execution.workspaceReference ||
        (execution.kind !== 'solution' && execution.kind !== 'revision')
      ) {
        continue;
      }
      const current = latestByWorkItem.get(execution.workItemId);
      if (!current || current.startedAt.localeCompare(execution.startedAt) < 0) {
        latestByWorkItem.set(execution.workItemId, {
          branch: execution.workspaceReference,
          startedAt: execution.startedAt,
        });
      }
    }
    return new Map(
      [...latestByWorkItem].map(([workItemId, execution]) => [workItemId, execution.branch]),
    );
  });

  private readonly _runtimeStatuses = computed(() => {
    const latestByWorkItem = new Map<string, IExecutionRecord>();
    for (const execution of this._context.snapshot()?.executions ?? []) {
      const current = latestByWorkItem.get(execution.workItemId);
      if (!current || current.startedAt.localeCompare(execution.startedAt) < 0) {
        latestByWorkItem.set(execution.workItemId, execution);
      }
    }
    const latestEvents = new Map<string, IExecutionEvent>();
    for (const event of this._context.snapshot()?.events ?? []) {
      const current = latestEvents.get(event.executionId);
      if (!current || current.sequence < event.sequence) latestEvents.set(event.executionId, event);
    }
    return new Map(
      [...latestByWorkItem].map(([workItemId, execution]) => [
        workItemId,
        {
          execution,
          ...(latestEvents.get(execution.id)
            ? { latestEvent: latestEvents.get(execution.id)! }
            : {}),
        } satisfies ITaskRuntimeState,
      ]),
    );
  });

  /**
   * The workspaces.
   *
   * @public
   * @readonly
   */
  public readonly workspaces = computed(
    () => this._context.settings()?.workspaces.filter((workspace) => workspace.enabled) ?? [],
  );

  private readonly _workspacesById = computed(
    () => new Map(this.workspaces().map((workspace) => [workspace.id, workspace])),
  );

  /**
   * The selected workspace IDs.
   *
   * @public
   * @readonly
   */
  public readonly selectedWorkspaceIds = computed(
    () => this._context.settings()?.activeViewScope.workspaceIds ?? [],
  );

  /**
   * The selected workspaces.
   *
   * @public
   * @readonly
   */
  public readonly selectedWorkspaces = computed(() =>
    this.workspaces().filter((workspace) => this.selectedWorkspaceIds().includes(workspace.id)),
  );

  /**
   * One board must own new items; a workspace without configured boards (simulated tracker) still creates.
   *
   * @public
   * @readonly
   */
  public readonly canCreateWorkItem = this._context.canCreateWorkItem;

  /**
   * Execution history grouped once per snapshot. Findings and context actions both need the
   * runs of a single item, and scanning the whole list per card turns a board of hundreds of
   * cards into a quadratic pass.
   */
  private readonly _executionsByWorkItem = computed(() => {
    const grouped = new Map<string, IExecutionRecord[]>();
    for (const execution of this._context.snapshot()?.executions ?? []) {
      const existing = grouped.get(execution.workItemId);
      if (existing) existing.push(execution);
      else grouped.set(execution.workItemId, [execution]);
    }
    return grouped;
  });

  /**
   * Findings per work item, rebuilt once per snapshot rather than per rendered card: a board
   * holds hundreds of cards, and every card would otherwise re-inspect its item on each
   * change-detection pass.
   */
  private readonly _healthByWorkItem = computed(() => {
    const stages = this._context.snapshot()?.workflow.stages ?? [];
    const fields = this.projectFields();
    const columns = this._providerColumns();
    const executions = this._executionsByWorkItem();
    const readinessByWorkItem = new Map(
      (this._context.snapshot()?.workItemReadiness ?? []).map((entry) => [entry.workItemId, entry]),
    );
    return new Map(
      this.allWorkItems().map((item) => [
        item.id,
        inspectWorkItem(item, {
          stages,
          executions: executions.get(item.id) ?? [],
          ...(readinessByWorkItem.get(item.id)
            ? { readiness: readinessByWorkItem.get(item.id)! }
            : {}),
          // Snapshots merge every board; a field of another board is foreign here, not missing.
          fields: fields.filter(
            (field) => !field.sourceId || !item.sourceId || field.sourceId === item.sourceId,
          ),
          ...(columns.find((column) => column.id === item.boardColumnId)?.label
            ? {
                boardColumnLabel: columns.find((column) => column.id === item.boardColumnId)!.label,
              }
            : {}),
        }),
      ]),
    );
  });

  /**
   * Steps of the card's stage, rebuilt once per snapshot rather than per rendered card: the
   * menu of every card asks for them on each change-detection pass.
   */
  private readonly _contextActionsByWorkItem = computed(() => {
    const stages = this._context.snapshot()?.workflow.stages ?? [];
    const executions = this._executionsByWorkItem();
    const executionQueue = this._executionRead?.executionQueue() ?? [];
    return new Map(
      this.allWorkItems().map((item) => [
        item.id,
        resolveBoardContextActions(
          item,
          executions.get(item.id) ?? [],
          stages,
          executionQueue,
        ).filter((action) =>
          action.kind === 'decide'
            ? this._work.workflowAvailable
            : action.kind === 'publish-pull-request'
              ? this._work.publicationAvailable
              : this._work.executionAvailable,
        ),
      ]),
    );
  });

  /**
   * Delivered pull request per card, resolved once per snapshot for the same reason the stage
   * steps are: every rendered card asks for it on each change-detection pass.
   */
  private readonly _pullRequestByWorkItem = computed(() => {
    const pullRequests = this._context.snapshot()?.pullRequests ?? [];
    const ciRuns = this._context.snapshot()?.ciRuns ?? [];
    const executions = this._executionsByWorkItem();
    return new Map(
      this.allWorkItems().flatMap((item) => {
        const context = resolveBoardPullRequest(executions.get(item.id) ?? [], pullRequests);
        if (!context) return [];
        // Resolved with the pull-request page's own resolver, so both drive the same run.
        const run = context.summary ? resolvePullRequestRun(context.summary, ciRuns) : undefined;
        return [[item.id, run ? { ...context, run } : context] as const];
      }),
    );
  });

  /**
   * Columns the card may be moved to: every column of its own board, in board order. A merged
   * board shows one column per stage across boards, so the target is resolved back to the
   * column of the item's own board - the only value its provider accepts.
   */
  private readonly _moveTargetsBySource = computed(() => {
    const layout = this._columnLayout();
    const targetsBySource = new Map<string, readonly IBoardColumn[]>();
    for (const item of this.workItems()) {
      const key = item.sourceId ?? '';
      if (targetsBySource.has(key)) continue;
      targetsBySource.set(
        key,
        layout.columns.filter(
          (column) =>
            column.id !== UNASSIGNED_BOARD_COLUMN_ID && layout.providerColumnFor(item, column.id),
        ),
      );
    }
    return targetsBySource;
  });

  /**
   * Cards marked for one shared delivery. The stable work-item keys survive CDK view recycling
   * and preserve first-selected-is-root semantics independently of mounted element references.
   */
  private readonly _selectedItemKeys = signal<readonly string[]>([]);

  /**
   * The selected item keys, in selection order; the first selected card is the root.
   *
   * @public
   * @readonly
   */
  public readonly selectedItemKeys = computed(() => this._selectedItemKeys());

  /**
   * Whether the selection can be delivered together, mirroring the boundary rules the
   * drag-to-group path relies on; a violated rule is named for the operator.
   *
   * @public
   * @readonly
   */
  public readonly selectionEligibility = computed<{
    canDeliver: boolean;
    blockedReason?: string;
  }>(() => {
    const itemById = this._workItemsById();
    const items = [...this._selectedItemKeys()].flatMap((workItemId) => {
      const item = itemById.get(workItemId);
      return item ? [item] : [];
    });
    if (items.length < 2)
      return { canDeliver: false, blockedReason: 'Select at least two tickets.' };
    if (items.length > 10)
      return { canDeliver: false, blockedReason: 'Select at most ten tickets.' };
    const [root] = items;
    if (!root?.workspaceId || !root.sourceId || !root.repository) {
      return {
        canDeliver: false,
        blockedReason: 'Delivery groups require a workspace, delivery source, and repository.',
      };
    }
    if (items.some((item) => item.workspaceId !== root.workspaceId)) {
      return { canDeliver: false, blockedReason: 'Selected tickets span more than one workspace.' };
    }
    if (items.some((item) => item.sourceId !== root.sourceId)) {
      return { canDeliver: false, blockedReason: 'Selected tickets span more than one board.' };
    }
    if (items.some((item) => item.repository !== root.repository)) {
      return {
        canDeliver: false,
        blockedReason: 'Selected tickets span more than one repository.',
      };
    }
    const activeMemberIds = new Set(
      (this._context.snapshot()?.deliveryGroups ?? [])
        .filter((group) => group.state !== 'dissolved' && group.state !== 'completed')
        .flatMap((group) => group.workItemIds),
    );
    const grouped = items.find((item) => activeMemberIds.has(item.id));
    if (grouped) {
      return {
        canDeliver: false,
        blockedReason: grouped.externalId + ' already delivers in a group.',
      };
    }
    return { canDeliver: true };
  });

  private readonly _items = computed(() => (columnId: string) => this.resolveItems(columnId));

  private readonly _isColumnExpanded = computed(
    () => (columnId: string) => this.resolveIsColumnExpanded(columnId),
  );

  private readonly _setColumnExpandedCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteSetColumnExpandedCommand(event),
  );
  private readonly _isBoardSelected = computed(
    () => (sourceId: string) => this.resolveIsBoardSelected(sourceId),
  );

  private readonly _selectBoardCommand: Command<string | undefined> = new Command(
    (sourceId) => void this.onExecuteSelectBoardCommand(sourceId),
  );
  private readonly _assignees = computed(() => (item: IWorkItem) => this.resolveAssignees(item));

  private readonly _projectFieldEntries = computed(
    () => (item: IWorkItem) => this.resolveProjectFieldEntries(item),
  );

  private readonly _filterByColumnCommand: Command<string | undefined> = new Command(
    (columnId) => void this.onExecuteFilterByColumnCommand(columnId),
  );
  private readonly _clearAttentionFilterCommand: Command<void> = new Command(
    () => void this.onExecuteClearAttentionFilterCommand(),
  );
  private readonly _filterByLabelCommand: Command<string | undefined> = new Command(
    (label) => void this.onExecuteFilterByLabelCommand(label),
  );
  private readonly _filterByAssigneeCommand: Command<string | undefined> = new Command(
    (login) => void this.onExecuteFilterByAssigneeCommand(login),
  );
  private readonly _workspaceFor = computed(
    () => (item: IWorkItem) => this.resolveWorkspaceFor(item),
  );

  private readonly _runtimeStatus = computed(
    () => (workItemId: string) => this.resolveRuntimeStatus(workItemId),
  );

  private readonly _externalCoordination = computed(
    () => (item: IWorkItem) => this.resolveExternalCoordination(item),
  );

  private readonly _implementationBranch = computed(
    () => (workItemId: string) => this.resolveImplementationBranch(workItemId),
  );

  private readonly _health = computed(() => (item: IWorkItem) => this.resolveHealth(item));

  private readonly _contextActions = computed(
    () => (item: IWorkItem) => this.resolveContextActions(item),
  );

  private readonly _isContextActionBusy = computed(
    () => (workItemId: string) => this.resolveIsContextActionBusy(workItemId),
  );

  private readonly _hasPullRequest = computed(
    () => (item: IWorkItem) => this.resolveHasPullRequest(item),
  );

  private readonly _pullRequestNumber = computed(
    () => (item: IWorkItem) => this.resolvePullRequestNumber(item),
  );

  private readonly _pullRequestActions = computed(
    () => (item: IWorkItem) => this.resolvePullRequestActions(item),
  );

  private readonly _executePullRequestActionCommand: Command<
    readonly [item: IWorkItem, action: IBoardPullRequestAction]
  > = new Command(
    (parameters) => void this.onExecuteExecutePullRequestActionCommand(...parameters),
  );
  private readonly _prepareContextActionsCommand: Command<IWorkItem> = new Command(
    (item) => void this.onExecutePrepareContextActionsCommand(item),
  );
  private readonly _moveTargets = computed(
    () => (item: IWorkItem) => this.resolveMoveTargets(item),
  );

  private readonly _isCurrentColumn = computed(
    () => (item: IWorkItem, columnId: string) => this.resolveIsCurrentColumn(item, columnId),
  );

  private readonly _neighbourColumn = computed(
    () => (item: IWorkItem, offset: 1 | -1) => this.resolveNeighbourColumn(item, offset),
  );

  private readonly _moveToColumnCommand: Command<readonly [item: IWorkItem, columnId: string]> =
    new Command((parameters) => void this.onExecuteMoveToColumnCommand(...parameters));
  private readonly _moveByOffsetCommand: Command<readonly [item: IWorkItem, offset: 1 | -1]> =
    new Command((parameters) => void this.onExecuteMoveByOffsetCommand(...parameters));
  private readonly _openContextActionsCommand: Command<
    readonly [event: MouseEvent, menu: DropDownButtonComponent, item: IWorkItem]
  > = new Command((parameters) => void this.onExecuteOpenContextActionsCommand(...parameters));
  private readonly _assignableUsers = computed(
    () => (item: IWorkItem) => this.resolveAssignableUsers(item),
  );

  private readonly _isAssignedTo = computed(
    () => (item: IWorkItem, login: string) => this.resolveIsAssignedTo(item, login),
  );

  private readonly _toggleAssigneeCommand: Command<readonly [item: IWorkItem, login: string]> =
    new Command((parameters) => void this.onExecuteToggleAssigneeCommand(...parameters));
  private readonly _openTaskFromCardCommand: Command<
    readonly [event: MouseEvent, workItemId: string]
  > = new Command((parameters) => void this.onExecuteOpenTaskFromCardCommand(...parameters));
  private readonly _executeContextActionCommand: Command<
    readonly [item: IWorkItem, action: IBoardContextAction]
  > = new Command((parameters) => void this.onExecuteExecuteContextActionCommand(...parameters));
  private readonly _openWorkItemUrlCommand: Command<IWorkItem> = new Command(
    (item) => void this.onExecuteOpenWorkItemUrlCommand(item),
  );
  private readonly _copyWorkItemUrlCommand: Command<IWorkItem> = new Command(
    (item) => void this.onExecuteCopyWorkItemUrlCommand(item),
  );
  private readonly _openTaskCommand: Command<string> = new Command(
    (id) => void this.onExecuteOpenTaskCommand(id),
  );
  private readonly _openProcessCommand: Command<string> = new Command(
    (id) => void this.onExecuteOpenProcessCommand(id),
    computed(() => this.workflowAvailable),
  );
  private readonly _createTaskCommand: Command<void> = new Command(
    () => void this.onExecuteCreateTaskCommand(),
  );
  private readonly _refreshCommand: Command<void> = new Command(
    () => void this.onExecuteRefreshCommand(),
  );
  // #endregion

  // #region Ctor

  public constructor() {
    super();
    effect(() => {
      const id = this._queryParamMap().get('item');
      const process = this._queryParamMap().get('process') === 'true';
      const key = `${id}:${process}`;
      if (
        id &&
        (!process || this.workflowAvailable) &&
        key !== this._openedRouteItem &&
        this._context.snapshot()?.workItems.some((item) => item.id === id)
      ) {
        this._openedRouteItem = key;
        this._work.selectWorkItem(id);
        if (process) this._openProcessCommand.execute(id);
        else this._openTaskCommand.execute(id);
      }
    });
    watchCreateIntent(() => this.onExecuteCreateTaskCommand());
    effect(() => {
      const query = this._queryParamMap().get('q');
      if (query !== null) this.searchQuery.set(query);
    });
    effect(() => {
      const column = this._queryParamMap().get('column');
      if (column !== null) this.selectedColumnId.set(column || undefined);
    });
    effect(() => {
      const parameters = this._queryParamMap();
      const attention = parameters.get('attention') === 'true';
      this.attentionOnly.set(attention);
      if (attention) {
        // An explicit attention drill-down replaces a previous stage or column drill-down.
        if (parameters.get('column') === null) this.selectedColumnId.set(undefined);
        if (parameters.get('q') === null) this.searchQuery.set('');
        this._landscape.stageId.set(undefined);
        this.selectedLabel.set(undefined);
      }
    });
    effect(() => {
      const selectedColumnId = this.selectedColumnId();
      const columns = this.allColumns();
      // Only a loaded board can prove the column gone; an empty layout is still hydrating.
      if (
        selectedColumnId &&
        columns.length &&
        !columns.some((column) => column.id === selectedColumnId)
      ) {
        this.selectedColumnId.set(undefined);
      }
    });
    effect(() => {
      const selectedLabel = this.selectedLabel();
      if (selectedLabel && !this.availableLabels().includes(selectedLabel)) {
        this.selectedLabel.set(undefined);
      }
    });
    effect(() => {
      const selectedAssigneeLogin = this.selectedAssigneeLogin();
      if (
        selectedAssigneeLogin &&
        !this.availableAssignees().some((assignee) => assignee.login === selectedAssigneeLogin)
      ) {
        this.selectedAssigneeLogin.set(undefined);
      }
    });
    // "Assign to" only renders once its people are known (see BoardView.html), so the scopes
    // of the visible items are fetched with the board rather than on the first menu open.
    effect(() => {
      for (const item of this.workItems()) void this.prepareAssignableUsers(item, false);
    });
    effect(() => {
      const knownIds = this._workItemsById();
      const selected = this._selectedItemKeys();
      if (selected.every((workItemId) => knownIds.has(workItemId))) return;
      this._selectedItemKeys.set(selected.filter((workItemId) => knownIds.has(workItemId)));
    });
    // A group covering the whole selection means the drawer confirmed it (or another surface
    // did); the finished selection would otherwise linger as stale card state on the board.
    effect(() => {
      const selected = this._selectedItemKeys();
      if (!selected.length) return;
      const covered = (this._context.snapshot()?.deliveryGroups ?? []).some(
        (group) =>
          (group.state === 'active' || group.state === 'synchronizing') &&
          selected.every((workItemId) => group.workItemIds.includes(workItemId)),
      );
      if (covered) this.requestSelectionClear();
    });
  }

  // #endregion

  // #region Properties

  /**
   * The items projection.
   *
   * @public
   * @readonly
   */
  public get items() {
    return this._items;
  }
  /**
   * The isColumnExpanded projection.
   *
   * @public
   * @readonly
   */
  public get isColumnExpanded() {
    return this._isColumnExpanded;
  }
  /**
   * The setColumnExpanded command.
   *
   * @public
   * @readonly
   */
  public get setColumnExpandedCommand(): Command<unknown> {
    return this._setColumnExpandedCommand;
  }
  /**
   * The isBoardSelected projection.
   *
   * @public
   * @readonly
   */
  public get isBoardSelected() {
    return this._isBoardSelected;
  }
  /**
   * The selectBoard command.
   *
   * @public
   * @readonly
   */
  public get selectBoardCommand(): Command<string | undefined> {
    return this._selectBoardCommand;
  }
  /**
   * The assignees projection.
   *
   * @public
   * @readonly
   */
  public get assignees() {
    return this._assignees;
  }
  /**
   * The projectFieldEntries projection.
   *
   * @public
   * @readonly
   */
  public get projectFieldEntries() {
    return this._projectFieldEntries;
  }
  /**
   * The filterByColumn command.
   *
   * @public
   * @readonly
   */
  public get filterByColumnCommand(): Command<string | undefined> {
    return this._filterByColumnCommand;
  }
  /**
   * The clearAttentionFilter command.
   *
   * @public
   * @readonly
   */
  public get clearAttentionFilterCommand(): Command<void> {
    return this._clearAttentionFilterCommand;
  }
  /**
   * The filterByLabel command.
   *
   * @public
   * @readonly
   */
  public get filterByLabelCommand(): Command<string | undefined> {
    return this._filterByLabelCommand;
  }
  /**
   * The filterByAssignee command.
   *
   * @public
   * @readonly
   */
  public get filterByAssigneeCommand(): Command<string | undefined> {
    return this._filterByAssigneeCommand;
  }
  /**
   * The workspaceFor projection.
   *
   * @public
   * @readonly
   */
  public get workspaceFor() {
    return this._workspaceFor;
  }
  /**
   * The runtimeStatus projection.
   *
   * @public
   * @readonly
   */
  public get runtimeStatus() {
    return this._runtimeStatus;
  }
  /**
   * The externalCoordination projection.
   *
   * @public
   * @readonly
   */
  public get externalCoordination() {
    return this._externalCoordination;
  }
  /**
   * The implementationBranch projection.
   *
   * @public
   * @readonly
   */
  public get implementationBranch() {
    return this._implementationBranch;
  }
  /**
   * The health projection.
   *
   * @public
   * @readonly
   */
  public get health() {
    return this._health;
  }
  /**
   * The contextActions projection.
   *
   * @public
   * @readonly
   */
  public get contextActions() {
    return this._contextActions;
  }
  /**
   * The isContextActionBusy projection.
   *
   * @public
   * @readonly
   */
  public get isContextActionBusy() {
    return this._isContextActionBusy;
  }
  /**
   * The hasPullRequest projection.
   *
   * @public
   * @readonly
   */
  public get hasPullRequest() {
    return this._hasPullRequest;
  }
  /**
   * The pullRequestNumber projection.
   *
   * @public
   * @readonly
   */
  public get pullRequestNumber() {
    return this._pullRequestNumber;
  }
  /**
   * The pullRequestActions projection.
   *
   * @public
   * @readonly
   */
  public get pullRequestActions() {
    return this._pullRequestActions;
  }
  /**
   * The executePullRequestAction command.
   *
   * @public
   * @readonly
   */
  public get executePullRequestActionCommand(): Command<
    readonly [item: IWorkItem, action: IBoardPullRequestAction]
  > {
    return this._executePullRequestActionCommand;
  }
  /**
   * The prepareContextActions command.
   *
   * @public
   * @readonly
   */
  public get prepareContextActionsCommand(): Command<IWorkItem> {
    return this._prepareContextActionsCommand;
  }
  /**
   * The moveTargets projection.
   *
   * @public
   * @readonly
   */
  public get moveTargets() {
    return this._moveTargets;
  }
  /**
   * The isCurrentColumn projection.
   *
   * @public
   * @readonly
   */
  public get isCurrentColumn() {
    return this._isCurrentColumn;
  }
  /**
   * The neighbourColumn projection.
   *
   * @public
   * @readonly
   */
  public get neighbourColumn() {
    return this._neighbourColumn;
  }
  /**
   * The moveToColumn command.
   *
   * @public
   * @readonly
   */
  public get moveToColumnCommand(): Command<readonly [item: IWorkItem, columnId: string]> {
    return this._moveToColumnCommand;
  }
  /**
   * The moveByOffset command.
   *
   * @public
   * @readonly
   */
  public get moveByOffsetCommand(): Command<readonly [item: IWorkItem, offset: 1 | -1]> {
    return this._moveByOffsetCommand;
  }
  /**
   * The openContextActions command.
   *
   * @public
   * @readonly
   */
  public get openContextActionsCommand(): Command<
    readonly [event: MouseEvent, menu: DropDownButtonComponent, item: IWorkItem]
  > {
    return this._openContextActionsCommand;
  }
  /**
   * The assignableUsers projection.
   *
   * @public
   * @readonly
   */
  public get assignableUsers() {
    return this._assignableUsers;
  }
  /**
   * The isAssignedTo projection.
   *
   * @public
   * @readonly
   */
  public get isAssignedTo() {
    return this._isAssignedTo;
  }
  /**
   * The toggleAssignee command.
   *
   * @public
   * @readonly
   */
  public get toggleAssigneeCommand(): Command<readonly [item: IWorkItem, login: string]> {
    return this._toggleAssigneeCommand;
  }
  /**
   * The openTaskFromCard command.
   *
   * @public
   * @readonly
   */
  public get openTaskFromCardCommand(): Command<readonly [event: MouseEvent, workItemId: string]> {
    return this._openTaskFromCardCommand;
  }
  /**
   * The executeContextAction command.
   *
   * @public
   * @readonly
   */
  public get executeContextActionCommand(): Command<
    readonly [item: IWorkItem, action: IBoardContextAction]
  > {
    return this._executeContextActionCommand;
  }
  /**
   * The openWorkItemUrl command.
   *
   * @public
   * @readonly
   */
  public get openWorkItemUrlCommand(): Command<IWorkItem> {
    return this._openWorkItemUrlCommand;
  }
  /**
   * The copyWorkItemUrl command.
   *
   * @public
   * @readonly
   */
  public get copyWorkItemUrlCommand(): Command<IWorkItem> {
    return this._copyWorkItemUrlCommand;
  }
  /**
   * The openTask command.
   *
   * @public
   * @readonly
   */
  public get openTaskCommand(): Command<string> {
    return this._openTaskCommand;
  }
  /**
   * The openProcess command.
   *
   * @public
   * @readonly
   */
  public get openProcessCommand(): Command<string> {
    return this._openProcessCommand;
  }
  /**
   * The createTask command.
   *
   * @public
   * @readonly
   */
  public get createTaskCommand(): Command<void> {
    return this._createTaskCommand;
  }
  /**
   * The refresh command.
   *
   * @public
   * @readonly
   */
  public get refreshCommand(): Command<void> {
    return this._refreshCommand;
  }
  // #endregion

  // #region Methods

  /**
   * Handles hydrate.
   *
   * @public
   */
  public override onHydrate(): Promise<void> {
    return hydrateBoardRoute(this._boardRoute);
  }

  /**
   * Returns the items.
   *
   * @param columnId - Column id.
   * @private
   */
  private resolveItems(columnId: string) {
    return this._itemsByColumn().get(columnId) ?? [];
  }

  /**
   * Returns individual cards not currently represented by a compact stack.
   *
   * @public
   * @readonly
   */
  public readonly standaloneItems = (columnId: string): readonly IWorkItem[] => {
    const grouped = this._compactGroupMemberIds();
    return this.resolveItems(columnId).filter((item) => !grouped.has(item.id));
  };

  /**
   * Returns root-led compact groups occupying a provider column.
   *
   * @public
   * @readonly
   */
  public readonly deliveryGroups = (columnId: string): readonly IDeliveryGroup[] => {
    const itemById = this._workItemsById();
    return this._compactDeliveryGroups().filter(
      (group) => itemById.get(group.rootWorkItemId)?.boardColumnId === columnId,
    );
  };

  /**
   * Returns the stable virtual-scroll projection for one column.
   *
   * @param columnId - Column id.
   * @public
   * @readonly
   */
  public readonly columnEntries = (columnId: string): readonly IBoardColumnEntry[] =>
    this._columnEntriesByColumn().get(columnId) ?? [];

  /**
   * Returns stable entry keys in the same order as the column projection.
   *
   * @param columnId - Column id.
   * @public
   * @readonly
   */
  public readonly columnEntryKeys = (columnId: string): readonly string[] =>
    this._columnEntryKeysByColumn().get(columnId) ?? [];

  /**
   * Tracks a virtualized board entry.
   *
   * @param _index - Logical entry index.
   * @param entry - Board entry.
   * @public
   * @readonly
   */
  public readonly trackColumnEntry = (_index: number, entry: IBoardColumnEntry): string => entry.id;

  /**
   * Resolves a group member from the current provider projection.
   *
   * @public
   * @readonly
   */
  public readonly deliveryGroupItem = (
    group: IDeliveryGroup,
    workItemId: string,
  ): IWorkItem | undefined => {
    return group.workItemIds.includes(workItemId)
      ? this._workItemsById().get(workItemId)
      : undefined;
  };

  /**
   * Paused drift group that currently exposes this member as an individual provider card.
   *
   * @public
   * @readonly
   */
  public readonly pausedDeliveryGroup = (workItemId: string): IDeliveryGroup | undefined => {
    return this._context
      .snapshot()
      ?.deliveryGroups?.find(
        (group) => group.state === 'paused' && group.workItemIds.includes(workItemId),
      );
  };

  /**
   * Open Analyzer relationship that should be reviewed before this ticket enters another lane.
   *
   * @public
   * @readonly
   */
  public readonly criticalPathProposal = (workItemId: string): IDeliveryGroupProposal | undefined =>
    this.criticalPathProposalFor(workItemId);

  /**
   * Opens the relationship evidence without activating the underlying ticket card.
   *
   * @public
   * @readonly
   */
  public readonly openCriticalPath = (event: Event, proposalId: string): void => {
    event.stopPropagation();
    void this.openDeliveryGroupDrawer(undefined, proposalId);
  };

  /**
   * Opens the shared drift action without activating the underlying ticket card.
   *
   * @public
   * @readonly
   */
  public readonly openPausedDeliveryGroup = (event: Event, deliveryGroupId: string): void => {
    event.stopPropagation();
    void this.openDeliveryGroupDrawer(deliveryGroupId);
  };

  /**
   * Whether the card is part of the delivery selection.
   *
   * @public
   * @readonly
   */
  public readonly isSelected = (workItemId: string): boolean =>
    this._selectedItemKeys().includes(workItemId);

  /**
   * Mirrors one virtualized card's native selected state by stable work-item key.
   *
   * Element references leave the DOM as the viewport recycles cards, so the presenter keeps the
   * durable ordered selection while the card restores its native state when it is mounted again.
   *
   * @param workItemId - Work-item id.
   * @param selected - Whether the card is selected.
   * @public
   * @readonly
   */
  public readonly setItemSelected = (workItemId: string, selected: boolean): void => {
    this._selectedItemKeys.update((current) => {
      if (selected) return current.includes(workItemId) ? current : [...current, workItemId];
      return current.filter((currentId) => currentId !== workItemId);
    });
  };

  /**
   * Clears the delivery selection on the board and in the presenter mirror.
   *
   * @public
   * @readonly
   */
  public readonly clearSelection = (): void => {
    this.requestSelectionClear();
  };

  /**
   * Lets the operator choose direct grouping or Analyzer evidence for the selected tickets;
   * the first selected card is the root.
   *
   * @public
   * @readonly
   */
  public readonly deliverSelectedTogether = async (): Promise<void> => {
    const workItemIds = [...this._selectedItemKeys()];
    const [rootWorkItemId] = workItemIds;
    if (!rootWorkItemId || !this.selectionEligibility().canDeliver) return;
    const mode = await this.chooseDeliveryGroupMode();
    if (!mode) return;
    if (mode === 'direct') {
      if (await this._work.groupDeliveryDirectly(workItemIds, rootWorkItemId, 'manual-select')) {
        this.requestSelectionClear();
      }
      return;
    }
    const proposal = await this._work.assessDeliveryGroup(
      workItemIds,
      rootWorkItemId,
      'manual-select',
    );
    if (proposal) await this.openDeliveryGroupDrawer(undefined, proposal.id);
  };

  /**
   * Handles Mosaik's provider-neutral item/stack grouping intent.
   *
   * @public
   * @readonly
   */
  public readonly groupBoardItems = async (event: unknown): Promise<void> => {
    const detail = event as {
      sourceMemberKeys?: unknown;
      targetRootItemKey?: unknown;
    } | null;
    if (!Array.isArray(detail?.sourceMemberKeys) || typeof detail.targetRootItemKey !== 'string') {
      return;
    }
    const workItemIds = [
      detail.targetRootItemKey,
      ...detail.sourceMemberKeys.filter((value): value is string => typeof value === 'string'),
    ];
    const mode = await this.chooseDeliveryGroupMode();
    if (!mode) return;
    if (mode === 'direct') {
      await this._work.groupDeliveryDirectly(
        [...new Set(workItemIds)],
        detail.targetRootItemKey,
        'manual-drag',
      );
      return;
    }
    const proposal = await this._work.assessDeliveryGroup(
      [...new Set(workItemIds)],
      detail.targetRootItemKey,
      'manual-drag',
    );
    if (proposal) await this.openDeliveryGroupDrawer(undefined, proposal.id);
  };

  /**
   * Commits a controlled Mosaik item or stack move through the provider adapter.
   *
   * @public
   * @readonly
   */
  public readonly moveBoardEntry = async (event: unknown): Promise<void> => {
    const detail = event as { itemKey?: unknown; toColumnKey?: unknown } | null;
    if (typeof detail?.itemKey !== 'string' || typeof detail.toColumnKey !== 'string') return;
    await this.moveBoardEntryToColumn(detail.itemKey, detail.toColumnKey);
  };

  /**
   * Moves one item or delivery group to a provider column.
   *
   * @param itemKey - Work-item or delivery-group key.
   * @param toColumnKey - Target provider column key.
   * @private
   */
  private async moveBoardEntryToColumn(itemKey: string, toColumnKey: string): Promise<void> {
    const group = this._context
      .snapshot()
      ?.deliveryGroups?.find((candidate) => candidate.id === itemKey);
    const proposal = group ? undefined : this.criticalPathProposalFor(itemKey);
    if (proposal) {
      await this.openDeliveryGroupDrawer(undefined, proposal.id, {
        requestedWorkItemId: itemKey,
        requestedColumnId: toColumnKey,
        requestedColumnLabel: this.allColumns().find((column) => column.id === toColumnKey)?.label,
      });
      return;
    }
    const columnLabel = this.allColumns().find((column) => column.id === toColumnKey)?.label;
    if (group) {
      await this.moveDeliveryGroup(group, toColumnKey);
      return;
    }
    await this._work.moveWorkItem(itemKey, toColumnKey, columnLabel);
  }

  /**
   * Opens the group review drawer for a persisted group or an open proposal.
   *
   * @public
   * @readonly
   */
  public readonly openDeliveryGroup = async (
    deliveryGroupId?: string,
    proposalId?: string,
    requestedMove?: Pick<
      IDeliveryGroupDrawerData,
      'requestedWorkItemId' | 'requestedColumnId' | 'requestedColumnLabel'
    >,
  ): Promise<void> => {
    await this.openDeliveryGroupDrawer(deliveryGroupId, proposalId, requestedMove);
  };

  private criticalPathProposalFor(workItemId: string): IDeliveryGroupProposal | undefined {
    return this._context
      .snapshot()
      ?.deliveryGroupProposals?.find(
        (proposal) =>
          proposal.state === 'open' &&
          proposal.workItemIds.includes(workItemId) &&
          proposal.assessment.sharedChangeSurface.length > 0 &&
          proposal.assessment.relation !== 'unrelated' &&
          proposal.assessment.relation !== 'duplicate',
      );
  }

  private async openDeliveryGroupDrawer(
    deliveryGroupId?: string,
    proposalId?: string,
    requestedMove?: Pick<
      IDeliveryGroupDrawerData,
      'requestedWorkItemId' | 'requestedColumnId' | 'requestedColumnLabel'
    >,
  ): Promise<void> {
    if (this._activeGroupDrawer && this._drawerService.isShown(this._activeGroupDrawer)) {
      this._activeGroupDrawer.requestAttention();
      return;
    }
    const { DeliveryGroupDrawerView } = await import('../views/dialogs/DeliveryGroupDrawerView');
    const drawer = this._drawerService.show<IDeliveryGroupDrawerData>(DeliveryGroupDrawerView, {
      data: {
        ...(deliveryGroupId ? { deliveryGroupId } : {}),
        ...(proposalId ? { proposalId } : {}),
        ...requestedMove,
      },
    });
    this._activeGroupDrawer = drawer;
    drawer.closed.subscribe(() => {
      if (this._activeGroupDrawer === drawer) this._activeGroupDrawer = undefined;
    });
  }

  /**
   * Whether it is column expanded.
   *
   * @param columnId - Column id.
   * @private
   */
  private resolveIsColumnExpanded(columnId: string): boolean {
    return this._columnCollapse.isExpanded(columnId);
  }

  /**
   * Mosaik reports the new state of one column; the wrapper forwards the event detail.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteSetColumnExpandedCommand(event: unknown): void {
    const detail = event as { columnKey?: unknown; isExpanded?: unknown } | null;
    if (typeof detail?.columnKey !== 'string' || typeof detail.isExpanded !== 'boolean') return;
    if (!detail.isExpanded) {
      const collapsedIds = new Set(this.resolveItems(detail.columnKey).map((item) => item.id));
      this._selectedItemKeys.update((selected) =>
        selected.filter((workItemId) => !collapsedIds.has(workItemId)),
      );
    }
    this._columnCollapse.setExpanded(detail.columnKey, detail.isExpanded);
  }

  /**
   * Whether it is board selected.
   *
   * @param sourceId - Source id.
   * @private
   */
  private resolveIsBoardSelected(sourceId: string): boolean {
    return this.selectedBoard()?.id === sourceId;
  }

  /**
   * Selects the board.
   *
   * @param sourceId - Source id.
   * @private
   */
  private async onExecuteSelectBoardCommand(sourceId: string | undefined): Promise<void> {
    await this._boardSelection?.selectBoard(sourceId);
  }

  /**
   * Returns the search.
   *
   * @param event - Event.
   * @private
   */
  private search(event: unknown): void {
    const detail = event as { query?: unknown; target?: HTMLElement & { value?: string } } | null;
    this.searchQuery.set(
      typeof detail?.query === 'string'
        ? detail.query
        : typeof detail?.target?.value === 'string'
          ? detail.target.value
          : '',
    );
  }

  /**
   * Returns the assignees.
   *
   * @param item - Item.
   * @private
   */
  private resolveAssignees(item: IWorkItem): readonly IWorkItemAssignee[] {
    return item.assignees ?? [];
  }

  /**
   * Returns the project field entries.
   *
   * @param item - Item.
   * @private
   */
  private resolveProjectFieldEntries(item: IWorkItem): readonly { name: string; value: string }[] {
    return this._projectFieldEntriesByWorkItem().get(item.id) ?? [];
  }

  /**
   * Filters the by column.
   *
   * @param columnId - Column id.
   * @private
   */
  private onExecuteFilterByColumnCommand(columnId?: string): void {
    this.selectedColumnId.set(columnId);
  }

  /**
   * Clears the attention filter.
   *
   * @private
   */
  private onExecuteClearAttentionFilterCommand(): void {
    this.attentionOnly.set(false);
  }

  /**
   * Filters the by label.
   *
   * @param label - Label.
   * @private
   */
  private onExecuteFilterByLabelCommand(label?: string): void {
    this.selectedLabel.set(label);
  }

  /**
   * Filters the by assignee.
   *
   * @param login - Login.
   * @private
   */
  private onExecuteFilterByAssigneeCommand(login?: string): void {
    this.selectedAssigneeLogin.set(login);
  }

  /**
   * Returns the workspace for.
   *
   * @param item - Item.
   * @private
   */
  private resolveWorkspaceFor(item: IWorkItem) {
    return item.workspaceId ? this._workspacesById().get(item.workspaceId) : undefined;
  }

  /**
   * Returns the runtime status.
   *
   * @param workItemId - Work item id.
   * @private
   */
  private resolveRuntimeStatus(workItemId: string): ITaskRuntimeState | undefined {
    return this._runtimeStatuses().get(workItemId);
  }

  /**
   * Ownership held by another orchestrator. An expired lease is not reported: the owning
   * machine is gone, and the work item is available again.
   *
   * @param item - Item.
   * @private
   */
  private resolveExternalCoordination(item: IWorkItem): IWorkItem['coordination'] | undefined {
    const coordination = activeWorkItemCoordination(item.coordination, new Date());
    if (!coordination) return undefined;
    const isOwnedLocally = (this._context.snapshot()?.executions ?? []).some(
      (execution) => execution.workItemClaim?.id === coordination.claimId,
    );
    if (isOwnedLocally) return undefined;
    return coordination;
  }

  /**
   * Returns the implementation branch.
   *
   * @param workItemId - Work item id.
   * @private
   */
  private resolveImplementationBranch(workItemId: string): string | undefined {
    return this._implementationBranches().get(workItemId);
  }

  /**
   * Returns the health.
   *
   * @param item - Item.
   * @private
   */
  private resolveHealth(item: IWorkItem): IWorkItemHealth | undefined {
    const health = this._healthByWorkItem().get(item.id);
    return health?.severity ? health : undefined;
  }

  /**
   * Returns the context actions.
   *
   * @param item - Item.
   * @private
   */
  private resolveContextActions(item: IWorkItem): readonly IBoardContextAction[] {
    return this._contextActionsByWorkItem().get(item.id) ?? [];
  }

  /**
   * Whether it is context action busy.
   *
   * @param workItemId - Work item id.
   * @private
   */
  private resolveIsContextActionBusy(workItemId: string): boolean {
    return this._contextActionBusyIds().has(workItemId);
  }

  /**
   * True once the item has a pull request, which is what puts the entry on its menu.
   *
   * @param item - Item.
   * @private
   */
  private resolveHasPullRequest(item: IWorkItem): boolean {
    return this._pullRequestByWorkItem().has(item.id);
  }

  /**
   * Pulls the request number.
   *
   * @param item - Item.
   * @private
   */
  private resolvePullRequestNumber(item: IWorkItem): number | undefined {
    return this._pullRequestByWorkItem().get(item.id)?.reference.number;
  }

  /**
   * Whether the delivered pull request conflicts with its base branch.
   *
   * @public
   * @readonly
   */
  public readonly hasConflictingPullRequest = (item: IWorkItem): boolean =>
    this._pullRequestByWorkItem().get(item.id)?.summary?.baseBranchStatus === 'conflicting';

  /**
   * The pull request's own actions, offered on the card so a delivered item can be driven
   * without leaving the board. The entries mirror the pull-request page and act on the same run.
   *
   * @param item - Item.
   * @private
   */
  private resolvePullRequestActions(item: IWorkItem): readonly IBoardPullRequestAction[] {
    const context = this._pullRequestByWorkItem().get(item.id);
    if (!context) return [];
    const localRunId = this._ci?.localCiRunningRunId();
    return resolveBoardPullRequestActions(context, {
      localCiEnabled:
        this._ci?.localCiEnabledFor(context.run?.workspaceId ?? item.workspaceId) ?? false,
      ...(localRunId ? { localRunId } : {}),
    }).filter((action) => this._ci !== null || action.id === 'open');
  }

  /**
   * Executes the pull request action.
   *
   * @param item - Item.
   * @param action - Action.
   * @private
   */
  private async onExecuteExecutePullRequestActionCommand(
    item: IWorkItem,
    action: IBoardPullRequestAction,
  ): Promise<void> {
    const context = this._pullRequestByWorkItem().get(item.id);
    if (!context || action.blockedReason) return;
    if (action.id === 'open') {
      this._externalLinks.open(context.reference.externalUrl);
      return;
    }
    const runId = action.runId;
    if (!runId) return;
    await this.runExclusively(item.id, async () => {
      if (action.id === 'remote') {
        await (action.cancels ? this._ci?.cancelCiRun(runId) : this._ci?.rerunCiRun(runId));
        return;
      }
      await (action.cancels ? this._ci?.cancelLocalCiRun(runId) : this._ci?.runCiLocally(runId));
    });
  }

  /**
   * Brings the workflow state of a delivered card up to date when its menu opens.
   *
   * Runs are polled on a slow timer, so the entry an operator sees could otherwise offer to
   * start a run that is already going, or to cancel one that finished minutes ago.
   *
   * @param item - Item.
   * @private
   */
  private async onExecutePrepareContextActionsCommand(item: IWorkItem): Promise<void> {
    await this.prepareAssignableUsers(item);
    if (this.resolveHasPullRequest(item)) await this._ci?.refreshContinuousIntegrationRuns();
  }

  /**
   * Moves the targets.
   *
   * @param item - Item.
   * @private
   */
  private resolveMoveTargets(item: IWorkItem): readonly IBoardColumn[] {
    return this._moveTargetsBySource().get(item.sourceId ?? '') ?? [];
  }

  /**
   * Provider columns available to a delivery group through its root item.
   *
   * @param group - Delivery group.
   * @public
   * @readonly
   */
  public readonly deliveryGroupMoveTargets = (group: IDeliveryGroup): readonly IBoardColumn[] =>
    this.deliveryGroupMoveTargetsFor(group);

  /**
   * Whether it is current column.
   *
   * @param item - Item.
   * @param columnId - Column id.
   * @private
   */
  private resolveIsCurrentColumn(item: IWorkItem, columnId: string): boolean {
    return this._columnLayout().columnIdFor(item) === columnId;
  }

  /**
   * Whether the group root already occupies a visible column.
   *
   * @param group - Delivery group.
   * @param columnId - Visible column identifier.
   * @public
   * @readonly
   */
  public readonly isDeliveryGroupCurrentColumn = (
    group: IDeliveryGroup,
    columnId: string,
  ): boolean => this.isDeliveryGroupInColumn(group, columnId);

  /**
   * Neighbouring column in board order, or undefined at either end.
   *
   * @param item - Item.
   * @param offset - Offset.
   * @private
   */
  private resolveNeighbourColumn(item: IWorkItem, offset: 1 | -1): IBoardColumn | undefined {
    const targets = this.resolveMoveTargets(item);
    const index = targets.findIndex((column) => this.resolveIsCurrentColumn(item, column.id));
    return index < 0 ? undefined : targets[index + offset];
  }

  /**
   * Neighbouring column for a group in board order.
   *
   * @param group - Delivery group.
   * @param offset - Direction in board order.
   * @public
   * @readonly
   */
  public readonly deliveryGroupNeighbourColumn = (
    group: IDeliveryGroup,
    offset: 1 | -1,
  ): IBoardColumn | undefined => this.deliveryGroupNeighbourColumnFor(group, offset);

  /**
   * Moves the to column.
   *
   * @param item - Item.
   * @param columnId - Column id.
   * @private
   */
  private async onExecuteMoveToColumnCommand(item: IWorkItem, columnId: string): Promise<void> {
    if (this.resolveIsContextActionBusy(item.id) || this.resolveIsCurrentColumn(item, columnId))
      return;
    const proposal = this.criticalPathProposalFor(item.id);
    if (proposal) {
      const target = this._columnLayout().providerColumnFor(item, columnId);
      await this.openDeliveryGroupDrawer(undefined, proposal.id, {
        requestedWorkItemId: item.id,
        ...(target ? { requestedColumnId: target.id, requestedColumnLabel: target.label } : {}),
      });
      return;
    }
    const target = this._columnLayout().providerColumnFor(item, columnId);
    if (!target) return;
    await this.runExclusively(item.id, () =>
      this._work.moveWorkItem(item.id, target.id, target.label),
    );
  }

  /**
   * Moves the whole group to a visible column through the root-owned provider transition.
   * Drag-and-drop and every context-menu move share this path.
   *
   * @param group - Delivery group.
   * @param columnId - Visible column identifier.
   * @public
   * @readonly
   */
  public readonly moveDeliveryGroupToColumn = async (
    group: IDeliveryGroup,
    columnId: string,
  ): Promise<void> => this.moveDeliveryGroup(group, columnId);

  /**
   * Moves the by offset.
   *
   * @param item - Item.
   * @param offset - Offset.
   * @private
   */
  private async onExecuteMoveByOffsetCommand(item: IWorkItem, offset: 1 | -1): Promise<void> {
    const target = this.resolveNeighbourColumn(item, offset);
    if (target) await this.onExecuteMoveToColumnCommand(item, target.id);
  }

  /**
   * Moves a delivery group to the neighbouring board column.
   *
   * @param group - Delivery group.
   * @param offset - Direction in board order.
   * @public
   * @readonly
   */
  public readonly moveDeliveryGroupByOffset = async (
    group: IDeliveryGroup,
    offset: 1 | -1,
  ): Promise<void> => this.moveDeliveryGroupBy(group, offset);

  /**
   * Whether any operation represented by the group menu is running.
   * Shared pull-request commands still execute under the root work item identifier.
   *
   * @param group - Delivery group.
   * @public
   * @readonly
   */
  public readonly isDeliveryGroupContextActionBusy = (group: IDeliveryGroup): boolean =>
    this.deliveryGroupActionsBusy(group);

  /**
   * Aligns every member to the root column from the group menu.
   *
   * @param group - Delivery group.
   * @public
   * @readonly
   */
  public readonly alignDeliveryGroup = async (group: IDeliveryGroup): Promise<void> => {
    await this.runExclusively(group.id, () => this._work.alignDeliveryGroup(group.id));
  };

  /**
   * Opens the context actions.
   *
   * @param event - Event.
   * @param menu - Menu.
   * @param item - Item.
   * @private
   */
  private onExecuteOpenContextActionsCommand(
    event: MouseEvent,
    menu: DropDownButtonComponent,
    item: IWorkItem,
  ): void {
    event.preventDefault();
    event.stopPropagation();
    void this.onExecutePrepareContextActionsCommand(item);
    menu.invoke('open');
  }

  /**
   * Refreshes shared pull-request state before the group menu is shown.
   *
   * @param group - Delivery group.
   * @public
   * @readonly
   */
  public readonly prepareDeliveryGroupContextActions = async (
    group: IDeliveryGroup,
  ): Promise<void> => this.prepareDeliveryGroupActions(group);

  /**
   * Opens the action menu for a delivery group without opening its drawer.
   *
   * @param event - Context-menu event.
   * @param menu - Group menu.
   * @param group - Delivery group.
   * @public
   * @readonly
   */
  public readonly openDeliveryGroupContextActions = (
    event: MouseEvent,
    menu: DropDownButtonComponent,
    group: IDeliveryGroup,
  ): void => {
    event.preventDefault();
    event.stopPropagation();
    void this.prepareDeliveryGroupActions(group);
    menu.invoke('open');
  };

  private deliveryGroupMoveTargetsFor(group: IDeliveryGroup): readonly IBoardColumn[] {
    const root = this.deliveryGroupItem(group, group.rootWorkItemId);
    return root ? this.resolveMoveTargets(root) : [];
  }

  private isDeliveryGroupInColumn(group: IDeliveryGroup, columnId: string): boolean {
    const root = this.deliveryGroupItem(group, group.rootWorkItemId);
    return !!root && this.resolveIsCurrentColumn(root, columnId);
  }

  private deliveryGroupNeighbourColumnFor(
    group: IDeliveryGroup,
    offset: 1 | -1,
  ): IBoardColumn | undefined {
    const targets = this.deliveryGroupMoveTargetsFor(group);
    const index = targets.findIndex((column) => this.isDeliveryGroupInColumn(group, column.id));
    return index < 0 ? undefined : targets[index + offset];
  }

  private async moveDeliveryGroup(group: IDeliveryGroup, columnId: string): Promise<void> {
    if (this.deliveryGroupActionsBusy(group) || this.isDeliveryGroupInColumn(group, columnId)) {
      return;
    }
    const root = this.deliveryGroupItem(group, group.rootWorkItemId);
    if (!root) return;
    const target = this._columnLayout().providerColumnFor(root, columnId);
    if (!target) return;
    await this.runExclusively(group.id, () =>
      this._work.moveDeliveryGroup(group.id, root.id, target.id, target.label),
    );
  }

  private async moveDeliveryGroupBy(group: IDeliveryGroup, offset: 1 | -1): Promise<void> {
    const target = this.deliveryGroupNeighbourColumnFor(group, offset);
    if (target) await this.moveDeliveryGroup(group, target.id);
  }

  private deliveryGroupActionsBusy(group: IDeliveryGroup): boolean {
    return (
      this.resolveIsContextActionBusy(group.id) ||
      this.resolveIsContextActionBusy(group.rootWorkItemId)
    );
  }

  private async prepareDeliveryGroupActions(group: IDeliveryGroup): Promise<void> {
    const root = this.deliveryGroupItem(group, group.rootWorkItemId);
    if (root && this.resolveHasPullRequest(root))
      await this._ci?.refreshContinuousIntegrationRuns();
  }

  /**
   * Returns the assignable users.
   *
   * @param item - Item.
   * @private
   */
  private resolveAssignableUsers(item: IWorkItem): readonly IWorkItemAssignee[] {
    return this._assignableUsersByScope().get(this.assignableScopeKey(item)) ?? [];
  }

  /**
   * Fetches the people of one item's scope once; later calls retry only after a failure.
   *
   * @param item - Item.
   * @param retryFailed - Whether a user-triggered call may retry a failed automatic request.
   * @private
   */
  private async prepareAssignableUsers(item: IWorkItem, retryFailed = true): Promise<void> {
    const key = this.assignableScopeKey(item);
    if (
      !shouldRequestAssignableUsers(
        this._assignableUsersByScope().has(key),
        this._assignableUsersLoadingScopes().has(key),
        this._assignableUsersFailedScopes().has(key),
        retryFailed,
      )
    ) {
      return;
    }
    this._assignableUsersFailedScopes.update((keys) => {
      const next = new Set(keys);
      next.delete(key);
      return next;
    });
    this._assignableUsersLoadingScopes.update((keys) => new Set(keys).add(key));
    try {
      const users = await this._work.loadAssignableUsers(
        item.repository,
        item.workspaceId,
        item.sourceId,
        retryFailed,
      );
      if (users) {
        this._assignableUsersByScope.update((byScope) => new Map(byScope).set(key, users));
      } else {
        this._assignableUsersFailedScopes.update((keys) => new Set(keys).add(key));
      }
    } finally {
      this._assignableUsersLoadingScopes.update((keys) => {
        const next = new Set(keys);
        next.delete(key);
        return next;
      });
    }
  }

  /**
   * Whether it is assigned to.
   *
   * @param item - Item.
   * @param login - Login.
   * @private
   */
  private resolveIsAssignedTo(item: IWorkItem, login: string): boolean {
    return this.resolveAssignees(item).some((assignee) => assignee.login === login);
  }

  /**
   * Toggles the assignee.
   *
   * @param item - Item.
   * @param login - Login.
   * @private
   */
  private async onExecuteToggleAssigneeCommand(item: IWorkItem, login: string): Promise<void> {
    if (this.resolveIsContextActionBusy(item.id)) return;
    await this.runExclusively(item.id, async () => {
      // The card may carry only the summary of the item; the update contract writes the whole
      // item back, so a truncated body must be completed before it is returned to the tracker.
      if (!(await this._work.loadWorkItemDetails(item.id))) return;
      const current = this.allWorkItems().find((candidate) => candidate.id === item.id) ?? item;
      // Snapshots merge every board; a field of another board is foreign here, not writable.
      const fields = this.projectFields().filter(
        (field) => !field.sourceId || !current.sourceId || field.sourceId === current.sourceId,
      );
      await this._work.updateWorkItem(item.id, toggleAssigneeMutation(current, login, fields));
    });
  }

  /**
   * Opens the task from card.
   *
   * @param event - Event.
   * @param workItemId - Work item id.
   * @private
   */
  private onExecuteOpenTaskFromCardCommand(event: MouseEvent, workItemId: string): void {
    const originatedInContextActions = event
      .composedPath()
      .some(
        (target) =>
          target instanceof HTMLElement &&
          target.matches('mosaik-dropdown-button, mosaik-menu, mosaik-menu-item'),
      );
    if (!originatedInContextActions) this.onExecuteOpenTaskCommand(workItemId);
  }

  /**
   * Executes the context action.
   *
   * @param item - Item.
   * @param action - Action.
   * @private
   */
  private async onExecuteExecuteContextActionCommand(
    item: IWorkItem,
    action: IBoardContextAction,
  ): Promise<void> {
    // A blocked action is shown to explain the stage, not to be run: starting it would only
    // surface the orchestrator's rejection as an error toast.
    if (action.blockedReason || this.resolveIsContextActionBusy(item.id)) return;
    await this.runExclusively(item.id, async () => {
      switch (action.kind) {
        case 'analyze':
        case 'solve': {
          const approval = await this._localExecutionApproval.request(item);
          if (approval === false) return;
          if (action.kind === 'analyze') {
            await this._work.startAnalyzer(false, item.id, undefined, approval || undefined);
          } else {
            await this._work.startSolver(false, item.id, undefined, approval || undefined);
          }
          return;
        }
        case 'cancel':
          if (action.executionId) await this._work.cancelExecution(action.executionId);
          return;
        case 'dequeue':
          if (action.queueEntryId) await this._work.removeQueueEntry(action.queueEntryId);
          return;
        case 'publish-pull-request':
          if (action.executionId) await this._work.publishPullRequest(action.executionId);
          return;
        case 'decide':
          if (action.optionId) await this._work.decideWorkflow(item.id, action.optionId);
          return;
      }
    });
  }

  /**
   * Opens the item in its tracker; the desktop main process hands the URL to the OS browser.
   *
   * @param item - Item.
   * @private
   */
  private onExecuteOpenWorkItemUrlCommand(item: IWorkItem): void {
    if (!item.externalUrl) return;
    this._externalLinks.open(item.externalUrl);
  }

  /**
   * Copies the work item URL.
   *
   * @param item - Item.
   * @private
   */
  private async onExecuteCopyWorkItemUrlCommand(item: IWorkItem): Promise<void> {
    const url = item.externalUrl;
    if (!url) return;
    // A silent clipboard rejection would leave the operator pasting whatever was there before.
    if (await this._clipboard.writeText(url)) this._notifications.showSuccess('Link copied.', url);
    else this._notifications.showError('Link not copied.', 'The clipboard is not available.');
  }

  /**
   * Opens the task.
   *
   * @param id - Id.
   * @private
   */
  private onExecuteOpenTaskCommand(id: string): void {
    if (this._activeDrawer) {
      this._activeDrawer.requestAttention();
      return;
    }

    this._work.selectWorkItem(id);
    const drawer = this._drawerService.show<{ mode: 'edit'; workItemId: string }>(TaskDialogView, {
      data: { mode: 'edit', workItemId: id },
      size: { width: '82%' },
      maxSize: { width: '92rem' },
    });
    this._activeDrawer = drawer;
    drawer.closed.subscribe(() => {
      if (this._activeDrawer === drawer) this._activeDrawer = undefined;
    });
  }

  /**
   * Opens the process view for one work item. It uses its own drawer reference rather than the
   * task drawer's, so an operator can keep the details open while following the process.
   *
   * @param id - Id.
   * @private
   */
  private async onExecuteOpenProcessCommand(id: string): Promise<void> {
    if (!this.workflowAvailable) return;
    // Claimed before the await below: the drawer reference only exists once the view has loaded,
    // so a second activation during the import would open a second drawer.
    if (this._processDrawerPending) return;
    if (this._activeProcessDrawer && this._drawerService.isShown(this._activeProcessDrawer)) {
      this._activeProcessDrawer.requestAttention();
      return;
    }
    this._processDrawerPending = true;

    try {
      // Imported on demand: this view is the only code that pulls in the graph rendering
      // library, and the board feature barrel is reachable from the eager entry bundle.
      const { ProcessDrawerView } = await import('@symphony/frontend-feature-workflow');
      const drawer = this._drawerService.show<{ workItemId: string }>(ProcessDrawerView, {
        data: { workItemId: id },
      });
      this._activeProcessDrawer = drawer;
      drawer.closed.subscribe(() => {
        if (this._activeProcessDrawer === drawer) this._activeProcessDrawer = undefined;
      });
    } finally {
      this._processDrawerPending = false;
    }
  }

  /**
   * Creates the task.
   *
   * @private
   */
  private onExecuteCreateTaskCommand(): void {
    if (!this.canCreateWorkItem()) return;
    if (this._activeDrawer && this._drawerService.isShown(this._activeDrawer)) {
      this._activeDrawer.requestAttention();
      return;
    }

    const drawer = this._drawerService.show<{ mode: 'create' }>(TaskDialogView, {
      data: { mode: 'create' },
    });
    this._activeDrawer = drawer;
    drawer.closed.subscribe(() => {
      if (this._activeDrawer === drawer) this._activeDrawer = undefined;
    });
  }

  /**
   * Refreshes.
   *
   * @private
   */
  private async onExecuteRefreshCommand(): Promise<void> {
    await this._boardRoute.refresh();
  }

  private async chooseDeliveryGroupMode(): Promise<DeliveryGroupAssessmentMode | undefined> {
    const dialog = this._dialogService.show<undefined, DeliveryGroupAssessmentMode>(
      DeliveryGroupModeDialogView,
      {
        hasBackdrop: true,
        backdropStrategy: 'own',
        clickOutsideToClose: false,
        pressEscapeToClose: true,
        size: { width: '34rem' },
        minSize: { width: '20rem' },
        maxSize: { width: '100vw' },
      },
    );
    const result = await firstValueFrom(dialog.closed);
    return result.reason === 'positive' ? result.result : undefined;
  }

  private createProjectFieldEntries(
    fields: readonly ProjectFieldDefinition[],
    item: IWorkItem,
  ): readonly { name: string; value: string }[] {
    return fields.flatMap((field) => {
      if (field.role === 'workflow-state') return [];
      const value = projectFieldDisplayValue(
        field,
        item.projectFields?.find((candidate) => candidate.fieldId === field.id),
      );
      return value ? [{ name: field.name, value }] : [];
    });
  }

  private assignableScopeKey(item: IWorkItem): string {
    return [item.sourceId ?? '', item.workspaceId ?? '', item.repository].join('|');
  }

  /**
   * Runs one card or group operation at a time. Every menu entry writes to the same board entry,
   * so a second run started while the first is busy would either duplicate the write or race it.
   */
  private async runExclusively(
    operationId: string,
    operation: () => Promise<unknown>,
  ): Promise<void> {
    if (this.resolveIsContextActionBusy(operationId)) return;
    this._contextActionBusyIds.update((ids) => new Set(ids).add(operationId));
    try {
      await operation();
    } finally {
      this._contextActionBusyIds.update((ids) => {
        const next = new Set(ids);
        next.delete(operationId);
        return next;
      });
    }
  }

  /**
   * Empties the stable selection mirror; mounted cards receive the cleared native state through
   * their `isSelected` input and recycled cards restore that state when they re-enter the DOM.
   */
  private requestSelectionClear(): void {
    this._selectedItemKeys.set([]);
  }

  // #endregion
}

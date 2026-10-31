// #region Imports

import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Command, ViewPresenter } from '@symphony/frontend-core';
import { OrbitStateStore } from '../state/OrbitStateStore';
import { NotificationService } from '@symphony/frontend-notification';
import {
  currentDeliveryEvidence,
  type IDeliverySnapshot,
  type IDeliveryLaunchPlan,
  type IDeliveryOperation,
} from '@symphony/domain-delivery';
import type { IOrbitCamera, IOrbitCrewMember } from '@symphony/frontend-ui';
import { projectOrbitClusters } from './projectOrbitClusters';
import { projectOrbitScene } from './projectOrbitScene';
import { ORBIT_CONTEXT } from '../ports/OrbitContextToken';

// #endregion

/** Work items one inspector page lists before `Previous` / `Next` appear. */
const CLUSTER_PAGE_SIZE = 6;

/**
 * Coordinates the production orbit using the existing workflow and execution stores: the stage
 * clusters around the destination, the inspector's selection (a cluster, a destination or a work
 * item), delivery evidence and its launch commands.
 *
 * @public
 */
@Injectable()
export class OrbitViewPresenter extends ViewPresenter {
  // #region Fields

  /** @public */ public readonly store = inject(ORBIT_CONTEXT);
  /** @public */ public readonly landscape = this.store.workFilters;
  /** @public */ public readonly orbitState = inject(OrbitStateStore);
  private readonly _deliveryOperations = this.store.delivery;
  /** Whether the actual Delivery participant is included in this product. @public @readonly */
  public readonly deliveryAvailable = this._deliveryOperations !== null;
  /** Whether the actual Work filter participant is included in this product. @public @readonly */
  public readonly workFiltersAvailable = this.landscape !== null;
  private readonly _notifications = inject(NotificationService);
  private readonly _router = inject(Router);
  private readonly _route = inject(ActivatedRoute);
  private readonly _destroy = inject(DestroyRef);
  private readonly _ready = signal(false);
  private _deliveryRequest = 0;
  private _launchRequest = 0;
  private _launchMutation = false;
  private _launchPlanContext?: {
    readonly scope: string;
    readonly targetId: string;
    readonly ref: string;
  };
  private _activeScopeKey = '';
  /** @public */ public readonly detailsOpen = signal(true);
  /** Page of the inspected cluster's work-item list. @public */
  public readonly clusterPage = signal(0);
  /** @public */ public readonly focusId = signal<string | undefined>(undefined);
  /** Every explicit focus remains actionable, including selecting the same ticket again. @public */
  public readonly focusRevision = signal(0);
  /** @public */ public readonly delivery = signal<IDeliverySnapshot | undefined>(undefined);
  /** @public */ public readonly deliveryBusy = signal(false);
  /** @public */ public readonly deliveryError = signal('');
  /** @public */ public readonly operations = signal<readonly IDeliveryOperation[]>([]);
  /** @public */ public readonly launchPlan = signal<IDeliveryLaunchPlan | undefined>(undefined);
  /** @public */ public readonly launchRef = signal('');
  /** @public */ public readonly launchBusy = signal(false);
  /** @public */ public readonly repositoryId = this.orbitState.orbitRepositoryId;
  /** @public */ public readonly selectedTicket = computed(() =>
    this.detailsOpen() &&
    this.store.selectionExplicit() &&
    this.repositoryTickets().some((item) => item.id === this.store.selectedWorkItem()?.id)
      ? this.store.selectedWorkItem()
      : undefined,
  );
  /** @public */ public readonly selectedTicketExecutions = computed(
    () =>
      this.store
        .snapshot()
        ?.executions.filter((execution) => execution.workItemId === this.selectedTicket()?.id) ??
      [],
  );
  /** @public */ public readonly ticketPullRequests = computed(() =>
    this.selectedTicketExecutions().flatMap((execution) =>
      execution.pullRequest ? [execution.pullRequest] : [],
    ),
  );
  /** @public */ public readonly ticketRuns = computed(
    () =>
      this.store
        .snapshot()
        ?.ciRuns?.filter(
          (run) =>
            (this.store.snapshot()?.pullRequests ?? []).some(
              (pr) =>
                pr.repositoryBindingId === run.repositoryBindingId &&
                (pr.headRevision === run.revision || pr.mergeRevision === run.revision) &&
                this.selectedTicketExecutions().some(
                  (execution) =>
                    execution.pullRequest?.number === pr.number &&
                    execution.pullRequest.externalUrl === pr.externalUrl &&
                    (!execution.bindingSnapshot ||
                      execution.bindingSnapshot.repositoryBindingIds.includes(
                        pr.repositoryBindingId,
                      )),
                ),
            ) ||
            (this.delivery()?.evidence ?? []).some(
              (evidence) =>
                evidence.revision === run.revision &&
                evidence.repositoryBindingId === run.repositoryBindingId &&
                evidence.workItemIds.includes(this.selectedTicket()?.id ?? ''),
            ),
        ) ?? [],
  );
  /** @public */ public readonly selectedRepository = computed(
    () =>
      this.store.scopedRepositories().find((repo) => repo.id === this.repositoryId()) ??
      this.store.scopedRepositories()[0],
  );
  /** @public */ public readonly scopeKey = computed(() =>
    JSON.stringify([
      [...this.store.selectedWorkspaceIds()].toSorted(),
      this.selectedRepository()?.id ?? null,
    ]),
  );
  /** @public */ public readonly camera = computed(
    () => this.orbitState.orbitCameras()[this.scopeKey()],
  );
  /** @public */ public readonly selectedDelivery = computed(() => {
    const value = this.delivery();
    const repository = this.selectedRepository();
    const workspaces = new Set(this.store.selectedWorkspaceIds());
    const inScope = (target: { workspaceId: string; repositoryBindingId: string }) =>
      workspaces.has(target.workspaceId) &&
      (!repository || target.repositoryBindingId === repository.id);
    const targets = new Map(
      (this.store.settings()?.deliveryTargets ?? [])
        .filter(inScope)
        .map((target) => [target.id, target]),
    );
    for (const target of value?.targets ?? []) {
      if (!inScope(target)) continue;
      const configured = targets.get(target.id);
      targets.set(target.id, {
        ...target,
        celestialBody: configured ? configured.celestialBody : target.celestialBody,
      });
    }
    return {
      targets: [...targets.values()],
      evidence: (value?.evidence ?? []).filter(inScope),
      refreshedAt: value?.refreshedAt ?? '',
      errors: (value?.errors ?? []).filter((error) => targets.has(error.targetId)),
    };
  });
  /** @public */ public readonly targets = computed(() => this.selectedDelivery()?.targets ?? []);
  /** @public */ public readonly selectedTarget = computed(() =>
    this.detailsOpen()
      ? this.targets().find((target) => target.id === this.orbitState.selectedTargetId())
      : undefined,
  );
  /** @public */ public readonly targetEvidence = computed(() =>
    (this.selectedDelivery()?.evidence ?? [])
      .filter((evidence) => evidence.targetId === this.selectedTarget()?.id)
      .toSorted((a, b) => b.observedAt.localeCompare(a.observedAt)),
  );
  /** @public */ public readonly targetCurrent = computed(() =>
    currentDeliveryEvidence(this.targetEvidence(), this.selectedTarget()?.id ?? ''),
  );
  /** @public */ public readonly targetStale = computed(
    () =>
      Boolean(this.deliveryError()) ||
      this.selectedDelivery().errors.some((error) => error.targetId === this.selectedTarget()?.id),
  );
  /** @public */ public readonly confirmedTicketEvidence = computed(() =>
    this.targets().flatMap((target) => {
      const current = currentDeliveryEvidence(this.selectedDelivery()?.evidence ?? [], target.id);
      return current?.workItemIds.includes(this.selectedTicket()?.id ?? '')
        ? [{ target, evidence: current }]
        : [];
    }),
  );
  /** @public */ public readonly repositoryTickets = computed(() => {
    const repo = this.selectedRepository();
    return this.store
      .scopedWorkItems()
      .filter(
        (item) =>
          !repo ||
          (item.repositoryBindingIds?.length
            ? item.repositoryBindingIds.includes(repo.id)
            : !item.repository || item.repository === `${repo.owner}/${repo.name}`),
      );
  });
  /** Search and source filters reuse the Board's shared workflow state. @public */
  public readonly filteredTickets = computed(() => {
    const query = (this.landscape?.query() ?? '').trim().toLowerCase();
    const label = this.landscape?.label();
    return this.repositoryTickets().filter(
      (item) =>
        (!query ||
          `${item.externalId} ${item.title} ${item.labels.join(' ')}`
            .toLowerCase()
            .includes(query)) &&
        (!label || item.labels.includes(label)) &&
        (!this.landscape?.columnId() || item.boardColumnId === this.landscape?.columnId()) &&
        (!this.landscape?.stageId() || item.stageId === this.landscape?.stageId()),
    );
  });
  /** The selected repository's enabled workspace profiles supply ambient pilots, never run state. @public */
  public readonly orbitCrew = computed<readonly IOrbitCrewMember[]>(() => {
    const repository = this.selectedRepository();
    const workspaceIds = new Set(
      repository ? [repository.workspaceId] : this.store.selectedWorkspaceIds(),
    );
    return (this.store.settings()?.agentProfiles ?? [])
      .filter((agent) => agent.enabled && workspaceIds.has(agent.workspaceId))
      .map((agent) => ({ id: agent.id, name: agent.displayName, appearance: agent.appearance }));
  });
  /** @public */ public readonly orbitScene = computed(() =>
    projectOrbitScene(
      this.filteredTickets(),
      this.store.snapshot()?.workflow,
      this.selectedDelivery(),
      Boolean(this.deliveryError()),
      this.clusters(),
    ),
  );
  /** @public */ public readonly selectedOrbitNode = computed(() =>
    this.detailsOpen()
      ? this.orbitScene().nodes.find((node) => node.id === this.orbitState.selectedOrbitNodeId())
      : undefined,
  );
  /** The Board's stage clusters of the filtered work items, in diagram order. @public */
  public readonly clusterProjection = computed(() =>
    projectOrbitClusters(this.filteredTickets(), this.store.snapshot(), this.store.activeBoardId()),
  );
  /** @public */ public readonly clusters = computed(() => this.clusterProjection().clusters);
  /** `Needs attention` when anything needs it, otherwise the first cluster. @public */
  public readonly defaultCluster = computed(
    () => this.clusters().find((cluster) => cluster.kind === 'attention') ?? this.clusters()[0],
  );
  /** What the inspector shows, in the order a selection wins. @public */
  public readonly inspectorMode = computed<
    'destination' | 'production' | 'cluster' | 'ticket' | 'empty'
  >(() => {
    if (this.selectedTarget()) return 'destination';
    const node = this.selectedOrbitNode();
    if (node?.kind === 'production') return 'production';
    if (node?.kind === 'group' && this.selectedCluster()) return 'cluster';
    if (this.selectedTicket()) return 'ticket';
    return this.defaultCluster() ? 'cluster' : 'empty';
  });
  /** The cluster selected in the diagram, if any. @public */
  public readonly selectedCluster = computed(() => {
    const node = this.selectedOrbitNode();
    return node?.kind === 'group'
      ? this.clusters().find((cluster) => `group:${cluster.id}` === node.id)
      : undefined;
  });
  /** The cluster the inspector describes: the selected one, else the default. @public */
  public readonly inspectedCluster = computed(() =>
    this.inspectorMode() === 'cluster'
      ? (this.selectedCluster() ?? this.defaultCluster())
      : undefined,
  );
  /** The inspected cluster's work items, newest first. @public */
  public readonly clusterItems = computed(() => {
    const ids = this.inspectedCluster()?.memberIds ?? [];
    const items = new Map(this.filteredTickets().map((item) => [item.id, item]));
    return ids.flatMap((id) => {
      const item = items.get(id);
      return item ? [item] : [];
    });
  });
  /** @public */ public readonly clusterPageItems = computed(() =>
    this.clusterItems().slice(
      this.clusterPage() * CLUSTER_PAGE_SIZE,
      (this.clusterPage() + 1) * CLUSTER_PAGE_SIZE,
    ),
  );
  /** @public */ public readonly clusterPageCount = computed(() =>
    Math.max(1, Math.ceil(this.clusterItems().length / CLUSTER_PAGE_SIZE)),
  );
  /** Board column label per work item for the inspector rows. @public */
  public readonly columnLabels = computed(() => this.clusterProjection().columnLabels);
  /** Whether delivery evidence is loaded and current, so evidence counts are real. @public */
  public readonly evidenceKnown = computed(
    () => this.delivery() !== undefined && !this.deliveryError(),
  );
  /** Work items any destination has confirmed with succeeded evidence. @public */
  public readonly evidencedWorkItemIds = computed(
    () =>
      new Set(
        this.selectedDelivery()
          .evidence.filter((evidence) => evidence.state === 'succeeded')
          .flatMap((evidence) => evidence.workItemIds),
      ),
  );
  /** The destination at the centre of the orbit. @public */
  public readonly productionNode = computed(() =>
    this.orbitScene().nodes.find((node) => node.kind === 'production'),
  );
  /** The single production destination's name, otherwise `Production`. @public */
  public readonly productionName = computed(() => {
    const production = this.targets().filter((target) => target.production);
    return production.length === 1 ? production[0]!.displayName : 'Production';
  });
  /**
   * The destination the toolbar subtitle reports: the one selected in the orbit or the destination
   * menu, otherwise the first Production destination in menu order. `undefined` without any
   * Production destination and selection.
   *
   * @public
   */
  public readonly toolbarDestination = computed(
    () => this.selectedTarget() ?? this.destinationMenu().find((target) => target.production),
  );
  /** The orbit node of the toolbar destination, with its delivery state and version. @public */
  public readonly toolbarDestinationNode = computed(() => {
    const destination = this.toolbarDestination();
    return destination
      ? this.orbitScene().nodes.find((node) => node.targetId === destination.id)
      : undefined;
  });
  /** Inspected cluster items with evidence from any destination. @public */
  public readonly clusterEvidenceCount = computed(
    () => this.clusterItems().filter((item) => this.evidencedWorkItemIds().has(item.id)).length,
  );
  /** Inspected cluster items that the confirmed Production version does not contain. @public */
  public readonly clusterUnconfirmedCount = computed(() => {
    const confirmed = new Set(
      this.productionNode()?.deliveryState === 'confirmed'
        ? (this.productionNode()?.memberIds ?? [])
        : [],
    );
    return this.clusterItems().filter((item) => !confirmed.has(item.id)).length;
  });
  /** Production destinations first, then the others, for the toolbar destination menu. @public */
  public readonly destinationMenu = computed(() =>
    this.targets().toSorted(
      (a, b) =>
        Number(b.production) - Number(a.production) || a.displayName.localeCompare(b.displayName),
    ),
  );
  /** @public */ public readonly selectedSceneId = computed(
    () =>
      this.orbitState.selectedOrbitNodeId() ??
      (this.selectedTarget()
        ? this.orbitScene().nodes.find((node) => node.targetId === this.selectedTarget()!.id)?.id
        : this.selectedTicket()
          ? `ticket:${this.selectedTicket()!.id}`
          : undefined),
  );
  /** @public */ public readonly targetOperations = computed(() =>
    this.operations().filter((operation) => operation.plan.targetId === this.selectedTarget()?.id),
  );

  /** @public */ public readonly changeLaunchRefCommand = new Command<string>(
    (args) => void this.changeLaunchRef(args),
  );
  /** @public */ public readonly selectCommand = new Command<string>(
    (args) => void this.select(args),
  );
  /** @public */ public readonly selectTicketCommand = new Command<string>(
    (args) => void this.selectTicket(args),
  );
  /** @public */ public readonly selectTargetCommand = new Command<string>((id) => {
    const node = this.orbitScene().nodes.find((entry) => entry.targetId === id);
    if (!node) return;
    this.select(node.id);
    this.requestFocus(node.id);
  });
  /** Moves the inspected cluster's list one page back or forward. @public */
  public readonly changeClusterPageCommand = new Command<number>((step) => {
    const page = this.clusterPage() + step;
    if (page >= 0 && page < this.clusterPageCount()) this.clusterPage.set(page);
  });
  /** Opens the Board narrowed to the inspected cluster: its column, or `Needs attention`. @public */
  public readonly showOnBoardCommand = new Command<void>(() => {
    const cluster = this.inspectedCluster();
    if (!cluster) return;
    void this._router.navigate(['/main/board'], {
      queryParams:
        cluster.kind === 'attention' ? { attention: 'true' } : { column: cluster.columnId },
    });
  });
  /** Opens Settings › Delivery destinations for the shown project, without editing a target. @public */
  public readonly openDeliverySettingsCommand = new Command<void>(() => {
    const repository = this.selectedRepository();
    const workspaceId = repository?.workspaceId ?? this.store.selectedWorkspaceIds()[0];
    if (!workspaceId) return;
    void this._router.navigate(['/main/settings'], {
      queryParams: { workspace: workspaceId, section: 'delivery', repository: repository?.id },
    });
  });
  /** @public */ public readonly openDetailsCommand = new Command<readonly [string, boolean?]>(
    (args) => void this.openDetails(args[0], args[1]),
  );
  /** @public */ public readonly searchCommand = new Command<string>(
    (args) => void this.search(args),
  );
  /** @public */ public readonly clearFiltersCommand = new Command<void>(
    () => void this.clearFilters(),
  );
  /** @public */ public readonly refreshDeliveryCommand = new Command<void>(
    () => void this.refreshDelivery(),
  );
  /** @public */ public readonly previewLaunchCommand = new Command<void>(
    () => void this.previewLaunch(),
  );
  /** @public */ public readonly startLaunchCommand = new Command<void>(
    () => void this.startLaunch(),
  );
  /** @public */ public readonly reconcileCommand = new Command<string>(
    (args) => void this.reconcile(args),
  );
  /** @public */ public readonly closeDetailsCommand = new Command<void>(() => this.closeDetails());
  /** Opens the selected project's destination editor without saving or starting delivery. @public */
  public readonly configureDeliveryCommand = new Command<void>(() => {
    if (!this.deliveryAvailable) return;
    const repository = this.selectedRepository();
    const target = this.selectedTarget();
    const workspaceId = repository?.workspaceId ?? this.store.selectedWorkspaceIds()[0];
    if (!workspaceId) return;
    const configured = this.store
      .settings()
      ?.deliveryTargets?.find(
        (item) =>
          item.id === target?.id &&
          item.workspaceId === workspaceId &&
          item.repositoryBindingId === repository?.id,
      );
    void this._router.navigate(['/main/settings'], {
      queryParams: {
        workspace: workspaceId,
        section: 'delivery',
        repository: repository?.id,
        target: target
          ? (configured?.id ?? 'new')
          : repository && !this.targets().some((item) => item.production)
            ? 'new'
            : undefined,
        production: target ? String(target.production) : 'true',
        environment: target?.environment,
        name: target?.displayName,
        kind: target?.kind,
      },
    });
  });
  /** @public */ public readonly focusSearchCommand = new Command<void>(() => this.focusSearch());
  /** Dismisses the inspector's selection from the keyboard. @public */
  public readonly dismissOverlayCommand = new Command<void>(() => this.closeDetails());
  /** @public */ public readonly cameraChangedCommand = new Command<IOrbitCamera>((camera) => {
    const scope = this.scopeKey();
    this.orbitState.orbitCameras.update((cameras) => ({ ...cameras, [scope]: camera }));
  });
  // #endregion

  /** @public */ public readonly stageById = computed(
    () => new Map((this.store.snapshot()?.workflow.stages ?? []).map((stage) => [stage.id, stage])),
  );
  // #region Ctor

  /** Scope changes invalidate older asynchronous replies before new evidence is requested. @public */
  public constructor() {
    super();
    const querySubscription = this._route.queryParamMap.subscribe((parameters) => {
      if (parameters.has('q')) this.search(parameters.get('q') ?? '');
    });
    this._destroy.onDestroy(() => querySubscription.unsubscribe());
    effect(() => {
      const scope = this.scopeKey();
      if (!this._ready() || scope === this._activeScopeKey) return;
      this._activeScopeKey = scope;
      untracked(() => {
        this._deliveryRequest++;
        this.delivery.set(undefined);
        this.operations.set([]);
        this.deliveryBusy.set(false);
        this.deliveryError.set('');
        this.invalidateLaunch();
        this.launchRef.set('');
        this.orbitState.selectedTargetId.set(undefined);
        this.orbitState.selectedOrbitNodeId.set(undefined);
        this.requestFocus(undefined);
        this.clusterPage.set(0);
        void this.refreshDelivery();
      });
    });
    this._destroy.onDestroy(() => {
      this._deliveryRequest++;
      this._launchRequest++;
    });
  }

  // #endregion

  // #region Methods

  /** @public */ private changeLaunchRef(value: string): void {
    this.invalidateLaunch();
    this.launchRef.set(value);
  }

  /** @public */ public override initialize(): void {
    super.initialize();
    void this.store.initialize().then(() => {
      if (!this.disposed()) this._ready.set(true);
    });
  }

  /** @public */ private select(id: string): void {
    const node = this.orbitScene().nodes.find((entry) => entry.id === id);
    if (!node) return;
    this.invalidateLaunch();
    this.detailsOpen.set(true);
    this.orbitState.selectedTargetId.set(node.targetId);
    this.orbitState.selectedOrbitNodeId.set(
      node.kind === 'production' || node.kind === 'group' ? node.id : undefined,
    );
    this.launchPlan.set(undefined);
    if (node.kind === 'ticket' && node.workItemId) this.selectTicket(node.workItemId);
    if (node.kind === 'group') this.clusterPage.set(0);
  }

  /** @public */ private selectTicket(id: string): void {
    if (!this.repositoryTickets().some((item) => item.id === id)) return;
    this.invalidateLaunch();
    this.detailsOpen.set(true);
    this.orbitState.selectedOrbitNodeId.set(undefined);
    if (!this.filteredTickets().some((item) => item.id === id)) this.clearFilters();
    this.store.selectWorkItem(id);
    this.orbitState.selectedTargetId.set(undefined);
    this.requestFocus(`ticket:${id}`);
  }
  /** @public */ private openDetails(id: string, process = false): void {
    void this._router.navigate(['/main/board'], {
      queryParams: { item: id, process: process ? 'true' : undefined },
    });
  }
  /** @public */ private search(value: string): void {
    this.landscape?.setQuery(value);
    this.clusterPage.set(0);
    if (value.trim()) this.focusSearch();
  }
  /** @public */ private clearFilters(): void {
    this.landscape?.setQuery('');
    this.landscape?.setStageId(undefined);
    this.landscape?.setColumnId(undefined);
    this.landscape?.setLabel(undefined);
    this.clusterPage.set(0);
  }

  /** @public */ private async refreshDelivery(): Promise<void> {
    if (!this._deliveryOperations || this.deliveryBusy()) return;
    const request = ++this._deliveryRequest;
    const scope = this.scopeKey();
    this.deliveryBusy.set(true);
    this.deliveryError.set('');
    try {
      const [delivery, operations] = await Promise.allSettled([
        this._deliveryOperations.refresh(),
        this._deliveryOperations.operations(),
      ]);
      if (this.disposed() || request !== this._deliveryRequest || scope !== this.scopeKey()) return;
      if (delivery.status === 'fulfilled') this.delivery.set(delivery.value);
      else
        this.deliveryError.set(
          'Delivery evidence could not be refreshed. Check the GitHub account and retry.',
        );
      if (operations.status === 'fulfilled') this.operations.set(operations.value);
      else
        this._notifications.showWarning(
          'Delivery operations could not be refreshed. Retry before starting another deployment.',
        );
    } catch {
      if (!this.disposed() && request === this._deliveryRequest && scope === this.scopeKey())
        this.deliveryError.set(
          'Delivery evidence could not be refreshed. Check the GitHub account and retry.',
        );
    } finally {
      if (!this.disposed() && request === this._deliveryRequest && scope === this.scopeKey())
        this.deliveryBusy.set(false);
    }
  }

  /** @public */ private async previewLaunch(): Promise<void> {
    const target = this.selectedTarget();
    if (!this._deliveryOperations || !target || this.launchBusy()) return;
    const request = ++this._launchRequest;
    const context = { scope: this.scopeKey(), targetId: target.id, ref: this.launchRef() };
    this.launchBusy.set(true);
    this.launchPlan.set(undefined);
    try {
      const plan = await this._deliveryOperations.preview({
        targetId: target.id,
        ref: context.ref,
      });
      if (
        this.disposed() ||
        request !== this._launchRequest ||
        context.scope !== this.scopeKey() ||
        context.targetId !== this.selectedTarget()?.id ||
        context.ref !== this.launchRef()
      )
        return;
      this._launchPlanContext = context;
      this.launchPlan.set(plan);
    } catch (cause) {
      if (!this.disposed() && request === this._launchRequest)
        this._notifications.showError(
          'Unable to prepare delivery.',
          cause instanceof Error ? cause.message : 'Refresh the target and version.',
        );
    } finally {
      if (!this.disposed() && request === this._launchRequest) this.launchBusy.set(false);
    }
  }

  /** @public */ private async startLaunch(): Promise<void> {
    const plan = this.launchPlan();
    if (!this._deliveryOperations || !plan || this.launchBusy()) return;
    const context = this._launchPlanContext;
    if (
      !context ||
      context.scope !== this.scopeKey() ||
      context.targetId !== this.selectedTarget()?.id ||
      context.targetId !== plan.targetId ||
      context.ref !== this.launchRef()
    ) {
      this.invalidateLaunch();
      this._notifications.showWarning(
        'The delivery target or version changed. Prepare a new delivery.',
      );
      return;
    }
    this._launchMutation = true;
    this.launchBusy.set(true);
    try {
      const operation = await this._deliveryOperations.start({
        operationId: crypto.randomUUID(),
        plan,
      });
      if (!this.disposed() && context.scope === this.scopeKey())
        this.operations.update((items) => [...items, operation]);
      this.invalidateLaunch();
      await this.store.refreshContinuousIntegrationRuns();
    } catch (cause) {
      this._notifications.showError(
        'Delivery was not started.',
        cause instanceof Error ? cause.message : 'Review a new proposal.',
      );
    } finally {
      this._launchMutation = false;
      if (!this.disposed()) this.launchBusy.set(false);
    }
  }

  /** @public */ private async reconcile(id: string): Promise<void> {
    if (!this._deliveryOperations || this.launchBusy()) return;
    const scope = this.scopeKey();
    this._launchMutation = true;
    this.launchBusy.set(true);
    try {
      const operation = await this._deliveryOperations.reconcile(id);
      if (!this.disposed() && scope === this.scopeKey())
        this.operations.update((items) => items.map((item) => (item.id === id ? operation : item)));
    } catch {
      this._notifications.showError('Unable to reconcile delivery.');
    } finally {
      this._launchMutation = false;
      if (!this.disposed()) this.launchBusy.set(false);
    }
  }

  /** Hides details without throwing away the shared Board ticket selection. @private */
  private closeDetails(): void {
    this.invalidateLaunch();
    this.detailsOpen.set(false);
    this.clusterPage.set(0);
    this.orbitState.selectedTargetId.set(undefined);
    this.orbitState.selectedOrbitNodeId.set(undefined);
  }

  /** A reviewed delivery proposal belongs to one target, ref and project scope. @private */
  private invalidateLaunch(): void {
    this._launchRequest++;
    this._launchPlanContext = undefined;
    this.launchPlan.set(undefined);
    if (!this._launchMutation) this.launchBusy.set(false);
  }

  /** Emits an explicit camera request independently of the current selected object. @private */
  private requestFocus(id: string | undefined): void {
    this.focusId.set(id);
    this.focusRevision.update((revision) => revision + 1);
  }

  /** Search selects exact identifiers or a unique result and focuses its real geometry. @private */
  private focusSearch(): void {
    const query = (this.landscape?.query() ?? '').trim().toLowerCase();
    if (!query) return;
    const matches = this.filteredTickets();
    const exact = matches.find(
      (item) => item.id.toLowerCase() === query || item.externalId.toLowerCase() === query,
    );
    const ticket = exact ?? (matches.length === 1 ? matches[0] : undefined);
    if (ticket) this.selectTicket(ticket.id);
  }

  // #endregion
}

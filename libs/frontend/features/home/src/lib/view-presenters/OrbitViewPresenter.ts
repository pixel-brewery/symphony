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
import { projectOrbitScene } from './projectOrbitScene';
import { ORBIT_CONTEXT } from '../ports/OrbitContextToken';

// #endregion

/** Coordinates the production orbit using the existing workflow and execution stores. */
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
  /** @public */ public readonly finderOpen = signal(false);
  /** @public */ public readonly finderKind = signal<'tickets' | 'targets'>('tickets');
  /** @public */ public readonly finderPage = signal(0);
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
    ),
  );
  /** @public */ public readonly selectedOrbitNode = computed(() =>
    this.detailsOpen()
      ? this.orbitScene().nodes.find((node) => node.id === this.orbitState.selectedOrbitNodeId())
      : undefined,
  );
  /** @public */ public readonly finderTickets = computed(() => {
    const selected = this.selectedOrbitNode();
    const members = selected?.kind === 'group' ? selected.memberIds : undefined;
    const ids = members ? new Set(members) : undefined;
    return ids ? this.filteredTickets().filter((item) => ids.has(item.id)) : this.filteredTickets();
  });
  /** @public */ public readonly finderPageItems = computed(() =>
    this.finderTickets().slice(this.finderPage() * 40, this.finderPage() * 40 + 40),
  );
  /** @public */ public readonly finderPageCount = computed(() =>
    Math.max(1, Math.ceil(this.finderCount() / 40)),
  );
  /** @public */ public readonly finderCount = computed(() => {
    switch (this.finderKind()) {
      case 'tickets':
        return this.finderTickets().length;
      case 'targets':
        return this.targets().length;
    }
  });
  /** @public */ public readonly finderTargets = computed(() =>
    this.targets().slice(this.finderPage() * 40, this.finderPage() * 40 + 40),
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
    this.finderOpen.set(false);
  });
  /** @public */ public readonly changeFinderKindCommand = new Command<string>((kind) => {
    if (kind !== 'tickets' && kind !== 'targets') return;
    this.finderKind.set(kind);
    this.finderPage.set(0);
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
  /** @public */ public readonly toggleFinderCommand = new Command<void>(() => {
    this.finderOpen.update((open) => !open);
    this.finderPage.set(0);
  });
  /** Dismisses the active nonmodal overlay from the keyboard. @public */
  public readonly dismissOverlayCommand = new Command<void>(() => {
    if (this.finderOpen()) this.finderOpen.set(false);
    else this.closeDetails();
  });
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
        this.finderPage.set(0);
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
    this.finderOpen.set(false);
    this.orbitState.selectedTargetId.set(node.targetId);
    this.orbitState.selectedOrbitNodeId.set(
      node.kind === 'production' || node.kind === 'group' ? node.id : undefined,
    );
    this.launchPlan.set(undefined);
    if (node.kind === 'ticket' && node.workItemId) this.selectTicket(node.workItemId);
    if (node.kind === 'group') {
      this.requestFocus(node.id);
      this.finderPage.set(0);
      this.finderKind.set('tickets');
      this.finderOpen.set(true);
    }
  }

  /** @public */ private selectTicket(id: string): void {
    if (!this.repositoryTickets().some((item) => item.id === id)) return;
    this.invalidateLaunch();
    this.detailsOpen.set(true);
    this.orbitState.selectedOrbitNodeId.set(undefined);
    if (!this.filteredTickets().some((item) => item.id === id)) this.clearFilters();
    this.store.selectWorkItem(id);
    this.orbitState.selectedTargetId.set(undefined);
    this.finderOpen.set(false);
    this.requestFocus(`ticket:${id}`);
  }
  /** @public */ private openDetails(id: string, process = false): void {
    void this._router.navigate(['/main/board'], {
      queryParams: { item: id, process: process ? 'true' : undefined },
    });
  }
  /** @public */ private search(value: string): void {
    this.landscape?.setQuery(value);
    this.finderPage.set(0);
    if (value.trim()) this.focusSearch();
  }
  /** @public */ private clearFilters(): void {
    this.landscape?.setQuery('');
    this.landscape?.setStageId(undefined);
    this.landscape?.setColumnId(undefined);
    this.landscape?.setLabel(undefined);
    this.finderPage.set(0);
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
    this.finderOpen.set(false);
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

// #region Imports

import {
  ApplicationRef,
  ChangeDetectorRef,
  computed,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import {
  DRAWER_REF,
  DRAWER_REF_DATA,
  type IDrawerRef,
} from '@pixel-brewery/mosaik-elements-angular';
import type { ICiWorkflow } from '@symphony/domain-ci';
import { deliveryTargetSchema, orbitCelestialBodySchema } from '@symphony/configuration-delivery';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { Command, Hydratable, ViewPresenter } from '@symphony/frontend-core';
import {
  createTrackedSettingsDraft,
  upsertSettingsItem,
  type ISettingsEditorResult,
} from '@symphony/frontend-setting';
import { DELIVERY_SETTINGS_CONTEXT } from '../ports/DeliverySettingsContextToken';
import { DELIVERY_SETTINGS_CONFIGURATION } from '../ports/DeliverySettingsConfigurationToken';
import { DELIVERY_SETTINGS_CLIENT } from '../ports/DeliverySettingsClientToken';
import { DELIVERY_CI_OPERATIONS } from '../ports/DeliveryCiOperationsToken';
import type { DeliverySettingsEditorRequest } from './DeliverySettingsEditorRequest';

// #endregion

type Settings = ApplicationSettingsDto;
type Connection = Settings['connections'][number];
function upsert<T extends { readonly id: string }>(items: readonly T[], item: T): T[] {
  return upsertSettingsItem(items, item);
}

/** Owns the existing repository and delivery destination editor behavior. @public */
@Injectable()
export class DeliverySettingsEditorViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields
  private readonly _context = inject(DELIVERY_SETTINGS_CONTEXT);
  private readonly _configuration = inject(DELIVERY_SETTINGS_CONFIGURATION);
  private readonly _ci = inject(DELIVERY_CI_OPERATIONS);
  private readonly _client = inject(DELIVERY_SETTINGS_CLIENT);
  private readonly _drawerRef = inject(DRAWER_REF) as IDrawerRef<
    DeliverySettingsEditorRequest,
    ISettingsEditorResult
  >;
  /** The validated Delivery-specific editor request. @public @readonly */
  public readonly data = inject<DeliverySettingsEditorRequest>(DRAWER_REF_DATA);
  /** Shared exclusion from the existing single settings writer. @public @readonly */
  public readonly editorBusy = this._context.editorBusy;
  /** Whether the CI contribution is included in this product. @public @readonly */
  public readonly hasCiOperations = this._ci !== null;
  /** Whether the actual source-authentication participant is included. @public @readonly */
  public readonly sourceConnectionsAvailable = this._configuration.sourceConnectionsAvailable;
  /** The same CI usage lifecycle signal, with a readonly omitted-feature fallback. @public @readonly */
  public readonly continuousIntegrationUsageBusy = computed(
    () => this._ci?.continuousIntegrationUsageBusy() ?? false,
  );
  /**
   * The kind.
   *
   * @public
   * @readonly
   */
  public readonly kind = this.data.kind;
  private readonly _application = inject(ApplicationRef);
  private readonly _changeDetector = inject(ChangeDetectorRef);
  private readonly _deliveryTargetId = `destination-${crypto.randomUUID()}`;
  private readonly _draftRevision = signal(0);
  /**
   * The busy.
   *
   * @public
   * @readonly
   */
  public readonly busy = signal(false);
  /**
   * The repository.
   *
   * @public
   */
  public repository = this.createRepositoryDraft();
  /** Destination configuration remains a draft until Save. @public */
  public deliveryTarget = this.createDeliveryTargetDraft();
  /** @public */
  public readonly deliveryWorkflows = signal<readonly ICiWorkflow[]>([]);
  /** @public */
  public readonly deliveryWorkflowsBusy = signal(false);
  /** @public */
  public readonly deliveryWorkflowsError = signal(false);
  /** @public */
  public readonly deliveryRepository = computed(() => {
    const data = this.data;
    return data.kind === 'delivery-target'
      ? this._context
          .settings()
          ?.repositoryBindings.find(
            (item) => item.id === data.repositoryBindingId && item.workspaceId === data.workspaceId,
          )
      : undefined;
  });
  /** @public */
  public readonly deliveryWorkflowKnown = this.createDraftProjection(() =>
    this.deliveryWorkflows().some((workflow) => workflow.id === this.deliveryTarget.workflowId),
  );
  /** @public */
  public readonly duplicateDeliveryTarget = this.createDraftProjection(() => {
    const data = this.data;
    return (
      data.kind === 'delivery-target' &&
      Boolean(
        this._context
          .settings()
          ?.deliveryTargets.some(
            (target) =>
              target.id !== data.targetId &&
              target.repositoryBindingId === data.repositoryBindingId &&
              target.workspaceId === data.workspaceId &&
              target.kind === this.deliveryTarget.kind &&
              target.environment === this.deliveryTarget.environment.trim(),
          ),
      )
    );
  });
  /** Reads the existing repository-inspection contract; never dispatches a workflow. @public */
  public readonly refreshDeliveryWorkflowsCommand = new Command<void>(
    () => void this.refreshDeliveryWorkflows(),
  );
  /** @public */
  public readonly selectDeliveryWorkflowCommand = new Command<unknown>((event) => {
    const id = this.resolveEventText(event);
    if (
      id === this.deliveryTarget.workflowId ||
      (id && !this.deliveryWorkflows().some((item) => item.id === id))
    )
      return;
    this.deliveryTarget.workflowId = id;
    this.deliveryTarget.versionInput = '';
    this.deliveryTarget.environmentInput = '';
    this.deliveryTarget.operationInput = '';
  });
  /** @public */
  public readonly selectDeliveryTargetKindCommand = new Command<unknown>((event) => {
    const kind = this.resolveEventText(event);
    if (kind === 'environment' || kind === 'release-channel' || kind === 'installation')
      this.deliveryTarget.kind = kind;
  });
  /** Updates only the editor draft; Save persists the selected body. @public */
  public readonly selectDeliveryCelestialBodyCommand = new Command<unknown>((event) => {
    const result = orbitCelestialBodySchema.safeParse(this.resolveEventText(event));
    if (result.success) this.deliveryTarget.celestialBody = result.data;
  });
  private readonly _chooseRepositoryDirectoryCommand: Command<void> = new Command(
    () => void this.onExecuteChooseRepositoryDirectoryCommand(),
  );
  private readonly _saveCommand: Command<void> = new Command(
    () => void this.onExecuteSaveCommand(),
  );
  private readonly _closeCommand: Command<void> = new Command(
    () => void this.onExecuteCloseCommand(),
  );
  private readonly _canSave = this.createDraftProjection(() => this.resolveCanSave());
  private readonly _eventText = computed(() => (event: unknown) => this.resolveEventText(event));
  private readonly _updateRepositoryGitProtocolCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateRepositoryGitProtocolCommand(event),
  );
  private readonly _refreshGitHubActionsUsageCommand: Command<void> = new Command(
    () => void this.onExecuteRefreshGitHubActionsUsageCommand(),
  );
  private readonly _githubActionsUsage = this.createDraftProjection(() =>
    this.resolveGithubActionsUsage(),
  );
  private readonly _hasExistingRepository = this.createDraftProjection(() =>
    this.resolveHasExistingRepository(),
  );
  // #endregion
  // #region Properties
  /**
   * The chooseRepositoryDirectory command.
   *
   * @public
   * @readonly
   */
  public get chooseRepositoryDirectoryCommand(): Command<void> {
    return this._chooseRepositoryDirectoryCommand;
  }
  /**
   * The save command.
   *
   * @public
   * @readonly
   */
  public get saveCommand(): Command<void> {
    return this._saveCommand;
  }
  /**
   * The close command.
   *
   * @public
   * @readonly
   */
  public get closeCommand(): Command<void> {
    return this._closeCommand;
  }
  /**
   * The canSave projection.
   *
   * @public
   * @readonly
   */
  public get canSave() {
    return this._canSave;
  }
  /**
   * The eventText projection.
   *
   * @public
   * @readonly
   */
  public get eventText() {
    return this._eventText;
  }
  /**
   * The updateRepositoryGitProtocol command.
   *
   * @public
   * @readonly
   */
  public get updateRepositoryGitProtocolCommand(): Command<unknown> {
    return this._updateRepositoryGitProtocolCommand;
  }
  /**
   * The refreshGitHubActionsUsage command.
   *
   * @public
   * @readonly
   */
  public get refreshGitHubActionsUsageCommand(): Command<void> {
    return this._refreshGitHubActionsUsageCommand;
  }
  /**
   * The githubActionsUsage projection.
   *
   * @public
   * @readonly
   */
  public get githubActionsUsage() {
    return this._githubActionsUsage;
  }
  /**
   * The hasExistingRepository projection.
   *
   * @public
   * @readonly
   */
  public get hasExistingRepository() {
    return this._hasExistingRepository;
  }
  // #endregion
  // #region Methods
  /** Hydrates only the owning repository or destination dependencies. @public */
  public override async onHydrate(): Promise<void> {
    try {
      if (!this._context.settings()) await this.hydrateConfiguration();
      const data = this.data;
      if (data.kind === 'delivery-target') {
        this.deliveryWorkflows.set(
          (this._context.snapshot()?.ciWorkflows ?? []).filter(
            (workflow) =>
              workflow.repositoryBindingId === data.repositoryBindingId &&
              workflow.workspaceId === data.workspaceId &&
              workflow.supportsManualDispatch &&
              workflow.state === 'active',
          ),
        );
        return;
      }
      void Promise.all([this.onExecuteRefreshGitHubActionsUsageCommand()]).finally(() =>
        this._changeDetector.detectChanges(),
      );
    } finally {
      window.requestAnimationFrame(() => this._application.tick());
    }
  }
  /** Saves only the actual editor branch through the existing writer. @private */
  private async onExecuteSaveCommand(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      if (this.data.kind === 'repository') await this.saveRepository();
      if (this.data.kind === 'delivery-target') await this.saveDeliveryTarget();
    } finally {
      this.busy.set(false);
    }
  }
  /** Preserves the existing destination-only validation gate. @private */
  private resolveCanSave(): boolean {
    if (this.kind === 'delivery-target')
      return Boolean(this.resolveDeliveryTarget()) && !this.duplicateDeliveryTarget();
    return true;
  }
  /** Rebuilds the two drafts after the authoritative configuration is loaded. @private */
  private async hydrateConfiguration(): Promise<void> {
    await this._configuration.refreshConfiguration();
    this.repository = this.createRepositoryDraft();
    this.deliveryTarget = this.createDeliveryTargetDraft();
  }
  /** Reuses the single optional Team projector within the same save transaction. @private */
  private synchronizeDeliveryContext(settings: Settings, workspaceId: string): Settings {
    return this._configuration.synchronizeDeliveryContext(settings, workspaceId);
  }
  /**
   * Chooses the repository directory.
   *
   * @private
   */
  private async onExecuteChooseRepositoryDirectoryCommand(): Promise<void> {
    const result = await this._client.selectPath({
      kind: 'directory',
      title: 'Choose local repository',
      defaultPath: this.repository.localPath || undefined,
    });
    if (!result.canceled && result.paths[0]) {
      this.repository.localPath = result.paths[0];
      this._changeDetector.detectChanges();
    }
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
   * Returns the event text.
   *
   * @param event - Event.
   * @private
   */
  private resolveEventText(event: unknown): string {
    return String(this.eventValue(event) ?? '');
  }
  /**
   * Updates the repository git protocol.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateRepositoryGitProtocolCommand(event: unknown): void {
    const protocol = this.resolveEventText(event);
    if (protocol === 'https' || protocol === 'ssh') {
      this.repository.gitProtocol = protocol;
      this._changeDetector.detectChanges();
    }
  }
  /**
   * Refreshes the git hub actions usage.
   *
   * @private
   */
  private async onExecuteRefreshGitHubActionsUsageCommand(): Promise<void> {
    const data = this.data;
    if (data.kind !== 'repository' || !data.repositoryBindingId) return;
    await this._ci?.refreshContinuousIntegrationUsage([data.repositoryBindingId], true);
  }
  /**
   * Returns the github actions usage.
   *
   * @private
   */
  private resolveGithubActionsUsage() {
    const data = this.data;
    return data.kind === 'repository' && data.repositoryBindingId
      ? this._ci?.continuousIntegrationUsageReport(data.repositoryBindingId)
      : undefined;
  }
  /**
   * Whether it has existing repository.
   *
   * @private
   */
  private resolveHasExistingRepository(): boolean {
    return this.data.kind === 'repository' && Boolean(this.data.repositoryBindingId);
  }
  /** Saves only a validated destination belonging to the editor's project. @private */
  private async saveDeliveryTarget(): Promise<void> {
    const target = this.resolveDeliveryTarget();
    if (!target || this.duplicateDeliveryTarget()) return;
    const current = this.requireSettings();
    if (
      await this._configuration.saveSettings({
        ...current,
        deliveryTargets: upsert(current.deliveryTargets, target),
      })
    )
      this._drawerRef.close();
  }
  /** @private */
  private resolveDeliveryTarget(): Settings['deliveryTargets'][number] | undefined {
    const data = this.data;
    if (data.kind !== 'delivery-target' || !this.deliveryRepository()) return undefined;
    if (
      data.targetId &&
      !this._context
        .settings()
        ?.deliveryTargets.some(
          (target) =>
            target.id === data.targetId &&
            target.workspaceId === data.workspaceId &&
            target.repositoryBindingId === data.repositoryBindingId,
        )
    )
      return undefined;
    const draft = this.deliveryTarget;
    const result = deliveryTargetSchema.safeParse({
      id: data.targetId ?? this._deliveryTargetId,
      workspaceId: data.workspaceId,
      repositoryBindingId: data.repositoryBindingId,
      displayName: draft.displayName.trim(),
      kind: draft.kind,
      environment: draft.environment.trim(),
      production: draft.production,
      celestialBody: draft.celestialBody,
      workflowId: draft.workflowId || undefined,
      versionInput: draft.workflowId ? draft.versionInput.trim() || undefined : undefined,
      environmentInput: draft.workflowId ? draft.environmentInput.trim() || undefined : undefined,
      operationInput: draft.workflowId ? draft.operationInput.trim() || undefined : undefined,
    });
    return result.success ? result.data : undefined;
  }
  /** @private */
  private async refreshDeliveryWorkflows(): Promise<void> {
    const repository = this.deliveryRepository();
    if (!repository || this.deliveryWorkflowsBusy()) return;
    this.deliveryWorkflowsBusy.set(true);
    this.deliveryWorkflowsError.set(false);
    try {
      const result = await this._client.request('setup.repository.inspect', {
        settings: this.requireSettings(),
        repositoryBindingId: repository.id,
      });
      if (this.disposed()) return;
      this.deliveryWorkflows.set(
        result.workflows.filter(
          (workflow) =>
            workflow.repositoryBindingId === repository.id &&
            workflow.workspaceId === repository.workspaceId &&
            workflow.supportsManualDispatch &&
            workflow.state === 'active',
        ),
      );
    } catch {
      if (!this.disposed()) this.deliveryWorkflowsError.set(true);
    } finally {
      if (!this.disposed()) this.deliveryWorkflowsBusy.set(false);
    }
  }
  private async saveRepository(): Promise<void> {
    const data = this.data;
    if (data.kind !== 'repository') return;
    const current = this.requireSettings();
    if (
      !this.repository.displayName.trim() ||
      !this.repository.owner.trim() ||
      !this.repository.name.trim()
    )
      return;
    const existing = current.repositoryBindings.find(
      (item) => item.id === data.repositoryBindingId,
    );
    const repositoryId = existing?.id ?? `repository-${crypto.randomUUID()}`;
    const hostname = this.repository.host.trim() || 'github.com';
    const accountLogin = this.repository.accountLogin.trim();
    const matchingConnections = current.connections.filter(
      (item): item is Extract<Connection, { kind: 'github' }> =>
        item.kind === 'github' &&
        item.workspaceId === data.workspaceId &&
        item.hostname === hostname &&
        item.gitProtocol === this.repository.gitProtocol &&
        (!accountLogin || item.accountLogin === accountLogin),
    );
    const existingConnection = existing
      ? current.connections.find(
          (item): item is Extract<Connection, { kind: 'github' }> =>
            item.kind === 'github' && item.id === existing.sourceControlConnectionId,
        )
      : undefined;
    const existingConnectionIsShared = existingConnection
      ? current.repositoryBindings.some(
          (item) =>
            item.id !== repositoryId && item.sourceControlConnectionId === existingConnection.id,
        )
      : false;
    const existingConnectionMatches =
      existingConnection?.hostname === hostname &&
      existingConnection.gitProtocol === this.repository.gitProtocol &&
      (existingConnection.accountLogin ?? '') === accountLogin;
    const reusableConnection =
      existingConnection && (!existingConnectionIsShared || existingConnectionMatches)
        ? existingConnection
        : matchingConnections.length === 1
          ? matchingConnections[0]
          : undefined;
    const connectionId = reusableConnection?.id ?? `github-${crypto.randomUUID()}`;
    const connection: Extract<Connection, { kind: 'github' }> = {
      id: connectionId,
      workspaceId: data.workspaceId,
      kind: 'github',
      displayName:
        reusableConnection?.displayName || accountLogin || this.repository.displayName.trim(),
      hostname,
      ...(accountLogin
        ? { accountLogin }
        : reusableConnection?.accountLogin
          ? { accountLogin: reusableConnection.accountLogin }
          : {}),
      gitProtocol: this.repository.gitProtocol,
    };
    const repository: Settings['repositoryBindings'][number] = {
      id: repositoryId,
      workspaceId: data.workspaceId,
      sourceControlConnectionId: connectionId,
      displayName: this.repository.displayName.trim(),
      provider: 'github',
      host: connection.hostname,
      owner: this.repository.owner.trim(),
      name: this.repository.name.trim(),
      defaultBranch: this.repository.defaultBranch.trim() || 'main',
      localPath: this.repository.localPath.trim(),
      enabled: this.repository.enabled,
    };
    const existingCi = current.ciBindings.find((item) => item.repositoryBindingId === repositoryId);
    const ciBindings = this.repository.ciEnabled
      ? upsert(current.ciBindings, {
          id: existingCi?.id ?? `ci-${crypto.randomUUID()}`,
          workspaceId: data.workspaceId,
          repositoryBindingId: repositoryId,
          sourceControlConnectionId: connectionId,
          provider: 'github-actions' as const,
          displayName: `${repository.displayName} Actions`,
          enabled: true,
          agenticDeliveryEnabled: this.repository.agenticDeliveryEnabled,
        })
      : current.ciBindings.filter((item) => item.repositoryBindingId !== repositoryId);
    const next = this.synchronizeDeliveryContext(
      {
        ...current,
        connections: upsert(current.connections, connection),
        repositoryBindings: upsert(current.repositoryBindings, repository),
        ciBindings,
      },
      data.workspaceId,
    );
    if (!(await this._configuration.saveSettings(next))) return;
    if (this.repository.authenticate) {
      await this._configuration.connectGitHub({
        mode: 'browser',
        hostname: connection.hostname,
        gitProtocol: connection.gitProtocol,
      });
    }
    this._drawerRef.close();
  }
  /**
   * Creates a computed projection that also follows mutable drawer draft changes.
   *
   * @param resolve - Resolves the current projection value.
   * @private
   */
  private createDraftProjection<TResult>(resolve: () => TResult) {
    return computed(() => {
      this._draftRevision();
      return resolve();
    });
  }
  /**
   * Tracks assignments to a mutable drawer draft as a reactive revision.
   *
   * @param draft - Draft to track.
   * @private
   */
  private createTrackedDraft<TDraft extends object>(draft: TDraft): TDraft {
    return createTrackedSettingsDraft(draft, () =>
      this._draftRevision.update((revision) => revision + 1),
    );
  }
  /** @private */
  private createDeliveryTargetDraft() {
    const data = this.data;
    const target =
      data.kind === 'delivery-target'
        ? this._context
            .settings()
            ?.deliveryTargets.find(
              (item) =>
                item.id === data.targetId &&
                item.repositoryBindingId === data.repositoryBindingId &&
                item.workspaceId === data.workspaceId,
            )
        : undefined;
    const production =
      target?.production ?? (data.kind === 'delivery-target' && data.production === true);
    return this.createTrackedDraft({
      displayName:
        target?.displayName ??
        (data.kind === 'delivery-target' ? data.displayName : undefined) ??
        (production ? 'Production' : ''),
      kind:
        target?.kind ??
        (data.kind === 'delivery-target' ? data.targetKind : undefined) ??
        'environment',
      environment:
        target?.environment ??
        (data.kind === 'delivery-target' ? data.environment : undefined) ??
        (production ? 'production' : ''),
      production,
      celestialBody: target?.celestialBody ?? 'sun',
      workflowId: target?.workflowId ?? '',
      versionInput: target?.versionInput ?? '',
      environmentInput: target?.environmentInput ?? '',
      operationInput: target?.operationInput ?? '',
    });
  }
  private createRepositoryDraft() {
    const settings = this._context.settings();
    const data = this.data;
    const repository =
      data.kind === 'repository'
        ? settings?.repositoryBindings.find((item) => item.id === data.repositoryBindingId)
        : undefined;
    const connection = repository
      ? settings?.connections.find(
          (item) => item.id === repository.sourceControlConnectionId && item.kind === 'github',
        )
      : undefined;
    const ci = repository
      ? settings?.ciBindings.find((item) => item.repositoryBindingId === repository.id)
      : undefined;
    return this.createTrackedDraft({
      displayName: repository?.displayName ?? '',
      host: repository?.host ?? 'github.com',
      owner: repository?.owner ?? '',
      name: repository?.name ?? '',
      defaultBranch: repository?.defaultBranch ?? 'main',
      localPath: repository?.localPath ?? '',
      enabled: repository?.enabled ?? true,
      accountLogin: connection?.kind === 'github' ? (connection.accountLogin ?? '') : '',
      gitProtocol: connection?.kind === 'github' ? connection.gitProtocol : ('https' as const),
      ciEnabled: ci?.enabled ?? true,
      agenticDeliveryEnabled: ci?.agenticDeliveryEnabled ?? false,
      authenticate: false,
    });
  }
  private requireSettings(): Settings {
    const settings = this._context.settings();
    if (!settings) throw new Error('Application settings are not loaded.');
    return settings;
  }
  private eventValue(event: unknown): unknown {
    if (typeof event === 'string' || typeof event === 'number' || typeof event === 'boolean')
      return event;
    const record =
      typeof event === 'object' && event !== null ? (event as Record<string, unknown>) : {};
    const detail =
      typeof record['detail'] === 'object' && record['detail'] !== null
        ? (record['detail'] as Record<string, unknown>)
        : {};
    const target =
      typeof record['target'] === 'object' && record['target'] !== null
        ? (record['target'] as Record<string, unknown>)
        : {};
    const newValue = record['newValue'] ?? detail['newValue'];
    const selection =
      typeof newValue === 'object' && newValue !== null
        ? (newValue as Record<string, unknown>)['value']
        : newValue;
    return record['value'] ?? detail['value'] ?? selection ?? target['value'];
  }
  // #endregion
}

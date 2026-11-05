// #region Imports

import { computed, inject, Injectable } from '@angular/core';
import { Command, Hydratable, ViewPresenter } from '@symphony/frontend-core';
import {
  mosaikEventText,
  SETTINGS_WORKSPACE_CONTEXT,
  SettingsAlertService,
  SettingsEditorService,
  SettingsHostSession,
  type ISettingsEditorRequest,
  type WorkspaceSettingsSection,
} from '@symphony/frontend-setting';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { DELIVERY_SETTINGS_CONTEXT } from '../ports/DeliverySettingsContextToken';
import { DELIVERY_SETTINGS_CONFIGURATION } from '../ports/DeliverySettingsConfigurationToken';
import { DELIVERY_REPOSITORY_RUNTIME } from '../ports/DeliveryRepositoryRuntimeToken';
import { deliverySettingsDraftFor } from './deliverySettingsDraftFor';
import { repositoryRemovalBlockers, withoutRepository } from './repository-removal';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

type RepositoryBinding = ApplicationSettingsDto['repositoryBindings'][number];

/** Owns the existing repository and destination settings cards. @public */
@Injectable()
export class DeliverySettingsViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields
  private readonly _context = inject(DELIVERY_SETTINGS_CONTEXT);
  private readonly _configuration = inject(DELIVERY_SETTINGS_CONFIGURATION);
  private readonly _runtime = inject(DELIVERY_REPOSITORY_RUNTIME);
  private readonly _settingsHost = inject(SettingsHostSession);
  private readonly _settingsEditors = inject(SettingsEditorService);
  private readonly _selection = inject(SETTINGS_WORKSPACE_CONTEXT);
  private readonly _alerts = inject(SettingsAlertService);
  private readonly _draft = deliverySettingsDraftFor(this._settingsHost);
  /** Retains the selected project across native card remounts. @public @readonly */
  public readonly deliveryRepositoryId = this._draft.deliveryRepositoryId;
  /** Configured workspace rendered by the same original card wrapper. @public @readonly */
  public readonly workspace = computed(() =>
    this._context.settings()?.workspaces.find((item) => item.id === this._selection.workspaceId()),
  );
  /** Native host selection without a feature-owned copy. @public @readonly */
  public readonly section = this._selection.sectionId;
  /** The single settings-writer lifecycle. @public @readonly */
  public readonly configurationBusy = this._context.configurationBusy;
  /** Whether repository preparation is contributed by Workspace. @public @readonly */
  public readonly repositoryRuntimeAvailable = this._runtime !== null;
  /** The existing Workspace-owned preparation signal. @public @readonly */
  public readonly repositoryRuntimeBusy = computed(() => this._runtime?.repositoryRuntimeBusy());
  /** Reads the existing Workspace-owned preparation result. @public @readonly */
  public readonly repositoryRuntimeStatus = (id: string) =>
    this._runtime?.repositoryRuntimeStatus(id);
  /** Workspace being configured, separate from active execution scope. @public @readonly */
  public readonly settingsWorkspaceId = this._settingsHost.workspaceId;
  /** Available projects are always scoped to the workspace being configured. @public */
  public readonly deliveryRepositories = computed(() =>
    (this._context.settings()?.repositoryBindings ?? []).filter(
      (repository) => repository.workspaceId === this.settingsWorkspaceId(),
    ),
  );
  /** @public */
  public readonly deliveryRepository = computed(
    () =>
      this.deliveryRepositories().find(
        (repository) => repository.id === this.deliveryRepositoryId(),
      ) ?? this.deliveryRepositories()[0],
  );
  /** @public */
  public readonly deliveryTargets = computed(() =>
    (this._context.settings()?.deliveryTargets ?? []).filter(
      (target) =>
        target.workspaceId === this.settingsWorkspaceId() &&
        target.repositoryBindingId === this.deliveryRepository()?.id,
    ),
  );
  /** @public */
  public readonly selectDeliveryRepositoryCommand = new Command<unknown>((event) => {
    const id = mosaikEventText(event);
    if (this.deliveryRepositories().some((repository) => repository.id === id))
      this.deliveryRepositoryId.set(id!);
  });
  /** Opens an explicit draft in the existing settings editor. @public */
  public readonly openDeliveryTargetCommand = new Command<string | undefined>((targetId) => {
    const repository = this.deliveryRepository();
    if (
      !repository ||
      (targetId && !this.deliveryTargets().some((target) => target.id === targetId))
    )
      return;
    this.openEditor({
      kind: 'delivery-target',
      workspaceId: repository.workspaceId,
      repositoryBindingId: repository.id,
      targetId,
    });
  });
  /** Removes configuration only, after an explicit confirmation. @public */
  public readonly removeDeliveryTargetCommand = new Command<string>((targetId) => {
    const target = this.deliveryTargets().find((item) => item.id === targetId);
    if (!target || this._context.configurationBusy()) return;
    void this._alerts
      .confirm({
        id: `remove-delivery-target-${targetId}`,
        header: translateLabel('loc.symphony.labels.remove.9d64ce8', target.displayName),
        get message() {
          return translateLabel(
            'loc.symphony.labels.this.removes.the.destination.configuration.from.symp.513d374',
          );
        },
        tone: 'danger',
        confirmLabel: translateLabel('loc.symphony.labels.remove.destination.bdaef27'),
        cancelLabel: translateLabel('loc.symphony.labels.keep.destination.4683038'),
        destructive: true,
      })
      .then((confirmed) => {
        if (!confirmed || this._context.configurationBusy()) return;
        const settings = this.requireSettings();
        void this._configuration.saveSettings({
          ...settings,
          deliveryTargets: settings.deliveryTargets.filter((item) => item.id !== targetId),
        });
      });
  });
  private readonly _repositoriesByWorkspace = computed(() => {
    const repositories = new Map<string, RepositoryBinding[]>();
    for (const repository of this._context.settings()?.repositoryBindings ?? []) {
      const workspaceRepositories = repositories.get(repository.workspaceId);
      if (workspaceRepositories) workspaceRepositories.push(repository);
      else repositories.set(repository.workspaceId, [repository]);
    }
    return repositories;
  });
  private readonly _selectWorkspaceSettingsSectionCommand: Command<WorkspaceSettingsSection> =
    new Command((section) => void this.onExecuteSelectWorkspaceSettingsSectionCommand(section));
  private readonly _workspaceRepositories = computed(
    () => (workspaceId: string) => this.resolveWorkspaceRepositories(workspaceId),
  );
  private readonly _repositoryPrepared = computed(
    () => (repositoryBindingId: string) => this.resolveRepositoryPrepared(repositoryBindingId),
  );
  private readonly _repositoryManaged = computed(
    () => (repositoryBindingId: string) => this.resolveRepositoryManaged(repositoryBindingId),
  );
  private readonly _prepareRepositoryCommand: Command<RepositoryBinding> = new Command(
    (repository) => void this.onExecutePrepareRepositoryCommand(repository),
  );
  private readonly _openRepositoryCommand: Command<
    readonly [workspaceId: string, repositoryBindingId?: string]
  > = new Command((parameters) => void this.onExecuteOpenRepositoryCommand(...parameters));
  private readonly _confirmRemoveRepositoryCommand: Command<RepositoryBinding> = new Command(
    (repository) => void this.onExecuteConfirmRemoveRepositoryCommand(repository),
  );
  // #endregion
  // #region Properties
  /**
   * The selectWorkspaceSettingsSection command.
   *
   * @public
   * @readonly
   */
  public get selectWorkspaceSettingsSectionCommand(): Command<WorkspaceSettingsSection> {
    return this._selectWorkspaceSettingsSectionCommand;
  }
  /**
   * The workspaceRepositories projection.
   *
   * @public
   * @readonly
   */
  public get workspaceRepositories() {
    return this._workspaceRepositories;
  }
  /**
   * The repositoryPrepared projection.
   *
   * @public
   * @readonly
   */
  public get repositoryPrepared() {
    return this._repositoryPrepared;
  }
  /**
   * The repositoryManaged projection.
   *
   * @public
   * @readonly
   */
  public get repositoryManaged() {
    return this._repositoryManaged;
  }
  /**
   * The prepareRepository command.
   *
   * @public
   * @readonly
   */
  public get prepareRepositoryCommand(): Command<RepositoryBinding> {
    return this._prepareRepositoryCommand;
  }
  /**
   * The openRepository command.
   *
   * @public
   * @readonly
   */
  public get openRepositoryCommand(): Command<
    readonly [workspaceId: string, repositoryBindingId?: string]
  > {
    return this._openRepositoryCommand;
  }
  /**
   * The confirmRemoveRepository command.
   *
   * @public
   * @readonly
   */
  public get confirmRemoveRepositoryCommand(): Command<RepositoryBinding> {
    return this._confirmRemoveRepositoryCommand;
  }
  // #endregion
  // #region Methods
  /** Preserves one active Settings drawer and its existing follow-up sequencing. @private */
  private openEditor<T extends ISettingsEditorRequest>(data: T): void {
    void this._settingsEditors.open(data, (workspaceId, section) => {
      if (workspaceId) this._settingsHost.openWorkspace(workspaceId, section);
    });
  }
  /** Loads only the configuration consumed by these mounted cards. @public */
  public override onHydrate(): Promise<void> | undefined {
    return this._context.settings() ? undefined : this._configuration.refreshConfiguration();
  }
  /** Selects the host's workspace section. @private */
  private onExecuteSelectWorkspaceSettingsSectionCommand(section: WorkspaceSettingsSection): void {
    this._settingsHost.selectWorkspaceSection(section);
  }
  /**
   * Returns the workspace repositories.
   *
   * @param workspaceId - Workspace id.
   * @private
   */
  private resolveWorkspaceRepositories(workspaceId: string) {
    return this._repositoriesByWorkspace().get(workspaceId) ?? [];
  }
  /**
   * Returns the repository prepared.
   *
   * @param repositoryBindingId - Repository binding id.
   * @private
   */
  private resolveRepositoryPrepared(repositoryBindingId: string): boolean {
    return (
      this._runtime?.repositoryRuntimeStatus(repositoryBindingId)?.preparation.state === 'prepared'
    );
  }
  /**
   * Returns the repository managed.
   *
   * @param repositoryBindingId - Repository binding id.
   * @private
   */
  private resolveRepositoryManaged(repositoryBindingId: string): boolean {
    const preparation = this._runtime?.repositoryRuntimeStatus(repositoryBindingId)?.preparation;
    return preparation?.state === 'prepared' && preparation.managed;
  }
  /**
   * Prepares the repository.
   *
   * @param repository - Repository.
   * @private
   */
  private async onExecutePrepareRepositoryCommand(repository: RepositoryBinding): Promise<void> {
    await this._runtime?.prepareRepository(repository.id);
  }
  /**
   * Opens the repository.
   *
   * @param workspaceId - Workspace id.
   * @param repositoryBindingId - Repository binding id.
   * @private
   */
  private onExecuteOpenRepositoryCommand(workspaceId: string, repositoryBindingId?: string): void {
    this.openEditor({ kind: 'repository', workspaceId, repositoryBindingId });
  }
  /**
   * Removes a repository binding after confirmation. A delivery context that would be left
   * without any repository blocks the removal instead of being silently emptied.
   *
   * @param repository - Repository.
   * @private
   */
  private onExecuteConfirmRemoveRepositoryCommand(repository: RepositoryBinding): void {
    const settings = this.requireSettings();
    const blockers = repositoryRemovalBlockers(settings, repository.id);
    if (blockers.length) {
      void this._alerts.confirm({
        id: `remove-repository-blocked-${repository.id}`,
        header: translateLabel('loc.symphony.labels.this.repository.is.still.in.use.7390f4c'),
        get message() {
          return blockers.length === 1
            ? translateLabel(
                'loc.symphony.labels.uses.only.this.repository.add.another.repository.the.b33eeda',
                blockers.join(', '),
              )
            : translateLabel(
                'loc.symphony.labels.use.only.this.repository.add.another.repository.ther.60ba295',
                blockers.join(', '),
              );
        },
        tone: 'warning',
        confirmLabel: translateLabel('loc.symphony.labels.ok.565339b'),
      });
      return;
    }
    void this._alerts
      .confirm({
        id: `remove-repository-${repository.id}`,
        header: translateLabel('loc.symphony.labels.remove.9d64ce8', repository.displayName),
        get message() {
          return translateLabel(
            'loc.symphony.labels.symphony.drops.the.repository.from.this.workspace.an.c3634e3',
          );
        },
        tone: 'danger',
        confirmLabel: translateLabel('loc.symphony.labels.remove.repository.c6d5a90'),
        cancelLabel: translateLabel('loc.symphony.labels.keep.repository.75f9955'),
        destructive: true,
      })
      .then((confirmed) => {
        if (!confirmed) return;
        void this._configuration.saveSettings(
          withoutRepository(this.requireSettings(), repository.id),
        );
      });
  }
  private requireSettings(): ApplicationSettingsDto {
    const settings = this._context.settings();
    if (!settings) throw new Error('Application settings are not loaded.');
    return settings;
  }
  // #endregion
}

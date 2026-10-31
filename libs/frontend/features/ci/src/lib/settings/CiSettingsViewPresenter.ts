// #region Imports

import {
  ApplicationRef,
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  untracked,
} from '@angular/core';
import { Command, Hydratable, ViewPresenter } from '@symphony/frontend-core';
import {
  mosaikEventText,
  mosaikEventValue,
  SETTINGS_WORKSPACE_CONTEXT,
  SettingsAlertService,
  SettingsHostSession,
} from '@symphony/frontend-setting';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import {
  type ILocalCiHostCapacity,
  type ILocalCiResourceLimits,
  type LocalCiResourcePresetName,
  localCiCustomResourceMaximums,
  localCiResourceMinimums,
  localCiResourcePresets,
  resolveLocalCiResourcePreset,
} from '@symphony/domain-ci';
import { CI_SETTINGS_CONTEXT } from '../ports/CiSettingsContextToken';
import { CI_SETTINGS_CONFIGURATION } from '../ports/CiSettingsConfigurationToken';
import { CI_RUNTIME_WORKSPACE_ROOT } from '../ports/CiRuntimeWorkspaceRootToken';
import { CiStore } from '../state/CiStore';
import { ciSettingsDraftFor } from './ciSettingsDraftFor';

// #endregion

type LocalCiResourceKey = keyof ILocalCiResourceLimits;
type RepositoryBinding = ApplicationSettingsDto['repositoryBindings'][number];
const BYTES_PER_GIBIBYTE = 1024 ** 3;

/** Owns CI's actual settings projections, drafts and commands over the existing state and writer. @public */
@Injectable()
export class CiSettingsViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields
  private readonly _context = inject(CI_SETTINGS_CONTEXT);
  private readonly _configuration = inject(CI_SETTINGS_CONFIGURATION);
  private readonly _session = inject(SettingsHostSession);
  private readonly _selection = inject(SETTINGS_WORKSPACE_CONTEXT, { optional: true });
  private readonly _runtimeWorkspaceRoot = inject(CI_RUNTIME_WORKSPACE_ROOT, { optional: true });
  private readonly _draft = ciSettingsDraftFor(this._session);
  private readonly _alerts = inject(SettingsAlertService);
  private readonly _application = inject(ApplicationRef);
  /** The existing CI operation and local-runner state owner. @public @readonly */
  public readonly store = inject(CiStore);
  /** The retained host-owned machine specification. @public @readonly */
  public readonly localCi = this._draft.localCi;
  /** Retained workspace activation values. @public @readonly */
  public readonly workspaceLocalCi = this._draft.workspaceLocalCi;
  /** Retained repository provisioning scripts. @public @readonly */
  public readonly setupScripts = this._draft.setupScripts;
  /**
   * The local CI capacity.
   *
   * @public
   * @readonly
   */
  public readonly localCiCapacity = computed(() => this._context.storageStatus()?.localCiCapacity);

  /**
   * The runner image catalog.
   *
   * @public
   * @readonly
   */
  public readonly runnerImageCatalog = this.store.runnerImageCatalog;

  /**
   * The runner image busy.
   *
   * @public
   * @readonly
   */
  public readonly runnerImageBusy = this.store.runnerImageBusy;

  /**
   * The runner image entries.
   *
   * @public
   * @readonly
   */
  public readonly runnerImageEntries = computed(
    () => this.store.runnerImageCatalog()?.entries ?? [],
  );

  private readonly _repositoriesByWorkspace = computed(() => {
    const repositories = new Map<string, RepositoryBinding[]>();
    for (const repository of this._context.settings()?.repositoryBindings ?? []) {
      const workspaceRepositories = repositories.get(repository.workspaceId);
      if (workspaceRepositories) workspaceRepositories.push(repository);
      else repositories.set(repository.workspaceId, [repository]);
    }
    return repositories;
  });

  private readonly _workspaceRepositories = computed(
    () => (workspaceId: string) => this.resolveWorkspaceRepositories(workspaceId),
  );

  private readonly _storageMeasured = computed(() => this.resolveStorageMeasured());

  private readonly _localCiStorage = computed(() => this.resolveLocalCiStorage());

  private readonly _updateLocalCiResourcePresetCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateLocalCiResourcePresetCommand(event),
  );

  private readonly _updateLocalCiCustomResourceCommand: Command<
    readonly [resource: LocalCiResourceKey, event: unknown]
  > = new Command(
    (parameters) => void this.onExecuteUpdateLocalCiCustomResourceCommand(...parameters),
  );

  private readonly _updateLocalCiStorageLimitCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateLocalCiStorageLimitCommand(event),
  );

  private readonly _localCiPresetSupported = computed(
    () => (preset: LocalCiResourcePresetName) => this.resolveLocalCiPresetSupported(preset),
  );

  private readonly _localCiCustomResources = computed(() => this.resolveLocalCiCustomResources());

  private readonly _localCiCustomResourceMaximum = computed(
    () => (resource: LocalCiResourceKey) => this.resolveLocalCiCustomResourceMaximum(resource),
  );

  private readonly _localCiRuntimeRoot = computed(() => this.resolveLocalCiRuntimeRoot());

  private readonly _localCiPreset = computed(
    () => (preset: LocalCiResourcePresetName) => this.resolveLocalCiPreset(preset),
  );

  private readonly _saveLocalCiCommand: Command<void> = new Command(
    () => void this.onExecuteSaveLocalCiCommand(),
  );

  private readonly _commitSetupScriptCommand: Command<string> = new Command(
    (repositoryBindingId) => void this.onExecuteCommitSetupScriptCommand(repositoryBindingId),
  );

  private readonly _workspaceLocalCiEnabled = computed(
    () => (workspaceId: string) => this.resolveWorkspaceLocalCiEnabled(workspaceId),
  );

  private readonly _updateWorkspaceLocalCiCommand: Command<
    readonly [workspaceId: string, enabled: boolean]
  > = new Command((parameters) => void this.onExecuteUpdateWorkspaceLocalCiCommand(...parameters));

  private readonly _runnerImageSelection = computed(
    () => (workspaceId: string) => this.resolveRunnerImageSelection(workspaceId),
  );

  private readonly _effectiveRunnerImageReleaseTag = computed(
    () => (workspaceId: string) => this.resolveEffectiveRunnerImageReleaseTag(workspaceId),
  );

  private readonly _runnerImageHint = computed(
    () => (workspaceId: string) => this.resolveRunnerImageHint(workspaceId),
  );

  private readonly _selectRunnerImageCommand: Command<
    readonly [workspaceId: string, releaseTag: unknown]
  > = new Command((parameters) => void this.onExecuteSelectRunnerImageCommand(...parameters));

  private readonly _refreshRunnerImagesCommand: Command<void> = new Command(
    () => void this.onExecuteRefreshRunnerImagesCommand(),
  );

  private readonly _localCiInstances = computed(() => this.resolveLocalCiInstances());

  private readonly _abandonedLocalCiInstances = computed(() =>
    this.resolveAbandonedLocalCiInstances(),
  );

  private readonly _refreshLocalCiInstancesCommand: Command<void> = new Command(
    () => void this.onExecuteRefreshLocalCiInstancesCommand(),
  );

  private readonly _confirmRemoveLocalCiInstanceCommand: Command<string> = new Command(
    (name) => void this.onExecuteConfirmRemoveLocalCiInstanceCommand(name),
  );

  private readonly _updateLocalCiReuseCommand: Command<boolean> = new Command(
    (enabled) => void this.onExecuteUpdateLocalCiReuseCommand(enabled),
  );

  private readonly _updateSetupScriptCommand: Command<
    readonly [repositoryBindingId: string, event: unknown]
  > = new Command((parameters) => void this.onExecuteUpdateSetupScriptCommand(...parameters));

  private readonly _setupScript = computed(
    () => (repositoryBindingId: string) => this.resolveSetupScript(repositoryBindingId),
  );

  private readonly _confirmClearLocalCiDataCommand: Command<void> = new Command(
    () => void this.onExecuteConfirmClearLocalCiDataCommand(),
  );
  // #endregion
  // #region Ctor
  public constructor() {
    super();
    const storageRefreshTimer = window.setInterval(
      () => void this._configuration.refreshStorageStatus(true),
      5_000,
    );
    inject(DestroyRef).onDestroy(() => window.clearInterval(storageRefreshTimer));
    effect(() => {
      const settings = this._context.settings();
      if (!settings) return;
      if (this._draft.settings !== settings) {
        const previous = this._draft.settings;
        this._draft.settings = settings;
        // Saving settles one machine change while the next slider step may already be waiting:
        // only adopt the stored machine settings when nothing local is ahead of the last ones.
        const localCiAhead =
          previous !== undefined &&
          JSON.stringify(untracked(() => this.localCi())) !== JSON.stringify(previous.localCi);
        if (!localCiAhead) this.localCi.set({ ...settings.localCi });
        this.workspaceLocalCi.set(
          Object.fromEntries(
            settings.workspaces.map((workspace) => [workspace.id, workspace.localCiEnabled]),
          ),
        );
        this.setupScripts.set(
          Object.fromEntries(
            settings.repositoryBindings.map((binding) => [
              binding.id,
              binding.localCiSetupScript ?? '',
            ]),
          ),
        );
      }
      if (
        settings.workspaces.some((workspace) => workspace.localCiEnabled) &&
        !this.store.runnerImageCatalog() &&
        !this.store.runnerImageBusy()
      )
        void this.store.refreshRunnerImages();
      if (!this.store.localCiInstances() && !this.store.localCiInstancesBusy())
        void this.store.refreshLocalCiInstances();
    });
  }
  // #endregion
  // #region Properties
  /** The existing shared configuration-writer exclusion. @public @readonly */
  public readonly configurationBusy = this._context.configurationBusy;
  /** The workspace selected by Settings, independent of active execution scope. @public @readonly */
  public readonly workspace = computed(() =>
    this._context
      .settings()
      ?.workspaces.find(
        (workspace) =>
          workspace.id === (this._selection?.workspaceId() ?? this._session.workspaceId()),
      ),
  );
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
   * The storageMeasured projection.
   *
   * @public
   * @readonly
   */
  public get storageMeasured() {
    return this._storageMeasured;
  }

  /**
   * The localCiStorage projection.
   *
   * @public
   * @readonly
   */
  public get localCiStorage() {
    return this._localCiStorage;
  }

  /**
   * The updateLocalCiResourcePreset command.
   *
   * @public
   * @readonly
   */
  public get updateLocalCiResourcePresetCommand(): Command<unknown> {
    return this._updateLocalCiResourcePresetCommand;
  }

  /**
   * The updateLocalCiCustomResource command.
   *
   * @public
   * @readonly
   */
  public get updateLocalCiCustomResourceCommand(): Command<
    readonly [resource: LocalCiResourceKey, event: unknown]
  > {
    return this._updateLocalCiCustomResourceCommand;
  }

  /**
   * The updateLocalCiStorageLimit command.
   *
   * @public
   * @readonly
   */
  public get updateLocalCiStorageLimitCommand(): Command<unknown> {
    return this._updateLocalCiStorageLimitCommand;
  }

  /**
   * The localCiPresetSupported projection.
   *
   * @public
   * @readonly
   */
  public get localCiPresetSupported() {
    return this._localCiPresetSupported;
  }

  /**
   * The localCiCustomResources projection.
   *
   * @public
   * @readonly
   */
  public get localCiCustomResources() {
    return this._localCiCustomResources;
  }

  /**
   * The localCiCustomResourceMaximum projection.
   *
   * @public
   * @readonly
   */
  public get localCiCustomResourceMaximum() {
    return this._localCiCustomResourceMaximum;
  }

  /**
   * The localCiRuntimeRoot projection.
   *
   * @public
   * @readonly
   */
  public get localCiRuntimeRoot() {
    return this._localCiRuntimeRoot;
  }

  /**
   * The localCiPreset projection.
   *
   * @public
   * @readonly
   */
  public get localCiPreset() {
    return this._localCiPreset;
  }

  /**
   * The saveLocalCi command.
   *
   * @public
   * @readonly
   */
  public get saveLocalCiCommand(): Command<void> {
    return this._saveLocalCiCommand;
  }

  /**
   * Saves one repository's setup script once its editor loses focus, restoring the stored script
   * when saving fails.
   *
   * @public
   * @readonly
   */
  public get commitSetupScriptCommand(): Command<string> {
    return this._commitSetupScriptCommand;
  }

  /**
   * The workspaceLocalCiEnabled projection.
   *
   * @public
   * @readonly
   */
  public get workspaceLocalCiEnabled() {
    return this._workspaceLocalCiEnabled;
  }

  /**
   * The updateWorkspaceLocalCi command.
   *
   * @public
   * @readonly
   */
  public get updateWorkspaceLocalCiCommand(): Command<
    readonly [workspaceId: string, enabled: boolean]
  > {
    return this._updateWorkspaceLocalCiCommand;
  }

  /**
   * The runnerImageSelection projection.
   *
   * @public
   * @readonly
   */
  public get runnerImageSelection() {
    return this._runnerImageSelection;
  }

  /**
   * The effectiveRunnerImageReleaseTag projection.
   *
   * @public
   * @readonly
   */
  public get effectiveRunnerImageReleaseTag() {
    return this._effectiveRunnerImageReleaseTag;
  }

  /**
   * The runnerImageHint projection.
   *
   * @public
   * @readonly
   */
  public get runnerImageHint() {
    return this._runnerImageHint;
  }

  /**
   * The selectRunnerImage command.
   *
   * @public
   * @readonly
   */
  public get selectRunnerImageCommand(): Command<
    readonly [workspaceId: string, releaseTag: unknown]
  > {
    return this._selectRunnerImageCommand;
  }

  /**
   * The refreshRunnerImages command.
   *
   * @public
   * @readonly
   */
  public get refreshRunnerImagesCommand(): Command<void> {
    return this._refreshRunnerImagesCommand;
  }

  /**
   * The localCiInstances projection.
   *
   * @public
   * @readonly
   */
  public get localCiInstances() {
    return this._localCiInstances;
  }

  /**
   * The abandonedLocalCiInstances projection.
   *
   * @public
   * @readonly
   */
  public get abandonedLocalCiInstances() {
    return this._abandonedLocalCiInstances;
  }

  /**
   * The refreshLocalCiInstances command.
   *
   * @public
   * @readonly
   */
  public get refreshLocalCiInstancesCommand(): Command<void> {
    return this._refreshLocalCiInstancesCommand;
  }

  /**
   * The confirmRemoveLocalCiInstance command.
   *
   * @public
   * @readonly
   */
  public get confirmRemoveLocalCiInstanceCommand(): Command<string> {
    return this._confirmRemoveLocalCiInstanceCommand;
  }

  /**
   * The updateLocalCiReuse command.
   *
   * @public
   * @readonly
   */
  public get updateLocalCiReuseCommand(): Command<boolean> {
    return this._updateLocalCiReuseCommand;
  }

  /**
   * The updateSetupScript command.
   *
   * @public
   * @readonly
   */
  public get updateSetupScriptCommand(): Command<
    readonly [repositoryBindingId: string, event: unknown]
  > {
    return this._updateSetupScriptCommand;
  }

  /**
   * The setupScript projection.
   *
   * @public
   * @readonly
   */
  public get setupScript() {
    return this._setupScript;
  }

  /**
   * The confirmClearLocalCiData command.
   *
   * @public
   * @readonly
   */
  public get confirmClearLocalCiDataCommand(): Command<void> {
    return this._confirmClearLocalCiDataCommand;
  }
  // #endregion
  // #region Methods
  /** Hydrates only CI's existing configuration, catalog and local machine dependencies. @public */
  public override onHydrate(): Promise<void> | undefined {
    const hydration: Promise<unknown>[] = [];
    if (!this._context.settings()) hydration.push(this._configuration.refreshConfiguration());
    if (
      this._context.settings()?.workspaces.some((workspace) => workspace.localCiEnabled) &&
      !this.store.runnerImageCatalog()
    )
      hydration.push(this.store.refreshRunnerImages());
    if (!this.store.localCiInstances()) hydration.push(this.store.refreshLocalCiInstances());
    const refreshView = (): void => {
      window.requestAnimationFrame(() => {
        this._application.tick();
      });
    };
    if (!hydration.length) {
      refreshView();
      return undefined;
    }
    return Promise.all(hydration)
      .then(() => undefined)
      .finally(refreshView);
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
   * Whether a completed walk backs the reported allocations; see StorageGovernor.
   *
   * @private
   */
  private resolveStorageMeasured(): boolean {
    return this._context.storageStatus()?.measured ?? false;
  }

  /**
   * Returns the local CI storage.
   *
   * @private
   */
  private resolveLocalCiStorage() {
    return this._context.storageStatus()?.localCi;
  }

  /**
   * Updates the local CI resource preset.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateLocalCiResourcePresetCommand(event: unknown): void {
    const value = this.eventValue(event);
    if (
      (value === 'compact' ||
        value === 'balanced' ||
        value === 'performance' ||
        value === 'custom') &&
      this.resolveLocalCiPresetSupported(value)
    ) {
      this.localCi.update((current) => ({
        ...current,
        resourcePreset: value,
        ...(value === 'custom' && !current.customResources
          ? { customResources: this.resolveLocalCiCustomResources() }
          : {}),
      }));
    }
  }

  /**
   * Updates the local CI custom resource.
   *
   * @param resource - Resource.
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateLocalCiCustomResourceCommand(
    resource: LocalCiResourceKey,
    event: unknown,
  ): void {
    const value = Math.floor(Number(this.eventValue(event)));
    if (!Number.isFinite(value)) return;
    const minimum = localCiResourceMinimums[resource];
    const maximum = this.resolveLocalCiCustomResourceMaximum(resource);
    this.localCi.update((current) => ({
      ...current,
      customResources: {
        ...this.resolveLocalCiCustomResources(),
        [resource]: Math.min(maximum, Math.max(minimum, value)),
      },
    }));
  }

  /**
   * Updates the local CI storage limit.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateLocalCiStorageLimitCommand(event: unknown): void {
    const value = Number(this.eventValue(event));
    if (Number.isFinite(value)) {
      this.localCi.update((current) => ({ ...current, storageLimitGiB: value }));
    }
  }

  /**
   * Returns the local CI preset supported.
   *
   * @param preset - Preset.
   * @private
   */
  private resolveLocalCiPresetSupported(preset: LocalCiResourcePresetName): boolean {
    return this.resolveLocalCiPreset(preset)?.supported ?? false;
  }

  /**
   * Returns the local CI custom resources.
   *
   * @private
   */
  private resolveLocalCiCustomResources(): ILocalCiResourceLimits {
    const current = this.localCi();
    if (current.customResources) return current.customResources;
    const seedPreset = current.resourcePreset === 'custom' ? 'compact' : current.resourcePreset;
    return (
      this._context.storageStatus()?.localCiCapacity.presets[seedPreset]?.resources ??
      localCiResourcePresets[seedPreset]
    );
  }

  /**
   * Returns the local CI custom resource maximum.
   *
   * @param resource - Resource.
   * @private
   */
  private resolveLocalCiCustomResourceMaximum(resource: LocalCiResourceKey): number {
    const resources = this.resolveLocalCiCustomResources();
    const capacity = this.localCiHostCapacity();
    if (!capacity) return resources[resource];
    return Math.max(
      localCiResourceMinimums[resource],
      localCiCustomResourceMaximums(resources, capacity)[resource],
    );
  }

  /**
   * Returns the local CI runtime root.
   *
   * @private
   */
  private resolveLocalCiRuntimeRoot(): string {
    const workspaceRoot = (
      this._context.settings()?.runtime.workspaceRoot ??
      this._runtimeWorkspaceRoot?.() ??
      ''
    ).replace(/[\\/]+$/u, '');
    return `${workspaceRoot}/local-ci`;
  }

  /**
   * Returns the local CI preset.
   *
   * @param preset - Preset.
   * @private
   */
  private resolveLocalCiPreset(preset: LocalCiResourcePresetName) {
    if (preset !== 'custom') return this._context.storageStatus()?.localCiCapacity.presets[preset];
    const capacity = this.localCiHostCapacity();
    return capacity
      ? resolveLocalCiResourcePreset('custom', capacity, this.resolveLocalCiCustomResources())
      : undefined;
  }

  /**
   * Saves the host-owned machine specification. Workspace activation is saved with its workspace.
   *
   * @private
   */
  private async onExecuteSaveLocalCiCommand(): Promise<void> {
    const current = this.requireSettings();
    await this._configuration.saveSettings({ ...current, localCi: this.localCi() });
  }

  /**
   * Saves one repository's setup script, trimmed, when it differs from the stored script. An empty
   * script removes the field. A failed save restores the stored script in the editor.
   *
   * @param repositoryBindingId - Repository binding id.
   * @private
   */
  private async onExecuteCommitSetupScriptCommand(repositoryBindingId: string): Promise<void> {
    const current = this._context.settings();
    const binding = current?.repositoryBindings.find((item) => item.id === repositoryBindingId);
    if (!current || !binding) return;
    const stored = binding.localCiSetupScript ?? '';
    const script = (this.setupScripts()[repositoryBindingId] ?? '').trim();
    if (script === stored.trim()) return;
    const rest = { ...binding };
    delete rest.localCiSetupScript;
    const saved = await this._configuration.saveSettings({
      ...current,
      repositoryBindings: current.repositoryBindings.map((item) =>
        item.id === repositoryBindingId
          ? script
            ? { ...rest, localCiSetupScript: script }
            : rest
          : item,
      ),
    });
    if (!saved)
      this.setupScripts.update((scripts) => ({ ...scripts, [repositoryBindingId]: stored }));
  }

  /**
   * Saves a workspace's activation as soon as it changes. A failed save shows the stored value
   * again; turning local runs on loads the runner image catalog.
   *
   * @param workspaceId - Workspace id.
   * @param enabled - Enabled.
   * @private
   */
  private async saveWorkspaceLocalCi(workspaceId: string, enabled: boolean): Promise<void> {
    const current = this._context.settings();
    const workspace = current?.workspaces.find((item) => item.id === workspaceId);
    if (!current || !workspace || workspace.localCiEnabled === enabled) return;
    const saved = await this._configuration.saveSettings({
      ...current,
      workspaces: current.workspaces.map((item) =>
        item.id === workspaceId ? { ...item, localCiEnabled: enabled } : item,
      ),
    });
    if (!saved) {
      this.workspaceLocalCi.update((values) => ({
        ...values,
        [workspaceId]: workspace.localCiEnabled,
      }));
      return;
    }
    if (enabled && !this.store.runnerImageCatalog() && !this.store.runnerImageBusy())
      await this.store.refreshRunnerImages();
  }

  /**
   * Returns the workspace local CI enabled.
   *
   * @param workspaceId - Workspace id.
   * @private
   */
  private resolveWorkspaceLocalCiEnabled(workspaceId: string): boolean {
    return this.workspaceLocalCi()[workspaceId] ?? false;
  }

  /**
   * Updates the workspace local CI.
   *
   * @param workspaceId - Workspace id.
   * @param enabled - Enabled.
   * @private
   */
  private onExecuteUpdateWorkspaceLocalCiCommand(workspaceId: string, enabled: boolean): void {
    this.workspaceLocalCi.update((current) => ({ ...current, [workspaceId]: enabled }));
    void this.saveWorkspaceLocalCi(workspaceId, enabled);
  }

  /**
   * Guest image pinned for one workspace. The catalog response is authoritative once loaded;
   * before that the persisted settings value is shown, so an automatically pinned image is
   * visible without an outbound request.
   *
   * @param workspaceId - Workspace id.
   * @private
   */
  private resolveRunnerImageSelection(workspaceId: string) {
    const fromCatalog = this.store
      .runnerImageCatalog()
      ?.selections.find((selection) => selection.workspaceId === workspaceId)?.image;
    if (fromCatalog) return fromCatalog;
    return this._context.settings()?.workspaces.find((workspace) => workspace.id === workspaceId)
      ?.localCiImage;
  }

  /**
   * Release the workspace will actually boot: its pinned selection, or the newest published
   * release for this Mac, which Symphony pins on the first run.
   *
   * @param workspaceId - Workspace id.
   * @private
   */
  private resolveEffectiveRunnerImageReleaseTag(workspaceId: string): string {
    const pinned = this.resolveRunnerImageSelection(workspaceId)?.releaseTag;
    if (pinned) return pinned;
    return this.runnerImageEntries().find((entry) => entry.latest)?.releaseTag ?? '';
  }

  /**
   * Explains why the image list is empty instead of showing a silent empty select.
   *
   * @param workspaceId - Workspace id.
   * @private
   */
  private resolveRunnerImageHint(workspaceId: string): string | undefined {
    if (this.runnerImageBusy()) return 'Loading the published runner image releases…';
    if (this.runnerImageEntries().length) return undefined;
    if (!this.resolveWorkspaceLocalCiEnabled(workspaceId)) {
      return 'Enable local runs for this workspace to load the published runner image releases.';
    }
    return 'No releases loaded yet. Choose Refresh catalog to read them from GitHub.';
  }

  /**
   * Selects the runner image.
   *
   * @param workspaceId - Workspace id.
   * @param releaseTag - Release tag.
   * @private
   */
  private async onExecuteSelectRunnerImageCommand(
    workspaceId: string,
    releaseTag: unknown,
  ): Promise<void> {
    const value = mosaikEventText(releaseTag);
    if (!value) return;
    if (this.resolveRunnerImageSelection(workspaceId)?.releaseTag === value) return;
    await this.store.selectRunnerImage(workspaceId, value);
  }

  /**
   * Refreshes the runner images.
   *
   * @private
   */
  private async onExecuteRefreshRunnerImagesCommand(): Promise<void> {
    await this.store.refreshRunnerImages(true);
  }

  /**
   * Returns the local CI instances.
   *
   * @private
   */
  private resolveLocalCiInstances() {
    return this.store.localCiInstances()?.instances ?? [];
  }

  /**
   * Machines automatic cleanup should have removed but did not, worth calling out.
   *
   * @private
   */
  private resolveAbandonedLocalCiInstances() {
    return this.resolveLocalCiInstances().filter(
      (instance) => !instance.keptWarm && !instance.busy && instance.status !== 'running',
    );
  }

  /**
   * Refreshes the local CI instances.
   *
   * @private
   */
  private async onExecuteRefreshLocalCiInstancesCommand(): Promise<void> {
    await this.store.refreshLocalCiInstances(true);
  }

  /**
   * Confirms the remove local CI instance.
   *
   * @param name - Name.
   * @private
   */
  private onExecuteConfirmRemoveLocalCiInstanceCommand(name: string): void {
    void this._alerts
      .confirm({
        id: 'remove-local-ci-instance-confirmation',
        header: 'Remove this machine?',
        message: `${name} and its disk will be deleted. The next run that needs it provisions a new machine.`,
        tone: 'danger',
        confirmLabel: 'Remove machine',
        cancelLabel: 'Keep machine',
        destructive: true,
      })
      .then((confirmed) => {
        if (confirmed) void this.store.removeLocalCiInstance(name);
      });
  }

  /**
   * Updates the local CI reuse.
   *
   * @param enabled - Enabled.
   * @private
   */
  private onExecuteUpdateLocalCiReuseCommand(enabled: boolean): void {
    this.localCi.update((current) => ({ ...current, reuseVirtualMachine: enabled }));
  }

  /**
   * Updates the setup script.
   *
   * @param repositoryBindingId - Repository binding id.
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateSetupScriptCommand(repositoryBindingId: string, event: unknown): void {
    const value = mosaikEventText(event);
    if (value === undefined) return;
    this.setupScripts.update((current) => ({ ...current, [repositoryBindingId]: value }));
  }

  /**
   * Returns the setup script.
   *
   * @param repositoryBindingId - Repository binding id.
   * @private
   */
  private resolveSetupScript(repositoryBindingId: string): string {
    return this.setupScripts()[repositoryBindingId] ?? '';
  }

  /**
   * Confirms the clear local CI data.
   *
   * @private
   */
  private onExecuteConfirmClearLocalCiDataCommand(): void {
    void this._alerts
      .confirm({
        id: 'clear-local-ci-data-confirmation',
        header: 'Clear local runner data?',
        message:
          'Inactive Linux instances, cached base images, and runner tools will be removed. The next local run downloads the verified tooling and image again.',
        tone: 'danger',
        confirmLabel: 'Clear runner data',
        cancelLabel: 'Keep data',
        destructive: true,
      })
      .then((confirmed) => {
        if (confirmed) void this.store.clearLocalCiData();
      });
  }

  private localCiHostCapacity(): ILocalCiHostCapacity | undefined {
    const capacity = this._context.storageStatus()?.localCiCapacity;
    if (!capacity) return undefined;
    return {
      logicalCpus: capacity.logicalCpus,
      memoryGiB: Math.floor(capacity.totalMemoryBytes / BYTES_PER_GIBIBYTE),
      availableStorageGiB: Math.floor(capacity.availableStorageBytes / BYTES_PER_GIBIBYTE),
      storageLimitGiB: this.localCi().storageLimitGiB,
    };
  }

  private requireSettings(): ApplicationSettingsDto {
    const settings = this._context.settings();
    if (!settings) throw new Error('Application settings are not loaded.');
    return settings;
  }

  private eventValue(event: unknown): unknown {
    return mosaikEventValue(event);
  }
  // #endregion
}

// #region Imports

import { Inject, inject, Injector, Injectable, type Signal } from '@angular/core';
import type { ApplicationSettingsDto, ResponsePayload } from '@symphony/ipc-contracts-composition';
import { CI_OPERATIONS, AI_OPERATIONS } from '@symphony/frontend-core';
import { TEAM_CONFIGURATION } from '@symphony/frontend-core/team';
import type { SkillFlowRole } from '@symphony/domain-skills';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { ApplicationProjection } from '@symphony/frontend-core/projection';
import { OrchestrationSynchronizer } from '@symphony/frontend-core/synchronization';

// #endregion

/**
 * Owns Workspace configuration transactions and optional feature reconciliation on the existing data owners.
 *
 * @public
 */
@Injectable()
export class WorkspaceContext {
  // #region Fields

  private readonly _projection: ApplicationProjection;
  private readonly _injector = inject(Injector);
  private readonly _configuration: ConfigurationStore;
  private readonly _synchronizer: OrchestrationSynchronizer;
  private readonly _settings: Signal<ApplicationSettingsDto | undefined>;
  private readonly _configurationBusy: Signal<boolean>;
  private readonly _storageStatus: Signal<ResponsePayload<'storage.status.get'> | undefined>;
  private readonly _editorBusy: Signal<boolean>;

  // #endregion

  // #region Ctor

  /**
   * Connects the existing aggregate state and operations.
   *
   * @public
   */
  public constructor(
    @Inject(ApplicationProjection)
    projection: ApplicationProjection = inject(ApplicationProjection),
    @Inject(ConfigurationStore) configuration: ConfigurationStore = inject(ConfigurationStore),
    @Inject(OrchestrationSynchronizer)
    synchronizer: OrchestrationSynchronizer = inject(OrchestrationSynchronizer),
  ) {
    this._projection = projection;
    this._configuration = configuration;
    this._synchronizer = synchronizer;
    this._settings = configuration.settings;
    this._configurationBusy = configuration.configurationBusy;
    this._storageStatus = configuration.storageStatus;
    this._editorBusy = configuration.editorBusy;
  }

  // #endregion

  // #region Properties

  /**
   * Current validated aggregate configuration.
   *
   * @public
   * @readonly
   */
  public get settings(): Signal<ApplicationSettingsDto | undefined> {
    return this._settings;
  }
  /**
   * Enabled board scopes from the current authoritative configuration.
   *
   * @public
   * @readonly
   */
  public get availableBoards(): Signal<ApplicationSettingsDto['workItemSources']> {
    return this._projection.availableBoards;
  }

  /**
   * Shared configuration writer state.
   *
   * @public
   * @readonly
   */
  public get configurationBusy(): Signal<boolean> {
    return this._configurationBusy;
  }
  /**
   * Existing Settings editor operation exclusion.
   *
   * @public
   * @readonly
   */
  public get editorBusy(): Signal<boolean> {
    return this._editorBusy;
  }
  /**
   * Shared storage measurement without a copied writable projection.
   *
   * @public
   * @readonly
   */
  public get storageStatus(): Signal<ResponsePayload<'storage.status.get'> | undefined> {
    return this._storageStatus;
  }

  // #endregion

  // #region Methods

  /**
   * Saves through the existing whole-settings validation and persistence owner.
   *
   * @public
   */
  public saveSettings(
    settings: ApplicationSettingsDto,
    successMessage?: string | false,
  ): Promise<boolean> {
    return this._configuration.saveSettings(settings, successMessage);
  }
  /**
   * Applies settings already validated by a workspace transaction.
   *
   * @public
   */
  public applySettings(settings: ApplicationSettingsDto): void {
    this._configuration.applySettings(settings);
  }
  /**
   * Applies storage returned after management operations.
   *
   * @public
   */
  public updateStorageStatus(status: ResponsePayload<'storage.status.get'>): void {
    this._configuration.updateStorageStatus(status);
  }
  /**
   * Invalidates the provider-account cache after replacing workspace configuration.
   *
   * @public
   */
  public clearProviderConfiguration(): void {
    this._injector.get(AI_OPERATIONS, null)?.clearCodexConfiguration();
  }
  /**
   * Refreshes configuration using the existing owner.
   *
   * @public
   */
  public refreshConfiguration(): Promise<void> {
    return this._configuration.refreshConfiguration();
  }
  /**
   * Retains scoped CI usage refresh after a workspace switch.
   *
   * @public
   */
  public refreshContinuousIntegrationUsage(
    repositoryBindingIds?: readonly string[],
    silent = false,
  ): Promise<boolean> {
    return (
      this._injector
        .get(CI_OPERATIONS, null)
        ?.refreshContinuousIntegrationUsage(repositoryBindingIds, silent) ?? Promise.resolve(true)
    );
  }
  /**
   * Reconciles the current snapshot.
   *
   * @public
   */
  public refresh(): Promise<void> {
    return this._synchronizer.refresh();
  }
  /**
   * Loads cached target data with the synchronizer's existing active-workspace guard.
   *
   * @public
   */
  public loadCachedSnapshotForWorkspace(workspaceId: string): Promise<void> {
    return this._synchronizer.loadCachedSnapshotForWorkspace(workspaceId);
  }

  /** Applies optional Team reconciliation within the same validated settings transaction. @public */
  public synchronizeDeliveryContext(
    settings: ApplicationSettingsDto,
    workspaceId: string,
    preferredProfileId?: string,
    preferredRoles?: readonly SkillFlowRole[],
    preferredSkillIds?: Partial<Record<SkillFlowRole, string>>,
  ): ApplicationSettingsDto {
    return (
      this._injector
        .get(TEAM_CONFIGURATION, null)
        ?.synchronizeDeliveryContext(
          settings,
          workspaceId,
          preferredProfileId,
          preferredRoles,
          preferredSkillIds,
        ) ?? settings
    );
  }

  /** Refreshes the single shared measured-storage projection. @public */
  public refreshStorageStatus(silent = false): Promise<void> {
    return this._configuration.refreshStorageStatus(silent);
  }

  // #endregion
}

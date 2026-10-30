// #region Imports

import { computed, inject, Injectable, Injector } from '@angular/core';
import type { ApplicationSettingsDto, ResponsePayload } from '@symphony/ipc-contracts-composition';
import { REPOSITORY_RUNTIME_OPERATIONS } from './RepositoryRuntimeOperationsToken';
import { AUTOMATION_PREPARATION } from './AutomationPreparationToken';
import { FEEDBACK_OPERATIONS } from './FeedbackOperationsToken';
import { AI_OPERATIONS } from './AiOperationsToken';
import { WORK_CONNECTION_OPERATIONS } from './WorkConnectionOperationsToken';
import { SKILLS_OPERATIONS } from './SkillsOperationsToken';
import { OrchestrationOperation } from './OrchestrationOperation';

// #endregion

/** Owns authoritative configuration projections and the single validated settings writer. */
@Injectable({ providedIn: 'root' })
export class ConfigurationStore extends OrchestrationOperation {
  // #region Fields

  private readonly _injector = inject(Injector);
  /**
   * The authoritative validated settings consumed by feature configuration ports.
   *
   * @public
   * @readonly
   */
  public readonly settings = this._state.settings.asReadonly();
  /** Shared validated provider-account status. @public @readonly */
  public readonly connections = this._state.connections.asReadonly();
  /** Shared measured-storage result. @public @readonly */
  public readonly storageStatus = this._state.storageStatus.asReadonly();
  /** Shared writer and feature-owned account activity, resolved after constructor composition. @public @readonly */
  public readonly configurationBusy = computed(
    () =>
      this._state.configurationBusy() ||
      (this._injector.get(AI_OPERATIONS, null)?.connectionBusy() ?? false) ||
      (this._injector.get(WORK_CONNECTION_OPERATIONS, null)?.connectionBusy() ?? false),
  );
  /** Existing cross-editor operation exclusion without duplicated writable flags. @public @readonly */
  public readonly editorBusy = computed(
    () =>
      this.configurationBusy() ||
      (this._injector.get(SKILLS_OPERATIONS, null)?.skillsBusy() ?? false) ||
      (this._injector.get(FEEDBACK_OPERATIONS, null)?.feedbackIntakeTestBusy() ?? false),
  );

  // #endregion

  // #region Ctor

  /**
   * Constructs the configuration store.
   *
   * @public
   */
  public constructor() {
    super();
  }

  // #endregion

  // #region Methods
  /** Applies an account status returned by the canonical validated desktop boundary. @public */
  public applyProviderConnections(connections: ResponsePayload<'connections.get'>): void {
    this._state.connections.set(connections);
  }

  /** Applies complete settings already validated by the canonical desktop response. @public */
  public applySettings(settings: ApplicationSettingsDto): void {
    this._state.settings.set(settings);
  }
  /** Applies a measured-storage response from the existing validated desktop boundary. @public */
  public updateStorageStatus(status: ResponsePayload<'storage.status.get'>): void {
    this._state.storageStatus.set(status);
  }

  /**
   * Refreshes the configuration.
   *
   * @public
   */
  public async refreshConfiguration(): Promise<void> {
    try {
      await this.refreshSettings();
      const repositoriesOwner = this._injector.get(REPOSITORY_RUNTIME_OPERATIONS, null);
      const [, repositories] = await Promise.all([
        this.refreshProviderConnections(),
        repositoriesOwner
          ? this._client.request('repositories.runtime.list', {})
          : Promise.resolve(undefined),
      ]);
      if (repositories) repositoriesOwner?.applyRepositoryRuntimeStatuses(repositories);
      this._injector.get(AUTOMATION_PREPARATION, null)?.notifyUnpreparedAutomaticExecution();
    } catch (cause) {
      this.showError(cause, 'Unable to load application configuration.');
    }
  }

  /**
   * Refreshes the provider connections.
   *
   * @public
   */
  public async refreshProviderConnections(): Promise<void> {
    try {
      this._state.connections.set(await this._client.request('connections.get', {}));
    } catch (cause) {
      this.showError(cause, 'Unable to load provider connections.');
    }
  }

  /**
   * Refreshes the settings.
   *
   * @public
   */
  public async refreshSettings(): Promise<void> {
    this._state.settings.set(await this._client.request('settings.get', {}));
  }

  /**
   * Refreshes the storage status.
   *
   * @param silent - Silent.
   * @public
   */
  public async refreshStorageStatus(silent = false): Promise<void> {
    try {
      this._state.storageStatus.set(await this._client.request('storage.status.get', {}));
    } catch (cause) {
      if (!silent) this.showError(cause, 'Unable to measure managed storage.');
    }
  }

  /**
   * Saves the settings.
   *
   * @param settings - Settings.
   * @param successMessage - Success message.
   * @public
   */
  public async saveSettings(
    settings: ApplicationSettingsDto,
    successMessage: string | false = 'Settings saved.',
  ): Promise<boolean> {
    this._state.configurationBusy.set(true);
    try {
      const saved = await this._client.request('settings.save', { settings });
      this._state.settings.set(saved);
      await Promise.all([
        this._injector.get(REPOSITORY_RUNTIME_OPERATIONS, null)?.refreshRepositoryRuntime(),
        this.refreshStorageStatus(true),
      ]);
      this._injector.get(AUTOMATION_PREPARATION, null)?.notifyUnpreparedAutomaticExecution();
      if (successMessage) this._notifications.showSuccess(successMessage);
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to save settings.');
      return false;
    } finally {
      this._state.configurationBusy.set(false);
    }
  }

  // #endregion
}

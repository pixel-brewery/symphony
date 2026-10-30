// #region Imports

import { computed, Inject, inject, Injectable, Injector, type Signal } from '@angular/core';
import type {
  ApplicationSettingsDto,
  RequestPayload,
  ResponsePayload,
} from '@symphony/ipc-contracts-composition';
import { PLATFORM_OPERATIONS } from '@symphony/frontend-core/platform';
import { TEAM_CONFIGURATION } from '@symphony/frontend-core/team';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { ApplicationProjection } from '@symphony/frontend-core/projection';

// #endregion

/**
 * Composes AI account settings with the single configuration writer and optional native and Team capabilities.
 *
 * @public
 */
@Injectable()
export class AiContext {
  // #region Fields

  private readonly _injector = inject(Injector);
  private readonly _projection: ApplicationProjection;
  private readonly _configuration: ConfigurationStore;
  private readonly _settings: Signal<ApplicationSettingsDto | undefined>;
  private readonly _connections: Signal<ResponsePayload<'connections.get'> | undefined>;
  private readonly _runtimeDependencyInstallBusy: Signal<
    RequestPayload<'runtime-dependencies.install'>['command'] | undefined
  >;

  // #endregion

  // #region Ctor

  /**
   * Connects to the one aggregate configuration writer and existing shared projections.
   *
   * @public
   */
  public constructor(
    @Inject(ApplicationProjection)
    projection: ApplicationProjection = inject(ApplicationProjection),
    @Inject(ConfigurationStore) configuration: ConfigurationStore = inject(ConfigurationStore),
  ) {
    this._projection = projection;
    this._configuration = configuration;
    this._settings = configuration.settings;
    this._connections = configuration.connections;
    this._runtimeDependencyInstallBusy = computed(() =>
      this._injector.get(PLATFORM_OPERATIONS, null)?.runtimeDependencyInstallBusy(),
    );
  }

  // #endregion

  // #region Properties

  /** Actual optional native installation capability, independent of cached tool health. @public @readonly */
  public get nativeInstallAvailable(): boolean {
    return this._injector.get(PLATFORM_OPERATIONS, null) !== null;
  }

  /**
   * Current authoritative settings.
   *
   * @public
   * @readonly
   */
  public get settings(): Signal<ApplicationSettingsDto | undefined> {
    return this._settings;
  }
  /**
   * Existing configuration and composed feature activity.
   *
   * @public
   * @readonly
   */
  public get configurationBusy(): Signal<boolean> {
    return this._configuration.configurationBusy;
  }
  /**
   * Shared editor exclusion.
   *
   * @public
   * @readonly
   */
  public get editorBusy(): Signal<boolean> {
    return this._configuration.editorBusy;
  }
  /**
   * Provider-account status from its single shared owner.
   *
   * @public
   * @readonly
   */
  public get connections(): Signal<ResponsePayload<'connections.get'> | undefined> {
    return this._connections;
  }
  /**
   * Existing runtime availability projection.
   *
   * @public
   * @readonly
   */
  public get runtimeHealth(): Signal<ResponsePayload<'health.get'> | undefined> {
    return (
      this._injector.get(PLATFORM_OPERATIONS, null)?.runtimeHealth ?? this._projection.runtimeHealth
    );
  }
  /**
   * Existing runtime installer activity.
   *
   * @public
   * @readonly
   */
  public get runtimeDependencyInstallBusy(): Signal<
    RequestPayload<'runtime-dependencies.install'>['command'] | undefined
  > {
    return this._runtimeDependencyInstallBusy;
  }

  // #endregion

  // #region Methods

  /**
   * Saves through the existing validated whole-settings writer.
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
   * Hydrates the existing shared configuration.
   *
   * @public
   */
  public refreshConfiguration(): Promise<void> {
    return this._configuration.refreshConfiguration();
  }
  /**
   * Reconciles the existing shared provider-account statuses.
   *
   * @public
   */
  public refreshProviderConnections(): Promise<void> {
    return this._configuration.refreshProviderConnections();
  }
  /**
   * Delegates to the actual runtime installation owner.
   *
   * @public
   */
  public installRuntimeDependency(
    command: RequestPayload<'runtime-dependencies.install'>['command'],
  ): Promise<boolean> {
    return (
      this._injector.get(PLATFORM_OPERATIONS, null)?.installRuntimeDependency(command) ??
      Promise.resolve(false)
    );
  }

  /** Applies the optional Team owner's existing reconciliation within the same settings transaction. @public */
  public synchronizeDeliveryContext(
    settings: ApplicationSettingsDto,
    workspaceId: string,
  ): ApplicationSettingsDto {
    return (
      this._injector
        .get(TEAM_CONFIGURATION, null)
        ?.synchronizeDeliveryContext(settings, workspaceId) ?? settings
    );
  }

  // #endregion
}

// #region Imports

import { Inject, inject, Injectable } from '@angular/core';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import type { RuntimeHealthDto } from '@symphony/ipc-contracts-platform';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { ApplicationSnapshot } from '@symphony/frontend-core/snapshot';
import { ApplicationProjection } from '@symphony/frontend-core/projection';

// #endregion

/**
 * Owns Platform health updates and native appearance projections over the existing data owners.
 *
 * @public
 */
@Injectable()
export class PlatformContext {
  // #region Ctor

  /**
   * Connects the single transport projection and validated configuration writer.
   *
   * @public
   */
  public constructor(
    @Inject(ApplicationSnapshot)
    private readonly _snapshot: ApplicationSnapshot = inject(ApplicationSnapshot),
    @Inject(ApplicationProjection)
    private readonly _projection: ApplicationProjection = inject(ApplicationProjection),
    @Inject(ConfigurationStore)
    private readonly _configuration: ConfigurationStore = inject(ConfigurationStore),
  ) {}

  // #endregion

  // #region Properties

  /**
   * Authoritative settings used by native appearance synchronization.
   *
   * @public
   * @readonly
   */
  public get settings() {
    return this._configuration.settings;
  }

  /**
   * The existing snapshot's health projection, without a second writable value.
   *
   * @public
   * @readonly
   */
  public get runtimeHealth() {
    return this._projection.runtimeHealth;
  }

  // #endregion

  // #region Methods

  /**
   * Applies inspected health using the existing snapshot update rule.
   *
   * @public
   */
  public updateRuntimeHealth(health: RuntimeHealthDto): void {
    this._snapshot.update((snapshot) => (snapshot ? { ...snapshot, health } : snapshot));
  }

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
   * Hydrates configuration through its existing owner.
   *
   * @public
   */
  public refreshConfiguration(): Promise<void> {
    return this._configuration.refreshConfiguration();
  }

  // #endregion
}

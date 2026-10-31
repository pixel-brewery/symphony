// #region Imports
import { Inject, inject, Injectable, Optional } from '@angular/core';
import { ConfigurationStore } from './ConfigurationStore';
import { OrchestrationSynchronizer } from './OrchestrationSynchronizer';
import type { IApplicationBootstrapExecution } from './IApplicationBootstrapExecution';
import { APPLICATION_BOOTSTRAP_EXECUTION } from './ApplicationBootstrapExecutionToken';
import type { IApplicationBootstrapSkills } from './IApplicationBootstrapSkills';
import { APPLICATION_BOOTSTRAP_SKILLS } from './ApplicationBootstrapSkillsToken';
import type { IApplicationBootstrapCi } from './IApplicationBootstrapCi';
import { APPLICATION_BOOTSTRAP_CI } from './ApplicationBootstrapCiToken';
import type { IApplicationBootstrapPlatform } from './IApplicationBootstrapPlatform';
import { APPLICATION_BOOTSTRAP_PLATFORM } from './ApplicationBootstrapPlatformToken';
// #endregion

/**
 * Starts the selected application participants while allowing the shell to finish before remote data.
 *
 * @public
 */
@Injectable({ providedIn: 'root' })
export class ApplicationBootstrap {
  // #region Fields
  private readonly _configuration: Pick<
    ConfigurationStore,
    'refreshConfiguration' | 'refreshStorageStatus'
  >;
  private readonly _synchronizer: Pick<OrchestrationSynchronizer, 'refresh'>;
  private readonly _execution: IApplicationBootstrapExecution | null;
  private readonly _skills: IApplicationBootstrapSkills | null;
  private readonly _ci: IApplicationBootstrapCi | null;
  private readonly _platform: IApplicationBootstrapPlatform | null;
  private _initializeInFlight?: Promise<void>;
  // #endregion

  // #region Ctor
  /**
   * Adopts the kernel hydration commands and the optional feature-owned startup participants.
   *
   * @public
   */
  public constructor(
    @Inject(ConfigurationStore)
    configuration: Pick<
      ConfigurationStore,
      'refreshConfiguration' | 'refreshStorageStatus'
    > = inject(ConfigurationStore),
    @Inject(OrchestrationSynchronizer)
    synchronizer: Pick<OrchestrationSynchronizer, 'refresh'> = inject(OrchestrationSynchronizer),
    @Optional()
    @Inject(APPLICATION_BOOTSTRAP_EXECUTION)
    execution: IApplicationBootstrapExecution | null = inject(APPLICATION_BOOTSTRAP_EXECUTION, {
      optional: true,
    }),
    @Optional()
    @Inject(APPLICATION_BOOTSTRAP_SKILLS)
    skills: IApplicationBootstrapSkills | null = inject(APPLICATION_BOOTSTRAP_SKILLS, {
      optional: true,
    }),
    @Optional()
    @Inject(APPLICATION_BOOTSTRAP_CI)
    ci: IApplicationBootstrapCi | null = inject(APPLICATION_BOOTSTRAP_CI, { optional: true }),
    @Optional()
    @Inject(APPLICATION_BOOTSTRAP_PLATFORM)
    platform: IApplicationBootstrapPlatform | null = inject(APPLICATION_BOOTSTRAP_PLATFORM, {
      optional: true,
    }),
  ) {
    this._configuration = configuration;
    this._synchronizer = synchronizer;
    this._execution = execution;
    this._skills = skills;
    this._ci = ci;
    this._platform = platform;
  }
  // #endregion

  // #region Methods
  /**
   * Returns the same startup promise to every shell consumer.
   *
   * @public
   */
  public initialize(): Promise<void> {
    this._initializeInFlight ??= this.initializeOnce();
    return this._initializeInFlight;
  }

  private async initializeOnce(): Promise<void> {
    this._execution?.initialize();
    this._platform?.initializeIncidents();
    const snapshotRefresh = this._synchronizer.refresh(false);
    await Promise.all([
      this._configuration.refreshConfiguration(),
      this._skills?.refreshSkills(),
      this._configuration.refreshStorageStatus(true),
    ]);
    void snapshotRefresh.then(() => {
      void this._ci?.refreshContinuousIntegrationUsage(undefined, true);
      void this._ci?.refreshContinuousIntegrationRuns();
    });
  }
  // #endregion
}

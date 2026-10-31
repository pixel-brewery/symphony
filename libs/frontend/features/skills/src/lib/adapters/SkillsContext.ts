// #region Imports

import { computed, Inject, inject, Injectable, type Signal } from '@angular/core';
import type { IAgentTeam } from '@symphony/domain-team';
import type { ISkillManifest } from '@symphony/domain-skills';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { ApplicationSnapshot } from '@symphony/frontend-core/snapshot';
import type { ISkillsContext } from '../ports/ISkillsContext';

// #endregion

/**
 * Owns Skills active-team and manifest projections over the existing configuration and snapshot owners.
 *
 * @public
 */
@Injectable()
export class SkillsContext implements ISkillsContext {
  // #region Fields

  private readonly _activeTeam: Signal<IAgentTeam | undefined>;
  private readonly _skillManifests: Signal<readonly ISkillManifest[]>;
  private readonly _configurationBusy: Signal<boolean>;

  // #endregion

  // #region Ctor

  /**
   * Connects the feature projection to its existing configuration and snapshot owners.
   *
   * @public
   */
  public constructor(
    @Inject(ConfigurationStore) configuration: ConfigurationStore = inject(ConfigurationStore),
    @Inject(ApplicationSnapshot) snapshot: ApplicationSnapshot = inject(ApplicationSnapshot),
  ) {
    this._skillManifests = computed(() => snapshot.snapshot()?.skills ?? []);
    this._configurationBusy = configuration.configurationBusy;
    this._activeTeam = computed(() => {
      const settings = configuration.settings();
      const workspaceId = settings?.activeViewScope.workspaceIds[0];
      if (!settings || !workspaceId) return undefined;
      const context = settings.deliveryContexts.find(
        (candidate) => candidate.enabled && candidate.workspaceId === workspaceId,
      );
      return settings.agentTeams.find(
        (team) => team.id === context?.agentTeamId || team.workspaceId === workspaceId,
      );
    });
  }

  // #endregion

  // #region Properties

  /**
   * The existing active-team resolution.
   *
   * @public
   * @readonly
   */
  public get activeTeam(): Signal<IAgentTeam | undefined> {
    return this._activeTeam;
  }

  /**
   * The manifests in the current snapshot.
   *
   * @public
   * @readonly
   */
  public get skillManifests(): Signal<readonly ISkillManifest[]> {
    return this._skillManifests;
  }

  /**
   * The aggregate configuration owner's activity.
   *
   * @public
   * @readonly
   */
  public get configurationBusy(): Signal<boolean> {
    return this._configurationBusy;
  }

  // #endregion
}

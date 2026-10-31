// #region Imports

import { computed, Inject, inject, Injectable, type Signal } from '@angular/core';
import type { ISkillManifest } from '@symphony/domain-skills';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { ApplicationSnapshot } from '@symphony/frontend-core/snapshot';
import type { ISkillsContext } from '../ports/ISkillsContext';
import type { ISkillsWorkspaceTeam } from '../ports/ISkillsWorkspaceTeam';

// #endregion

/**
 * Owns Skills workspace-team and manifest projections over the existing configuration and snapshot owners.
 *
 * @public
 */
@Injectable()
export class SkillsContext implements ISkillsContext {
  // #region Fields

  private readonly _workspaceTeams: Signal<readonly ISkillsWorkspaceTeam[]>;
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
    // The orchestrator resolves a workspace's skills from the team of its enabled delivery
    // context, otherwise from the workspace's own team; Skills writes to exactly those teams.
    this._workspaceTeams = computed(() => {
      const settings = configuration.settings();
      if (!settings) return [];
      const seen = new Set<string>();
      return settings.workspaces
        .filter((workspace) => workspace.enabled)
        .flatMap((workspace): ISkillsWorkspaceTeam[] => {
          const context = settings.deliveryContexts.find(
            (candidate) => candidate.enabled && candidate.workspaceId === workspace.id,
          );
          const team = context
            ? settings.agentTeams.find((candidate) => candidate.id === context.agentTeamId)
            : settings.agentTeams.find((candidate) => candidate.workspaceId === workspace.id);
          if (!team || seen.has(team.id)) return [];
          seen.add(team.id);
          return [{ workspaceId: workspace.id, workspaceName: workspace.displayName, team }];
        });
    });
  }

  // #endregion

  // #region Properties

  /**
   * The AI team of every enabled workspace, each team once.
   *
   * @public
   * @readonly
   */
  public get workspaceTeams(): Signal<readonly ISkillsWorkspaceTeam[]> {
    return this._workspaceTeams;
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

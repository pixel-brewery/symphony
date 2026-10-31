// #region Imports

import { Inject, inject, Injectable } from '@angular/core';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import type { BuiltinSkillDto } from '@symphony/ipc-contracts-skills';
import type { ISkillsAssignments } from '../ports/ISkillsAssignments';
import type { ISkillsClient } from '../ports/ISkillsClient';
import type { ISkillsTeamAssignments } from '../ports/ISkillsTeamAssignments';
import { SKILLS_CLIENT } from '../ports/SkillsClientToken';

// #endregion

/**
 * Keeps Skills mutations on the existing validated aggregate configuration path.
 *
 * @public
 */
@Injectable()
export class SkillsAssignments implements ISkillsAssignments {
  // #region Fields

  private readonly _configuration: ConfigurationStore;
  private readonly _client: ISkillsClient;

  // #endregion

  // #region Ctor

  /**
   * Binds the existing aggregate owner and the bounded Skills client.
   *
   * @public
   */
  public constructor(
    @Inject(ConfigurationStore)
    configuration: ConfigurationStore = inject(ConfigurationStore),
    @Inject(SKILLS_CLIENT) client: ISkillsClient = inject(SKILLS_CLIENT),
  ) {
    this._configuration = configuration;
    this._client = client;
  }

  // #endregion

  // #region Methods

  /**
   * Persists the assignments of one or more teams in one settings write while preserving all other
   * configuration sections.
   *
   * @param changes - Each changed team with its complete updated role assignments.
   * @returns Whether aggregate validation and persistence succeeded; `false` without a write when
   * nothing changes or a team is unknown.
   * @public
   */
  public saveAssignments(changes: readonly ISkillsTeamAssignments[]): Promise<boolean> {
    const current = this._configuration.settings();
    if (
      !current ||
      !changes.length ||
      !changes.every((change) => current.agentTeams.some((team) => team.id === change.teamId))
    )
      return Promise.resolve(false);
    const byTeam = new Map(changes.map((change) => [change.teamId, change.assignments]));
    return this._configuration.saveSettings(
      {
        ...current,
        agentTeams: current.agentTeams.map((team) => {
          const assignments = byTeam.get(team.id);
          return assignments
            ? {
                ...team,
                assignments: assignments.map((assignment) => ({
                  ...assignment,
                  fallbackAgentIds: [...assignment.fallbackAgentIds],
                })),
              }
            : team;
        }),
      },
      false,
    );
  }

  /**
   * Applies the unchanged complete settings response from built-in customization.
   *
   * @param role - Built-in process role to customize.
   * @param additionalInstructions - Installation-owned additional instructions.
   * @public
   */
  public async customizeBuiltinSkill(
    role: BuiltinSkillDto['role'],
    additionalInstructions: string,
  ): Promise<void> {
    this._configuration.applySettings(
      await this._client.request('skills.builtin.customize', { role, additionalInstructions }),
    );
  }

  // #endregion
}

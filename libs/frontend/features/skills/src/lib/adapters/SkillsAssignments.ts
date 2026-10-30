// #region Imports

import { Inject, inject, Injectable } from '@angular/core';
import type { IAgentPhaseAssignment } from '@symphony/domain-team';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import type { BuiltinSkillDto } from '@symphony/ipc-contracts-skills';
import type { ISkillsAssignments } from '../ports/ISkillsAssignments';
import type { ISkillsClient } from '../ports/ISkillsClient';
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
   * Persists one team's assignments while preserving all other configuration sections.
   *
   * @param teamId - Team selected by the feature context.
   * @param assignments - Updated role assignments.
   * @returns Whether aggregate validation and persistence succeeded.
   * @public
   */
  public saveAssignments(
    teamId: string,
    assignments: readonly IAgentPhaseAssignment[],
  ): Promise<boolean> {
    const current = this._configuration.settings();
    if (!current || !current.agentTeams.some((team) => team.id === teamId))
      return Promise.resolve(false);
    return this._configuration.saveSettings(
      {
        ...current,
        agentTeams: current.agentTeams.map((team) =>
          team.id === teamId
            ? {
                ...team,
                assignments: assignments.map((assignment) => ({
                  ...assignment,
                  fallbackAgentIds: [...assignment.fallbackAgentIds],
                })),
              }
            : team,
        ),
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

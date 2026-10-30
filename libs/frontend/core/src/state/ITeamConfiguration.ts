// #region Imports

import type { SkillFlowRole } from '@symphony/domain-skills';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';

// #endregion

/** Consumes Team's pure configuration reconciliation without importing the feature implementation. @public */
export interface ITeamConfiguration {
  /** Returns a complete configuration preserving the existing assignment and workspace scope rules. @public */
  synchronizeDeliveryContext(
    settings: ApplicationSettingsDto,
    workspaceId: string,
    preferredProfileId?: string,
    preferredRoles?: readonly SkillFlowRole[],
    preferredSkillIds?: Partial<Record<SkillFlowRole, string>>,
  ): ApplicationSettingsDto;
}

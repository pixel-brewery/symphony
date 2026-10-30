// #region Imports

import type { IPlatformClock } from '@symphony/application-core';
import type { ISkillCustomizationSetting, SkillTextDigest } from '@symphony/domain-skills';
import type { ISkillPackagePort } from './ISkillPackagePort';
import type { ISkillRoleAssignment } from './ISkillRoleAssignment';

// #endregion

/**
 * Only the package, assignment and customization facts consumed by Skills.
 *
 * @public
 */
export interface ISkillCatalogDependencies {
  readonly packages: ISkillPackagePort;
  readonly repositorySkillRoot: (workspaceId?: string) => string | undefined;
  readonly assignmentsFor: (workspaceId?: string) => readonly ISkillRoleAssignment[];
  readonly customizations: () => readonly ISkillCustomizationSetting[];
  readonly saveCustomizations: (settings: ISkillCustomizationSetting[]) => void;
  readonly clock: IPlatformClock;
  readonly digest: SkillTextDigest;
}

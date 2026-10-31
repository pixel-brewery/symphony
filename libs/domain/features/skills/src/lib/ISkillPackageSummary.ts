// #region Imports

import type { SkillPackageSource } from './SkillPackageSource';

// #endregion

export interface ISkillPackageSummary {
  id: string;
  name: string;
  displayName: string;
  description: string;
  source: SkillPackageSource;
  location: string;
  editable: boolean;
  implicitInvocation: boolean;
  updatedAt: string;
  digest: string;
  resourceCount: number;
  warnings: readonly string[];
}

// #region Imports

import type { ISkillManifest, ISkillPackageDocument } from '@symphony/domain-skills';

// #endregion

/**
 * Resolves only the workspace-owned Skills needed by Work Item metadata and drafting.
 *
 * @public
 */
export interface IWorkItemSkillCatalog {
  /**
   * Lists the manifests available in the addressed workspace.
   *
   * @public
   */
  skills(workspaceId?: string): readonly ISkillManifest[];

  /**
   * Resolves the selected Work Item Creator package.
   *
   * @public
   */
  issueCreatorSkill(workspaceId?: string): ISkillPackageDocument | undefined;

  /**
   * Resolves the selected analysis package for editor metadata.
   *
   * @public
   */
  analysisSkill(workspaceId?: string): ISkillPackageDocument | undefined;

  /**
   * Resolves the selected implementation package for editor metadata.
   *
   * @public
   */
  solutionSkill(workspaceId?: string): ISkillPackageDocument | undefined;
}

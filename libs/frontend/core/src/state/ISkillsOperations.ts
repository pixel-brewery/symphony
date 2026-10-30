// #region Imports

import type { Signal } from '@angular/core';
import type { ISkillManifest, SkillFlowRole } from '@symphony/domain-skills';
import type {
  BuiltinSkillDto,
  EditableSkillPackageDto,
  SkillPackageCatalogDto,
  SkillPackageDocumentDto,
} from '@symphony/ipc-contracts-skills';

// #endregion

/**
 * Consumes Skills commands and readonly state from its single feature owner.
 *
 * @public
 */
export interface ISkillsOperations {
  /**
   * The feature-owned catalog signal.
   *
   * @public
   * @readonly
   */
  readonly skillCatalog: Signal<SkillPackageCatalogDto | undefined>;
  /**
   * The feature-owned built-in role signal.
   *
   * @public
   * @readonly
   */
  readonly builtinSkills: Signal<readonly BuiltinSkillDto[]>;
  /**
   * The feature-owned editor document signal.
   *
   * @public
   * @readonly
   */
  readonly activeSkill: Signal<SkillPackageDocumentDto | undefined>;
  /**
   * The feature-owned operation state.
   *
   * @public
   * @readonly
   */
  readonly skillsBusy: Signal<boolean>;
  /**
   * Reports whether the active team uses a skill.
   *
   * @public
   */
  isSkillActive(id: string): boolean;
  /**
   * Returns the role currently assigned to a skill.
   *
   * @public
   */
  skillFlowRole(id: string): SkillFlowRole | undefined;
  /**
   * Returns the skill assigned to a role.
   *
   * @public
   */
  skillIdForFlowRole(role: SkillFlowRole): string | undefined;
  /**
   * Returns the active manifest assigned to a role.
   *
   * @public
   */
  skillForFlowRole(role: SkillFlowRole): ISkillManifest | undefined;
  /**
   * Activates a skill for the active team.
   *
   * @public
   */
  activateSkill(id: string, role: SkillFlowRole): Promise<boolean>;
  /**
   * Changes an active skill's assigned role.
   *
   * @public
   */
  assignSkillToFlow(id: string, role: SkillFlowRole): Promise<boolean>;
  /**
   * Removes a skill from the active team's assignments.
   *
   * @public
   */
  deactivateSkill(id: string): Promise<boolean>;
  /**
   * Refreshes the feature-owned catalog and built-in roles.
   *
   * @public
   */
  refreshSkills(): Promise<void>;
  /**
   * Saves installation-specific built-in instructions.
   *
   * @public
   */
  customizeBuiltinSkill(
    role: BuiltinSkillDto['role'],
    additionalInstructions: string,
  ): Promise<void>;
  /**
   * Loads a package for editing.
   *
   * @public
   */
  loadSkill(id: string): Promise<boolean>;
  /**
   * Saves an editable package.
   *
   * @public
   */
  saveSkill(skill: EditableSkillPackageDto): Promise<boolean>;
  /**
   * Imports a package from the selected source.
   *
   * @public
   */
  importSkill(sourcePath: string): Promise<boolean>;
  /**
   * Exports a package to the selected destination.
   *
   * @public
   */
  exportSkill(id: string, destinationRoot: string): Promise<boolean>;
  /**
   * Deletes an editable package.
   *
   * @public
   */
  deleteSkill(name: string): Promise<boolean>;
}

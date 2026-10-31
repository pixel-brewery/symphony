// #region Imports

import type {
  IEditableSkillPackage,
  ISkillPackageCatalog,
  ISkillPackageDocument,
} from '@symphony/domain-skills';

// #endregion

/**
 * Synchronous package operations consumed by Skills and workspace transfer.
 *
 * @public
 */
export interface ISkillPackagePort {
  list(repositoryRoot?: string): ISkillPackageCatalog;
  get(id: string, repositoryRoot?: string): ISkillPackageDocument;
  save(input: IEditableSkillPackage): ISkillPackageDocument;
  validate(input: IEditableSkillPackage): void;
  import(sourcePath: string): ISkillPackageDocument;
  export(id: string, destinationRoot: string): { path: string; message: string };
  delete(name: string): { message: string };
}

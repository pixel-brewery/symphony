// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { SkillPackageCatalogDto } from '@symphony/ipc-contracts-skills';

// #endregion

/**
 * Names where a skill package comes from: the project's repository, the shared skills of this Mac,
 * the legacy skill folder or Symphony itself.
 *
 * @public
 */
@Pipe({ name: 'skillSourceLabel', standalone: true, pure: true })
export class SkillSourceLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms a package source into its label.
   *
   * @param source - The package source.
   * @public
   */
  public transform(source: SkillPackageCatalogDto['packages'][number]['source']): string {
    switch (source) {
      case 'repository':
        return 'Project';
      case 'user':
        return 'Shared';
      case 'legacy':
        return 'Legacy';
      case 'bundled':
        return 'Built-in';
    }
  }

  // #endregion
}

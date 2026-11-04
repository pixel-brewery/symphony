// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { SkillPackageCatalogDto } from '@symphony/ipc-contracts-skills';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/**
 * Names where a skill package comes from: the project's repository, the shared skills of this Mac,
 * the legacy skill folder or Symphony itself.
 *
 * @public
 */
@Pipe({ name: 'skillSourceLabel', standalone: true, pure: false })
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
        return translateLabel('loc.symphony.labels.project.9859597');
      case 'user':
        return translateLabel('loc.symphony.labels.shared.e3c4b39');
      case 'legacy':
        return translateLabel('loc.symphony.labels.legacy.1432897');
      case 'bundled':
        return translateLabel('loc.symphony.labels.built.in.1f43948');
    }
  }

  // #endregion
}

// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { ISkillFlowOption } from '../view-presenters/skillFlowPresentation/ISkillFlowOption';

// #endregion

/**
 * Lists the optional AI flow steps a package can run as, for example
 * `Diagnose CI with AI · Repair CI with AI`.
 *
 * @public
 */
@Pipe({ name: 'skillFlowOptionLabels', standalone: true, pure: true })
export class SkillFlowOptionLabelsPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms flow options into one list of their labels.
   *
   * @param options - The flow options.
   * @public
   */
  public transform(options: readonly ISkillFlowOption[]): string {
    return options.map((option) => option.label).join(' · ');
  }

  // #endregion
}

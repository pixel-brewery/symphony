// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { SkillFlowRoleLabelPipe } from '@symphony/frontend-ui';

// #endregion

/**
 * Lists responsibilities by their labels, separated by commas.
 *
 * @public
 */
@Pipe({ name: 'skillFlowRoleLabels', standalone: true, pure: true })
export class SkillFlowRoleLabelsPipe implements PipeTransform {
  // #region Fields

  private readonly _label = new SkillFlowRoleLabelPipe();

  // #endregion

  // #region Methods

  /**
   * Transforms the roles into one comma-separated list of labels.
   *
   * @param roles - Skill flow roles.
   * @public
   */
  public transform(roles: readonly string[]): string {
    return roles.map((role) => this._label.transform(role)).join(', ');
  }

  // #endregion
}

// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { skillFlowRoleLabel } from './skillFlowRoleLabel';

// #endregion

@Pipe({ name: 'skillFlowRoleLabel', standalone: true, pure: true })
export class SkillFlowRoleLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param role - Role.
   * @public
   */
  public transform(role: string): string {
    return skillFlowRoleLabel(role);
  }

  // #endregion
}

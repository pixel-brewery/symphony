// #region Imports
import type { Signal } from '@angular/core';
// #endregion
/** Consumes the existing aggregate exclusion between Settings editor operations. @public */
export interface ISkillsSettingsContext {
  readonly editorBusy: Signal<boolean>;
}

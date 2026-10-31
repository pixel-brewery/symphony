// #region Imports

import { InjectionToken } from '@angular/core';
import type { ISettingsEditorDefinition } from './ISettingsEditorDefinition';

// #endregion

/**
 * Collects included feature editors for the generic Settings coordinator.
 *
 * @public
 */
export const SETTINGS_EDITORS = new InjectionToken<readonly ISettingsEditorDefinition[]>(
  'SETTINGS_EDITORS',
);

// #region Imports

import { InjectionToken } from '@angular/core';
import type { IWidgetDefinition } from '../models/IWidgetDefinition';

// #endregion

/** Static feature configuration supplied to the native Mosaik view registry. @public */
export const WIDGET_DEFINITIONS = new InjectionToken<readonly IWidgetDefinition[]>(
  'WIDGET_DEFINITIONS',
);

// #region Imports

import { automationActions } from './AutomationActions';

// #endregion

export type AutomationAction = (typeof automationActions)[number];

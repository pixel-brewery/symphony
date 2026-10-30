// #region Imports

import { automationReceiptStates } from './AutomationReceiptStates';

// #endregion

export type AutomationReceiptState = (typeof automationReceiptStates)[number];

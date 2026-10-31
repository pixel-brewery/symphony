// #region Imports

import type { AutomationAction } from './AutomationAction';
import type { AutomationReceiptState } from './AutomationReceiptState';

// #endregion

export interface IAutomationReceipt {
  signalId: string;
  sourceId: string;
  workspaceId: string;
  workItemId: string;
  action: AutomationAction;
  state: AutomationReceiptState;
  observedAt: string;
  updatedAt: string;
  executionId?: string;
  message?: string;
}

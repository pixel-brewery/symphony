// #region Imports

import type { AutomationAction } from './AutomationAction';
import type { IWorkItem } from '@symphony/domain-work';

// #endregion

export interface IAutomationSignal {
  id: string;
  sourceId: string;
  workspaceId: string;
  workItem: IWorkItem;
  origin: 'work-item-change' | 'comment';
  action: AutomationAction;
  occurredAt: string;
  actorLogin?: string;
  request?: string;
  externalCommentId?: string;
}

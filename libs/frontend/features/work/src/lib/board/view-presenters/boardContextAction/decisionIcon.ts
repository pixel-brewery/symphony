// #region Imports

import { type IWorkItemAction } from '@symphony/domain-work';
import type { BoardContextActionIcon } from './BoardContextActionIcon';

// #endregion

export function decisionIcon(effect: IWorkItemAction['effect']): BoardContextActionIcon {
  switch (effect) {
    case 'advance':
      return 'checkmark';
    case 'route':
      return 'sync';
    case 'close':
      return 'clear';
    case 'split':
      return 'add';
    default:
      return 'info';
  }
}

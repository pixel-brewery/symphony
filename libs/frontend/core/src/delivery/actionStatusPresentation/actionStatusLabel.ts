// #region Imports

import type { ICiRun } from '@symphony/domain-ci';

// #endregion

export function actionStatusLabel(status: ICiRun['status']): string {
  switch (status) {
    case 'in-progress':
      return 'In progress';
    case 'succeeded':
      return 'Succeeded';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    case 'queued':
      return 'Queued';
  }
}

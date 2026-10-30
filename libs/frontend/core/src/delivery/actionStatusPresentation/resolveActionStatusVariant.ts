// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { ActionStatusVariant } from './ActionStatusVariant';

// #endregion

export function resolveActionStatusVariant(status: ICiRun['status']): ActionStatusVariant {
  if (status === 'succeeded') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'in-progress') return 'info';
  return 'neutral';
}

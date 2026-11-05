// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

export function actionStatusLabel(status: ICiRun['status']): string {
  switch (status) {
    case 'in-progress':
      return translateLabel('loc.symphony.labels.in.progress.c1f88e9');
    case 'succeeded':
      return translateLabel('loc.symphony.labels.succeeded.6d9a6f9');
    case 'failed':
      return translateLabel('loc.symphony.labels.failed.031a8f0');
    case 'cancelled':
      return translateLabel('loc.symphony.labels.cancelled.d353a99');
    case 'queued':
      return translateLabel('loc.symphony.labels.queued.661ff40');
  }
}

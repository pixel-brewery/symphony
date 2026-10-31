// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { ActionsRunSort } from './ActionsRunSort';

// #endregion

export type ActionsListCommand =
  | { readonly kind: 'status'; readonly status: ICiRun['status'] | undefined }
  | { readonly kind: 'actor'; readonly actor: string | undefined }
  | { readonly kind: 'sort'; readonly sort: ActionsRunSort };

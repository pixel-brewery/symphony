// #region Imports

import type { PullRequestState } from '@symphony/frontend-core/delivery';
import type { PullRequestBaseFilter } from './PullRequestBaseFilter';
import type { PullRequestSort } from './PullRequestSort';

// #endregion

export type PullRequestListCommand =
  | { readonly kind: 'author'; readonly author: string | undefined }
  | { readonly kind: 'state'; readonly state: PullRequestState | undefined }
  | { readonly kind: 'base'; readonly base: PullRequestBaseFilter | undefined }
  | { readonly kind: 'sort'; readonly sort: PullRequestSort };

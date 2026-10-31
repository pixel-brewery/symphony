// #region Imports

import { PULL_REQUEST_STATES, type PullRequestState } from '@symphony/frontend-core/delivery';
import type { ICollectionListMenuSelection } from '@symphony/frontend-ui';
import { ALL_BASES_OPTION_ID } from './AllBasesOptionId';
import { ALL_STATES_OPTION_ID } from './AllStatesOptionId';
import { AUTHOR_MENU_ID } from './AuthorMenuId';
import { AUTHOR_OPTION_PREFIX } from './AuthorOptionPrefix';
import { BASE_FILTER_LABELS } from './BaseFilterLabels';
import { BASE_MENU_ID } from './BaseMenuId';
import { EVERYONE_OPTION_ID } from './EveryoneOptionId';
import type { PullRequestBaseFilter } from './PullRequestBaseFilter';
import type { PullRequestListCommand } from './PullRequestListCommand';
import type { PullRequestSort } from './PullRequestSort';
import { SORT_LABELS } from './SortLabels';
import { SORT_MENU_ID } from './SortMenuId';
import { STATE_MENU_ID } from './StateMenuId';

// #endregion

/** Maps an activated collection-header menu option back to the presenter command it stands for. */
export function resolvePullRequestListCommand(
  selection: ICollectionListMenuSelection,
): PullRequestListCommand | undefined {
  if (selection.menuId === STATE_MENU_ID) {
    if (selection.optionId === ALL_STATES_OPTION_ID) return { kind: 'state', state: undefined };
    return isPullRequestState(selection.optionId)
      ? { kind: 'state', state: selection.optionId }
      : undefined;
  }
  if (selection.menuId === BASE_MENU_ID) {
    if (selection.optionId === ALL_BASES_OPTION_ID) return { kind: 'base', base: undefined };
    return isPullRequestBaseFilter(selection.optionId)
      ? { kind: 'base', base: selection.optionId }
      : undefined;
  }
  if (selection.menuId === AUTHOR_MENU_ID) {
    return {
      kind: 'author',
      author:
        selection.optionId === EVERYONE_OPTION_ID
          ? undefined
          : selection.optionId.slice(AUTHOR_OPTION_PREFIX.length),
    };
  }
  if (selection.menuId === SORT_MENU_ID && isPullRequestSort(selection.optionId)) {
    return { kind: 'sort', sort: selection.optionId };
  }
  return undefined;
}

function isPullRequestState(value: string): value is PullRequestState {
  return (PULL_REQUEST_STATES as readonly string[]).includes(value);
}

function isPullRequestBaseFilter(value: string): value is PullRequestBaseFilter {
  return value in BASE_FILTER_LABELS;
}

function isPullRequestSort(value: string): value is PullRequestSort {
  return value in SORT_LABELS;
}

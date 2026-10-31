// #region Imports

import {
  PULL_REQUEST_STATES,
  pullRequestStateLabel,
  type PullRequestState,
} from '@symphony/frontend-core/delivery';
import type { ICollectionListMenu } from '@symphony/frontend-ui';
import { ALL_BASES_OPTION_ID } from './AllBasesOptionId';
import { ALL_STATES_OPTION_ID } from './AllStatesOptionId';
import { AUTHOR_MENU_ID } from './AuthorMenuId';
import { AUTHOR_OPTION_PREFIX } from './AuthorOptionPrefix';
import { BASE_FILTER_LABELS } from './BaseFilterLabels';
import { BASE_MENU_ID } from './BaseMenuId';
import { EVERYONE_OPTION_ID } from './EveryoneOptionId';
import type { PullRequestBaseFilter } from './PullRequestBaseFilter';
import type { PullRequestSort } from './PullRequestSort';
import { SORT_LABELS } from './SortLabels';
import { SORT_MENU_ID } from './SortMenuId';
import { STATE_MENU_ID } from './StateMenuId';

// #endregion

/** Builds the State, Base, Author, and Sort menus of the pull-request collection header. */
export function resolvePullRequestListMenus(
  authors: readonly string[],
  selectedAuthor: string | undefined,
  selectedState: PullRequestState | undefined,
  selectedBase: PullRequestBaseFilter | undefined,
  sort: PullRequestSort,
): readonly ICollectionListMenu[] {
  return [
    {
      id: STATE_MENU_ID,
      label: 'State',
      subLabel: selectedState ? pullRequestStateLabel(selectedState) : 'All states',
      testId: 'pull-requests-state-filter',
      options: [
        { id: ALL_STATES_OPTION_ID, label: 'All states', checked: !selectedState },
        ...PULL_REQUEST_STATES.map((state) => ({
          id: state,
          label: pullRequestStateLabel(state),
          checked: state === selectedState,
        })),
      ],
    },
    {
      id: BASE_MENU_ID,
      label: 'Base',
      subLabel: selectedBase ? BASE_FILTER_LABELS[selectedBase] : 'All',
      testId: 'pull-requests-base-filter',
      options: [
        { id: ALL_BASES_OPTION_ID, label: 'All', checked: !selectedBase },
        ...(Object.keys(BASE_FILTER_LABELS) as PullRequestBaseFilter[]).map((base) => ({
          id: base,
          label: BASE_FILTER_LABELS[base],
          checked: base === selectedBase,
        })),
      ],
    },
    {
      id: AUTHOR_MENU_ID,
      label: 'Author',
      subLabel: selectedAuthor ?? 'Everyone',
      testId: 'pull-requests-author-filter',
      options: [
        { id: EVERYONE_OPTION_ID, label: 'Everyone', checked: !selectedAuthor },
        ...authors.map((author) => ({
          id: AUTHOR_OPTION_PREFIX + author,
          label: author,
          checked: author === selectedAuthor,
        })),
      ],
    },
    {
      id: SORT_MENU_ID,
      label: 'Sort',
      testId: 'pull-requests-sort',
      options: (Object.keys(SORT_LABELS) as PullRequestSort[]).map((id) => ({
        id,
        label: SORT_LABELS[id],
        checked: id === sort,
      })),
    },
  ];
}

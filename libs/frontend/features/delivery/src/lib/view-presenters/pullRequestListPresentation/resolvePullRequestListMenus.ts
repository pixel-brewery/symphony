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
import { labelLocale, translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/** Builds the State, Base, Author, and Sort menus of the pull-request collection header. */
export function resolvePullRequestListMenus(
  authors: readonly string[],
  selectedAuthor: string | undefined,
  selectedState: PullRequestState | undefined,
  selectedBase: PullRequestBaseFilter | undefined,
  sort: PullRequestSort,
): readonly ICollectionListMenu[] {
  // Locale remains an input to computed menu owners even when labels are read lazily.
  labelLocale();
  return [
    {
      id: STATE_MENU_ID,
      get label() {
        return translateLabel('loc.symphony.labels.state.a3b50c4');
      },
      get subLabel() {
        return selectedState
          ? pullRequestStateLabel(selectedState)
          : translateLabel('loc.symphony.labels.all.states.f189411');
      },
      testId: 'pull-requests-state-filter',
      options: [
        {
          id: ALL_STATES_OPTION_ID,
          get label() {
            return translateLabel('loc.symphony.labels.all.states.f189411');
          },
          checked: !selectedState,
        },
        ...PULL_REQUEST_STATES.map((state) => ({
          id: state,
          get label() {
            return pullRequestStateLabel(state);
          },
          checked: state === selectedState,
        })),
      ],
    },
    {
      id: BASE_MENU_ID,
      get label() {
        return translateLabel('loc.symphony.labels.base.7b47361');
      },
      get subLabel() {
        return selectedBase
          ? BASE_FILTER_LABELS[selectedBase]
          : translateLabel('loc.symphony.labels.all.a52ace4');
      },
      testId: 'pull-requests-base-filter',
      options: [
        {
          id: ALL_BASES_OPTION_ID,
          get label() {
            return translateLabel('loc.symphony.labels.all.a52ace4');
          },
          checked: !selectedBase,
        },
        ...(Object.keys(BASE_FILTER_LABELS) as PullRequestBaseFilter[]).map((base) => ({
          id: base,
          get label() {
            return BASE_FILTER_LABELS[base];
          },
          checked: base === selectedBase,
        })),
      ],
    },
    {
      id: AUTHOR_MENU_ID,
      get label() {
        return translateLabel('loc.symphony.labels.author.d95082a');
      },
      get subLabel() {
        return selectedAuthor ?? translateLabel('loc.symphony.labels.everyone.da2e5dc');
      },
      testId: 'pull-requests-author-filter',
      options: [
        {
          id: EVERYONE_OPTION_ID,
          get label() {
            return translateLabel('loc.symphony.labels.everyone.da2e5dc');
          },
          checked: !selectedAuthor,
        },
        ...authors.map((author) => ({
          id: AUTHOR_OPTION_PREFIX + author,
          label: author,
          checked: author === selectedAuthor,
        })),
      ],
    },
    {
      id: SORT_MENU_ID,
      get label() {
        return translateLabel('loc.symphony.labels.sort.bec6903');
      },
      testId: 'pull-requests-sort',
      options: (Object.keys(SORT_LABELS) as PullRequestSort[]).map((id) => ({
        id,
        get label() {
          return SORT_LABELS[id];
        },
        checked: id === sort,
      })),
    },
  ];
}

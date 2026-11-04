// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import { actionStatusLabel, RUN_STATUSES } from '@symphony/frontend-core/delivery';
import type { ICollectionListMenu } from '@symphony/frontend-ui';
import { ACTOR_MENU_ID } from './ActorMenuId';
import { ACTOR_OPTION_PREFIX } from './ActorOptionPrefix';
import { ALL_STATUSES_OPTION_ID } from './AllStatusesOptionId';
import type { ActionsRunSort } from './ActionsRunSort';
import { EVERYONE_OPTION_ID } from './EveryoneOptionId';
import { SORT_LABELS } from './SortLabels';
import { SORT_MENU_ID } from './SortMenuId';
import { STATUS_MENU_ID } from './StatusMenuId';
import { labelLocale, translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/** Builds the Status, Actor, and Sort menus of the workflow-run collection header. */
export function resolveActionsListMenus(
  actors: readonly string[],
  selectedActor: string | undefined,
  selectedStatus: ICiRun['status'] | undefined,
  sort: ActionsRunSort,
): readonly ICollectionListMenu[] {
  // Locale remains an input to computed menu owners even when labels are read lazily.
  labelLocale();
  return [
    {
      id: STATUS_MENU_ID,
      get label() {
        return translateLabel('loc.symphony.labels.status.920e413');
      },
      get subLabel() {
        return selectedStatus
          ? actionStatusLabel(selectedStatus)
          : translateLabel('loc.symphony.labels.all.statuses.8ee5732');
      },
      testId: 'actions-status-filter',
      options: [
        {
          id: ALL_STATUSES_OPTION_ID,
          get label() {
            return translateLabel('loc.symphony.labels.all.statuses.8ee5732');
          },
          checked: !selectedStatus,
        },
        ...RUN_STATUSES.map((status) => ({
          id: status,
          get label() {
            return actionStatusLabel(status);
          },
          checked: status === selectedStatus,
        })),
      ],
    },
    {
      id: ACTOR_MENU_ID,
      // The visible wording matches the pull-request list's Author menu; the run's domain field stays `actor`.
      get label() {
        return translateLabel('loc.symphony.labels.author.d95082a');
      },
      get subLabel() {
        return selectedActor ?? translateLabel('loc.symphony.labels.everyone.da2e5dc');
      },
      testId: 'actions-author-filter',
      options: [
        {
          id: EVERYONE_OPTION_ID,
          get label() {
            return translateLabel('loc.symphony.labels.everyone.da2e5dc');
          },
          checked: !selectedActor,
        },
        ...actors.map((actor) => ({
          id: ACTOR_OPTION_PREFIX + actor,
          label: actor,
          checked: actor === selectedActor,
        })),
      ],
    },
    {
      id: SORT_MENU_ID,
      get label() {
        return translateLabel('loc.symphony.labels.sort.bec6903');
      },
      testId: 'actions-sort',
      options: (Object.keys(SORT_LABELS) as ActionsRunSort[]).map((id) => ({
        id,
        get label() {
          return SORT_LABELS[id];
        },
        checked: id === sort,
      })),
    },
  ];
}

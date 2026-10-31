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

// #endregion

/** Builds the Status, Actor, and Sort menus of the workflow-run collection header. */
export function resolveActionsListMenus(
  actors: readonly string[],
  selectedActor: string | undefined,
  selectedStatus: ICiRun['status'] | undefined,
  sort: ActionsRunSort,
): readonly ICollectionListMenu[] {
  return [
    {
      id: STATUS_MENU_ID,
      label: 'Status',
      subLabel: selectedStatus ? actionStatusLabel(selectedStatus) : 'All statuses',
      testId: 'actions-status-filter',
      options: [
        { id: ALL_STATUSES_OPTION_ID, label: 'All statuses', checked: !selectedStatus },
        ...RUN_STATUSES.map((status) => ({
          id: status,
          label: actionStatusLabel(status),
          checked: status === selectedStatus,
        })),
      ],
    },
    {
      id: ACTOR_MENU_ID,
      // The visible wording matches the pull-request list's Author menu; the run's domain field stays `actor`.
      label: 'Author',
      subLabel: selectedActor ?? 'Everyone',
      testId: 'actions-author-filter',
      options: [
        { id: EVERYONE_OPTION_ID, label: 'Everyone', checked: !selectedActor },
        ...actors.map((actor) => ({
          id: ACTOR_OPTION_PREFIX + actor,
          label: actor,
          checked: actor === selectedActor,
        })),
      ],
    },
    {
      id: SORT_MENU_ID,
      label: 'Sort',
      testId: 'actions-sort',
      options: (Object.keys(SORT_LABELS) as ActionsRunSort[]).map((id) => ({
        id,
        label: SORT_LABELS[id],
        checked: id === sort,
      })),
    },
  ];
}

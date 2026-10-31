// #region Imports

import { RUN_STATUSES } from '@symphony/frontend-core/delivery';
import type { ICollectionListMenuSelection } from '@symphony/frontend-ui';
import type { ICiRun } from '@symphony/domain-ci';
import { ACTOR_MENU_ID } from './ActorMenuId';
import { ACTOR_OPTION_PREFIX } from './ActorOptionPrefix';
import { ALL_STATUSES_OPTION_ID } from './AllStatusesOptionId';
import type { ActionsListCommand } from './ActionsListCommand';
import type { ActionsRunSort } from './ActionsRunSort';
import { EVERYONE_OPTION_ID } from './EveryoneOptionId';
import { SORT_LABELS } from './SortLabels';
import { SORT_MENU_ID } from './SortMenuId';
import { STATUS_MENU_ID } from './StatusMenuId';

// #endregion

/** Maps an activated collection-header menu option back to the presenter command it stands for. */
export function resolveActionsListCommand(
  selection: ICollectionListMenuSelection,
): ActionsListCommand | undefined {
  if (selection.menuId === STATUS_MENU_ID) {
    if (selection.optionId === ALL_STATUSES_OPTION_ID) return { kind: 'status', status: undefined };
    return isRunStatus(selection.optionId)
      ? { kind: 'status', status: selection.optionId }
      : undefined;
  }
  if (selection.menuId === ACTOR_MENU_ID) {
    return {
      kind: 'actor',
      actor:
        selection.optionId === EVERYONE_OPTION_ID
          ? undefined
          : selection.optionId.slice(ACTOR_OPTION_PREFIX.length),
    };
  }
  if (selection.menuId === SORT_MENU_ID && isActionsRunSort(selection.optionId)) {
    return { kind: 'sort', sort: selection.optionId };
  }
  return undefined;
}

function isRunStatus(value: string): value is ICiRun['status'] {
  return (RUN_STATUSES as readonly string[]).includes(value);
}

function isActionsRunSort(value: string): value is ActionsRunSort {
  return value in SORT_LABELS;
}

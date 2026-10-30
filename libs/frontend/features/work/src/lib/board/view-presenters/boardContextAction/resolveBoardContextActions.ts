// #region Imports

import {
  type IExecutionQueueEntry,
  type IExecutionRecord,
  resolveWorkItemActions,
} from '@symphony/domain-execution';
import { type IWorkflowStage } from '@symphony/domain-workflow';
import { type IWorkItem, type IWorkItemAction } from '@symphony/domain-work';
import type { BoardContextActionIcon } from './BoardContextActionIcon';
import type { IBoardContextAction } from './IBoardContextAction';
import { decisionIcon } from './decisionIcon';

// #endregion

export function resolveBoardContextActions(
  item: IWorkItem,
  executions: readonly IExecutionRecord[],
  stages: readonly IWorkflowStage[],
  executionQueue: readonly IExecutionQueueEntry[] = [],
): readonly IBoardContextAction[] {
  return resolveWorkItemActions(item, executions, stages, executionQueue).map((action) => ({
    ...action,
    // A revision is refused without a description, and the description is written in the
    // drawer - a menu entry cannot collect it, so the card names the step and points there.
    ...(action.requiresFeedback && !action.blockedReason
      ? { blockedReason: 'Open the details to describe what the rework must change.' }
      : {}),
    iconName: iconOf(action),
    variant: variantOf(action),
  }));
}

function iconOf(action: IWorkItemAction): BoardContextActionIcon {
  switch (action.kind) {
    case 'analyze':
    case 'solve':
      return action.repeat ? 'sync' : 'play';
    case 'cancel':
    case 'dequeue':
      return 'clear';
    case 'publish-pull-request':
      return 'add';
    case 'decide':
      return decisionIcon(action.effect);
  }
}

/** The same hierarchy the drawer gives a gate: one successful way on, a marked way out. */
function variantOf(action: IWorkItemAction): IBoardContextAction['variant'] {
  switch (action.kind) {
    case 'cancel':
    case 'dequeue':
      return 'danger';
    case 'publish-pull-request':
      return 'success';
    case 'decide':
      if (action.effect === 'advance') return 'success';
      return action.effect === 'close' ? 'danger' : 'default';
    default:
      return 'highlight';
  }
}

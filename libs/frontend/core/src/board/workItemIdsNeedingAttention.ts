// #region Imports

import { inspectWorkItem, type IExecutionRecord } from '@symphony/domain-execution';
import { type IWorkflowStage, type IWorkItemReadiness } from '@symphony/domain-workflow';
import { type IWorkItem, type ProjectFieldDefinition } from '@symphony/domain-work';
import type { IWorkItemAttentionContext } from './IWorkItemAttentionContext';

// #endregion

/**
 * Work items a person has to act on before anything else can happen to them.
 *
 * Two things qualify. A newest execution that failed is the obvious one: the run stopped and
 * nobody has looked at it since - an older failure a later run recovered from does not count.
 * The other is an item the supervisor would refuse to move: no stored analysis, an analysis that
 * never declared itself ready, a critical risk class, an open hard dependency. Those items look
 * perfectly healthy in the run history, which is exactly why they have to be named here.
 *
 * The judgement is delegated to `inspectWorkItem`, the same inspection that draws the indicator
 * on the card, so the count a widget promises is exactly the set the board then shows - and
 * every item in it can explain itself.
 */
export function workItemIdsNeedingAttention(
  items: readonly IWorkItem[],
  executions: readonly IExecutionRecord[],
  context?: IWorkItemAttentionContext,
): ReadonlySet<string> {
  const latestByWorkItem = new Map<string, IExecutionRecord>();
  const historyByWorkItem = new Map<string, IExecutionRecord[]>();
  for (const execution of executions) {
    const current = latestByWorkItem.get(execution.workItemId);
    if (!current || current.startedAt.localeCompare(execution.startedAt) < 0) {
      latestByWorkItem.set(execution.workItemId, execution);
    }
    const history = historyByWorkItem.get(execution.workItemId);
    if (history) history.push(execution);
    else historyByWorkItem.set(execution.workItemId, [execution]);
  }
  const readinessByWorkItem = new Map(
    (context?.readiness ?? []).map((readiness) => [readiness.workItemId, readiness]),
  );

  const ids = new Set<string>();
  for (const item of items) {
    if (latestByWorkItem.get(item.id)?.state === 'failed') {
      ids.add(item.id);
      continue;
    }
    if (!context) continue;
    if (blocked(item, historyByWorkItem.get(item.id) ?? [], readinessByWorkItem, context)) {
      ids.add(item.id);
    }
  }
  return ids;
}

function blocked(
  item: IWorkItem,
  history: readonly IExecutionRecord[],
  readinessByWorkItem: ReadonlyMap<string, IWorkItemReadiness>,
  context: {
    readonly stages: readonly IWorkflowStage[];
    readonly fields: readonly ProjectFieldDefinition[];
  },
): boolean {
  const readiness = readinessByWorkItem.get(item.id);
  return (
    inspectWorkItem(item, {
      stages: context.stages,
      fields: context.fields,
      executions: history,
      ...(readiness ? { readiness } : {}),
    }).severity === 'blocker'
  );
}

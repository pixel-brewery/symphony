// #region Imports

import { resolveBoardColumnLayout, workItemIdsNeedingAttention } from '@symphony/frontend-core';
import type { IWorkItem } from '@symphony/domain-work';
import type { IOrchestrationSnapshot } from '@symphony/ipc-contracts-composition';
import type { IOrbitCluster } from './IOrbitCluster';
import type { IOrbitClusterProjection } from './IOrbitClusterProjection';

// #endregion

/**
 * Groups the Orbit's work items into stage clusters with the Board's own rules: the column layout
 * of the active board and the Board's `Needs attention` judgement. An item that needs attention
 * belongs to the attention cluster instead of its column, so every item sits in exactly one
 * cluster and the attention cluster lists the same items the Board's attention filter shows.
 *
 * @param items - The Orbit's filtered work items.
 * @param snapshot - The orchestration snapshot with columns, executions, stages and readiness.
 * @param activeBoardId - The active board, or undefined for every board in scope.
 * @returns The non-empty clusters in diagram order and each item's column label.
 * @public
 */
export function projectOrbitClusters(
  items: readonly IWorkItem[],
  snapshot: Partial<IOrchestrationSnapshot> | undefined,
  activeBoardId: string | undefined,
): IOrbitClusterProjection {
  const stages = snapshot?.workflow?.stages ?? [];
  const layout = resolveBoardColumnLayout(snapshot?.boardColumns ?? [], activeBoardId, items);
  const attention = workItemIdsNeedingAttention(items, snapshot?.executions ?? [], {
    stages,
    fields: snapshot?.projectFields ?? [],
    readiness: snapshot?.workItemReadiness ?? [],
  });
  const labels = new Map(layout.columns.map((column) => [column.id, column.label]));
  const columnLabels = new Map<string, string>();
  const members = new Map<string, IWorkItem[]>();
  const attentionMembers: IWorkItem[] = [];
  for (const item of items) {
    const columnId = layout.columnIdFor(item);
    columnLabels.set(item.id, labels.get(columnId) ?? 'No column');
    if (attention.has(item.id)) {
      attentionMembers.push(item);
      continue;
    }
    const column = members.get(columnId);
    if (column) column.push(item);
    else members.set(columnId, [item]);
  }
  const terminal = new Set(
    stages.filter((stage) => stage.kind === 'terminal').map((stage) => stage.id),
  );
  const clusters: IOrbitCluster[] = layout.columns.flatMap((column): IOrbitCluster[] => {
    const columnMembers = members.get(column.id);
    if (!columnMembers?.length) return [];
    return [
      {
        id: `column:${column.id}`,
        kind: 'column',
        label: column.label,
        columnId: column.id,
        tone: column.stageId && terminal.has(column.stageId) ? 'success' : 'neutral',
        memberIds: newestFirst(columnMembers),
      },
    ];
  });
  if (attentionMembers.length)
    clusters.push({
      id: 'attention',
      kind: 'attention',
      label: 'Needs attention',
      tone: 'danger',
      memberIds: newestFirst(attentionMembers),
    });
  return { clusters, columnLabels };
}

/** Newest identifier first, comparing the numbers inside identifiers numerically. */
function newestFirst(items: readonly IWorkItem[]): readonly string[] {
  return items
    .toSorted(
      (a, b) =>
        b.externalId.localeCompare(a.externalId, undefined, { numeric: true }) ||
        a.id.localeCompare(b.id),
    )
    .map((item) => item.id);
}

// #region Imports

import {
  stageForRole,
  type IWorkflowDefinition,
  type IWorkflowStageChange,
  type WorkflowStageId,
} from '@symphony/domain-workflow';
import type { IDeliveryRecord } from './IDeliveryRecord';

// #endregion

/**
 * Reduces recorded stage changes to one delivery per work item that reached a terminal stage:
 * when it last moved into a terminal (Done) stage, and when it first moved into the Qualified
 * stage. Both stages are resolved from the workflow definition rather than fixed identifiers:
 * terminal stages by their kind, the Qualified stage as the stage that runs the `analyze` role,
 * else the first non-terminal stage after the intake stage.
 *
 * @param changes - Recorded stage changes, in any order.
 * @param workflow - The workflow whose stages the changes refer to.
 * @returns One record per delivered work item.
 * @public
 */
export function projectDeliveryRecords(
  changes: readonly IWorkflowStageChange[],
  workflow: Pick<IWorkflowDefinition, 'initialStageId' | 'stages'>,
): readonly IDeliveryRecord[] {
  const terminal = new Set(
    workflow.stages.filter((stage) => stage.kind === 'terminal').map((stage) => stage.id),
  );
  const qualified = qualifiedStageId(workflow);
  const byItem = new Map<string, IWorkflowStageChange[]>();
  for (const change of changes) {
    const itemChanges = byItem.get(change.workItemId);
    if (itemChanges) itemChanges.push(change);
    else byItem.set(change.workItemId, [change]);
  }
  const records: IDeliveryRecord[] = [];
  for (const [workItemId, itemChanges] of byItem) {
    const ordered = itemChanges.toSorted((left, right) =>
      left.changedAt.localeCompare(right.changedAt),
    );
    const done = ordered.findLast((change) => terminal.has(change.toStageId));
    if (!done) continue;
    const qualifiedAt = qualified
      ? ordered.find((change) => change.toStageId === qualified)?.changedAt
      : undefined;
    records.push({ workItemId, ...(qualifiedAt ? { qualifiedAt } : {}), doneAt: done.changedAt });
  }
  return records;
}

function qualifiedStageId(
  workflow: Pick<IWorkflowDefinition, 'initialStageId' | 'stages'>,
): WorkflowStageId | undefined {
  const analyzing = stageForRole(workflow.stages, 'analyze');
  if (analyzing) return analyzing;
  const intake = workflow.stages.findIndex((stage) => stage.id === workflow.initialStageId);
  return workflow.stages.slice(intake + 1).find((stage) => stage.kind !== 'terminal')?.id;
}

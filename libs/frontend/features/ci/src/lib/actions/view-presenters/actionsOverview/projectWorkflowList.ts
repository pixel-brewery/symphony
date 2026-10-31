// #region Imports

import type { ICiWorkflow } from '@symphony/domain-ci';
import type { IActionRunRow } from './IActionRunRow';
import type { IWorkflowListEntry } from './IWorkflowListEntry';
import type { WorkflowHealth } from './WorkflowHealth';
import { resolveWorkflowHealth } from './resolveWorkflowHealth';

// #endregion

const HEALTH_ORDER: Readonly<Record<WorkflowHealth, number>> = {
  failing: 0,
  running: 1,
  passing: 2,
  idle: 3,
};

/**
 * Lists the workflows with their dot state: failing first, then running, passing and idle ones,
 * each group by name.
 *
 * @param workflows - Workflow definitions.
 * @param rows - Run rows of every workflow.
 * @returns The `WORKFLOWS` list entries.
 * @public
 */
export function projectWorkflowList(
  workflows: readonly ICiWorkflow[],
  rows: readonly IActionRunRow[],
): readonly IWorkflowListEntry[] {
  const rowsByWorkflow = new Map<string, IActionRunRow[]>();
  for (const row of rows) {
    if (!row.workflowId) continue;
    const entries = rowsByWorkflow.get(row.workflowId) ?? [];
    entries.push(row);
    rowsByWorkflow.set(row.workflowId, entries);
  }
  return workflows
    .map((workflow) => ({
      workflow,
      health: resolveWorkflowHealth(rowsByWorkflow.get(workflow.id) ?? []),
    }))
    .toSorted(
      (left, right) =>
        HEALTH_ORDER[left.health] - HEALTH_ORDER[right.health] ||
        left.workflow.name.localeCompare(right.workflow.name),
    );
}

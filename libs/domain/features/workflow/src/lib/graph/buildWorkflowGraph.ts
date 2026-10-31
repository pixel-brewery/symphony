// #region Imports

import type { IWorkflowDefinition, IWorkflowTransition, WorkflowStageId } from '../workflow';
import type { IWorkflowGraph } from './IWorkflowGraph';
import type { IWorkflowGraphDefect } from './IWorkflowGraphDefect';
import type { IWorkflowGraphEdge } from './IWorkflowGraphEdge';
import type { IWorkflowGraphNode } from './IWorkflowGraphNode';
import type { WorkflowGraphAuditEntry } from './WorkflowGraphAuditEntry';
import type { WorkflowGraphRecord } from './WorkflowGraphRecord';

// #endregion

/**
 * Projects the process into a graph.
 *
 * @param workflow the configured process.
 * @param record runtime truth for one work item; omit to describe the process itself.
 * @param auditTrail the item's append-only history, oldest first.
 */
export function buildWorkflowGraph(
  workflow: IWorkflowDefinition,
  record?: WorkflowGraphRecord,
  auditTrail: readonly WorkflowGraphAuditEntry[] = [],
): IWorkflowGraph {
  const ranks = rankStages(workflow);
  const stageChanges = auditTrail.filter((entry) => entry.kind === 'stage-changed');

  const visits = new Map<WorkflowStageId, { count: number; enteredAt?: string }>();
  // The initial stage is entered without a preceding transition, so the trail never names it
  // as a target. Seed it from the first recorded departure instead.
  const firstDeparture = stageChanges[0]?.fromStageId;
  if (firstDeparture !== undefined) visits.set(firstDeparture, { count: 1 });
  for (const entry of stageChanges) {
    if (entry.toStageId === undefined) continue;
    const seen = visits.get(entry.toStageId);
    visits.set(entry.toStageId, {
      count: (seen?.count ?? 0) + 1,
      enteredAt: entry.occurredAt,
    });
  }

  const rowByColumn = new Map<number, number>();
  const nodes = workflow.stages.map((stage): IWorkflowGraphNode => {
    const column = ranks.get(stage.id) ?? 0;
    const row = rowByColumn.get(column) ?? 0;
    rowByColumn.set(column, row + 1);
    const visit = visits.get(stage.id);
    return {
      stageId: stage.id,
      label: stage.label,
      description: stage.description,
      kind: stage.kind,
      roles: stage.roles ?? [],
      decisions: stage.decisions ?? [],
      state: !ranks.has(stage.id)
        ? 'unreachable'
        : stage.id === record?.stageId
          ? 'current'
          : visit !== undefined
            ? 'visited'
            : 'upcoming',
      column,
      row,
      visitCount: visit?.count ?? 0,
      enteredAt: visit?.enteredAt,
    };
  });

  const edges = workflow.transitions.map((transition): IWorkflowGraphEdge => {
    const traversals = stageChanges.filter((entry) => matchesTransition(entry, transition));
    const fromRank = ranks.get(transition.from);
    const toRank = ranks.get(transition.to);
    return {
      transitionId: transition.id,
      from: transition.from,
      to: transition.to,
      trigger: transition.trigger,
      guards: transition.guards,
      invalidates: transition.invalidates ?? [],
      direction:
        transition.from === transition.to
          ? 'self'
          : fromRank !== undefined && toRank !== undefined && toRank <= fromRank
            ? 'backward'
            : 'forward',
      state:
        traversals.length > 0
          ? 'taken'
          : transition.from === record?.stageId
            ? 'available'
            : 'idle',
      traversalCount: traversals.length,
      lastTraversedAt: traversals[traversals.length - 1]?.occurredAt,
    };
  });

  return {
    workflowId: workflow.id,
    workflowVersion: workflow.version,
    nodes,
    edges,
    currentStageId: record?.stageId,
    runtimeState: record?.runtimeState,
    defects: collectDefects(workflow, ranks),
  };
}

/**
 * Ranks stages by their distance from the initial stage along forward transitions.
 *
 * Breadth-first rather than longest-path: a rework route back to an earlier stage must not
 * push that stage to the right of the stage it came from, or every loop would stretch the
 * layout instead of arcing back through it.
 */
function rankStages(workflow: IWorkflowDefinition): Map<WorkflowStageId, number> {
  const stageIds = new Set(workflow.stages.map((stage) => stage.id));
  const ranks = new Map<WorkflowStageId, number>();
  if (stageIds.has(workflow.initialStageId)) ranks.set(workflow.initialStageId, 0);

  let frontier = [...ranks.keys()];
  while (frontier.length > 0) {
    const next: WorkflowStageId[] = [];
    for (const stageId of frontier) {
      const rank = ranks.get(stageId) ?? 0;
      for (const transition of workflow.transitions) {
        if (transition.from !== stageId) continue;
        if (!stageIds.has(transition.to) || ranks.has(transition.to)) continue;
        ranks.set(transition.to, rank + 1);
        next.push(transition.to);
      }
    }
    frontier = next;
  }
  return ranks;
}

/** Whether an audit entry describes the given transition being taken. */
function matchesTransition(
  entry: WorkflowGraphAuditEntry,
  transition: IWorkflowTransition,
): boolean {
  if (entry.fromStageId !== transition.from || entry.toStageId !== transition.to) return false;
  // Several transitions can share a route and differ only in what triggered them.
  const trigger = transition.trigger;
  if (trigger.kind === 'outcome') {
    if (entry.role !== undefined && entry.role !== trigger.role) return false;
    if (entry.outcome !== undefined && entry.outcome !== trigger.outcome) return false;
  }
  if (trigger.kind === 'claim' && entry.role !== undefined && entry.role !== trigger.role) {
    return false;
  }
  return true;
}

function collectDefects(
  workflow: IWorkflowDefinition,
  ranks: Map<WorkflowStageId, number>,
): readonly IWorkflowGraphDefect[] {
  const defects: IWorkflowGraphDefect[] = [];
  const stageIds = new Set(workflow.stages.map((stage) => stage.id));

  for (const transition of workflow.transitions) {
    for (const [role, stageId] of [
      ['from', transition.from],
      ['to', transition.to],
    ] as const) {
      if (stageIds.has(stageId)) continue;
      defects.push({
        kind: 'unknown-transition-endpoint',
        transitionId: transition.id,
        detail: `Transition "${transition.id}" points ${role} an unknown stage "${stageId}".`,
      });
    }
  }

  for (const stage of workflow.stages) {
    if (!ranks.has(stage.id)) {
      defects.push({
        kind: 'unreachable-stage',
        stageId: stage.id,
        detail: `No forward route reaches stage "${stage.id}".`,
      });
    }
    if (stage.kind !== 'terminal' && !workflow.transitions.some((edge) => edge.from === stage.id)) {
      defects.push({
        kind: 'dead-end-stage',
        stageId: stage.id,
        detail: `Stage "${stage.id}" is not terminal but has no outgoing transition.`,
      });
    }
    if (stage.kind === 'human-gate' && (stage.decisions?.length ?? 0) === 0) {
      defects.push({
        kind: 'gate-without-decision',
        stageId: stage.id,
        detail: `Human gate "${stage.id}" offers no decision, so nothing can pass it.`,
      });
    }
  }
  return defects;
}

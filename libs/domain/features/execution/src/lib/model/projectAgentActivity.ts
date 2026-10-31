// #region Imports

import type { IAgentActivity } from '@symphony/domain-team';
import type { IAgentActivityProjectionContext } from './IAgentActivityProjectionContext';
import type { IAgentProfile } from '@symphony/domain-team';
import type { IAgentWork } from '@symphony/domain-team';

// #endregion

/** Uses immutable execution bindings so reassignment never relabels a running CLI. @public */
export function projectAgentActivity(
  agents: readonly IAgentProfile[],
  snapshot: IAgentActivityProjectionContext | undefined,
  fresh: boolean,
): readonly IAgentActivity[] {
  const byAgent = new Map<string, IAgentWork[]>();
  const add = (id: string | undefined, work: IAgentWork): void => {
    if (!id) return;
    const items = byAgent.get(id) ?? [];
    items.push(work);
    byAgent.set(id, items);
  };
  const executions = snapshot?.executions ?? [];
  const latestByTicket = new Map<string, string>();
  for (const execution of executions)
    if (execution.startedAt > (latestByTicket.get(execution.workItemId) ?? ''))
      latestByTicket.set(execution.workItemId, execution.startedAt);
  for (const execution of executions) {
    const agentId = execution.bindingSnapshot?.agentProfileId;
    if (execution.state === 'cancelled' && !execution.pause) continue;
    const active =
      execution.state === 'running' ||
      execution.state === 'waiting' ||
      execution.state === 'queued' ||
      Boolean(execution.pause);
    // A later phase replaces terminal history on the same ticket.
    if (!active && (latestByTicket.get(execution.workItemId) ?? '') > execution.startedAt) continue;
    const state: IAgentWork['state'] = execution.pause
      ? 'paused'
      : execution.state === 'running'
        ? 'working'
        : execution.state === 'waiting'
          ? 'needs-input'
          : execution.state === 'queued'
            ? 'queued'
            : execution.state === 'succeeded'
              ? 'completed'
              : execution.state === 'failed'
                ? 'failed'
                : 'paused';
    add(agentId, {
      workItemId: execution.workItemId,
      executionId: execution.id,
      role: execution.skillFlowRole ?? execution.kind ?? 'analysis',
      state,
      reason: execution.error ?? (execution.pause ? execution.pause.reason : undefined),
      connectionId: execution.bindingSnapshot?.aiConnectionId,
      updatedAt: execution.finishedAt ?? execution.lastHeartbeatAt ?? execution.startedAt,
    });
  }
  for (const goal of snapshot?.goals ?? []) {
    if (goal.state === 'blocked')
      add(goal.assignment.responsibleAgentId, {
        workItemId: goal.workItemId,
        role: goal.currentRole,
        state: 'blocked',
        reason: goal.blockedReason,
        updatedAt: goal.updatedAt,
      });
    for (const entry of snapshot?.executionQueue ?? []) {
      if (entry.workItemId === goal.workItemId)
        add(goal.assignment.responsibleAgentId, {
          workItemId: entry.workItemId,
          role: entry.kind,
          state: 'queued',
          reason: entry.lastError,
          updatedAt: entry.queuedAt,
        });
    }
  }
  const priority: readonly IAgentWork['state'][] = [
    'needs-input',
    'working',
    'blocked',
    'paused',
    'queued',
    'failed',
    'completed',
  ];
  return agents.map((agent) => {
    const assignments = (byAgent.get(agent.id) ?? []).toSorted(
      (a, b) =>
        priority.indexOf(a.state) - priority.indexOf(b.state) ||
        (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''),
    );
    const current = assignments.filter(
      (item) => item.state !== 'completed' && item.state !== 'failed',
    );
    // Keep every live assignment, or the latest result, rather than one ghost per past ticket.
    const work =
      current.length > 0
        ? current
        : assignments
            .toSorted((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
            .slice(0, 1);
    return {
      agentId: agent.id,
      state: fresh ? (work[0]?.state ?? 'idle') : 'stale',
      work,
      lastKnownAt:
        assignments
          .map((item) => item.updatedAt ?? '')
          .toSorted()
          .at(-1) || undefined,
    };
  });
}

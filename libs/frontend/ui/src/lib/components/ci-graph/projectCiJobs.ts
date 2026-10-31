// #region Imports

import type { CiRunLogState, ICiRunJob, ICiWorkflowGraph } from '@symphony/domain-ci';
import type { ICiGraphJob } from './ICiGraphJob';

// #endregion

/** Associates executions without inventing pending runs or evaluating workflow expressions. @public */
export function projectCiJobs(
  graph: ICiWorkflowGraph,
  executions: readonly ICiRunJob[],
): readonly ICiGraphJob[] {
  const known = new Set(graph.jobs.map((job) => job.id));
  const resolved = new Set<string>();
  let pending = [...graph.jobs];
  while (pending.length) {
    const ready = pending.filter((job) =>
      job.needs.every((id) => !known.has(id) || resolved.has(id)),
    );
    if (!ready.length) break;
    for (const job of ready) resolved.add(job.id);
    pending = pending.filter((job) => !resolved.has(job.id));
  }
  const byDefinition = new Map<string, ICiRunJob[]>();
  for (const run of executions) {
    if (!run.workflowJobId) continue;
    const group = byDefinition.get(run.workflowJobId) ?? [];
    group.push(run);
    byDefinition.set(run.workflowJobId, group);
  }
  return graph.jobs.map((definition) => {
    const runs = byDefinition.get(definition.id) ?? [];
    const active = (['in-progress', 'failed', 'cancelled', 'queued'] as const).find((status) =>
      runs.some((run) => run.status === status),
    );
    const status: CiRunLogState | undefined =
      active ??
      (runs.length
        ? runs.every((run) => run.status === 'skipped')
          ? 'skipped'
          : 'succeeded'
        : undefined);
    return {
      definition,
      executions: runs,
      status,
      unresolved: !resolved.has(definition.id) || definition.needs.some((id) => !known.has(id)),
    };
  });
}

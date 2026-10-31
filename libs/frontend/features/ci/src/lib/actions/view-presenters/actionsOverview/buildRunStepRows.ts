// #region Imports

import type { ICiRunJob } from '@symphony/domain-ci';
import type { IRunStepRow } from './IRunStepRow';

// #endregion

/**
 * Flattens a run's jobs into the step list: a single job shows its steps directly, several jobs
 * each get a heading line followed by their steps.
 *
 * @param jobs - Jobs reported for the run.
 * @returns The step list lines.
 * @public
 */
export function buildRunStepRows(jobs: readonly ICiRunJob[]): readonly IRunStepRow[] {
  const grouped = jobs.length > 1;
  return jobs.flatMap((job): IRunStepRow[] => {
    const heading: IRunStepRow = {
      id: job.id,
      kind: 'job',
      name: job.name,
      status: job.status,
      ...(job.startedAt ? { startedAt: job.startedAt } : {}),
      ...(job.finishedAt ? { finishedAt: job.finishedAt } : {}),
      nested: false,
    };
    const steps = job.steps.map((step): IRunStepRow => ({
      id: step.id,
      kind: 'step',
      name: step.name,
      status: step.status,
      ...(step.startedAt ? { startedAt: step.startedAt } : {}),
      ...(step.finishedAt ? { finishedAt: step.finishedAt } : {}),
      nested: grouped,
    }));
    if (!grouped) return steps.length ? steps : [heading];
    return [heading, ...steps];
  });
}

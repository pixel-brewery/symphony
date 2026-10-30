// #region Imports

import type { ICiRunJob, ICiRunStep } from '@symphony/domain-ci';
import type { IActionLogView } from './IActionLogView';
import type { IActionRunProtocolView } from './IActionRunProtocolView';
import { trimProtocol } from './trimProtocol';

// #endregion

function compactFallback(
  fullLog: string,
  fallbackOutput?: string,
  failureOutput?: string,
): string | undefined {
  if (fullLog.trim()) return undefined;
  return trimProtocol(failureOutput ?? fallbackOutput ?? '') || undefined;
}

function diagnosticTarget(
  jobs: readonly ICiRunJob[],
): { readonly job: ICiRunJob; readonly step: ICiRunStep } | undefined {
  for (const status of ['failed', 'in-progress'] as const) {
    const job = jobs.find((candidate) => candidate.status === status);
    const step = job?.steps.find((candidate) => candidate.status === status);
    if (job && step) return { job, step };
  }
  const job = jobs.at(-1);
  const step = job?.steps.at(-1);
  return job && step ? { job, step } : undefined;
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
}

/** Maps the tab-prefixed output from `gh run view --log` back to its reported job and step. */
export function buildActionLogView(
  jobs: readonly ICiRunJob[],
  fullLog: string,
  fallbackOutput?: string,
  failureOutput?: string,
  localDiagnostics?: string,
): IActionLogView {
  const protocols = new Map<string, string[]>();
  const unassigned: string[] = [];
  const jobsByName = new Map(jobs.map((job) => [normalizeName(job.name), job]));

  for (const line of fullLog.split(/\r?\n/u)) {
    if (!line && fullLog.length === 0) continue;
    const fields = line.split('\t');
    const job = fields.length >= 3 ? jobsByName.get(normalizeName(fields[0] ?? '')) : undefined;
    const step = job
      ? job.steps.find(
          (candidate) => normalizeName(candidate.name) === normalizeName(fields[1] ?? ''),
        )
      : undefined;
    if (!job || !step) {
      unassigned.push(line);
      continue;
    }
    const key = `${job.id}:${step.id}`;
    const message = fields
      .slice(2)
      .join('\t')
      .replace(/^\uFEFF/u, '');
    const lines = protocols.get(key) ?? [];
    lines.push(message);
    protocols.set(key, lines);
  }

  const fallback = compactFallback(fullLog, fallbackOutput, failureOutput);
  if (fallback) {
    const target = diagnosticTarget(jobs);
    if (target) protocols.set(`${target.job.id}:${target.step.id}`, [fallback]);
    else unassigned.push(fallback);
  }

  const runProtocols: IActionRunProtocolView[] = [];
  const unmatchedLog = trimProtocol(unassigned.join('\n'));
  if (unmatchedLog) {
    runProtocols.push({
      id: 'workflow-output',
      title: failureOutput ? 'Workflow failure output' : 'Workflow output',
      content: unmatchedLog,
      status: failureOutput ? 'failed' : 'succeeded',
    });
  }
  const diagnostics = trimProtocol(localDiagnostics ?? '');
  if (diagnostics) {
    runProtocols.push({
      id: 'local-runner-diagnostics',
      title: 'Local runner diagnostics',
      content: diagnostics,
      status: 'queued',
    });
  }

  return {
    jobs: jobs.map((job) => ({
      ...job,
      steps: job.steps.map((step) => {
        const protocol = trimProtocol((protocols.get(`${job.id}:${step.id}`) ?? []).join('\n'));
        return protocol ? { ...step, protocol } : step;
      }),
    })),
    runProtocols,
  };
}

// #region Imports

import type { ICiWorkflowGraph, ICiWorkflowJob } from '@symphony/domain-ci';

// #endregion

/** Projects declared dependencies without evaluating repository expressions. @public */
export function projectWorkflowGraph(
  document: unknown,
  revision: string,
  path: string,
): ICiWorkflowGraph {
  const root = asRecord(document);
  const definitions = asRecord(root['jobs']);
  const unresolved: string[] = [];
  const jobs: ICiWorkflowJob[] = Object.entries(definitions).map(([id, value]) => {
    const job = asRecord(value);
    const rawNeeds = job['needs'];
    const needs =
      typeof rawNeeds === 'string'
        ? [rawNeeds]
        : Array.isArray(rawNeeds)
          ? rawNeeds.filter((need): need is string => typeof need === 'string')
          : [];
    for (const need of needs)
      if (!(need in definitions) || need.includes('${{')) unresolved.push(`${id}: ${need}`);
    if (rawNeeds && typeof rawNeeds !== 'string' && !Array.isArray(rawNeeds))
      unresolved.push(`${id}: unresolved needs`);
    const name = typeof job['name'] === 'string' ? job['name'] : id;
    if (name.includes('${{')) unresolved.push(`${id}: dynamic job name`);
    const environment =
      typeof job['environment'] === 'string'
        ? job['environment']
        : asRecord(job['environment'])['name'];
    return {
      id,
      name,
      needs,
      matrix: 'matrix' in asRecord(job['strategy']),
      ...(typeof job['if'] === 'string' ? { condition: job['if'] } : {}),
      ...(typeof environment === 'string' ? { environment } : {}),
    };
  });
  return { revision, path, jobs, unresolved };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

// #region Imports

import type { IRunnerImageReportNode } from './IRunnerImageReportNode';
import type { RunnerImageReport } from './RunnerImageReport';
import { children } from './children';
import { findNode } from './findNode';

// #endregion

/** Environment variables the report declares under any `Environment variables` table. */
export function readEnvironment(report: RunnerImageReport): Readonly<Record<string, string>> {
  const environment: Record<string, string> = {};
  eachNode(report, (node) => {
    if (node.Title !== 'Environment variables') return;
    const table = findNode(node, (candidate) => Array.isArray(candidate.Rows));
    for (const row of table?.Rows ?? []) {
      const separator = row.indexOf('|');
      if (separator < 0) continue;
      const name = row.slice(0, separator).trim();
      const value = row.slice(separator + 1).trim();
      if (!value || !/^[A-Z][A-Z0-9_]{0,63}$/u.test(name)) continue;
      environment[name] = value;
    }
  });
  return environment;
}

function eachNode(
  node: IRunnerImageReportNode,
  visit: (candidate: IRunnerImageReportNode) => void,
): void {
  visit(node);
  for (const child of children(node)) eachNode(child, visit);
}

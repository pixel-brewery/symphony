// #region Imports

import type { RunnerImageReport } from './RunnerImageReport';
import { findNode } from './findNode';

// #endregion

/** Version the report declares for one named tool, for example `Node.js`. */
export function readToolVersion(report: RunnerImageReport, toolName: string): string | undefined {
  const node = findNode(report, (candidate) => candidate.ToolName === toolName);
  const version = node?.Version?.trim();
  return version && /^\d+\.\d+\.\d+$/u.test(version) ? version : undefined;
}

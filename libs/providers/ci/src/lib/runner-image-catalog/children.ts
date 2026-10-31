// #region Imports

import type { IRunnerImageReportNode } from './IRunnerImageReportNode';

// #endregion

export function children(node: IRunnerImageReportNode): readonly IRunnerImageReportNode[] {
  const value = node.Children;
  if (!value) return [];
  return Array.isArray(value) ? value : [value as IRunnerImageReportNode];
}

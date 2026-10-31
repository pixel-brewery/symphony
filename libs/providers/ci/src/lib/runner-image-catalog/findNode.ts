// #region Imports

import type { IRunnerImageReportNode } from './IRunnerImageReportNode';
import { children } from './children';

// #endregion

export function findNode(
  node: IRunnerImageReportNode,
  predicate: (candidate: IRunnerImageReportNode) => boolean,
): IRunnerImageReportNode | undefined {
  if (predicate(node)) return node;
  for (const child of children(node)) {
    const found = findNode(child, predicate);
    if (found) return found;
  }
  return undefined;
}

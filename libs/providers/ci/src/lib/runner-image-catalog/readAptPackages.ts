// #region Imports

import type { RunnerImageReport } from './RunnerImageReport';
import { findNode } from './findNode';

// #endregion

/** Package names the selected runner image declares under `Installed apt packages`. */
export function readAptPackages(report: RunnerImageReport): readonly string[] {
  const section = findNode(report, (node) => node.Title === 'Installed apt packages');
  if (!section) return [];
  const table = findNode(section, (node) => Array.isArray(node.Rows));
  const rows = table?.Rows ?? [];
  const packages = rows
    .map((row) => row.split('|')[0]?.trim() ?? '')
    .filter((name) => /^[a-z0-9][a-z0-9.+-]{0,127}$/u.test(name));
  return [...new Set(packages)].sort();
}

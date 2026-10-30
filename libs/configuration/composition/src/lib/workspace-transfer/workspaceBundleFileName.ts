// #region Imports

import type { IWorkspaceDefinition } from '@symphony/domain-workspace';

// #endregion

export function workspaceBundleFileName(
  workspace: IWorkspaceDefinition,
  exportedAt = new Date(),
): string {
  const slug = workspace.displayName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '')
    .slice(0, 48);
  const timestamp = exportedAt
    .toISOString()
    .replace(/[-:]/gu, '')
    .replace(/\.\d{3}Z$/u, 'Z');
  return `${slug || 'workspace'}-${timestamp}.symphony-workspace.json`;
}

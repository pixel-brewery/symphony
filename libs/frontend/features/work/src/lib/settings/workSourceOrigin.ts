// #region Imports

import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * Where a board comes from, as Connected services names it, for example
 * `GitHub Project · org example · #3` or `Azure DevOps · Delivery`.
 *
 * @param source - The configured work-item source.
 * @returns The provider and the project the board reads.
 * @public
 */
export function workSourceOrigin(
  source: ApplicationSettingsDto['workItemSources'][number],
): string {
  switch (source.provider) {
    case 'github-projects':
      return `GitHub Project · ${source.ownerType === 'organization' ? 'org' : 'user'} ${source.owner} · #${source.projectNumber}`;
    case 'azure-devops':
      return `Azure DevOps · ${source.project}`;
    case 'simulated':
      return `Simulated · ${source.project}`;
  }
}

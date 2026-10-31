// #region Imports

import type { Settings } from './Settings';

// #endregion

/**
 * Delivery contexts that still name the repository. Removing it while a context depends on it
 * would leave that context pointing at a binding that no longer exists.
 */
export function repositoryRemovalBlockers(
  settings: Settings,
  repositoryBindingId: string,
): readonly string[] {
  return settings.deliveryContexts
    .filter(
      (context) =>
        context.repositoryBindingIds.includes(repositoryBindingId) &&
        context.repositoryBindingIds.length === 1,
    )
    .map((context) => context.displayName);
}

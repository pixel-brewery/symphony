// #region Imports

import type { IPullRequestSummary } from '@symphony/domain-delivery';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import type { IPullRequestDelivery } from './IPullRequestDelivery';
import type { PullRequestRepairBlock } from './PullRequestRepairBlock';

// #endregion

/**
 * Resolves why `Repair with AI` cannot start for a pull request, or `undefined` when it can.
 *
 * AI may repair failed checks only where the automation policy already lets it do so on its own:
 * agentic delivery is on for the repository's CI binding and the `Fix failed checks` level allows
 * source repairs on the managed branch (`Repair` or `Full`). The repair continues the work item's
 * retained implementation, so the pull request must have been published by Symphony.
 *
 * @param pullRequest - Pull request.
 * @param delivery - The delivery behind it.
 * @param policy - The agentic-delivery policy, when settings are loaded.
 * @param ciBindings - Configured CI bindings.
 * @param executionAvailable - Whether this window can start executions.
 * @returns The reason, or `undefined`.
 * @public
 */
export function resolvePullRequestRepairBlock(
  pullRequest: Pick<IPullRequestSummary, 'workspaceId' | 'repositoryBindingId'>,
  delivery: Pick<IPullRequestDelivery, 'workItemId' | 'active'>,
  policy: ApplicationSettingsDto['runtime']['agenticDelivery'] | undefined,
  ciBindings: readonly Pick<
    ApplicationSettingsDto['ciBindings'][number],
    'workspaceId' | 'repositoryBindingId' | 'enabled' | 'agenticDeliveryEnabled'
  >[],
  executionAvailable: boolean,
): PullRequestRepairBlock | undefined {
  if (!executionAvailable) return 'unavailable';
  if (!delivery.workItemId) return 'not-delivered';
  const repositoryOptedIn = ciBindings.some(
    (binding) =>
      binding.workspaceId === pullRequest.workspaceId &&
      binding.repositoryBindingId === pullRequest.repositoryBindingId &&
      binding.enabled &&
      binding.agenticDeliveryEnabled === true,
  );
  if (
    !repositoryOptedIn ||
    !policy?.enabled ||
    !policy.sourceRepairEnabled ||
    !policy.managedBranchUpdatesEnabled
  ) {
    return 'policy';
  }
  if (delivery.active) return 'busy';
  return undefined;
}

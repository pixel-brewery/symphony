// #region Imports

import type { Settings } from './Settings';

// #endregion

/**
 * Names of the agents that would lose their last execution route when the account is removed.
 * A route policy must keep at least one candidate, so removal is refused while this is non-empty.
 */
export function aiAccountRemovalBlockers(settings: Settings, accountId: string): readonly string[] {
  return settings.agentRoutePolicies
    .filter((policy) => {
      const remaining = policy.candidates.filter(
        (candidate) => candidate.aiConnectionId !== accountId,
      );
      return remaining.length !== policy.candidates.length && remaining.length === 0;
    })
    .flatMap((policy) =>
      settings.agentProfiles
        .filter((profile) => profile.routePolicyId === policy.id)
        .map((profile) => profile.displayName),
    );
}

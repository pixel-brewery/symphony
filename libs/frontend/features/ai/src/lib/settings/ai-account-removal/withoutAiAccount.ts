// #region Imports

import type { Settings } from './Settings';

// #endregion

/** Settings without the AI account and without every route candidate that pointed at it. */
export function withoutAiAccount(settings: Settings, accountId: string): Settings {
  return {
    ...settings,
    connections: settings.connections.filter((connection) => connection.id !== accountId),
    agentRoutePolicies: settings.agentRoutePolicies.map((policy) => ({
      ...policy,
      candidates: policy.candidates
        .filter((candidate) => candidate.aiConnectionId !== accountId)
        .map((candidate, index) => ({ ...candidate, priority: index })),
    })),
  };
}

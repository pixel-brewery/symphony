// #region Imports

import type { IAgentAppearance } from './IAgentAppearance';

// #endregion

/** Stable across machines, restarts, account changes and provider failover. @public */
export function defaultAgentAppearance(agentId: string): IAgentAppearance {
  let hash = 2166136261;
  for (const character of agentId) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  // Freeze the original hash palette so catalogue additions cannot change existing identities.
  const colors = ['coral', 'mint', 'blue', 'violet'] as const;
  return { figure: 'dot', color: colors[(hash >>> 4) % 4]!, accessories: [] };
}

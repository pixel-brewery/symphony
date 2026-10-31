// #region Imports

import type { IAgenticDeliveryPolicy } from '@symphony/domain-automation';
import { agenticLadder } from './AgenticLadder';
import type { AgenticLevel } from './AgenticLevel';
import { agenticLevelSwitches } from './AgenticLevelSwitches';

// #endregion

/**
 * Sets every ladder switch to the given level in one go. Budgets and the switches outside the
 * ladder (review feedback, delivery serialization) stay as they are; `custom` changes nothing.
 *
 * @param policy - The agentic-delivery policy.
 * @param level - The level to apply.
 * @returns The policy with the level's switches.
 * @public
 */
export function withAgenticLevel<TPolicy extends IAgenticDeliveryPolicy>(
  policy: TPolicy,
  level: AgenticLevel,
): TPolicy {
  if (level === 'custom') return policy;
  const switches: readonly string[] = agenticLevelSwitches[level];
  return agenticLadder.reduce<TPolicy>(
    (next, rung) => ({ ...next, [rung.key]: switches.includes(rung.key) }),
    policy,
  );
}

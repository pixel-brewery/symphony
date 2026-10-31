// #region Imports

import type { IAgenticDeliveryPolicy } from '@symphony/domain-automation';
import { agenticLadder } from './AgenticLadder';
import type { AgenticLevel } from './AgenticLevel';
import { agenticLevelSwitches } from './AgenticLevelSwitches';

// #endregion

/**
 * Reads the level a policy's ladder switches match.
 *
 * @param policy - The agentic-delivery policy.
 * @returns The matching level, or `custom` when the switches match none.
 * @public
 */
export function agenticLevelOf(policy: IAgenticDeliveryPolicy): AgenticLevel {
  const levels = Object.entries(agenticLevelSwitches) as [
    Exclude<AgenticLevel, 'custom'>,
    readonly string[],
  ][];
  const match = levels.find(([, switches]) =>
    agenticLadder.every((rung) => policy[rung.key] === switches.includes(rung.key)),
  );
  return match?.[0] ?? 'custom';
}

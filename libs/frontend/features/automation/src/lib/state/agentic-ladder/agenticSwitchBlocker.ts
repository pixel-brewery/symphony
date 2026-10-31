// #region Imports

import type { IAgenticDeliveryPolicy } from '@symphony/domain-automation';
import { agenticLadder } from './AgenticLadder';
import type { AgenticSwitch } from './AgenticSwitch';

// #endregion

/**
 * Names the prerequisite that keeps a ladder switch from working.
 *
 * @param policy - The agentic-delivery policy.
 * @param key - The switch.
 * @returns The first prerequisite that is off, or `undefined` when the switch can be used.
 * @public
 */
export function agenticSwitchBlocker(
  policy: IAgenticDeliveryPolicy,
  key: AgenticSwitch,
): AgenticSwitch | undefined {
  const rung = agenticLadder.find((candidate) => candidate.key === key);
  if (!rung) return undefined;
  const missing = rung.requires.find((requirement) => !policy[requirement]);
  if (missing) return missing;
  if (rung.requiresAnyOf.length && !rung.requiresAnyOf.some((requirement) => policy[requirement]))
    return rung.requiresAnyOf[0];
  return undefined;
}

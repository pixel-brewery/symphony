// #region Imports

import type { IAgenticDeliveryPolicy } from '@symphony/domain-automation';
import { agenticLadder } from './AgenticLadder';
import type { AgenticSwitch } from './AgenticSwitch';
import { agenticSwitchBlocker } from './agenticSwitchBlocker';

// #endregion

/**
 * Turns one ladder switch on or off. A switch whose prerequisite is off cannot be turned on, and
 * turning a switch off also turns off every switch that no longer has its prerequisites, so the
 * stored policy never holds a switch that cannot work.
 *
 * @param policy - The agentic-delivery policy.
 * @param key - The switch.
 * @param value - Whether the switch is on.
 * @returns The changed policy, or the same policy when the switch cannot be turned on.
 * @public
 */
export function withAgenticSwitch<TPolicy extends IAgenticDeliveryPolicy>(
  policy: TPolicy,
  key: AgenticSwitch,
  value: boolean,
): TPolicy {
  if (value && agenticSwitchBlocker(policy, key)) return policy;
  let next: TPolicy = { ...policy, [key]: value };
  for (let changed = !value; changed;) {
    changed = false;
    for (const rung of agenticLadder) {
      if (next[rung.key] && agenticSwitchBlocker(next, rung.key)) {
        next = { ...next, [rung.key]: false };
        changed = true;
      }
    }
  }
  return next;
}

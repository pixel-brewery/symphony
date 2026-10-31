// #region Imports

import type { AgenticLevel } from './AgenticLevel';
import type { AgenticSwitch } from './AgenticSwitch';

// #endregion

const WATCH: readonly AgenticSwitch[] = ['enabled', 'observeFailures'];
const DIAGNOSE: readonly AgenticSwitch[] = [...WATCH, 'aiDiagnosisEnabled', 'ciRerunEnabled'];
const REPAIR: readonly AgenticSwitch[] = [
  ...DIAGNOSE,
  'managedBranchUpdatesEnabled',
  'sourceRepairEnabled',
  'workflowRepairEnabled',
];

/**
 * The switches each level turns on; every other ladder switch is off. `Watch` is agentic delivery
 * and observation, `Diagnose` adds AI diagnosis and reruns, `Repair` adds branch updates and both
 * repairs, `Full` adds replacement pull requests.
 *
 * @public
 */
export const agenticLevelSwitches: Readonly<
  Record<Exclude<AgenticLevel, 'custom'>, readonly AgenticSwitch[]>
> = {
  off: [],
  watch: WATCH,
  diagnose: DIAGNOSE,
  repair: REPAIR,
  full: [...REPAIR, 'replacementPullRequestEnabled'],
};

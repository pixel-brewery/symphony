// #region Imports

import { managedInstanceCount } from './managedInstanceCount';

// #endregion

export /**
 * Names how many machines fill the instance segment. A single number cannot distinguish one
 * large machine from a second one an interrupted teardown left behind, which is exactly the
 * difference an operator has to act on.
 */
function instancesSegmentDescription(limaRoot: string): string {
  const count = managedInstanceCount(limaRoot);
  if (!count) return 'Disks of the managed Linux machines. None exists right now.';
  const machines = count === 1 ? '1 machine' : `${count} machines`;
  return `Disks of ${machines} on this Mac. A machine is removed after its run unless it is kept warm; see the machine list below.`;
}

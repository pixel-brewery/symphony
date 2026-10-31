// #region Imports

import type { IDeliveryEvidence } from './IDeliveryEvidence';

// #endregion

/**
 * An active successful proof ordered by the delivery itself, including redeployed old versions.
 *
 * @param evidence - Observed delivery evidence to inspect.
 * @param targetId - Destination whose latest successful delivery is requested.
 * @returns The latest successful proof, when one exists.
 * @public
 */
export function currentDeliveryEvidence(
  evidence: readonly IDeliveryEvidence[],
  targetId: string,
): IDeliveryEvidence | undefined {
  return evidence
    .filter((item) => item.targetId === targetId && item.state === 'succeeded')
    .toSorted((a, b) =>
      (b.deployedAt ?? b.observedAt).localeCompare(a.deployedAt ?? a.observedAt),
    )[0];
}

// #region Imports

import type { IImplementationContract } from '@symphony/domain-execution';

// #endregion

/**
 * A contract without a change budget makes a solution run structurally impossible: the agent
 * implements, then scope validation rejects every produced change. Position policies allow a
 * zero budget because read-only positions use it, so a solution bound to one must stop before
 * the agent burns a full run on an outcome that is already decided.
 */
export function assertContractAcceptsChanges(contract: IImplementationContract): void {
  if (contract.maximumChangedFiles > 0 && contract.maximumDiffLines > 0) return;
  throw new Error(
    `The implementation contract allows no changes (maximumChangedFiles=${contract.maximumChangedFiles}, maximumDiffLines=${contract.maximumDiffLines}). Raise the change budget of the assigned position in Settings, then start the solution again.`,
  );
}

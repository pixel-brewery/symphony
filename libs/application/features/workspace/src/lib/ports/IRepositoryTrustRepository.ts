// #region Imports

import type { IRepositoryTrustGrant } from '@symphony/domain-workspace';

// #endregion

/**
 * Retains machine-local trust independently from repository verification evidence.
 *
 * @public
 */
export interface IRepositoryTrustRepository {
  /**
   * Reads the machine-local approval for one repository binding.
   *
   * @public
   */
  trustGrant(repositoryBindingId: string): IRepositoryTrustGrant | undefined;
  /**
   * Retains an explicit approval with its repository identity and capabilities.
   *
   * @public
   */
  saveTrustGrant(grant: IRepositoryTrustGrant): void;
  /**
   * Revokes repository approval without deleting verification evidence.
   *
   * @public
   */
  revokeTrustGrant(repositoryBindingId: string): void;
}

// #region Imports

import type {
  ILocalCiExecutionRepository,
  IVerificationRepository,
} from '@symphony/application-ci';
import type { IRepositoryTrustRepository } from './IRepositoryTrustRepository';

// #endregion

/**
 * Preserves the former combined persistence shape for repository-runtime compatibility adapters.
 *
 * @public
 */
export interface IRepositoryRuntimeRepository
  extends IRepositoryTrustRepository, IVerificationRepository, ILocalCiExecutionRepository {
  initialize(): void;
  removeWorkspace(workspaceId: string): void;
}

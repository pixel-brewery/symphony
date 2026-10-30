// #region Imports

import type { IPreparedRepository, IRepositoryBinding } from '@symphony/domain-workspace';
import type { IVerificationPlanDraft } from './IVerificationPlanDraft';

// #endregion

export interface IVerificationPlannerPort {
  plan(
    repository: IRepositoryBinding,
    prepared: IPreparedRepository,
    signal: AbortSignal,
  ): Promise<IVerificationPlanDraft>;
}

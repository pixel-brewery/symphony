// #region Imports

import type { IVerificationEvidence } from './IVerificationEvidence';
import type { IVerificationStep } from './IVerificationStep';
import type { RepositoryExecutionCapability } from '@symphony/domain-workspace';

// #endregion

export interface IVerificationPlan {
  id: string;
  workspaceId: string;
  repositoryBindingId: string;
  repositoryIdentity: string;
  revision: string;
  createdAt: string;
  technologies: readonly string[];
  evidence: readonly IVerificationEvidence[];
  capabilities: readonly RepositoryExecutionCapability[];
  steps: readonly IVerificationStep[];
}

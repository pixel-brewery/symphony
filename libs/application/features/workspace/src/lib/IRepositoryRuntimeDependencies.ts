// #region Imports

import type { IApplicationSettings } from '@symphony/configuration-composition';
import type { IIdGenerator, IPlatformClock } from '@symphony/application-core';
import type {
  IVerificationRepository,
  IVerificationExecutorPort,
  IVerificationPlannerPort,
  IVerificationWorkspacePort,
} from '@symphony/application-ci';
import type { IRepositoryAcquisitionPort } from './ports/IRepositoryAcquisitionPort';
import type { IRepositoryTrustRepository } from './ports/IRepositoryTrustRepository';

// #endregion

export interface IRepositoryRuntimeDependencies {
  readonly settings: () => IApplicationSettings;
  readonly saveRepositoryPath: (repositoryBindingId: string, path: string) => Promise<void>;
  readonly managedRepositoryRoot: (workspaceId: string) => string;
  readonly verificationRuntimeRoot: (workspaceId: string, runId: string) => string;
  readonly acquisition: IRepositoryAcquisitionPort;
  readonly verificationWorkspace: IVerificationWorkspacePort;
  readonly planner: IVerificationPlannerPort;
  readonly executor: IVerificationExecutorPort;
  readonly trust: IRepositoryTrustRepository;
  readonly verification: IVerificationRepository;
  readonly clock: IPlatformClock;
  readonly ids: IIdGenerator;
}

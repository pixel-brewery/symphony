// #region Imports
import { type RepositoryRuntimeService } from '@symphony/application-workspace';
import { type IStorageWriteAdmission } from '../../storage-governor/IStorageWriteAdmission';
// #endregion

/**
 * Consumes only the capabilities required by verification orchestration.
 *
 * @public
 */
export interface ICreateVerificationRequestsDependencies {
  readonly repositoryRuntime: Pick<
    RepositoryRuntimeService,
    'createVerificationPlan' | 'runVerification'
  >;
  readonly storageGovernor: IStorageWriteAdmission;
  readonly workspaceIdForRepository: (repositoryBindingId: string) => string | undefined;
}

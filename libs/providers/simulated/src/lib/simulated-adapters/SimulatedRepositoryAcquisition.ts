// #region Imports

import type { IRepositoryAcquisitionPort } from '@symphony/application-workspace';
import type { IPreparedRepository, IRepositoryBinding } from '@symphony/domain-workspace';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// #endregion

export class SimulatedRepositoryAcquisition implements IRepositoryAcquisitionPort {
  // #region Methods

  /**
   * Inspects.
   *
   * @param repository - Repository.
   * @param managedRoot - Managed root.
   * @public
   */
  public async inspect(
    repository: IRepositoryBinding,
    managedRoot: string,
  ): Promise<IPreparedRepository | undefined> {
    void managedRoot;
    return repository.localPath && existsSync(repository.localPath)
      ? { path: resolve(repository.localPath), revision: 'simulated-revision', managed: false }
      : undefined;
  }

  /**
   * Prepares.
   *
   * @param repository - Repository.
   * @param managedRoot - Managed root.
   * @param signal - Signal.
   * @public
   */
  public async prepare(
    repository: IRepositoryBinding,
    managedRoot: string,
    signal: AbortSignal,
  ): Promise<IPreparedRepository> {
    void signal;
    const existing = await this.inspect(repository, managedRoot);
    if (!existing) throw new Error('The simulated repository folder is unavailable.');
    return existing;
  }

  // #endregion
}

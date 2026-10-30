// #region Imports

import { inject, Injectable } from '@angular/core';
import { NotificationService } from '@symphony/frontend-notification';
import { MessageBoxService } from '@pixel-brewery/mosaik-elements-angular';
import type { IWorkItem } from '@symphony/domain-work';
import { repositoryBindingsFor } from '@symphony/configuration-composition';
import { firstValueFrom } from 'rxjs';
import type { LocalExecutionApproval } from './LocalExecutionApproval';
import { WORK_APPROVAL_CONTEXT } from '../../ports/WorkApprovalContextToken';
import { WORK_REPOSITORY_RUNTIME } from '../../ports/WorkRepositoryRuntimeToken';

// #endregion

@Injectable({ providedIn: 'root' })
export class LocalExecutionApprovalService {
  // #region Fields

  private readonly _context = inject(WORK_APPROVAL_CONTEXT);
  private readonly _runtime = inject(WORK_REPOSITORY_RUNTIME);
  private readonly _notifications = inject(NotificationService);
  private readonly _messageBoxes = inject(MessageBoxService);

  // #endregion

  // #region Methods

  /**
   * Requests.
   *
   * @param item - Item.
   * @public
   */
  public async request(item: IWorkItem | undefined): Promise<LocalExecutionApproval> {
    const settings = this._context.settings();
    if (!item || !settings || !this._runtime) return false;
    const repositories = repositoryBindingsFor(settings, item);
    if (repositories.length !== 1) {
      this._notifications.showWarning(
        'Choose one repository.',
        'Local AI execution requires one unambiguous repository binding.',
      );
      return false;
    }
    const repository = repositories[0]!;
    let status = this._runtime?.repositoryRuntimeStatus(repository.id);
    if (!status) {
      if (!(await this._runtime?.refreshRepositoryRuntime(repository.id))) return false;
      status = this._runtime?.repositoryRuntimeStatus(repository.id);
    }
    if (!status) return false;

    if (status.preparation.state === 'unprepared') {
      const preparation = this._messageBoxes.show({
        id: `prepare-repository-${repository.id}`,
        header: `Prepare ${repository.owner}/${repository.name} locally?`,
        message:
          'Symphony will clone or refresh this configured repository without running project code, dependency installers, Git hooks, or tests. AI tasks may use it after preparation.',
        buttons: 'yesNo',
        variant: 'primary',
        pressEscapeToClose: true,
        intl: { yesLabel: 'Prepare locally', noLabel: 'Cancel' },
      });
      const decision = await firstValueFrom(preparation.closed);
      if (decision.reason !== 'positive') return false;
      if (!(await this._runtime?.prepareRepository(repository.id))) return false;
      status = this._runtime?.repositoryRuntimeStatus(repository.id);
      if (!status) return false;
    }
    return '';
  }

  // #endregion
}

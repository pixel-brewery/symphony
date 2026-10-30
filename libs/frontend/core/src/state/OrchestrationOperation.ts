// #region Imports

import { Inject, inject, Injectable } from '@angular/core';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { ORCHESTRATION_CLIENT } from '../clients/OrchestrationClient';
import { NotificationService } from '@symphony/frontend-notification';
import { operatorErrorMessage } from '@symphony/frontend-notification';
import { OrchestrationState } from './OrchestrationState';

// #endregion

/** Shared dependencies and error reporting for focused orchestration collaborators. */
@Injectable()
export abstract class OrchestrationOperation {
  // #region Fields

  protected readonly _state: OrchestrationState;
  protected readonly _client: IOrchestrationApi;
  protected readonly _notifications: NotificationService;

  // #endregion

  // #region Ctor

  protected constructor(
    @Inject(OrchestrationState)
    state: OrchestrationState = inject(OrchestrationState),
    @Inject(ORCHESTRATION_CLIENT)
    client: IOrchestrationApi = inject(ORCHESTRATION_CLIENT),
    @Inject(NotificationService)
    notifications: NotificationService = inject(NotificationService),
  ) {
    this._state = state;
    this._client = client;
    this._notifications = notifications;
  }

  // #endregion

  // #region Methods

  /** Reports an operation failure with stable user-facing context. */
  protected showError(cause: unknown, fallback: string): void {
    this._notifications.showError(fallback, operatorErrorMessage(cause));
  }

  // #endregion
}

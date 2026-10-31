// #region Imports

import { Inject, inject, Injectable } from '@angular/core';
import type { IExecutionClient } from '../ports/IExecutionClient';
import { EXECUTION_CLIENT } from '../ports/ExecutionClientToken';

// #endregion

/** Isolated controls for the menu renderer, without constructing desktop snapshot synchronization. @public */
@Injectable()
export class ExecutionControls {
  // #region Ctor

  /** Connects only the typed execution request capability. @public */
  public constructor(
    @Inject(EXECUTION_CLIENT)
    private readonly _client: Pick<IExecutionClient, 'request'> = inject(EXECUTION_CLIENT),
  ) {}

  // #endregion

  // #region Methods

  /** Pauses a run while the calling surface owns its existing refresh and error policy. @public */
  public async pauseExecution(executionId: string): Promise<void> {
    await this._client.request('execution.pause', { executionId });
  }

  /** Resumes a run while the calling surface owns its existing refresh and error policy. @public */
  public async resumeExecution(executionId: string): Promise<void> {
    await this._client.request('execution.resume', { executionId });
  }

  // #endregion
}

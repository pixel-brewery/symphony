// #region Imports

import { Inject, inject, Injectable, signal } from '@angular/core';
import type { WorkflowProcessDto } from '@symphony/ipc-contracts-workflow';
import { NotificationService, operatorErrorMessage } from '@symphony/frontend-notification';
import type { IWorkflowOperations } from '@symphony/frontend-core/workflow';
import type { IWorkflowClient } from '../ports/IWorkflowClient';
import type { IWorkflowRefresh } from '../ports/IWorkflowRefresh';
import { WORKFLOW_CLIENT } from '../ports/WorkflowClientToken';
import { WORKFLOW_REFRESH } from '../ports/WorkflowRefreshToken';

// #endregion

/** Owns human workflow actions and their shared in-flight state. @public */
@Injectable()
export class WorkflowStore implements IWorkflowOperations {
  // #region Fields

  private readonly _workflowBusy = signal(false);
  /** Current human action state shared by Work and process surfaces. @public @readonly */
  public readonly workflowBusy = this._workflowBusy.asReadonly();

  // #endregion

  // #region Ctor

  /** Connects the typed workflow client and shared refresh owner. @public */
  public constructor(
    @Inject(WORKFLOW_CLIENT) private readonly _client: IWorkflowClient = inject(WORKFLOW_CLIENT),
    @Inject(WORKFLOW_REFRESH)
    private readonly _refresh: IWorkflowRefresh = inject(WORKFLOW_REFRESH),
    @Inject(NotificationService)
    private readonly _notifications: Pick<NotificationService, 'showError'> = inject(
      NotificationService,
    ),
  ) {}

  // #endregion

  // #region Methods

  /**
   * Runtime record and audit trail of one work item. Both are read on demand rather than kept
   * in the snapshot: only the process view needs them, and the trail grows with every run.
   *
   * @param workItemId - Work item id.
   * @public
   */
  public async loadWorkflowProcess(workItemId: string): Promise<WorkflowProcessDto | undefined> {
    try {
      return await this._client.request('workflow.get', { workItemId });
    } catch (cause) {
      this.showError(cause, 'Unable to load the process state.');
      return undefined;
    }
  }

  /**
   * Records a human decision for the work item's current gate. This is the only way past a
   * human gate: no run and no automation may take one.
   *
   * @param workItemId - Work item id.
   * @param optionId - Option id.
   * @param note - Note.
   * @public
   */
  public async decideWorkflow(workItemId: string, optionId: string, note?: string): Promise<void> {
    this._workflowBusy.set(true);
    try {
      await this._client.request('workflow.decide', {
        workItemId,
        optionId,
        ...(note ? { note } : {}),
      });
      await this._refresh.refresh();
    } catch (cause) {
      this.showError(cause, 'Unable to record the decision.');
    } finally {
      this._workflowBusy.set(false);
    }
  }

  /**
   * Answers or dismisses an open supervisor question. Gate decisions belong to gate stages;
   * this is the path for a question raised on an automated stage, and it resumes automation.
   *
   * @param workItemId - Work item id.
   * @param questionId - Question id.
   * @param option - Option.
   * @param note - Note.
   * @public
   */
  public async answerWorkflowQuestion(
    workItemId: string,
    questionId: string,
    option?: string,
    note?: string,
  ): Promise<void> {
    this._workflowBusy.set(true);
    try {
      await this._client.request('workflow.answer', {
        workItemId,
        questionId,
        ...(option ? { option } : {}),
        ...(note ? { note } : {}),
      });
      await this._refresh.refresh();
    } catch (cause) {
      this.showError(cause, 'Unable to record the answer.');
    } finally {
      this._workflowBusy.set(false);
    }
  }

  private showError(cause: unknown, fallback: string): void {
    this._notifications.showError(fallback, operatorErrorMessage(cause));
  }

  // #endregion
}

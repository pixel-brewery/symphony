// #region Imports

import { Inject, inject, Injectable, Optional, signal } from '@angular/core';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import {
  AUTOMATION_PREPARATION,
  type IAutomationPreparation,
} from '@symphony/frontend-core/automation';
import type { IRepositoryRuntimeOperations } from '@symphony/frontend-core/workspace';
import { NotificationService, operatorErrorMessage } from '@symphony/frontend-notification';
import type { ResponsePayload } from '@symphony/ipc-contracts-composition';
import type { IRepositoryRuntimeClient } from '../ports/IRepositoryRuntimeClient';
import { REPOSITORY_RUNTIME_CLIENT } from '../ports/RepositoryRuntimeClientToken';

// #endregion

/**
 * Owns repository preparation and verification with one shared operation guard.
 *
 * @public
 */
@Injectable()
export class RepositoryRuntimeStore implements IRepositoryRuntimeOperations {
  // #region Fields

  private readonly _repositoryRuntimeBusy = signal<string | undefined>(undefined);
  private readonly _verificationRunningRepositoryId = signal<string | undefined>(undefined);
  private readonly _repositoryRuntimeStatuses = signal<
    ResponsePayload<'repositories.runtime.list'>
  >([]);
  private readonly _verificationPlan = signal<ResponsePayload<'verification.plan'> | undefined>(
    undefined,
  );
  private readonly _verificationRun = signal<ResponsePayload<'verification.run'> | undefined>(
    undefined,
  );
  /**
   * Shared preparation, planning and verification exclusion.
   *
   * @public
   * @readonly
   */
  public readonly repositoryRuntimeBusy = this._repositoryRuntimeBusy.asReadonly();
  /**
   * Repository whose deterministic verification is running.
   *
   * @public
   * @readonly
   */
  public readonly verificationRunningRepositoryId =
    this._verificationRunningRepositoryId.asReadonly();
  /**
   * Confirmed local repository preparation states.
   *
   * @public
   * @readonly
   */
  public readonly repositoryRuntimeStatuses = this._repositoryRuntimeStatuses.asReadonly();
  /**
   * Most recently planned deterministic verification.
   *
   * @public
   * @readonly
   */
  public readonly verificationPlan = this._verificationPlan.asReadonly();
  /**
   * Most recently completed deterministic verification.
   *
   * @public
   * @readonly
   */
  public readonly verificationRun = this._verificationRun.asReadonly();

  // #endregion

  // #region Ctor

  /**
   * Connects native requests, the single settings writer and optional Automation preparation policy.
   *
   * @public
   */
  public constructor(
    @Inject(REPOSITORY_RUNTIME_CLIENT)
    private readonly _client: IRepositoryRuntimeClient = inject(REPOSITORY_RUNTIME_CLIENT),
    @Inject(ConfigurationStore)
    private readonly _configuration: Pick<ConfigurationStore, 'refreshSettings'> = inject(
      ConfigurationStore,
    ),
    @Optional()
    @Inject(AUTOMATION_PREPARATION)
    private readonly _preparation: IAutomationPreparation | null = inject(AUTOMATION_PREPARATION, {
      optional: true,
    }),
    @Inject(NotificationService)
    private readonly _notifications: Pick<
      NotificationService,
      'showError' | 'showSuccess' | 'showWarning'
    > = inject(NotificationService),
  ) {}

  // #endregion

  // #region Methods

  /**
   * Accepts the repository list read by the existing configuration hydration sequence.
   *
   * @public
   */
  public applyRepositoryRuntimeStatuses(
    statuses: ResponsePayload<'repositories.runtime.list'>,
  ): void {
    this._repositoryRuntimeStatuses.set(statuses);
  }

  /**
   * Returns the repository runtime status.
   *
   * @param repositoryBindingId - Repository binding id.
   * @public
   */
  public repositoryRuntimeStatus(repositoryBindingId: string) {
    return this._repositoryRuntimeStatuses().find(
      (status) => status.repositoryBindingId === repositoryBindingId,
    );
  }

  /**
   * Refreshes the repository runtime.
   *
   * @param repositoryBindingId - Repository binding id.
   * @public
   */
  public async refreshRepositoryRuntime(repositoryBindingId?: string): Promise<boolean> {
    try {
      const statuses = await this._client.request('repositories.runtime.list', {
        repositoryBindingId,
      });
      if (!repositoryBindingId) this._repositoryRuntimeStatuses.set(statuses);
      else if (statuses[0]) this.upsertRepositoryRuntimeStatus(statuses[0]);
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to inspect the local repository.');
      return false;
    }
  }

  /**
   * Prepares the repository.
   *
   * @param repositoryBindingId - Repository binding id.
   * @public
   */
  public async prepareRepository(repositoryBindingId: string): Promise<boolean> {
    if (this._repositoryRuntimeBusy()) return false;
    this._repositoryRuntimeBusy.set(repositoryBindingId);
    try {
      const status = await this._client.request('repositories.prepare', { repositoryBindingId });
      this.upsertRepositoryRuntimeStatus(status);
      await this._configuration.refreshSettings();
      this._preparation?.notifyUnpreparedAutomaticExecution();
      this._notifications.showSuccess('Repository prepared locally.');
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to prepare the repository locally.');
      return false;
    } finally {
      this._repositoryRuntimeBusy.set(undefined);
    }
  }

  /**
   * Returns the plan verification.
   *
   * @param repositoryBindingId - Repository binding id.
   * @public
   */
  public async planVerification(repositoryBindingId: string): Promise<boolean> {
    if (this._repositoryRuntimeBusy()) return false;
    this._repositoryRuntimeBusy.set(repositoryBindingId);
    try {
      this._verificationPlan.set(
        await this._client.request('verification.plan', { repositoryBindingId }),
      );
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to create a local verification plan.');
      return false;
    } finally {
      this._repositoryRuntimeBusy.set(undefined);
    }
  }

  /**
   * Runs the verification.
   *
   * @param repositoryBindingId - Repository binding id.
   * @param planId - Plan id.
   * @param approval - Approval.
   * @public
   */
  public async runVerification(
    repositoryBindingId: string,
    planId: string,
    approval: 'once' | 'repository' | 'stored',
  ): Promise<boolean> {
    if (this._repositoryRuntimeBusy()) return false;
    this._repositoryRuntimeBusy.set(repositoryBindingId);
    this._verificationRunningRepositoryId.set(repositoryBindingId);
    try {
      const run = await this._client.request('verification.run', {
        repositoryBindingId,
        planId,
        approval,
      });
      this._verificationRun.set(run);
      await this.refreshRepositoryRuntime(repositoryBindingId);
      if (run.state === 'succeeded') this._notifications.showSuccess('Local verification passed.');
      else
        this._notifications.showWarning(
          run.state === 'cancelled'
            ? 'Local verification cancelled.'
            : 'Local verification failed.',
          'Review the verification results before continuing.',
        );
      return run.state === 'succeeded';
    } catch (cause) {
      this.showError(cause, 'Unable to run local verification.');
      return false;
    } finally {
      this._verificationRunningRepositoryId.set(undefined);
      this._repositoryRuntimeBusy.set(undefined);
    }
  }

  /**
   * Cancels the verification.
   *
   * @param repositoryBindingId - Repository binding id.
   * @public
   */
  public async cancelVerification(repositoryBindingId: string): Promise<void> {
    try {
      await this._client.request('verification.cancel', { repositoryBindingId });
    } catch (cause) {
      this.showError(cause, 'Unable to cancel local verification.');
    }
  }

  private upsertRepositoryRuntimeStatus(status: ResponsePayload<'repositories.prepare'>): void {
    this._repositoryRuntimeStatuses.update((statuses) => [
      ...statuses.filter(
        (candidate) => candidate.repositoryBindingId !== status.repositoryBindingId,
      ),
      status,
    ]);
  }

  private showError(cause: unknown, fallback: string): void {
    this._notifications.showError(fallback, operatorErrorMessage(cause));
  }

  // #endregion
}

// #region Imports

import { Inject, inject, Injectable, signal, type Signal } from '@angular/core';
import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';
import type { IWorkConnectionOperations } from '@symphony/frontend-core/work';
import { NotificationService, operatorErrorMessage } from '@symphony/frontend-notification';
import type { IWorkConnectionClient } from '../ports/IWorkConnectionClient';
import type { IWorkConnectionProjection } from '../ports/IWorkConnectionProjection';
import type { IWorkConnectionRefresh } from '../ports/IWorkConnectionRefresh';
import { WORK_CONNECTION_CLIENT } from '../ports/WorkConnectionClientToken';
import { WORK_CONNECTION_PROJECTION } from '../ports/WorkConnectionProjectionToken';
import { WORK_CONNECTION_REFRESH } from '../ports/WorkConnectionRefreshToken';

// #endregion

/** Owns the existing Work source-account operations and their one connection lifecycle. @public */
@Injectable()
export class SourceConnectionStore implements IWorkConnectionOperations {
  // #region Fields
  private readonly _connectionBusy = signal(false);
  private readonly _publicConnectionBusy = this._connectionBusy.asReadonly();
  // #endregion
  // #region Ctor
  /** Connects existing transport, projection and reconciliation owners without another settings writer. @public */
  public constructor(
    @Inject(WORK_CONNECTION_CLIENT)
    private readonly _client: IWorkConnectionClient = inject(WORK_CONNECTION_CLIENT),
    @Inject(WORK_CONNECTION_PROJECTION)
    private readonly _projection: IWorkConnectionProjection = inject(WORK_CONNECTION_PROJECTION),
    @Inject(WORK_CONNECTION_REFRESH)
    private readonly _refresh: IWorkConnectionRefresh = inject(WORK_CONNECTION_REFRESH),
    @Inject(NotificationService)
    private readonly _notifications: Pick<
      NotificationService,
      'showSuccess' | 'showInfo' | 'showError'
    > = inject(NotificationService),
  ) {}
  // #endregion
  // #region Properties
  /** The sole Work source-authentication lifecycle, consumed by the shared writer's readonly exclusion. @public @readonly */
  public get connectionBusy(): Signal<boolean> {
    return this._publicConnectionBusy;
  }
  // #endregion
  // #region Methods
  /**
   * Lists the git hub projects.
   *
   * @param input - Input.
   * @public
   */
  public async listGitHubProjects(
    input: RequestPayload<'github.projects.list'>,
  ): Promise<ResponsePayload<'github.projects.list'>> {
    try {
      return await this._client.request('github.projects.list', input);
    } catch (cause) {
      return { projects: [], error: cause instanceof Error ? cause.message : String(cause) };
    }
  }
  /**
   * Reads the provider columns of a (possibly unsaved) work-item source for the board editor.
   *
   * @param input - Input.
   * @public
   */
  public async listWorkItemSourceColumns(
    input: RequestPayload<'work-item-sources.columns'>,
  ): Promise<ResponsePayload<'work-item-sources.columns'>> {
    try {
      return await this._client.request('work-item-sources.columns', input);
    } catch (cause) {
      return { columns: [], error: cause instanceof Error ? cause.message : String(cause) };
    }
  }
  /**
   * Connects the git hub.
   *
   * @param input - Input.
   * @public
   */
  public async connectGitHub(
    input:
      | { mode: 'browser'; hostname: string; gitProtocol: 'https' | 'ssh' }
      | { mode: 'token'; hostname: string; gitProtocol: 'https' | 'ssh'; token: string },
  ): Promise<boolean> {
    return this.runConfigurationOperation('github.login.start', input);
  }
  /**
   * Verifies and stores one Azure DevOps personal access token in the operating-system vault.
   *
   * @param connectionId - Connection id.
   * @param token - Personal access token.
   * @public
   */
  public async connectAzureDevOps(connectionId: string, token: string): Promise<boolean> {
    return this.runConfigurationOperation('azure-devops.login.start', { connectionId, token });
  }
  /**
   * Removes the Azure DevOps credential from the operating-system vault.
   *
   * @param connectionId - Connection id.
   * @public
   */
  public async disconnectAzureDevOps(connectionId: string): Promise<boolean> {
    return this.runConfigurationOperation('azure-devops.logout', { connectionId });
  }
  /**
   * Disconnects the git hub.
   *
   * @param hostname - Hostname.
   * @param login - Login.
   * @public
   */
  public async disconnectGitHub(hostname: string, login: string): Promise<boolean> {
    return this.runConfigurationOperation('github.logout', { hostname, login });
  }

  private async runConfigurationOperation<
    M extends
      'azure-devops.login.start' | 'azure-devops.logout' | 'github.login.start' | 'github.logout',
  >(method: M, payload: RequestPayload<M>): Promise<boolean> {
    this._connectionBusy.set(true);
    try {
      const result = await this._client.request(method, payload);
      if (result.status === 'completed') {
        this._notifications.showSuccess(result.message);
      } else {
        this._notifications.showInfo(result.message);
      }
      if (result.status === 'completed') {
        this._projection.applyProviderConnections(
          await this._client.request('connections.get', {}),
        );
        if (method === 'azure-devops.login.start' || method === 'azure-devops.logout') {
          await this._refresh.refreshSettings();
        }
        if (method === 'github.login.start' || method === 'github.logout') {
          await this._refresh.refreshContinuousIntegrationUsage(undefined, true);
        }
      }
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to update provider connection.');
      return false;
    } finally {
      this._connectionBusy.set(false);
    }
  }
  /** Preserves the existing provider-neutral operation error detail formatter. @private */
  private showError(cause: unknown, fallback: string): void {
    this._notifications.showError(fallback, operatorErrorMessage(cause));
  }
  // #endregion
}

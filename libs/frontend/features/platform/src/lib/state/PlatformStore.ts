// #region Imports

import { DOCUMENT } from '@angular/common';
import { DestroyRef, Inject, inject, Injectable, signal } from '@angular/core';
import type { IExternalServiceIncident } from '@symphony/domain-platform';
import type { IPlatformOperations } from '@symphony/frontend-core/platform';
import { NotificationService, operatorErrorMessage } from '@symphony/frontend-notification';
import type { RequestPayload } from '@symphony/ipc-contracts-composition';
import type { IPlatformClient } from '../ports/IPlatformClient';
import type { IPlatformHealthProjection } from '../ports/IPlatformHealthProjection';
import { PLATFORM_CLIENT } from '../ports/PlatformClientToken';
import { PLATFORM_HEALTH_PROJECTION } from '../ports/PlatformHealthProjectionToken';

// #endregion

/**
 * Owns native tool inspection and installation exclusion without copying snapshot health.
 *
 * @public
 */
@Injectable()
export class PlatformStore implements IPlatformOperations {
  // #region Fields

  private readonly _window: Window;
  private _externalServiceIncidentRefreshTimer: number | undefined;
  private _incidentsInitialized = false;
  private _incidentsDisposed = false;
  private readonly _externalServiceIncidents = signal<readonly IExternalServiceIncident[]>([]);
  /**
   * Confirmed upstream incidents without replacing the last confirmed read on failure.
   *
   * @public
   * @readonly
   */
  public readonly externalServiceIncidents = this._externalServiceIncidents.asReadonly();

  private readonly _runtimeHealthBusy = signal(false);
  private readonly _runtimeDependencyInstallBusy = signal<
    RequestPayload<'runtime-dependencies.install'>['command'] | undefined
  >(undefined);
  /**
   * Shared native inspection activity.
   *
   * @public
   * @readonly
   */
  public readonly runtimeHealthBusy = this._runtimeHealthBusy.asReadonly();
  /**
   * The single active native installation, shared with account settings.
   *
   * @public
   * @readonly
   */
  public readonly runtimeDependencyInstallBusy = this._runtimeDependencyInstallBusy.asReadonly();

  // #endregion

  // #region Ctor

  /**
   * Connects the native request boundary and existing snapshot health owner.
   *
   * @public
   */
  public constructor(
    @Inject(PLATFORM_CLIENT) private readonly _client: IPlatformClient = inject(PLATFORM_CLIENT),
    @Inject(PLATFORM_HEALTH_PROJECTION)
    private readonly _projection: IPlatformHealthProjection = inject(PLATFORM_HEALTH_PROJECTION),
    @Inject(NotificationService)
    private readonly _notifications: Pick<
      NotificationService,
      'showError' | 'showSuccess'
    > = inject(NotificationService),
    @Inject(DOCUMENT) document: Document = inject(DOCUMENT),
    @Inject(DestroyRef) destroyRef: DestroyRef = inject(DestroyRef),
  ) {
    const browserWindow = document.defaultView;
    if (!browserWindow) throw new Error('Platform status requires a browser window.');
    this._window = browserWindow;
    destroyRef.onDestroy(() => this.disposeIncidents());
  }

  // #endregion

  // #region Properties

  /**
   * Reads health from its sole transport projection.
   *
   * @public
   * @readonly
   */
  public get runtimeHealth() {
    return this._projection.runtimeHealth;
  }

  // #endregion

  // #region Methods

  /**
   * Refreshes the runtime health.
   *
   * @param silent - Silent.
   * @public
   */
  public async refreshRuntimeHealth(silent = false): Promise<void> {
    if (this._runtimeHealthBusy()) return;
    this._runtimeHealthBusy.set(true);
    try {
      const health = await this._client.request('health.get', {});
      this._projection.updateRuntimeHealth(health);
    } catch (cause) {
      if (!silent) this.showError(cause, 'Unable to inspect developer tools.');
    } finally {
      this._runtimeHealthBusy.set(false);
    }
  }

  /**
   * Installs the runtime dependency.
   *
   * @param command - Command.
   * @public
   */
  public async installRuntimeDependency(
    command: RequestPayload<'runtime-dependencies.install'>['command'],
  ): Promise<boolean> {
    if (this._runtimeDependencyInstallBusy()) return false;
    this._runtimeDependencyInstallBusy.set(command);
    try {
      const health = await this._client.request('runtime-dependencies.install', { command });
      this._projection.updateRuntimeHealth(health);
      this._notifications.showSuccess(
        `${this.runtimeDependencyLabel(command)} installed.`,
        'The command is ready for Symphony.',
      );
      return true;
    } catch (cause) {
      this.showError(cause, `Unable to install ${this.runtimeDependencyLabel(command)}.`);
      return false;
    } finally {
      this._runtimeDependencyInstallBusy.set(undefined);
    }
  }

  private runtimeDependencyLabel(
    command: RequestPayload<'runtime-dependencies.install'>['command'],
  ): string {
    switch (command) {
      case 'git':
        return 'Git';
      case 'gh':
        return 'GitHub CLI';
      case 'codex':
        return 'Codex CLI';
      case 'claude':
        return 'Claude Code CLI';
      case 'opencode':
        return 'OpenCode CLI';
    }
  }

  private showError(cause: unknown, fallback: string): void {
    this._notifications.showError(fallback, operatorErrorMessage(cause));
  }

  /**
   * Starts incident synchronization once for the renderer.
   *
   * @public
   */
  public initializeIncidents(): void {
    if (this._incidentsInitialized) return;
    this._incidentsInitialized = true;
    void this.refreshExternalServiceIncidents();
  }

  private disposeIncidents(): void {
    this._incidentsDisposed = true;
    if (this._externalServiceIncidentRefreshTimer !== undefined) {
      this._window.clearTimeout(this._externalServiceIncidentRefreshTimer);
    }
  }

  private async refreshExternalServiceIncidents(): Promise<void> {
    try {
      this._externalServiceIncidents.set(
        await this._client.request('external-services.incidents.get', {}),
      );
    } catch {
      // Status-page availability must not replace the most recent confirmed state.
    } finally {
      this.scheduleExternalServiceIncidentRefresh();
    }
  }

  private scheduleExternalServiceIncidentRefresh(): void {
    if (this._incidentsDisposed) return;
    if (this._externalServiceIncidentRefreshTimer !== undefined) {
      this._window.clearTimeout(this._externalServiceIncidentRefreshTimer);
    }
    this._externalServiceIncidentRefreshTimer = this._window.setTimeout(() => {
      this._externalServiceIncidentRefreshTimer = undefined;
      void this.refreshExternalServiceIncidents();
    }, 60_000);
  }

  // #endregion
}

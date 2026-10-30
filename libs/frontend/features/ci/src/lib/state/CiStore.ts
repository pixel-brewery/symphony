// #region Imports

import { DOCUMENT } from '@angular/common';
import {
  DestroyRef,
  Inject,
  inject,
  Injectable,
  Optional,
  signal,
  type Signal,
} from '@angular/core';
import type { ICiRun, ICiWorkflow } from '@symphony/domain-ci';
import type { IRemoteDataStatus } from '@symphony/domain-core';
import { type ICiOperations } from '@symphony/frontend-core';
import { NotificationService, operatorErrorMessage } from '@symphony/frontend-notification';
import type { ResponsePayload } from '@symphony/ipc-contracts-composition';
import type { ICiClient } from '../ports/ICiClient';
import type { ICiContext } from '../ports/ICiContext';
import type { ICiProjection } from '../ports/ICiProjection';
import { CI_CLIENT } from '../ports/CiClientToken';
import { CI_CONTEXT } from '../ports/CiContextToken';
import { CI_PROJECTION } from '../ports/CiProjectionToken';
import { continuousIntegrationRefreshDelay } from '@symphony/frontend-core/delivery';
import type { ContinuousIntegrationUsageReportDto } from '@symphony/ipc-contracts-ci';
import type { ICiUsageContext } from '../ports/ICiUsageContext';
import { CI_USAGE_CONTEXT } from '../ports/CiUsageContextToken';

// #endregion

/**
 * Owns CI operations, local-runner state and the bounded refresh lifecycle.
 *
 * @public
 */
@Injectable()
export class CiStore implements ICiOperations {
  // #region Fields

  private readonly _context: ICiContext;
  private readonly _usageContext: ICiUsageContext | null;
  private readonly _continuousIntegrationUsage = signal<
    readonly ContinuousIntegrationUsageReportDto[]
  >([]);
  private readonly _continuousIntegrationUsageBusy = signal(false);
  private readonly _publicContinuousIntegrationUsage =
    this._continuousIntegrationUsage.asReadonly();
  private readonly _publicContinuousIntegrationUsageBusy =
    this._continuousIntegrationUsageBusy.asReadonly();
  private readonly _projection: ICiProjection;
  private readonly _client: ICiClient;
  private readonly _notifications: Pick<NotificationService, 'showSuccess' | 'showError'>;
  private _destroyed = false;
  private readonly _localCiRunningRunId = signal<string | undefined>(undefined);
  private readonly _localCiStartedAt = signal<string | undefined>(undefined);
  private readonly _localCiCleanupBusy = signal<boolean>(false);
  private readonly _runnerImageCatalog = signal<
    ResponsePayload<'local-ci.images.list'> | undefined
  >(undefined);
  private readonly _runnerImageBusy = signal<boolean>(false);
  private readonly _localCiInstances = signal<
    ResponsePayload<'local-ci.instances.list'> | undefined
  >(undefined);
  private readonly _localCiInstanceRemoving = signal<string | undefined>(undefined);
  private readonly _localCiInstancesBusy = signal<boolean>(false);
  private readonly _continuousIntegrationRunsBusy = signal<boolean>(false);
  private readonly _publicLocalCiRunningRunId = this._localCiRunningRunId.asReadonly();
  private readonly _publicLocalCiStartedAt = this._localCiStartedAt.asReadonly();
  private readonly _publicLocalCiCleanupBusy = this._localCiCleanupBusy.asReadonly();
  private readonly _publicRunnerImageCatalog = this._runnerImageCatalog.asReadonly();
  private readonly _publicRunnerImageBusy = this._runnerImageBusy.asReadonly();
  private readonly _publicLocalCiInstances = this._localCiInstances.asReadonly();
  private readonly _publicLocalCiInstanceRemoving = this._localCiInstanceRemoving.asReadonly();
  private readonly _publicLocalCiInstancesBusy = this._localCiInstancesBusy.asReadonly();
  private readonly _publicContinuousIntegrationRunsBusy =
    this._continuousIntegrationRunsBusy.asReadonly();
  private readonly _window: Window;
  private _localCiRequestRunId?: string;
  private _localCiInstancesAutoRefreshBlocked = false;
  private _refreshInFlight?: Promise<void>;
  private _refreshRequested = false;
  private _runnerImageAutoRefreshBlocked = false;
  private _workflowCatalogRefreshRequested = false;
  private _refreshTimer?: number;

  // #endregion

  // #region Ctor

  /**
   * Constructs the CI store for the active renderer window.
   *
   * @public
   */
  public constructor(
    @Inject(CI_CONTEXT) context: ICiContext = inject(CI_CONTEXT),
    @Inject(CI_PROJECTION) projection: ICiProjection = inject(CI_PROJECTION),
    @Inject(CI_CLIENT) client: ICiClient = inject(CI_CLIENT),
    @Inject(NotificationService)
    notifications: Pick<NotificationService, 'showSuccess' | 'showError'> = inject(
      NotificationService,
    ),
    @Inject(DOCUMENT)
    document: Document = inject(DOCUMENT),
    @Inject(DestroyRef)
    destroyRef: DestroyRef = inject(DestroyRef),
    @Inject(CI_USAGE_CONTEXT)
    @Optional()
    usageContext: ICiUsageContext | null = inject(CI_USAGE_CONTEXT, { optional: true }),
  ) {
    this._context = context;
    this._usageContext = usageContext;
    this._projection = projection;
    this._client = client;
    this._notifications = notifications;
    const browserWindow = document.defaultView;
    if (!browserWindow) throw new Error('Continuous-integration state requires a browser window.');
    this._window = browserWindow;
    destroyRef.onDestroy(() => {
      this._destroyed = true;
      if (this._refreshTimer !== undefined) this._window.clearTimeout(this._refreshTimer);
    });
  }

  // #endregion

  // #region Properties

  /** Current feature-owned repository usage reports. @public @readonly */
  public get continuousIntegrationUsage(): Signal<readonly ContinuousIntegrationUsageReportDto[]> {
    return this._publicContinuousIntegrationUsage;
  }
  /** The existing usage-request busy identity. @public @readonly */
  public get continuousIntegrationUsageBusy(): Signal<boolean> {
    return this._publicContinuousIntegrationUsageBusy;
  }
  /** The CI-owned read-only local-run availability projection. @public @readonly */
  public get localCiEnabledWorkspaceIds(): Signal<ReadonlySet<string>> {
    return this._context.localCiEnabledWorkspaceIds;
  }

  /**
   * Read-only feature-owned localCiRunningRunId state.
   *
   * @public
   * @readonly
   */
  public get localCiRunningRunId(): Signal<string | undefined> {
    return this._publicLocalCiRunningRunId;
  }

  /**
   * Read-only feature-owned localCiStartedAt state.
   *
   * @public
   * @readonly
   */
  public get localCiStartedAt(): Signal<string | undefined> {
    return this._publicLocalCiStartedAt;
  }

  /**
   * Read-only feature-owned localCiCleanupBusy state.
   *
   * @public
   * @readonly
   */
  public get localCiCleanupBusy(): Signal<boolean> {
    return this._publicLocalCiCleanupBusy;
  }

  /**
   * Read-only feature-owned runnerImageCatalog state.
   *
   * @public
   * @readonly
   */
  public get runnerImageCatalog(): Signal<ResponsePayload<'local-ci.images.list'> | undefined> {
    return this._publicRunnerImageCatalog;
  }

  /**
   * Read-only feature-owned runnerImageBusy state.
   *
   * @public
   * @readonly
   */
  public get runnerImageBusy(): Signal<boolean> {
    return this._publicRunnerImageBusy;
  }

  /**
   * Read-only feature-owned localCiInstances state.
   *
   * @public
   * @readonly
   */
  public get localCiInstances(): Signal<ResponsePayload<'local-ci.instances.list'> | undefined> {
    return this._publicLocalCiInstances;
  }

  /**
   * Read-only feature-owned localCiInstanceRemoving state.
   *
   * @public
   * @readonly
   */
  public get localCiInstanceRemoving(): Signal<string | undefined> {
    return this._publicLocalCiInstanceRemoving;
  }

  /**
   * Read-only feature-owned localCiInstancesBusy state.
   *
   * @public
   * @readonly
   */
  public get localCiInstancesBusy(): Signal<boolean> {
    return this._publicLocalCiInstancesBusy;
  }

  /**
   * Read-only feature-owned continuousIntegrationRunsBusy state.
   *
   * @public
   * @readonly
   */
  public get continuousIntegrationRunsBusy(): Signal<boolean> {
    return this._publicContinuousIntegrationRunsBusy;
  }

  /**
   * Read-only runs from the authoritative aggregate projection.
   *
   * @public
   * @readonly
   */
  public get runs(): Signal<readonly ICiRun[]> {
    return this._context.runs;
  }

  /**
   * Read-only workflows from the authoritative aggregate projection.
   *
   * @public
   * @readonly
   */
  public get workflows(): Signal<readonly ICiWorkflow[]> {
    return this._context.workflows;
  }

  /**
   * Read-only remoteData from the authoritative aggregate projection.
   *
   * @public
   * @readonly
   */
  public get remoteData(): Signal<IRemoteDataStatus | undefined> {
    return this._context.remoteData;
  }

  // #endregion

  // #region Methods

  /**
   * Whether local GitHub Actions may run for the workspace that owns a run, workflow, or item.
   *
   * @param workspaceId - Workspace id.
   * @public
   */
  public localCiEnabledFor(workspaceId: string | undefined): boolean {
    return workspaceId !== undefined && this._context.localCiEnabledWorkspaceIds().has(workspaceId);
  }

  /**
   * Refreshes the continuous integration runs.
   *
   * @param includeWorkflowCatalog - Also refresh repository workflow definitions and capabilities.
   * @public
   */
  public refreshContinuousIntegrationRuns(includeWorkflowCatalog = false): Promise<void> {
    if (this._refreshInFlight) {
      this._refreshRequested = true;
      this._workflowCatalogRefreshRequested ||= includeWorkflowCatalog;
      return this._refreshInFlight;
    }
    this._workflowCatalogRefreshRequested = includeWorkflowCatalog;
    this._refreshInFlight = this.drainContinuousIntegrationRefreshes();
    return this._refreshInFlight;
  }

  /**
   * Loads the continuous integration run details.
   *
   * @param runId - Run id.
   * @public
   */
  public loadContinuousIntegrationRunDetails(
    runId: string,
  ): Promise<ResponsePayload<'ci.run.details'>> {
    return this._client.request('ci.run.details', { runId });
  }

  /**
   * Loads the continuous integration run log.
   *
   * @param runId - Run id.
   * @param kind - Kind.
   * @param offset - Offset.
   * @public
   */
  public loadContinuousIntegrationRunLog(
    runId: string,
    kind: 'output' | 'failure',
    offset: number,
  ): Promise<ResponsePayload<'ci.run.log'>> {
    return this._client.request('ci.run.log', { runId, kind, offset });
  }

  /**
   * Cancels the CI run.
   *
   * @param runId - Run id.
   * @public
   */
  public async cancelCiRun(runId: string): Promise<void> {
    try {
      await this._client.request('ci.cancel', { runId });
      this._notifications.showSuccess('CI run cancellation requested.');
      await this.refreshContinuousIntegrationRuns();
    } catch (cause) {
      this.showError(cause, 'Unable to cancel the CI run.');
    }
  }

  /**
   * Returns the rerun CI run.
   *
   * @param runId - Run id.
   * @public
   */
  public async rerunCiRun(runId: string): Promise<void> {
    try {
      await this._client.request('ci.rerun', { runId });
      this._notifications.showSuccess('CI rerun requested.');
      await this.refreshContinuousIntegrationRuns();
    } catch (cause) {
      this.showError(cause, 'Unable to rerun the CI run.');
    }
  }

  /**
   * Dispatches the CI workflow.
   *
   * @param workflowId - Workflow id.
   * @param ref - Ref.
   * @public
   */
  public async dispatchCiWorkflow(
    workflowId: string,
    ref: string,
    inputs?: Readonly<Record<string, string>>,
  ): Promise<void> {
    try {
      const run = await this._client.request('ci.workflow.dispatch', { workflowId, ref, inputs });
      this._projection.prependRun(run);
      this._notifications.showSuccess('The workflow was started on GitHub Actions.');
      this.scheduleContinuousIntegrationRefresh();
    } catch (cause) {
      this.showError(cause, 'Unable to start the workflow.');
    }
  }

  /**
   * Runs the CI workflow locally.
   *
   * @param workflowId - Workflow id.
   * @param ref - Ref.
   * @public
   */
  public async runCiWorkflowLocally(workflowId: string, ref: string): Promise<void> {
    if (this._localCiRunningRunId()) return;
    const requestId = `workflow:${workflowId}`;
    this._localCiRequestRunId = requestId;
    this._localCiRunningRunId.set(requestId);
    this._localCiStartedAt.set(new Date().toISOString());
    try {
      const execution = await this._client.request('ci.workflow.local.run', { workflowId, ref });
      if (execution.state === 'succeeded') {
        this._notifications.showSuccess('The workflow passed on the local runner.');
      } else if (execution.state === 'cancelled') {
        this._notifications.showSuccess('The local workflow run was stopped.');
      } else {
        this._notifications.showError('The workflow failed on the local runner.');
      }
    } catch (cause) {
      this.showError(cause, 'Unable to run the workflow locally.');
    } finally {
      if (this._localCiRequestRunId === requestId) this._localCiRequestRunId = undefined;
      if (this._localCiRunningRunId() === requestId) {
        this._localCiRunningRunId.set(undefined);
        this._localCiStartedAt.set(undefined);
      }
      await this.refreshContinuousIntegrationRuns();
    }
  }

  /**
   * Runs the CI locally.
   *
   * @param runId - Run id.
   * @public
   */
  public async runCiLocally(runId: string): Promise<void> {
    if (this._localCiRunningRunId()) return;
    this._localCiRequestRunId = runId;
    this._localCiRunningRunId.set(runId);
    this._localCiStartedAt.set(new Date().toISOString());
    this.scheduleContinuousIntegrationRefresh();
    try {
      const execution = await this._client.request('ci.local.run', { runId });
      if (execution.state === 'succeeded') {
        this._notifications.showSuccess('The CI workflow passed on the local runner.');
      } else if (execution.state === 'cancelled') {
        this._notifications.showSuccess('The local CI run was stopped.');
      } else {
        this._notifications.showError('The CI workflow failed on the local runner.');
      }
    } catch (cause) {
      this.showError(cause, 'Unable to run the CI workflow locally.');
    } finally {
      if (this._localCiRequestRunId === runId) this._localCiRequestRunId = undefined;
      if (this._localCiRunningRunId() === runId) {
        this._localCiRunningRunId.set(undefined);
        this._localCiStartedAt.set(undefined);
      }
      await this.refreshContinuousIntegrationRuns();
    }
  }

  /**
   * Cancels the local CI run.
   *
   * @param runId - Run id.
   * @public
   */
  public async cancelLocalCiRun(runId: string): Promise<void> {
    try {
      await this._client.request('ci.local.cancel', { runId });
    } catch (cause) {
      this.showError(cause, 'Unable to stop the local CI runner.');
    }
  }

  /**
   * Loads the selectable GitHub runner image releases for this Mac's architecture.
   *
   * @param refresh - Refresh.
   * @public
   */
  public async refreshRunnerImages(refresh = false): Promise<void> {
    if (this._runnerImageBusy() || (!refresh && this._runnerImageAutoRefreshBlocked)) return;
    this._runnerImageAutoRefreshBlocked = true;
    this._runnerImageBusy.set(true);
    try {
      this._runnerImageCatalog.set(await this._client.request('local-ci.images.list', { refresh }));
      this._runnerImageAutoRefreshBlocked = false;
    } catch (cause) {
      this.showError(cause, 'Unable to load the runner image catalog.');
    } finally {
      this._runnerImageBusy.set(false);
    }
  }

  /**
   * Pins one runner image release as the guest image of a workspace.
   *
   * @param workspaceId - Workspace id.
   * @param releaseTag - Release tag.
   * @public
   */
  public async selectRunnerImage(workspaceId: string, releaseTag: string): Promise<boolean> {
    if (this._runnerImageBusy()) return false;
    this._runnerImageBusy.set(true);
    try {
      const result = await this._client.request('local-ci.image.select', {
        workspaceId,
        releaseTag,
      });
      this._runnerImageCatalog.update((catalog) =>
        catalog
          ? {
              ...catalog,
              selections: catalog.selections.map((selection) =>
                selection.workspaceId === workspaceId
                  ? { ...selection, image: result.image }
                  : selection,
              ),
            }
          : catalog,
      );
      this._notifications.showSuccess(
        'Guest image updated.',
        `Ubuntu ${result.image.ubuntuVersion} with ${result.image.aptPackages.length} declared packages and Node.js ${result.image.nodeVersion}.`,
      );
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to select the runner image.');
      return false;
    } finally {
      this._runnerImageBusy.set(false);
    }
  }

  /**
   * Loads the managed machines that currently occupy disk under the runner data root.
   *
   * @param force - Retry even when the previous automatic refresh failed.
   * @public
   */
  public async refreshLocalCiInstances(force = false): Promise<void> {
    if (this._localCiInstancesBusy() || (!force && this._localCiInstancesAutoRefreshBlocked)) {
      return;
    }
    this._localCiInstancesAutoRefreshBlocked = true;
    this._localCiInstancesBusy.set(true);
    try {
      this._localCiInstances.set(await this._client.request('local-ci.instances.list', {}));
      this._localCiInstancesAutoRefreshBlocked = false;
    } catch (cause) {
      this.showError(cause, 'Unable to list the local runner machines.');
    } finally {
      this._localCiInstancesBusy.set(false);
    }
  }

  /**
   * Removes one machine automatic cleanup left behind.
   *
   * @param name - Name.
   * @public
   */
  public async removeLocalCiInstance(name: string): Promise<boolean> {
    if (this._localCiInstanceRemoving()) return false;
    this._localCiInstanceRemoving.set(name);
    try {
      const result = await this._client.request('local-ci.instances.remove', { name });
      this._localCiInstances.update((current) =>
        current ? { ...current, instances: result.instances } : current,
      );
      this._notifications.showSuccess('Machine removed.', `${name} no longer uses disk.`);
      return result.removed;
    } catch (cause) {
      this.showError(cause, 'Unable to remove the machine.');
      return false;
    } finally {
      this._localCiInstanceRemoving.set(undefined);
      await this.refreshStorageStatus(true);
    }
  }

  /**
   * Clears the local CI data.
   *
   * @public
   */
  public async clearLocalCiData(): Promise<boolean> {
    if (this._localCiCleanupBusy() || this._localCiRunningRunId()) return false;
    this._localCiCleanupBusy.set(true);
    try {
      const result = await this._client.request('ci.local.cleanup', {});
      const removed = result.removedInstances + result.removedConfigurationFiles;
      this._notifications.showSuccess(
        'Local runner data cleared.',
        removed ? `${removed} inactive runner item${removed === 1 ? '' : 's'} removed.` : undefined,
      );
      return result.cacheCleared;
    } catch (cause) {
      this.showError(cause, 'Unable to clear local runner data.');
      return false;
    } finally {
      this._localCiCleanupBusy.set(false);
      this._localCiInstances.set(undefined);
      await Promise.all([this.refreshStorageStatus(true), this.refreshLocalCiInstances(true)]);
    }
  }

  private async drainContinuousIntegrationRefreshes(): Promise<void> {
    this._continuousIntegrationRunsBusy.set(true);
    try {
      do {
        this._refreshRequested = false;
        const includeWorkflowCatalog = this._workflowCatalogRefreshRequested;
        this._workflowCatalogRefreshRequested = false;
        try {
          const result = await this._client.request(
            'ci.runs.refresh',
            includeWorkflowCatalog ? { includeWorkflowCatalog: true } : {},
          );
          if (result.activeLocalCiRun) {
            this._localCiRunningRunId.set(result.activeLocalCiRun.runId);
            this._localCiStartedAt.set(result.activeLocalCiRun.startedAt);
          } else if (!this._localCiRequestRunId) {
            this._localCiRunningRunId.set(undefined);
            this._localCiStartedAt.set(undefined);
          }
          this._projection.applyRefresh(result);
        } catch (cause) {
          this.showError(cause, 'Unable to refresh CI runs.');
        }
      } while (this._refreshRequested);
    } finally {
      this._refreshInFlight = undefined;
      this._continuousIntegrationRunsBusy.set(false);
      this.scheduleContinuousIntegrationRefresh();
    }
  }

  private scheduleContinuousIntegrationRefresh(): void {
    if (this._refreshTimer !== undefined) {
      this._window.clearTimeout(this._refreshTimer);
      this._refreshTimer = undefined;
    }
    if (this._destroyed) return;
    const runs = this._context.runs();
    const delay = continuousIntegrationRefreshDelay(
      Boolean(this._localCiRunningRunId()),
      runs,
      this._context.remoteData()?.state,
    );
    if (delay === undefined) return;
    this._refreshTimer = this._window.setTimeout(() => {
      this._refreshTimer = undefined;
      void this.refreshContinuousIntegrationRuns();
    }, delay);
  }

  private async refreshStorageStatus(silent: boolean): Promise<void> {
    try {
      this._projection.updateStorageStatus(await this._client.request('storage.status.get', {}));
    } catch (cause) {
      if (!silent) this.showError(cause, 'Unable to load storage status.');
    }
  }

  private showError(cause: unknown, fallback: string): void {
    this._notifications.showError(fallback, operatorErrorMessage(cause));
  }

  /**
   * Returns the continuous integration usage report.
   *
   * @param repositoryBindingId - Repository binding id.
   * @public
   */
  public continuousIntegrationUsageReport(repositoryBindingId: string) {
    return this._continuousIntegrationUsage().find(
      (report) => report.repositoryBindingId === repositoryBindingId,
    );
  }

  /**
   * Refreshes the continuous integration usage.
   *
   * @param repositoryBindingIds - Repository binding ids.
   * @param silent - Silent.
   * @public
   */
  public async refreshContinuousIntegrationUsage(
    repositoryBindingIds?: readonly string[],
    silent = false,
  ): Promise<boolean> {
    const resolvedRepositoryBindingIds = [
      ...new Set(repositoryBindingIds ?? this.activeContinuousIntegrationRepositoryBindingIds()),
    ];
    if (!resolvedRepositoryBindingIds.length) {
      this._continuousIntegrationUsage.set([]);
      return true;
    }
    this._continuousIntegrationUsageBusy.set(true);
    try {
      this._continuousIntegrationUsage.set(
        await this._client.request('ci.usage.get', {
          repositoryBindingIds: resolvedRepositoryBindingIds,
        }),
      );
      return true;
    } catch (cause) {
      this._continuousIntegrationUsage.set([]);
      if (!silent) this.showError(cause, 'Unable to load GitHub Actions usage.');
      return false;
    } finally {
      this._continuousIntegrationUsageBusy.set(false);
    }
  }

  private activeContinuousIntegrationRepositoryBindingIds(): readonly string[] {
    const settings = this._usageContext?.settings();
    if (!settings) return [];
    const selectedWorkspaceIds = new Set(settings.activeViewScope.workspaceIds);
    const enabledRepositoryIds = new Set(
      settings.repositoryBindings
        .filter(
          (repository) =>
            repository.enabled &&
            repository.provider === 'github' &&
            selectedWorkspaceIds.has(repository.workspaceId),
        )
        .map((repository) => repository.id),
    );
    return settings.ciBindings
      .filter(
        (binding) =>
          binding.enabled &&
          binding.provider === 'github-actions' &&
          enabledRepositoryIds.has(binding.repositoryBindingId),
      )
      .map((binding) => binding.repositoryBindingId);
  }

  // #endregion
}

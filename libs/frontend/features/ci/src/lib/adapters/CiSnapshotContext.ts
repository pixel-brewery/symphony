// #region Imports

import { computed, Inject, inject, Injectable, type Signal } from '@angular/core';
import type { ICiRun, ICiWorkflow } from '@symphony/domain-ci';
import type { IRemoteDataStatus } from '@symphony/domain-core';
import type { ResponsePayload } from '@symphony/ipc-contracts-composition';
import { ApplicationSnapshot } from '@symphony/frontend-core/snapshot';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';

// #endregion

/**
 * Owns CI projections and CI field updates over the single transport snapshot.
 *
 * @public
 */
@Injectable()
export class CiSnapshotContext {
  // #region Fields

  private readonly _snapshot: ApplicationSnapshot;
  private readonly _configuration: Pick<ConfigurationStore, 'updateStorageStatus'>;
  private readonly _runs: Signal<readonly ICiRun[]>;
  private readonly _workflows: Signal<readonly ICiWorkflow[]>;
  private readonly _remoteData: Signal<IRemoteDataStatus | undefined>;

  // #endregion

  // #region Ctor

  /**
   * Connects the bridge to the existing snapshot and settings state.
   *
   * @public
   */
  public constructor(
    @Inject(ApplicationSnapshot) snapshot: ApplicationSnapshot = inject(ApplicationSnapshot),
    @Inject(ConfigurationStore)
    configuration: Pick<ConfigurationStore, 'updateStorageStatus'> = inject(ConfigurationStore),
  ) {
    this._snapshot = snapshot;
    this._configuration = configuration;
    this._runs = computed(() => snapshot.snapshot()?.ciRuns ?? []);
    this._workflows = computed(() => snapshot.snapshot()?.ciWorkflows ?? []);
    this._remoteData = computed(() => snapshot.snapshot()?.remoteData?.ciRuns);
  }

  // #endregion

  // #region Properties

  /** Current runs from the authoritative snapshot. @public @readonly */
  public get runs(): Signal<readonly ICiRun[]> {
    return this._runs;
  }
  /** Workflow definitions from the authoritative snapshot. @public @readonly */
  public get workflows(): Signal<readonly ICiWorkflow[]> {
    return this._workflows;
  }
  /** Current remote-data availability. @public @readonly */
  public get remoteData(): Signal<IRemoteDataStatus | undefined> {
    return this._remoteData;
  }

  // #endregion

  // #region Methods

  /**
   * Applies one validated CI response while preserving the unrelated aggregate fields.
   *
   * @param result - Existing typed CI refresh response.
   * @public
   */
  public applyRefresh(result: ResponsePayload<'ci.runs.refresh'>): void {
    this._snapshot.update((snapshot) =>
      snapshot
        ? {
            ...snapshot,
            ciWorkflows: result.ciWorkflows,
            ciRuns: result.ciRuns,
            localCiExecutions: result.localCiExecutions,
            remoteData: {
              ...snapshot.remoteData,
              workItems: snapshot.remoteData?.workItems ?? { state: 'unavailable' },
              ciRuns: result.remoteData,
            },
          }
        : snapshot,
    );
  }

  /**
   * Prepends a dispatched run to the existing snapshot without duplicating its identifier.
   *
   * @param run - Validated workflow-dispatch response.
   * @public
   */
  public prependRun(run: ResponsePayload<'ci.workflow.dispatch'>): void {
    this._snapshot.update((snapshot) =>
      snapshot
        ? {
            ...snapshot,
            ciRuns: [
              run,
              ...(snapshot.ciRuns ?? []).filter((candidate) => candidate.id !== run.id),
            ],
          }
        : snapshot,
    );
  }

  /**
   * Applies storage returned by cleanup to its existing shared state.
   *
   * @param status - Validated storage status.
   * @public
   */
  public updateStorageStatus(status: ResponsePayload<'storage.status.get'>): void {
    this._configuration.updateStorageStatus(status);
  }

  // #endregion
}

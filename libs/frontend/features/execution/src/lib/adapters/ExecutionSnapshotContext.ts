// #region Imports

import { computed, Inject, inject, Injectable, type Signal } from '@angular/core';
import type { IAgentProfile } from '@symphony/domain-team';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import type { IExecutionProjectionValue } from '@symphony/frontend-core/execution';
import { ApplicationSnapshot } from '@symphony/frontend-core/snapshot';
import { OrchestrationSynchronizer } from '@symphony/frontend-core/synchronization';

// #endregion

/** Owns Execution's bounded transport projection and field updates without another snapshot. @public */
@Injectable()
export class ExecutionSnapshotContext {
  // #region Fields

  private readonly _projection: Signal<IExecutionProjectionValue | undefined>;
  private readonly _agentProfiles: Signal<readonly IAgentProfile[]>;

  // #endregion

  // #region Ctor

  /** Connects the single snapshot, settings writer and bounded refresh lifecycle. @public */
  public constructor(
    @Inject(ApplicationSnapshot)
    private readonly _snapshot: ApplicationSnapshot = inject(ApplicationSnapshot),
    @Inject(ConfigurationStore) configuration: ConfigurationStore = inject(ConfigurationStore),
    @Inject(OrchestrationSynchronizer)
    private readonly _refresh: OrchestrationSynchronizer = inject(OrchestrationSynchronizer),
  ) {
    this._projection = computed(() => {
      const snapshot = _snapshot.snapshot();
      return snapshot
        ? {
            executions: snapshot.executions,
            executionQueue: snapshot.executionQueue,
            events: snapshot.events,
            goals: snapshot.goals,
            deliveryGroups: snapshot.deliveryGroups,
            deliveryGroupProposals: snapshot.deliveryGroupProposals,
            workItems: snapshot.workItems,
          }
        : undefined;
    });
    this._agentProfiles = computed(() => configuration.settings()?.agentProfiles ?? []);
  }

  // #endregion

  // #region Properties

  /** Execution fields read from the authoritative transport snapshot. @public @readonly */
  public get projection(): Signal<IExecutionProjectionValue | undefined> {
    return this._projection;
  }
  /** Employee identities used by execution details. @public @readonly */
  public get agentProfiles(): Signal<readonly IAgentProfile[]> {
    return this._agentProfiles;
  }

  // #endregion

  // #region Methods

  /** Applies a bounded update while retaining the other transport fields. @public */
  public update(
    update: (value: IExecutionProjectionValue | undefined) => IExecutionProjectionValue | undefined,
  ): void {
    this._snapshot.update((snapshot) => {
      const previous = this._projection();
      const next = update(previous);
      if (!snapshot || next === previous || !next) return snapshot;
      return { ...snapshot, ...next };
    });
  }

  /** Reconciles the shared transport through its existing refresh owner. @public */
  public refresh(force = true): Promise<void> {
    return this._refresh.refresh(force);
  }

  /** Preserves post-mutation replay of an active shared refresh. @public */
  public repeatAfterActiveRefresh(): () => void {
    return this._refresh.repeatAfterActiveRefresh();
  }

  // #endregion
}

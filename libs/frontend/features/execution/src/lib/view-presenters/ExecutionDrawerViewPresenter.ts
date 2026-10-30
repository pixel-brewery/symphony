// #region Imports

import { computed, inject, Injectable } from '@angular/core';
import {
  DRAWER_REF,
  DRAWER_REF_DATA,
  type IDrawerRef,
} from '@pixel-brewery/mosaik-elements-angular';
import {
  Hydratable,
  resolveImplementationBranchUrl,
  ViewPresenter,
  Command,
} from '@symphony/frontend-core';
import { projectAgentActivity } from '@symphony/domain-execution';
import type { IExecutionDrawerData } from '../views/drawers/IExecutionDrawerData';
import { ExecutionStore } from '../state/ExecutionStore';

// #endregion

@Injectable()
export class ExecutionDrawerViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _store = inject(ExecutionStore);
  private readonly _drawerRef = inject(DRAWER_REF) as IDrawerRef<IExecutionDrawerData>;
  private readonly _data = inject(DRAWER_REF_DATA) as IExecutionDrawerData;

  /**
   * The execution.
   *
   * @public
   * @readonly
   */
  public readonly execution = computed(() =>
    this._store.snapshot()?.executions.find((item) => item.id === this._data.executionId),
  );

  /**
   * The branch URL.
   *
   * @public
   * @readonly
   */
  /** @public */ public readonly employee = computed(() =>
    this._store
      .agentProfiles()
      .find((agent) => agent.id === this.execution()?.bindingSnapshot?.agentProfileId),
  );
  /** @public */ public readonly employeeActivity = computed(() => {
    const agent = this.employee();
    return agent
      ? projectAgentActivity([agent], this._store.snapshot(), this._store.activityFresh())[0]
      : undefined;
  });
  /** URL of the current execution branch. @public */
  public readonly branchUrl = computed(() => resolveImplementationBranchUrl(this.execution()));

  /**
   * The work item.
   *
   * @public
   * @readonly
   */
  public readonly workItem = computed(() => {
    const execution = this.execution();
    return execution
      ? this._store.snapshot()?.workItems.find((candidate) => candidate.id === execution.workItemId)
      : undefined;
  });

  /**
   * Shell commands are the agent's working noise, not run progress. Current runs no longer record
   * them; recorded runs keep them out of the stream here.
   *
   * @public
   * @readonly
   */
  public readonly events = computed(() =>
    [...(this._store.snapshot()?.events ?? [])]
      .filter((event) => event.executionId === this._data.executionId)
      .filter((event) => event.category !== 'command')
      .sort((left, right) => left.sequence - right.sequence),
  );

  /**
   * Whether it is running.
   *
   * @public
   * @readonly
   */
  public readonly isRunning = computed(() => {
    const state = this.execution()?.state;
    return state === 'queued' || state === 'running' || state === 'waiting';
  });

  private readonly _closeCommand: Command<void> = new Command(
    () => void this.onExecuteCloseCommand(),
  );
  // #endregion

  // #region Properties

  /**
   * The close command.
   *
   * @public
   * @readonly
   */
  public get closeCommand(): Command<void> {
    return this._closeCommand;
  }
  // #endregion

  // #region Methods

  /**
   * Handles hydrate.
   *
   * @public
   */
  public override onHydrate(): Promise<void> | undefined {
    return this.execution() ? undefined : this.refreshExecution();
  }

  /**
   * Closes.
   *
   * @private
   */
  private onExecuteCloseCommand(): void {
    this._drawerRef.close();
  }

  private async refreshExecution(): Promise<void> {
    await this._store.refresh();
  }

  // #endregion
}

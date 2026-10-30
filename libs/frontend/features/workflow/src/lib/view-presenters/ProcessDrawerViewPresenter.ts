// #region Imports

import { computed, inject, Injectable, signal } from '@angular/core';
import { Hydratable, ViewPresenter, Command } from '@symphony/frontend-core';
import {
  DRAWER_REF,
  DRAWER_REF_DATA,
  type IDrawerRef,
} from '@pixel-brewery/mosaik-elements-angular';
import type { WorkflowProcessDto } from '@symphony/ipc-contracts-workflow';
import { buildWorkflowGraph, type IWorkflowGraph } from '@symphony/domain-workflow';
import type { IProcessDrawerData } from './IProcessDrawerData';
import { WorkflowStore } from '../state/WorkflowStore';
import { WORKFLOW_CONTEXT } from '../ports/WorkflowContextToken';

// #endregion

@Injectable()
export class ProcessDrawerViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _context = inject(WORKFLOW_CONTEXT);
  private readonly _operations = inject(WorkflowStore);
  private readonly _drawerRef = inject(DRAWER_REF) as IDrawerRef<IProcessDrawerData>;
  private readonly _data = inject(DRAWER_REF_DATA) as IProcessDrawerData;
  private readonly _process = signal<WorkflowProcessDto | undefined>(undefined);

  /**
   * The work item.
   *
   * @public
   * @readonly
   */
  public readonly workItem = computed(() =>
    this._context.workItems().find((item) => item.id === this._data.workItemId),
  );

  /** The configured process. It travels in the snapshot, so no extra request is needed. */
  private readonly _workflow = computed(() => this._context.workflow());

  /**
   * The record.
   *
   * @public
   * @readonly
   */
  public readonly record = computed(() => this._process()?.record);

  /**
   * The runtime state.
   *
   * @public
   * @readonly
   */
  public readonly runtimeState = computed(() => this.record()?.runtimeState);

  /**
   * The human request.
   *
   * @public
   * @readonly
   */
  public readonly humanRequest = computed(() => this.record()?.humanRequest);

  /**
   * The claim.
   *
   * @public
   * @readonly
   */
  public readonly claim = computed(() => this.record()?.claim);

  /**
   * The routing.
   *
   * @public
   * @readonly
   */
  public readonly routing = computed(() => this.record()?.routing);

  /**
   * The item's path through the process. Falls back to the board column when no runtime record
   * exists yet: an item only gets one once the engine first touches it, but its stage is
   * already known from the tracker, and an empty graph would be the wrong answer.
   *
   * @public
   * @readonly
   */
  public readonly graph = computed<IWorkflowGraph | undefined>(() => {
    const workflow = this._workflow();
    if (!workflow) return undefined;
    const record = this.record();
    const stageId = record?.stageId ?? this.workItem()?.stageId;
    return buildWorkflowGraph(
      workflow,
      stageId ? { stageId, runtimeState: record?.runtimeState ?? 'idle' } : undefined,
      this._process()?.audit ?? [],
    );
  });

  /**
   * Whether it has record.
   *
   * @public
   * @readonly
   */
  public readonly hasRecord = computed(() => this.record() !== undefined);

  /**
   * History of the selected stage, newest first; the whole trail when nothing is selected.
   *
   * @public
   * @readonly
   */
  public readonly selectedStageId = signal<string | undefined>(undefined);

  /**
   * The selected transition ID.
   *
   * @public
   * @readonly
   */
  public readonly selectedTransitionId = signal<string | undefined>(undefined);

  /**
   * The audit trail.
   *
   * @public
   * @readonly
   */
  public readonly auditTrail = computed(() => {
    const entries = [...(this._process()?.audit ?? [])].reverse();
    const stageId = this.selectedStageId();
    if (!stageId) return entries;
    return entries.filter((entry) => entry.fromStageId === stageId || entry.toStageId === stageId);
  });

  /**
   * The selected stage.
   *
   * @public
   * @readonly
   */
  public readonly selectedStage = computed(() =>
    this.graph()?.nodes.find((node) => node.stageId === this.selectedStageId()),
  );

  /**
   * The selected transition.
   *
   * @public
   * @readonly
   */
  public readonly selectedTransition = computed(() =>
    this.graph()?.edges.find((edge) => edge.transitionId === this.selectedTransitionId()),
  );

  private readonly _selectStageCommand: Command<string> = new Command(
    (stageId) => void this.onExecuteSelectStageCommand(stageId),
  );
  private readonly _selectTransitionCommand: Command<string> = new Command(
    (transitionId) => void this.onExecuteSelectTransitionCommand(transitionId),
  );
  private readonly _clearSelectionCommand: Command<void> = new Command(
    () => void this.onExecuteClearSelectionCommand(),
  );
  private readonly _refreshCommand: Command<void> = new Command(
    () => void this.onExecuteRefreshCommand(),
  );
  private readonly _answerQuestionCommand: Command<string | undefined> = new Command(
    (option) => void this.onExecuteAnswerQuestionCommand(option),
  );
  private readonly _closeCommand: Command<void> = new Command(
    () => void this.onExecuteCloseCommand(),
  );
  // #endregion

  // #region Properties

  /**
   * The selectStage command.
   *
   * @public
   * @readonly
   */
  public get selectStageCommand(): Command<string> {
    return this._selectStageCommand;
  }
  /**
   * The selectTransition command.
   *
   * @public
   * @readonly
   */
  public get selectTransitionCommand(): Command<string> {
    return this._selectTransitionCommand;
  }
  /**
   * The clearSelection command.
   *
   * @public
   * @readonly
   */
  public get clearSelectionCommand(): Command<void> {
    return this._clearSelectionCommand;
  }
  /**
   * The refresh command.
   *
   * @public
   * @readonly
   */
  public get refreshCommand(): Command<void> {
    return this._refreshCommand;
  }
  /**
   * The answerQuestion command.
   *
   * @public
   * @readonly
   */
  public get answerQuestionCommand(): Command<string | undefined> {
    return this._answerQuestionCommand;
  }
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
  public override onHydrate(): Promise<void> {
    return this.load();
  }

  /**
   * Selects the stage.
   *
   * @param stageId - Stage id.
   * @private
   */
  private onExecuteSelectStageCommand(stageId: string): void {
    this.selectedTransitionId.set(undefined);
    this.selectedStageId.update((current) => (current === stageId ? undefined : stageId));
  }

  /**
   * Selects the transition.
   *
   * @param transitionId - Transition id.
   * @private
   */
  private onExecuteSelectTransitionCommand(transitionId: string): void {
    this.selectedStageId.set(undefined);
    this.selectedTransitionId.update((current) =>
      current === transitionId ? undefined : transitionId,
    );
  }

  /**
   * Clears the selection.
   *
   * @private
   */
  private onExecuteClearSelectionCommand(): void {
    this.selectedStageId.set(undefined);
    this.selectedTransitionId.set(undefined);
  }

  /**
   * Refreshes.
   *
   * @private
   */
  private async onExecuteRefreshCommand(): Promise<void> {
    await this.load();
  }

  /**
   * Answers the open supervisor question with one of its options, or dismisses it. Either
   * way the question ends here and automation may continue; the audit records who decided.
   *
   * @param option - Option.
   * @private
   */
  private async onExecuteAnswerQuestionCommand(option?: string): Promise<void> {
    const request = this.humanRequest();
    if (!request) return;
    await this._operations.answerWorkflowQuestion(this._data.workItemId, request.id, option);
    await this.load();
  }

  /**
   * Closes.
   *
   * @private
   */
  private onExecuteCloseCommand(): void {
    this._drawerRef.close();
  }

  private async load(): Promise<void> {
    this._process.set(await this._operations.loadWorkflowProcess(this._data.workItemId));
  }

  // #endregion
}

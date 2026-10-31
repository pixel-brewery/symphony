// #region Imports

import { computed, inject, Injectable, signal } from '@angular/core';
import { ViewPresenter, Command } from '@symphony/frontend-core/mobile';
import { MobileCompanionStore } from '@symphony/frontend-feature-mobile/browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import type {
  MobileBoardColumn,
  MobileTicket,
  MobileTicketAction,
} from '@symphony/mobile-contracts';
import type { IMobileMoveTarget } from './IMobileMoveTarget';

// #endregion

function moveLabel(direction: string, column: string | undefined): string {
  return column ? `${direction} · ${column}` : direction;
}

@Injectable()
export class MobileTicketDetailViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _location = inject(Location);
  private readonly _store = inject(MobileCompanionStore);
  private readonly _ticketId = this._route.snapshot.paramMap.get('ticketId');

  /** One prompt per offered step, so the analysis focus and a rework note never overwrite each other. */
  private readonly _prompts = signal<Readonly<Record<string, string>>>({});

  /**
   * The loading.
   *
   * @public
   * @readonly
   */
  public readonly loading = this._store.loading;

  /**
   * The ticket.
   *
   * @public
   * @readonly
   */
  public readonly ticket = computed(() =>
    this._store.snapshot()?.tickets.find((ticket) => ticket.id === this._ticketId),
  );

  private readonly _actions = computed<readonly MobileTicketAction[]>(
    () => this.ticket()?.actions ?? [],
  );

  /**
   * Steps that start agent work; each owns a prompt the desktop drawer offers as well.
   *
   * @public
   * @readonly
   */
  public readonly runActions = computed(() =>
    this._actions().filter((action) => action.kind === 'analyze' || action.kind === 'solve'),
  );

  /**
   * The decisions.
   *
   * @public
   * @readonly
   */
  public readonly decisions = computed(() =>
    this._actions().filter((action) => action.kind === 'decide'),
  );

  /**
   * Steps that neither ask for text nor decide a gate: cancelling a run, publishing its result.
   *
   * @public
   * @readonly
   */
  public readonly directActions = computed(() =>
    this._actions().filter(
      (action) =>
        action.kind === 'cancel' ||
        action.kind === 'dequeue' ||
        action.kind === 'publish-pull-request',
    ),
  );

  /**
   * The step this ticket is waiting to start once the desktop frees an execution slot.
   *
   * @public
   * @readonly
   */
  public readonly queueEntry = computed(() => {
    const ticketId = this.ticket()?.id;
    if (!ticketId) return undefined;
    return (this._store.snapshot()?.executionQueue ?? []).find(
      (entry) => entry.workItemId === ticketId,
    );
  });

  private readonly _columns = computed<readonly MobileBoardColumn[]>(
    () => this._store.snapshot()?.boardColumns ?? [],
  );

  /**
   * The move targets.
   *
   * @public
   * @readonly
   */
  public readonly moveTargets = computed<readonly IMobileMoveTarget[]>(() => {
    const ticket = this.ticket();
    if (!ticket) return [];
    return this._columns()
      .filter((column) => ticket.moveTargetColumnIds.includes(column.id))
      .map((column) => ({
        id: column.id,
        label: column.label,
        current: column.id === ticket.boardColumnId,
      }));
  });

  /**
   * The current column ID.
   *
   * @public
   * @readonly
   */
  public readonly currentColumnId = computed(
    () => this.moveTargets().find((target) => target.current)?.id ?? '',
  );

  /**
   * The next column.
   *
   * @public
   * @readonly
   */
  public readonly nextColumn = computed(() => this.neighbourColumn(1));

  /**
   * The previous column.
   *
   * @public
   * @readonly
   */
  public readonly previousColumn = computed(() => this.neighbourColumn(-1));

  /**
   * Direction plus the column it leads to; a Mosaik button carries one line of text.
   *
   * @public
   * @readonly
   */
  public readonly forwardLabel = computed(() => moveLabel('Forward', this.nextColumn()?.label));

  /**
   * The backward label.
   *
   * @public
   * @readonly
   */
  public readonly backwardLabel = computed(() => moveLabel('Back', this.previousColumn()?.label));

  private readonly _prompt = computed(
    () => (action: MobileTicketAction) => this.resolvePrompt(action),
  );

  private readonly _updatePromptCommand: Command<
    readonly [action: MobileTicketAction, event: unknown]
  > = new Command((parameters) => void this.onExecuteUpdatePromptCommand(...parameters));
  private readonly _canRun = computed(
    () => (action: MobileTicketAction) => this.resolveCanRun(action),
  );

  private readonly _runCommand: Command<MobileTicketAction> = new Command(
    (action) => void this.onExecuteRunCommand(action),
  );
  private readonly _moveToCommand: Command<string> = new Command(
    (columnId) => void this.onExecuteMoveToCommand(columnId),
  );
  private readonly _moveByOffsetCommand: Command<1 | -1> = new Command(
    (offset) => void this.onExecuteMoveByOffsetCommand(offset),
  );
  private readonly _moveToSelectionCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteMoveToSelectionCommand(event),
  );
  private readonly _openProcessCommand: Command<MobileTicket> = new Command(
    (ticket) => void this.onExecuteOpenProcessCommand(ticket),
  );
  private readonly _backCommand: Command<void> = new Command(
    () => void this.onExecuteBackCommand(),
  );
  // #endregion

  // #region Properties

  /**
   * The prompt projection.
   *
   * @public
   * @readonly
   */
  public get prompt() {
    return this._prompt;
  }
  /**
   * The updatePrompt command.
   *
   * @public
   * @readonly
   */
  public get updatePromptCommand(): Command<readonly [action: MobileTicketAction, event: unknown]> {
    return this._updatePromptCommand;
  }
  /**
   * The canRun projection.
   *
   * @public
   * @readonly
   */
  public get canRun() {
    return this._canRun;
  }
  /**
   * The run command.
   *
   * @public
   * @readonly
   */
  public get runCommand(): Command<MobileTicketAction> {
    return this._runCommand;
  }
  /**
   * The moveTo command.
   *
   * @public
   * @readonly
   */
  public get moveToCommand(): Command<string> {
    return this._moveToCommand;
  }
  /**
   * The moveByOffset command.
   *
   * @public
   * @readonly
   */
  public get moveByOffsetCommand(): Command<1 | -1> {
    return this._moveByOffsetCommand;
  }
  /**
   * The moveToSelection command.
   *
   * @public
   * @readonly
   */
  public get moveToSelectionCommand(): Command<unknown> {
    return this._moveToSelectionCommand;
  }
  /**
   * The openProcess command.
   *
   * @public
   * @readonly
   */
  public get openProcessCommand(): Command<MobileTicket> {
    return this._openProcessCommand;
  }
  /**
   * The back command.
   *
   * @public
   * @readonly
   */
  public get backCommand(): Command<void> {
    return this._backCommand;
  }
  // #endregion

  // #region Methods

  /**
   * Returns the prompt.
   *
   * @param action - Action.
   * @private
   */
  private resolvePrompt(action: MobileTicketAction): string {
    return this._prompts()[action.id] ?? '';
  }

  /**
   * Updates the prompt.
   *
   * @param action - Action.
   * @param event - Event.
   * @private
   */
  private onExecuteUpdatePromptCommand(action: MobileTicketAction, event: unknown): void {
    const value = this.valueFromEvent(event);
    if (value === undefined) return;
    this._prompts.update((prompts) => ({ ...prompts, [action.id]: value }));
  }

  /**
   * Whether it can run.
   *
   * @param action - Action.
   * @private
   */
  private resolveCanRun(action: MobileTicketAction): boolean {
    if (this.loading() || action.blockedReason) return false;
    return !action.requiresFeedback || this.resolvePrompt(action).trim().length > 0;
  }

  /**
   * Runs.
   *
   * @param action - Action.
   * @private
   */
  private async onExecuteRunCommand(action: MobileTicketAction): Promise<void> {
    if (!this.resolveCanRun(action)) return;
    const ticket = this.ticket();
    if (!ticket) return;
    const prompt = this.resolvePrompt(action).trim();
    switch (action.kind) {
      case 'analyze':
        await this.startRun({
          action: 'analyze',
          workItemId: ticket.id,
          ...(prompt ? { prompt } : {}),
        });
        return;
      case 'solve':
        await this.startRun({
          action: 'solve',
          workItemId: ticket.id,
          ...(prompt ? { feedback: prompt } : {}),
        });
        return;
      case 'cancel':
        if (action.executionId) {
          await this._store.runCommand({
            action: 'cancel-execution',
            executionId: action.executionId,
          });
        }
        return;
      case 'dequeue':
        if (action.queueEntryId) {
          await this._store.runCommand({
            action: 'remove-queue-entry',
            entryId: action.queueEntryId,
          });
        }
        return;
      case 'publish-pull-request':
        if (action.executionId) {
          await this._store.runCommand({
            action: 'publish-pull-request',
            workItemId: ticket.id,
            executionId: action.executionId,
          });
        }
        return;
      case 'decide':
        if (action.optionId) {
          await this._store.runCommand({
            action: 'decide',
            workItemId: ticket.id,
            optionId: action.optionId,
          });
        }
        return;
    }
  }

  /**
   * Moves the to.
   *
   * @param columnId - Column id.
   * @private
   */
  private async onExecuteMoveToCommand(columnId: string): Promise<void> {
    const ticket = this.ticket();
    if (!ticket || this.loading() || columnId === this.currentColumnId()) return;
    if (!ticket.moveTargetColumnIds.includes(columnId)) return;
    await this._store.runCommand({
      action: 'move',
      workItemId: ticket.id,
      boardColumnId: columnId,
    });
  }

  /**
   * Moves the by offset.
   *
   * @param offset - Offset.
   * @private
   */
  private async onExecuteMoveByOffsetCommand(offset: 1 | -1): Promise<void> {
    const target = offset === 1 ? this.nextColumn() : this.previousColumn();
    if (target) await this.onExecuteMoveToCommand(target.id);
  }

  /**
   * Moves the to selection.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteMoveToSelectionCommand(event: unknown): void {
    const value = this.valueFromEvent(event);
    if (value) void this.onExecuteMoveToCommand(value);
  }

  /**
   * Opens the process.
   *
   * @param ticket - Ticket.
   * @private
   */
  private onExecuteOpenProcessCommand(ticket: MobileTicket): void {
    if (!ticket.activeExecutionId) return;
    void this._router.navigate(['/processes'], {
      queryParams: { execution: ticket.activeExecutionId },
    });
  }

  /**
   * Returns the back.
   *
   * @private
   */
  private onExecuteBackCommand(): void {
    this._location.back();
  }

  private neighbourColumn(offset: 1 | -1): IMobileMoveTarget | undefined {
    const targets = this.moveTargets();
    const index = targets.findIndex((target) => target.current);
    return index < 0 ? undefined : targets[index + offset];
  }

  private async startRun(
    command: Extract<
      Parameters<MobileCompanionStore['runCommand']>[0],
      { action: 'analyze' | 'solve' }
    >,
  ): Promise<void> {
    const executionId = await this._store.runCommand(command);
    if (executionId) {
      await this._router.navigate(['/processes'], { queryParams: { execution: executionId } });
    }
  }

  private valueFromEvent(event: unknown): string | undefined {
    if (typeof event === 'string') return event;
    if (!event || typeof event !== 'object') return undefined;
    const record = event as Record<string, unknown>;
    const detail =
      record['detail'] && typeof record['detail'] === 'object'
        ? (record['detail'] as Record<string, unknown>)
        : record;
    const target =
      record['target'] && typeof record['target'] === 'object'
        ? (record['target'] as Record<string, unknown>)
        : undefined;
    // A selection reports the selected item as `newValue`.
    const selection =
      detail['newValue'] && typeof detail['newValue'] === 'object'
        ? (detail['newValue'] as Record<string, unknown>)['value']
        : undefined;
    const value = detail['value'] ?? selection ?? target?.['value'] ?? record['detail'];
    return typeof value === 'string' ? value : undefined;
  }

  // #endregion
}

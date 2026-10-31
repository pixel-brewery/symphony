// #region Imports

import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageBoxService } from '@pixel-brewery/mosaik-elements-angular';
import { repositoryBindingsFor } from '@symphony/configuration-composition';
import type { IWorkItem } from '@symphony/domain-work';
import { Clock, Command, ViewPresenter } from '@symphony/frontend-core';
import { NotificationService } from '@symphony/frontend-notification';
import { firstValueFrom } from 'rxjs';
import type { IInboxEntry } from '../inbox/IInboxEntry';
import type { InboxOption } from '../inbox/InboxOption';
import { isAcceptanceOption } from '../inbox/isAcceptanceOption';
import { projectInboxSteps } from '../inbox/projectInboxSteps';
import { HOME_CONTEXT } from '../ports/HomeContextToken';
import { InboxStore } from '../state/InboxStore';

// #endregion

/** The Inbox filter segment. */
type InboxFilter = 'all' | 'decisions' | 'updates';

/**
 * Coordinates the Inbox: the filter segment, the grouped list, the selected entry and its
 * continuation. Every continuation calls the command the Board, Actions or the delivery-group
 * drawer call, so the orchestrator applies the same automation policy and admission checks;
 * starting an agent asks to prepare an unprepared repository first, as the Board does.
 *
 * @public
 */
@Injectable()
export class InboxViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _context = inject(HOME_CONTEXT);
  private readonly _inbox = inject(InboxStore);
  private readonly _clock = inject(Clock);
  private readonly _router = inject(Router);
  private readonly _notifications = inject(NotificationService);
  private readonly _messageBoxes = inject(MessageBoxService);
  private readonly _selectedEntryId = signal<string | undefined>(undefined);
  private readonly _optionChoice = signal<{ entryId: string; optionId: string } | undefined>(
    undefined,
  );
  private readonly _noteDraft = signal<{ entryId: string; text: string } | undefined>(undefined);
  private readonly _busy = signal(false);

  // #endregion

  // #region Ctor

  /**
   * Selects the entry a link asked for.
   *
   * @public
   */
  public constructor() {
    super();
    const subscription = inject(ActivatedRoute).queryParamMap.subscribe((parameters) => {
      const entryId = parameters.get('entry');
      if (entryId) {
        this.filter.set('all');
        this._selectedEntryId.set(entryId);
      }
    });
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }

  // #endregion

  // #region Properties

  /** The shared clock for entry ages. @public @readonly */
  public readonly now = this._clock.now;

  /** Whether the first snapshot has arrived. @public @readonly */
  public readonly hasSnapshot = this._context.hasSnapshot;

  /** The selected filter of the segment. @public @readonly */
  public readonly filter = signal<InboxFilter>('all');

  /** Number of decisions. @public @readonly */
  public readonly decisionCount = computed(() => this._inbox.decisions().length);

  /** Number of updates. @public @readonly */
  public readonly updateCount = computed(() => this._inbox.updates().length);

  /** Decisions the filter shows. @public @readonly */
  public readonly decisions = computed(() =>
    this.filter() === 'updates' ? [] : this._inbox.decisions(),
  );

  /** Updates the filter shows. @public @readonly */
  public readonly updates = computed(() =>
    this.filter() === 'decisions' ? [] : this._inbox.updates(),
  );

  /** The selected entry: the one chosen, or the first one shown. @public @readonly */
  public readonly selectedEntry = computed<IInboxEntry | undefined>(() => {
    const visible = [...this.decisions(), ...this.updates()];
    return visible.find((entry) => entry.id === this._selectedEntryId()) ?? visible[0];
  });

  /** The five-stage stepper of the selected entry's work item. @public @readonly */
  public readonly steps = computed(() => {
    const entry = this.selectedEntry();
    const snapshot = this._context.snapshot();
    if (!entry || !snapshot) return [];
    return projectInboxSteps({
      entry,
      executions: snapshot.executions,
      goals: snapshot.goals ?? [],
      stages: snapshot.workflow.stages,
      pullRequests: snapshot.pullRequests ?? [],
      ciRuns: snapshot.ciRuns ?? [],
      localCiExecutions: snapshot.localCiExecutions ?? [],
      agents: this._context.settings()?.agentProfiles ?? [],
    });
  });

  /**
   * Which feature-owned commands are part of the product: execution (assign, record, review,
   * delivery groups), workflow gates and Actions.
   *
   * @public
   * @readonly
   */
  public readonly availability = {
    execution: Boolean(this._context.execution),
    workflow: Boolean(this._context.workflow),
    ci: Boolean(this._context.ci),
  } as const;

  /** Continuations of the selected entry whose command is part of the product. @public @readonly */
  public readonly options = computed<readonly InboxOption[]>(() =>
    (this.selectedEntry()?.options ?? []).filter((option) => this.isAvailable(option)),
  );

  /** The selected continuation of the selected entry, the first one by default. @public @readonly */
  public readonly selectedOption = computed<InboxOption | undefined>(() => {
    const entry = this.selectedEntry();
    const choice = this._optionChoice();
    const options = this.options();
    return (
      options.find((option) => choice?.entryId === entry?.id && option.id === choice?.optionId) ??
      options[0]
    );
  });

  /** What the person writes along with the selected entry's continuation. @public @readonly */
  public readonly note = computed(() => {
    const draft = this._noteDraft();
    return draft && draft.entryId === this.selectedEntry()?.id ? draft.text : '';
  });

  /**
   * Whether the selected continuation needs a note: the protocol of your own implementation or
   * the changes you request are required; a gate decision other than advancing takes an optional
   * one.
   *
   * @public
   * @readonly
   */
  public readonly noteRequirement = computed<'required' | 'optional' | 'none'>(() => {
    const option = this.selectedOption();
    switch (option?.kind) {
      case 'record-solution':
        return 'required';
      case 'review-goal':
        return option.decision === 'revision-required' ? 'required' : 'none';
      case 'decide':
        return option.effect === 'advance' ? 'none' : 'optional';
      default:
        return 'none';
    }
  });

  /** Whether a continuation is running. @public @readonly */
  public readonly busy = this._busy.asReadonly();

  /** Whether the selected continuation can run now. @public @readonly */
  public readonly canContinue = computed(() => {
    const option = this.selectedOption();
    return (
      Boolean(option) &&
      !this._busy() &&
      this.isAvailable(option!) &&
      (this.noteRequirement() !== 'required' || Boolean(this.note().trim()))
    );
  });

  /** Switches the filter segment. @public @readonly */
  public readonly selectFilterCommand = new Command<InboxFilter>((filter) =>
    this.filter.set(filter),
  );

  /** Selects an entry. @public @readonly */
  public readonly selectEntryCommand = new Command<string>((entryId) =>
    this._selectedEntryId.set(entryId),
  );

  /** Selects a continuation of the selected entry. @public @readonly */
  public readonly selectOptionCommand = new Command<string>((optionId) => {
    const entry = this.selectedEntry();
    if (entry) this._optionChoice.set({ entryId: entry.id, optionId });
  });

  /** Keeps the note for the selected entry. @public @readonly */
  public readonly updateNoteCommand = new Command<string>((text) => {
    const entry = this.selectedEntry();
    if (entry) this._noteDraft.set({ entryId: entry.id, text });
  });

  /** Runs the selected continuation. @public @readonly */
  public readonly continueCommand = new Command<void>(
    () => void this.continueSelected(),
    this.canContinue,
  );

  /** Accepts delivered work straight from the list. @public @readonly */
  public readonly acceptCommand = new Command<IInboxEntry>((entry) => void this.accept(entry));

  /** Selects delivered work and the first way to send it back. @public @readonly */
  public readonly requestChangesCommand = new Command<IInboxEntry>((entry) => {
    this._selectedEntryId.set(entry.id);
    const option = entry.options.find((candidate) => !isAcceptanceOption(candidate));
    if (option) this._optionChoice.set({ entryId: entry.id, optionId: option.id });
  });

  /** Hides the selected entry until tomorrow, for this session. @public @readonly */
  public readonly snoozeCommand = new Command<void>(() => {
    const entry = this.selectedEntry();
    if (entry) this._inbox.snoozeUntilTomorrow(entry.id);
  });

  /** Opens the selected entry's work item, where its analysis and history live. @public @readonly */
  public readonly openWorkItemCommand = new Command<void>(() => {
    const item = this.selectedEntry()?.workItem;
    if (item) void this._router.navigate(['/main/board'], { queryParams: { item: item.id } });
  });

  // #endregion

  // #region Methods

  /**
   * Joins the application bootstrap.
   *
   * @public
   */
  public override initialize(): void {
    super.initialize();
    void this._context.initialize();
  }

  /** Whether the feature that owns a continuation's command is part of the product. */
  private isAvailable(option: InboxOption): boolean {
    switch (option.kind) {
      case 'decide':
        return this.availability.workflow;
      case 'rerun':
        return this.availability.ci;
      case 'open-actions':
        return true;
      default:
        return this.availability.execution;
    }
  }

  private async continueSelected(): Promise<void> {
    const entry = this.selectedEntry();
    const option = this.selectedOption();
    if (!entry || !option || !this.canContinue()) return;
    this._busy.set(true);
    try {
      if (await this.run(entry, option, this.note().trim())) this._noteDraft.set(undefined);
    } finally {
      if (!this.disposed()) this._busy.set(false);
    }
  }

  private async accept(entry: IInboxEntry): Promise<void> {
    const option = entry.options.find(isAcceptanceOption);
    if (!option || this._busy()) return;
    this._busy.set(true);
    try {
      await this.run(entry, option, '');
    } finally {
      if (!this.disposed()) this._busy.set(false);
    }
  }

  /** Runs one continuation through its owning command. */
  private async run(entry: IInboxEntry, option: InboxOption, note: string): Promise<boolean> {
    const item = entry.workItem;
    const execution = this._context.execution;
    switch (option.kind) {
      case 'assign': {
        if (!item || !execution || !(await this.prepareRepository(item))) return false;
        const delegated = await execution.delegateWorkItem(
          item.id,
          option.teamId,
          option.agentId,
          item.title,
        );
        return delegated && (await execution.startSolver(false, item.id));
      }
      case 'record-solution':
        return (
          Boolean(item && execution && note) && execution!.completeManualSolution(item!.id, note)
        );
      case 'decide':
        if (!item || !this._context.workflow) return false;
        await this._context.workflow.decideWorkflow(item.id, option.optionId, note || undefined);
        return true;
      case 'review-goal':
        if (!item || !execution) return false;
        return execution.reviewGoal(item.id, option.decision, note);
      case 'confirm-group':
        return Boolean(await execution?.confirmDeliveryGroup(option.proposalId));
      case 'reject-group':
        return Boolean(await execution?.rejectDeliveryGroup(option.proposalId));
      case 'rerun':
        if (!this._context.ci) return false;
        await this._context.ci.rerunCiRun(option.runId);
        return true;
      case 'open-actions':
        return this._router.navigate(['/main/actions'], {
          queryParams: { q: option.workflowName },
        });
    }
  }

  /**
   * Local AI execution needs one unambiguous, prepared repository. An unprepared one is cloned
   * only after the same confirmation the Board asks for; nothing runs project code.
   */
  private async prepareRepository(item: IWorkItem): Promise<boolean> {
    const settings = this._context.settings();
    const runtime = this._context.repositoryRuntime;
    if (!settings || !runtime) return true;
    const repositories = repositoryBindingsFor(settings, item);
    if (repositories.length !== 1) {
      this._notifications.showWarning(
        'Choose one repository.',
        'Local AI execution requires one unambiguous repository binding.',
      );
      return false;
    }
    const repository = repositories[0]!;
    let status = runtime.repositoryRuntimeStatus(repository.id);
    if (!status) {
      if (!(await runtime.refreshRepositoryRuntime(repository.id))) return false;
      status = runtime.repositoryRuntimeStatus(repository.id);
    }
    if (!status) return false;
    if (status.preparation.state !== 'unprepared') return true;
    const preparation = this._messageBoxes.show({
      id: `prepare-repository-${repository.id}`,
      header: `Prepare ${repository.owner}/${repository.name} locally?`,
      message:
        'Symphony will clone or refresh this configured repository without running project code, dependency installers, Git hooks, or tests. AI tasks may use it after preparation.',
      buttons: 'yesNo',
      variant: 'primary',
      pressEscapeToClose: true,
      intl: { yesLabel: 'Prepare locally', noLabel: 'Cancel' },
    });
    const decision = await firstValueFrom(preparation.closed);
    if (decision.reason !== 'positive') return false;
    return runtime.prepareRepository(repository.id);
  }

  // #endregion
}

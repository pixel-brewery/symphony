// #region Imports

import { Location } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Hydratable, ViewPresenter, Command } from '@symphony/frontend-core/mobile';
import { MobileCompanionStore } from '@symphony/frontend-feature-mobile/browser';
import type {
  MobileProjectFieldDefinition,
  MobileProjectFieldValue,
} from '@symphony/mobile-contracts';

// #endregion

type WorkItemCreationMode = 'manual' | 'ai';

interface IMobileWorkItemFormModel {
  readonly title: string;
  readonly body: string;
  readonly repository: string;
  readonly projectFields: readonly MobileProjectFieldValue[];
  readonly labels: readonly string[];
  readonly assignees: readonly string[];
}

@Injectable()
export class MobileWorkItemCreateViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _location = inject(Location);
  private readonly _store = inject(MobileCompanionStore);

  private readonly _model = signal<IMobileWorkItemFormModel>({
    title: '',
    body: '',
    repository: '',
    projectFields: [],
    labels: [],
    assignees: [],
  });

  /**
   * The input mode.
   *
   * @public
   * @readonly
   */
  public readonly inputMode = signal<WorkItemCreationMode>(
    this._route.snapshot.queryParamMap.get('mode') === 'ai' ? 'ai' : 'manual',
  );

  /**
   * The creator stage.
   *
   * @public
   * @readonly
   */
  public readonly creatorStage = signal<'prompt' | 'review'>('prompt');

  /**
   * The draft prompt.
   *
   * @public
   * @readonly
   */
  public readonly draftPrompt = signal('');

  /**
   * The context.
   *
   * @public
   * @readonly
   */
  public readonly context = this._store.workItemCreationContext;

  /**
   * Whether it is saving.
   *
   * @public
   * @readonly
   */
  public readonly isSaving = this._store.workItemCreationBusy;

  /**
   * Whether it is drafting.
   *
   * @public
   * @readonly
   */
  public readonly isDrafting = this._store.issueDraftBusy;

  /**
   * The project fields.
   *
   * @public
   * @readonly
   */
  public readonly projectFields = computed(() => this.context()?.projectFields ?? []);

  /**
   * The repository.
   *
   * @public
   * @readonly
   */
  public readonly repository = computed(() => this._model().repository);

  /**
   * The title.
   *
   * @public
   * @readonly
   */
  public readonly title = computed(() => this._model().title);

  /**
   * The body.
   *
   * @public
   * @readonly
   */
  public readonly body = computed(() => this._model().body);

  /**
   * Whether it has issue creator.
   *
   * @public
   * @readonly
   */
  public readonly hasIssueCreator = computed(() => Boolean(this.context()?.issueCreatorSkill));

  /**
   * Whether it is AI draft.
   *
   * @public
   * @readonly
   */
  public readonly isAiDraft = computed(
    () => this.inputMode() === 'ai' && this.creatorStage() === 'review',
  );

  /**
   * Whether it can draft.
   *
   * @public
   * @readonly
   */
  public readonly canDraft = computed(
    () =>
      !this.isDrafting() &&
      this.hasIssueCreator() &&
      this.repository().length > 0 &&
      this.draftPrompt().trim().length >= 10,
  );

  /**
   * Whether it can create.
   *
   * @public
   * @readonly
   */
  public readonly canCreate = computed(
    () =>
      !this.isSaving() &&
      !this.isDrafting() &&
      this.title().trim().length > 0 &&
      this.repository().length > 0 &&
      (this.inputMode() === 'manual' || this.creatorStage() === 'review'),
  );

  private readonly _selectInputModeCommand: Command<WorkItemCreationMode> = new Command(
    (mode) => void this.onExecuteSelectInputModeCommand(mode),
  );
  private readonly _updateTitleCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateTitleCommand(event),
  );
  private readonly _updateBodyCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateBodyCommand(event),
  );
  private readonly _updateDraftPromptCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteUpdateDraftPromptCommand(event),
  );
  private readonly _repositoryChangedCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteRepositoryChangedCommand(event),
  );
  private readonly _projectFieldText = computed(
    () => (fieldId: string) => this.resolveProjectFieldText(fieldId),
  );

  private readonly _projectFieldNumber = computed(
    () => (fieldId: string) => this.resolveProjectFieldNumber(fieldId),
  );

  private readonly _projectFieldDate = computed(
    () => (fieldId: string) => this.resolveProjectFieldDate(fieldId),
  );

  private readonly _projectFieldSelection = computed(
    () => (fieldId: string) => this.resolveProjectFieldSelection(fieldId),
  );

  private readonly _isProjectFieldOptionSelected = computed(
    () => (fieldId: string, optionId: string) =>
      this.resolveIsProjectFieldOptionSelected(fieldId, optionId),
  );

  private readonly _updateProjectFieldCommand: Command<
    readonly [field: MobileProjectFieldDefinition, event: unknown]
  > = new Command((parameters) => void this.onExecuteUpdateProjectFieldCommand(...parameters));
  private readonly _clearProjectFieldCommand: Command<MobileProjectFieldDefinition> = new Command(
    (field) => void this.onExecuteClearProjectFieldCommand(field),
  );
  private readonly _toggleProjectFieldOptionCommand: Command<
    readonly [fieldId: string, optionId: string]
  > = new Command(
    (parameters) => void this.onExecuteToggleProjectFieldOptionCommand(...parameters),
  );
  private readonly _isLabelSelected = computed(
    () => (label: string) => this.resolveIsLabelSelected(label),
  );

  private readonly _toggleLabelCommand: Command<string> = new Command(
    (label) => void this.onExecuteToggleLabelCommand(label),
  );
  private readonly _isAssigneeSelected = computed(
    () => (login: string) => this.resolveIsAssigneeSelected(login),
  );

  private readonly _toggleAssigneeCommand: Command<string> = new Command(
    (login) => void this.onExecuteToggleAssigneeCommand(login),
  );
  private readonly _draftWithAiCommand: Command<unknown | undefined> = new Command(
    (event) => void this.onExecuteDraftWithAiCommand(event),
  );
  private readonly _startOverCommand: Command<void> = new Command(
    () => void this.onExecuteStartOverCommand(),
  );
  private readonly _cancelDraftCommand: Command<void> = new Command(
    () => void this.onExecuteCancelDraftCommand(),
  );
  private readonly _createWorkItemCommand: Command<void> = new Command(
    () => void this.onExecuteCreateWorkItemCommand(),
  );
  private readonly _backCommand: Command<void> = new Command(
    () => void this.onExecuteBackCommand(),
  );
  // #endregion

  // #region Properties

  /**
   * The selectInputMode command.
   *
   * @public
   * @readonly
   */
  public get selectInputModeCommand(): Command<WorkItemCreationMode> {
    return this._selectInputModeCommand;
  }
  /**
   * The updateTitle command.
   *
   * @public
   * @readonly
   */
  public get updateTitleCommand(): Command<unknown> {
    return this._updateTitleCommand;
  }
  /**
   * The updateBody command.
   *
   * @public
   * @readonly
   */
  public get updateBodyCommand(): Command<unknown> {
    return this._updateBodyCommand;
  }
  /**
   * The updateDraftPrompt command.
   *
   * @public
   * @readonly
   */
  public get updateDraftPromptCommand(): Command<unknown> {
    return this._updateDraftPromptCommand;
  }
  /**
   * The repositoryChanged command.
   *
   * @public
   * @readonly
   */
  public get repositoryChangedCommand(): Command<unknown> {
    return this._repositoryChangedCommand;
  }
  /**
   * The projectFieldText projection.
   *
   * @public
   * @readonly
   */
  public get projectFieldText() {
    return this._projectFieldText;
  }
  /**
   * The projectFieldNumber projection.
   *
   * @public
   * @readonly
   */
  public get projectFieldNumber() {
    return this._projectFieldNumber;
  }
  /**
   * The projectFieldDate projection.
   *
   * @public
   * @readonly
   */
  public get projectFieldDate() {
    return this._projectFieldDate;
  }
  /**
   * The projectFieldSelection projection.
   *
   * @public
   * @readonly
   */
  public get projectFieldSelection() {
    return this._projectFieldSelection;
  }
  /**
   * The isProjectFieldOptionSelected projection.
   *
   * @public
   * @readonly
   */
  public get isProjectFieldOptionSelected() {
    return this._isProjectFieldOptionSelected;
  }
  /**
   * The updateProjectField command.
   *
   * @public
   * @readonly
   */
  public get updateProjectFieldCommand(): Command<
    readonly [field: MobileProjectFieldDefinition, event: unknown]
  > {
    return this._updateProjectFieldCommand;
  }
  /**
   * The clearProjectField command.
   *
   * @public
   * @readonly
   */
  public get clearProjectFieldCommand(): Command<MobileProjectFieldDefinition> {
    return this._clearProjectFieldCommand;
  }
  /**
   * The toggleProjectFieldOption command.
   *
   * @public
   * @readonly
   */
  public get toggleProjectFieldOptionCommand(): Command<
    readonly [fieldId: string, optionId: string]
  > {
    return this._toggleProjectFieldOptionCommand;
  }
  /**
   * The isLabelSelected projection.
   *
   * @public
   * @readonly
   */
  public get isLabelSelected() {
    return this._isLabelSelected;
  }
  /**
   * The toggleLabel command.
   *
   * @public
   * @readonly
   */
  public get toggleLabelCommand(): Command<string> {
    return this._toggleLabelCommand;
  }
  /**
   * The isAssigneeSelected projection.
   *
   * @public
   * @readonly
   */
  public get isAssigneeSelected() {
    return this._isAssigneeSelected;
  }
  /**
   * The toggleAssignee command.
   *
   * @public
   * @readonly
   */
  public get toggleAssigneeCommand(): Command<string> {
    return this._toggleAssigneeCommand;
  }
  /**
   * The draftWithAi command.
   *
   * @public
   * @readonly
   */
  public get draftWithAiCommand(): Command<unknown | undefined> {
    return this._draftWithAiCommand;
  }
  /**
   * The startOver command.
   *
   * @public
   * @readonly
   */
  public get startOverCommand(): Command<void> {
    return this._startOverCommand;
  }
  /**
   * The cancelDraft command.
   *
   * @public
   * @readonly
   */
  public get cancelDraftCommand(): Command<void> {
    return this._cancelDraftCommand;
  }
  /**
   * The createWorkItem command.
   *
   * @public
   * @readonly
   */
  public get createWorkItemCommand(): Command<void> {
    return this._createWorkItemCommand;
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
   * Handles hydrate.
   *
   * @public
   */
  public override onHydrate(): Promise<void> {
    return this.loadContext();
  }

  /**
   * Selects the input mode.
   *
   * @param mode - Mode.
   * @private
   */
  private onExecuteSelectInputModeCommand(mode: WorkItemCreationMode): void {
    this.inputMode.set(mode);
  }

  /**
   * Updates the title.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateTitleCommand(event: unknown): void {
    this.updateModelText('title', event);
  }

  /**
   * Updates the body.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateBodyCommand(event: unknown): void {
    this.updateModelText('body', event);
  }

  /**
   * Updates the draft prompt.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateDraftPromptCommand(event: unknown): void {
    const value = this.valueFromEvent(event);
    if (value !== undefined) this.draftPrompt.set(value);
  }

  /**
   * Returns the repository changed.
   *
   * @param event - Event.
   * @private
   */
  private async onExecuteRepositoryChangedCommand(event: unknown): Promise<void> {
    const repository = this.valueFromEvent(event);
    if (!repository || repository === this._model().repository) return;
    this._model.update((model) => ({ ...model, repository }));
    if (await this._store.loadWorkItemCreationContext(repository)) {
      this.normalizeProjectFields();
    }
  }

  /**
   * Returns the project field text.
   *
   * @param fieldId - Field id.
   * @private
   */
  private resolveProjectFieldText(fieldId: string): string {
    const value = this.projectFieldValue(fieldId);
    return value?.type === 'text' || value?.type === 'date' ? value.value : '';
  }

  /**
   * Returns the project field number.
   *
   * @param fieldId - Field id.
   * @private
   */
  private resolveProjectFieldNumber(fieldId: string): number | null {
    const value = this.projectFieldValue(fieldId);
    return value?.type === 'number' ? value.value : null;
  }

  /**
   * Returns the project field date.
   *
   * @param fieldId - Field id.
   * @private
   */
  private resolveProjectFieldDate(fieldId: string): Date | null {
    const value = this.projectFieldValue(fieldId);
    return value?.type === 'date' && value.value ? new Date(`${value.value}T00:00:00`) : null;
  }

  /**
   * Returns the project field selection.
   *
   * @param fieldId - Field id.
   * @private
   */
  private resolveProjectFieldSelection(fieldId: string): string {
    const value = this.projectFieldValue(fieldId);
    return value?.type === 'single-select' || value?.type === 'iteration'
      ? (value.value ?? '')
      : '';
  }

  /**
   * Whether it is project field option selected.
   *
   * @param fieldId - Field id.
   * @param optionId - Option id.
   * @private
   */
  private resolveIsProjectFieldOptionSelected(fieldId: string, optionId: string): boolean {
    const value = this.projectFieldValue(fieldId);
    return value?.type === 'multi-select' && value.value.includes(optionId);
  }

  /**
   * Updates the project field.
   *
   * @param field - Field.
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateProjectFieldCommand(
    field: MobileProjectFieldDefinition,
    event: unknown,
  ): void {
    const raw = this.eventValue(event);
    switch (field.type) {
      case 'text':
        this.replaceProjectFieldValue({
          fieldId: field.id,
          type: field.type,
          value: typeof raw === 'string' ? raw : '',
        });
        return;
      case 'number': {
        const number =
          typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
        this.replaceProjectFieldValue({
          fieldId: field.id,
          type: field.type,
          value: Number.isFinite(number) ? number : null,
        });
        return;
      }
      case 'date':
        this.replaceProjectFieldValue({
          fieldId: field.id,
          type: field.type,
          value: raw instanceof Date ? this.dateValue(raw) : typeof raw === 'string' ? raw : '',
        });
        return;
      case 'single-select':
      case 'iteration':
        this.replaceProjectFieldValue({
          fieldId: field.id,
          type: field.type,
          value: typeof raw === 'string' && raw ? raw : null,
        });
        return;
      case 'multi-select':
        return;
    }
  }

  /**
   * Clears the project field.
   *
   * @param field - Field.
   * @private
   */
  private onExecuteClearProjectFieldCommand(field: MobileProjectFieldDefinition): void {
    this.replaceProjectFieldValue(this.emptyProjectFieldValue(field));
  }

  /**
   * Toggles the project field option.
   *
   * @param fieldId - Field id.
   * @param optionId - Option id.
   * @private
   */
  private onExecuteToggleProjectFieldOptionCommand(fieldId: string, optionId: string): void {
    const value = this.projectFieldValue(fieldId);
    if (value?.type !== 'multi-select') return;
    this.replaceProjectFieldValue({
      ...value,
      value: value.value.includes(optionId)
        ? value.value.filter((candidate) => candidate !== optionId)
        : [...value.value, optionId],
    });
  }

  /**
   * Whether it is label selected.
   *
   * @param label - Label.
   * @private
   */
  private resolveIsLabelSelected(label: string): boolean {
    return this._model().labels.includes(label);
  }

  /**
   * Toggles the label.
   *
   * @param label - Label.
   * @private
   */
  private onExecuteToggleLabelCommand(label: string): void {
    this._model.update((model) => ({
      ...model,
      labels: model.labels.includes(label)
        ? model.labels.filter((candidate) => candidate !== label)
        : [...model.labels, label],
    }));
  }

  /**
   * Whether it is assignee selected.
   *
   * @param login - Login.
   * @private
   */
  private resolveIsAssigneeSelected(login: string): boolean {
    return this._model().assignees.includes(login);
  }

  /**
   * Toggles the assignee.
   *
   * @param login - Login.
   * @private
   */
  private onExecuteToggleAssigneeCommand(login: string): void {
    this._model.update((model) => ({
      ...model,
      assignees: model.assignees.includes(login)
        ? model.assignees.filter((candidate) => candidate !== login)
        : [...model.assignees, login],
    }));
  }

  /**
   * Drafts the with AI.
   *
   * @param event - Event.
   * @private
   */
  private async onExecuteDraftWithAiCommand(event?: unknown): Promise<void> {
    const submitted = this.valueFromEvent(event)?.trim();
    const prompt = submitted || this.draftPrompt().trim();
    const context = this.context();
    const current = this._model();
    if (!context || !this.canDraft() || !prompt) return;
    this.draftPrompt.set(prompt);
    const draft = await this._store.draftIssue({
      workspaceId: context.workspaceId,
      repository: current.repository,
      prompt,
      ...(current.title.trim() ? { title: current.title.trim() } : {}),
      ...(current.body.trim() ? { body: current.body } : {}),
      projectFields: current.projectFields,
    });
    if (!draft) return;
    this._model.set({
      ...current,
      title: draft.title,
      body: draft.body,
      projectFields: draft.projectFields,
      labels: draft.labels,
      assignees: draft.assignees,
    });
    this.creatorStage.set('review');
  }

  /**
   * Starts the over.
   *
   * @private
   */
  private onExecuteStartOverCommand(): void {
    this.creatorStage.set('prompt');
  }

  /**
   * Cancels the draft.
   *
   * @private
   */
  private async onExecuteCancelDraftCommand(): Promise<void> {
    await this._store.cancelIssueDraft();
  }

  /**
   * Creates the work item.
   *
   * @private
   */
  private async onExecuteCreateWorkItemCommand(): Promise<void> {
    const context = this.context();
    const current = this._model();
    if (!context || !this.canCreate()) return;
    const workItemId = await this._store.createWorkItem({
      workspaceId: context.workspaceId,
      title: current.title.trim(),
      body: current.body,
      repository: current.repository,
      projectFields: current.projectFields,
      labels: current.labels,
      assignees: current.assignees,
    });
    if (workItemId) await this._router.navigate(['/tickets', workItemId]);
  }

  /**
   * Returns the back.
   *
   * @private
   */
  private onExecuteBackCommand(): void {
    this._location.back();
  }

  private async loadContext(): Promise<void> {
    if (!(await this._store.loadWorkItemCreationContext())) return;
    const context = this.context();
    const repository = context?.repositories[0] ?? '';
    this._model.update((model) => ({ ...model, repository }));
    if (repository && (await this._store.loadWorkItemCreationContext(repository))) {
      this.normalizeProjectFields();
    }
  }

  private updateModelText(field: 'title' | 'body', event: unknown): void {
    const value = this.valueFromEvent(event);
    if (value !== undefined) this._model.update((model) => ({ ...model, [field]: value }));
  }

  private normalizeProjectFields(): void {
    this._model.update((model) => ({
      ...model,
      projectFields: this.projectFields().map((field) => {
        const existing = model.projectFields.find(
          (value) => value.fieldId === field.id && value.type === field.type,
        );
        if (existing) return existing;
        if (field.role === 'workflow-state' && field.type === 'single-select') {
          return {
            fieldId: field.id,
            type: field.type,
            value:
              field.options.find((option) => option.stageId === 'backlog')?.id ??
              field.options[0]?.id ??
              null,
          };
        }
        return this.emptyProjectFieldValue(field);
      }),
    }));
  }

  private projectFieldValue(fieldId: string): MobileProjectFieldValue | undefined {
    return this._model().projectFields.find((value) => value.fieldId === fieldId);
  }

  private replaceProjectFieldValue(value: MobileProjectFieldValue): void {
    this._model.update((model) => ({
      ...model,
      projectFields: [
        ...model.projectFields.filter((candidate) => candidate.fieldId !== value.fieldId),
        value,
      ],
    }));
  }

  private emptyProjectFieldValue(field: MobileProjectFieldDefinition): MobileProjectFieldValue {
    switch (field.type) {
      case 'text':
      case 'date':
        return { fieldId: field.id, type: field.type, value: '' };
      case 'number':
      case 'single-select':
      case 'iteration':
        return { fieldId: field.id, type: field.type, value: null };
      case 'multi-select':
        return { fieldId: field.id, type: field.type, value: [] };
    }
  }

  private valueFromEvent(event: unknown): string | undefined {
    if (typeof event === 'string') return event;
    const value = this.eventValue(event);
    return typeof value === 'string' ? value : undefined;
  }

  private eventValue(event: unknown): unknown {
    if (event instanceof Date || typeof event === 'string' || typeof event === 'number')
      return event;
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
    return detail['value'] ?? selection ?? target?.['value'] ?? record['detail'];
  }

  private dateValue(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // #endregion
}

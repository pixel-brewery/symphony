// #region Imports

import { computed, inject, signal, type Signal, type WritableSignal } from '@angular/core';
import { type FieldTree, form, required } from '@angular/forms/signals';
import type { IWorkItem, ProjectFieldDefinition, ProjectFieldValue } from '@symphony/domain-work';
import { Command } from '@symphony/frontend-core';
import type {
  IssueDraftDto,
  WorkItemEditorMetadataDto,
  WorkItemMutationDto,
} from '@symphony/ipc-contracts-work';
import type { IWorkTaskContext } from '../../../ports/IWorkTaskContext';
import { WORK_TASK_CONTEXT } from '../../../ports/WorkTaskContextToken';
import { WorkStore } from '../../../state/WorkStore';
import type { IWorkItemFormModel } from './IWorkItemFormModel';
import { readEventValue } from './readEventValue';

// #endregion

/**
 * The editable work-item form shared by the new-work-item sheet and the work-item screen.
 *
 * It owns the model, its validation, the provider metadata it is edited against (repositories,
 * columns, labels, assignees, project fields) and the mutation it writes. Both surfaces create
 * one inside their presenter, so creating and editing can never drift apart.
 *
 * Must be constructed in an injection context.
 *
 * @public
 */
export class WorkItemForm {
  // #region Fields

  private readonly _work: WorkStore;
  private readonly _context: IWorkTaskContext;
  private readonly _model: WritableSignal<IWorkItemFormModel> = signal({
    title: '',
    body: '',
    repository: '',
    workItemType: '',
    projectFields: [],
    labels: [],
    assignees: [],
  });
  private readonly _form: FieldTree<IWorkItemFormModel>;
  private readonly _projectFields: Signal<readonly ProjectFieldDefinition[]>;
  private readonly _workflowStateField: Signal<ProjectFieldDefinition | undefined>;
  private readonly _workflowStageId: Signal<string | undefined>;
  private readonly _hasRequiredValues: Signal<boolean>;
  private readonly _creationWorkspaceId: Signal<string | undefined>;
  private readonly _isLabelSelected: Signal<(label: string) => boolean>;
  private readonly _isAssigneeSelected: Signal<(login: string) => boolean>;
  private readonly _projectFieldText: Signal<(fieldId: string) => string>;
  private readonly _projectFieldNumber: Signal<(fieldId: string) => number | null>;
  private readonly _projectFieldDate: Signal<(fieldId: string) => Date | null>;
  private readonly _projectFieldSelection: Signal<(fieldId: string) => string>;
  private readonly _isProjectFieldOptionSelected: Signal<
    (fieldId: string, optionId: string) => boolean
  >;
  private readonly _toggleLabelCommand: Command<string>;
  private readonly _toggleAssigneeCommand: Command<string>;
  private readonly _updateProjectFieldCommand: Command<
    readonly [field: ProjectFieldDefinition, event: unknown]
  >;
  private readonly _clearProjectFieldCommand: Command<ProjectFieldDefinition>;
  private readonly _toggleProjectFieldOptionCommand: Command<
    readonly [fieldId: string, optionId: string]
  >;
  private _loadedMetadataRepository?: string;
  private _loadingMetadataRepository?: string;

  // #endregion

  // #region Ctor

  /**
   * Creates the form against the work store and the task context of the current injector.
   *
   * @param work - Work store that owns metadata and mutations.
   * @param context - Task projection with the snapshot and settings.
   * @public
   */
  public constructor(
    work: WorkStore = inject(WorkStore),
    context: IWorkTaskContext = inject(WORK_TASK_CONTEXT),
  ) {
    this._work = work;
    this._context = context;
    this._form = form(this._model, (schema) => {
      required(schema.title, { message: 'Enter a work-item title.' });
      required(schema.repository, { message: 'Choose a repository.' });
    });
    this._projectFields = computed(() => this._work.workItemMetadata()?.projectFields ?? []);
    this._workflowStateField = computed(() =>
      this._projectFields().find(
        (field) => field.role === 'workflow-state' && field.type === 'single-select',
      ),
    );
    this._workflowStageId = computed(() => {
      const field = this._workflowStateField();
      if (field?.type !== 'single-select') return undefined;
      const value = this._model().projectFields.find((entry) => entry.fieldId === field.id);
      const optionId = value?.type === 'single-select' ? value.value : null;
      return field.options.find((option) => option.id === optionId)?.stageId;
    });
    this._hasRequiredValues = computed(
      () => this._model().title.trim().length > 0 && this._model().repository.trim().length > 0,
    );
    this._creationWorkspaceId = computed(
      () => this._context.creationBoard()?.workspaceId ?? this._context.activeWorkspace()?.id,
    );
    this._isLabelSelected = computed(() => {
      const labels = this._model().labels;
      return (label: string) => labels.includes(label);
    });
    this._isAssigneeSelected = computed(() => {
      const assignees = this._model().assignees;
      return (login: string) => assignees.includes(login);
    });
    this._projectFieldText = computed(() => {
      const values = this._model().projectFields;
      return (fieldId: string) => {
        const value = values.find((entry) => entry.fieldId === fieldId);
        return value?.type === 'text' ? value.value : '';
      };
    });
    this._projectFieldNumber = computed(() => {
      const values = this._model().projectFields;
      return (fieldId: string) => {
        const value = values.find((entry) => entry.fieldId === fieldId);
        return value?.type === 'number' ? value.value : null;
      };
    });
    this._projectFieldDate = computed(() => {
      const values = this._model().projectFields;
      return (fieldId: string) => {
        const value = values.find((entry) => entry.fieldId === fieldId);
        return value?.type === 'date' && value.value ? new Date(`${value.value}T00:00:00`) : null;
      };
    });
    this._projectFieldSelection = computed(() => {
      const values = this._model().projectFields;
      return (fieldId: string) => {
        const value = values.find((entry) => entry.fieldId === fieldId);
        return value?.type === 'single-select' || value?.type === 'iteration'
          ? (value.value ?? '')
          : '';
      };
    });
    this._isProjectFieldOptionSelected = computed(() => {
      const values = this._model().projectFields;
      return (fieldId: string, optionId: string) => {
        const value = values.find((entry) => entry.fieldId === fieldId);
        return value?.type === 'multi-select' && value.value.includes(optionId);
      };
    });
    this._toggleLabelCommand = new Command((label) => this.toggleListValue('labels', label));
    this._toggleAssigneeCommand = new Command((login) => this.toggleListValue('assignees', login));
    this._updateProjectFieldCommand = new Command(([field, event]) =>
      this.updateProjectField(field, event),
    );
    this._clearProjectFieldCommand = new Command((field) =>
      this.replaceProjectFieldValue(this.emptyProjectFieldValue(field)),
    );
    this._toggleProjectFieldOptionCommand = new Command(([fieldId, optionId]) =>
      this.toggleProjectFieldOption(fieldId, optionId),
    );
  }

  // #endregion

  // #region Properties

  /**
   * The current values.
   *
   * @public
   * @readonly
   */
  public get model(): Signal<IWorkItemFormModel> {
    return this._model.asReadonly();
  }

  /**
   * The signal form over the values, with the title and repository required.
   *
   * @public
   * @readonly
   */
  public get form(): FieldTree<IWorkItemFormModel> {
    return this._form;
  }

  /**
   * Provider metadata the form is edited against.
   *
   * @public
   * @readonly
   */
  public get metadata(): Signal<WorkItemEditorMetadataDto | undefined> {
    return this._work.workItemMetadata;
  }

  /**
   * Project fields of the provider, in provider order.
   *
   * @public
   * @readonly
   */
  public get projectFields(): Signal<readonly ProjectFieldDefinition[]> {
    return this._projectFields;
  }

  /**
   * The field that holds the board column, when the provider keeps it in a project field.
   *
   * @public
   * @readonly
   */
  public get workflowStateField(): Signal<ProjectFieldDefinition | undefined> {
    return this._workflowStateField;
  }

  /**
   * Workflow stage of the option selected in the workflow-state field.
   *
   * @public
   * @readonly
   */
  public get workflowStageId(): Signal<string | undefined> {
    return this._workflowStageId;
  }

  /**
   * Whether the title and the repository are filled in.
   *
   * @public
   * @readonly
   */
  public get hasRequiredValues(): Signal<boolean> {
    return this._hasRequiredValues;
  }

  /**
   * Workspace that owns new work items: the creation board's, else the active workspace.
   *
   * @public
   * @readonly
   */
  public get creationWorkspaceId(): Signal<string | undefined> {
    return this._creationWorkspaceId;
  }

  /**
   * Whether a label is selected.
   *
   * @public
   * @readonly
   */
  public get isLabelSelected(): Signal<(label: string) => boolean> {
    return this._isLabelSelected;
  }

  /**
   * Whether an assignee is selected.
   *
   * @public
   * @readonly
   */
  public get isAssigneeSelected(): Signal<(login: string) => boolean> {
    return this._isAssigneeSelected;
  }

  /**
   * Text value of a project field.
   *
   * @public
   * @readonly
   */
  public get projectFieldText(): Signal<(fieldId: string) => string> {
    return this._projectFieldText;
  }

  /**
   * Number value of a project field.
   *
   * @public
   * @readonly
   */
  public get projectFieldNumber(): Signal<(fieldId: string) => number | null> {
    return this._projectFieldNumber;
  }

  /**
   * Date value of a project field.
   *
   * @public
   * @readonly
   */
  public get projectFieldDate(): Signal<(fieldId: string) => Date | null> {
    return this._projectFieldDate;
  }

  /**
   * Selected option of a single-select or iteration field.
   *
   * @public
   * @readonly
   */
  public get projectFieldSelection(): Signal<(fieldId: string) => string> {
    return this._projectFieldSelection;
  }

  /**
   * Whether an option of a multi-select field is selected.
   *
   * @public
   * @readonly
   */
  public get isProjectFieldOptionSelected(): Signal<
    (fieldId: string, optionId: string) => boolean
  > {
    return this._isProjectFieldOptionSelected;
  }

  /**
   * Adds or removes a label.
   *
   * @public
   * @readonly
   */
  public get toggleLabelCommand(): Command<string> {
    return this._toggleLabelCommand;
  }

  /**
   * Adds or removes an assignee.
   *
   * @public
   * @readonly
   */
  public get toggleAssigneeCommand(): Command<string> {
    return this._toggleAssigneeCommand;
  }

  /**
   * Writes a project-field control's value.
   *
   * @public
   * @readonly
   */
  public get updateProjectFieldCommand(): Command<
    readonly [field: ProjectFieldDefinition, event: unknown]
  > {
    return this._updateProjectFieldCommand;
  }

  /**
   * Empties a project field.
   *
   * @public
   * @readonly
   */
  public get clearProjectFieldCommand(): Command<ProjectFieldDefinition> {
    return this._clearProjectFieldCommand;
  }

  /**
   * Toggles an option of a multi-select project field.
   *
   * @public
   * @readonly
   */
  public get toggleProjectFieldOptionCommand(): Command<
    readonly [fieldId: string, optionId: string]
  > {
    return this._toggleProjectFieldOptionCommand;
  }

  // #endregion

  // #region Methods

  /**
   * Replaces the values with the stored state of an existing work item.
   *
   * @param item - The stored item.
   * @public
   */
  public reset(item: IWorkItem): void {
    this._model.set({
      title: item.title,
      body: item.body,
      repository: item.repository,
      workItemType: item.workItemType ?? '',
      projectFields: [...(item.projectFields ?? [])],
      labels: [...item.labels],
      assignees: item.assignees.map((assignee) => assignee.login),
    });
  }

  /**
   * Loads the provider metadata for an existing item, or for a new item in the creation scope,
   * and fills the defaults it implies.
   *
   * @param item - The existing item; omitted while creating.
   * @returns Whether the metadata loaded.
   * @public
   */
  public async loadMetadata(item?: IWorkItem): Promise<boolean> {
    const loaded = await this._work.loadWorkItemMetadata(
      item?.repository,
      item?.workspaceId ?? this._creationWorkspaceId(),
      item?.sourceId ?? this._context.creationBoard()?.id,
    );
    if (loaded) this.applyMetadata();
    return loaded;
  }

  /**
   * Selects the repository of a new item and loads the metadata that belongs to it.
   *
   * @param repository - Repository name as the metadata lists it.
   * @public
   */
  public async selectRepository(repository: string): Promise<void> {
    if (!repository) return;
    this._model.update((model) => ({ ...model, repository }));
    if (
      repository === this._loadedMetadataRepository ||
      repository === this._loadingMetadataRepository
    ) {
      return;
    }
    this._loadingMetadataRepository = repository;
    try {
      const loaded = await this._work.loadWorkItemMetadata(
        repository,
        this._creationWorkspaceId(),
        this._context.creationBoard()?.id,
      );
      if (loaded) this.applyMetadata();
    } finally {
      if (this._loadingMetadataRepository === repository) {
        this._loadingMetadataRepository = undefined;
      }
    }
  }

  /**
   * Takes over an AI draft: its title, description, classified fields, labels and assignees.
   *
   * @param draft - The draft the creation agent returned.
   * @public
   */
  public applyDraft(draft: IssueDraftDto): void {
    this._model.update((model) => ({
      ...model,
      title: draft.title,
      body: draft.body,
      projectFields: [...draft.projectFields],
      labels: [...draft.labels],
      assignees: [...draft.assignees],
    }));
  }

  /**
   * Writes one project-field value, replacing the previous value of that field.
   *
   * @param value - The new value.
   * @public
   */
  public replaceProjectFieldValue(value: ProjectFieldValue): void {
    this._model.update((model) => ({
      ...model,
      projectFields: [
        ...model.projectFields.filter((candidate) => candidate.fieldId !== value.fieldId),
        value,
      ],
    }));
  }

  /**
   * Points the workflow-state field at the option of a workflow stage, so a new item is created
   * in the column of that stage.
   *
   * @param stageId - Stage of the chosen column.
   * @returns Whether the provider keeps the column in a field that has an option for the stage.
   * @public
   */
  public selectWorkflowStage(stageId: string | undefined): boolean {
    const field = this._workflowStateField();
    if (!stageId || field?.type !== 'single-select') return false;
    const option = field.options.find((candidate) => candidate.stageId === stageId);
    if (!option) return false;
    this.replaceProjectFieldValue({ fieldId: field.id, type: field.type, value: option.id });
    return true;
  }

  /**
   * Builds the mutation the provider receives, resolving the board and repository bindings the
   * item belongs to.
   *
   * @param existing - The stored item while editing; omitted while creating.
   * @returns The mutation.
   * @public
   */
  public toMutation(existing?: IWorkItem): WorkItemMutationDto {
    const current = this._model();
    const settings = this._context.settings();
    const workspaceId = existing?.workspaceId ?? this._creationWorkspaceId();
    const deliveryContext = settings?.deliveryContexts.find(
      (context) => context.enabled && context.workspaceId === workspaceId,
    );
    const sourceId =
      existing?.sourceId ??
      this._context.creationBoard()?.id ??
      deliveryContext?.workItemSourceIds[0] ??
      settings?.workItemSources.find(
        (source) => source.enabled && source.workspaceId === workspaceId,
      )?.id;
    const repositoryBindingIds = existing?.repositoryBindingIds?.length
      ? existing.repositoryBindingIds
      : (settings?.repositoryBindings ?? [])
          .filter(
            (repository) =>
              repository.enabled &&
              repository.workspaceId === workspaceId &&
              (repository.id === current.repository ||
                repository.displayName === current.repository ||
                `${repository.owner}/${repository.name}` === current.repository),
          )
          .map((repository) => repository.id);
    return {
      ...(workspaceId ? { workspaceId } : {}),
      ...(sourceId ? { sourceId } : {}),
      ...(current.workItemType ? { workItemType: current.workItemType } : {}),
      title: current.title.trim(),
      body: current.body,
      repository: current.repository,
      repositoryBindingIds,
      projectFields: current.projectFields,
      labels: current.labels,
      assignees: current.assignees,
    };
  }

  /** Fills the repository, type and project-field defaults the loaded metadata implies. */
  private applyMetadata(): void {
    const metadata = this._work.workItemMetadata();
    if (!metadata) return;
    const repository = this._model().repository || metadata.repositories[0] || '';
    this._loadedMetadataRepository = repository;
    this._model.update((model) => ({
      ...model,
      repository,
      workItemType:
        model.workItemType || metadata.defaultWorkItemType || metadata.workItemTypes?.[0] || '',
      projectFields: this.normalizeProjectFields(metadata.projectFields, model.projectFields),
    }));
  }

  private toggleListValue(key: 'labels' | 'assignees', value: string): void {
    this._model.update((model) => ({
      ...model,
      [key]: model[key].includes(value)
        ? model[key].filter((candidate) => candidate !== value)
        : [...model[key], value],
    }));
  }

  private updateProjectField(field: ProjectFieldDefinition, event: unknown): void {
    const raw = readEventValue(event);
    let value: ProjectFieldValue;
    switch (field.type) {
      case 'text':
        value = { fieldId: field.id, type: field.type, value: typeof raw === 'string' ? raw : '' };
        break;
      case 'number': {
        const number =
          typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
        value = {
          fieldId: field.id,
          type: field.type,
          value: Number.isFinite(number) ? number : null,
        };
        break;
      }
      case 'date':
        value = {
          fieldId: field.id,
          type: field.type,
          value: raw instanceof Date && !Number.isNaN(raw.valueOf()) ? this.dateValue(raw) : '',
        };
        break;
      case 'single-select':
      case 'iteration':
        value = {
          fieldId: field.id,
          type: field.type,
          value: typeof raw === 'string' && raw ? raw : null,
        };
        break;
      case 'multi-select':
        return;
    }
    this.replaceProjectFieldValue(value);
  }

  private toggleProjectFieldOption(fieldId: string, optionId: string): void {
    const value = this._model().projectFields.find((entry) => entry.fieldId === fieldId);
    if (value?.type !== 'multi-select') return;
    this.replaceProjectFieldValue({
      ...value,
      value: value.value.includes(optionId)
        ? value.value.filter((candidate) => candidate !== optionId)
        : [...value.value, optionId],
    });
  }

  private normalizeProjectFields(
    fields: readonly ProjectFieldDefinition[],
    values: readonly ProjectFieldValue[],
  ): ProjectFieldValue[] {
    return fields.map((field) => {
      const existing = values.find(
        (value) => value.fieldId === field.id && value.type === field.type,
      );
      if (existing) return existing;
      if (field.role === 'workflow-state' && field.type === 'single-select') {
        return {
          fieldId: field.id,
          type: field.type,
          value:
            field.options.find(
              (option) => option.stageId === this._context.snapshot()?.workflow.initialStageId,
            )?.id ??
            field.options[0]?.id ??
            null,
        };
      }
      return this.emptyProjectFieldValue(field);
    });
  }

  private emptyProjectFieldValue(field: ProjectFieldDefinition): ProjectFieldValue {
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

  private dateValue(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // #endregion
}

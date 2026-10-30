// #region Imports

import type {
  IIssueDraft,
  IIssueDraftRequest,
  IWorkItem,
  IWorkItemEditorMetadata,
  IWorkItemMutation,
} from '@symphony/domain-work';
import type { IIssueDraftingPort } from './IIssueDraftingPort';
import type { IWorkItemSkillCatalog } from './IWorkItemSkillCatalog';
import type { IWorkItemServiceDependencies } from './IWorkItemServiceDependencies';

// #endregion

/**
 * Owns provider-neutral Work Item editing and cancellable Skill-based draft operations.
 *
 * @public
 */
export class WorkItemService {
  // #region Fields

  private readonly _activeDrafts = new Map<string, IActiveDraftOperation>();

  // #endregion

  // #region Ctor

  /**
   * Binds the consumed tracker, Skill catalog and draft lifecycle dependencies.
   *
   * @param _dependencies - Effects and callbacks owned by this Work Item service.
   * @public
   */
  public constructor(private readonly _dependencies: IWorkItemServiceDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Returns the metadata.
   *
   * @param repository - Repository.
   * @param workspaceId - Workspace id.
   * @param sourceId - Source id.
   * @public
   */
  public async metadata(
    repository?: string,
    workspaceId?: string,
    sourceId?: string,
  ): Promise<IWorkItemEditorMetadata> {
    const metadata = await this._dependencies.tracker.listEditorMetadata(
      repository,
      workspaceId,
      sourceId,
    );
    const skills = this._dependencies.catalog.skills(workspaceId);
    const manifestFor = (packageDocument: ReturnType<IWorkItemSkillCatalog['analysisSkill']>) =>
      packageDocument ? skills.find((skill) => skill.id === packageDocument.id) : undefined;
    const issueCreatorSkill = manifestFor(
      this._dependencies.catalog.issueCreatorSkill(workspaceId),
    );
    const analysisSkill = manifestFor(this._dependencies.catalog.analysisSkill(workspaceId));
    const solutionSkill = manifestFor(this._dependencies.catalog.solutionSkill(workspaceId));
    return {
      ...metadata,
      ...(issueCreatorSkill ? { issueCreatorSkill } : {}),
      ...(analysisSkill ? { analysisSkill } : {}),
      ...(solutionSkill ? { solutionSkill } : {}),
    };
  }

  /**
   * Creates.
   *
   * @param input - Input.
   * @public
   */
  public async create(input: IWorkItemMutation): Promise<IWorkItem> {
    const workItem = await this._dependencies.tracker.createWorkItem(input);
    this._dependencies.workItemChanged?.(workItem);
    return workItem;
  }

  /**
   * Updates.
   *
   * @param workItemId - Work item id.
   * @param input - Input.
   * @public
   */
  public async update(workItemId: string, input: IWorkItemMutation): Promise<IWorkItem> {
    const workItem = await this._dependencies.tracker.updateWorkItem(workItemId, input);
    this._dependencies.workItemChanged?.(workItem);
    return workItem;
  }

  /**
   * Appends one operator comment to the provider discussion of a tracked item.
   *
   * The complete item is read before the write: the drawer has to show the thread the comment
   * lands in, and a provider that refuses the comment then leaves nothing behind. The thread is
   * only extended locally - a comment another person wrote in the meantime arrives with the
   * next refresh, not with this answer.
   *
   * @param workItemId - Work item id.
   * @param body - Body.
   * @public
   */
  public async comment(workItemId: string, body: string): Promise<IWorkItem> {
    const tracker = this._dependencies.tracker;
    if (!tracker.createWorkItemComment) {
      throw new Error('This work-item provider does not carry comments.');
    }
    const item = await this._dependencies.workItemDetails(workItemId);
    const comment = await tracker.createWorkItemComment(workItemId, body);
    const commented: IWorkItem = { ...item, comments: [...(item.comments ?? []), comment] };
    this._dependencies.workItemChanged?.(commented);
    return commented;
  }

  /**
   * Moves one item to a provider board column. Nothing here decides whether the move is sound:
   * the workflow record adopts the stage the provider reports, exactly as it does for a card a
   * person drags in the tracker itself.
   *
   * @param workItemId - Work item id.
   * @param boardColumnId - Board column id.
   * @public
   */
  public async move(workItemId: string, boardColumnId: string): Promise<IWorkItem> {
    const workItem = await this._dependencies.tracker.moveToColumn(workItemId, boardColumnId);
    this._dependencies.workItemChanged?.(workItem);
    return workItem;
  }

  /**
   * Drafts.
   *
   * @param request - Request.
   * @public
   */
  public async draft(request: IIssueDraftRequest): Promise<IIssueDraft> {
    if (this._activeDrafts.has(request.operationId)) {
      throw new Error(`Issue draft operation is already active: ${request.operationId}`);
    }
    const skill = this._dependencies.catalog.issueCreatorSkill(request.workspaceId);
    if (!skill) {
      throw new Error('Activate the create-change-request skill before drafting a work item.');
    }
    const workingDirectory = this._dependencies.workingDirectory(request);
    if (!workingDirectory) throw new Error('Choose an active repository source first.');
    const operation: IActiveDraftOperation = {
      controller: new AbortController(),
      repository: request.repository,
      workspaceId: request.workspaceId,
      restartRequested: false,
      cancelRequested: false,
    };
    const completion = this.completeDraftWithReactivation(
      operation,
      request,
      skill,
      workingDirectory,
    );
    operation.completion = completion;
    this._activeDrafts.set(request.operationId, operation);
    try {
      return await completion;
    } finally {
      this._activeDrafts.delete(request.operationId);
    }
  }

  /**
   * Cancels the draft.
   *
   * @param operationId - Operation id.
   * @public
   */
  public cancelDraft(operationId: string): boolean {
    const operation = this._activeDrafts.get(operationId);
    if (!operation) return false;
    operation.cancelRequested = true;
    operation.controller.abort();
    return true;
  }

  /**
   * Returns the active draft operations.
   *
   * @public
   */
  public activeDraftOperations(): readonly {
    operationId: string;
    repository: string;
  }[] {
    return [...this._activeDrafts.entries()].map(([operationId, operation]) => ({
      operationId,
      repository: operation.repository,
    }));
  }

  /**
   * Cancels the active drafts.
   *
   * @public
   */
  public async cancelActiveDrafts(): Promise<readonly string[]> {
    const active = [...this._activeDrafts.entries()];
    for (const [, operation] of active) {
      operation.cancelRequested = true;
      operation.controller.abort();
    }
    await Promise.allSettled(
      active.flatMap(([, operation]) => (operation.completion ? [operation.completion] : [])),
    );
    return active.map(([operationId]) => operationId);
  }

  /**
   * Whether it has active draft for workspace.
   *
   * @param workspaceId - Workspace id.
   * @public
   */
  public hasActiveDraftForWorkspace(workspaceId: string): boolean {
    return [...this._activeDrafts.values()].some(
      (operation) => operation.workspaceId === workspaceId,
    );
  }

  /**
   * Returns the reactivate active drafts.
   *
   * @public
   */
  public reactivateActiveDrafts(): number {
    const active = [...this._activeDrafts.values()];
    let reactivated = 0;
    for (const operation of active) {
      if (operation.cancelRequested) continue;
      operation.restartRequested = true;
      operation.controller.abort();
      reactivated += 1;
    }
    return reactivated;
  }

  private async completeDraftWithReactivation(
    operation: Pick<IActiveDraftOperation, 'controller' | 'restartRequested' | 'cancelRequested'>,
    request: IIssueDraftRequest,
    skill: Parameters<IIssueDraftingPort['draftIssue']>[2],
    workingDirectory: string,
  ): Promise<IIssueDraft> {
    while (true) {
      operation.controller = new AbortController();
      try {
        return await this.completeDraft(
          request,
          skill,
          workingDirectory,
          operation.controller.signal,
        );
      } catch (cause) {
        if (operation.cancelRequested) throw cause;
        if (!operation.restartRequested) throw cause;
        operation.restartRequested = false;
      }
    }
  }

  private async completeDraft(
    request: IIssueDraftRequest,
    skill: Parameters<IIssueDraftingPort['draftIssue']>[2],
    workingDirectory: string,
    signal: AbortSignal,
  ): Promise<IIssueDraft> {
    const metadata = await this._dependencies.tracker.listEditorMetadata(
      request.repository,
      request.workspaceId,
      request.sourceId,
    );
    const draft = await this._dependencies.issueDrafter.draftIssue(
      request,
      metadata,
      skill,
      workingDirectory,
      signal,
    );
    return this.validateDraft(draft, metadata);
  }

  private validateDraft(draft: IIssueDraft, metadata: IWorkItemEditorMetadata): IIssueDraft {
    const allowedLabels = new Set(metadata.labels.map((label) => label.name));
    const allowedAssignees = new Set(metadata.assignees.map((assignee) => assignee.login));
    const labels = [...new Set(draft.labels)];
    const assignees = [...new Set(draft.assignees)];
    const projectFields = metadata.projectFields.map((field) => {
      const values = draft.projectFields.filter((value) => value.fieldId === field.id);
      if (values.length !== 1) {
        throw new Error(`Work Item Creator must return field ${field.name} exactly once.`);
      }
      const value = values[0]!;
      if (value.type !== field.type) {
        throw new Error(`Work Item Creator returned the wrong data type for ${field.name}.`);
      }
      if (field.type === 'multi-select' && value.type === 'multi-select') {
        const selected = [...new Set(value.value)];
        const unavailable = selected.find(
          (optionId) => !field.options.some((option) => option.id === optionId),
        );
        if (unavailable) {
          throw new Error(`Work Item Creator selected an unavailable option for ${field.name}.`);
        }
        return { ...value, value: selected };
      }
      if ('options' in field) {
        const selected = Array.isArray(value.value)
          ? [...new Set(value.value)]
          : value.value
            ? [value.value]
            : [];
        const unavailable = selected.find(
          (optionId) => !field.options.some((option) => option.id === optionId),
        );
        if (unavailable) {
          throw new Error(`Work Item Creator selected an unavailable option for ${field.name}.`);
        }
        return value;
      }
      return value;
    });
    const unknownField = draft.projectFields.find(
      (value) => !metadata.projectFields.some((field) => field.id === value.fieldId),
    );
    if (unknownField) {
      throw new Error(`Work Item Creator returned an unavailable field: ${unknownField.fieldId}.`);
    }
    const unavailableLabel = labels.find((label) => !allowedLabels.has(label));
    if (unavailableLabel) {
      throw new Error(`Work Item Creator selected an unavailable label: ${unavailableLabel}.`);
    }
    const unavailableAssignee = assignees.find((assignee) => !allowedAssignees.has(assignee));
    if (unavailableAssignee) {
      throw new Error(
        `Work Item Creator selected an unavailable assignee: ${unavailableAssignee}.`,
      );
    }
    return { ...draft, projectFields, labels, assignees };
  }

  // #endregion
}

interface IActiveDraftOperation {
  controller: AbortController;
  readonly repository: string;
  readonly workspaceId?: string;
  completion?: Promise<IIssueDraft>;
  restartRequested: boolean;
  cancelRequested: boolean;
}

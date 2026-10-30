// #region Imports

import type { IWorkTrackingPort } from '@symphony/providers-work';
import { RemoteProviderAuthenticationRequiredError } from '@symphony/application-core';
import {
  type IBoardColumn,
  type IBoardColumnCandidate,
  type IWorkItem,
  type IWorkItemAssignee,
  type IWorkItemComment,
  type IWorkItemEditorMetadata,
  type IWorkItemLabelOption,
  type IWorkItemMutation,
  type WorkItemSource,
} from '@symphony/domain-work';
import { type IRepositoryBinding } from '@symphony/domain-workspace';
import { type WorkflowStageId } from '@symphony/domain-workflow';
import { marked } from 'marked';
import type { AzureConnection } from './AzureConnection';
import type { AzureSource } from './AzureSource';
import type { IAzureBoardColumnDocument } from './IAzureBoardColumnDocument';
import type { IAzureDevOpsWorkTrackerOptions } from './IAzureDevOpsWorkTrackerOptions';
import type { IAzureIdentity } from './IAzureIdentity';
import type { IAzureStateDocument } from './IAzureStateDocument';
import type { IAzureWorkItemDocument } from './IAzureWorkItemDocument';

// #endregion

export class AzureDevOpsWorkTracker implements IWorkTrackingPort {
  // #region Fields

  private readonly _fetch: typeof globalThis.fetch;
  private readonly _cache = new Map<string, ICachedWorkItem>();
  private readonly _states = new Map<string, readonly IAzureStateDocument[]>();
  private readonly _sourceColumns = new Map<string, IAzureSourceColumns>();
  private readonly _boardContexts = new Map<string, IAzureBoardContext>();
  private readonly _workItemTypes = new Map<string, readonly string[]>();
  private readonly _assignees = new Map<string, readonly IWorkItemAssignee[]>();
  private readonly _labels = new Map<string, readonly IWorkItemLabelOption[]>();
  private readonly _repositorySelections = new Map<string, readonly string[]>();

  // #endregion

  // #region Ctor

  public constructor(private readonly _options: IAzureDevOpsWorkTrackerOptions) {
    this._fetch = _options.fetch ?? globalThis.fetch;
  }

  // #endregion

  // #region Methods

  /**
   * Lists the work items.
   *
   * @public
   */
  public async listWorkItems(): Promise<readonly IWorkItem[]> {
    const settings = this._options.settings();
    const selectedWorkspaceIds = new Set(settings.activeViewScope.workspaceIds);
    const sources = settings.workItemSources.filter(
      (source): source is AzureSource =>
        source.provider === 'azure-devops' &&
        source.enabled &&
        selectedWorkspaceIds.has(source.workspaceId),
    );
    const results = await Promise.all(sources.map((source) => this.listSourceItems(source)));
    return results.flat();
  }

  /**
   * Columns of every loaded source, exactly as the provider defines them.
   *
   * @public
   */
  public async listBoardColumns(): Promise<readonly IBoardColumn[]> {
    const settings = this._options.settings();
    const selected = new Set(settings.activeViewScope.workspaceIds);
    for (const sourceId of [...this._sourceColumns.keys()]) {
      if (!settings.workItemSources.some((source) => source.id === sourceId)) {
        this._sourceColumns.delete(sourceId);
      }
    }
    return [...this._sourceColumns.entries()]
      .filter(([sourceId]) =>
        settings.workItemSources.some(
          (source) => source.id === sourceId && source.enabled && selected.has(source.workspaceId),
        ),
      )
      .flatMap(([, entry]) => entry.columns);
  }

  /**
   * Reads the columns of one (possibly unsaved) source for the settings editor, with suggested mappings.
   *
   * @param source - Source.
   * @public
   */
  public async listSourceColumns(
    source: WorkItemSource,
  ): Promise<readonly IBoardColumnCandidate[]> {
    if (source.provider !== 'azure-devops') {
      throw new Error(`Azure DevOps cannot read columns of a ${source.provider} source.`);
    }
    const connection = this.resolveConnection(source);
    if (source.team && source.boardId) {
      await this.loadBoardContext(connection, source);
      const documents = await this.loadBoardColumnDocuments(connection, source);
      return documents.flatMap((column) => {
        if (!column.id || !column.name) return [];
        return [{ id: column.id, label: column.name }];
      });
    }
    const types = await this.request<IAzureWorkItemTypeListResponse>(
      connection,
      source,
      'wit/workitemtypes',
      { method: 'GET' },
    );
    const typeNames = (types.value ?? [])
      .filter((type) => type.name && !type.isDisabled)
      .map((type) => type.name!)
      .slice(0, 12);
    const stateLists = await Promise.all(
      typeNames.map((workItemType) => this.loadStates(connection, source, workItemType)),
    );
    return stateColumnCandidates(stateLists);
  }

  /**
   * Lists the project fields.
   *
   * @public
   */
  public async listProjectFields(): Promise<IWorkItemEditorMetadata['projectFields']> {
    return [];
  }

  /**
   * Lists the editor metadata.
   *
   * @param _repository - Repository.
   * @param workspaceId - Workspace id.
   * @param sourceId - Source id.
   * @public
   */
  public async listEditorMetadata(
    _repository?: string,
    workspaceId?: string,
    sourceId?: string,
  ): Promise<IWorkItemEditorMetadata> {
    const source = this.resolveSource(sourceId, workspaceId);
    const connection = this.resolveConnection(source);
    if (!this._sourceColumns.has(source.id)) {
      await this.loadSourceColumns(connection, source, this._workItemTypes.get(source.id) ?? []);
    }
    const workItemTypes = await this.loadWorkItemTypes(connection, source);
    return {
      repositories: this._options
        .settings()
        .repositoryBindings.filter(
          (item) => item.enabled && item.workspaceId === source.workspaceId,
        )
        .map((item) => item.displayName || `${item.owner}/${item.name}`),
      ...(workItemTypes.length ? { workItemTypes, defaultWorkItemType: workItemTypes[0] } : {}),
      labels: this._labels.get(source.id) ?? [],
      assignees: this._assignees.get(source.id) ?? [],
      states: (await this.listBoardColumns()).filter((column) => column.sourceId === source.id),
      projectFields: [],
    };
  }

  /**
   * Creates the work item.
   *
   * @param input - Input.
   * @public
   */
  public async createWorkItem(input: IWorkItemMutation): Promise<IWorkItem> {
    const source = this.resolveSource(input.sourceId, input.workspaceId);
    const connection = this.resolveConnection(source);
    const workItemType = input.workItemType?.trim() || 'Task';
    const operations = [
      patchAdd('/fields/System.Title', input.title),
      patchAdd('/fields/System.Description', markdownToAzureHtml(input.body)),
      ...(input.labels.length ? [patchAdd('/fields/System.Tags', input.labels.join('; '))] : []),
      ...(input.assignees[0] ? [patchAdd('/fields/System.AssignedTo', input.assignees[0])] : []),
    ];
    const document = await this.request<IAzureWorkItemDocument>(
      connection,
      source,
      `wit/workitems/$${encodeURIComponent(workItemType)}`,
      {
        method: 'POST',
        body: JSON.stringify(operations),
        contentType: 'application/json-patch+json',
      },
    );
    return this.mapDocument(source, document, input);
  }

  /**
   * Updates the work item.
   *
   * @param workItemId - Work item id.
   * @param input - Input.
   * @public
   */
  public async updateWorkItem(workItemId: string, input: IWorkItemMutation): Promise<IWorkItem> {
    const cached = this.requireCached(workItemId);
    const connection = this.resolveConnection(cached.source);
    const revision = input.revision ?? cached.document.rev;
    const operations = [
      { op: 'test', path: '/rev', value: revision },
      patchAdd('/fields/System.Title', input.title),
      patchAdd('/fields/System.Description', markdownToAzureHtml(input.body)),
      patchAdd('/fields/System.Tags', input.labels.join('; ')),
      ...(input.assignees[0]
        ? [patchAdd('/fields/System.AssignedTo', input.assignees[0])]
        : fieldIdentity(cached.document, 'System.AssignedTo')
          ? [patchRemove('/fields/System.AssignedTo')]
          : []),
    ];
    const document = await this.request<IAzureWorkItemDocument>(
      connection,
      cached.source,
      `wit/workitems/${cached.document.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(operations),
        contentType: 'application/json-patch+json',
      },
    );
    return this.mapDocument(cached.source, document, input);
  }

  /**
   * Loads the complete Azure DevOps work item and its discussion thread.
   *
   * @param workItem - Work item whose provider detail is required.
   * @returns Complete work item including its discussion.
   * @public
   */
  public async loadWorkItemDetails(workItem: IWorkItem): Promise<IWorkItem> {
    const cached = this.requireCached(workItem.id);
    const connection = this.resolveConnection(cached.source);
    const [document, comments] = await Promise.all([
      this.request<IAzureWorkItemDocument>(
        connection,
        cached.source,
        `wit/workitems/${cached.document.id}?$expand=all`,
        { method: 'GET' },
      ),
      this.request<IAzureCommentListResponse>(
        connection,
        cached.source,
        `wit/workitems/${cached.document.id}/comments?$top=200&order=asc`,
        { method: 'GET', apiVersion: '7.1-preview.4' },
      ),
    ]);
    return {
      ...this.mapDocument(cached.source, document),
      detailState: 'complete',
      comments: (comments.comments ?? []).map(mapComment),
    };
  }

  /**
   * Adds one operator comment to the Azure DevOps discussion.
   *
   * @param workItemId - Work item identifier.
   * @param body - Comment body.
   * @returns Created provider-neutral work item comment.
   * @public
   */
  public async createWorkItemComment(workItemId: string, body: string): Promise<IWorkItemComment> {
    const cached = this.requireCached(workItemId);
    const connection = this.resolveConnection(cached.source);
    const comment = await this.request<IAzureCommentDocument>(
      connection,
      cached.source,
      `wit/workitems/${cached.document.id}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ text: body }),
        contentType: 'application/json',
        apiVersion: '7.1-preview.4',
      },
    );
    return mapComment(comment);
  }

  /**
   * Returns the transition.
   *
   * @param workItemId - Work item id.
   * @param state - State.
   * @public
   */
  public async transition(workItemId: string, state: WorkflowStageId): Promise<IWorkItem> {
    const cached = this.requireCached(workItemId);
    const connection = this.resolveConnection(cached.source);
    const columns =
      this._sourceColumns.get(cached.source.id) ??
      (await this.loadSourceColumns(connection, cached.source, [cached.workItemType]));
    const currentColumnId = columns.columnIdOf(cached.document);
    const candidates = columns.columns.filter((column) => column.stageId === state);
    const column =
      candidates.find((candidate) => candidate.id === currentColumnId) ?? candidates[0];
    const nativeState = column ? columns.nativeState(column.id, cached.workItemType) : undefined;
    if (!column || !nativeState) {
      throw new Error(
        `Azure DevOps board "${cached.source.displayName}" has no column mapped to the workflow state "${state}" for ${cached.workItemType}. Map a column in the board settings.`,
      );
    }
    return this.writeNativeColumn(cached, connection, columns, column, nativeState);
  }

  /**
   * Moves the to column.
   *
   * @param workItemId - Work item id.
   * @param boardColumnId - Board column id.
   * @public
   */
  public async moveToColumn(workItemId: string, boardColumnId: string): Promise<IWorkItem> {
    const cached = this.requireCached(workItemId);
    const connection = this.resolveConnection(cached.source);
    const columns =
      this._sourceColumns.get(cached.source.id) ??
      (await this.loadSourceColumns(connection, cached.source, [cached.workItemType]));
    const column = columns.columns.find((candidate) => candidate.id === boardColumnId);
    const nativeState = column
      ? columns.nativeState(boardColumnId, cached.workItemType)
      : undefined;
    if (!column || !nativeState) {
      throw new Error(
        `Azure DevOps board "${cached.source.displayName}" has no column ${boardColumnId} for ${cached.workItemType}. Refresh the board and try again.`,
      );
    }
    return this.writeNativeColumn(cached, connection, columns, column, nativeState);
  }

  private async writeNativeColumn(
    cached: ICachedWorkItem,
    connection: AzureConnection,
    columns: IAzureSourceColumns,
    column: IBoardColumn,
    nativeState: string,
  ): Promise<IWorkItem> {
    const operations: IAzurePatchOperation[] = [
      { op: 'test', path: '/rev', value: cached.document.rev },
    ];
    if (nativeState !== fieldString(cached.document, 'System.State')) {
      operations.push(patchAdd('/fields/System.State', nativeState));
    }
    if (
      columns.columnReferenceName &&
      column.label !== fieldString(cached.document, columns.columnReferenceName)
    ) {
      operations.push(
        patchAdd(`/fields/${jsonPointerSegment(columns.columnReferenceName)}`, column.label),
      );
    }
    if (operations.length === 1) {
      return this.mapDocument(cached.source, cached.document);
    }
    const document = await this.request<IAzureWorkItemDocument>(
      connection,
      cached.source,
      `wit/workitems/${cached.document.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(operations),
        contentType: 'application/json-patch+json',
      },
    );
    return this.mapDocument(cached.source, document);
  }

  private async listSourceItems(source: AzureSource): Promise<readonly IWorkItem[]> {
    const connection = this.resolveConnection(source);
    const ids = await this.loadSourceItemIds(connection, source);
    const fields = this.requestedFieldsFor(source);
    const documents: IAzureWorkItemDocument[] = [];
    for (let index = 0; index < ids.length; index += 200) {
      const response = await this.request<IAzureWorkItemBatchResponse>(
        connection,
        source,
        'wit/workitemsbatch',
        {
          method: 'POST',
          body: JSON.stringify({ ids: ids.slice(index, index + 200), fields }),
          contentType: 'application/json',
        },
      );
      documents.push(...(response.value ?? []));
    }
    const workItemTypes = [
      ...new Set([
        ...(this._workItemTypes.get(source.id) ?? []),
        ...documents
          .map((document) => fieldString(document, 'System.WorkItemType'))
          .filter(Boolean),
      ]),
    ];
    this._workItemTypes.set(source.id, workItemTypes);
    this.indexEditorMetadata(source, documents);
    await this.loadSourceColumns(connection, source, workItemTypes);
    return documents.map((document) => this.mapDocument(source, document));
  }

  private async loadSourceItemIds(
    connection: AzureConnection,
    source: AzureSource,
  ): Promise<readonly number[]> {
    if (source.team && source.boardId) {
      return this.loadBoardWorkItemIds(connection, source);
    }
    const query = source.queryId
      ? await this.request<IAzureWiqlResponse>(
          connection,
          source,
          `wit/wiql/${encodeURIComponent(source.queryId)}`,
          { method: 'GET' },
        )
      : await this.request<IAzureWiqlResponse>(connection, source, 'wit/wiql', {
          method: 'POST',
          body: JSON.stringify({ query: source.wiql }),
          contentType: 'application/json',
        });
    return [...new Set((query.workItems ?? []).map((item) => item.id))];
  }

  private async loadBoardWorkItemIds(
    connection: AzureConnection,
    source: AzureSource,
  ): Promise<readonly number[]> {
    const context = await this.loadBoardContext(connection, source);
    const items = await this.request<IAzureBacklogLevelWorkItemsResponse>(
      connection,
      source,
      `work/backlogs/${encodeURIComponent(context.backlogId)}/workItems`,
      { method: 'GET', team: source.team },
    );
    return [
      ...new Set(
        (items.workItems ?? []).flatMap((item) =>
          typeof item.target?.id === 'number' ? [item.target.id] : [],
        ),
      ),
    ];
  }

  /** Reads and caches the provider columns of one source; mappings come only from settings. */
  private async loadSourceColumns(
    connection: AzureConnection,
    source: AzureSource,
    workItemTypes: readonly string[],
  ): Promise<IAzureSourceColumns> {
    const mappings = source.columnMappings ?? [];
    const workflowStateOf = (columnId: string) =>
      mappings.find((mapping) => mapping.columnId === columnId)?.stageId;
    let result: IAzureSourceColumns;
    if (source.team && source.boardId) {
      const context = await this.loadBoardContext(connection, source);
      const documents = (await this.loadBoardColumnDocuments(connection, source)).filter(
        (column): column is IAzureBoardColumnDocument & { id: string; name: string } =>
          Boolean(column.id && column.name),
      );
      result = {
        columns: documents.map((column) => ({
          id: column.id,
          label: column.name,
          sourceId: source.id,
          ...(workflowStateOf(column.id) ? { stageId: workflowStateOf(column.id)! } : {}),
        })),
        nativeState: (columnId, workItemType) =>
          documents.find((column) => column.id === columnId)?.stateMappings?.[workItemType],
        columnIdOf: (document) =>
          resolveBoardColumnDocument(document, documents, context.columnFieldReferenceName)?.id,
        columnReferenceName: context.columnFieldReferenceName,
      };
    } else {
      const stateLists = await Promise.all(
        workItemTypes.map((workItemType) => this.loadStates(connection, source, workItemType)),
      );
      const names = [
        ...new Set(stateLists.flat().flatMap((state) => (state.name ? [state.name] : []))),
      ];
      result = {
        columns: names.map((name) => ({
          id: name,
          label: name,
          sourceId: source.id,
          ...(workflowStateOf(name) ? { stageId: workflowStateOf(name)! } : {}),
        })),
        nativeState: (columnId) => (names.includes(columnId) ? columnId : undefined),
        columnIdOf: (document) => fieldString(document, 'System.State') || undefined,
      };
    }
    this._sourceColumns.set(source.id, result);
    return result;
  }

  private async loadBoardColumnDocuments(
    connection: AzureConnection,
    source: AzureSource,
  ): Promise<readonly IAzureBoardColumnDocument[]> {
    const response = await this.request<IAzureBoardColumnListResponse>(
      connection,
      source,
      `work/boards/${encodeURIComponent(source.boardId ?? '')}/columns`,
      { method: 'GET', team: source.team },
    );
    return response.value ?? [];
  }

  /** Loads the team board field names and the backlog's supported creation types once. */
  private async loadBoardContext(
    connection: AzureConnection,
    source: AzureSource,
  ): Promise<IAzureBoardContext> {
    const existing = this._boardContexts.get(source.id);
    if (existing) return existing;
    const [board, response] = await Promise.all([
      this.request<IAzureBoardDocument>(
        connection,
        source,
        `work/boards/${encodeURIComponent(source.boardId ?? '')}`,
        { method: 'GET', team: source.team },
      ),
      this.request<IAzureBacklogListResponse>(connection, source, 'work/backlogs', {
        method: 'GET',
        team: source.team,
      }),
    ]);
    const requestedBoard = source.boardId?.trim().toLocaleLowerCase() ?? '';
    const backlog = (response.value ?? []).find(
      (candidate) =>
        candidate.id?.toLocaleLowerCase() === requestedBoard ||
        candidate.name?.toLocaleLowerCase() === requestedBoard ||
        candidate.id === board.id ||
        candidate.name?.toLocaleLowerCase() === board.name?.toLocaleLowerCase(),
    );
    if (!backlog?.id) {
      throw new Error(
        `Azure DevOps board "${source.boardId}" is not a backlog of ${source.team}. Verify the team and board settings.`,
      );
    }
    const workItemTypes = (backlog.workItemTypes ?? []).flatMap((type) =>
      type.name ? [type.name] : [],
    );
    const context: IAzureBoardContext = {
      backlogId: backlog.id,
      columnFieldReferenceName: board.fields?.columnField?.referenceName ?? 'System.BoardColumn',
      ...(board.fields?.doneField?.referenceName
        ? { doneFieldReferenceName: board.fields.doneField.referenceName }
        : {}),
      workItemTypes,
    };
    this._boardContexts.set(source.id, context);
    if (workItemTypes.length) this._workItemTypes.set(source.id, workItemTypes);
    return context;
  }

  private async loadWorkItemTypes(
    connection: AzureConnection,
    source: AzureSource,
  ): Promise<readonly string[]> {
    const cached = this._workItemTypes.get(source.id);
    if (cached?.length) return cached;
    if (source.team && source.boardId) {
      return (await this.loadBoardContext(connection, source)).workItemTypes;
    }
    const response = await this.request<IAzureWorkItemTypeListResponse>(
      connection,
      source,
      'wit/workitemtypes',
      { method: 'GET' },
    );
    const types = (response.value ?? []).flatMap((type) =>
      type.name && !type.isDisabled ? [type.name] : [],
    );
    this._workItemTypes.set(source.id, types);
    return types;
  }

  private requestedFieldsFor(source: AzureSource): readonly string[] {
    const context = this._boardContexts.get(source.id);
    return [
      ...new Set([
        ...requestedFields,
        ...(context?.columnFieldReferenceName ? [context.columnFieldReferenceName] : []),
        ...(context?.doneFieldReferenceName ? [context.doneFieldReferenceName] : []),
      ]),
    ];
  }

  private indexEditorMetadata(
    source: AzureSource,
    documents: readonly IAzureWorkItemDocument[],
  ): void {
    const assignees = new Map<string, IWorkItemAssignee>();
    const labels = new Set<string>();
    for (const document of documents) {
      const identity = fieldIdentity(document, 'System.AssignedTo');
      const assignee = identity ? mapIdentity(identity) : undefined;
      if (assignee) assignees.set(assignee.login, assignee);
      fieldString(document, 'System.Tags')
        .split(';')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .forEach((tag) => labels.add(tag));
    }
    this._assignees.set(source.id, [...assignees.values()]);
    this._labels.set(
      source.id,
      [...labels]
        .sort((left, right) => left.localeCompare(right))
        .map((name) => ({
          name,
          color: '808080',
        })),
    );
  }

  private mapDocument(
    source: AzureSource,
    document: IAzureWorkItemDocument,
    selection?: Pick<IWorkItemMutation, 'repository' | 'repositoryBindingIds'>,
  ): IWorkItem {
    const workItemType = fieldString(document, 'System.WorkItemType') || 'Work Item';
    const nativeState = fieldString(document, 'System.State') || 'Unknown';
    const id = `${source.workspaceId}:${source.id}:${document.id}`;
    const stage = this.mappedStage(source, document);
    const columnId = this._sourceColumns.get(source.id)?.columnIdOf(document);
    const assignedTo = fieldIdentity(document, 'System.AssignedTo');
    const assignee = assignedTo ? mapIdentity(assignedTo) : undefined;
    const repositoryBindings = this.repositoryBindings(source, id, selection);
    const connection = this.resolveConnection(source);
    const externalUrl =
      document._links?.html?.href ??
      `https://dev.azure.com/${encodeURIComponent(connection.organization)}/${encodeURIComponent(source.project)}/_workitems/edit/${document.id}`;
    const item: IWorkItem = {
      id,
      workspaceId: source.workspaceId,
      sourceId: source.id,
      externalId: `AB#${document.id}`,
      externalUrl,
      title: fieldString(document, 'System.Title') || `Work item ${document.id}`,
      body: azureHtmlToMarkdown(fieldString(document, 'System.Description')),
      bodyFormat: 'markdown',
      workItemType,
      revision: document.rev,
      nativeState,
      ...(stage ? { stageId: stage } : {}),
      ...(columnId ? { boardColumnId: columnId } : {}),
      provider: 'azure-devops',
      repository:
        repositoryBindings.length === 1
          ? repositoryBindings[0]!.displayName ||
            `${repositoryBindings[0]!.owner}/${repositoryBindings[0]!.name}`
          : '',
      repositoryBindingIds: repositoryBindings.map((repository) => repository.id),
      projectFields: [],
      labels: fieldString(document, 'System.Tags')
        .split(';')
        .map((tag) => tag.trim())
        .filter(Boolean),
      assignees: assignee ? [assignee] : [],
      createdAt: fieldString(document, 'System.CreatedDate') || undefined,
      updatedAt: fieldString(document, 'System.ChangedDate') || undefined,
    };
    this._cache.set(id, { source, document, workItemType });
    return item;
  }

  private repositoryBindings(
    source: AzureSource,
    workItemId: string,
    selection?: Pick<IWorkItemMutation, 'repository' | 'repositoryBindingIds'>,
  ): readonly IRepositoryBinding[] {
    const settings = this._options.settings();
    const available = settings.repositoryBindings.filter(
      (repository) => repository.workspaceId === source.workspaceId && repository.enabled,
    );
    const requestedIds = new Set(
      selection?.repositoryBindingIds?.length
        ? selection.repositoryBindingIds
        : (this._repositorySelections.get(workItemId) ?? []),
    );
    const explicit = available.filter((repository) => requestedIds.has(repository.id));
    if (explicit.length) {
      this._repositorySelections.set(
        workItemId,
        explicit.map((repository) => repository.id),
      );
      return explicit;
    }
    if (selection?.repository) {
      const named = available.filter(
        (repository) =>
          repository.id === selection.repository ||
          repository.displayName === selection.repository ||
          `${repository.owner}/${repository.name}` === selection.repository,
      );
      if (named.length) {
        this._repositorySelections.set(
          workItemId,
          named.map((repository) => repository.id),
        );
        return named;
      }
    }
    const context = settings.deliveryContexts.find(
      (candidate) =>
        candidate.enabled &&
        candidate.workspaceId === source.workspaceId &&
        candidate.workItemSourceIds.includes(source.id),
    );
    const contextIds = new Set(
      context?.defaultRepositoryBindingId
        ? [context.defaultRepositoryBindingId]
        : context?.repositoryBindingIds.length === 1
          ? context.repositoryBindingIds
          : [],
    );
    const contextual = available.filter((repository) => contextIds.has(repository.id));
    if (contextual.length) return contextual;
    const projectKey = normalizeRepositoryKey(source.project);
    const projectMatches = available.filter(
      (repository) => normalizeRepositoryKey(repository.name) === projectKey,
    );
    if (projectMatches.length === 1) return projectMatches;
    return available.length === 1 ? available : [];
  }

  /** Workflow state from the saved column mapping; unmapped columns keep the neutral `backlog`. */
  private mappedStage(
    source: AzureSource,
    document: IAzureWorkItemDocument,
  ): WorkflowStageId | undefined {
    const columns = this._sourceColumns.get(source.id);
    const columnId = columns?.columnIdOf(document);
    if (!columnId) return undefined;
    return columns?.columns.find((column) => column.id === columnId)?.stageId;
  }

  private async loadStates(
    connection: AzureConnection,
    source: AzureSource,
    workItemType: string,
  ): Promise<readonly IAzureStateDocument[]> {
    const cacheKey = `${source.connectionId}:${source.project}:${workItemType}`;
    const existing = this._states.get(cacheKey);
    if (existing) return existing;
    const response = await this.request<IAzureStateListResponse>(
      connection,
      source,
      `wit/workitemtypes/${encodeURIComponent(workItemType)}/states`,
      { method: 'GET' },
    );
    const states = response.value ?? [];
    this._states.set(cacheKey, states);
    return states;
  }

  private resolveSource(sourceId?: string, workspaceId?: string): AzureSource {
    const candidates = this._options
      .settings()
      .workItemSources.filter(
        (source): source is AzureSource =>
          source.provider === 'azure-devops' &&
          source.enabled &&
          (!workspaceId || source.workspaceId === workspaceId),
      );
    const source = candidates.find((candidate) => !sourceId || candidate.id === sourceId);
    if (!source || (!sourceId && candidates.length !== 1)) {
      throw new Error('Choose exactly one Azure DevOps work-item source for this operation.');
    }
    return source;
  }

  private resolveConnection(source: AzureSource): AzureConnection {
    const connection = this._options
      .settings()
      .connections.find(
        (candidate): candidate is AzureConnection =>
          candidate.kind === 'azure-devops' &&
          candidate.id === source.connectionId &&
          candidate.workspaceId === source.workspaceId,
      );
    if (!connection)
      throw new Error(`Azure DevOps connection is unavailable: ${source.connectionId}`);
    return connection;
  }

  private requireCached(workItemId: string): ICachedWorkItem {
    const cached = this._cache.get(workItemId);
    if (!cached)
      throw new Error(`Refresh the Azure DevOps work item before updating it: ${workItemId}`);
    const source = this._options
      .settings()
      .workItemSources.find(
        (candidate): candidate is AzureSource =>
          candidate.provider === 'azure-devops' &&
          candidate.enabled &&
          candidate.id === cached.source.id &&
          candidate.workspaceId === cached.source.workspaceId,
      );
    if (!source) {
      throw new Error(`The Azure DevOps source changed; refresh before updating ${workItemId}.`);
    }
    return { ...cached, source };
  }

  private async request<T>(
    connection: AzureConnection,
    source: AzureSource,
    path: string,
    options: {
      readonly method: 'GET' | 'POST' | 'PATCH';
      readonly body?: string;
      readonly contentType?: string;
      readonly apiVersion?: string;
      /** Team-scoped API (boards) - inserted between project and `_apis`. */
      readonly team?: string;
    },
  ): Promise<T> {
    const credential = await this._options.credential(connection);
    if (!credential?.token) {
      throw new RemoteProviderAuthenticationRequiredError(
        `Sign in to Azure DevOps for ${connection.displayName} before continuing.`,
      );
    }
    const authorization =
      credential.scheme === 'Basic'
        ? `Basic ${Buffer.from(`:${credential.token}`).toString('base64')}`
        : `Bearer ${credential.token}`;
    const base = `https://dev.azure.com/${encodeURIComponent(connection.organization)}/${encodeURIComponent(source.project)}/${options.team ? `${encodeURIComponent(options.team)}/` : ''}_apis/`;
    const separator = path.includes('?') ? '&' : '?';
    const url = `${base}${path}${separator}api-version=${options.apiVersion ?? '7.1'}`;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await this._fetch(url, {
        method: options.method,
        headers: {
          Accept: 'application/json',
          Authorization: authorization,
          ...(options.contentType ? { 'Content-Type': options.contentType } : {}),
        },
        ...(options.body ? { body: options.body } : {}),
      });
      if (response.ok) {
        const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
        if (contentType.includes('text/html')) {
          throw new RemoteProviderAuthenticationRequiredError(
            `Azure DevOps did not accept the credential for ${connection.displayName}. Verify the personal access token and try again.`,
          );
        }
        try {
          return (await response.json()) as T;
        } catch {
          throw new Error(
            `Azure DevOps returned an invalid response for ${connection.displayName}. Try again later.`,
          );
        }
      }
      if (response.status === 401 || response.status === 403) {
        throw new RemoteProviderAuthenticationRequiredError(
          `Azure DevOps did not accept the credential for ${connection.displayName}. Verify the personal access token and try again.`,
        );
      }
      const retryAfter = Number(response.headers.get('retry-after'));
      if ((response.status === 429 || response.status === 503) && attempt < 2) {
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            Math.max(250, Math.min(5_000, retryAfter * 1_000 || 500 * (attempt + 1))),
          ),
        );
        continue;
      }
      const detail = (await response.text()).slice(0, 2_048);
      throw new Error(
        `Azure DevOps request failed (${response.status}): ${detail || response.statusText}`,
      );
    }
    throw new Error('Azure DevOps request retry limit was reached.');
  }

  // #endregion
}

interface IAzureWiqlResponse {
  readonly workItems?: readonly { readonly id: number }[];
}

interface IAzureBacklogDocument {
  readonly id?: string;
  readonly name?: string;
  readonly workItemTypes?: readonly { readonly name?: string }[];
}

interface IAzureBacklogListResponse {
  readonly value?: readonly IAzureBacklogDocument[];
}

interface IAzureBacklogLevelWorkItemsResponse {
  readonly workItems?: readonly { readonly target?: { readonly id?: number } }[];
}

interface IAzureBoardDocument {
  readonly id?: string;
  readonly name?: string;
  readonly fields?: {
    readonly columnField?: { readonly referenceName?: string };
    readonly doneField?: { readonly referenceName?: string };
  };
}

interface IAzureBoardContext {
  readonly backlogId: string;
  readonly columnFieldReferenceName: string;
  readonly doneFieldReferenceName?: string;
  readonly workItemTypes: readonly string[];
}

interface IAzureCommentDocument {
  readonly id?: number;
  readonly text?: string;
  readonly format?: string;
  readonly createdDate?: string;
  readonly modifiedDate?: string;
  readonly createdBy?: IAzureIdentity;
  readonly url?: string;
}

interface IAzureCommentListResponse {
  readonly comments?: readonly IAzureCommentDocument[];
}

interface IAzureWorkItemBatchResponse {
  readonly value?: readonly IAzureWorkItemDocument[];
}

interface IAzureStateListResponse {
  readonly value?: readonly IAzureStateDocument[];
}

interface IAzureBoardColumnListResponse {
  readonly value?: readonly IAzureBoardColumnDocument[];
}

interface IAzureWorkItemTypeListResponse {
  readonly value?: readonly { readonly name?: string; readonly isDisabled?: boolean }[];
}

/**
 * Columns of one Azure source as read from the provider: the bound Kanban board's
 * columns when `team` and `boardId` are configured, otherwise the work-item states
 * of the loaded work-item types. `nativeState(workItemType)` resolves the
 * `System.State` value that moves an item into the column.
 */
interface IAzureSourceColumns {
  readonly columns: readonly IBoardColumn[];
  readonly nativeState: (columnId: string, workItemType: string) => string | undefined;
  readonly columnIdOf: (document: IAzureWorkItemDocument) => string | undefined;
  readonly columnReferenceName?: string;
}

interface ICachedWorkItem {
  readonly source: AzureSource;
  readonly document: IAzureWorkItemDocument;
  readonly workItemType: string;
}

const requestedFields = [
  'System.Id',
  'System.Title',
  'System.Description',
  'System.State',
  'System.WorkItemType',
  'System.AssignedTo',
  'System.Tags',
  'System.CreatedDate',
  'System.ChangedDate',
  'System.AreaPath',
  'System.IterationPath',
  'System.BoardColumn',
  'System.BoardColumnDone',
];

function patchAdd(path: string, value: unknown): { op: 'add'; path: string; value: unknown } {
  return { op: 'add', path, value };
}

function patchRemove(path: string): { op: 'remove'; path: string } {
  return { op: 'remove', path };
}

type IAzurePatchOperation =
  | ReturnType<typeof patchAdd>
  | ReturnType<typeof patchRemove>
  | { readonly op: 'test'; readonly path: string; readonly value: unknown };

function fieldString(document: IAzureWorkItemDocument, referenceName: string): string {
  const value = document.fields?.[referenceName];
  return typeof value === 'string' ? value : '';
}

function fieldIdentity(
  document: IAzureWorkItemDocument,
  referenceName: string,
): IAzureIdentity | undefined {
  const value = document.fields?.[referenceName];
  return value && typeof value === 'object' ? (value as IAzureIdentity) : undefined;
}

function resolveBoardColumnDocument(
  document: IAzureWorkItemDocument,
  columns: readonly IAzureBoardColumnDocument[],
  columnFieldReferenceName: string,
): IAzureBoardColumnDocument | undefined {
  const values = [
    fieldString(document, columnFieldReferenceName),
    fieldString(document, 'System.BoardColumn'),
  ].filter(Boolean);
  for (const value of values) {
    const exact = columns.find((column) => column.id === value || column.name === value);
    if (exact) return exact;
    const normalized = normalizeBoardColumnName(value);
    const matching = columns.filter(
      (column) => column.name && normalizeBoardColumnName(column.name) === normalized,
    );
    if (matching.length === 1) return matching[0];
  }
  const workItemType = fieldString(document, 'System.WorkItemType');
  const state = fieldString(document, 'System.State');
  if (!workItemType || !state) return undefined;
  const matching = columns.filter(
    (column) => column.stateMappings?.[workItemType]?.trim() === state.trim(),
  );
  return matching.length === 1 ? matching[0] : undefined;
}

function normalizeBoardColumnName(value: string): string {
  return value
    .trim()
    .replace(/\s*\([^)]*\)\s*$/u, '')
    .trim()
    .toLocaleLowerCase();
}

function mapIdentity(identity: IAzureIdentity): IWorkItemAssignee | undefined {
  const login = identity.uniqueName ?? identity.id ?? identity.displayName;
  if (!login) return undefined;
  // Azure avatar endpoints require the PAT and never finish loading in the renderer. Omitting the
  // URL lets Mosaik render deterministic initials instead of a permanently empty image plate.
  return {
    login,
    ...(identity.displayName ? { displayName: identity.displayName } : {}),
  };
}

function mapComment(comment: IAzureCommentDocument): IWorkItemComment {
  const author = comment.createdBy ? mapIdentity(comment.createdBy) : undefined;
  const body = comment.text ?? '';
  const markdown =
    comment.format?.toLocaleLowerCase() === 'markdown' && !/<\/?[a-z][^>]*>/iu.test(body);
  return {
    id: String(comment.id ?? `${comment.createdDate ?? 'comment'}:${comment.text ?? ''}`),
    ...(author ? { author } : {}),
    body: markdown ? body : azureHtmlToMarkdown(body),
    bodyFormat: 'markdown',
    createdAt: comment.createdDate ?? new Date(0).toISOString(),
    ...(comment.modifiedDate ? { updatedAt: comment.modifiedDate } : {}),
    ...(comment.url ? { url: comment.url } : {}),
  };
}

function markdownToAzureHtml(value: string): string {
  return value.trim() ? (marked.parse(value, { async: false, gfm: true }) as string) : '';
}

function azureHtmlToMarkdown(value: string): string {
  if (!value.trim()) return '';
  return decodeHtmlEntities(
    value
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/giu, '')
      .replace(
        /<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/giu,
        (_match, _quote, href, text) => {
          const label = htmlText(text).trim() || decodeHtmlEntities(href);
          return `[${label}](${decodeHtmlEntities(href)})`;
        },
      )
      .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/giu, '**$2**')
      .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/giu, '*$2*')
      .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/giu, '`$1`')
      .replace(/<li\b[^>]*>/giu, '\n- ')
      .replace(/<br\s*\/?\s*>/giu, '\n')
      .replace(/<\/(p|div|h[1-6]|ul|ol|pre|blockquote)>/giu, '\n\n')
      .replace(/<[^>]+>/gu, ''),
  )
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
}

function htmlText(value: string): string {
  return decodeHtmlEntities(value.replace(/<br\s*\/?\s*>/giu, ' ').replace(/<[^>]+>/gu, ''));
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/giu, (entity, code) => {
    const normalized = String(code).toLocaleLowerCase();
    if (normalized.startsWith('#x')) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
    }
    if (normalized.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
    }
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[normalized] ?? entity;
  });
}

function jsonPointerSegment(value: string): string {
  return value.replace(/~/gu, '~0').replace(/\//gu, '~1');
}

function normalizeRepositoryKey(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/gu, '');
}

/** Distinct state names across work-item types, in provider order, with a category-based mapping suggestion. */
function stateColumnCandidates(
  stateLists: readonly (readonly IAzureStateDocument[])[],
): readonly IBoardColumnCandidate[] {
  const seen = new Map<string, IAzureStateDocument>();
  for (const state of stateLists.flat()) {
    if (state.name && !seen.has(state.name)) seen.set(state.name, state);
  }
  return [...seen.values()].map((state) => {
    return { id: state.name!, label: state.name! };
  });
}

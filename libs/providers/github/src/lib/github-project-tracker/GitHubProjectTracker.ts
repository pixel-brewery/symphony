// #region Imports

import {
  type IWorkItemCoordinationPort,
  WorkItemClaimLostError,
  WorkItemClaimMissingError,
} from '@symphony/application-work';
import type { IWorkTrackingPort } from '@symphony/providers-work';
import {
  type AssistanceAction,
  type IBoardColumn,
  type IBoardColumnCandidate,
  type IBoardColumnMapping,
  type IGitHubProjectCandidate,
  isClaimExpired,
  type IWorkItem,
  type IWorkItemAssignee,
  type IWorkItemClaim,
  type IWorkItemComment,
  type IWorkItemEditorMetadata,
  type IWorkItemLabelOption,
  type IWorkItemMutation,
  type IWorkItemNote,
  type ProjectFieldDefinition,
  type ProjectFieldValue,
  type WorkItemClaimAcquisition,
  type WorkItemSource,
} from '@symphony/domain-work';
import {
  type AutomationAction,
  type IAutomationReceipt,
  type IAutomationSignal,
  type IAutomationSourceCheckpoint,
} from '@symphony/domain-automation';
import { type ClosureReasonCode, type WorkflowStageId } from '@symphony/domain-workflow';
import { type IApplicationSettings } from '@symphony/configuration-composition';
import { type IDeliveryGroup, type IDeliveryGroupProposal } from '@symphony/domain-execution';
import {
  GitHubRateLimitError,
  GitHubRequestGovernor,
  type IGitHubRateLimitSnapshot,
} from '../github-request-governor';
import { createHash } from 'node:crypto';
import { forgetGitHubToken, isGitHubAuthenticationFailure } from '../provider-connections';
import { toolchainSearchPath } from '@symphony/providers-core';
import { spawn } from 'node:child_process';
import { resolveAllowedCommand } from '@symphony/providers-core';
import type { GitHubCommandRunner } from './GitHubCommandRunner';
import type { GitHubConnection } from './GitHubConnection';
import type { GitHubProjectSource } from './GitHubProjectSource';
import type { IAssigneeConnection } from './IAssigneeConnection';
import type { IClaimRecord } from './IClaimRecord';
import type { IConnectionPageInfo } from './IConnectionPageInfo';
import type { IGitHubProjectTrackerOptions } from './IGitHubProjectTrackerOptions';
import type { IIssueAutomationIssue } from './IIssueAutomationIssue';
import type { IIssueCommentConnection } from './IIssueCommentConnection';
import type { IIssueCommentNode } from './IIssueCommentNode';
import type { IIssueDetailIssue } from './IIssueDetailIssue';
import type { ILabelConnection } from './ILabelConnection';
import type { IProjectContext } from './IProjectContext';
import type { IProjectFieldNode } from './IProjectFieldNode';
import type { IProjectFieldValueNode } from './IProjectFieldValueNode';
import type { IProjectItemDocument } from './IProjectItemDocument';
import type { IProjectItemListDocument } from './IProjectItemListDocument';
import type { IProjectItemNode } from './IProjectItemNode';
import type { IProjectListConnection } from './IProjectListConnection';
import type { IProjectListNode } from './IProjectListNode';
import { assistanceAction } from './assistanceAction';
import { boundedRequest } from './boundedRequest';
import { claimReferenceRoot } from './ClaimReferenceRoot';
import { commentTruncationNotice } from './CommentTruncationNotice';
import { errorMessage } from './errorMessage';
import { githubCommentBodyLimit } from './GithubCommentBodyLimit';
import { issueCommentSelection } from './IssueCommentSelection';
import { projectFieldValueSelection } from './ProjectFieldValueSelection';
import { projectItemSelection } from './ProjectItemSelection';
import { projectListSelection } from './ProjectListSelection';
import { projectStatusStage } from './ProjectStatusStage';
import { sameGitHubRepository } from './sameGitHubRepository';

// #endregion

export class GitHubProjectTracker implements IWorkTrackingPort, IWorkItemCoordinationPort {
  // #region Fields

  private readonly _contexts = new Map<string, IProjectContext>();
  private readonly _items = new Map<string, IWorkItem>();
  private readonly _itemsBySource = new Map<string, readonly IWorkItem[]>();
  private readonly _assigneesByRepository = new Map<string, readonly IWorkItemAssignee[]>();
  private readonly _accountLogins = new Map<string, string>();
  private readonly _sourceLoads = new Map<string, Promise<readonly IWorkItem[]>>();

  /** Resolved project node ids, keyed by the coordinates that identify the project. */
  private readonly _projectIds = new Map<string, string>();
  private readonly _governor: GitHubRequestGovernor;
  private readonly _rawRunCommand: GitHubCommandRunner;
  private readonly _runCommand: GitHubCommandRunner;

  // #endregion

  // #region Ctor

  public constructor(private readonly _options: IGitHubProjectTrackerOptions) {
    this._rawRunCommand = _options.runCommand ?? runGitHubCommand;
    this._governor = _options.governor ?? new GitHubRequestGovernor();
    this._runCommand = (args, environment, standardInput) =>
      this.executeGoverned(args, environment, standardInput);
  }

  // #endregion

  // #region Methods

  /**
   * Returns the coordinates work item.
   *
   * @param workItem - Work item.
   * @public
   */
  public coordinatesWorkItem(workItem: IWorkItem): boolean {
    return workItem.provider === 'github-projects';
  }

  /**
   * Lists the work items.
   *
   * @public
   */
  public async listWorkItems(): Promise<readonly IWorkItem[]> {
    const settings = this._options.settings();
    const selected = new Set(settings.activeViewScope.workspaceIds);
    const sources = settings.workItemSources.filter(
      (source): source is GitHubProjectSource =>
        source.provider === 'github-projects' && source.enabled && selected.has(source.workspaceId),
    );
    const groups = await Promise.all(sources.map((source) => this.loadSource(source)));
    return groups.flat();
  }

  /**
   * Loads the work item details.
   *
   * @param workItem - Work item.
   * @public
   */
  public async loadWorkItemDetails(workItem: IWorkItem): Promise<IWorkItem> {
    if (workItem.detailState === 'complete') return workItem;
    const issueNumber = Number(workItem.externalId.replace(/^#/u, ''));
    const [owner, name] = workItem.repository.split('/');
    if (!owner || !name || !Number.isInteger(issueNumber)) {
      return { ...workItem, detailState: 'complete' };
    }
    const context = await this.ensureContext(workItem.sourceId, workItem.workspaceId);
    const response = await this.graphql<IIssueDetailResponse>(
      context.connection,
      context.environment,
      issueDetailQuery,
      { owner, name, number: issueNumber },
    );
    assertGraphql(response);
    const issue = response.data?.repository?.issueOrPullRequest;
    if (!issue) throw new Error(`GitHub work item ${workItem.externalId} is unavailable.`);
    const commentNodes = await this.loadAllIssueComments(
      { owner, name, number: issueNumber },
      issue.comments,
      context.connection,
      context.environment,
    );
    const hydrated: IWorkItem = {
      ...workItem,
      title: issue.title ?? workItem.title,
      body: issue.body ?? '',
      detailState: 'complete',
      comments: commentNodes.flatMap((node) => {
        const comment = parseIssueComment(node);
        return comment ? [comment] : [];
      }),
      ...(issue.createdAt ? { createdAt: issue.createdAt } : {}),
      ...(issue.updatedAt ? { updatedAt: issue.updatedAt } : {}),
    };
    this._items.set(hydrated.id, hydrated);
    return hydrated;
  }

  /**
   * Lists the automation signals.
   *
   * @param checkpoints - Checkpoints.
   * @public
   */
  public async listAutomationSignals(
    checkpoints: readonly IAutomationSourceCheckpoint[] = [],
  ): Promise<readonly IAutomationSignal[]> {
    const sources = this._options
      .settings()
      .workItemSources.filter(
        (source): source is GitHubProjectSource =>
          source.provider === 'github-projects' && source.enabled,
      );
    const signals = await Promise.all(
      sources.map(async (source) => {
        const items = this._itemsBySource.get(source.id) ?? (await this.loadSource(source));
        const context = await this.ensureContext(source.id, source.workspaceId);
        const checkpoint = checkpoints.find(
          (candidate) =>
            candidate.sourceId === source.id && candidate.workspaceId === source.workspaceId,
        );
        return this.loadAutomationChanges(
          items,
          context,
          checkpoint?.synchronizedAt ?? checkpoint?.initializedAt,
        );
      }),
    );
    return signals.flat();
  }

  /**
   * Lists the automation sources.
   *
   * @public
   */
  public async listAutomationSources(): Promise<
    readonly { sourceId: string; workspaceId: string }[]
  > {
    return this._options
      .settings()
      .workItemSources.filter(
        (source): source is GitHubProjectSource =>
          source.provider === 'github-projects' && source.enabled,
      )
      .map((source) => ({ sourceId: source.id, workspaceId: source.workspaceId }));
  }

  /**
   * Publishes a run result as an issue comment so the ticket carries it, not only Symphony.
   *
   * Only a repository issue can hold a comment. A draft project item has no issue behind it and
   * keeps the project item id as its external id, so its note is skipped rather than failing the
   * run that produced it.
   *
   * @param workItem - Work item.
   * @param note - Note.
   * @public
   */
  public async publishWorkItemNote(workItem: IWorkItem, note: IWorkItemNote): Promise<void> {
    const issueNumber = issueNumberFromExternalId(workItem.externalId);
    if (!issueNumber) return;
    const context = await this.ensureContext(
      workItem.sourceId,
      workItem.workspaceId,
      workItem.repository,
    );
    await this.githubApi(
      context,
      'POST',
      `repos/${repositoryPath(workItem.repository)}/issues/${issueNumber}/comments`,
      { body: commentBody(note) },
    );
  }

  /**
   * Mirrors one delivery group through an idempotent label and marker comment on every issue.
   *
   * @param group - Delivery group.
   * @param workItems - Root-first group members.
   * @public
   */
  public async synchronizeDeliveryGroup(
    group: IDeliveryGroup,
    workItems: readonly IWorkItem[],
  ): Promise<void> {
    const active = group.state !== 'dissolved';
    for (const workItem of workItems) {
      const context = await this.ensureContext(
        workItem.sourceId,
        workItem.workspaceId,
        workItem.repository,
      );
      if (active)
        await this.ensureRepositoryLabel(context, workItem.repository, 'grouped-delivery');
      await this.synchronizeIssueLabel(context, workItem, 'grouped-delivery', active);
      await this.upsertIssueMarker(
        context,
        workItem,
        `<!-- symphony:delivery-group:${group.id} -->`,
        deliveryGroupComment(group, workItems),
      );
    }
  }

  /**
   * Marks Analyzer-proven collision, dependency, or joint-delivery evidence on every issue.
   *
   * @param proposal - Relationship proposal.
   * @param workItems - Assessed work items.
   * @public
   */
  public async synchronizeWorkItemRelation(
    proposal: IDeliveryGroupProposal,
    workItems: readonly IWorkItem[],
  ): Promise<void> {
    const active =
      proposal.state === 'open' &&
      proposal.assessment.sharedChangeSurface.length > 0 &&
      proposal.assessment.relation !== 'unrelated' &&
      proposal.assessment.relation !== 'duplicate';
    for (const workItem of workItems) {
      const context = await this.ensureContext(
        workItem.sourceId,
        workItem.workspaceId,
        workItem.repository,
      );
      if (active) await this.ensureRepositoryLabel(context, workItem.repository, 'critical-path');
      await this.synchronizeIssueLabel(context, workItem, 'critical-path', active);
      await this.upsertIssueMarker(
        context,
        workItem,
        `<!-- symphony:critical-path:${proposal.id} -->`,
        criticalPathComment(proposal, workItems),
      );
    }
  }

  /**
   * Writes one operator comment on the tracked issue and returns it as GitHub stored it.
   *
   * Only a repository issue can hold a comment. A draft project item has no issue behind it, and
   * dropping the comment silently would lose what the operator wrote, so the attempt is refused
   * with the reason instead.
   *
   * @param workItemId - Work item id.
   * @param body - Body.
   * @public
   */
  public async createWorkItemComment(workItemId: string, body: string): Promise<IWorkItemComment> {
    const current = this._items.get(workItemId);
    if (!current) {
      throw new Error(`Refresh the GitHub work item before commenting on it: ${workItemId}`);
    }
    const issueNumber = issueNumberFromExternalId(current.externalId);
    if (!issueNumber) throw new Error('Only a GitHub issue can carry comments.');
    if (body.length > githubCommentBodyLimit) {
      throw new Error(`GitHub refuses a comment longer than ${githubCommentBodyLimit} characters.`);
    }
    const context = await this.ensureContext(
      current.sourceId,
      current.workspaceId,
      current.repository,
    );
    const created = await this.githubApi<IRepositoryCommentDocument>(
      context,
      'POST',
      `repos/${repositoryPath(current.repository)}/issues/${issueNumber}/comments`,
      { body },
    );
    return writtenComment(created, body, this.now());
  }

  /**
   * Acknowledges the automation signal.
   *
   * @param signal - Signal.
   * @param state - State.
   * @public
   */
  public async acknowledgeAutomationSignal(
    signal: IAutomationSignal,
    state: IAutomationReceipt['state'],
  ): Promise<void> {
    if (!signal.externalCommentId || !/^\d+$/u.test(signal.externalCommentId)) return;
    const context = await this.ensureContext(signal.sourceId, signal.workspaceId);
    const reaction =
      state === 'started' || state === 'completed'
        ? 'rocket'
        : state === 'failed'
          ? 'confused'
          : 'eyes';
    await this._runCommand(
      [
        'api',
        '--hostname',
        context.connection.hostname,
        '--method',
        'POST',
        `repos/${repositoryPath(signal.workItem.repository)}/issues/comments/${signal.externalCommentId}/reactions`,
        '--raw-field',
        `content=${reaction}`,
      ],
      context.environment,
    );
  }

  /**
   * Every status option of every loaded project becomes one column, in project
   * order, whether or not it maps to a workflow state. Columns keep their source
   * so the board can show one project at a time.
   *
   * @public
   */
  public async listBoardColumns(): Promise<readonly IBoardColumn[]> {
    return (await this.loadScopedContexts()).flatMap((context) => statusColumns(context));
  }

  /** Reads projects against a proposal without changing the active installation. @public */
  public async listDraftProjects(
    draft: IApplicationSettings,
    workspaceId: string,
    connectionId: string,
  ): Promise<readonly IGitHubProjectCandidate[]> {
    return new GitHubProjectTracker({ ...this._options, settings: () => draft }).listProjects(
      workspaceId,
      connectionId,
    );
  }

  /**
   * Lists the GitHub Projects the connection's account owns or that its repositories link to.
   *
   * @param workspaceId - Workspace id.
   * @param connectionId - Connection id.
   * @public
   */
  public async listProjects(
    workspaceId: string,
    connectionId: string,
  ): Promise<readonly IGitHubProjectCandidate[]> {
    const connection = this.resolveConnectionById(workspaceId, connectionId);
    const environment = await this.createEnvironment(connection);
    const candidates = new Map<string, IGitHubProjectCandidate>();
    const add = (
      node: IProjectListNode | null | undefined,
      origin: IGitHubProjectCandidate['origin'],
    ) => {
      const ownerType = projectOwnerType(node?.owner?.__typename);
      if (!node?.id || !node.number || !ownerType || !node.owner?.login) return;
      const key = `${ownerType}:${node.owner.login.toLowerCase()}:${node.number}`;
      const existing = candidates.get(key);
      if (existing && (existing.origin === 'repository' || origin === 'account')) return;
      candidates.set(key, {
        id: node.id,
        ownerType,
        owner: node.owner.login,
        projectNumber: node.number,
        title: node.title ?? `Project ${node.number}`,
        url: node.url ?? '',
        closed: node.closed ?? false,
        origin,
      });
    };
    const settings = this._options.settings();
    const repositories = settings.repositoryBindings.filter(
      (binding) =>
        binding.enabled &&
        binding.provider === 'github' &&
        binding.workspaceId === workspaceId &&
        binding.sourceControlConnectionId === connectionId,
    );
    const owners = new Map<string, string>();
    for (const page of await this.loadProjectPages<IAccountProjectListResponse>(
      connection,
      environment,
      accountProjectsQuery,
      {},
      (response) => response.data?.viewer?.projectsV2,
    )) {
      add(page, 'account');
    }
    for (const repository of repositories) {
      owners.set(repository.owner.toLowerCase(), repository.owner);
      try {
        for (const page of await this.loadProjectPages<IRepositoryProjectListResponse>(
          connection,
          environment,
          repositoryProjectsQuery,
          { owner: repository.owner, name: repository.name },
          (response) => response.data?.repository?.projectsV2,
        )) {
          add(page, 'repository');
        }
      } catch {
        // A repository that is unavailable to the account must not hide the other projects.
      }
    }
    for (const owner of owners.values()) {
      if (
        [...candidates.values()].some(
          (candidate) => candidate.owner.toLowerCase() === owner.toLowerCase(),
        )
      ) {
        continue;
      }
      for (const ownerType of ['organization', 'user'] as const) {
        try {
          for (const page of await this.loadProjectPages<IOwnerProjectListResponse>(
            connection,
            environment,
            ownerProjectsQuery(ownerType),
            { owner },
            (response) =>
              ownerType === 'organization'
                ? response.data?.organization?.projectsV2
                : response.data?.user?.projectsV2,
          )) {
            add(page, 'account');
          }
          break;
        } catch {
          // Try the other owner type before giving up on this owner.
        }
      }
    }
    return [...candidates.values()].toSorted((left, right) =>
      left.closed === right.closed
        ? left.title.localeCompare(right.title, undefined, { sensitivity: 'base' })
        : left.closed
          ? 1
          : -1,
    );
  }

  /**
   * Reads the status options of one (possibly unsaved) project for the settings
   * editor. Suggested workflow states are editor defaults only; the tracker itself
   * applies nothing but the saved `columnMappings`.
   *
   * @param source - Source.
   * @public
   */
  public async listSourceColumns(
    source: WorkItemSource,
  ): Promise<readonly IBoardColumnCandidate[]> {
    if (source.provider !== 'github-projects') {
      throw new Error(`GitHub Projects cannot read columns of a ${source.provider} source.`);
    }
    const connection = this.resolveConnectionById(source.workspaceId, source.connectionId);
    const environment = await this.createEnvironment(connection);
    const projectId = await this.resolveProjectId(source, connection, environment);
    const fields = await this.loadProjectFields(projectId, connection, environment, []);
    return fields
      .filter(
        (field): field is Extract<ProjectFieldDefinition, { type: 'single-select' }> =>
          field.role === 'workflow-state' && field.type === 'single-select',
      )
      .flatMap((field) => field.options.map((option) => ({ id: option.id, label: option.label })));
  }

  /**
   * Lists the project fields.
   *
   * @public
   */
  public async listProjectFields(): Promise<IWorkItemEditorMetadata['projectFields']> {
    // The board is stamped on every field: once several boards are merged into one snapshot,
    // only the owning board tells a consumer whether a field is missing or simply foreign.
    return (await this.loadScopedContexts())
      .flatMap((context) =>
        context.fields.map((field) => ({ ...field, sourceId: context.source.id })),
      )
      .filter(
        (field, index, fields) =>
          fields.findIndex((candidate) => candidate.id === field.id) === index,
      );
  }

  /**
   * Lists the editor metadata.
   *
   * @param repository - Repository.
   * @param workspaceId - Workspace id.
   * @param sourceId - Source id.
   * @public
   */
  public async listEditorMetadata(
    repository?: string,
    workspaceId?: string,
    sourceId?: string,
  ): Promise<IWorkItemEditorMetadata> {
    const context = await this.ensureContext(sourceId, workspaceId, repository);
    const repositories = this.repositoryOptions(context.source);
    const selectedRepository = repository ?? repositories[0];
    if (!selectedRepository || !repositories.includes(selectedRepository)) {
      throw new Error(`Repository is not available in this GitHub Project: ${repository ?? ''}`);
    }
    const [labels, assignees] = await Promise.all([
      this.loadLabels(selectedRepository, context),
      this.loadAssignees(selectedRepository, context, false),
    ]);
    return {
      repositories,
      labels,
      assignees,
      states: statusColumns(context),
      projectFields: context.fields,
    };
  }

  /**
   * Creates the work item.
   *
   * @param input - Input.
   * @public
   */
  public async createWorkItem(input: IWorkItemMutation): Promise<IWorkItem> {
    const context = await this.ensureContext(input.sourceId, input.workspaceId, input.repository);
    this.assertRepositoryAvailable(input.repository, context.source);
    const args = [
      'issue',
      'create',
      '--repo',
      input.repository,
      '--title',
      input.title,
      '--body-file',
      '-',
    ];
    input.labels.forEach((label) => args.push('--label', label));
    input.assignees.forEach((assignee) => args.push('--assignee', assignee));
    const output = await this._runCommand(args, context.environment, input.body);
    const issueUrl = output
      .trim()
      .split(/\r?\n/u)
      .findLast((line) => /^https?:\/\//u.test(line.trim()))
      ?.trim();
    if (!issueUrl) throw new Error('GitHub created the issue without returning its URL.');
    const added = JSON.parse(
      await this._runCommand(
        [
          'project',
          'item-add',
          String(context.source.projectNumber),
          '--owner',
          context.source.owner,
          '--url',
          issueUrl,
          '--format',
          'json',
        ],
        context.environment,
      ),
    ) as { id?: string };
    if (!added.id) throw new Error('GitHub did not return the new Project item id.');
    await this.writeProjectFields(context, added.id, input.projectFields);
    const created = await this.readProjectItem(context, added.id);
    if (!created) throw new Error('The new GitHub issue is not visible in the Project.');
    return created;
  }

  /**
   * Updates the work item.
   *
   * @param workItemId - Work item id.
   * @param input - Input.
   * @public
   */
  public async updateWorkItem(workItemId: string, input: IWorkItemMutation): Promise<IWorkItem> {
    const current = this._items.get(workItemId);
    if (!current) throw new Error(`Refresh the GitHub work item before updating it: ${workItemId}`);
    const context = await this.ensureContext(
      current.sourceId,
      current.workspaceId,
      input.repository,
    );
    if (current.repository !== input.repository) {
      throw new Error('GitHub issues cannot be moved to another repository from the editor.');
    }
    const issueNumber = current.externalId.replace(/^#/u, '');
    if (!/^\d+$/u.test(issueNumber)) throw new Error('Only GitHub issues can be edited.');
    const args = [
      'issue',
      'edit',
      issueNumber,
      '--repo',
      input.repository,
      '--title',
      input.title,
      '--body-file',
      '-',
    ];
    const currentAssignees = current.assignees.map((assignee) => assignee.login);
    const addLabels = input.labels.filter((label) => !current.labels.includes(label));
    const removeLabels = current.labels.filter((label) => !input.labels.includes(label));
    const addAssignees = input.assignees.filter((login) => !currentAssignees.includes(login));
    const removeAssignees = currentAssignees.filter((login) => !input.assignees.includes(login));
    if (addLabels.length) args.push('--add-label', addLabels.join(','));
    if (removeLabels.length) args.push('--remove-label', removeLabels.join(','));
    if (addAssignees.length) args.push('--add-assignee', addAssignees.join(','));
    if (removeAssignees.length) args.push('--remove-assignee', removeAssignees.join(','));
    await this._runCommand(args, context.environment, input.body);
    await this.writeProjectFields(context, workItemId, input.projectFields);
    const updated = await this.readProjectItem(context, workItemId);
    if (!updated) throw new Error('The updated GitHub issue is no longer visible in the Project.');
    return updated;
  }

  /**
   * Returns the transition.
   *
   * @param workItemId - Work item id.
   * @param stage - Stage.
   * @public
   */
  public async transition(workItemId: string, stage: WorkflowStageId): Promise<IWorkItem> {
    const { context, field, current } = await this.resolveStatusField(workItemId);
    const candidates = field.options.filter((candidate) => candidate.stageId === stage);
    const option =
      candidates.find((candidate) => candidate.id === current.boardColumnId) ?? candidates[0];
    if (!option) {
      throw new Error(
        `GitHub Project "${context.source.displayName}" has no status column mapped to the "${stage}" stage. Map a column in the board settings.`,
      );
    }
    const updated = await this.writeStatus(context, workItemId, field, option);
    if (updated.stageId !== stage) {
      throw new Error(`GitHub did not persist Status ${option.label} for ${workItemId}.`);
    }
    return updated;
  }

  /**
   * Closes the issue behind the project item and states why.
   *
   * GitHub records only two closed states - `completed` and `not_planned` - so every reason
   * that is not a completion is carried as "not planned"; the precise reason stays on the
   * workflow record and in the audit trail, which is where it is asked for. A draft item has
   * no issue to close, so it is refused instead of silently doing nothing.
   *
   * @param workItemId - Work item id.
   * @param reason - Reason.
   * @public
   */
  public async closeWorkItem(workItemId: string, reason: ClosureReasonCode): Promise<IWorkItem> {
    const current = this._items.get(workItemId);
    if (!current) throw new Error(`Refresh the GitHub work item before closing it: ${workItemId}`);
    const issueNumber = current.externalId.replace(/^#/u, '');
    if (!/^\d+$/u.test(issueNumber)) {
      throw new Error('Only GitHub issues can be closed; this project item is a draft.');
    }
    const context = await this.ensureContext(
      current.sourceId,
      current.workspaceId,
      current.repository,
    );
    await this.githubApi(
      context,
      'PATCH',
      `repos/${repositoryPath(current.repository)}/issues/${issueNumber}`,
      { state: 'closed', state_reason: reason === 'completed' ? 'completed' : 'not_planned' },
    );
    const updated = await this.readProjectItem(context, workItemId);
    if (!updated) throw new Error('The closed GitHub issue is no longer visible in the Project.');
    return updated;
  }

  /**
   * Moves the to column.
   *
   * @param workItemId - Work item id.
   * @param boardColumnId - Board column id.
   * @public
   */
  public async moveToColumn(workItemId: string, boardColumnId: string): Promise<IWorkItem> {
    const { context, field } = await this.resolveStatusField(workItemId);
    const option = field.options.find((candidate) => candidate.id === boardColumnId);
    if (!option) {
      throw new Error(
        `GitHub Project "${context.source.displayName}" has no status column ${boardColumnId}. Refresh the board and try again.`,
      );
    }
    const updated = await this.writeStatus(context, workItemId, field, option);
    if (updated.boardColumnId !== option.id) {
      throw new Error(`GitHub did not persist Status ${option.label} for ${workItemId}.`);
    }
    return updated;
  }

  /**
   * Returns the acquire work item claim.
   *
   * @param workItem - Work item.
   * @param action - Action.
   * @param executionId - Execution id.
   * @public
   */
  public async acquireWorkItemClaim(
    workItem: IWorkItem,
    action: IWorkItemClaim['action'],
    executionId: string,
  ): Promise<WorkItemClaimAcquisition> {
    const context = await this.ensureContext(workItem.sourceId, workItem.workspaceId);
    const owner = await this.currentAccountLogin(context);

    const reference = claimReference(workItem);
    const base = await this.readRepositoryReference(
      context,
      workItem,
      this.defaultBranch(workItem),
    );
    let ownedReferenceSha = base;
    try {
      await this.githubApi(
        context,
        'POST',
        `repos/${repositoryPath(workItem.repository)}/git/refs`,
        { ref: reference, sha: base },
      );
    } catch (cause) {
      let existing: string;
      try {
        existing = await this.readRepositoryReference(
          context,
          workItem,
          reference.replace(/^refs\//u, ''),
        );
      } catch {
        throw cause;
      }
      const takeover = await this.takeOverExpiredClaim(
        context,
        workItem,
        action,
        executionId,
        reference,
        existing,
      );
      return takeover ?? { status: 'contended' };
    }

    try {
      const baseCommit = await this.githubApi<{ readonly tree?: { readonly sha?: string } }>(
        context,
        'GET',
        `repos/${repositoryPath(workItem.repository)}/git/commits/${base}`,
      );
      if (!baseCommit.tree?.sha) {
        throw new Error(`GitHub did not return the base tree for ${workItem.repository}.`);
      }
      const claimCommit = await this.githubApi<{ readonly sha?: string }>(
        context,
        'POST',
        `repos/${repositoryPath(workItem.repository)}/git/commits`,
        {
          message: claimCommitMessage(workItem, {
            owner,
            action,
            executionId,
            leaseUntil: this.leaseUntil(),
            heartbeatAt: this.now(),
            claimVersion: 1,
          }),
          tree: baseCommit.tree.sha,
          parents: [base],
        },
      );
      if (!claimCommit.sha) throw new Error('GitHub did not return the claim commit id.');
      await this.githubApi(
        context,
        'PATCH',
        `repos/${repositoryPath(workItem.repository)}/git/${reference}`,
        { sha: claimCommit.sha, force: false },
      );
      ownedReferenceSha = claimCommit.sha;
      const claim: IWorkItemClaim = {
        id: `${reference}@${claimCommit.sha}`,
        workItemId: workItem.id,
        action,
        owner,
        acquiredAt: this.now(),
        leaseUntil: this.leaseUntil(),
        heartbeatAt: this.now(),
        claimVersion: 1,
      };
      await this.setAssistanceAction(context, workItem, action);
      await this.assignClaimOwner(context, workItem, owner);
      return { status: 'acquired', claim };
    } catch (cause) {
      try {
        const current = await this.readRepositoryReference(
          context,
          workItem,
          reference.replace(/^refs\//u, ''),
        );
        if (current === ownedReferenceSha) {
          await this.deleteClaimReference(context, workItem.repository, reference);
        }
      } catch {
        // Cleanup is best-effort; retaining a claim is safer than deleting another owner's ref.
      }
      throw cause;
    }
  }

  /**
   * Extends the lease of a claim this orchestrator owns. Without it the lease elapses and
   * another machine may take the work item over while the run is still healthy.
   *
   * Every extension is a commit on the shared claim reference, and GitHub reports such a commit
   * on the work item it names. Writing one per heartbeat would therefore post to the work item
   * every minute for the whole run, so the lease is only rewritten once it approaches its end.
   * The cheap ownership check still runs on every heartbeat, which is what stops a superseded
   * worker from writing results.
   *
   * @param claim - Claim.
   * @public
   */
  public async renewWorkItemClaim(claim: IWorkItemClaim): Promise<IWorkItemClaim> {
    const workItem = this._items.get(claim.workItemId);
    if (!workItem) throw new Error(`Refresh the claimed work item first: ${claim.workItemId}`);
    const context = await this.ensureContext(workItem.sourceId, workItem.workspaceId);
    const { reference, sha } = parseClaimId(claim.id);
    await this.assertClaimOwnership(context, workItem, claim);
    if (!this.leaseNeedsExtension(claim)) return claim;
    const leaseUntil = this.leaseUntil();
    const heartbeatAt = this.now();
    const renewed = await this.writeClaimCommit(context, workItem, reference, sha, {
      owner: claim.owner,
      action: claim.action,
      executionId: claim.id,
      leaseUntil,
      heartbeatAt,
      claimVersion: claim.claimVersion ?? 1,
    });
    return { ...claim, id: `${reference}@${renewed}`, leaseUntil, heartbeatAt };
  }

  /**
   * Returns the advance work item claim.
   *
   * @param claim - Claim.
   * @param action - Action.
   * @public
   */
  public async advanceWorkItemClaim(
    claim: IWorkItemClaim,
    action: IWorkItemClaim['action'],
  ): Promise<IWorkItemClaim> {
    const workItem = this._items.get(claim.workItemId);
    if (!workItem) throw new Error(`Refresh the claimed work item first: ${claim.workItemId}`);
    const context = await this.ensureContext(workItem.sourceId, workItem.workspaceId);
    await this.assertClaimOwnership(context, workItem, claim);
    await this.setAssistanceAction(context, workItem, action);
    return { ...claim, action };
  }

  /**
   * Releases the work item claim.
   *
   * @param claim - Claim.
   * @public
   */
  public async releaseWorkItemClaim(claim: IWorkItemClaim): Promise<void> {
    const workItem = this._items.get(claim.workItemId);
    if (!workItem) throw new Error(`Refresh the claimed work item first: ${claim.workItemId}`);
    const context = await this.ensureContext(workItem.sourceId, workItem.workspaceId);
    // Releasing a claim whose reference is already gone is the outcome the caller asked for,
    // so it completes quietly - only the assistance phase still has to be cleared.
    let referenceExists = true;
    try {
      await this.assertClaimOwnership(context, workItem, claim);
    } catch (cause) {
      if (!(cause instanceof WorkItemClaimMissingError)) throw cause;
      referenceExists = false;
    }
    await this.setAssistanceAction(context, workItem, 'none');
    if (referenceExists) {
      await this.deleteClaimReference(
        context,
        workItem.repository,
        parseClaimId(claim.id).reference,
      );
    }
  }

  /**
   * Deletes claim references whose lease elapsed and that no live run still holds.
   *
   * A run that dies without releasing its claim leaves the reference behind, and nothing on the
   * normal path ever removes it: the next start of that work item inherits the dead claim, and
   * every other orchestrator keeps reading a lease that will never be renewed. The sweep judges
   * a reference only by the lease written into its own claim commit, so a live claim of another
   * machine is never touched, and it works in bounded batches because a repository can hold as
   * many stale references as it has seen crashed runs.
   *
   * @param retainedClaimIds - Retained claim ids.
   * @param limit - Limit.
   * @public
   */
  public async releaseAbandonedWorkItemClaims(
    retainedClaimIds: readonly string[] = [],
    limit = 25,
  ): Promise<number> {
    const retained = new Set(
      retainedClaimIds.map((id) => (id.includes('@') ? id.slice(0, id.lastIndexOf('@')) : id)),
    );
    const now = new Date(this.now());
    let inspected = 0;
    let released = 0;
    for (const [context, repository] of this.claimRepositories()) {
      if (inspected >= limit) break;
      const references = await this.listClaimReferences(context, repository);
      for (const reference of references) {
        if (inspected >= limit) break;
        if (retained.has(reference.ref)) continue;
        inspected += 1;
        try {
          if (await this.releaseAbandonedClaim(context, repository, reference, now)) released += 1;
        } catch {
          // One unreadable claim must not end the sweep; the next pass sees it again.
        }
      }
    }
    return released;
  }

  /**
   * Follows the comment connection past its first page. The first page arrives with the issue
   * itself, so the common thread costs no extra request; only a long discussion pages on.
   */
  private async loadAllIssueComments(
    coordinates: { readonly owner: string; readonly name: string; readonly number: number },
    initial: IIssueCommentConnection | undefined,
    connection: GitHubConnection,
    environment: NodeJS.ProcessEnv,
  ): Promise<readonly IIssueCommentNode[]> {
    const nodes = [...(initial?.nodes ?? [])];
    const seenCursors = new Set<string>();
    let cursor = nextCursor(initial?.pageInfo, seenCursors, 'GitHub issue comment');
    while (cursor) {
      const response = await this.graphql<IIssueCommentsResponse>(
        connection,
        environment,
        issueCommentsQuery,
        { ...coordinates, cursor },
      );
      assertGraphql(response);
      const page = response.data?.repository?.issueOrPullRequest?.comments;
      nodes.push(...(page?.nodes ?? []));
      cursor = nextCursor(page?.pageInfo, seenCursors, 'GitHub issue comment');
    }
    return nodes;
  }

  /** Loads and returns one coherent set of contexts captured from the current view scope. */
  private async loadScopedContexts(): Promise<readonly IProjectContext[]> {
    const settings = this._options.settings();
    const selected = new Set(settings.activeViewScope.workspaceIds);
    const known = new Set(settings.workItemSources.map((source) => source.id));
    const sources = settings.workItemSources.filter(
      (source): source is GitHubProjectSource =>
        source.provider === 'github-projects' && source.enabled && selected.has(source.workspaceId),
    );
    for (const sourceId of [...this._contexts.keys()]) {
      if (!known.has(sourceId)) this._contexts.delete(sourceId);
    }
    await Promise.all(
      sources.flatMap((source) => (this._contexts.has(source.id) ? [] : [this.loadSource(source)])),
    );
    return sources.flatMap((source) => {
      const context = this._contexts.get(source.id);
      return context ? [context] : [];
    });
  }

  /** The single-select Status field of the item's project, with the item it belongs to. */
  private async resolveStatusField(workItemId: string): Promise<{
    readonly context: IProjectContext;
    readonly field: Extract<ProjectFieldDefinition, { type: 'single-select' }>;
    readonly current: IWorkItem;
  }> {
    const current = this._items.get(workItemId);
    if (!current) throw new Error(`Refresh the GitHub work item before changing it: ${workItemId}`);
    const context = await this.ensureContext(current.sourceId, current.workspaceId);
    const field = context.fields.find(
      (candidate): candidate is Extract<ProjectFieldDefinition, { type: 'single-select' }> =>
        candidate.role === 'workflow-state' && candidate.type === 'single-select',
    );
    if (!field) {
      throw new Error(
        `GitHub Project "${context.source.displayName}" has no Status field. Add one in the project settings.`,
      );
    }
    return { context, field, current };
  }

  /**
   * Writes the Status field and answers with the item as GitHub now holds it.
   *
   * The mutation returns the mutated item, so the common case costs a single request. Only an
   * unusable payload falls back to reading that one item again; the whole project is never
   * reloaded for a column change.
   */
  private async writeStatus(
    context: IProjectContext,
    workItemId: string,
    field: Extract<ProjectFieldDefinition, { type: 'single-select' }>,
    option: { readonly id: string; readonly label: string },
  ): Promise<IWorkItem> {
    const mutated = await this.writeProjectField(context, workItemId, field, {
      fieldId: field.id,
      type: 'single-select',
      value: option.id,
    });
    const updated =
      (mutated ? await this.hydrateProjectItem(mutated, context) : undefined) ??
      (await this.readProjectItem(context, workItemId));
    if (!updated) {
      throw new Error(`GitHub did not persist Status ${option.label} for ${workItemId}.`);
    }
    return updated;
  }

  private now(): string {
    return this._options.now?.() ?? new Date().toISOString();
  }

  private leaseUntil(): string {
    const minutes = this._options.claimLeaseMinutes?.() ?? 30;
    return new Date(new Date(this.now()).getTime() + minutes * 60_000).toISOString();
  }

  /**
   * Takes an expired claim over.
   *
   * The lease lives in the shared claim commit, so any orchestrator can tell an active worker
   * from a crashed one. A takeover raises the fencing token, which is what stops the previous
   * worker from writing results once it comes back.
   */
  private async takeOverExpiredClaim(
    context: IProjectContext,
    workItem: IWorkItem,
    action: IWorkItemClaim['action'],
    executionId: string,
    reference: string,
    existingSha: string,
  ): Promise<WorkItemClaimAcquisition | undefined> {
    const existing = parseClaimCommitMessage(
      await this.claimCommitMessage(context, workItem.repository, existingSha),
    );
    if (!existing.leaseUntil) return undefined;
    const leaseUntil = new Date(existing.leaseUntil).getTime();
    if (Number.isNaN(leaseUntil) || leaseUntil > new Date(this.now()).getTime()) return undefined;

    const owner = await this.currentAccountLogin(context);
    const claimVersion = (existing.claimVersion ?? 1) + 1;
    const sha = await this.writeClaimCommit(context, workItem, reference, existingSha, {
      owner,
      action,
      executionId,
      leaseUntil: this.leaseUntil(),
      heartbeatAt: this.now(),
      claimVersion,
    });
    await this.setAssistanceAction(context, workItem, action);
    await this.assignClaimOwner(context, workItem, owner);
    return {
      status: 'acquired',
      claim: {
        id: `${reference}@${sha}`,
        workItemId: workItem.id,
        action,
        owner,
        acquiredAt: this.now(),
        leaseUntil: this.leaseUntil(),
        heartbeatAt: this.now(),
        claimVersion,
      },
    };
  }

  /**
   * Decides whether the shared lease still has enough runway.
   *
   * The lease may never lapse between two heartbeats, so it is extended as soon as less than
   * half of it - or less than two heartbeats - is left. A claim without a lease is from an
   * older claim format and is rewritten so other orchestrators can read its runway.
   */
  private leaseNeedsExtension(claim: IWorkItemClaim): boolean {
    if (!claim.leaseUntil) return true;
    const remaining = new Date(claim.leaseUntil).getTime() - new Date(this.now()).getTime();
    if (!Number.isFinite(remaining)) return true;
    const leaseMs = (this._options.claimLeaseMinutes?.() ?? 30) * 60_000;
    const heartbeatMs = (this._options.claimHeartbeatSeconds?.() ?? 60) * 1_000;
    return remaining <= Math.max(leaseMs / 2, heartbeatMs * 2);
  }

  /** Writes a claim commit onto the claim reference and returns its id. */
  private async writeClaimCommit(
    context: IProjectContext,
    workItem: IWorkItem,
    reference: string,
    parentSha: string,
    record: IClaimRecord,
  ): Promise<string> {
    const parent = await this.githubApi<{ readonly tree?: { readonly sha?: string } }>(
      context,
      'GET',
      `repos/${repositoryPath(workItem.repository)}/git/commits/${parentSha}`,
    );
    if (!parent.tree?.sha) {
      throw new Error(`GitHub did not return the claim tree for ${workItem.repository}.`);
    }
    const commit = await this.githubApi<{ readonly sha?: string }>(
      context,
      'POST',
      `repos/${repositoryPath(workItem.repository)}/git/commits`,
      {
        message: claimCommitMessage(workItem, record),
        tree: parent.tree.sha,
        parents: [parentSha],
      },
    );
    if (!commit.sha) throw new Error('GitHub did not return the claim commit id.');
    await this.githubApi(
      context,
      'PATCH',
      `repos/${repositoryPath(workItem.repository)}/git/${reference}`,
      { sha: commit.sha, force: true },
    );
    return commit.sha;
  }

  private async claimCommitMessage(
    context: IProjectContext,
    repository: string,
    sha: string,
  ): Promise<string | undefined> {
    const commit = await this.githubApi<{ readonly message?: string }>(
      context,
      'GET',
      `repos/${repositoryPath(repository)}/git/commits/${sha}`,
    ).catch(() => undefined);
    return commit?.message;
  }

  private async releaseAbandonedClaim(
    context: IProjectContext,
    repository: string,
    reference: { readonly ref: string; readonly sha: string },
    now: Date,
  ): Promise<boolean> {
    const record = parseClaimCommitMessage(
      await this.claimCommitMessage(context, repository, reference.sha),
    );
    // Without a readable lease the claim cannot be proven dead, and a live run must never lose
    // its claim to a sweep, so an unreadable reference is left for a person to judge.
    if (!record.leaseUntil || !isClaimExpired({ leaseUntil: record.leaseUntil }, now)) return false;
    await this.deleteClaimReference(context, repository, reference.ref);
    const item = record.projectItemId ? this._items.get(record.projectItemId) : undefined;
    if (item && item.assistanceAction !== 'none') {
      // The abandoned run also left its phase on the board, where it reads as work in progress.
      await this.setAssistanceAction(context, item, 'none').catch(() => undefined);
    }
    return true;
  }

  private async listClaimReferences(
    context: IProjectContext,
    repository: string,
  ): Promise<readonly { readonly ref: string; readonly sha: string }[]> {
    const response = await this.githubApi<
      readonly { readonly ref?: string; readonly object?: { readonly sha?: string } }[]
    >(
      context,
      'GET',
      `repos/${repositoryPath(repository)}/git/matching-refs/${claimReferenceRoot}`,
    );
    return (response ?? []).flatMap((entry) =>
      entry.ref && entry.object?.sha ? [{ ref: entry.ref, sha: entry.object.sha }] : [],
    );
  }

  /** Every repository a loaded work item claims in, paired with the context that reaches it. */
  private claimRepositories(): readonly (readonly [IProjectContext, string])[] {
    const seen = new Set<string>();
    const repositories: (readonly [IProjectContext, string])[] = [];
    for (const item of this._items.values()) {
      if (item.provider !== 'github-projects' || !item.sourceId || !item.repository) continue;
      const context = this._contexts.get(item.sourceId);
      if (!context) continue;
      const key = `${item.sourceId}\u0000${item.repository}`;
      if (seen.has(key)) continue;
      seen.add(key);
      repositories.push([context, item.repository]);
    }
    return repositories;
  }

  private async setAssistanceAction(
    context: IProjectContext,
    workItem: IWorkItem,
    action: AssistanceAction,
  ): Promise<void> {
    const field = context.fields.find(
      (candidate): candidate is Extract<ProjectFieldDefinition, { type: 'single-select' }> =>
        candidate.role === 'assistance-action' && candidate.type === 'single-select',
    );
    const option = field?.options.find((candidate) => candidate.assistanceAction === action);
    if (!field || !option) {
      throw new Error(`GitHub Project Assistant phase has no option for action ${action}.`);
    }
    await this.writeProjectField(context, workItem.id, field, {
      fieldId: field.id,
      type: 'single-select',
      value: option.id,
    });
    this._items.set(workItem.id, { ...workItem, assistanceAction: action });
  }

  /**
   * Makes the claiming account the only assignee of the issue.
   *
   * Triggering an action claims the ticket exclusively, and the assignees must show exactly
   * that owner - never a second person besides them. Assignees stay descriptive metadata:
   * exclusivity itself is still enforced by the claim reference, not by this write.
   */
  private async assignClaimOwner(
    context: IProjectContext,
    workItem: IWorkItem,
    owner: string,
  ): Promise<void> {
    const issueNumber = workItem.externalId.replace(/^#/u, '');
    if (!/^\d+$/u.test(issueNumber)) return;
    // The local projection may predate another machine's claim, so the removal set comes from
    // the issue as GitHub holds it now - the invariant is "only the owner", not "owner added".
    const issue = await this.githubApi<{
      readonly assignees?: readonly { readonly login?: string }[];
    }>(context, 'GET', `repos/${repositoryPath(workItem.repository)}/issues/${issueNumber}`);
    const currentLogins = (issue.assignees ?? []).flatMap((assignee) =>
      assignee.login ? [assignee.login] : [],
    );
    const removeAssignees = currentLogins.filter(
      (login) => login.toLowerCase() !== owner.toLowerCase(),
    );
    const alreadySoleOwner = removeAssignees.length === 0 && currentLogins.length === 1;
    if (!alreadySoleOwner) {
      const args = ['issue', 'edit', issueNumber, '--repo', workItem.repository];
      if (!currentLogins.some((login) => login.toLowerCase() === owner.toLowerCase())) {
        args.push('--add-assignee', owner);
      }
      if (removeAssignees.length) args.push('--remove-assignee', removeAssignees.join(','));
      await this._runCommand(args, context.environment);
    }
    const current = this._items.get(workItem.id) ?? workItem;
    const known = this._assigneesByRepository.get(current.repository) ?? [];
    this._items.set(workItem.id, {
      ...current,
      assignees: [known.find((candidate) => candidate.login === owner) ?? { login: owner }],
    });
  }

  private async currentAccountLogin(context: IProjectContext): Promise<string> {
    const cached = this._accountLogins.get(context.connection.id);
    if (cached) return cached;
    const configured = context.connection.accountLogin?.trim();
    const login = (
      await this._runCommand(
        ['api', '--hostname', context.connection.hostname, 'user', '--jq', '.login'],
        context.environment,
      )
    ).trim();
    if (!login) throw new Error('GitHub did not return the authenticated account login.');
    if (configured && configured.toLowerCase() !== login.toLowerCase()) {
      throw new Error(
        `GitHub connection account ${configured} does not match authenticated account ${login}.`,
      );
    }
    this._accountLogins.set(context.connection.id, login);
    return login;
  }

  private defaultBranch(workItem: IWorkItem): string {
    const binding = this._options
      .settings()
      .repositoryBindings.find(
        (candidate) =>
          candidate.enabled &&
          candidate.workspaceId === workItem.workspaceId &&
          `${candidate.owner}/${candidate.name}` === workItem.repository,
      );
    if (!binding) throw new Error(`No repository binding exists for ${workItem.repository}.`);
    return `heads/${binding.defaultBranch}`;
  }

  private async assertClaimOwnership(
    context: IProjectContext,
    workItem: IWorkItem,
    claim: IWorkItemClaim,
  ): Promise<void> {
    const { reference, sha } = parseClaimId(claim.id);
    const current = await this.readOptionalRepositoryReference(
      context,
      workItem,
      reference.replace(/^refs\//u, ''),
    );
    // A claim reference that no longer exists carries no ownership to prove: it was released
    // or taken over elsewhere, and the caller has to acquire a new claim rather than fail.
    if (current === undefined) throw new WorkItemClaimMissingError(workItem.externalId, claim.id);
    if (current === sha) return;
    // The reference moved. Either this orchestrator renewed its own claim, or another one took
    // it over - the fencing token decides which, and an outdated worker must stop writing.
    const record = parseClaimCommitMessage(
      await this.claimCommitMessage(context, workItem.repository, current),
    );
    const held = claim.claimVersion ?? 1;
    if (record.claimVersion !== undefined && record.claimVersion > held) {
      throw new WorkItemClaimLostError(
        `Work item ${workItem.externalId} was taken over by ${record.owner ?? 'another Symphony instance'} after this claim lease expired.`,
        workItem.externalId,
      );
    }
    if (record.owner && claim.owner && record.owner !== claim.owner) {
      throw new WorkItemClaimLostError(
        `Distributed claim ownership was lost for ${workItem.externalId}.`,
        workItem.externalId,
      );
    }
  }

  private async deleteClaimReference(
    context: IProjectContext,
    repository: string,
    reference: string,
  ): Promise<void> {
    try {
      await this.githubApi(
        context,
        'DELETE',
        `repos/${repositoryPath(repository)}/git/${reference}`,
      );
    } catch (cause) {
      // Another orchestrator deleting it first is the same outcome, not a failure to report.
      if (!isGitHubNotFound(cause)) throw cause;
    }
  }

  /** Reads a reference that may legitimately be absent; only a real absence returns undefined. */
  private async readOptionalRepositoryReference(
    context: IProjectContext,
    workItem: IWorkItem,
    reference: string,
  ): Promise<string | undefined> {
    try {
      return await this.readRepositoryReference(context, workItem, reference);
    } catch (cause) {
      if (isGitHubNotFound(cause)) return undefined;
      throw cause;
    }
  }

  private async readRepositoryReference(
    context: IProjectContext,
    workItem: IWorkItem,
    reference: string,
  ): Promise<string> {
    const response = await this.githubApi<{ readonly object?: { readonly sha?: string } }>(
      context,
      'GET',
      `repos/${repositoryPath(workItem.repository)}/git/ref/${reference
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`,
    );
    if (!response.object?.sha) throw new Error(`GitHub reference ${reference} has no object id.`);
    return response.object.sha;
  }

  private async githubApi<T = unknown>(
    context: IProjectContext,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    endpoint: string,
    input?: Readonly<Record<string, unknown>>,
  ): Promise<T> {
    const output = await this._runCommand(
      [
        'api',
        '--hostname',
        context.connection.hostname,
        '--method',
        method,
        endpoint,
        ...(input ? ['--input', '-'] : []),
      ],
      context.environment,
      input ? JSON.stringify(input) : undefined,
    );
    return output.trim() ? (JSON.parse(output) as T) : (undefined as T);
  }

  /**
   * Reads the whole project, joining a load that is already running.
   *
   * Writes no longer come through here: they report their own result from the mutation payload
   * or read back the single item they changed, so a running load can always be joined.
   */
  private async loadSource(source: GitHubProjectSource): Promise<readonly IWorkItem[]> {
    const active = this._sourceLoads.get(source.id);
    if (active) return active;
    const operation = this.loadSourceOnce(source).finally(() => {
      if (this._sourceLoads.get(source.id) === operation) this._sourceLoads.delete(source.id);
    });
    this._sourceLoads.set(source.id, operation);
    return operation;
  }

  private async loadSourceOnce(source: GitHubProjectSource): Promise<readonly IWorkItem[]> {
    const connection = this.resolveConnection(source);
    const environment = await this.createEnvironment(connection);
    const projectId = await this.resolveProjectId(source, connection, environment);
    const fields = await this.loadProjectFields(
      projectId,
      connection,
      environment,
      source.columnMappings ?? [],
    );
    const { documents, values } = await this.loadProjectItems(projectId, connection, environment);
    const context = { source, connection, environment, projectId, fields };
    this._contexts.set(source.id, context);
    const items = await this.enrichItems(
      parseProjectItems(
        JSON.stringify({ items: documents }),
        source,
        fields,
        values,
        this._options.settings(),
      ),
      context,
    );
    items.forEach((item) => this._items.set(item.id, item));
    this._itemsBySource.set(source.id, items);
    return items;
  }

  private async loadAutomationChanges(
    items: readonly IWorkItem[],
    context: IProjectContext,
    since: string | undefined,
  ): Promise<readonly IAutomationSignal[]> {
    const accountLogin = context.connection.accountLogin?.trim().toLowerCase();
    if (!accountLogin) return [];
    const signals: IAutomationSignal[] = [];
    const repositories = [...new Set(items.map((item) => item.repository).filter(Boolean))];
    for (const repository of repositories) {
      const repositoryItems = items.filter((item) => item.repository === repository);
      const itemByNumber = new Map(
        repositoryItems.flatMap((item) => {
          const number = Number(item.externalId.replace(/^#/u, ''));
          return Number.isInteger(number) ? [[number, item] as const] : [];
        }),
      );
      const query = since ? `&since=${encodeURIComponent(since)}` : '';
      const [changedIssues, comments] = await Promise.all([
        this.loadRepositoryPages<IRepositoryIssueDocument>(
          context,
          `repos/${repositoryPath(repository)}/issues?state=all&per_page=100${query}`,
        ),
        this.loadRepositoryPages<IRepositoryCommentDocument>(
          context,
          `repos/${repositoryPath(repository)}/issues/comments?per_page=100${query}`,
        ),
      ]);
      const contentSignals = await Promise.all(
        changedIssues.flatMap((issue) => {
          const item = issue.number ? itemByNumber.get(issue.number) : undefined;
          return item ? [this.loadContentAutomationSignal(item, context, accountLogin)] : [];
        }),
      );
      signals.push(...contentSignals.flatMap((signal) => (signal ? [signal] : [])));
      for (const comment of comments) {
        const issueNumber = issueNumberFromUrl(comment.issue_url);
        const item = issueNumber ? itemByNumber.get(issueNumber) : undefined;
        const actorLogin = comment.user?.login;
        const command = parseAutomationCommand(comment.body ?? '');
        if (!item || !comment.id || actorLogin?.toLowerCase() !== accountLogin || !command) {
          continue;
        }
        signals.push({
          id: `github:${context.connection.hostname}:${item.repository}:${issueNumber}:comment:${comment.id}:${comment.updated_at ?? comment.created_at ?? ''}`,
          sourceId: context.source.id,
          workspaceId: context.source.workspaceId,
          workItem: item,
          origin: 'comment',
          action: command.action,
          actorLogin,
          ...(command.request ? { request: command.request } : {}),
          occurredAt: comment.updated_at ?? comment.created_at ?? '1970-01-01T00:00:00Z',
          externalCommentId: String(comment.id),
        });
      }
    }
    return signals;
  }

  private async loadContentAutomationSignal(
    item: IWorkItem,
    context: IProjectContext,
    accountLogin: string,
  ): Promise<IAutomationSignal | undefined> {
    const issueNumber = Number(item.externalId.replace(/^#/u, ''));
    const [owner, name] = item.repository.split('/');
    if (!owner || !name || !Number.isInteger(issueNumber)) return undefined;
    const response = await this.graphql<IIssueAutomationResponse>(
      context.connection,
      context.environment,
      issueAutomationContentQuery,
      { owner, name, number: issueNumber },
    );
    assertGraphql(response);
    const issue = response.data?.repository?.issue ?? undefined;
    if (!issue) return undefined;

    const currentItem: IWorkItem = {
      ...item,
      ...(issue.title !== undefined ? { title: issue.title } : {}),
      ...(issue.body !== undefined ? { body: issue.body } : {}),
      detailState: 'complete',
      ...(issue.createdAt ? { createdAt: issue.createdAt } : {}),
      ...(issue.updatedAt ? { updatedAt: issue.updatedAt } : {}),
    };
    this._items.set(currentItem.id, currentItem);
    const latestEdit = issue.userContentEdits?.nodes?.at(-1);
    const contentActor = latestEdit?.editor?.login ?? issue.author?.login;
    if (contentActor?.toLowerCase() !== accountLogin) return undefined;
    const digest = createHash('sha256')
      .update(`${currentItem.title}\0${currentItem.body}\0${currentItem.stageId ?? ''}`)
      .digest('hex');
    return {
      id: `github:${context.connection.hostname}:${item.repository}:${issueNumber}:content:${digest}`,
      sourceId: context.source.id,
      workspaceId: context.source.workspaceId,
      workItem: currentItem,
      origin: 'work-item-change',
      action: 'synchronize',
      actorLogin: contentActor,
      occurredAt:
        latestEdit?.editedAt ?? issue.lastEditedAt ?? issue.createdAt ?? '1970-01-01T00:00:00Z',
    };
  }

  private async loadRepositoryPages<T>(
    context: IProjectContext,
    endpoint: string,
  ): Promise<readonly T[]> {
    const output = await this._runCommand(
      [
        'api',
        '--hostname',
        context.connection.hostname,
        '--method',
        'GET',
        '--paginate',
        '--slurp',
        endpoint,
      ],
      context.environment,
    );
    const document = JSON.parse(output) as unknown;
    if (!Array.isArray(document)) throw new Error('GitHub pagination returned invalid JSON.');
    return document.flatMap((page) => (Array.isArray(page) ? (page as readonly T[]) : [page as T]));
  }

  private async resolveProjectId(
    source: GitHubProjectSource,
    connection: GitHubConnection,
    environment: NodeJS.ProcessEnv,
  ): Promise<string> {
    // The node id of a project never changes while its coordinates stay the same, so resolving
    // it once keeps a request out of every board read.
    const cacheKey = `${connection.id}\u0000${source.ownerType}\u0000${source.owner}\u0000${source.projectNumber}`;
    const cached = this._projectIds.get(cacheKey);
    if (cached) return cached;
    const response = await this.graphql<IProjectIdentityResponse>(
      connection,
      environment,
      projectIdentityQuery(source.ownerType),
      { owner: source.owner, number: source.projectNumber },
    );
    assertGraphql(response);
    const project =
      source.ownerType === 'organization'
        ? response.data?.organization?.projectV2
        : response.data?.user?.projectV2;
    if (!project?.id) throw new Error('The configured GitHub Project did not return an id.');
    this._projectIds.set(cacheKey, project.id);
    return project.id;
  }

  private async projectItemDocument(
    item: IProjectItemNode,
    connection: GitHubConnection,
    environment: NodeJS.ProcessEnv,
  ): Promise<{
    readonly document: IProjectItemDocument;
    readonly values: readonly ProjectFieldValue[];
  }> {
    if (!item.id) return { document: { id: '' }, values: [] };
    const content = item.content ?? undefined;
    const [fieldValueNodes, labels, assignees] = await Promise.all([
      this.loadAllProjectItemFieldValues(item.id, item.fieldValues, connection, environment),
      content?.id
        ? this.loadAllIssueLabels(content.id, content.labels, connection, environment)
        : Promise.resolve([]),
      content?.id
        ? this.loadAllIssueAssignees(content.id, content.assignees, connection, environment)
        : Promise.resolve([]),
    ]);
    return {
      document: {
        id: item.id,
        title: content?.title,
        labels,
        assignees,
        ...(content
          ? {
              content: {
                id: content.id,
                number: content.number,
                repository: content.repository?.nameWithOwner,
                title: content.title,
                type: content.__typename,
                url: content.url,
                createdAt: content.createdAt,
                updatedAt: content.updatedAt,
              },
            }
          : {}),
      },
      values: fieldValueNodes.flatMap(projectFieldValue),
    };
  }

  private async loadAllProjectItemFieldValues(
    itemId: string,
    initial: IProjectItemNode['fieldValues'],
    connection: GitHubConnection,
    environment: NodeJS.ProcessEnv,
  ): Promise<readonly IProjectFieldValueNode[]> {
    const nodes = [...(initial?.nodes ?? [])];
    let cursor: string | undefined;
    const seenCursors = new Set<string>();
    cursor = nextCursor(initial?.pageInfo, seenCursors, 'GitHub Project item field value');
    while (cursor) {
      const response = await this.graphql<IProjectItemFieldValuesResponse>(
        connection,
        environment,
        projectItemFieldValuesQuery,
        { itemId, cursor },
      );
      assertGraphql(response);
      const page = response.data?.node?.fieldValues;
      nodes.push(...(page?.nodes ?? []));
      cursor = nextCursor(page?.pageInfo, seenCursors, 'GitHub Project item field value');
    }
    return nodes;
  }

  private async loadAllIssueLabels(
    contentId: string,
    initial: ILabelConnection | undefined,
    connection: GitHubConnection,
    environment: NodeJS.ProcessEnv,
  ): Promise<readonly string[]> {
    const labels = (initial?.nodes ?? []).flatMap((label) => (label.name ? [label.name] : []));
    let cursor: string | undefined;
    const seenCursors = new Set<string>();
    cursor = nextCursor(initial?.pageInfo, seenCursors, 'GitHub issue label');
    while (cursor) {
      const response = await this.graphql<IIssueLabelsResponse>(
        connection,
        environment,
        issueLabelsQuery,
        { contentId, cursor },
      );
      assertGraphql(response);
      const page = response.data?.node?.labels;
      labels.push(...(page?.nodes ?? []).flatMap((label) => (label.name ? [label.name] : [])));
      cursor = nextCursor(page?.pageInfo, seenCursors, 'GitHub issue label');
    }
    return labels;
  }

  private async loadAllIssueAssignees(
    contentId: string,
    initial: IAssigneeConnection | undefined,
    connection: GitHubConnection,
    environment: NodeJS.ProcessEnv,
  ): Promise<readonly string[]> {
    const assignees = (initial?.nodes ?? []).flatMap((user) => (user.login ? [user.login] : []));
    let cursor: string | undefined;
    const seenCursors = new Set<string>();
    cursor = nextCursor(initial?.pageInfo, seenCursors, 'GitHub issue assignee');
    while (cursor) {
      const response = await this.graphql<IIssueAssigneesResponse>(
        connection,
        environment,
        issueAssigneesQuery,
        { contentId, cursor },
      );
      assertGraphql(response);
      const page = response.data?.node?.assignees;
      assignees.push(...(page?.nodes ?? []).flatMap((user) => (user.login ? [user.login] : [])));
      cursor = nextCursor(page?.pageInfo, seenCursors, 'GitHub issue assignee');
    }
    return assignees;
  }

  private async loadProjectFields(
    projectId: string,
    connection: GitHubConnection,
    environment: NodeJS.ProcessEnv,
    columnMappings: readonly IBoardColumnMapping[],
  ): Promise<readonly ProjectFieldDefinition[]> {
    const fields: IProjectFieldNode[] = [];
    let cursor: string | undefined;
    const seenCursors = new Set<string>();
    while (true) {
      const response = await this.graphql<IProjectSchemaResponse>(
        connection,
        environment,
        projectFieldQuery,
        { projectId, ...(cursor ? { cursor } : {}) },
      );
      assertGraphql(response);
      const page = response.data?.node?.fields;
      fields.push(...(page?.nodes ?? []));
      cursor = nextCursor(page?.pageInfo, seenCursors, 'GitHub Project field');
      if (!cursor) return fields.flatMap((node) => projectFieldDefinition(node, columnMappings));
    }
  }

  private async loadProjectPages<
    TResponse extends { readonly errors?: readonly { readonly message?: string }[] },
  >(
    connection: GitHubConnection,
    environment: NodeJS.ProcessEnv,
    query: string,
    variables: Record<string, unknown>,
    select: (response: TResponse) => IProjectListConnection | undefined | null,
  ): Promise<readonly IProjectListNode[]> {
    const nodes: IProjectListNode[] = [];
    let cursor: string | undefined;
    const seenCursors = new Set<string>();
    while (true) {
      const response = await this.graphql<TResponse>(connection, environment, query, {
        ...variables,
        ...(cursor ? { cursor } : {}),
      });
      assertGraphql(response);
      const page = select(response);
      nodes.push(...(page?.nodes ?? []).flatMap((node) => (node ? [node] : [])));
      cursor = nextCursor(page?.pageInfo, seenCursors, 'GitHub Project list');
      if (!cursor) return nodes;
    }
  }

  private async loadProjectItems(
    projectId: string,
    connection: GitHubConnection,
    environment: NodeJS.ProcessEnv,
  ): Promise<{
    readonly documents: readonly IProjectItemDocument[];
    readonly values: ReadonlyMap<string, readonly ProjectFieldValue[]>;
  }> {
    const documents: IProjectItemDocument[] = [];
    const values = new Map<string, readonly ProjectFieldValue[]>();
    let cursor: string | undefined;
    const seenCursors = new Set<string>();
    while (true) {
      const response = await this.graphql<IProjectItemsResponse>(
        connection,
        environment,
        projectItemsQuery,
        { projectId, ...(cursor ? { cursor } : {}) },
      );
      assertGraphql(response);
      const page = response.data?.node?.items;
      const hydrated = await Promise.all(
        (page?.nodes ?? []).map((item) => this.projectItemDocument(item, connection, environment)),
      );
      for (const item of hydrated) {
        if (!item.document.id) continue;
        documents.push(item.document);
        values.set(item.document.id, item.values);
      }
      cursor = nextCursor(page?.pageInfo, seenCursors, 'GitHub Project item');
      if (!cursor) return { documents, values };
    }
  }

  private async writeProjectFields(
    context: IProjectContext,
    itemId: string,
    values: readonly ProjectFieldValue[],
  ): Promise<void> {
    for (const value of values) {
      const field = context.fields.find((candidate) => candidate.id === value.fieldId);
      if (!field) throw new Error(`Unknown GitHub Project field: ${value.fieldId}`);
      await this.writeProjectField(context, itemId, field, value);
    }
  }

  /**
   * Writes one project field and answers with the item GitHub returns for the write.
   *
   * The mutation payload already carries the mutated item, so a caller that needs to see the
   * result does not have to read the project back. Returning `undefined` only means the payload
   * was not usable; it never means the write failed.
   */
  private async writeProjectField(
    context: IProjectContext,
    itemId: string,
    field: ProjectFieldDefinition,
    value: ProjectFieldValue | undefined,
  ): Promise<IProjectItemNode | undefined> {
    if (value && value.type !== field.type) {
      throw new Error(`Project field ${field.name} received the wrong value type.`);
    }
    const variables = { projectId: context.projectId, itemId, fieldId: field.id };
    const clear =
      !value ||
      ((value.type === 'text' || value.type === 'date') && !value.value) ||
      (value.type === 'number' && value.value === null) ||
      ((value.type === 'single-select' || value.type === 'iteration') && !value.value) ||
      (value.type === 'multi-select' && value.value.length === 0);
    const response = clear
      ? await this.graphql<IProjectFieldMutationResponse>(
          context.connection,
          context.environment,
          clearProjectFieldMutation,
          variables,
        )
      : await this.graphql<IProjectFieldMutationResponse>(
          context.connection,
          context.environment,
          projectFieldMutation(value.type),
          { ...variables, value: value.value },
        );
    assertGraphql(response);
    const mutated =
      response.data?.updateProjectV2ItemFieldValue?.projectV2Item ??
      response.data?.clearProjectV2ItemFieldValue?.projectV2Item ??
      undefined;
    return mutated?.id ? mutated : undefined;
  }

  /** Reads a single project item, without touching the rest of the project. */
  private async readProjectItem(
    context: IProjectContext,
    itemId: string,
  ): Promise<IWorkItem | undefined> {
    const response = await this.graphql<IProjectItemResponse>(
      context.connection,
      context.environment,
      projectItemQuery,
      { itemId },
    );
    assertGraphql(response);
    const node = response.data?.node ?? undefined;
    return node?.id ? this.hydrateProjectItem(node, context) : undefined;
  }

  /**
   * Turns one raw project item into a work item and records it, so a write can update the
   * tracker's own view of the board without reloading every other card.
   */
  private async hydrateProjectItem(
    node: IProjectItemNode,
    context: IProjectContext,
  ): Promise<IWorkItem | undefined> {
    const hydrated = await this.projectItemDocument(node, context.connection, context.environment);
    if (!hydrated.document.id) return undefined;
    const parsed = parseProjectItems(
      JSON.stringify({ items: [hydrated.document] }),
      context.source,
      context.fields,
      new Map([[hydrated.document.id, hydrated.values]]),
      this._options.settings(),
    );
    const [enriched] = await this.enrichItems(parsed, context);
    if (!enriched) return undefined;
    this._items.set(enriched.id, enriched);
    const items = this._itemsBySource.get(context.source.id);
    if (items) {
      // A created item is not in the loaded set yet, so it is appended rather than dropped:
      // callers that read the source list would otherwise not see it until the next full load.
      this._itemsBySource.set(
        context.source.id,
        items.some((candidate) => candidate.id === enriched.id)
          ? items.map((candidate) => (candidate.id === enriched.id ? enriched : candidate))
          : [...items, enriched],
      );
    }
    return enriched;
  }

  private async graphql<T>(
    connection: GitHubConnection,
    environment: NodeJS.ProcessEnv,
    query: string,
    variables: Readonly<Record<string, unknown>>,
  ): Promise<T> {
    const output = await this._runCommand(
      ['api', 'graphql', '--hostname', connection.hostname, '--input', '-'],
      environment,
      JSON.stringify({ query, variables }),
    );
    const response = JSON.parse(output) as T & {
      readonly data?: { readonly rateLimit?: IGitHubRateLimitSnapshot };
    };
    if (response.data?.rateLimit) {
      this._governor.observe(response.data.rateLimit, 'GitHub GraphQL rate limit exhausted.');
      this._options.observeRateLimit?.(response.data.rateLimit);
    }
    return response;
  }

  private async executeGoverned(
    args: readonly string[],
    environment: NodeJS.ProcessEnv,
    standardInput?: string,
  ): Promise<string> {
    try {
      return await this._governor.run(() => this._rawRunCommand(args, environment, standardInput));
    } catch (cause) {
      // A token is cached across requests, so a rejected one has to be dropped here or every
      // later request would keep presenting it until the cache expires on its own.
      if (isGitHubAuthenticationFailure(cause)) forgetGitHubToken(environment['GH_HOST']);
      if (cause instanceof GitHubRateLimitError || !isGitHubRateLimitFailure(cause)) throw cause;
      const retryAt = await this.resolveRateLimitReset(environment, cause);
      throw this._governor.block(retryAt, errorMessage(cause));
    }
  }

  private async resolveRateLimitReset(
    environment: NodeJS.ProcessEnv,
    cause: unknown,
  ): Promise<string> {
    try {
      const output = await this._rawRunCommand(
        ['api', 'rate_limit', '--hostname', environment['GH_HOST'] ?? 'github.com'],
        environment,
      );
      const document = JSON.parse(output) as {
        readonly resources?: {
          readonly graphql?: { readonly reset?: number };
          readonly core?: { readonly reset?: number };
        };
      };
      const reset = /graphql/iu.test(errorMessage(cause))
        ? document.resources?.graphql?.reset
        : document.resources?.core?.reset;
      if (reset && Number.isFinite(reset)) return new Date(reset * 1_000).toISOString();
    } catch {
      // A bounded fallback still prevents repeated requests when the status endpoint is unavailable.
    }
    return new Date(Date.now() + 60_000).toISOString();
  }

  private async ensureContext(
    sourceId?: string,
    workspaceId?: string,
    repository?: string,
  ): Promise<IProjectContext> {
    const source = this.resolveSource(sourceId, workspaceId, repository);
    const existing = this._contexts.get(source.id);
    if (existing) return existing;
    await this.loadSource(source);
    const context = this._contexts.get(source.id);
    if (!context) throw new Error('The GitHub Project context is unavailable.');
    return context;
  }

  private resolveSource(
    sourceId?: string,
    workspaceId?: string,
    repository?: string,
  ): GitHubProjectSource {
    const settings = this._options.settings();
    const repositoryWorkspaceId = repository
      ? settings.repositoryBindings.find(
          (binding) =>
            binding.id === repository ||
            binding.displayName === repository ||
            `${binding.owner}/${binding.name}` === repository,
        )?.workspaceId
      : undefined;
    const sources = settings.workItemSources.filter(
      (source): source is GitHubProjectSource =>
        source.provider === 'github-projects' &&
        source.enabled &&
        (!sourceId || source.id === sourceId) &&
        (!workspaceId || source.workspaceId === workspaceId) &&
        (!repositoryWorkspaceId || source.workspaceId === repositoryWorkspaceId),
    );
    if (sources.length !== 1) {
      throw new Error('Choose exactly one GitHub Project source for this operation.');
    }
    return sources[0]!;
  }

  private resolveConnection(source: GitHubProjectSource): GitHubConnection {
    const connection = this._options
      .settings()
      .connections.find(
        (candidate): candidate is GitHubConnection =>
          candidate.kind === 'github' &&
          candidate.id === source.connectionId &&
          candidate.workspaceId === source.workspaceId,
      );
    if (!connection) throw new Error(`GitHub connection is unavailable: ${source.connectionId}`);
    return connection;
  }

  private resolveConnectionById(workspaceId: string, connectionId: string): GitHubConnection {
    const connection = this._options
      .settings()
      .connections.find(
        (candidate): candidate is GitHubConnection =>
          candidate.kind === 'github' &&
          candidate.id === connectionId &&
          candidate.workspaceId === workspaceId,
      );
    if (!connection) throw new Error(`GitHub connection is unavailable: ${connectionId}`);
    return connection;
  }

  private async createEnvironment(connection: GitHubConnection): Promise<NodeJS.ProcessEnv> {
    const token = await this._options.token?.(connection);
    const environment: NodeJS.ProcessEnv = {
      GH_HOST: connection.hostname,
      ...(token ? { GH_TOKEN: token, GITHUB_TOKEN: token } : {}),
    };
    for (const name of ['LANG', 'LC_ALL', 'SHELL', 'TMPDIR'] as const) {
      if (process.env[name]) environment[name] = process.env[name];
    }
    environment['PATH'] = toolchainSearchPath();
    return environment;
  }

  private repositoryOptions(source: GitHubProjectSource): readonly string[] {
    const configured = this._options
      .settings()
      .repositoryBindings.filter(
        (binding) =>
          binding.enabled &&
          binding.provider === 'github' &&
          binding.workspaceId === source.workspaceId,
      )
      .map((binding) => `${binding.owner}/${binding.name}`);
    const discovered = [...this._items.values()]
      .filter((item) => item.sourceId === source.id)
      .map((item) => item.repository);
    return [...configured, ...discovered].filter(
      (repository, index, repositories) => repositories.indexOf(repository) === index,
    );
  }

  private assertRepositoryAvailable(repository: string, source: GitHubProjectSource): void {
    if (!this.repositoryOptions(source).includes(repository)) {
      throw new Error(`Repository is not available in this GitHub Project: ${repository}`);
    }
  }

  private async enrichItems(
    items: readonly IWorkItem[],
    context: IProjectContext,
  ): Promise<readonly IWorkItem[]> {
    const repositories = [...new Set(items.map((item) => item.repository).filter(Boolean))];
    await Promise.all(
      repositories.map((repository) => this.loadAssignees(repository, context, true)),
    );
    const coordinationByWorkItem = await this.loadWorkItemCoordinations(items, context);
    return items.map((item) => {
      const known = this._assigneesByRepository.get(item.repository) ?? [];
      const coordination = coordinationByWorkItem.get(item.id);
      return {
        ...item,
        assignees: item.assignees.map(
          (assignee) => known.find((candidate) => candidate.login === assignee.login) ?? assignee,
        ),
        ...(coordination ? { coordination } : {}),
      };
    });
  }

  private async loadWorkItemCoordinations(
    items: readonly IWorkItem[],
    context: IProjectContext,
  ): Promise<ReadonlyMap<string, NonNullable<IWorkItem['coordination']>>> {
    const candidates = items.filter(
      (item): item is IWorkItem & { assistanceAction: IWorkItemClaim['action'] } =>
        item.assistanceAction === 'analyze' || item.assistanceAction === 'solve',
    );
    const repositories = [...new Set(candidates.map((item) => item.repository))];
    const entries = await Promise.all(
      repositories.map(async (repository) => {
        const references = await this.githubApi<readonly IGitReferenceDocument[]>(
          context,
          'GET',
          `repos/${repositoryPath(repository)}/git/matching-refs/heads/symphony/claims`,
        );
        const shaByReference = new Map(
          references.flatMap((reference) =>
            reference.ref && reference.object?.sha
              ? [[reference.ref, reference.object.sha] as const]
              : [],
          ),
        );
        const claims = candidates.flatMap((item) => {
          if (item.repository !== repository) return [];
          const reference = claimReference(item);
          const sha = shaByReference.get(reference);
          return sha ? [{ item, reference, sha }] : [];
        });
        if (!claims.length) return [];
        const [owner, name] = repository.split('/');
        if (!owner || !name) throw new Error(`Invalid GitHub repository: ${repository}`);
        const repositoryEntries: [string, NonNullable<IWorkItem['coordination']>][] = [];
        for (let offset = 0; offset < claims.length; offset += 50) {
          const batch = claims.slice(offset, offset + 50);
          const variables = Object.fromEntries(
            batch.map((claim, index) => [`claim${index}`, claim.sha]),
          );
          const variableDefinitions = batch
            .map((_claim, index) => `$claim${index}: String!`)
            .join(', ');
          const selections = batch
            .map(
              (_claim, index) =>
                `claim${index}: object(expression: $claim${index}) { ... on Commit { message } }`,
            )
            .join('\n');
          const response = await this.graphql<{
            readonly data?: {
              readonly repository?: Readonly<Record<string, { readonly message?: string } | null>>;
            };
            readonly errors?: readonly { readonly message?: string }[];
          }>(
            context.connection,
            context.environment,
            `query WorkItemClaimCommits($owner: String!, $name: String!, ${variableDefinitions}) {
              repository(owner: $owner, name: $name) {
                ${selections}
              }
            }`,
            { owner, name, ...variables },
          );
          assertGraphql(response);
          repositoryEntries.push(
            ...batch.map((claim, index): [string, NonNullable<IWorkItem['coordination']>] => {
              const record = parseClaimCommitMessage(
                response.data?.repository?.[`claim${index}`]?.message,
              );
              const coordination = {
                state: 'claimed' as const,
                claimId: `${claim.reference}@${claim.sha}`,
                action: claim.item.assistanceAction,
                ...(record.owner ? { owner: record.owner } : {}),
                ...(record.leaseUntil ? { leaseUntil: record.leaseUntil } : {}),
                ...(record.claimVersion !== undefined ? { claimVersion: record.claimVersion } : {}),
              };
              // A claim whose lease elapsed no longer blocks work: the owning machine is gone
              // or stuck, and another orchestrator may take the work item over.
              const expired = isClaimExpired(coordination, new Date(this.now()));
              return [claim.item.id, expired ? { ...coordination, expired } : coordination];
            }),
          );
        }
        return repositoryEntries;
      }),
    );
    return new Map(entries.flat());
  }

  private async loadAssignees(
    repository: string,
    context: IProjectContext,
    tolerateFailure: boolean,
  ): Promise<readonly IWorkItemAssignee[]> {
    const cached = this._assigneesByRepository.get(repository);
    if (cached) return cached;
    try {
      const documents = await this.loadRepositoryPages<IAssigneeDocument>(
        context,
        `repos/${repositoryPath(repository)}/assignees?per_page=100`,
      );
      const assignees = documents
        .filter((item): item is IAssigneeDocument & { login: string } => Boolean(item.login))
        .map((item) => ({
          login: item.login,
          ...(item.name ? { displayName: item.name } : {}),
          ...(item.avatar_url ? { avatarUrl: item.avatar_url } : {}),
        }));
      this._assigneesByRepository.set(repository, assignees);
      return assignees;
    } catch (cause) {
      if (!tolerateFailure) throw cause;
      return [];
    }
  }

  private async loadLabels(
    repository: string,
    context: IProjectContext,
  ): Promise<readonly IWorkItemLabelOption[]> {
    const documents = await this.loadRepositoryPages<ILabelDocument>(
      context,
      `repos/${repositoryPath(repository)}/labels?per_page=100`,
    );
    return documents
      .filter((item): item is ILabelDocument & { name: string; color: string } =>
        Boolean(item.name && item.color),
      )
      .map((item) => ({
        name: item.name,
        color: item.color,
        ...(item.description ? { description: item.description } : {}),
      }));
  }

  private async ensureRepositoryLabel(
    context: IProjectContext,
    repository: string,
    label: 'critical-path' | 'grouped-delivery',
  ): Promise<void> {
    const endpoint = `repos/${repositoryPath(repository)}/labels/${encodeURIComponent(label)}`;
    try {
      await this.githubApi(context, 'GET', endpoint);
      return;
    } catch (cause) {
      if (!isGitHubNotFound(cause)) throw cause;
    }
    await this.githubApi(context, 'POST', `repos/${repositoryPath(repository)}/labels`, {
      name: label,
      color: label === 'critical-path' ? 'D93F0B' : '5319E7',
      description:
        label === 'critical-path'
          ? 'Tickets sharing an Analyzer-proven change surface'
          : 'Independent tickets delivered through one Symphony workflow',
    });
  }

  private async synchronizeIssueLabel(
    context: IProjectContext,
    workItem: IWorkItem,
    label: 'critical-path' | 'grouped-delivery',
    active: boolean,
  ): Promise<void> {
    const issueNumber = issueNumberFromExternalId(workItem.externalId);
    if (!issueNumber) return;
    const endpoint = `repos/${repositoryPath(workItem.repository)}/issues/${issueNumber}/labels`;
    if (active) {
      await this.githubApi(context, 'POST', endpoint, { labels: [label] });
      return;
    }
    try {
      await this.githubApi(context, 'DELETE', `${endpoint}/${encodeURIComponent(label)}`);
    } catch (cause) {
      if (!isGitHubNotFound(cause)) throw cause;
    }
  }

  private async upsertIssueMarker(
    context: IProjectContext,
    workItem: IWorkItem,
    marker: string,
    body: string,
  ): Promise<void> {
    const issueNumber = issueNumberFromExternalId(workItem.externalId);
    if (!issueNumber) return;
    const comments = await this.loadRepositoryPages<IRepositoryCommentDocument>(
      context,
      `repos/${repositoryPath(workItem.repository)}/issues/${issueNumber}/comments?per_page=100`,
    );
    const existing = comments.find((comment) => comment.body?.includes(marker));
    if (existing?.id) {
      await this.githubApi(
        context,
        'PATCH',
        `repos/${repositoryPath(workItem.repository)}/issues/comments/${existing.id}`,
        { body },
      );
      return;
    }
    await this.githubApi(
      context,
      'POST',
      `repos/${repositoryPath(workItem.repository)}/issues/${issueNumber}/comments`,
      { body },
    );
  }

  // #endregion
}

interface IGitReferenceDocument {
  readonly ref?: string;
  readonly object?: { readonly sha?: string };
}

interface IProjectSchemaResponse {
  readonly data?: {
    readonly node?: {
      readonly fields?: {
        readonly pageInfo?: IConnectionPageInfo;
        readonly nodes?: readonly IProjectFieldNode[];
      };
    };
    readonly rateLimit?: IGitHubRateLimitSnapshot;
  };
  readonly errors?: readonly { readonly message?: string }[];
}

interface IProjectItemsResponse {
  readonly data?: {
    readonly node?: {
      readonly items?: {
        readonly pageInfo?: IConnectionPageInfo;
        readonly nodes?: readonly IProjectItemNode[];
      };
    };
    readonly rateLimit?: IGitHubRateLimitSnapshot;
  };
  readonly errors?: readonly { readonly message?: string }[];
}

interface IProjectItemResponse {
  readonly data?: {
    readonly node?: IProjectItemNode | null;
    readonly rateLimit?: IGitHubRateLimitSnapshot;
  };
  readonly errors?: readonly { readonly message?: string }[];
}

interface IProjectFieldMutationResponse {
  readonly data?: {
    readonly updateProjectV2ItemFieldValue?: {
      readonly projectV2Item?: IProjectItemNode | null;
    } | null;
    readonly clearProjectV2ItemFieldValue?: {
      readonly projectV2Item?: IProjectItemNode | null;
    } | null;
  };
  readonly errors?: readonly { readonly message?: string }[];
}

interface IProjectIdentityResponse {
  readonly data?: {
    readonly organization?: { readonly projectV2?: { readonly id?: string } | null } | null;
    readonly user?: { readonly projectV2?: { readonly id?: string } | null } | null;
    readonly rateLimit?: IGitHubRateLimitSnapshot;
  };
  readonly errors?: readonly { readonly message?: string }[];
}

interface IAccountProjectListResponse {
  readonly data?: {
    readonly viewer?: {
      readonly login?: string;
      readonly projectsV2?: IProjectListConnection;
    } | null;
    readonly rateLimit?: IGitHubRateLimitSnapshot;
  };
  readonly errors?: readonly { readonly message?: string }[];
}

interface IOwnerProjectListResponse {
  readonly data?: {
    readonly organization?: { readonly projectsV2?: IProjectListConnection } | null;
    readonly user?: { readonly projectsV2?: IProjectListConnection } | null;
    readonly rateLimit?: IGitHubRateLimitSnapshot;
  };
  readonly errors?: readonly { readonly message?: string }[];
}

interface IRepositoryProjectListResponse {
  readonly data?: {
    readonly repository?: { readonly projectsV2?: IProjectListConnection } | null;
    readonly rateLimit?: IGitHubRateLimitSnapshot;
  };
  readonly errors?: readonly { readonly message?: string }[];
}

interface IIssueDetailResponse {
  readonly data?: {
    readonly repository?: {
      readonly issueOrPullRequest?: IIssueDetailIssue | null;
    } | null;
    readonly rateLimit?: IGitHubRateLimitSnapshot;
  };
  readonly errors?: readonly { readonly message?: string }[];
}

interface IIssueCommentsResponse {
  readonly data?: {
    readonly repository?: {
      readonly issueOrPullRequest?: { readonly comments?: IIssueCommentConnection } | null;
    } | null;
    readonly rateLimit?: IGitHubRateLimitSnapshot;
  };
  readonly errors?: readonly { readonly message?: string }[];
}

interface IProjectItemFieldValuesResponse {
  readonly data?: {
    readonly node?: {
      readonly fieldValues?: {
        readonly pageInfo?: IConnectionPageInfo;
        readonly nodes?: readonly IProjectFieldValueNode[];
      };
    };
    readonly rateLimit?: IGitHubRateLimitSnapshot;
  };
  readonly errors?: readonly { readonly message?: string }[];
}

interface IIssueLabelsResponse {
  readonly data?: {
    readonly node?: { readonly labels?: ILabelConnection };
    readonly rateLimit?: IGitHubRateLimitSnapshot;
  };
  readonly errors?: readonly { readonly message?: string }[];
}

interface IIssueAssigneesResponse {
  readonly data?: {
    readonly node?: { readonly assignees?: IAssigneeConnection };
    readonly rateLimit?: IGitHubRateLimitSnapshot;
  };
  readonly errors?: readonly { readonly message?: string }[];
}

interface IAssigneeDocument {
  readonly login?: string;
  readonly name?: string | null;
  readonly avatar_url?: string;
}

interface ILabelDocument {
  readonly name?: string;
  readonly color?: string;
  readonly description?: string | null;
}

interface IIssueAutomationResponse {
  readonly data?: {
    readonly repository?: {
      readonly issue?: IIssueAutomationIssue | null;
    } | null;
    readonly rateLimit?: IGitHubRateLimitSnapshot;
  };
  readonly errors?: readonly { readonly message?: string }[];
}

interface IRepositoryIssueDocument {
  readonly number?: number;
}

interface IRepositoryCommentDocument {
  readonly id?: number;
  readonly body?: string;
  readonly created_at?: string;
  readonly updated_at?: string;
  readonly issue_url?: string;
  readonly html_url?: string;
  readonly user?: { readonly login?: string; readonly avatar_url?: string } | null;
}

function parseProjectItems(
  input: string,
  source: GitHubProjectSource,
  fields: readonly ProjectFieldDefinition[],
  values: ReadonlyMap<string, readonly ProjectFieldValue[]>,
  settings: IApplicationSettings,
): readonly IWorkItem[] {
  const document = JSON.parse(input) as IProjectItemListDocument;
  const fallbackRepository = settings.repositoryBindings.find(
    (binding) => binding.enabled && binding.workspaceId === source.workspaceId,
  );
  return (document.items ?? []).map((item) => {
    const content = item.content;
    const projectFields = values.get(item.id) ?? [];
    const statusField = fields.find((field) => field.role === 'workflow-state');
    const statusValue = statusField
      ? projectFields.find((value) => value.fieldId === statusField.id)
      : undefined;
    const assistanceField = fields.find((field) => field.role === 'assistance-action');
    const assistanceValue = assistanceField
      ? projectFields.find((value) => value.fieldId === assistanceField.id)
      : undefined;
    const stage =
      statusField?.type === 'single-select' && statusValue?.type === 'single-select'
        ? statusField.options.find((option) => option.id === statusValue.value)?.stageId
        : undefined;
    const assistanceAction =
      assistanceField?.type === 'single-select' && assistanceValue?.type === 'single-select'
        ? assistanceField.options.find((option) => option.id === assistanceValue.value)
            ?.assistanceAction
        : undefined;
    const providerRepository =
      content?.repository ??
      (fallbackRepository ? `${fallbackRepository.owner}/${fallbackRepository.name}` : '');
    const repositoryBinding = settings.repositoryBindings.find(
      (binding) =>
        binding.workspaceId === source.workspaceId &&
        sameGitHubRepository(`${binding.owner}/${binding.name}`, providerRepository),
    );
    const repository = repositoryBinding
      ? `${repositoryBinding.owner}/${repositoryBinding.name}`
      : providerRepository;
    const repositoryBindingIds = settings.repositoryBindings
      .filter(
        (binding) =>
          binding.workspaceId === source.workspaceId &&
          sameGitHubRepository(`${binding.owner}/${binding.name}`, repository),
      )
      .map((binding) => binding.id);
    return {
      id: item.id,
      workspaceId: source.workspaceId,
      sourceId: source.id,
      externalId: content?.number ? `#${content.number}` : item.id,
      ...(content?.url ? { externalUrl: content.url } : {}),
      title: content?.title ?? item.title ?? 'Untitled project item',
      body: content?.body ?? '',
      detailState: 'summary',
      bodyFormat: 'markdown',
      ...(stage ? { stageId: stage } : {}),
      ...(statusValue?.type === 'single-select' && statusValue.value
        ? { boardColumnId: statusValue.value }
        : {}),
      provider: 'github-projects',
      repository,
      repositoryBindingIds,
      projectFields,
      ...(assistanceAction ? { assistanceAction } : {}),
      labels: [...(item.labels ?? [])],
      assignees: (item.assignees ?? []).map((login) => ({ login })),
      ...(content?.createdAt ? { createdAt: content.createdAt } : {}),
      ...(content?.updatedAt ? { updatedAt: content.updatedAt } : {}),
    };
  });
}

function projectFieldDefinition(
  node: IProjectFieldNode,
  columnMappings: readonly IBoardColumnMapping[] = [],
): readonly ProjectFieldDefinition[] {
  if (!node.id || !node.name) return [];
  const normalizedName = node.name.trim().toLocaleLowerCase();
  const base = {
    id: node.id,
    name: node.name,
    role:
      normalizedName === 'status'
        ? ('workflow-state' as const)
        : normalizedName === 'assistant phase' || normalizedName === 'assistance phase'
          ? ('assistance-action' as const)
          : ('custom' as const),
  };
  if (node.__typename === 'ProjectV2SingleSelectField') {
    return [
      {
        ...base,
        type: 'single-select',
        options: (node.options ?? []).flatMap((option) =>
          option.id && option.name
            ? [
                {
                  id: option.id,
                  label: option.name,
                  ...(option.description ? { description: option.description } : {}),
                  ...(option.color ? { color: option.color } : {}),
                  ...(base.role === 'workflow-state' &&
                  projectStatusStage(option.id, columnMappings)
                    ? { stageId: projectStatusStage(option.id, columnMappings)! }
                    : {}),
                  ...(base.role === 'assistance-action' && assistanceAction(option.name)
                    ? { assistanceAction: assistanceAction(option.name)! }
                    : {}),
                },
              ]
            : [],
        ),
      },
    ];
  }
  if (node.__typename === 'ProjectV2MultiSelectField') {
    return [
      {
        ...base,
        type: 'multi-select',
        options: (node.options ?? []).flatMap((option) =>
          option.id && option.name
            ? [
                {
                  id: option.id,
                  label: option.name,
                  ...(option.description ? { description: option.description } : {}),
                  ...(option.color ? { color: option.color } : {}),
                },
              ]
            : [],
        ),
      },
    ];
  }
  if (node.__typename === 'ProjectV2IterationField') {
    const iterations = [
      ...(node.configuration?.iterations ?? []),
      ...(node.configuration?.completedIterations ?? []),
    ];
    return [
      {
        ...base,
        type: 'iteration',
        options: iterations.flatMap((iteration) =>
          iteration.id && iteration.title
            ? [
                {
                  id: iteration.id,
                  label: iteration.title,
                  ...(iteration.startDate ? { startDate: iteration.startDate } : {}),
                  ...(iteration.duration !== undefined ? { duration: iteration.duration } : {}),
                },
              ]
            : [],
        ),
      },
    ];
  }
  if (node.__typename === 'ProjectV2Field' && node.dataType === 'TEXT')
    return [{ ...base, type: 'text' }];
  if (node.__typename === 'ProjectV2Field' && node.dataType === 'NUMBER')
    return [{ ...base, type: 'number' }];
  if (node.__typename === 'ProjectV2Field' && node.dataType === 'DATE')
    return [{ ...base, type: 'date' }];
  return [];
}

function projectFieldValue(node: IProjectFieldValueNode): readonly ProjectFieldValue[] {
  const fieldId = node.field?.id;
  if (!fieldId) return [];
  switch (node.__typename) {
    case 'ProjectV2ItemFieldTextValue':
      return [{ fieldId, type: 'text', value: node.text ?? '' }];
    case 'ProjectV2ItemFieldNumberValue':
      return [{ fieldId, type: 'number', value: node.number ?? null }];
    case 'ProjectV2ItemFieldDateValue':
      return [{ fieldId, type: 'date', value: node.date ?? '' }];
    case 'ProjectV2ItemFieldSingleSelectValue':
      return [{ fieldId, type: 'single-select', value: node.optionId ?? null }];
    case 'ProjectV2ItemFieldMultiSelectValue':
      return [
        {
          fieldId,
          type: 'multi-select',
          value: (node.options ?? []).flatMap((option) => (option.id ? [option.id] : [])),
        },
      ];
    case 'ProjectV2ItemFieldIterationValue':
      return [{ fieldId, type: 'iteration', value: node.iterationId ?? null }];
    default:
      return [];
  }
}

function statusColumns(context: IProjectContext): readonly IBoardColumn[] {
  return context.fields
    .filter(
      (field): field is Extract<ProjectFieldDefinition, { type: 'single-select' }> =>
        field.role === 'workflow-state' && field.type === 'single-select',
    )
    .flatMap((field) =>
      field.options.map((option) => ({
        id: option.id,
        label: option.label,
        sourceId: context.source.id,
        ...(option.stageId ? { stageId: option.stageId } : {}),
      })),
    );
}

function projectOwnerType(
  typename: string | undefined,
): GitHubProjectSource['ownerType'] | undefined {
  if (typename === 'Organization') return 'organization';
  if (typename === 'User') return 'user';
  return undefined;
}

function assertGraphql(response: {
  readonly errors?: readonly { readonly message?: string }[];
}): void {
  if (response.errors?.length) {
    throw new Error(
      response.errors.map((error) => error.message ?? 'GitHub GraphQL error').join('; '),
    );
  }
}

function parseAutomationCommand(
  body: string,
): { readonly action: AutomationAction; readonly request?: string } | undefined {
  const match = /^\s*(?:\/symphony|@symphony)\b\s*([\s\S]*)$/iu.exec(body);
  if (!match) return undefined;
  const instruction = (match[1] ?? '').trim();
  const command =
    /^(analyze|analyse|analysiere|solve|fix|revise|implement|retry|repeat|nochmal|erneut|rerun-ci|ci\s+rerun|ci\s+erneut)\b\s*([\s\S]*)$/iu.exec(
      instruction,
    );
  if (!command) {
    return instruction
      ? { action: 'synchronize', request: boundedRequest(instruction) }
      : { action: 'synchronize' };
  }
  const name = command[1]!.toLowerCase();
  const request = boundedRequest((command[2] ?? '').trim());
  const action: AutomationAction = /^(analy|analyse|analysiere)/u.test(name)
    ? 'analyze'
    : /^(retry|repeat|nochmal|erneut)$/u.test(name)
      ? 'retry'
      : /^(rerun-ci|ci\s+)/u.test(name)
        ? 'rerun-ci'
        : 'solve';
  return { action, ...(request ? { request } : {}) };
}

function repositoryPath(repository: string): string {
  const [owner, name] = repository.split('/');
  if (!owner || !name) throw new Error(`Invalid GitHub repository: ${repository}`);
  return `${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

function claimCommitMessage(workItem: IWorkItem, record: IClaimRecord): string {
  // GitHub turns an issue reference in any commit message into a timeline entry on that issue,
  // so `#141` here would post the whole lease history to the work item. The bare number does
  // not link, which keeps the claim history out of the work item conversation.
  const reference = workItem.externalId.replace(/^#/u, '');
  return [
    `Symphony claim for ${workItem.repository} work item ${reference}`,
    '',
    `Owner: ${record.owner}`,
    `Action: ${record.action}`,
    `Execution: ${record.executionId}`,
    `Project item: ${workItem.id}`,
    `Lease-Until: ${record.leaseUntil}`,
    `Heartbeat: ${record.heartbeatAt}`,
    `Claim-Version: ${record.claimVersion}`,
  ].join('\n');
}

function parseClaimCommitMessage(
  message: string | undefined,
): Partial<IClaimRecord> & { readonly projectItemId?: string } {
  if (!message) return {};
  const field = (name: string): string | undefined =>
    message.match(new RegExp(`^${name}:\\s*(.+)$`, 'imu'))?.[1]?.trim();
  const claimVersion = Number.parseInt(field('Claim-Version') ?? '', 10);
  return {
    ...(field('Owner') ? { owner: field('Owner')! } : {}),
    ...(field('Project item') ? { projectItemId: field('Project item')! } : {}),
    ...(field('Execution') ? { executionId: field('Execution')! } : {}),
    ...(field('Lease-Until') ? { leaseUntil: field('Lease-Until')! } : {}),
    ...(field('Heartbeat') ? { heartbeatAt: field('Heartbeat')! } : {}),
    ...(Number.isFinite(claimVersion) ? { claimVersion } : {}),
  };
}

function claimReference(workItem: IWorkItem): string {
  const digest = createHash('sha256')
    .update(`${workItem.provider}\0${workItem.repository}\0${workItem.externalId}`)
    .digest('hex')
    .slice(0, 40);
  return `refs/${claimReferenceRoot}/${digest}`;
}

function parseClaimId(id: string): { readonly reference: string; readonly sha: string } {
  const separator = id.lastIndexOf('@');
  const reference = id.slice(0, separator);
  const sha = id.slice(separator + 1);
  if (
    separator <= 0 ||
    !reference.startsWith(`refs/${claimReferenceRoot}/`) ||
    !/^[0-9a-f]+$/u.test(sha)
  ) {
    throw new Error('The distributed work-item claim is malformed.');
  }
  return { reference, sha };
}

function projectFieldMutation(type: ProjectFieldValue['type']): string {
  const definitions: Record<ProjectFieldValue['type'], readonly [string, string]> = {
    text: ['String!', 'text'],
    number: ['Float!', 'number'],
    date: ['Date!', 'date'],
    'single-select': ['String!', 'singleSelectOptionId'],
    'multi-select': ['[String!]!', 'multiSelectOptionIds'],
    iteration: ['String!', 'iterationId'],
  };
  const [variableType, inputField] = definitions[type];
  return `mutation UpdateProjectField($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ${variableType}) {
    updateProjectV2ItemFieldValue(input: {projectId: $projectId, itemId: $itemId, fieldId: $fieldId, value: {${inputField}: $value}}) {
      projectV2Item { ${projectItemSelection} }
    }
  }`;
}

const accountProjectsQuery = `query AccountProjects($cursor: String) {
  viewer { login ${projectListSelection} }
  rateLimit { cost limit remaining resetAt }
}`;

const repositoryProjectsQuery = `query RepositoryProjects($owner: String!, $name: String!, $cursor: String) {
  repository(owner: $owner, name: $name) { ${projectListSelection} }
  rateLimit { cost limit remaining resetAt }
}`;

function ownerProjectsQuery(ownerType: GitHubProjectSource['ownerType']): string {
  const ownerField = ownerType === 'organization' ? 'organization' : 'user';
  return `query OwnerProjects($owner: String!, $cursor: String) {
  ${ownerField}(login: $owner) { ${projectListSelection} }
  rateLimit { cost limit remaining resetAt }
}`;
}

function projectIdentityQuery(ownerType: GitHubProjectSource['ownerType']): string {
  const ownerField = ownerType === 'organization' ? 'organization' : 'user';
  return `query ProjectIdentity($owner: String!, $number: Int!) {
    ${ownerField}(login: $owner) { projectV2(number: $number) { id } }
    rateLimit { cost limit remaining resetAt }
  }`;
}

const projectFieldQuery = `query ProjectFields($projectId: ID!, $cursor: String) {
  node(id: $projectId) {
    ... on ProjectV2 {
      fields(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          __typename
          ... on ProjectV2Field { id name dataType }
          ... on ProjectV2SingleSelectField { id name dataType options { id name description color } }
          ... on ProjectV2MultiSelectField { id name dataType options: multiSelectOptions { id name description color } }
          ... on ProjectV2IterationField {
            id name dataType
            configuration {
              iterations { id title startDate duration }
              completedIterations { id title startDate duration }
            }
          }
        }
      }
    }
  }
  rateLimit { cost limit remaining resetAt }
}`;

// POSITION is the project's manual order - the one drag and drop on the GitHub board writes.
// It is the schema default, but it is named explicitly because the board's entire ordering
// contract rests on it: the item sequence of this query is the only ordering GitHub exposes
// (ProjectV2Item carries no position field), and the renderer preserves it end to end.
const projectItemsQuery = `query ProjectBoardItems($projectId: ID!, $cursor: String) {
  node(id: $projectId) {
    ... on ProjectV2 {
      items(first: 100, after: $cursor, orderBy: {field: POSITION, direction: ASC}) {
        pageInfo { hasNextPage endCursor }
        nodes { ${projectItemSelection} }
      }
    }
  }
  rateLimit { cost limit remaining resetAt }
}`;

const projectItemQuery = `query ProjectBoardItem($itemId: ID!) {
  node(id: $itemId) {
    ... on ProjectV2Item { ${projectItemSelection} }
  }
  rateLimit { cost limit remaining resetAt }
}`;

const clearProjectFieldMutation = `mutation ClearProjectField($projectId: ID!, $itemId: ID!, $fieldId: ID!) {
  clearProjectV2ItemFieldValue(input: {projectId: $projectId, itemId: $itemId, fieldId: $fieldId}) {
    projectV2Item { ${projectItemSelection} }
  }
}`;

const projectItemFieldValuesQuery = `query ProjectItemFieldValues($itemId: ID!, $cursor: String!) {
  node(id: $itemId) {
    ... on ProjectV2Item {
      fieldValues(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes { ${projectFieldValueSelection} }
      }
    }
  }
  rateLimit { cost limit remaining resetAt }
}`;

const issueLabelsQuery = `query IssueLabels($contentId: ID!, $cursor: String!) {
  node(id: $contentId) {
    ... on Issue { labels(first: 100, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { name } } }
    ... on PullRequest { labels(first: 100, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { name } } }
  }
  rateLimit { cost limit remaining resetAt }
}`;

const issueAssigneesQuery = `query IssueAssignees($contentId: ID!, $cursor: String!) {
  node(id: $contentId) {
    ... on DraftIssue { assignees(first: 100, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { login } } }
    ... on Issue { assignees(first: 100, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { login } } }
    ... on PullRequest { assignees(first: 100, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { login } } }
  }
  rateLimit { cost limit remaining resetAt }
}`;

const issueDetailQuery = `query IssueDetail($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issueOrPullRequest(number: $number) {
      ... on Issue { title body createdAt updatedAt ${issueCommentSelection} }
      ... on PullRequest { title body createdAt updatedAt ${issueCommentSelection} }
    }
  }
  rateLimit { cost limit remaining resetAt }
}`;

const issueCommentsQuery = `query IssueComments($owner: String!, $name: String!, $number: Int!, $cursor: String!) {
  repository(owner: $owner, name: $name) {
    issueOrPullRequest(number: $number) {
      ... on Issue { ${issueCommentSelection.replace('comments(first: 100)', 'comments(first: 100, after: $cursor)')} }
      ... on PullRequest { ${issueCommentSelection.replace('comments(first: 100)', 'comments(first: 100, after: $cursor)')} }
    }
  }
  rateLimit { cost limit remaining resetAt }
}`;

const issueAutomationContentQuery = `query IssueAutomationContent($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      title
      body
      createdAt
      updatedAt
      lastEditedAt
      author { login }
      userContentEdits(last: 1) {
        nodes { editedAt editor { login } }
      }
    }
  }
  rateLimit { cost limit remaining resetAt }
}`;

function issueNumberFromExternalId(externalId: string): number | undefined {
  const match = /^#(\d+)$/u.exec(externalId.trim());
  const issueNumber = Number(match?.[1]);
  return Number.isInteger(issueNumber) ? issueNumber : undefined;
}

/**
 * Renders a note as one comment body: the headline, the labelled details, then the report.
 *
 * GitHub rejects a comment longer than its body limit, and a rejected comment would lose the
 * whole result, so an oversized report is cut with a visible marker instead. The complete text
 * stays in Symphony either way.
 */
function commentBody(note: IWorkItemNote): string {
  const details = (note.details ?? []).map(
    (detail) =>
      `- **${detail.label}:** ${detail.url ? `[${detail.value}](${detail.url})` : `\`${detail.value}\``}`,
  );
  const header = `## ${note.heading}\n\n${details.length ? `${details.join('\n')}\n\n` : ''}`;
  const body = note.body.trim();
  const available = githubCommentBodyLimit - header.length;
  if (body.length <= available) return `${header}${body}`;
  return `${header}${body.slice(0, available - commentTruncationNotice.length)}${commentTruncationNotice}`;
}

function issueNumberFromUrl(url: string | undefined): number | undefined {
  const match = /\/issues\/(\d+)(?:$|[?#])/u.exec(url ?? '');
  const issueNumber = Number(match?.[1]);
  return Number.isInteger(issueNumber) ? issueNumber : undefined;
}

/**
 * Maps one GraphQL comment node to the provider-neutral comment. A node without a body or a
 * creation instant is not a comment Symphony can show or reason about, so it is dropped.
 */
function parseIssueComment(node: IIssueCommentNode): IWorkItemComment | undefined {
  const id =
    node.databaseId !== undefined && node.databaseId !== null ? String(node.databaseId) : node.id;
  if (!id || typeof node.body !== 'string' || !node.createdAt) return undefined;
  const login = node.author?.login;
  return {
    id,
    ...(login
      ? {
          author: {
            login,
            ...(node.author?.avatarUrl ? { avatarUrl: node.author.avatarUrl } : {}),
          },
        }
      : {}),
    body: node.body,
    bodyFormat: 'markdown',
    createdAt: node.createdAt,
    ...(node.updatedAt ? { updatedAt: node.updatedAt } : {}),
    ...(node.url ? { url: node.url } : {}),
  };
}

/**
 * Maps the REST answer of a written comment to the provider-neutral comment. The write already
 * succeeded when this runs, so a field GitHub leaves out must not discard the comment: the body
 * that was sent and the moment of the write stand in for it.
 */
function writtenComment(
  document: IRepositoryCommentDocument | undefined,
  body: string,
  writtenAt: string,
): IWorkItemComment {
  const login = document?.user?.login;
  const avatarUrl = document?.user?.avatar_url;
  return {
    id: document?.id !== undefined ? String(document.id) : `comment-${writtenAt}`,
    ...(login ? { author: { login, ...(avatarUrl ? { avatarUrl } : {}) } } : {}),
    body: document?.body ?? body,
    bodyFormat: 'markdown',
    createdAt: document?.created_at ?? writtenAt,
    ...(document?.updated_at ? { updatedAt: document.updated_at } : {}),
    ...(document?.html_url ? { url: document.html_url } : {}),
  };
}

function nextCursor(
  pageInfo: IConnectionPageInfo | undefined,
  seen: Set<string>,
  connectionName: string,
): string | undefined {
  if (!pageInfo?.hasNextPage) return undefined;
  const cursor = pageInfo.endCursor ?? undefined;
  if (!cursor) throw new Error(`${connectionName} pagination returned no cursor.`);
  if (seen.has(cursor)) throw new Error(`${connectionName} pagination repeated a cursor.`);
  seen.add(cursor);
  return cursor;
}

function deliveryGroupComment(group: IDeliveryGroup, workItems: readonly IWorkItem[]): string {
  const root = workItems.find((item) => item.id === group.rootWorkItemId);
  const members = workItems
    .map(
      (item) =>
        `- ${item.externalUrl ? `[${item.externalId}](${item.externalUrl})` : item.externalId} — ${item.title}`,
    )
    .join('\n');
  const pullRequest = group.pullRequest
    ? `\n- Shared pull request: [#${group.pullRequest.number}](${group.pullRequest.externalUrl})`
    : '';
  return [
    `<!-- symphony:delivery-group:${group.id} -->`,
    '### Grouped delivery',
    '',
    `- Root: ${root?.externalUrl ? `[${root.externalId}](${root.externalUrl})` : (root?.externalId ?? group.rootWorkItemId)}`,
    `- Status: ${group.state}${pullRequest}`,
    '- Members:',
    members,
    '',
    'Symphony updates this marker instead of adding a second status comment.',
  ].join('\n');
}

function criticalPathComment(
  proposal: IDeliveryGroupProposal,
  workItems: readonly IWorkItem[],
): string {
  const members = workItems
    .map(
      (item) =>
        `- ${item.externalUrl ? `[${item.externalId}](${item.externalUrl})` : item.externalId} — ${item.title}`,
    )
    .join('\n');
  const surfaces = proposal.assessment.sharedChangeSurface
    .map((path) => `- \`${path}\``)
    .join('\n');
  return [
    `<!-- symphony:critical-path:${proposal.id} -->`,
    '### Critical path',
    '',
    `- Relationship: ${proposal.assessment.relation}`,
    `- Status: ${proposal.state}`,
    '- Affected tickets:',
    members,
    '- Shared change surface:',
    surfaces || '- No repository path was retained.',
    '',
    proposal.state === 'open'
      ? 'Review these tickets together before moving them into implementation. Joint delivery is available only when their criteria and verification are compatible.'
      : 'This relationship review is no longer active.',
  ].join('\n');
}

/**
 * Recognizes the answer GitHub gives for a resource that is not there.
 *
 * The CLI reports it as plain text on standard error, so the status has to be read back out of
 * the message - and only the status may decide it: `gh: command not found` says the very
 * opposite of "the resource is absent", and must never be mistaken for it.
 */
function isGitHubNotFound(cause: unknown): boolean {
  return /HTTP(?: status)? 404\b/iu.test(errorMessage(cause));
}

function isGitHubRateLimitFailure(cause: unknown): boolean {
  return /rate limit|secondary rate|abuse detection/iu.test(errorMessage(cause));
}

function runGitHubCommand(
  args: readonly string[],
  environment: NodeJS.ProcessEnv,
  standardInput?: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(resolveAllowedCommand('gh', environment), [...args], {
      env: environment,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    child.stdin.end(standardInput);
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('GitHub request timed out.'));
    }, 60_000);
    child.stdout.on('data', (chunk: Buffer) => {
      if (stdout.length < 16_777_216) stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length < 262_144) stderr += chunk.toString();
    });
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(stdout.trim());
      else reject(new Error((stderr || stdout || `gh exited with code ${code}`).trim()));
    });
  });
}

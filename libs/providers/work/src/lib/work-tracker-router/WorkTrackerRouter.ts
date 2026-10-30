// #region Imports

import type { IWorkItemCoordinationPort } from '@symphony/application-work';
import type { IWorkTrackingPort } from '../IWorkTrackingPort';
import type { ClosureReasonCode, WorkflowStageId } from '@symphony/domain-workflow';
import type {
  IAutomationReceipt,
  IAutomationSignal,
  IAutomationSourceCheckpoint,
} from '@symphony/domain-automation';
import type {
  IBoardColumn,
  IBoardColumnCandidate,
  IWorkItem,
  IWorkItemClaim,
  IWorkItemComment,
  IWorkItemEditorMetadata,
  IWorkItemMutation,
  IWorkItemNote,
  WorkItemClaimAcquisition,
  WorkItemSource,
} from '@symphony/domain-work';
import type { IDeliveryGroup, IDeliveryGroupProposal } from '@symphony/domain-execution';
import type { IWorkTrackerRouterOptions } from './IWorkTrackerRouterOptions';

// #endregion

export class WorkTrackerRouter implements IWorkTrackingPort, IWorkItemCoordinationPort {
  // #region Fields

  private readonly _providerByItemId = new Map<
    string,
    IWorkTrackingPort & Partial<IWorkItemCoordinationPort>
  >();

  /**
   * Provider of every work item this orchestrator currently holds a claim on.
   *
   * `providerByItemId` is rebuilt from each board listing, so an item the current listing does
   * not return - a changed view scope, a disabled source, a board query that no longer matches -
   * disappears from it while a run on that item is still going. Coordination for a live claim
   * must not depend on that: without this registry the lease renewal of a running execution
   * suddenly reports "no coordination support", and the run is ended although nothing about its
   * ownership changed.
   */
  private readonly _providerByClaimedItemId = new Map<
    string,
    IWorkTrackingPort & Partial<IWorkItemCoordinationPort>
  >();

  // #endregion

  // #region Ctor

  public constructor(private readonly _options: IWorkTrackerRouterOptions) {}

  // #endregion

  // #region Methods

  /**
   * Lists the work items.
   *
   * @public
   */
  public async listWorkItems(): Promise<readonly IWorkItem[]> {
    const providers = this.activeProviders();
    const groups = await Promise.all(providers.map((provider) => provider.listWorkItems()));
    this._providerByItemId.clear();
    groups.forEach((items, index) => {
      const provider = providers[index]!;
      items.forEach((item) => this._providerByItemId.set(item.id, provider));
    });
    return groups.flat();
  }

  /**
   * Loads the work item details.
   *
   * @param workItem - Work item.
   * @public
   */
  public loadWorkItemDetails(workItem: IWorkItem): Promise<IWorkItem> {
    const provider =
      this._providerByItemId.get(workItem.id) ??
      this.resolveProvider(workItem.sourceId, workItem.workspaceId, workItem.repository);
    // A provider without details has no discussion either: an empty thread says so, whereas a
    // missing one would read as "not loaded yet".
    return (
      provider.loadWorkItemDetails?.(workItem) ??
      Promise.resolve({ ...workItem, detailState: 'complete', comments: [] })
    );
  }

  /**
   * Lists the automation work items.
   *
   * @public
   */
  public async listAutomationWorkItems(): Promise<readonly IWorkItem[]> {
    const providers = this.automationProviders();
    const groups = await Promise.all(providers.map((provider) => provider.listWorkItems()));
    groups.forEach((items, index) => {
      const provider = providers[index]!;
      items.forEach((item) => this._providerByItemId.set(item.id, provider));
    });
    return groups.flat();
  }

  /**
   * Lists the board columns.
   *
   * @public
   */
  public async listBoardColumns(): Promise<readonly IBoardColumn[]> {
    const columns = (
      await Promise.all(
        this.activeProviders().flatMap((provider) =>
          provider.listBoardColumns ? [provider.listBoardColumns()] : [],
        ),
      )
    ).flat();
    return columns.filter(
      (column, index) =>
        columns.findIndex(
          (candidate) => candidate.id === column.id && candidate.sourceId === column.sourceId,
        ) === index,
    );
  }

  /**
   * Lists the source columns.
   *
   * @param source - Source.
   * @public
   */
  public listSourceColumns(source: WorkItemSource): Promise<readonly IBoardColumnCandidate[]> {
    if (source.provider === 'simulated') {
      throw new Error('The simulated work-item source is handled outside the provider router.');
    }
    const provider = this._options.providers[source.provider];
    if (!provider.listSourceColumns) {
      throw new Error(`The ${source.provider} tracker cannot read board columns.`);
    }
    return provider.listSourceColumns(source);
  }

  /**
   * Lists the project fields.
   *
   * @public
   */
  public async listProjectFields(): Promise<IWorkItemEditorMetadata['projectFields']> {
    const fields = (
      await Promise.all(
        this.activeProviders().flatMap((provider) =>
          provider.listProjectFields ? [provider.listProjectFields()] : [],
        ),
      )
    ).flat();
    return fields.filter(
      (field, index) => fields.findIndex((candidate) => candidate.id === field.id) === index,
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
  public listEditorMetadata(
    repository?: string,
    workspaceId?: string,
    sourceId?: string,
  ): Promise<IWorkItemEditorMetadata> {
    return this.resolveProvider(sourceId, workspaceId, repository).listEditorMetadata(
      repository,
      workspaceId,
      sourceId,
    );
  }

  /**
   * Creates the work item.
   *
   * @param input - Input.
   * @public
   */
  public createWorkItem(input: IWorkItemMutation): Promise<IWorkItem> {
    return this.resolveProvider(input.sourceId, input.workspaceId, input.repository).createWorkItem(
      input,
    );
  }

  /**
   * Updates the work item.
   *
   * @param workItemId - Work item id.
   * @param input - Input.
   * @public
   */
  public updateWorkItem(workItemId: string, input: IWorkItemMutation): Promise<IWorkItem> {
    const provider =
      this._providerByItemId.get(workItemId) ??
      this.resolveProvider(input.sourceId, input.workspaceId, input.repository);
    return provider.updateWorkItem(workItemId, input);
  }

  /**
   * Returns the transition.
   *
   * @param workItemId - Work item id.
   * @param state - State.
   * @public
   */
  public transition(workItemId: string, state: WorkflowStageId): Promise<IWorkItem> {
    const provider = this._providerByItemId.get(workItemId);
    if (!provider) throw new Error(`Refresh the work item before changing it: ${workItemId}`);
    return provider.transition(workItemId, state);
  }

  /**
   * A provider that cannot close an item reports it, so the engine can say so in the audit.
   *
   * @param workItemId - Work item id.
   * @param reason - Reason.
   * @public
   */
  public closeWorkItem(workItemId: string, reason: ClosureReasonCode): Promise<IWorkItem> {
    const provider = this._providerByItemId.get(workItemId);
    if (!provider) throw new Error(`Refresh the work item before changing it: ${workItemId}`);
    if (!provider.closeWorkItem) {
      throw new Error('This work tracker cannot close work items from Symphony.');
    }
    return provider.closeWorkItem(workItemId, reason);
  }

  /**
   * Moves the to column.
   *
   * @param workItemId - Work item id.
   * @param boardColumnId - Board column id.
   * @public
   */
  public moveToColumn(workItemId: string, boardColumnId: string): Promise<IWorkItem> {
    const provider = this._providerByItemId.get(workItemId);
    if (!provider) throw new Error(`Refresh the work item before changing it: ${workItemId}`);
    return provider.moveToColumn(workItemId, boardColumnId);
  }

  /**
   * Routes an operator comment to the provider that owns the item.
   *
   * A Symphony note may be skipped where a provider carries none; text a person wrote may not.
   * A provider without a discussion therefore reports it, and the drawer can say so instead of
   * losing the comment.
   *
   * @param workItemId - Work item id.
   * @param body - Body.
   * @public
   */
  public createWorkItemComment(workItemId: string, body: string): Promise<IWorkItemComment> {
    const provider = this._providerByItemId.get(workItemId);
    if (!provider) throw new Error(`Refresh the work item before changing it: ${workItemId}`);
    if (!provider.createWorkItemComment) {
      throw new Error('This work-item provider does not carry comments.');
    }
    return provider.createWorkItemComment(workItemId, body);
  }

  /**
   * Routes a note to the provider that owns the item; a provider without notes silently skips it.
   *
   * @param workItem - Work item.
   * @param note - Note.
   * @public
   */
  public publishWorkItemNote(workItem: IWorkItem, note: IWorkItemNote): Promise<void> {
    const provider =
      this._providerByItemId.get(workItem.id) ??
      this.resolveProvider(workItem.sourceId, workItem.workspaceId, workItem.repository);
    return provider.publishWorkItemNote?.(workItem, note) ?? Promise.resolve();
  }

  /**
   * Routes a delivery-group marker to the single provider that owns all members.
   *
   * @param group - Delivery group.
   * @param workItems - Root-first members.
   * @public
   */
  public synchronizeDeliveryGroup(
    group: IDeliveryGroup,
    workItems: readonly IWorkItem[],
  ): Promise<void> {
    const provider = this.sharedProvider(workItems);
    return provider.synchronizeDeliveryGroup?.(group, workItems) ?? Promise.resolve();
  }

  /**
   * Routes shared-change-surface evidence to the single provider that owns all members.
   *
   * @param proposal - Relationship proposal.
   * @param workItems - Assessed work items.
   * @public
   */
  public synchronizeWorkItemRelation(
    proposal: IDeliveryGroupProposal,
    workItems: readonly IWorkItem[],
  ): Promise<void> {
    const provider = this.sharedProvider(workItems);
    return provider.synchronizeWorkItemRelation?.(proposal, workItems) ?? Promise.resolve();
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
    const providers = this.automationProviders();
    const groups = await Promise.all(
      providers.map(
        (provider) => provider.listAutomationSignals?.(checkpoints) ?? Promise.resolve([]),
      ),
    );
    groups.forEach((signals, index) => {
      const provider = providers[index]!;
      signals.forEach((signal) => this._providerByItemId.set(signal.workItem.id, provider));
    });
    return groups.flat();
  }

  private sharedProvider(
    workItems: readonly IWorkItem[],
  ): IWorkTrackingPort & Partial<IWorkItemCoordinationPort> {
    const providers = workItems.map(
      (item) =>
        this._providerByItemId.get(item.id) ??
        this.resolveProvider(item.sourceId, item.workspaceId, item.repository),
    );
    const [provider] = providers;
    if (!provider || providers.some((candidate) => candidate !== provider)) {
      throw new Error('Related work items must belong to one work-item provider.');
    }
    return provider;
  }

  /**
   * Lists the automation sources.
   *
   * @public
   */
  public async listAutomationSources(): Promise<
    readonly { sourceId: string; workspaceId: string }[]
  > {
    const sources = (
      await Promise.all(
        this.automationProviders().map(
          (provider) => provider.listAutomationSources?.() ?? Promise.resolve([]),
        ),
      )
    ).flat();
    return sources.filter(
      (source, index) =>
        sources.findIndex(
          (candidate) =>
            candidate.sourceId === source.sourceId && candidate.workspaceId === source.workspaceId,
        ) === index,
    );
  }

  /**
   * Acknowledges the automation signal.
   *
   * @param signal - Signal.
   * @param state - State.
   * @public
   */
  public acknowledgeAutomationSignal(
    signal: IAutomationSignal,
    state: IAutomationReceipt['state'],
  ): Promise<void> {
    const provider =
      this._providerByItemId.get(signal.workItem.id) ??
      this.resolveProvider(signal.sourceId, signal.workspaceId, signal.workItem.repository);
    return provider.acknowledgeAutomationSignal?.(signal, state) ?? Promise.resolve();
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
    const provider = this.coordinationProvider(workItem);
    const acquisition = await provider.acquireWorkItemClaim(workItem, action, executionId);
    if (acquisition.status === 'acquired') {
      this._providerByClaimedItemId.set(workItem.id, provider);
    }
    return acquisition;
  }

  /**
   * Whether the owning provider offers distributed ownership at all.
   *
   * GitHub Projects does, through a claim reference in the target repository. Azure DevOps
   * does not yet, so two orchestrators on the same Azure board coordinate only through the
   * board column and can race - the returned `false` is what makes that visible rather than
   * pretending a lock exists.
   *
   * @param workItem - Work item.
   * @public
   */
  public coordinatesWorkItem(workItem: IWorkItem): boolean {
    const provider =
      this._providerByItemId.get(workItem.id) ??
      this.resolveProvider(workItem.sourceId, workItem.workspaceId, workItem.repository);
    return provider.coordinatesWorkItem?.(workItem) ?? false;
  }

  // Async so a routing failure reaches the caller as a rejected promise rather than a throw
  // from the call itself, which a `.catch()` on the returned promise would never see.

  /**
   * Returns the renew work item claim.
   *
   * @param claim - Claim.
   * @public
   */
  public async renewWorkItemClaim(claim: IWorkItemClaim): Promise<IWorkItemClaim> {
    const provider = this.claimProvider(claim);
    if (!provider.renewWorkItemClaim) {
      throw new Error('The work-item provider does not support distributed coordination.');
    }
    return provider.renewWorkItemClaim(claim);
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
    const provider = this.claimProvider(claim);
    if (!provider.advanceWorkItemClaim) {
      throw new Error('The work-item provider does not support distributed coordination.');
    }
    return provider.advanceWorkItemClaim(claim, action);
  }

  /**
   * Releases the work item claim.
   *
   * @param claim - Claim.
   * @public
   */
  public async releaseWorkItemClaim(claim: IWorkItemClaim): Promise<void> {
    const provider = this.claimProvider(claim);
    if (!provider.releaseWorkItemClaim) {
      throw new Error('The work-item provider does not support distributed coordination.');
    }
    try {
      await provider.releaseWorkItemClaim(claim);
    } finally {
      this._providerByClaimedItemId.delete(claim.workItemId);
    }
  }

  /**
   * Sweeps every active provider, because a dead claim outlives the item that named it.
   *
   * @param retainedClaimIds - Retained claim ids.
   * @param limit - Limit.
   * @public
   */
  public async releaseAbandonedWorkItemClaims(
    retainedClaimIds: readonly string[] = [],
    limit?: number,
  ): Promise<number> {
    let released = 0;
    for (const provider of this.activeProviders()) {
      if (!provider.releaseAbandonedWorkItemClaims) continue;
      released += await provider.releaseAbandonedWorkItemClaims(retainedClaimIds, limit);
    }
    return released;
  }

  /**
   * Provider that owns a claimed work item.
   *
   * A claim can only exist because this router handed it out, so the claim registry answers even
   * when the item left the current board listing. Only an item nobody claimed through this router
   * is unroutable, and that is a stale local record rather than a provider without coordination.
   */
  private claimProvider(
    claim: IWorkItemClaim,
  ): IWorkTrackingPort & Partial<IWorkItemCoordinationPort> {
    const provider =
      this._providerByClaimedItemId.get(claim.workItemId) ??
      this._providerByItemId.get(claim.workItemId);
    if (!provider) throw new Error(`Refresh the claimed work item first: ${claim.workItemId}`);
    return provider;
  }

  private coordinationProvider(workItem: IWorkItem): IWorkTrackingPort & IWorkItemCoordinationPort {
    const provider =
      this._providerByItemId.get(workItem.id) ??
      this.resolveProvider(workItem.sourceId, workItem.workspaceId, workItem.repository);
    if (
      !provider.acquireWorkItemClaim ||
      !provider.coordinatesWorkItem?.(workItem) ||
      !provider.advanceWorkItemClaim ||
      !provider.releaseWorkItemClaim
    ) {
      throw new Error('The work-item provider does not support distributed coordination.');
    }
    return provider as IWorkTrackingPort & IWorkItemCoordinationPort;
  }

  private activeProviders(): readonly (IWorkTrackingPort & Partial<IWorkItemCoordinationPort>)[] {
    const selected = new Set(this._options.settings().activeViewScope.workspaceIds);
    const providers = this._options
      .settings()
      .workItemSources.flatMap((source) =>
        source.enabled && selected.has(source.workspaceId) && source.provider !== 'simulated'
          ? [this._options.providers[source.provider]]
          : [],
      );
    return providers.filter((provider, index) => providers.indexOf(provider) === index);
  }

  private automationProviders(): readonly (IWorkTrackingPort &
    Partial<IWorkItemCoordinationPort>)[] {
    const providers = this._options
      .settings()
      .workItemSources.flatMap((source) =>
        source.enabled && source.provider !== 'simulated'
          ? [this._options.providers[source.provider]]
          : [],
      );
    return providers.filter((provider, index) => providers.indexOf(provider) === index);
  }

  private resolveProvider(
    sourceId?: string,
    workspaceId?: string,
    repository?: string,
  ): IWorkTrackingPort & Partial<IWorkItemCoordinationPort> {
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
      (source) =>
        source.enabled &&
        source.provider !== 'simulated' &&
        (!sourceId || source.id === sourceId) &&
        (!workspaceId || source.workspaceId === workspaceId) &&
        (!repositoryWorkspaceId || source.workspaceId === repositoryWorkspaceId),
    );
    const providers = sources.map((source) => {
      if (source.provider === 'simulated') {
        throw new Error('The simulated work-item source is handled outside the provider router.');
      }
      return this._options.providers[source.provider];
    });
    const unique = providers.filter((provider, index) => providers.indexOf(provider) === index);
    if (unique.length !== 1) {
      throw new Error('Choose exactly one work-item source for this operation.');
    }
    return unique[0]!;
  }

  // #endregion
}

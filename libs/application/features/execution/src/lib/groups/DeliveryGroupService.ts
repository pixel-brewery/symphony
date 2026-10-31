// #region Imports

import type {
  IExecutionRecord,
  IDeliveryGroup,
  IDeliveryGroupProposal,
  IOperatorAttestation,
  IWorkItemRelationAssessment,
} from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import { stageExecutesRole } from '@symphony/domain-workflow';
import type { IPullRequestReference } from '@symphony/domain-delivery';
import { relationshipTokens } from './relationshipTokens';
import { minimumPairSimilarity } from './minimumPairSimilarity';
import { shortlistsRelationship } from './shortlistsRelationship';
import type { IDeliveryGroups } from './IDeliveryGroups';
import type { IDeliveryGroupsDependencies } from './IDeliveryGroupsDependencies';

// #endregion

/** Owns delivery proposals, grouping gates and provider synchronization. @public */
export class DeliveryGroupService implements IDeliveryGroups {
  // #region Ctor

  public constructor(private readonly _dependencies: IDeliveryGroupsDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Creates a relationship proposal. The target is always retained as root. A direct manual
   * proposal deliberately skips Analyzer evidence and requires an operator attestation.
   *
   * @public
   */
  public async assessDeliveryGroup(
    workItemIds: readonly string[],
    rootWorkItemId: string,
    activationSource: IDeliveryGroup['activationSource'],
    assessmentMode: 'analyzer' | 'direct' = 'analyzer',
  ): Promise<IDeliveryGroupProposal> {
    return (
      await this.prepareDeliveryGroupProposal(
        workItemIds,
        rootWorkItemId,
        activationSource,
        assessmentMode,
      )
    ).proposal;
  }

  /**
   * Persists an explicitly attested visual group without Analyzer or tracker-side relation
   * synchronization. The already loaded work items are reused for activation.
   *
   * @public
   */
  public async groupDeliveryDirectly(
    workItemIds: readonly string[],
    rootWorkItemId: string,
    activationSource: Extract<IDeliveryGroup['activationSource'], 'manual-drag' | 'manual-select'>,
  ): Promise<IDeliveryGroup> {
    const prepared = await this.prepareDeliveryGroupProposal(
      workItemIds,
      rootWorkItemId,
      activationSource,
      'direct',
    );
    return this.activateDeliveryGroup(
      prepared.proposal.id,
      undefined,
      { reason: 'Direct grouping selected by the operator.' },
      prepared.orderedItems,
    );
  }

  /**
   * Confirms a current proposal and persists its target-rooted group.
   *
   * @param proposalId - Proposal identifier.
   * @param attestation - Optional operator attestation that bypasses the evidence gates of a
   * manually assembled proposal; the safety gates always stay enforced.
   * @returns The activated delivery group.
   * @public
   */
  public async confirmDeliveryGroup(
    proposalId: string,
    attestation?: { reason?: string },
  ): Promise<IDeliveryGroup> {
    return this.activateDeliveryGroup(proposalId, undefined, attestation);
  }

  private async activateDeliveryGroup(
    proposalId: string,
    activationSourceOverride?: IDeliveryGroup['activationSource'],
    attestation?: { reason?: string },
    preparedItems?: readonly IWorkItem[],
  ): Promise<IDeliveryGroup> {
    const proposal = this.requireDeliveryGroupProposal(proposalId);
    if (proposal.state !== 'open')
      throw new Error('Only an open delivery-group proposal can be confirmed.');
    const items =
      preparedItems ??
      (await Promise.all(
        proposal.workItemIds.map((workItemId) =>
          this._dependencies.remoteProjectionQueries.loadWorkItemDetails(workItemId),
        ),
      ));
    this.assertGroupBoundary(items, false);
    for (const item of items) {
      if ((item.revision ?? 0) !== proposal.revisions[item.id]) {
        this._dependencies.repository.saveDeliveryGroupProposal({
          ...proposal,
          state: 'stale',
          updatedAt: this._dependencies.clock.now(),
        });
        throw new Error(`Work item ${item.externalId} changed after the relationship assessment.`);
      }
    }
    const attested =
      attestation !== undefined && this.isManualActivationSource(proposal.activationSource);
    const blockedSafetyGate = this.blockedDeliveryGroupSafetyGate(proposal);
    if (blockedSafetyGate) {
      throw new Error(
        attested
          ? `The operator attestation cannot bypass a safety gate: ${blockedSafetyGate}.`
          : 'The relationship assessment does not satisfy the delivery-group gates.',
      );
    }
    if (!attested && !this.satisfiesDeliveryGroupEvidenceGates(proposal)) {
      throw new Error('The relationship assessment does not satisfy the delivery-group gates.');
    }
    const operatorAttestation: IOperatorAttestation | undefined = attestation
      ? {
          attestedAt: this._dependencies.clock.now(),
          ...(attestation.reason?.trim() ? { reason: attestation.reason.trim() } : {}),
        }
      : undefined;
    const overlappingGroups = this._dependencies.repository
      .listDeliveryGroups()
      .filter(
        (candidate) =>
          candidate.state !== 'dissolved' &&
          candidate.state !== 'completed' &&
          proposal.workItemIds.some((workItemId) => candidate.workItemIds.includes(workItemId)),
      );
    if (overlappingGroups.length > 1) {
      throw new Error(
        'The proposed work items already belong to different delivery groups. Dissolve one group before combining them.',
      );
    }
    if (overlappingGroups.length === 1) {
      return this.extendDeliveryGroup(overlappingGroups[0]!, proposal, items, operatorAttestation);
    }
    const now = this._dependencies.clock.now();
    const root = items.find((item) => item.id === proposal.rootWorkItemId)!;
    const group: IDeliveryGroup = {
      id: this._dependencies.ids.next('delivery-group'),
      workspaceId: proposal.workspaceId,
      deliveryContextId: proposal.deliveryContextId,
      repository: proposal.repository,
      rootWorkItemId: proposal.rootWorkItemId,
      workItemIds: proposal.workItemIds,
      revisions: proposal.revisions,
      ...(root.stageId ? { stageId: root.stageId } : {}),
      state: 'synchronizing',
      activationSource:
        activationSourceOverride ??
        (this.isManualActivationSource(proposal.activationSource)
          ? proposal.activationSource!
          : 'proposal-confirmed'),
      proposalId: proposal.id,
      ...(operatorAttestation ? { operatorAttestation } : {}),
      createdAt: now,
      updatedAt: now,
    };
    this._dependencies.repository.saveDeliveryGroup(group);
    if (!root.boardColumnId) throw new Error('The target root has no provider column.');
    try {
      for (const item of items) {
        if (item.id !== root.id && item.boardColumnId !== root.boardColumnId) {
          await this._dependencies.tracker.moveToColumn(item.id, root.boardColumnId);
        }
      }
    } catch (error) {
      this._dependencies.repository.saveDeliveryGroup({
        ...group,
        state: 'paused',
        pauseReason: 'provider-transition',
        updatedAt: this._dependencies.clock.now(),
      });
      throw error;
    }
    const activeGroup: IDeliveryGroup = {
      ...group,
      state: 'active',
      updatedAt: this._dependencies.clock.now(),
    };
    this._dependencies.repository.saveDeliveryGroup(activeGroup);
    const confirmedProposal: IDeliveryGroupProposal = {
      ...proposal,
      ...(operatorAttestation ? { operatorAttestation } : {}),
      state: 'confirmed',
      updatedAt: now,
    };
    this._dependencies.repository.saveDeliveryGroupProposal(confirmedProposal);
    this.invalidateCoveredProposals(activeGroup, confirmedProposal.id);
    if (proposal.assessmentMode !== 'direct') {
      await this._dependencies.tracker.synchronizeWorkItemRelation?.(confirmedProposal, items);
      await this._dependencies.tracker.synchronizeDeliveryGroup?.(activeGroup, items);
    }
    return activeGroup;
  }

  private async extendDeliveryGroup(
    group: IDeliveryGroup,
    proposal: IDeliveryGroupProposal,
    items: readonly IWorkItem[],
    operatorAttestation?: IOperatorAttestation,
  ): Promise<IDeliveryGroup> {
    if (group.state !== 'active') {
      throw new Error('Only an active delivery group can take additional work items.');
    }
    if (group.pullRequest) {
      throw new Error(
        'The delivery group already publishes a pull request; new members cannot join mid-delivery.',
      );
    }
    if (
      group.workspaceId !== proposal.workspaceId ||
      group.deliveryContextId !== proposal.deliveryContextId ||
      group.repository !== proposal.repository
    ) {
      throw new Error('The proposal and the existing delivery group target different boundaries.');
    }
    const now = this._dependencies.clock.now();
    const additions = items.filter((item) => !group.workItemIds.includes(item.id));
    const confirmedProposal: IDeliveryGroupProposal = {
      ...proposal,
      ...(operatorAttestation ? { operatorAttestation } : {}),
      state: 'confirmed',
      updatedAt: now,
    };
    if (!additions.length) {
      this._dependencies.repository.saveDeliveryGroupProposal(confirmedProposal);
      this.invalidateCoveredProposals(group, confirmedProposal.id);
      if (proposal.assessmentMode !== 'direct') {
        await this._dependencies.tracker.synchronizeWorkItemRelation?.(confirmedProposal, items);
      }
      return group;
    }
    const root = await this._dependencies.remoteProjectionQueries.loadWorkItemDetails(
      group.rootWorkItemId,
    );
    if (!root.boardColumnId) throw new Error('The root work item has no provider column.');
    const extended: IDeliveryGroup = {
      ...group,
      workItemIds: [...group.workItemIds, ...additions.map((item) => item.id)],
      revisions: {
        ...group.revisions,
        ...Object.fromEntries(
          additions.map((item) => [item.id, proposal.revisions[item.id] ?? item.revision ?? 0]),
        ),
      },
      ...(root.stageId ? { stageId: root.stageId } : {}),
      updatedAt: now,
    };
    this._dependencies.repository.saveDeliveryGroup(extended);
    try {
      for (const item of additions) {
        if (item.boardColumnId !== root.boardColumnId) {
          await this._dependencies.tracker.moveToColumn(item.id, root.boardColumnId);
        }
      }
    } catch (error) {
      this._dependencies.repository.saveDeliveryGroup({
        ...extended,
        state: 'paused',
        pauseReason: 'provider-transition',
        updatedAt: this._dependencies.clock.now(),
      });
      throw error;
    }
    this._dependencies.repository.saveDeliveryGroupProposal(confirmedProposal);
    this.invalidateCoveredProposals(extended, confirmedProposal.id);
    const members = await Promise.all(
      extended.workItemIds.map((workItemId) =>
        workItemId === root.id
          ? Promise.resolve(root)
          : this._dependencies.remoteProjectionQueries.loadWorkItemDetails(workItemId),
      ),
    );
    if (proposal.assessmentMode !== 'direct') {
      await this._dependencies.tracker.synchronizeWorkItemRelation?.(confirmedProposal, items);
      await this._dependencies.tracker.synchronizeDeliveryGroup?.(extended, members);
    }
    return extended;
  }

  private invalidateCoveredProposals(group: IDeliveryGroup, confirmedProposalId: string): void {
    const members = new Set(group.workItemIds);
    for (const proposal of this._dependencies.repository.listDeliveryGroupProposals()) {
      if (proposal.id === confirmedProposalId || proposal.state !== 'open') continue;
      if (!proposal.workItemIds.every((workItemId) => members.has(workItemId))) continue;
      this._dependencies.repository.saveDeliveryGroupProposal({
        ...proposal,
        state: 'stale',
        updatedAt: this._dependencies.clock.now(),
      });
    }
  }

  /**
   * Records a human rejection without deleting the Analyzer evidence.
   *
   * @param proposalId - Proposal identifier.
   * @param reason - Optional operator reason.
   * @returns The rejected proposal.
   * @public
   */
  public async rejectDeliveryGroup(
    proposalId: string,
    reason?: string,
  ): Promise<IDeliveryGroupProposal> {
    const proposal = this.requireDeliveryGroupProposal(proposalId);
    const rejected: IDeliveryGroupProposal = {
      ...proposal,
      state: 'rejected',
      ...(reason?.trim() ? { rejectionReason: reason.trim() } : {}),
      updatedAt: this._dependencies.clock.now(),
    };
    this._dependencies.repository.saveDeliveryGroupProposal(rejected);
    const items = await Promise.all(
      proposal.workItemIds.map((workItemId) =>
        this._dependencies.remoteProjectionQueries.loadWorkItemDetails(workItemId),
      ),
    );
    await this._dependencies.tracker.synchronizeWorkItemRelation?.(rejected, items);
    return rejected;
  }

  /**
   * Dissolves an unmerged group while preserving its historical record.
   *
   * @param groupId - Delivery-group identifier.
   * @returns The dissolved group.
   * @public
   */
  public async dissolveDeliveryGroup(groupId: string): Promise<IDeliveryGroup> {
    const group = this.requireDeliveryGroup(groupId);
    if (group.state === 'completed') throw new Error('A completed delivery group is immutable.');
    const now = this._dependencies.clock.now();
    const dissolved: IDeliveryGroup = {
      ...group,
      state: 'dissolved',
      dissolvedAt: now,
      updatedAt: now,
    };
    this._dependencies.repository.saveDeliveryGroup(dissolved);
    const items = await Promise.all(
      group.workItemIds.map((workItemId) =>
        this._dependencies.remoteProjectionQueries.loadWorkItemDetails(workItemId),
      ),
    );
    await this._dependencies.tracker.synchronizeDeliveryGroup?.(dissolved, items);
    return dissolved;
  }

  /**
   * Aligns every member to the provider column currently occupied by the root.
   *
   * @param groupId - Delivery-group identifier.
   * @returns The aligned group.
   * @public
   */
  public async alignDeliveryGroup(groupId: string): Promise<IDeliveryGroup> {
    const group = this.requireDeliveryGroup(groupId);
    const root = await this._dependencies.remoteProjectionQueries.loadWorkItemDetails(
      group.rootWorkItemId,
    );
    if (!root.boardColumnId) throw new Error('The root work item has no provider column.');
    try {
      for (const workItemId of group.workItemIds) {
        if (workItemId !== root.id)
          await this._dependencies.tracker.moveToColumn(workItemId, root.boardColumnId);
      }
    } catch (error) {
      const paused: IDeliveryGroup = {
        ...group,
        state: 'paused',
        pauseReason: 'provider-transition',
        updatedAt: this._dependencies.clock.now(),
      };
      this._dependencies.repository.saveDeliveryGroup(paused);
      throw error;
    }
    const aligned: IDeliveryGroup = {
      ...group,
      state: 'active',
      ...(root.stageId ? { stageId: root.stageId } : {}),
      pauseReason: undefined,
      updatedAt: this._dependencies.clock.now(),
    };
    this._dependencies.repository.saveDeliveryGroup(aligned);
    const items = await Promise.all(
      group.workItemIds.map((workItemId) =>
        workItemId === root.id
          ? Promise.resolve(root)
          : this._dependencies.remoteProjectionQueries.loadWorkItemDetails(workItemId),
      ),
    );
    await this._dependencies.tracker.synchronizeDeliveryGroup?.(aligned, items);
    return aligned;
  }

  /** Records the cause preventing a group from continuing. @public */
  public pauseDeliveryGroup(
    group: IDeliveryGroup,
    pauseReason: NonNullable<IDeliveryGroup['pauseReason']>,
  ): void {
    this._dependencies.repository.saveDeliveryGroup({
      ...group,
      state: 'paused',
      pauseReason,
      updatedAt: this._dependencies.clock.now(),
    });
  }

  private assertGroupBoundary(items: readonly IWorkItem[], requireSameColumn = true): void {
    const [root] = items;
    if (!root?.workspaceId || !root.sourceId || !root.repository) {
      throw new Error('Delivery groups require a workspace, delivery source, and repository.');
    }
    for (const item of items) {
      if (item.workspaceId !== root.workspaceId)
        throw new Error('Cross-workspace groups are forbidden.');
      if (item.sourceId !== root.sourceId)
        throw new Error('Cross-delivery-context groups are forbidden.');
      if (item.repository !== root.repository)
        throw new Error('Cross-repository groups are forbidden.');
      if (
        requireSameColumn &&
        (item.stageId !== root.stageId || item.boardColumnId !== root.boardColumnId)
      ) {
        throw new Error('Delivery-group members must occupy the same provider column.');
      }
    }
  }

  private async assessWorkItemRelationship(
    items: readonly IWorkItem[],
    revisions: Readonly<Record<string, number>>,
  ): Promise<IWorkItemRelationAssessment> {
    if (this._dependencies.assessWorkItemRelation) {
      return this._dependencies.assessWorkItemRelation(items, revisions);
    }
    const surfaces = items.map(
      (item) =>
        new Set(
          `${item.title}\n${item.body}`
            .match(/(?:[\w.-]+\/)+[\w.-]+/gu)
            ?.map((path) => path.trim()) ?? [],
        ),
    );
    const sharedChangeSurface = [...(surfaces[0] ?? [])].filter((path) =>
      surfaces.slice(1).every((surface) => surface.has(path)),
    );
    const semanticSimilarity = minimumPairSimilarity(items);
    const sharedConcepts = [...relationshipTokens(items[0]!)]
      .filter((token) => items.slice(1).every((item) => relationshipTokens(item).has(token)))
      .slice(0, 5);
    const inferredSurface = sharedChangeSurface.length
      ? sharedChangeSurface
      : semanticSimilarity >= 0.25
        ? sharedConcepts.map((concept) => `inferred:${concept}`)
        : [];
    const relation = sharedChangeSurface.length
      ? semanticSimilarity >= 0.35
        ? 'joint-delivery'
        : 'collision'
      : inferredSurface.length
        ? 'collision'
        : 'unrelated';
    return {
      relation,
      workItemIds: items.map((item) => item.id),
      assessedRevisions: revisions,
      evidence: sharedChangeSurface.length
        ? sharedChangeSurface.map((path) => `Every issue names ${path}.`)
        : inferredSurface.length
          ? [
              `The issues share the concepts ${sharedConcepts.join(', ')}; repository paths still require Analyzer confirmation.`,
            ]
          : ['No shared repository change surface was proven by the available issue evidence.'],
      sharedChangeSurface: inferredSurface,
      compatibleAcceptanceCriteria: relation === 'joint-delivery',
      compatibleVerification: sharedChangeSurface.length > 0,
      hasOpenDecisions: sharedChangeSurface.length === 0 && inferredSurface.length > 0,
      hasExistingClaims: items.some((item) => Boolean(item.coordination)),
      hasPullRequests: false,
      assessedAt: this._dependencies.clock.now(),
    };
  }

  private async prepareDeliveryGroupProposal(
    workItemIds: readonly string[],
    rootWorkItemId: string,
    activationSource: IDeliveryGroup['activationSource'],
    assessmentMode: 'analyzer' | 'direct',
  ): Promise<{
    readonly proposal: IDeliveryGroupProposal;
    readonly orderedItems: readonly IWorkItem[];
  }> {
    if (activationSource === 'automatic' && assessmentMode === 'direct') {
      throw new Error('Automatic delivery groups always require Analyzer evidence.');
    }
    const uniqueIds = [...new Set(workItemIds)];
    const limit = activationSource === 'automatic' ? 5 : 10;
    if (uniqueIds.length < 2 || uniqueIds.length > limit) {
      throw new Error(`A delivery group requires between 2 and ${limit} work items.`);
    }
    if (!uniqueIds.includes(rootWorkItemId)) {
      throw new Error('The target root must be a group member.');
    }
    const items = await Promise.all(
      uniqueIds.map((workItemId) =>
        this._dependencies.remoteProjectionQueries.loadWorkItemDetails(workItemId),
      ),
    );
    const root = items.find((item) => item.id === rootWorkItemId)!;
    this.assertGroupBoundary(items, !this.isManualActivationSource(activationSource));
    const binding = this._dependencies.bindingSnapshotFor?.(root, 'analysis');
    const orderedItems = [root, ...items.filter((item) => item.id !== root.id)];
    const revisions = Object.fromEntries(orderedItems.map((item) => [item.id, item.revision ?? 0]));
    const assessment =
      assessmentMode === 'direct'
        ? this.directWorkItemRelationship(orderedItems, revisions)
        : await this.assessWorkItemRelationship(orderedItems, revisions);
    const now = this._dependencies.clock.now();
    const proposal: IDeliveryGroupProposal = {
      id: this._dependencies.ids.next('delivery-group-proposal'),
      workspaceId: root.workspaceId!,
      deliveryContextId: binding?.deliveryContextId ?? root.sourceId!,
      repository: root.repository,
      rootWorkItemId,
      workItemIds: orderedItems.map((item) => item.id),
      revisions,
      assessment,
      assessmentMode,
      activationSource,
      state:
        activationSource === 'automatic' && assessment.relation === 'unrelated'
          ? 'rejected'
          : 'open',
      ...(activationSource === 'automatic' && assessment.relation === 'unrelated'
        ? { rejectionReason: 'The Analyzer found no delivery or critical-path relationship.' }
        : {}),
      createdAt: now,
      updatedAt: now,
    };
    this._dependencies.repository.saveDeliveryGroupProposal(proposal);
    if (assessmentMode === 'analyzer') {
      await this._dependencies.tracker.synchronizeWorkItemRelation?.(proposal, orderedItems);
    }
    return { proposal, orderedItems };
  }

  private directWorkItemRelationship(
    items: readonly IWorkItem[],
    revisions: Readonly<Record<string, number>>,
  ): IWorkItemRelationAssessment {
    return {
      relation: 'unrelated',
      workItemIds: items.map((item) => item.id),
      assessedRevisions: revisions,
      evidence: ['The operator chose direct grouping without an Analyzer assessment.'],
      sharedChangeSurface: [],
      compatibleAcceptanceCriteria: false,
      compatibleVerification: false,
      hasOpenDecisions: false,
      hasExistingClaims: items.some((item) => Boolean(item.coordination)),
      hasPullRequests: false,
      assessedAt: this._dependencies.clock.now(),
    };
  }

  /** Assesses new relationship evidence and applies eligible automatic grouping. @public */
  public async refreshRelationshipProposals(workItems: readonly IWorkItem[]): Promise<void> {
    const grouped = new Map<string, IWorkItem[]>();
    const activeMemberIds = new Set(
      this._dependencies.repository
        .listDeliveryGroups()
        .filter((group) => group.state !== 'dissolved' && group.state !== 'completed')
        .flatMap((group) => group.workItemIds),
    );
    for (const item of workItems) {
      if (
        !item.workspaceId ||
        !item.sourceId ||
        !item.boardColumnId ||
        activeMemberIds.has(item.id) ||
        !stageExecutesRole(this._dependencies.workflow().stages, item.stageId, 'analyze')
      ) {
        continue;
      }
      const key = [item.workspaceId, item.sourceId, item.repository, item.boardColumnId].join(
        '\u0000',
      );
      const bucket = grouped.get(key);
      if (bucket) bucket.push(item);
      else grouped.set(key, [item]);
    }
    const known = this._dependencies.repository.listDeliveryGroupProposals();
    let created = 0;
    for (const items of grouped.values()) {
      for (const cluster of this.clusterRelatedWorkItems(items)) {
        if (created >= 5) break;
        // The automatic assessment is bounded to five members; the oldest issues stay in front.
        const members = cluster.slice(0, 5);
        const ids = members.map((item) => item.id).sort();
        const current = known.some(
          (proposal) =>
            [...proposal.workItemIds].sort().join('\u0000') === ids.join('\u0000') &&
            members.every((item) => proposal.revisions[item.id] === (item.revision ?? 0)),
        );
        if (current) continue;
        const root = members[0]!;
        try {
          const proposal = await this.assessDeliveryGroup(
            members.map((item) => item.id),
            root.id,
            'automatic',
          );
          created += 1;
          if (
            this._dependencies.automaticDeliveryGroupingEnabledFor?.(root.workspaceId!) &&
            this.canActivateDeliveryGroup(proposal)
          ) {
            await this.activateDeliveryGroup(proposal.id, 'automatic');
          }
        } catch {
          // Suggestions must never make the provider board unavailable; the next refresh retries.
        }
      }
    }
  }

  private clusterRelatedWorkItems(items: readonly IWorkItem[]): readonly (readonly IWorkItem[])[] {
    const clusterOf = new Map<string, Set<IWorkItem>>();
    for (const item of items) clusterOf.set(item.id, new Set([item]));
    for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
        const left = items[leftIndex]!;
        const right = items[rightIndex]!;
        if (!shortlistsRelationship([left, right])) continue;
        const target = clusterOf.get(left.id)!;
        const source = clusterOf.get(right.id)!;
        if (target === source) continue;
        for (const member of source) {
          target.add(member);
          clusterOf.set(member.id, target);
        }
      }
    }
    return [...new Set(clusterOf.values())]
      .filter((cluster) => cluster.size >= 2)
      .map((cluster) =>
        [...cluster].sort((left, right) =>
          (left.createdAt ?? left.id).localeCompare(right.createdAt ?? right.id),
        ),
      );
  }

  private requireDeliveryGroupProposal(proposalId: string): IDeliveryGroupProposal {
    const proposal = this._dependencies.repository
      .listDeliveryGroupProposals()
      .find((candidate) => candidate.id === proposalId);
    if (!proposal) throw new Error(`Unknown delivery-group proposal: ${proposalId}`);
    return proposal;
  }

  private canActivateDeliveryGroup(proposal: IDeliveryGroupProposal): boolean {
    return (
      this.blockedDeliveryGroupSafetyGate(proposal) === undefined &&
      this.satisfiesDeliveryGroupEvidenceGates(proposal)
    );
  }

  private blockedDeliveryGroupSafetyGate(proposal: IDeliveryGroupProposal): string | undefined {
    if (proposal.assessment.hasExistingClaims) {
      return 'a member work item already carries an active claim';
    }
    if (proposal.assessment.hasPullRequests) {
      return 'a member work item already publishes a pull request';
    }
    if (proposal.assessment.hasOpenDecisions) {
      return 'the relationship assessment leaves open decisions';
    }
    return undefined;
  }

  private satisfiesDeliveryGroupEvidenceGates(proposal: IDeliveryGroupProposal): boolean {
    return (
      proposal.assessment.relation === 'joint-delivery' &&
      proposal.assessment.sharedChangeSurface.length > 0 &&
      proposal.assessment.compatibleAcceptanceCriteria &&
      proposal.assessment.compatibleVerification
    );
  }

  private isManualActivationSource(
    activationSource: IDeliveryGroup['activationSource'] | undefined,
  ): boolean {
    return activationSource === 'manual-drag' || activationSource === 'manual-select';
  }

  /** Rejects a run whose critical paths overlap another active execution. @public */
  public assertNoCriticalPathCollision(workItem: IWorkItem): void {
    const linkedIds = new Set(
      this._dependencies.repository
        .listDeliveryGroupProposals()
        .filter(
          (proposal) =>
            proposal.state === 'open' &&
            proposal.workItemIds.includes(workItem.id) &&
            (proposal.assessment.relation === 'collision' ||
              proposal.assessment.relation === 'dependency'),
        )
        .flatMap((proposal) => proposal.workItemIds),
    );
    linkedIds.delete(workItem.id);
    const conflicting = this._dependencies.repository
      .listExecutions()
      .find(
        (execution) =>
          linkedIds.has(execution.workItemId) &&
          (execution.kind === 'solution' || execution.kind === 'revision') &&
          this._dependencies.isActive(execution.state),
      );
    if (conflicting) {
      throw new Error(
        `A critical-path ticket is already being implemented (${conflicting.workItemId}). Review or group the related tickets before starting another Solver.`,
      );
    }
  }

  private requireDeliveryGroup(groupId: string): IDeliveryGroup {
    const group = this._dependencies.repository
      .listDeliveryGroups()
      .find((candidate) => candidate.id === groupId);
    if (!group) throw new Error(`Unknown delivery group: ${groupId}`);
    return group;
  }

  /** Reads the active group represented by a root Work Item. @public */
  public activeDeliveryGroupForRoot(workItemId: string): IDeliveryGroup | undefined {
    return this._dependencies.repository
      .listDeliveryGroups()
      .find(
        (group) =>
          group.rootWorkItemId === workItemId &&
          (group.state === 'active' || group.state === 'synchronizing'),
      );
  }

  /** Builds the ordered instructions for the grouped Work Items. @public */
  public groupedDeliveryRequest(group: IDeliveryGroup, workItems: readonly IWorkItem[]): string {
    return [
      `Analyze delivery group ${group.id} as one implementation. ${group.rootWorkItemId} is the immutable root, goal anchor, worktree owner, and branch naming input. Do not merge or rewrite the provider issues. Preserve every acceptance criterion and identify its originating issue. Produce one compatible verification plan and explicitly call out any collision, dependency, or unresolved decision.`,
      ...workItems.map(
        (item) =>
          `## ${item.externalId}: ${item.title}\n\nRevision: ${item.revision ?? 0}\nRepository: ${item.repository}\n\n${item.body}`,
      ),
    ].join('\n\n');
  }

  /** Pauses active groups whose recorded provider state has drifted. @public */
  public reconcileDeliveryGroupDrift(workItems: readonly IWorkItem[]): void {
    const itemsById = new Map(workItems.map((item) => [item.id, item]));
    for (const group of this._dependencies.repository.listDeliveryGroups()) {
      if (group.state !== 'active' && group.state !== 'synchronizing') continue;
      const members = group.workItemIds.map((workItemId) => itemsById.get(workItemId));
      const root = itemsById.get(group.rootWorkItemId);
      const revisionDrift = members.some(
        (item) => item && (item.revision ?? 0) !== group.revisions[item.id],
      );
      const providerDrift =
        !root ||
        members.some(
          (item) =>
            !item || item.boardColumnId !== root.boardColumnId || item.stageId !== root.stageId,
        );
      if (!revisionDrift && !providerDrift) continue;
      this._dependencies.repository.saveDeliveryGroup({
        ...group,
        state: 'paused',
        pauseReason: revisionDrift ? 'revision-drift' : 'provider-drift',
        updatedAt: this._dependencies.clock.now(),
      });
    }
  }

  /** Persists and mirrors the pull request attached to an existing group. @public */
  public async synchronizeDeliveryGroupPullRequest(
    execution: IExecutionRecord,
    workItem: IWorkItem,
    pullRequest: IPullRequestReference,
  ): Promise<void> {
    if (!execution.deliveryGroupId) return;
    const group = this.requireDeliveryGroup(execution.deliveryGroupId);
    const updatedGroup: IDeliveryGroup = {
      ...group,
      pullRequest,
      updatedAt: this._dependencies.clock.now(),
    };
    this._dependencies.repository.saveDeliveryGroup(updatedGroup);
    const workItems = execution.workItemSnapshots ?? [workItem];
    await this._dependencies.tracker.synchronizeDeliveryGroup?.(updatedGroup, workItems);
  }

  // #endregion
}
